import type { Context } from "hono";

import type { AppEnv } from "../../env";
import { getRunCoordinatorStub } from "../../lib/auth/tenant";
import { createWorkerDatabaseClient } from "../../lib/db/client";
import { appendSessionEvent, listRunEvents } from "../../lib/db/events";
import { listRunArtifacts } from "../../lib/db/artifacts";
import { createSessionRecord, listRunSessions } from "../../lib/db/runs";
import { jsonErrorResponse } from "../../lib/http/errors";
import { buildRunSummary } from "../../lib/runs/summary";
import { parseRunInput } from "../contracts/run-input";

export async function createRunHandler(context: Context<AppEnv>) {
  const body = await context.req.json();
  const auth = context.get("auth");
  const input = parseRunInput(body);
  const runId = crypto.randomUUID();
  const client = createWorkerDatabaseClient(context.env);

  try {
    const session = await createSessionRecord(client, {
      tenantId: auth.tenantId,
      runId,
      sessionType: "run",
      metadata: {
        authMode: auth.authMode,
        repo: input.repo,
        decisionPackage: input.decisionPackage
      }
    });

    if (!session) {
      return jsonErrorResponse("session_create_failed", "Run session creation failed.", 500);
    }

    await appendSessionEvent(client, {
      tenantId: auth.tenantId,
      runId,
      sessionId: session.sessionId,
      eventType: "session.started",
      actor: "keystone",
      payload: {
        inputMode: {
          repo: input.repo.source,
          decisionPackage: input.decisionPackage.source
        }
      }
    });

    const coordinator = getRunCoordinatorStub(context.env, auth.tenantId, runId);
    await coordinator.initialize({
      tenantId: auth.tenantId,
      runId,
      status: session.status
    });
    await coordinator.publish({
      eventType: "session.started",
      severity: "info",
      status: session.status
    });

    return context.json(
      {
        runId,
        status: "accepted",
        tenantId: auth.tenantId,
        authMode: auth.authMode,
        inputMode: {
          repo: input.repo.source,
          decisionPackage: input.decisionPackage.source
        },
        summaryUrl: `/v1/runs/${runId}`,
        websocketUrl: `/v1/runs/${runId}/ws`,
        message:
          "Phase 3 accepted the run and persisted the initial tenant-scoped session state."
      },
      202
    );
  } finally {
    await client.close();
  }
}

export async function getRunHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const runId = context.req.param("runId");

  if (!runId) {
    return jsonErrorResponse("invalid_path", "Run ID is required.", 400);
  }

  const client = createWorkerDatabaseClient(context.env);

  try {
    const sessions = await listRunSessions(client, auth.tenantId, runId);

    if (sessions.length === 0) {
      return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
    }

    const [events, artifacts] = await Promise.all([
      listRunEvents(client, {
        tenantId: auth.tenantId,
        runId
      }),
      listRunArtifacts(client, auth.tenantId, runId)
    ]);
    const coordinator = getRunCoordinatorStub(context.env, auth.tenantId, runId);
    const snapshot = await coordinator.getSnapshot();
    const summary = buildRunSummary({
      tenantId: auth.tenantId,
      runId,
      sessions,
      events,
      artifacts,
      liveSnapshot: snapshot
    });

    return context.json(summary);
  } finally {
    await client.close();
  }
}
