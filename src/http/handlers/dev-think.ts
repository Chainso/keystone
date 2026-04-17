import { getAgentByName } from "agents";
import type { Context } from "hono";

import type { AppEnv } from "../../env";
import type { TaskSessionState } from "../../durable-objects/TaskSessionDO";
import type { SessionStatus } from "../../maestro/contracts";
import type { KeystoneThinkAgent } from "../../keystone/agents/base/KeystoneThinkAgent";
import { getRunCoordinatorStub, getTaskSessionStub } from "../../lib/auth/tenant";
import { createWorkerDatabaseClient } from "../../lib/db/client";
import { listRunEvents } from "../../lib/db/events";
import { createSessionRecord } from "../../lib/db/runs";
import { appendAndPublishRunEvent } from "../../lib/events/publish";
import { demoTargetFixtureFiles } from "../../lib/workspace/fixtures";
import { createThinkSmokePlan } from "../../keystone/agents/implementer/ImplementerAgent";

export async function runThinkSmokeHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const client = createWorkerDatabaseClient(context.env);
  const runId = `think-smoke-${crypto.randomUUID()}`;
  const runSessionId = crypto.randomUUID();
  const taskSessionId = crypto.randomUUID();
  const taskId = "think-smoke";

  try {
    const runSession = await createSessionRecord(
      client,
      {
        tenantId: auth.tenantId,
        runId,
        sessionType: "run",
        metadata: {
          smoke: true,
          runtime: "think"
        }
      },
      {
        sessionId: runSessionId
      }
    );

    if (!runSession) {
      throw new Error("Failed to create Think smoke run session.");
    }

    const coordinator = getRunCoordinatorStub(context.env, auth.tenantId, runId);
    await coordinator.initialize({
      tenantId: auth.tenantId,
      runId,
      status: runSession.status
    });

    await appendAndPublishRunEvent(client, context.env, {
      tenantId: auth.tenantId,
      runId,
      sessionId: runSessionId,
      eventType: "session.started",
      payload: {
        mode: "think-smoke"
      },
      status: runSession.status as SessionStatus
    });

    const taskSession = getTaskSessionStub(
      context.env,
      auth.tenantId,
      runId,
      taskSessionId,
      taskId
    );

    try {
      await taskSession.initialize({
        tenantId: auth.tenantId,
        runId,
        sessionId: taskSessionId,
        taskId,
        parentSessionId: runSessionId
      });

      const workspaceState = (await taskSession.ensureWorkspace({
        source: {
          type: "inline",
          repoUrl: "fixture://demo-target",
          repoRef: "main",
          baseRef: "main",
          files: demoTargetFixtureFiles
        }
      })) as TaskSessionState;

      const bridge = workspaceState.workspace?.agentBridge;

      if (!bridge) {
        throw new Error("Think smoke workspace did not materialize an agent bridge.");
      }

      const agent = await getAgentByName(
        context.env.KEYSTONE_THINK_AGENT,
        `tenant:${auth.tenantId}:run:${runId}:task:${taskSessionId}`
      ) as Pick<KeystoneThinkAgent, "runImplementerTurn">;
      const result = await agent.runImplementerTurn({
        tenantId: auth.tenantId,
        runId,
        sessionId: taskSessionId,
        taskId,
        prompt:
          "Update the greeting implementation, verify the fixture tests from the sandbox worktree, and stage a summary note in /artifacts/out.",
        sandboxId: workspaceState.sandboxId,
        agentBridge: bridge,
        mockModelPlan: createThinkSmokePlan()
      });

      const events = await listRunEvents(client, {
        tenantId: auth.tenantId,
        runId
      });

      return context.json({
        ok: true,
        runId,
        taskId,
        summary: result.summary ?? null,
        stagedArtifacts: result.stagedArtifacts,
        eventsObserved: events.length
      });
    } finally {
      await taskSession.teardown();
    }
  } finally {
    await client.close();
  }
}
