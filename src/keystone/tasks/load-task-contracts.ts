import { z } from "zod";

import type { WorkerBindings } from "../../env";
import { getArtifactText } from "../../lib/artifacts/r2";
import { runPlanArtifactKey, taskHandoffArtifactKey } from "../../lib/artifacts/keys";
import {
  compiledRunPlanSchema,
  compiledRunPlanSourceRevisionIdsSchema,
  compiledTaskSchema
} from "../compile/contracts";

export const taskHandoffSchema = z.object({
  runId: z.string().trim().min(1),
  runTaskId: z.string().uuid(),
  sourceRevisionIds: compiledRunPlanSourceRevisionIdsSchema,
  task: compiledTaskSchema
});

export type TaskHandoff = z.infer<typeof taskHandoffSchema>;

export function assertCompiledPlanIsInternallyConsistent(
  plan: ReturnType<typeof compiledRunPlanSchema.parse>,
  sourceLabel = "Compiled run plan"
) {
  const planTaskIds = new Set(plan.tasks.map((task) => task.taskId));

  if (planTaskIds.size !== plan.tasks.length) {
    throw new Error(`${sourceLabel} contains duplicate task ids.`);
  }

  for (const task of plan.tasks) {
    for (const dependencyId of task.dependsOn) {
      if (dependencyId === task.taskId) {
        throw new Error(
          `${sourceLabel} returned an invalid self-dependency for task ${task.taskId}.`
        );
      }

      if (!planTaskIds.has(dependencyId)) {
        throw new Error(
          `${sourceLabel} returned unsupported dependsOn entries for task ${task.taskId}; dependency ${dependencyId} is not present in the compiled plan.`
        );
      }
    }
  }
}

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
  runTaskId: string
) {
  const artifactText = await getArtifactText(
    env.ARTIFACTS_BUCKET,
    taskHandoffArtifactKey(tenantId, runId, runTaskId)
  );

  if (!artifactText) {
    throw new Error(`Task handoff artifact was not found for run task ${runTaskId}.`);
  }

  return taskHandoffSchema.parse(JSON.parse(artifactText));
}
