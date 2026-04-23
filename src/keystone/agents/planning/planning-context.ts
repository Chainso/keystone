import type { ExecutionSession } from "@cloudflare/sandbox";

import type { WorkerBindings } from "../../../env";
import type { TaskSessionState } from "../../../durable-objects/TaskSessionDO";
import { getTaskSessionStub } from "../../../lib/auth/tenant";
import { createWorkerDatabaseClient } from "../../../lib/db/client";
import { getProject } from "../../../lib/db/projects";
import { getRunRecord } from "../../../lib/db/runs";
import {
  buildProjectExecutionSnapshot,
  type ProjectExecutionSnapshot
} from "../../../lib/projects/runtime";
import { ensureSandboxSession } from "../../../lib/sandbox/client";
import type { SandboxAgentBridge } from "../../../lib/workspace/init";
import {
  buildRunSandboxId,
  slugifySegment
} from "../../../lib/workspace/worktree";

const planningConversationNamePattern =
  /^tenant:(?<tenantId>[^:]+):run:(?<runId>[^:]+):document:(?<path>.+)$/;

export interface PlanningDocumentConversationIdentity {
  tenantId: string;
  runId: string;
  path: string;
}

export interface PlanningSandboxContext {
  identity: PlanningDocumentConversationIdentity;
  sessionId: string;
  taskId: string;
  runTaskId: string;
  sandboxId: string;
  session: ExecutionSession;
  bridge: SandboxAgentBridge;
  projectExecution: ProjectExecutionSnapshot;
}

export function parsePlanningConversationName(name: string): PlanningDocumentConversationIdentity | null {
  const trimmed = name.trim();
  const match = planningConversationNamePattern.exec(trimmed);

  if (!match?.groups) {
    return null;
  }

  const tenantId = match.groups.tenantId;
  const runId = match.groups.runId;
  const path = match.groups.path;

  if (!tenantId || !runId || !path) {
    return null;
  }

  return {
    tenantId: decodeURIComponent(tenantId),
    runId: decodeURIComponent(runId),
    path: decodeURIComponent(path)
  };
}

export function buildPlanningSessionId(path: string) {
  return `planning-document-${slugifySegment(path)}`;
}

export function buildPlanningTaskId(path: string) {
  return `planning-${slugifySegment(path)}`;
}

export function buildPlanningRunTaskId(path: string) {
  return `planning-${slugifySegment(path)}`;
}

export async function ensurePlanningSandboxContext(
  env: WorkerBindings,
  agentName: string
): Promise<PlanningSandboxContext | null> {
  const identity = parsePlanningConversationName(agentName);

  if (!identity) {
    return null;
  }

  const client = createWorkerDatabaseClient(env);

  try {
    const run = await getRunRecord(client, {
      tenantId: identity.tenantId,
      runId: identity.runId
    });

    if (!run) {
      throw new Error(`Run ${identity.runId} was not found for planning agent ${agentName}.`);
    }

    const project = await getProject(client, {
      tenantId: identity.tenantId,
      projectId: run.projectId
    });

    if (!project) {
      throw new Error(
        `Project ${run.projectId} was not found for planning agent ${agentName}.`
      );
    }

    const projectExecution = buildProjectExecutionSnapshot(project);
    const sessionId = buildPlanningSessionId(identity.path);
    const taskId = buildPlanningTaskId(identity.path);
    const runTaskId = buildPlanningRunTaskId(identity.path);
    const sandboxId = run.sandboxId ?? buildRunSandboxId(identity.tenantId, identity.runId);
    const taskSession = getTaskSessionStub(
      env,
      identity.tenantId,
      identity.runId,
      sessionId,
      taskId
    );

    await taskSession.initialize({
      tenantId: identity.tenantId,
      runId: identity.runId,
      sessionId,
      taskId,
      runTaskId,
      sandboxId
    });

    const workspaceState = (await taskSession.ensureWorkspace({
      components: projectExecution.components,
      env: projectExecution.environment
    })) as TaskSessionState;
    const bridge = workspaceState.workspace?.agentBridge;

    if (!bridge) {
      throw new Error(`Planning agent ${agentName} did not materialize a sandbox bridge.`);
    }

    const { session } = await ensureSandboxSession({
      env,
      sandboxId: workspaceState.sandboxId,
      sessionId
    });

    return {
      identity,
      sessionId,
      taskId,
      runTaskId,
      sandboxId: workspaceState.sandboxId,
      session,
      bridge,
      projectExecution
    };
  } finally {
    await client.close();
  }
}
