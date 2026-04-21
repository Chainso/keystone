import { useEffect, useState } from "react";

import { buildRunPhasePath, buildRunTaskPath } from "../../shared/navigation/run-phases";
import { useRunDetail } from "../runs/run-detail-context";

type ConversationLocator = {
  agentClass: string;
  agentName: string;
};

export interface ExecutionNodeViewModel {
  detailPath: string;
  dependencyCount: number;
  status: string;
  taskId: string;
  title: string;
}

export interface ExecutionRowViewModel {
  depth: number;
  rowId: string;
  tasks: ExecutionNodeViewModel[];
}

export interface RunExecutionReadyViewModel {
  rows: ExecutionRowViewModel[];
  state: "ready";
  summary: string;
}

export interface RunExecutionEmptyViewModel {
  message: string;
  state: "empty";
}

export interface RunExecutionPendingViewModel {
  message: string;
  refresh: () => void;
  refreshLabel: string;
  state: "pending";
}

export type RunExecutionViewModel =
  | RunExecutionReadyViewModel
  | RunExecutionEmptyViewModel
  | RunExecutionPendingViewModel;

export interface TaskArtifactViewModel {
  artifactId: string;
  contentType: string;
  contentUrl: string;
  kind: string;
  sha256: string | null;
  sizeLabel: string;
}

export interface TaskArtifactsViewModel {
  items: TaskArtifactViewModel[];
  message: string | null;
  retry?: (() => void) | undefined;
  state: "loading" | "ready" | "empty" | "error";
}

export interface TaskDependencyViewModel {
  taskId: string;
  title: string;
}

export interface TaskDetailReadyViewModel {
  artifacts: TaskArtifactsViewModel;
  backPath: string;
  conversationLocator: ConversationLocator | null;
  dependsOn: TaskDependencyViewModel[];
  downstreamTasks: TaskDependencyViewModel[];
  runDisplayId: string;
  state: "ready";
  status: string;
  taskDisplayId: string;
  title: string;
}

export interface TaskDetailStateViewModel {
  backPath: string;
  message: string;
  runDisplayId: string;
  state: "not_found" | "unavailable";
  taskDisplayId: string;
}

export type TaskDetailViewModel =
  | TaskDetailReadyViewModel
  | TaskDetailStateViewModel;

function formatByteSize(sizeBytes: number | null) {
  if (sizeBytes === null) {
    return "Size unavailable";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useReadyRunDetail() {
  const runDetail = useRunDetail();

  if (runDetail.meta.status !== "ready" || !runDetail.state.run || !runDetail.state.workflow) {
    throw new Error("Execution view models require a ready RunDetailProvider.");
  }

  return runDetail;
}

function groupTasksByDepth(tasks: ReturnType<typeof useReadyRunDetail>["state"]["tasks"]) {
  const tasksById = new Map(tasks.map((task) => [task.taskId, task]));
  const depthByTaskId = new Map<string, number>();

  function getTaskDepth(taskId: string): number {
    const cached = depthByTaskId.get(taskId);

    if (cached !== undefined) {
      return cached;
    }

    const task = tasksById.get(taskId);

    if (!task) {
      throw new Error(`Workflow graph references missing task "${taskId}".`);
    }

    const depth =
      task.dependsOn.length === 0
        ? 0
        : Math.max(...task.dependsOn.map((dependencyId) => getTaskDepth(dependencyId))) + 1;

    depthByTaskId.set(taskId, depth);
    return depth;
  }

  tasks.forEach((task) => {
    getTaskDepth(task.taskId);
  });

  return tasks.reduce<Map<number, typeof tasks>>((rows, task) => {
    const depth = depthByTaskId.get(task.taskId) ?? 0;
    const existing = rows.get(depth);

    if (existing) {
      existing.push(task);
      return rows;
    }

    rows.set(depth, [task]);
    return rows;
  }, new Map());
}

function buildExecutionRows(
  tasks: ReturnType<typeof useReadyRunDetail>["state"]["tasks"],
  runId: string
): ExecutionRowViewModel[] {
  const rowsByDepth = groupTasksByDepth(tasks);

  return [...rowsByDepth.entries()]
    .sort(([left], [right]) => left - right)
    .map(([depth, rowTasks]) => ({
      depth,
      rowId: `execution-row-${depth}`,
      tasks: rowTasks.map((task) => ({
        detailPath: buildRunTaskPath(runId, task.taskId),
        dependencyCount: task.dependsOn.length,
        status: task.status,
        taskId: task.taskId,
        title: task.name
      }))
    }));
}

function buildTaskRelationshipMap(tasks: ReturnType<typeof useReadyRunDetail>["state"]["tasks"]) {
  const downstreamByTaskId = new Map<string, string[]>();

  for (const task of tasks) {
    for (const dependencyId of task.dependsOn) {
      const downstream = downstreamByTaskId.get(dependencyId) ?? [];
      downstream.push(task.taskId);
      downstreamByTaskId.set(dependencyId, downstream);
    }
  }

  return downstreamByTaskId;
}

export function useRunExecutionViewModel(): RunExecutionViewModel {
  const { actions, state } = useReadyRunDetail();
  const run = state.run!;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const executionPending =
    run.compiledFrom !== null &&
    (state.workflow!.summary.totalTasks === 0 || state.tasks.length === 0);

  function refreshExecution() {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    void actions
      .reload()
      .catch(() => {
        // The provider owns the next visible state after reload failures.
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }

  useEffect(() => {
    if (!executionPending || isRefreshing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      refreshExecution();
    }, 2_000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [executionPending, isRefreshing, refreshExecution, run.compiledFrom?.compiledAt]);

  if (!run.compiledFrom) {
    return {
      message: "Execution becomes available after this run has been compiled.",
      state: "empty"
    };
  }

  if (executionPending) {
    return {
      message: "Compile was accepted for this run. Keystone is still materializing the live execution graph.",
      refresh: refreshExecution,
      refreshLabel: isRefreshing ? "Refreshing execution..." : "Refresh execution",
      state: "pending"
    };
  }

  return {
    rows: buildExecutionRows(state.tasks, run.runId),
    state: "ready",
    summary: `${state.workflow!.summary.totalTasks} tasks · ${state.workflow!.summary.readyTasks} ready · ${state.workflow!.summary.pendingTasks} pending · ${state.workflow!.summary.activeTasks} active · ${state.workflow!.summary.completedTasks} completed`
  };
}

export function useTaskDetailViewModel(taskId: string): TaskDetailViewModel {
  const { actions, state } = useReadyRunDetail();
  const run = state.run!;
  const backPath = buildRunPhasePath(run.runId, "execution");
  const task = state.tasks.find((candidate) => candidate.taskId === taskId) ?? null;
  const taskArtifacts = state.taskArtifacts[taskId];
  const tasksById = new Map(state.tasks.map((candidate) => [candidate.taskId, candidate]));
  const downstreamByTaskId = buildTaskRelationshipMap(state.tasks);

  useEffect(() => {
    if (!run.compiledFrom || !task) {
      return;
    }

    if (!taskArtifacts || taskArtifacts.status === "idle") {
      void actions.loadTaskArtifacts(task.taskId);
    }
  }, [actions, run.compiledFrom, task, taskArtifacts]);

  if (!run.compiledFrom) {
    return {
      backPath,
      message: "Execution is not available for this run until compile has produced a workflow.",
      runDisplayId: run.runId,
      state: "unavailable",
      taskDisplayId: taskId
    };
  }

  if (!task) {
    return {
      backPath,
      message: `Task ${taskId} was not found for run ${run.runId}.`,
      runDisplayId: run.runId,
      state: "not_found",
      taskDisplayId: taskId
    };
  }

  const dependsOn = task.dependsOn.flatMap((dependencyId) => {
    const dependency = tasksById.get(dependencyId);

    return dependency
      ? [
          {
            taskId: dependency.taskId,
            title: dependency.name
          }
        ]
      : [];
  });
  const downstreamTasks = (downstreamByTaskId.get(task.taskId) ?? []).flatMap((downstreamTaskId) => {
    const downstreamTask = tasksById.get(downstreamTaskId);

    return downstreamTask
      ? [
          {
            taskId: downstreamTask.taskId,
            title: downstreamTask.name
          }
        ]
      : [];
  });
  const artifactsViewModel: TaskArtifactsViewModel =
    !taskArtifacts || taskArtifacts.status === "idle" || taskArtifacts.status === "loading"
      ? {
          items: [],
          message: "Keystone is loading artifact metadata for this task.",
          state: "loading"
        }
      : taskArtifacts.status === "error"
        ? {
            items: [],
            message: taskArtifacts.errorMessage ?? "Unable to load task artifacts.",
            retry: () => {
              void actions.loadTaskArtifacts(task.taskId, { force: true });
            },
            state: "error"
          }
        : taskArtifacts.items.length === 0
          ? {
              items: [],
              message: "No artifacts are recorded for this task yet.",
              state: "empty"
            }
          : {
              items: taskArtifacts.items.map((artifact) => ({
                artifactId: artifact.artifactId,
                contentType: artifact.contentType,
                contentUrl: artifact.contentUrl,
                kind: artifact.kind,
                sha256: artifact.sha256,
                sizeLabel: formatByteSize(artifact.sizeBytes)
              })),
              message: null,
              state: "ready"
            };

  return {
    artifacts: artifactsViewModel,
    backPath,
    conversationLocator: task.conversation ?? null,
    dependsOn,
    downstreamTasks,
    runDisplayId: run.runId,
    state: "ready",
    status: task.status,
    taskDisplayId: task.taskId,
    title: task.name
  };
}
