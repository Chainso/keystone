import { getArtifactText } from "../artifacts/r2";
import { runPlanArtifactKey } from "../artifacts/keys";
import type { WorkerBindings } from "../../env";
import { compiledRunPlanSchema } from "../../keystone/compile/contracts";

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
