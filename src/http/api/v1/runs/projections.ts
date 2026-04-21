import type { WorkerBindings } from "../../../../env";
import { runPlanArtifactKey } from "../../../../lib/artifacts/keys";
import { getArtifactText } from "../../../../lib/artifacts/r2";
import { resolveRunExecutionEngine } from "../../../../lib/runs/options";
import type { ArtifactRefRow, RunRow, RunTaskDependencyRow, RunTaskRow } from "../../../../lib/db/schema";
import { compiledRunPlanSchema } from "../../../../keystone/compile/contracts";
import type { ArtifactResource } from "../artifacts/contracts";
import { artifactResourceSchema } from "../artifacts/contracts";
import type {
  RunResource,
  TaskResource,
  WorkflowGraphResource
} from "./contracts";
import {
  runResourceSchema,
  taskResourceSchema,
  workflowGraphResourceSchema
} from "./contracts";

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function buildDependsOnIndex(dependencies: RunTaskDependencyRow[]) {
  const dependsOnByTaskId = new Map<string, string[]>();

  for (const dependency of dependencies) {
    const existing = dependsOnByTaskId.get(dependency.childRunTaskId) ?? [];
    existing.push(dependency.parentRunTaskId);
    dependsOnByTaskId.set(dependency.childRunTaskId, existing);
  }

  return dependsOnByTaskId;
}


export async function loadCompiledRunPlan(
  env: Pick<WorkerBindings, "ARTIFACTS_BUCKET">,
  tenantId: string,
  runId: string
) {
  if (!env.ARTIFACTS_BUCKET || typeof env.ARTIFACTS_BUCKET.get !== "function") {
    return null;
  }

  const artifactText = await getArtifactText(env.ARTIFACTS_BUCKET, runPlanArtifactKey(tenantId, runId));

  if (!artifactText) {
    return null;
  }

  return compiledRunPlanSchema.parse(JSON.parse(artifactText));
}

export function projectRunResource(input: { run: RunRow }): RunResource {
  return runResourceSchema.parse({
    resourceType: "run",
    scaffold: {
      implementation: "reused",
      note: null
    },
    runId: input.run.runId,
    projectId: input.run.projectId,
    workflowInstanceId: input.run.workflowInstanceId,
    executionEngine: resolveRunExecutionEngine(input.run.executionEngine),
    status: input.run.status,
    compiledFrom:
      input.run.compiledSpecRevisionId &&
      input.run.compiledArchitectureRevisionId &&
      input.run.compiledExecutionPlanRevisionId &&
      input.run.compiledAt
        ? {
            specificationRevisionId: input.run.compiledSpecRevisionId,
            architectureRevisionId: input.run.compiledArchitectureRevisionId,
            executionPlanRevisionId: input.run.compiledExecutionPlanRevisionId,
            compiledAt: input.run.compiledAt.toISOString()
          }
        : null,
    startedAt: toIso(input.run.startedAt),
    endedAt: toIso(input.run.endedAt)
  });
}

export function projectTaskResources(input: {
  tenantId?: string;
  runId: string;
  runTasks: RunTaskRow[];
  dependencies: RunTaskDependencyRow[];
}): TaskResource[] {
  const dependsOnByTaskId = buildDependsOnIndex(input.dependencies);

  return input.runTasks.map((task) => {
    const dependsOn = dependsOnByTaskId.get(task.runTaskId) ?? [];

    return taskResourceSchema.parse({
      resourceType: "task",
      scaffold: {
        implementation: "reused",
        note: null
      },
      runId: input.runId,
      taskId: task.runTaskId,
      name: task.name,
      description: task.description,
      status: task.status,
      dependsOn,
      conversation:
        task.conversationAgentClass && task.conversationAgentName
          ? {
              agentClass: task.conversationAgentClass,
              agentName: task.conversationAgentName
            }
          : null,
      startedAt: toIso(task.startedAt),
      endedAt: toIso(task.endedAt)
    });
  });
}

export function projectWorkflowGraphResource(input: {
  tenantId?: string;
  runId: string;
  tasks: TaskResource[];
}): WorkflowGraphResource {
  return workflowGraphResourceSchema.parse({
    resourceType: "workflow_graph",
    scaffold: {
      implementation: "projected",
      note: "Projected from run_tasks and run_task_dependencies."
    },
    nodes: input.tasks.map((task) => ({
      taskId: task.taskId,
      name: task.name,
      status: task.status,
      dependsOn: task.dependsOn
    })),
    edges: input.tasks.flatMap((task) =>
      task.dependsOn.map((dependencyTaskId) => ({
        fromTaskId: dependencyTaskId,
        toTaskId: task.taskId
      }))
    ),
    summary: {
      totalTasks: input.tasks.length,
      activeTasks: input.tasks.filter((task) => task.status === "active").length,
      pendingTasks: input.tasks.filter((task) => task.status === "pending").length,
      completedTasks: input.tasks.filter((task) => task.status === "completed").length,
      readyTasks: input.tasks.filter((task) => task.status === "ready").length,
      failedTasks: input.tasks.filter((task) => task.status === "failed").length,
      cancelledTasks: input.tasks.filter((task) => task.status === "cancelled").length
    }
  });
}

export function projectArtifactResource(artifact: ArtifactRefRow): ArtifactResource {
  return artifactResourceSchema.parse({
    resourceType: "artifact",
    scaffold: {
      implementation: "reused",
      note: null
    },
    artifactId: artifact.artifactRefId,
    kind: artifact.artifactKind,
    contentType: artifact.contentType,
    sizeBytes: artifact.sizeBytes,
    sha256: artifact.sha256,
    contentUrl: `/v1/artifacts/${artifact.artifactRefId}/content`
  });
}
