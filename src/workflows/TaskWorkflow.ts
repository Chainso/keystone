import { posix as path } from "node:path";

import type { ProcessStatus } from "@cloudflare/sandbox";
import { getAgentByName } from "agents";
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import type { WorkerBindings } from "../env";
import type { KeystoneThinkAgent } from "../keystone/agents/base/KeystoneThinkAgent";
import { createThinkSmokePlan } from "../keystone/agents/implementer/ImplementerAgent";
import { readSandboxAgentFile } from "../keystone/agents/tools/filesystem";
import type { AgentRuntimeArtifact } from "../maestro/agent-runtime";
import type { AgentRuntimeKind } from "../maestro/contracts";
import type { TaskSessionState } from "../durable-objects/TaskSessionDO";
import { putArtifactBytes, decodeArtifactBody } from "../lib/artifacts/r2";
import { createArtifactRef, findArtifactRefByStorageUri } from "../lib/db/artifacts";
import { createWorkerDatabaseClient } from "../lib/db/client";
import { listSessionEvents } from "../lib/db/events";
import { appendAndPublishRunEvent } from "../lib/events/publish";
import { getTaskSessionStub } from "../lib/auth/tenant";
import { demoDecisionPackageFixture } from "../lib/fixtures/demo-decision-package";
import { getProject } from "../lib/db/projects";
import {
  buildProjectExecutionSnapshot,
  type ProjectExecutionRuleOverride,
  type ProjectExecutionSnapshot
} from "../lib/projects/runtime";
import type { RunExecutionOptions } from "../lib/runs/options";
import { resolveRunExecutionOptions } from "../lib/runs/options";
import { buildStableSessionId } from "../lib/workflows/ids";
import { taskLogArtifactKey, tenantRunPrefix } from "../lib/artifacts/keys";
import { resolveRunAgentRuntime } from "../lib/workflows/idempotency";
import { loadTaskHandoffArtifact } from "../keystone/tasks/load-task-contracts";
import { ensureSandboxSession } from "../lib/sandbox/client";
import { isTerminalProcessStatus } from "../lib/sandbox/processes";
import type { ProjectRuleSet } from "../keystone/projects/contracts";

export interface TaskWorkflowParams {
  tenantId: string;
  runId: string;
  runSessionId: string;
  taskId: string;
  runtime?: AgentRuntimeKind | undefined;
  options?: RunExecutionOptions | undefined;
  project: {
    projectId: string;
    projectKey: string;
    displayName: string;
  };
}

const MAX_PROCESS_POLL_ATTEMPTS = 20;

interface WorkflowProcessSnapshot {
  processId: string;
  command: string;
  status: ProcessStatus;
  startedAt: string;
  endedAt: string | null;
  exitCode: number | null;
}

interface ThinkTurnSnapshot {
  outcome: "completed" | "failed" | "cancelled";
  summary: string | null;
}

interface TaskExecutionSnapshot {
  processStatus: string;
  exitCode: number | null;
  logArtifactRefId: string | null;
  promotedArtifactRefIds: string[];
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

interface SerializableAgentBridge {
  layout: {
    workspaceRoot: string;
    artifactsInRoot: string;
    artifactsOutRoot: string;
    keystoneRoot: string;
  };
  targets: {
    workspaceRoot: string;
    artifactsInRoot: string;
    artifactsOutRoot: string;
    keystoneRoot: string;
  };
  readOnlyRoots: string[];
  writableRoots: string[];
  environment?: Record<string, string> | undefined;
  controlFiles: {
    session: string;
    filesystem: string;
    artifacts: string;
  };
  projectedArtifacts: Array<{
    artifactRefId: string;
    kind: string;
    contentType: string;
    storageUri: string;
    projectedPath: string;
    sizeBytes?: number | null | undefined;
    metadata?: Record<string, JsonValue> | undefined;
  }>;
}

interface TaskWorkspaceSnapshot {
  taskSessionId: string;
  sandboxId: string;
  agentBridgeJson: string;
}

interface TaskProjectContext {
  projectExecution: ProjectExecutionSnapshot;
}

export class TaskWorkflow extends WorkflowEntrypoint<WorkerBindings, TaskWorkflowParams> {
  async run(event: Readonly<WorkflowEvent<TaskWorkflowParams>>, step: WorkflowStep) {
    const runtime = resolveRunAgentRuntime(event.payload.runtime);
    const options = resolveRunExecutionOptions(event.payload.options);
    const handoff = await step.do("load task handoff", async () =>
      loadTaskHandoffArtifact(this.env, event.payload.tenantId, event.payload.runId, event.payload.taskId)
    );
    const projectContext = (await step.do("load project execution", async () => {
      const client = createWorkerDatabaseClient(this.env);

      try {
        const project = await getProject(client, {
          tenantId: event.payload.tenantId,
          projectId: event.payload.project.projectId
        });

        if (!project) {
          throw new NonRetryableError(
            `Project ${event.payload.project.projectId} was not found for task ${event.payload.taskId}.`
          );
        }

        return {
          projectExecution: buildProjectExecutionSnapshot(project)
        };
      } finally {
        await client.close();
      }
    })) as TaskProjectContext;

    const taskSessionState = (await step.do("ensure workspace", async () => {
      const taskSessionId = await buildStableSessionId(
        "task-session",
        event.payload.tenantId,
        event.payload.runId,
        event.payload.taskId
      );
      const taskSession = getTaskSessionStub(
        this.env,
        event.payload.tenantId,
        event.payload.runId,
        taskSessionId,
        event.payload.taskId
      );

      await taskSession.initialize({
        tenantId: event.payload.tenantId,
        runId: event.payload.runId,
        sessionId: taskSessionId,
        taskId: event.payload.taskId,
        parentSessionId: event.payload.runSessionId
      });

      const workspaceState = (await taskSession.ensureWorkspace({
        components: projectContext.projectExecution.components,
        env: projectContext.projectExecution.environment
      })) as TaskSessionState;
      const bridge = workspaceState.workspace?.agentBridge;

      if (!bridge) {
        throw new Error(`Task ${event.payload.taskId} did not materialize an agent bridge.`);
      }

      return {
        taskSessionId,
        sandboxId: workspaceState.sandboxId,
        agentBridgeJson: JSON.stringify(bridge)
      };
    })) as TaskWorkspaceSnapshot;

    await step.do("mark task active", async () => {
      const client = createWorkerDatabaseClient(this.env);

      try {
        await appendAndPublishRunEvent(client, this.env, {
          tenantId: event.payload.tenantId,
          runId: event.payload.runId,
          sessionId: taskSessionState.taskSessionId,
          taskId: event.payload.taskId,
          eventType: "task.status_changed",
          payload: {
            taskId: event.payload.taskId,
            status: "active",
            summary: handoff.task.summary,
            runtime,
            projectId: event.payload.project.projectId,
            projectKey: event.payload.project.projectKey
          },
          status: "active"
        });
      } finally {
        await client.close();
      }

      return true;
    });

    const execution = runtime === "think"
      ? await step.do("run think implementer", async () => {
          const agentBridge = JSON.parse(taskSessionState.agentBridgeJson) as SerializableAgentBridge;
          const agent = await getAgentByName(
            this.env.KEYSTONE_THINK_AGENT,
            getThinkAgentName(event.payload.tenantId, event.payload.runId, taskSessionState.taskSessionId)
          ) as Pick<KeystoneThinkAgent, "runImplementerTurn">;
          const turnInput = resolveThinkTurnInput(projectContext.projectExecution, handoff, options);
          const result = await agent.runImplementerTurn({
            tenantId: event.payload.tenantId,
            runId: event.payload.runId,
            sessionId: taskSessionState.taskSessionId,
            taskId: event.payload.taskId,
            prompt: buildThinkImplementerPrompt(handoff, {
              projectId: event.payload.project.projectId,
              projectKey: event.payload.project.projectKey,
              displayName: event.payload.project.displayName,
              ruleSet: projectContext.projectExecution.ruleSet,
              componentRuleOverrides: projectContext.projectExecution.componentRuleOverrides
            }),
            sandboxId: taskSessionState.sandboxId,
            agentBridge,
            ...turnInput
          });
          const client = createWorkerDatabaseClient(this.env);
          const turnResult = {
            outcome: result.outcome,
            summary: result.summary ?? null
          } satisfies ThinkTurnSnapshot;

          try {
            const promotedArtifactRefIds = await promoteStagedArtifacts(this.env, client, {
              tenantId: event.payload.tenantId,
              runId: event.payload.runId,
              sessionId: taskSessionState.taskSessionId,
              taskId: event.payload.taskId,
              sandboxId: taskSessionState.sandboxId,
              agentBridge,
              stagedArtifacts: result.stagedArtifacts
            });

            return {
              processStatus:
                turnResult.outcome === "completed" ? "completed" : turnResult.outcome,
              exitCode: turnResult.outcome === "completed" ? 0 : 1,
              logArtifactRefId: null,
              promotedArtifactRefIds
            } satisfies TaskExecutionSnapshot;
          } finally {
            await client.close();
          }
        })
      : await runScriptedTask(
          this.env,
          step,
          event.payload,
          taskSessionState.taskSessionId,
          projectContext.projectExecution.environment
        );

    await step.do("mark task complete", async () => {
      const client = createWorkerDatabaseClient(this.env);
      const taskStatus = execution.exitCode === 0 ? "completed" : "failed";

      try {
        await appendAndPublishRunEvent(client, this.env, {
          tenantId: event.payload.tenantId,
          runId: event.payload.runId,
          sessionId: taskSessionState.taskSessionId,
          taskId: event.payload.taskId,
          eventType: "task.status_changed",
          severity: execution.exitCode === 0 ? "info" : "error",
          payload: {
            taskId: event.payload.taskId,
            status: taskStatus,
            exitCode: execution.exitCode,
            runtime,
            promotedArtifactCount: execution.promotedArtifactRefIds.length
          },
          status: execution.exitCode === 0 ? "active" : "failed"
        });
      } finally {
        await client.close();
      }

      return taskStatus;
    });

    await step.do(options.preserveSandbox ? "preserve task session" : "teardown task session", async () => {
      const taskSession = getTaskSessionStub(
        this.env,
        event.payload.tenantId,
        event.payload.runId,
        taskSessionState.taskSessionId,
        event.payload.taskId
      );

      if (options.preserveSandbox) {
        await taskSession.preserveForInspection();
      } else {
        await taskSession.teardown();
      }

      return true;
    });

    return {
      taskId: event.payload.taskId,
      taskSessionId: taskSessionState.taskSessionId,
      processStatus: execution.processStatus,
      exitCode: execution.exitCode,
      logArtifactRefId: execution.logArtifactRefId,
      workflowStatus: execution.exitCode === 0 ? "complete" : "errored"
    };
  }
}

function toWorkflowProcessSnapshot(
  activeProcess:
    | {
        processId: string;
        command: string;
        status: ProcessStatus;
        startedAt: string;
        endedAt?: string | undefined;
        exitCode?: number | undefined;
      }
    | undefined
): WorkflowProcessSnapshot {
  if (!activeProcess) {
    throw new NonRetryableError("Task process snapshot was unexpectedly empty.");
  }

  return {
    processId: activeProcess.processId,
    command: activeProcess.command,
    status: activeProcess.status,
    startedAt: activeProcess.startedAt,
    endedAt: activeProcess.endedAt ?? null,
    exitCode: activeProcess.exitCode ?? null
  };
}

async function runScriptedTask(
  env: WorkerBindings,
  step: WorkflowStep,
  payload: TaskWorkflowParams,
  taskSessionId: string,
  projectEnv: Record<string, string>
): Promise<TaskExecutionSnapshot> {
  await step.do("start task process", async () => {
    const taskSession = getTaskSessionStub(
      env,
      payload.tenantId,
      payload.runId,
      taskSessionId,
      payload.taskId
    );

    const process = await taskSession.startProcess({
      command: "npm test",
      env: projectEnv
    });

    return {
      processId: process.processId,
      status: process.status
    };
  });

  let latestProcessState: WorkflowProcessSnapshot | null = null;

  for (let attempt = 0; attempt < MAX_PROCESS_POLL_ATTEMPTS; attempt += 1) {
    latestProcessState = await step.do(`poll task process ${attempt}`, async () => {
      const taskSession = getTaskSessionStub(
        env,
        payload.tenantId,
        payload.runId,
        taskSessionId,
        payload.taskId
      );

      const processState = (await taskSession.pollProcess()) as TaskSessionState;

      return toWorkflowProcessSnapshot(processState.activeProcess);
    });

    if (latestProcessState && isTerminalProcessStatus(latestProcessState.status)) {
      break;
    }

    await step.sleep(`wait for task process ${attempt}`, "1 second");
  }

  if (!latestProcessState) {
    throw new NonRetryableError(`Task ${payload.taskId} did not produce an active process snapshot.`);
  }

  const logArtifactRefId = await step.do("persist task logs", async () => {
    const client = createWorkerDatabaseClient(env);

    try {
      const sessionEvents = await listSessionEvents(client, {
        tenantId: payload.tenantId,
        sessionId: taskSessionId
      });
      const logLines = sessionEvents
        .filter(
          (sessionEvent) =>
            sessionEvent.eventType === "sandbox.process.stdout" ||
            sessionEvent.eventType === "sandbox.process.stderr"
        )
        .map((sessionEvent) =>
          JSON.stringify({
            timestamp: sessionEvent.ts.toISOString(),
            eventType: sessionEvent.eventType,
            chunk: sessionEvent.payload.chunk ?? ""
          })
        )
        .join("\n");
      const artifact = await putArtifactBytes(
        env.ARTIFACTS_BUCKET,
        "keystone-artifacts-dev",
        taskLogArtifactKey(
          payload.tenantId,
          payload.runId,
          payload.taskId,
          latestProcessState.processId
        ),
        logLines,
        {
          httpMetadata: {
            contentType: "application/x-ndjson; charset=utf-8"
          }
        }
      );
      const artifactRef = await createArtifactRef(client, {
        tenantId: payload.tenantId,
        runId: payload.runId,
        sessionId: taskSessionId,
        taskId: payload.taskId,
        kind: "task_log",
        storageBackend: artifact.storageBackend,
        storageUri: artifact.storageUri,
        contentType: "application/x-ndjson; charset=utf-8",
        sizeBytes: artifact.sizeBytes,
        metadata: {
          key: artifact.key,
          etag: artifact.etag
        }
      });

      if (!artifactRef) {
        throw new Error(`Task log artifact ref could not be created for ${payload.taskId}.`);
      }

      await appendAndPublishRunEvent(client, env, {
        tenantId: payload.tenantId,
        runId: payload.runId,
        sessionId: taskSessionId,
        taskId: payload.taskId,
        eventType: "artifact.put",
        artifactRefId: artifactRef.artifactRefId,
        payload: {
          kind: "task_log",
          storageUri: artifact.storageUri
        },
        status: latestProcessState.exitCode === 0 ? "active" : "failed"
      });

      return artifactRef.artifactRefId;
    } finally {
      await client.close();
    }
  });

  return {
    processStatus: latestProcessState.status,
    exitCode: latestProcessState.exitCode,
    logArtifactRefId,
    promotedArtifactRefIds: []
  };
}

function getThinkAgentName(tenantId: string, runId: string, taskSessionId: string) {
  return `tenant:${tenantId}:run:${runId}:task:${taskSessionId}`;
}

function buildRuleSection(label: string, instructions: string[]) {
  if (instructions.length === 0) {
    return null;
  }

  return [label, ...instructions.map((instruction) => `- ${instruction}`)].join("\n");
}

function buildThinkImplementerPrompt(
  handoff: Awaited<ReturnType<typeof loadTaskHandoffArtifact>>,
  project?: {
    projectId: string;
    projectKey: string;
    displayName: string;
    ruleSet: ProjectRuleSet;
    componentRuleOverrides: ProjectExecutionRuleOverride[];
  }
) {
  const instructions = handoff.task.instructions.map((instruction) => `- ${instruction}`).join("\n");
  const acceptanceCriteria = handoff.task.acceptanceCriteria
    .map((criterion) => `- ${criterion}`)
    .join("\n");
  const dependencySummary =
    handoff.task.dependsOn.length === 0 ? "none" : handoff.task.dependsOn.join(", ");
  const projectContext = project
    ? [
        `Project: ${project.displayName} (${project.projectKey})`,
        `Project ID: ${project.projectId}`
      ]
    : [];
  const reviewRules = project
    ? buildRuleSection("Project review instructions:", project.ruleSet.reviewInstructions)
    : null;
  const testRules = project
    ? buildRuleSection("Project test instructions:", project.ruleSet.testInstructions)
    : null;
  const componentRules =
    project && project.componentRuleOverrides.length > 0
      ? [
          "Component-specific rule overrides:",
          ...project.componentRuleOverrides.flatMap((override) => {
            const lines = [`- ${override.componentKey}`];

            if (override.reviewInstructions.length > 0) {
              lines.push(`  review: ${override.reviewInstructions.join("; ")}`);
            }

            if (override.testInstructions.length > 0) {
              lines.push(`  test: ${override.testInstructions.join("; ")}`);
            }

            return lines;
          })
        ].join("\n")
      : null;

  return [
    `Decision package: ${handoff.decisionPackageId}`,
    `Task ID: ${handoff.task.taskId}`,
    `Task: ${handoff.task.title}`,
    `Depends on: ${dependencySummary}`,
    ...projectContext,
    "",
    handoff.task.summary,
    "",
    "Instructions:",
    instructions,
    "",
    "Acceptance criteria:",
    acceptanceCriteria,
    ...(reviewRules ? ["", reviewRules] : []),
    ...(testRules ? ["", testRules] : []),
    ...(componentRules ? ["", componentRules] : []),
    "",
    "Projected decision_package, run_plan, and task_handoff artifacts are available under /artifacts/in if you need broader context before editing.",
    "",
    "When you finish, stage a concise durable handoff note under /artifacts/out and leave the workspace in a test-passing state."
  ].join("\n");
}

function resolveThinkTurnInput(
  projectExecution: ProjectExecutionSnapshot,
  handoff: Awaited<ReturnType<typeof loadTaskHandoffArtifact>>,
  options: RunExecutionOptions
) {
  if (
    projectExecution.components.length === 1 &&
    projectExecution.components[0]?.type === "inline" &&
    projectExecution.components[0].repoUrl === "fixture://demo-target" &&
    handoff.decisionPackageId === demoDecisionPackageFixture.decisionPackageId &&
    handoff.task.dependsOn.length === 0
  ) {
    if (options.thinkMode === "live") {
      return {};
    }

    return {
      mockModelPlan: createThinkSmokePlan()
    };
  }

  throw new NonRetryableError(
    "The Think runtime currently supports only independent fixture-scoped compiled demo handoffs."
  );
}

function buildPromotedArtifactKey(
  tenantId: string,
  runId: string,
  taskId: string,
  stagedPath: string
) {
  const relativePath = path.relative("/artifacts/out", path.normalize(stagedPath));

  if (!relativePath || relativePath.startsWith("..")) {
    throw new Error(`Staged artifact ${stagedPath} is outside /artifacts/out.`);
  }

  return `${tenantRunPrefix(tenantId, runId)}/tasks/${encodeURIComponent(taskId)}/artifacts/${relativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function promoteStagedArtifacts(
  env: WorkerBindings,
  client: ReturnType<typeof createWorkerDatabaseClient>,
  input: {
    tenantId: string;
    runId: string;
    sessionId: string;
    taskId: string;
    sandboxId: string;
    agentBridge: NonNullable<TaskSessionState["workspace"]>["agentBridge"];
    stagedArtifacts: AgentRuntimeArtifact[];
  }
) {
  if (input.stagedArtifacts.length === 0) {
    return [];
  }

  const { session } = await ensureSandboxSession({
    env,
    sandboxId: input.sandboxId,
    sessionId: input.sessionId
  });
  const artifactRefIds: string[] = [];

  for (const stagedArtifact of input.stagedArtifacts) {
    const file = await readSandboxAgentFile(
      {
        session,
        bridge: input.agentBridge
      },
      stagedArtifact.path
    );
    const contentType =
      file.mimeType ??
      stagedArtifact.contentType ??
      (file.isBinary ? "application/octet-stream" : "text/plain; charset=utf-8");
    const artifact = await putArtifactBytes(
      env.ARTIFACTS_BUCKET,
      "keystone-artifacts-dev",
      buildPromotedArtifactKey(
        input.tenantId,
        input.runId,
        input.taskId,
        stagedArtifact.path
      ),
      decodeArtifactBody(file.content, file.encoding),
      {
        httpMetadata: {
          contentType
        }
      }
    );
    const artifactRef =
      (await findArtifactRefByStorageUri(client, {
        tenantId: input.tenantId,
        runId: input.runId,
        sessionId: input.sessionId,
        taskId: input.taskId,
        kind: stagedArtifact.kind,
        storageUri: artifact.storageUri
      })) ??
      (await createArtifactRef(client, {
        tenantId: input.tenantId,
        runId: input.runId,
        sessionId: input.sessionId,
        taskId: input.taskId,
        kind: stagedArtifact.kind,
        storageBackend: artifact.storageBackend,
        storageUri: artifact.storageUri,
        contentType,
        sizeBytes: artifact.sizeBytes,
        metadata: {
          ...(stagedArtifact.metadata ?? {}),
          key: artifact.key,
          etag: artifact.etag,
          stagedPath: stagedArtifact.path
        }
      }));

    if (!artifactRef) {
      throw new Error(`Artifact ref could not be created for ${stagedArtifact.path}.`);
    }

    await appendAndPublishRunEvent(client, env, {
      tenantId: input.tenantId,
      runId: input.runId,
      sessionId: input.sessionId,
      taskId: input.taskId,
      eventType: "artifact.put",
      artifactRefId: artifactRef.artifactRefId,
      payload: {
        kind: stagedArtifact.kind,
        storageUri: artifact.storageUri,
        stagedPath: stagedArtifact.path
      },
      status: "active"
    });

    artifactRefIds.push(artifactRef.artifactRefId);
  }

  return artifactRefIds;
}
