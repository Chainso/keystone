import { useCallback, useEffect, useState } from "react";

import type { ArtifactResource } from "../../../../src/http/api/v1/artifacts/contracts";
import { formatUtcTimestamp } from "../../shared/formatting/date";
import { buildRunPhasePath, buildRunTaskPath } from "../../shared/navigation/run-phases";
import type { StatusTone } from "../../shared/layout/status-pill";
import { getTaskStatusPresentation } from "../runs/run-status";
import type { ConversationLocator } from "../runs/run-types";
import { useReadyRunDetail } from "../runs/use-ready-run-detail";

type ReadyRunTasks = ReturnType<typeof useReadyRunDetail>["state"]["tasks"];
type WorkflowNodes = NonNullable<ReturnType<typeof useReadyRunDetail>["state"]["workflow"]>["nodes"];

interface ExecutionTaskRecord {
  dependsOn: string[];
  name: string;
  status: string;
  taskId: string;
}

export interface ExecutionNodeViewModel {
  blockerLabel: string;
  detailPath: string;
  graphColumn: number;
  graphRow: number;
  ownerLabel: string;
  statusLabel: string;
  statusTone: StatusTone;
  taskId: string;
  title: string;
}

export interface ExecutionColumnViewModel {
  depth: number;
  label: string;
  summary: string;
  taskIds: string[];
}

export interface ExecutionEdgeViewModel {
  edgeId: string;
  fromColumn: number;
  fromRow: number;
  toColumn: number;
  toRow: number;
}

export interface RunExecutionReadyViewModel {
  columns: ExecutionColumnViewModel[];
  edges: ExecutionEdgeViewModel[];
  nodes: ExecutionNodeViewModel[];
  state: "ready";
  statusMetrics: ExecutionStatusMetricViewModel[];
  summary: string;
}

export interface ExecutionStatusMetricViewModel {
  label: string;
  tone: StatusTone;
  value: number;
}

export interface RunExecutionEmptyViewModel {
  actionHref: string;
  actionLabel: string;
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
  kind: ArtifactResource["kind"];
  sha256: string | null;
  sizeLabel: string;
}

export interface TaskArtifactsViewModel {
  items: TaskArtifactViewModel[];
  message: string | null;
  retry?: (() => void) | undefined;
  state: "loading" | "ready" | "empty" | "error";
}

export interface TaskDetailReadyViewModel {
  activityLabel: string;
  artifacts: TaskArtifactsViewModel;
  backPath: string;
  conversationLocator: ConversationLocator | null;
  description: string;
  runDisplayId: string;
  state: "ready";
  statusLabel: string;
  statusTone: StatusTone;
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

function buildTaskDepthIndex(tasks: ExecutionTaskRecord[]) {
  const tasksById = new Map(tasks.map((task) => [task.taskId, task]));
  const depthByTaskId = new Map<string, number>();

  function getTaskDepth(taskId: string): number {
    const cachedDepth = depthByTaskId.get(taskId);

    if (cachedDepth !== undefined) {
      return cachedDepth;
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

  const tasksByDepth = tasks.reduce<Map<number, ExecutionTaskRecord[]>>((rows, task) => {
    const depth = depthByTaskId.get(task.taskId) ?? 0;
    const existing = rows.get(depth);

    if (existing) {
      existing.push(task);
      return rows;
    }

    rows.set(depth, [task]);
    return rows;
  }, new Map());

  return {
    depthByTaskId,
    tasksByDepth
  };
}

function buildTaskDetailActivityLabel(task: {
  endedAt: string | null;
  startedAt: string | null;
  updatedAt: string | null;
}) {
  if (task.endedAt) {
    return `Completed ${formatUtcTimestamp(task.endedAt)}.`;
  }

  if (task.startedAt) {
    return `Started ${formatUtcTimestamp(task.startedAt)}.`;
  }

  if (task.updatedAt) {
    return `Updated ${formatUtcTimestamp(task.updatedAt)}.`;
  }

  return "Execution timing has not been recorded yet.";
}

function buildExecutionColumnSummary(depth: number, taskCount: number) {
  if (depth === 0) {
    return taskCount === 1 ? "1 starting task" : `${taskCount} starting tasks`;
  }

  return taskCount === 1 ? "1 task in this step" : `${taskCount} parallel tasks in this step`;
}

function buildExecutionSummary(totalTasks: number, columnCount: number) {
  return `${totalTasks} task${totalTasks === 1 ? "" : "s"} across ${columnCount} dependency step${columnCount === 1 ? "" : "s"}`;
}

function buildExecutionStatusMetrics(tasks: ExecutionTaskRecord[]): ExecutionStatusMetricViewModel[] {
  const counts = tasks.reduce<Record<StatusTone, number>>(
    (totals, task) => {
      const { statusTone } = getTaskStatusPresentation(task.status);

      totals[statusTone] += 1;
      return totals;
    },
    {
      active: 0,
      blocked: 0,
      complete: 0,
      neutral: 0,
      queued: 0
    }
  );

  return [
    { label: "Completed", tone: "complete", value: counts.complete },
    { label: "Running", tone: "active", value: counts.active },
    { label: "Queued", tone: "queued", value: counts.queued },
    { label: "Blocked", tone: "blocked", value: counts.blocked }
  ];
}

function isCompletedTaskStatus(status: string) {
  const normalized = status.trim().toLowerCase();

  return normalized.includes("complete") || normalized.includes("done") || normalized.includes("passed");
}

function buildExecutionNodeBlockerLabel(task: ExecutionTaskRecord, tasksById: Map<string, ExecutionTaskRecord>) {
  if (task.dependsOn.length === 0) {
    return "No blockers";
  }

  const openDependencies = task.dependsOn.filter((dependencyId) => {
    const dependency = tasksById.get(dependencyId);

    return !dependency || !isCompletedTaskStatus(dependency.status);
  });

  if (openDependencies.length === 0) {
    return "Dependencies complete";
  }

  return `Waiting on ${openDependencies.join(", ")}`;
}

function buildExecutionTaskRecords(tasks: ReadyRunTasks, workflowNodes: WorkflowNodes): ExecutionTaskRecord[] {
  const tasksById = new Map(tasks.map((task) => [task.taskId, task]));
  const records = workflowNodes.map((workflowNode) => {
    const task = tasksById.get(workflowNode.taskId);

    if (task) {
      return {
        dependsOn: task.dependsOn,
        name: task.name,
        status: task.status,
        taskId: task.taskId
      };
    }

    return {
      dependsOn: workflowNode.dependsOn,
      name: workflowNode.name,
      status: workflowNode.status,
      taskId: workflowNode.taskId
    };
  });

  for (const task of tasks) {
    if (workflowNodes.some((workflowNode) => workflowNode.taskId === task.taskId)) {
      continue;
    }

    records.push({
      dependsOn: task.dependsOn,
      name: task.name,
      status: task.status,
      taskId: task.taskId
    });
  }

  return records;
}

function buildExecutionGraph(tasks: ExecutionTaskRecord[], runId: string) {
  const tasksById = new Map(tasks.map((task) => [task.taskId, task]));
  const { depthByTaskId, tasksByDepth } = buildTaskDepthIndex(tasks);
  const orderByTaskId = new Map(tasks.map((task, index) => [task.taskId, index]));
  const rowByTaskId = new Map<string, number>();
  const columns: ExecutionColumnViewModel[] = [];

  for (const [depth, depthTasks] of [...tasksByDepth.entries()].sort(([left], [right]) => left - right)) {
    const orderedTasks = [...depthTasks].sort((left, right) => {
      const leftAverage =
        left.dependsOn.length === 0
          ? orderByTaskId.get(left.taskId) ?? 0
          : left.dependsOn.reduce((total, dependencyId) => total + (rowByTaskId.get(dependencyId) ?? 0), 0) /
            left.dependsOn.length;
      const rightAverage =
        right.dependsOn.length === 0
          ? orderByTaskId.get(right.taskId) ?? 0
          : right.dependsOn.reduce((total, dependencyId) => total + (rowByTaskId.get(dependencyId) ?? 0), 0) /
            right.dependsOn.length;

      if (leftAverage !== rightAverage) {
        return leftAverage - rightAverage;
      }

      return (orderByTaskId.get(left.taskId) ?? 0) - (orderByTaskId.get(right.taskId) ?? 0);
    });

    orderedTasks.forEach((task, rowIndex) => {
      rowByTaskId.set(task.taskId, rowIndex);
    });

    columns.push({
      depth,
      label: `Step ${depth + 1}`,
      summary: buildExecutionColumnSummary(depth, orderedTasks.length),
      taskIds: orderedTasks.map((task) => task.taskId)
    });
  }

  const nodes = columns.flatMap((column) =>
    column.taskIds.flatMap((taskId, rowIndex) => {
      const task = tasksById.get(taskId);

      if (!task) {
        return [];
      }

      return [
        {
          detailPath: buildRunTaskPath(runId, task.taskId),
          graphColumn: column.depth,
          graphRow: rowIndex,
          blockerLabel: buildExecutionNodeBlockerLabel(task, tasksById),
          ownerLabel: "Owner not recorded",
          ...getTaskStatusPresentation(task.status),
          taskId: task.taskId,
          title: task.name
        }
      ];
    })
  );

  const edges = tasks.flatMap((task) => {
    const toColumn = depthByTaskId.get(task.taskId) ?? 0;
    const toRow = rowByTaskId.get(task.taskId) ?? 0;

    return task.dependsOn.flatMap((dependencyId) => {
      const fromColumn = depthByTaskId.get(dependencyId);
      const fromRow = rowByTaskId.get(dependencyId);

      if (fromColumn === undefined || fromRow === undefined) {
        return [];
      }

      return [
        {
          edgeId: `${dependencyId}->${task.taskId}`,
          fromColumn,
          fromRow,
          toColumn,
          toRow
        }
      ];
    });
  });

  return {
    columns,
    edges,
    nodes
  };
}

export function useRunExecutionViewModel(): RunExecutionViewModel {
  const { actions, state } = useReadyRunDetail();
  const run = state.run!;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const executionPending = run.compiledFrom !== null && state.workflow!.summary.totalTasks === 0;

  const refreshExecution = useCallback(() => {
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
  }, [actions, isRefreshing]);

  useEffect(() => {
    if (!executionPending || isRefreshing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      refreshExecution();
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [executionPending, isRefreshing, refreshExecution, run.compiledFrom?.compiledAt]);

  if (!run.compiledFrom) {
    return {
      actionHref: buildRunPhasePath(run.runId, "execution-plan"),
      actionLabel: "Open Execution Plan",
      message: "Build the execution graph from the Execution Plan before opening task work.",
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

  const executionTasks = buildExecutionTaskRecords(state.tasks, state.workflow!.nodes);
  const graph = buildExecutionGraph(executionTasks, run.runId);

  return {
    columns: graph.columns,
    edges: graph.edges,
    nodes: graph.nodes,
    state: "ready",
    statusMetrics: buildExecutionStatusMetrics(executionTasks),
    summary: buildExecutionSummary(state.workflow!.summary.totalTasks, graph.columns.length)
  };
}

export function useTaskDetailViewModel(taskId: string): TaskDetailViewModel {
  const { actions, state } = useReadyRunDetail();
  const run = state.run!;
  const backPath = buildRunPhasePath(run.runId, "execution");
  const task = state.tasks.find((candidate) => candidate.taskId === taskId) ?? null;
  const workflowNode = state.workflow?.nodes.find((candidate) => candidate.taskId === taskId) ?? null;
  const taskArtifacts = state.taskArtifacts[taskId];
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
    if (workflowNode) {
      return {
        backPath,
        message: `Task ${taskId} is still materializing for run ${run.runId}. Return to the DAG and wait for the live task record.`,
        runDisplayId: run.runId,
        state: "unavailable",
        taskDisplayId: taskId
      };
    }

    return {
      backPath,
      message: `Task ${taskId} was not found for run ${run.runId}.`,
      runDisplayId: run.runId,
      state: "not_found",
      taskDisplayId: taskId
    };
  }

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
  const activityLabel = buildTaskDetailActivityLabel(task);

  return {
    activityLabel,
    artifacts: artifactsViewModel,
    backPath,
    conversationLocator: task.conversation ?? null,
    description: task.description,
    runDisplayId: run.runId,
    state: "ready",
    ...getTaskStatusPresentation(task.status),
    taskDisplayId: task.taskId,
    title: task.name
  };
}
