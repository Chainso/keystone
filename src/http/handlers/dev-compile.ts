import type { Context } from "hono";

import type { AppEnv } from "../../env";
import type { SessionStatus } from "../../maestro/contracts";
import { getRunCoordinatorStub } from "../../lib/auth/tenant";
import { listRunArtifacts } from "../../lib/db/artifacts";
import { createWorkerDatabaseClient } from "../../lib/db/client";
import { listRunEvents } from "../../lib/db/events";
import { createSessionRecord } from "../../lib/db/runs";
import { appendAndPublishRunEvent } from "../../lib/events/publish";
import { demoDecisionPackageFixture } from "../../lib/fixtures/demo-decision-package";
import { compileRunPlan } from "../../keystone/compile/plan-run";

export async function runCompileSmokeHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const client = createWorkerDatabaseClient(context.env);
  const runId = `compile-smoke-${crypto.randomUUID()}`;
  const runSessionId = crypto.randomUUID();
  const compileSessionId = crypto.randomUUID();
  const repo = {
    source: "localPath" as const,
    localPath: "./fixtures/demo-target",
    ref: "main"
  };

  try {
    const runSession = await createSessionRecord(
      client,
      {
        tenantId: auth.tenantId,
        runId,
        sessionType: "run",
        metadata: {
          smoke: true,
          repo,
          decisionPackageId: demoDecisionPackageFixture.decisionPackageId
        }
      },
      {
        sessionId: runSessionId
      }
    );

    if (!runSession) {
      throw new Error("Failed to create compile smoke run session.");
    }

    await createSessionRecord(
      client,
      {
        tenantId: auth.tenantId,
        runId,
        sessionType: "compile",
        parentSessionId: runSessionId,
        metadata: {
          smoke: true
        }
      },
      {
        sessionId: compileSessionId
      }
    );

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
        mode: "compile-smoke"
      },
      status: runSession.status as SessionStatus
    });

    const result = await compileRunPlan({
      env: context.env,
      client,
      tenantId: auth.tenantId,
      runId,
      runSessionId,
      compileSessionId,
      repo,
      decisionPackage: demoDecisionPackageFixture
    });

    const [events, artifacts] = await Promise.all([
      listRunEvents(client, {
        tenantId: auth.tenantId,
        runId
      }),
      listRunArtifacts(client, auth.tenantId, runId)
    ]);

    return context.json({
      ok: true,
      runId,
      compileSessionId,
      planSummary: result.plan.summary,
      taskCount: result.plan.tasks.length,
      model: result.completion.model,
      finishReason: result.completion.finishReason ?? null,
      usage: result.completion.usage ?? null,
      planArtifactRefId: result.planArtifactRef?.artifactRefId ?? null,
      taskHandoffArtifactCount: result.taskHandoffArtifactRefs.length,
      eventsObserved: events.length,
      artifactsObserved: artifacts.length
    });
  } finally {
    await client.close();
  }
}
