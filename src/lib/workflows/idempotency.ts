import type { SessionSpec } from "../../maestro/contracts";
import { getArtifactText } from "../artifacts/r2";
import { runPlanArtifactKey } from "../artifacts/keys";
import type { WorkerBindings } from "../../env";
import { compiledRunPlanSchema } from "../../keystone/compile/contracts";
import type { DatabaseClient } from "../db/client";
import { createSessionRecord, getSessionRecord } from "../db/runs";

export async function ensureSessionRecord(
  client: DatabaseClient,
  sessionSpec: SessionSpec,
  sessionId: string
) {
  const existing = await getSessionRecord(client, sessionSpec.tenantId, sessionId);

  if (existing) {
    return existing;
  }

  return createSessionRecord(client, sessionSpec, {
    sessionId
  });
}

export async function loadExistingRunPlan(
  env: Pick<WorkerBindings, "ARTIFACTS_BUCKET">,
  tenantId: string,
  runId: string
) {
  const existingArtifact = await getArtifactText(
    env.ARTIFACTS_BUCKET,
    runPlanArtifactKey(tenantId, runId)
  );

  if (!existingArtifact) {
    return null;
  }

  return compiledRunPlanSchema.parse(JSON.parse(existingArtifact));
}
