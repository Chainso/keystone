import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowInstanceStatus,
  type WorkflowStep
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import type { WorkerBindings } from "../env";
import { listRunArtifacts } from "../lib/db/artifacts";
import { createWorkerDatabaseClient } from "../lib/db/client";
import { getProject } from "../lib/db/projects";
import {
  ensureRunRecord,
  failRunAndCancelOutstandingTasks,
  getRunRecord,
  listRunTaskDependencies,
  listRunTasks,
  persistCompiledRunGraph,
  updateRunTask,
} from "../lib/db/runs";
import { loadRequiredRunPlanningDocuments } from "../lib/documents/runtime";
import {
  buildProjectExecutionSnapshot,
  type ProjectExecutionSnapshot
} from "../lib/projects/runtime";
import type { ExecutionEngine } from "../lib/runs/options";
import {
  isLiveThinkExecution,
  isMockThinkExecution,
  resolveRunExecutionEngine
} from "../lib/runs/options";
import {
  buildRunWorkflowInstanceId,
  buildTaskWorkflowInstanceId
} from "../lib/workflows/ids";
import { loadExistingRunPlan } from "../lib/workflows/idempotency";
import { buildRunSandboxId } from "../lib/workspace/worktree";
import {
  compileDemoFixtureRunPlan,
  compileRunPlan,
  type CompileRepoSource
} from "../keystone/compile/plan-run";
import { finalizeRun } from "../keystone/integration/finalize-run";
import {
  assertCompiledPlanIsInternallyConsistent,
  loadCompiledRunPlanArtifact,
  loadTaskHandoffArtifact
} from "../keystone/tasks/load-task-contracts";

export interface RunWorkflowParams {
  tenantId: string;
  runId: string;
  projectId: string;
  executionEngine?: ExecutionEngine | undefined;
  preserveSandbox?: boolean | undefined;
}

const DEFAULT_MAX_TASK_POLL_ATTEMPTS = 20;
const LIVE_THINK_MAX_TASK_POLL_ATTEMPTS = 120;

interface FinalizeRunSnapshot {
  finalStatus: string;
  runSummaryArtifactRefId: string;
  successfulTasks: number;
  failedTasks: number;
}

interface TaskWorkflowFanoutEntry {
  id: string;
  params: {
    tenantId: string;
    runId: string;
    sandboxId: string;
    taskId: string;
    runTaskId: string;
    executionEngine: ExecutionEngine;
    preserveSandbox: boolean;
    project: {
      projectId: string;
      projectKey: string;
      displayName: string;
    };
  };
}

interface RunContextSnapshot {
  workflowInstanceId: string;
  sandboxId: string;
  compileRepo: CompileRepoSource;
  projectExecution: ProjectExecutionSnapshot;
  executionEngine: ExecutionEngine;
  preserveSandbox: boolean;
}

function isMissingWorkflowInstanceStatus(status: WorkflowInstanceStatus) {
  return status === "unknown";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type RunTaskRows = Awaited<ReturnType<typeof listRunTasks>>;
type RunTaskDependencyRows = Awaited<ReturnType<typeof listRunTaskDependencies>>;
type CompiledRunPlan = Awaited<ReturnType<typeof loadCompiledRunPlanArtifact>>;
type CompiledRunPlanTask = CompiledRunPlan["tasks"][number];
type PersistedCompiledRunPlanTask = Omit<CompiledRunPlanTask, "runTaskId"> & {
  runTaskId: string;
};
type PersistedCompiledRunPlan = Omit<CompiledRunPlan, "tasks"> & {
  tasks: PersistedCompiledRunPlanTask[];
};

async function getTaskWorkflowInstanceStatus(
  workflow: WorkerBindings["TASK_WORKFLOW"],
  instanceId: string
) {
  try {
    const instance = await workflow.get(instanceId);
    const status = await instance.status();

    return status.status;
  } catch {
    return "unknown" as const;
  }
}

async function ensureTaskWorkflowFanout(
  workflow: WorkerBindings["TASK_WORKFLOW"],
  batch: TaskWorkflowFanoutEntry[]
) {
  const instanceStatuses = await Promise.all(
    batch.map(async (entry) => ({
      entry,
      status: await getTaskWorkflowInstanceStatus(workflow, entry.id)
    }))
  );
  const missingEntries = instanceStatuses
    .filter((entry) => isMissingWorkflowInstanceStatus(entry.status))
    .map((entry) => entry.entry);

  if (missingEntries.length === 0) {
    return batch.map((entry) => entry.id);
  }

  try {
    await workflow.createBatch(missingEntries);
  } catch (error) {
    const unresolvedEntries: string[] = [];

    for (const entry of missingEntries) {
      const status = await getTaskWorkflowInstanceStatus(workflow, entry.id);

      if (isMissingWorkflowInstanceStatus(status)) {
        unresolvedEntries.push(entry.id);
      }
    }

    if (unresolvedEntries.length > 0) {
      throw error;
    }
  }

  return batch.map((entry) => entry.id);
}

function isTerminalRunTaskStatus(status: string) {
  return status === "completed" || status === "failed" || status === "cancelled" || status === "archived";
}

function hasRecordedExecutionState(task: RunTaskRows[number]) {
  return (
    task.startedAt !== null ||
    task.endedAt !== null ||
    task.conversationAgentClass !== null ||
    task.conversationAgentName !== null ||
    task.status === "active" ||
    task.status === "completed" ||
    task.status === "failed" ||
    task.status === "cancelled" ||
    task.status === "archived"
  );
}

function buildDependsOnIndex(dependencies: RunTaskDependencyRows) {
  const dependsOnByTaskId = new Map<string, string[]>();

  for (const dependency of dependencies) {
    const existing = dependsOnByTaskId.get(dependency.childRunTaskId) ?? [];
    existing.push(dependency.parentRunTaskId);
    dependsOnByTaskId.set(dependency.childRunTaskId, existing);
  }

  return dependsOnByTaskId;
}

function isRunTaskReady(task: RunTaskRows[number], tasksById: Map<string, RunTaskRows[number]>, dependsOn: string[]) {
  if (task.status === "ready") {
    return true;
  }

  if (task.status !== "pending") {
    return false;
  }

  return dependsOn.every((parentRunTaskId) => tasksById.get(parentRunTaskId)?.status === "completed");
}

function isRunTaskBlocked(
  task: RunTaskRows[number],
  tasksById: Map<string, RunTaskRows[number]>,
  dependsOn: string[]
) {
  if (task.status !== "pending") {
    return false;
  }

  return dependsOn.some((parentRunTaskId) => {
    const parentStatus = tasksById.get(parentRunTaskId)?.status;

    return parentStatus === "failed" || parentStatus === "cancelled";
  });
}

function normalizeCompiledRunPlanForExecution(plan: CompiledRunPlan): PersistedCompiledRunPlan {
  const seenRunTaskIds = new Set<string>();

  return {
    ...plan,
    tasks: plan.tasks.map((task) => {
      if (!task.runTaskId) {
        throw new Error(`Compiled plan task ${task.taskId} is missing its persisted runTaskId.`);
      }

      if (seenRunTaskIds.has(task.runTaskId)) {
        throw new Error(`Compiled plan contains duplicate runTaskId ${task.runTaskId}.`);
      }

      seenRunTaskIds.add(task.runTaskId);

      return {
        ...task,
        runTaskId: task.runTaskId
      };
    })
  };
}

function buildPlanTasksByRunTaskId(plan: PersistedCompiledRunPlan) {
  return new Map(plan.tasks.map((task) => [task.runTaskId, task]));
}

function buildTaskWorkflowFanoutBatch(input: {
  tenantId: string;
  runId: string;
  sandboxId: string;
  executionEngine: ExecutionEngine;
  preserveSandbox: boolean;
  project: {
    projectId: string;
    projectKey: string;
    displayName: string;
  };
  runTasks: RunTaskRows;
  planTasksByRunTaskId: Map<string, PersistedCompiledRunPlanTask>;
}) {
  const activeTasks = input.runTasks.filter((task) => task.status === "active");
  const readyTasks = input.runTasks.filter((task) => task.status === "ready");
  const scheduledTasks =
    activeTasks.length > 0 ? activeTasks : readyTasks.length > 0 ? [readyTasks[0]!] : [];

  return scheduledTasks
    .map((task) => {
      const planTask = input.planTasksByRunTaskId.get(task.runTaskId);

      if (!planTask) {
        throw new Error(`Compiled plan task could not be resolved for run task ${task.runTaskId}.`);
      }

      return {
        id: buildTaskWorkflowInstanceId(input.tenantId, input.runId, task.runTaskId),
        params: {
          tenantId: input.tenantId,
          runId: input.runId,
          sandboxId: input.sandboxId,
          taskId: planTask.taskId,
          runTaskId: task.runTaskId,
          project: input.project,
          executionEngine: input.executionEngine,
          preserveSandbox: input.preserveSandbox
        }
      } satisfies TaskWorkflowFanoutEntry;
    });
}

async function loadRunTaskGraph(
  env: WorkerBindings,
  input: {
    tenantId: string;
    runId: string;
  }
) {
  const client = createWorkerDatabaseClient(env);

  try {
    const [runTasks, dependencies] = await Promise.all([
      listRunTasks(client, input),
      listRunTaskDependencies(client, input)
    ]);

    return {
      runTasks,
      dependencies
    };
  } finally {
    await client.close();
  }
}

async function promoteNewlyReadyRunTasks(
  env: WorkerBindings,
  input: {
    tenantId: string;
    runId: string;
  }
) {
  const client = createWorkerDatabaseClient(env);

  try {
    const [runTasks, dependencies] = await Promise.all([
      listRunTasks(client, input),
      listRunTaskDependencies(client, input)
    ]);
    const tasksById = new Map(runTasks.map((task) => [task.runTaskId, task]));
    const dependsOnByTaskId = buildDependsOnIndex(dependencies);
    const promoted: RunTaskRows = [];

    for (const task of runTasks) {
      const dependsOn = dependsOnByTaskId.get(task.runTaskId) ?? [];

      if (!isRunTaskReady(task, tasksById, dependsOn)) {
        continue;
      }

      if (task.status === "ready") {
        promoted.push(task);
        continue;
      }

      const updated = await updateRunTask(client, {
        tenantId: input.tenantId,
        runId: input.runId,
        runTaskId: task.runTaskId,
        status: "ready"
      });
      tasksById.set(updated.runTaskId, updated);
      promoted.push(updated);
    }

    return promoted;
  } finally {
    await client.close();
  }
}

async function cancelBlockedRunTasks(
  env: WorkerBindings,
  input: {
    tenantId: string;
    runId: string;
  }
) {
  const client = createWorkerDatabaseClient(env);

  try {
    const [runTasks, dependencies] = await Promise.all([
      listRunTasks(client, input),
      listRunTaskDependencies(client, input)
    ]);
    const tasksById = new Map(runTasks.map((task) => [task.runTaskId, task]));
    const dependsOnByTaskId = buildDependsOnIndex(dependencies);
    const cancelled: RunTaskRows = [];

    for (const task of runTasks) {
      const dependsOn = dependsOnByTaskId.get(task.runTaskId) ?? [];

      if (!isRunTaskBlocked(task, tasksById, dependsOn)) {
        continue;
      }

      const updated = await updateRunTask(client, {
        tenantId: input.tenantId,
        runId: input.runId,
        runTaskId: task.runTaskId,
        status: "cancelled",
        endedAt: task.endedAt ?? new Date()
      });
      tasksById.set(updated.runTaskId, updated);
      cancelled.push(updated);
    }

    return cancelled;
  } finally {
    await client.close();
  }
}

export function shouldUseFixtureCompileForRun(
  repo: CompileRepoSource,
  executionEngine: ExecutionEngine
) {
  return (
    isMockThinkExecution(executionEngine) &&
    repo.source === "localPath" &&
    repo.localPath.endsWith("fixtures/demo-target")
  );
}

export class RunWorkflow extends WorkflowEntrypoint<WorkerBindings, RunWorkflowParams> {
  async run(event: Readonly<WorkflowEvent<RunWorkflowParams>>, step: WorkflowStep) {
    const workflowInstanceId = buildRunWorkflowInstanceId(event.payload.tenantId, event.payload.runId);
    let runContext!: RunContextSnapshot;
    let compileSummary!: {
      taskCount: number;
    };
    let finalizedRun!: FinalizeRunSnapshot;

    try {
      runContext = (await step.do("load run context", async () => {
        const client = createWorkerDatabaseClient(this.env);

        try {
          const project = await getProject(client, {
            tenantId: event.payload.tenantId,
            projectId: event.payload.projectId
          });

          if (!project) {
            throw new NonRetryableError(
              `Project ${event.payload.projectId} was not found for tenant ${event.payload.tenantId}.`
            );
          }

          const projectExecution = buildProjectExecutionSnapshot(project, {
            requireCompileTarget: true
          });

          if (!projectExecution.compileRepo) {
            throw new Error(
              `Project ${project.projectId} did not resolve a compile target after validation.`
            );
          }

          const compileRepo = projectExecution.compileRepo;
          const existingRunRecord = await getRunRecord(client, {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId
          });

          if (
            existingRunRecord &&
            (existingRunRecord.status === "archived" ||
              existingRunRecord.status === "failed" ||
              existingRunRecord.status === "cancelled")
          ) {
            throw new NonRetryableError(
              `Run ${event.payload.runId} is already ${existingRunRecord.status} and cannot be restarted.`
            );
          }

          const sandboxId =
            existingRunRecord?.sandboxId ?? buildRunSandboxId(event.payload.tenantId, event.payload.runId);
          const executionEngine = resolveRunExecutionEngine(
            event.payload.executionEngine,
            existingRunRecord?.executionEngine
          );
          const preserveSandbox = event.payload.preserveSandbox ?? false;

          await ensureRunRecord(client, {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId,
            projectId: project.projectId,
            workflowInstanceId,
            executionEngine,
            sandboxId,
            status: "active"
          });

          return {
            workflowInstanceId,
            sandboxId,
            compileRepo,
            projectExecution,
            executionEngine,
            preserveSandbox
          };
        } finally {
          await client.close();
        }
      })) as RunContextSnapshot;

      compileSummary = await step.do("compile plan", async () => {
        const client = createWorkerDatabaseClient(this.env);

        try {
          const planningDocuments = await loadRequiredRunPlanningDocuments(this.env, client, {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId
          });
          const existingPlan = await loadExistingRunPlan(this.env, event.payload.tenantId, event.payload.runId);
          const existingPlanMatchesCurrentDocuments =
            existingPlan?.sourceRevisionIds.specification === planningDocuments.specification.revisionId &&
            existingPlan?.sourceRevisionIds.architecture === planningDocuments.architecture.revisionId &&
            existingPlan?.sourceRevisionIds.executionPlan === planningDocuments.executionPlan.revisionId;
          const compilePlanIsComplete = async () => {
            if (!existingPlan || !existingPlanMatchesCurrentDocuments) {
              return false;
            }

            try {
              const runArtifacts = await listRunArtifacts(client, event.payload.tenantId, event.payload.runId);
              const planArtifact = runArtifacts.find(
                (artifact) => artifact.artifactKind === "run_plan"
              );
              const handoffArtifacts = runArtifacts.filter(
                (artifact) => artifact.artifactKind === "task_handoff"
              );

              if (!planArtifact || handoffArtifacts.length < existingPlan.tasks.length) {
                return false;
              }

              for (const task of existingPlan.tasks) {
                if (!task.runTaskId) {
                  return false;
                }

                await loadTaskHandoffArtifact(
                  this.env,
                  event.payload.tenantId,
                  event.payload.runId,
                  task.runTaskId
                );
              }
            } catch {
              return false;
            }

            return true;
          };

          const persistedPlan = existingPlan && (await compilePlanIsComplete()) ? existingPlan : null;

          if (persistedPlan) {
            const existingRunTasks = await listRunTasks(client, {
              tenantId: event.payload.tenantId,
              runId: event.payload.runId
            });
            const existingRunTaskIds = new Set(existingRunTasks.map((task) => task.runTaskId));
            const missingPersistedTasks = persistedPlan.tasks.filter(
              (task) => !task.runTaskId || !existingRunTaskIds.has(task.runTaskId)
            );
            const hasExecutionState = existingRunTasks.some((task) => hasRecordedExecutionState(task));

            if (hasExecutionState && missingPersistedTasks.length > 0) {
              throw new NonRetryableError(
                `Run ${event.payload.runId} is missing persisted task rows for its compiled plan after execution state was recorded.`
              );
            }

            if (!hasExecutionState && missingPersistedTasks.length > 0) {
              await persistCompiledRunGraph(client, {
                tenantId: event.payload.tenantId,
                runId: event.payload.runId,
                compiledSpecRevisionId: persistedPlan.sourceRevisionIds.specification,
                compiledArchitectureRevisionId: persistedPlan.sourceRevisionIds.architecture,
                compiledExecutionPlanRevisionId: persistedPlan.sourceRevisionIds.executionPlan,
                tasks: persistedPlan.tasks.map((task) => ({
                  taskId: task.taskId,
                  runTaskId: task.runTaskId,
                  name: task.title,
                  description: task.summary,
                  dependsOn: task.dependsOn
                }))
              });
            }

            return {
              taskCount: persistedPlan.tasks.length
            };
          }

          const compile = shouldUseFixtureCompileForRun(
            runContext.compileRepo,
            runContext.executionEngine
          )
            ? compileDemoFixtureRunPlan
            : compileRunPlan;
          const result = await compile({
            env: this.env,
            client,
            tenantId: event.payload.tenantId,
            projectId: event.payload.projectId,
            runId: event.payload.runId,
            repo: runContext.compileRepo,
            planningDocuments: {
              specification: {
                revisionId: planningDocuments.specification.revisionId,
                path: planningDocuments.specification.document.path,
                body: planningDocuments.specification.body
              },
              architecture: {
                revisionId: planningDocuments.architecture.revisionId,
                path: planningDocuments.architecture.document.path,
                body: planningDocuments.architecture.body
              },
              executionPlan: {
                revisionId: planningDocuments.executionPlan.revisionId,
                path: planningDocuments.executionPlan.document.path,
                body: planningDocuments.executionPlan.body
              }
            }
          });

          return {
            taskCount: result.plan.tasks.length
          };
        } finally {
          await client.close();
        }
      });

      const compiledPlan = (await step.do("load compiled task graph", async () => {
        const plan = await loadCompiledRunPlanArtifact(this.env, event.payload.tenantId, event.payload.runId);

        if (isLiveThinkExecution(runContext.executionEngine)) {
          try {
            assertCompiledPlanIsInternallyConsistent(plan, "Persisted live Think plan");
          } catch (error) {
            throw new NonRetryableError(
              error instanceof Error ? error.message : String(error)
            );
          }
        }

        return normalizeCompiledRunPlanForExecution(plan);
      })) as PersistedCompiledRunPlan;
      const planTasksByRunTaskId = buildPlanTasksByRunTaskId(compiledPlan);

      const maxTaskPollAttempts = isLiveThinkExecution(runContext.executionEngine)
        ? LIVE_THINK_MAX_TASK_POLL_ATTEMPTS
        : DEFAULT_MAX_TASK_POLL_ATTEMPTS;

      for (let attempt = 0; attempt < maxTaskPollAttempts; attempt += 1) {
        const pollSnapshot = (await step.do(
          `schedule and poll task workflows ${attempt}`,
          async () => {
            await cancelBlockedRunTasks(this.env, {
              tenantId: event.payload.tenantId,
              runId: event.payload.runId
            });
            await promoteNewlyReadyRunTasks(this.env, {
              tenantId: event.payload.tenantId,
              runId: event.payload.runId
            });

            const graph = await loadRunTaskGraph(this.env, {
              tenantId: event.payload.tenantId,
              runId: event.payload.runId
            });
            const batch = buildTaskWorkflowFanoutBatch({
              tenantId: event.payload.tenantId,
              runId: event.payload.runId,
              sandboxId: runContext.sandboxId,
              executionEngine: runContext.executionEngine,
              preserveSandbox: runContext.preserveSandbox,
              project: {
                projectId: runContext.projectExecution.projectId,
                projectKey: runContext.projectExecution.projectKey,
                displayName: runContext.projectExecution.displayName
              },
              runTasks: graph.runTasks,
              planTasksByRunTaskId
            });

            await ensureTaskWorkflowFanout(this.env.TASK_WORKFLOW, batch);

            return {
              runTasks: graph.runTasks
            };
          }
        )) as { runTasks: RunTaskRows };

        if (pollSnapshot.runTasks.every((task) => isTerminalRunTaskStatus(task.status))) {
          break;
        }

        await step.sleep(`wait for task workflows ${attempt}`, "1 second");
      }

      const finalizedRunTasks = (await step.do("load finalized run task graph", async () => {
        const { runTasks } = await loadRunTaskGraph(this.env, {
          tenantId: event.payload.tenantId,
          runId: event.payload.runId
        });

        return runTasks;
      })) as RunTaskRows;

      if (!finalizedRunTasks.every((task) => isTerminalRunTaskStatus(task.status))) {
        throw new NonRetryableError("Task workflows did not reach a terminal state within the polling window.");
      }

      finalizedRun = await step.do("finalize run", async () => {
        const client = createWorkerDatabaseClient(this.env);

        try {
          const result = await finalizeRun(this.env, client, {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId
          });

          return {
            finalStatus: result.finalStatus,
            runSummaryArtifactRefId: result.artifactRef.artifactRefId,
            successfulTasks: result.summary.successfulTasks,
            failedTasks: result.summary.failedTasks
          };
        } finally {
          await client.close();
        }
      });
    } catch (error) {
      await step.do("fail run and cancel outstanding tasks after error", async () => {
        const client = createWorkerDatabaseClient(this.env);

        try {
          const result = await failRunAndCancelOutstandingTasks(client, {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId
          });

          return {
            status: result.run.status,
            cancelledTasks: result.cancelledTasks.length
          };
        } finally {
          await client.close();
        }
      });

      throw error;
    }

    return {
      runId: event.payload.runId,
      workflowInstanceId,
      taskCount: compileSummary.taskCount,
      finalStatus: finalizedRun.finalStatus,
      runSummaryArtifactRefId: finalizedRun.runSummaryArtifactRefId
    };
  }
}
