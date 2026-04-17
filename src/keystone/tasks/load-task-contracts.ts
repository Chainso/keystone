import { z } from "zod";

import type { WorkerBindings } from "../../env";
import { getArtifactText } from "../../lib/artifacts/r2";
import { runPlanArtifactKey, taskHandoffArtifactKey } from "../../lib/artifacts/keys";
import { compiledRunPlanSchema, compiledTaskSchema } from "../compile/contracts";

export const taskHandoffSchema = z.object({
  runId: z.string().trim().min(1),
  decisionPackageId: z.string().trim().min(1),
  task: compiledTaskSchema
});

export type TaskHandoff = z.infer<typeof taskHandoffSchema>;

export async function loadCompiledRunPlanArtifact(
  env: Pick<WorkerBindings, "ARTIFACTS_BUCKET">,
  tenantId: string,
  runId: string
) {
  const artifactText = await getArtifactText(env.ARTIFACTS_BUCKET, runPlanArtifactKey(tenantId, runId));

  if (!artifactText) {
    throw new Error(`Run plan artifact was not found for ${tenantId}/${runId}.`);
  }

  return compiledRunPlanSchema.parse(JSON.parse(artifactText));
}

export async function loadTaskHandoffArtifact(
  env: Pick<WorkerBindings, "ARTIFACTS_BUCKET">,
  tenantId: string,
  runId: string,
  taskId: string
) {
  const artifactText = await getArtifactText(
    env.ARTIFACTS_BUCKET,
    taskHandoffArtifactKey(tenantId, runId, taskId)
  );

  if (!artifactText) {
    throw new Error(`Task handoff artifact was not found for task ${taskId}.`);
  }

  return taskHandoffSchema.parse(JSON.parse(artifactText));
}
