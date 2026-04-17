import type { Context } from "hono";

import type { AppEnv } from "../../env";
import type { TaskSessionState } from "../../durable-objects/TaskSessionDO";
import type { SessionStatus } from "../../maestro/contracts";
import { getRunCoordinatorStub, getTaskSessionStub } from "../../lib/auth/tenant";
import { createWorkerDatabaseClient } from "../../lib/db/client";
import { appendAndPublishRunEvent } from "../../lib/events/publish";
import { listRunEvents } from "../../lib/db/events";
import { createSessionRecord } from "../../lib/db/runs";
import { listRunWorkspaceBindings } from "../../lib/db/workspaces";
import { demoTargetFixtureFiles } from "../../lib/workspace/fixtures";

const POLL_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSandboxSmokeHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const client = createWorkerDatabaseClient(context.env);
  const runId = `smoke-${crypto.randomUUID()}`;
  const runSessionId = crypto.randomUUID();
  const taskSessionId = crypto.randomUUID();
  const taskId = "sandbox-smoke";

  try {
    const runSession = await createSessionRecord(
      client,
      {
        tenantId: auth.tenantId,
        runId,
        sessionType: "run",
        metadata: {
          smoke: true
        }
      },
      {
        sessionId: runSessionId
      }
    );

    if (!runSession) {
      throw new Error("Failed to create smoke run session.");
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
        mode: "sandbox-smoke"
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
    await taskSession.startProcess({
      command: "npm test"
    });

    let latestState = workspaceState;
    const startedAt = Date.now();

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      latestState = (await taskSession.pollProcess()) as TaskSessionState;

      if (
        latestState.activeProcess &&
        ["completed", "failed", "killed", "error"].includes(latestState.activeProcess.status)
      ) {
        break;
      }

      await sleep(POLL_INTERVAL_MS);
    }

    await taskSession.teardown();

    const [events, bindings] = await Promise.all([
      listRunEvents(client, {
        tenantId: auth.tenantId,
        runId
      }),
      listRunWorkspaceBindings(client, {
        tenantId: auth.tenantId,
        runId
      })
    ]);

    return context.json({
      ok: true,
      runId,
      taskId,
      workspaceId: latestState.workspace?.workspaceId ?? null,
      worktreePath: latestState.workspace?.worktreePath ?? null,
      process: latestState.activeProcess ?? null,
      eventsObserved: events.length,
      workspaceBindingsObserved: bindings.length
    });
  } finally {
    await client.close();
  }
}
