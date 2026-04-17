import { z } from "zod";

import type { WorkerBindings } from "../../env";
import { getArtifactText } from "../../lib/artifacts/r2";
import { runPlanArtifactKey, taskHandoffArtifactKey } from "../../lib/artifacts/keys";
import {
  compiledRunPlanSchema,
  compiledTaskSchema,
  type DecisionPackage
} from "../compile/contracts";

export const taskHandoffSchema = z.object({
  runId: z.string().trim().min(1),
  decisionPackageId: z.string().trim().min(1),
  task: compiledTaskSchema
});

export type TaskHandoff = z.infer<typeof taskHandoffSchema>;

function matchesDecisionTask(
  task: TaskHandoff["task"],
  decisionTask: DecisionPackage["tasks"][number]
) {
  return task.taskId === decisionTask.taskId || task.title === decisionTask.title;
}

export function assertFixtureScopedCompiledPlan(
  plan: ReturnType<typeof compiledRunPlanSchema.parse>,
  decisionPackage: DecisionPackage,
  sourceLabel = "Live Think compile"
) {
  if (plan.decisionPackageId !== decisionPackage.decisionPackageId) {
    throw new Error(
      `${sourceLabel} produced decision package ${plan.decisionPackageId}, expected ${decisionPackage.decisionPackageId}.`
    );
  }

  if (plan.tasks.length !== decisionPackage.tasks.length) {
    throw new Error(
      `${sourceLabel} produced ${plan.tasks.length} tasks, expected ${decisionPackage.tasks.length} for the current fixture-scoped happy path.`
    );
  }

  const unmatchedDecisionTasks = [...decisionPackage.tasks];

  for (const task of plan.tasks) {
    const matchIndex = unmatchedDecisionTasks.findIndex((decisionTask) =>
      matchesDecisionTask(task, decisionTask)
    );

    if (matchIndex === -1) {
      throw new Error(
        `${sourceLabel} could not reconcile task ${task.taskId} (${task.title}) with the approved fixture decision package; expected a matching task id or title.`
      );
    }

    unmatchedDecisionTasks.splice(matchIndex, 1);
  }

  const dependentTask = plan.tasks.find((task) => task.dependsOn.length > 0);

  if (dependentTask) {
    throw new Error(
      `${sourceLabel} returned unsupported dependsOn entries for task ${dependentTask.taskId}. Phase 3 still only supports independent fixture-scoped task handoffs.`
    );
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
