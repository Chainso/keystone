import { useEffect, useState } from "react";

import type { ArtifactResource } from "../../../../src/http/api/v1/artifacts/contracts";
import { formatUtcTimestamp } from "../../shared/formatting/date";
import { buildRunPhasePath, buildRunTaskPath } from "../../shared/navigation/run-phases";
import type { StatusTone } from "../../shared/layout/status-pill";
import { getTaskStatusPresentation } from "../runs/run-status";
import type { ConversationLocator } from "../runs/run-types";
import { useReadyRunDetail } from "../runs/use-ready-run-detail";
import { partitionTaskReviewArtifacts } from "./task-review-artifacts";

type ReadyRunTasks = ReturnType<typeof useReadyRunDetail>["state"]["tasks"];
type WorkflowNodes = NonNullable<ReturnType<typeof useReadyRunDetail>["state"]["workflow"]>["nodes"];

interface ExecutionTaskRecord {
  conversation: ConversationLocator | null;
  dependsOn: string[];
  description: string;
  endedAt: string | null;
  logicalTaskId: string;
  name: string;
  startedAt: string | null;
  status: string;
  taskId: string;
  taskRecordReady: boolean;
  updatedAt: string | null;
}

type ExecutionSummaryGroupId =
  | "in_progress"
  | "ready"
  | "queued"
  | "blocked"
  | "completed"
  | "other";

const executionSummaryGroupDefinitions: Array<{
  description: string;
  id: ExecutionSummaryGroupId;
  label: string;
  tone: StatusTone;
}> = [
  {
    description: "Live work that is currently running inside this run.",
    id: "in_progress",
    label: "In progress",
    tone: "active"
  },
  {
    description: "Tasks whose current handoff is ready to inspect next.",
    id: "ready",
    label: "Ready next",
    tone: "queued"
  },
  {
    description: "Tasks that are still waiting on earlier execution steps to clear.",
    id: "queued",
    label: "Waiting",
    tone: "queued"
  },
  {
    description: "Tasks that have failed, been cancelled, or otherwise need operator attention.",
    id: "blocked",
    label: "Blocked",
    tone: "blocked"
  },
  {
    description: "Finished work that can already open in task detail.",
    id: "completed",
    label: "Completed",
    tone: "complete"
  },
  {
    description: "Tasks whose status does not yet map to a workflow bucket.",
    id: "other",
    label: "Other",
    tone: "neutral"
  }
];

const executionSelectionPriority: ExecutionSummaryGroupId[] = [
  "in_progress",
  "blocked",
  "ready",
  "queued",
  "completed",
  "other"
];

export interface ExecutionSummaryTaskViewModel {
  detailPath: string;
  logicalTaskId: string;
  statusLabel: string;
  taskId: string;
  title: string;
}

export interface ExecutionSummaryGroupViewModel {
  count: number;
  description: string;
  id: ExecutionSummaryGroupId;
  label: string;
  tasks: ExecutionSummaryTaskViewModel[];
  tone: StatusTone;
}

export interface TaskDependencyViewModel {
  detailPath: string;
  statusLabel: string;
  statusTone: StatusTone;
  taskId: string;
  title: string;
}

export interface ExecutionNodeViewModel {
  activityLabel: string;
  conversationAttached: boolean;
  dependsOn: TaskDependencyViewModel[];
  dependencyCount: number;
  description: string;
  detailPath: string | null;
  downstreamTasks: TaskDependencyViewModel[];
  footnote: string;
  graphColumn: number;
  graphRow: number;
  handoffSummary: string;
  logicalTaskId: string;
  statusLabel: string;
  statusTone: StatusTone;
  taskId: string;
  taskRecordReady: boolean;
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
  defaultSelectedTaskId: string | null;
  edges: ExecutionEdgeViewModel[];
  nodes: ExecutionNodeViewModel[];
  state: "ready";
  summary: string;
  summaryGroups: ExecutionSummaryGroupViewModel[];
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

export interface TaskConversationEntryViewModel {
  body: string;
  speaker: string;
}

export interface TaskDetailReadyViewModel {
  activityLabel: string;
  artifacts: TaskArtifactsViewModel;
  backPath: string;
  conversationLocator: ConversationLocator | null;
  conversationEntries: TaskConversationEntryViewModel[];
  dependsOn: TaskDependencyViewModel[];
  description: string;
  downstreamTasks: TaskDependencyViewModel[];
  reviewSummary: string;
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

function normalizeStatus(value: string) {
  return value.trim().toLowerCase();
}

function categorizeExecutionTask(status: string): ExecutionSummaryGroupId {
  const normalized = normalizeStatus(status);

  if (
    normalized.includes("active") ||
    normalized.includes("running") ||
    normalized.includes("review")
  ) {
    return "in_progress";
  }

  if (normalized.includes("ready")) {
    return "ready";
  }

  if (normalized.includes("pending") || normalized.includes("queue")) {
    return "queued";
  }

  if (
    normalized.includes("block") ||
    normalized.includes("fail") ||
    normalized.includes("cancel")
  ) {
    return "blocked";
  }

  if (
    normalized.includes("complete") ||
    normalized.includes("done") ||
    normalized.includes("passed")
  ) {
    return "completed";
  }

  return "other";
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

  const tasksByDepth = tasks.reduce<Map<number, ReadyRunTasks>>((rows, task) => {
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

function buildTaskRelationshipMap(tasks: ExecutionTaskRecord[]) {
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

function buildTaskReference(task: ExecutionTaskRecord, runId: string): TaskDependencyViewModel {
  return {
    detailPath: buildRunTaskPath(runId, task.taskId),
    ...getTaskStatusPresentation(task.status),
    taskId: task.taskId,
    title: task.name
  };
}

function buildExecutionActivityLabel(task: ExecutionTaskRecord) {
  if (task.endedAt) {
    return `Completed ${formatUtcTimestamp(task.endedAt)}`;
  }

  if (task.startedAt) {
    return `Started ${formatUtcTimestamp(task.startedAt)}`;
  }

  if (task.updatedAt) {
    return `Updated ${formatUtcTimestamp(task.updatedAt)}`;
  }

  return "Task metadata is still loading from the live task list.";
}

function buildTaskDetailActivityLabel(task: Pick<ExecutionTaskRecord, "endedAt" | "startedAt" | "updatedAt">) {
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

function buildExecutionNodeFootnote(task: ExecutionTaskRecord, input: {
  downstreamCount: number;
  unresolvedDependencyCount: number;
}) {
  if (input.unresolvedDependencyCount > 0) {
    return `Waiting on ${input.unresolvedDependencyCount} prerequisite${input.unresolvedDependencyCount === 1 ? "" : "s"}`;
  }

  if (task.dependsOn.length === 0) {
    return input.downstreamCount > 0
      ? `Starts the workflow and unlocks ${input.downstreamCount} downstream task${input.downstreamCount === 1 ? "" : "s"}`
      : "Starts the workflow";
  }

  if (input.downstreamCount > 0) {
    return `${task.dependsOn.length} cleared prerequisite${task.dependsOn.length === 1 ? "" : "s"} · unlocks ${input.downstreamCount} downstream task${input.downstreamCount === 1 ? "" : "s"}`;
  }

  return `${task.dependsOn.length} cleared prerequisite${task.dependsOn.length === 1 ? "" : "s"}`;
}

function buildExecutionHandoffSummary(task: ExecutionTaskRecord, unresolvedDependencyCount: number) {
  if (!task.taskRecordReady) {
    return "Task detail is still waiting on the live task record for this workflow node.";
  }

  if (unresolvedDependencyCount > 0) {
    return `This task is still waiting on ${unresolvedDependencyCount} prerequisite${unresolvedDependencyCount === 1 ? "" : "s"}, but task detail is already available from the current run task record.`;
  }

  if (task.conversation) {
    return "Task detail is ready for this task, and a conversation locator is already attached.";
  }

  return "Task detail is ready for this task from the current run task record.";
}

function buildExecutionSummary(totalTasks: number, columnCount: number) {
  return `${totalTasks} task${totalTasks === 1 ? "" : "s"} across ${columnCount} dependency step${columnCount === 1 ? "" : "s"}`;
}

function buildTaskReviewSummary(taskArtifacts: TaskArtifactsViewModel) {
  if (taskArtifacts.state === "loading") {
    return "Changed files and supporting artifacts are loading from the current task outputs.";
  }

  if (taskArtifacts.state === "error") {
    return "Task review could not load its current artifacts.";
  }

  if (taskArtifacts.state === "empty") {
    return "No review artifacts are recorded for this task yet.";
  }

  const { reviewCandidates, supportingArtifacts } = partitionTaskReviewArtifacts(taskArtifacts.items);
  const summaryParts: string[] = [];

  if (reviewCandidates.length > 0) {
    summaryParts.push(
      `${reviewCandidates.length} text artifact${reviewCandidates.length === 1 ? "" : "s"}`
    );
  }

  if (supportingArtifacts.length > 0) {
    summaryParts.push(
      `${supportingArtifacts.length} supporting artifact${supportingArtifacts.length === 1 ? "" : "s"}`
    );
  }

  if (summaryParts.length === 0) {
    return "Changed files and supporting artifacts are loading from the current task outputs.";
  }

  return `${summaryParts.join(" and ")} from the current task outputs.`;
}

function buildTaskConversationEntries(input: {
  activityLabel: string;
  conversationLocator: ConversationLocator | null;
  description: string;
  statusLabel: string;
}): TaskConversationEntryViewModel[] {
  return [
    {
      body: input.description,
      speaker: "Task handoff"
    },
    {
      body: `${input.statusLabel}. ${input.activityLabel}`,
      speaker: "Execution state"
    },
    {
      body:
        input.conversationLocator !== null
          ? "A live conversation is attached to this task. Messages will render here when task chat is wired."
          : "No live conversation is attached to this task yet. This pane stays read-only until task chat is wired.",
      speaker: "Conversation status"
    }
  ];
}

function buildExecutionSummaryGroups(tasks: ExecutionTaskRecord[], runId: string): ExecutionSummaryGroupViewModel[] {
  const tasksByGroup = new Map<ExecutionSummaryGroupId, ExecutionTaskRecord[]>();

  for (const definition of executionSummaryGroupDefinitions) {
    tasksByGroup.set(definition.id, []);
  }

  for (const task of tasks) {
    tasksByGroup.get(categorizeExecutionTask(task.status))?.push(task);
  }

  return executionSummaryGroupDefinitions
    .map((definition) => {
      const groupTasks = tasksByGroup.get(definition.id) ?? [];

      return {
        count: groupTasks.length,
        description: definition.description,
        id: definition.id,
        label: definition.label,
        tasks: groupTasks.map((task) => ({
          detailPath: buildRunTaskPath(runId, task.taskId),
          logicalTaskId: task.logicalTaskId,
          statusLabel: getTaskStatusPresentation(task.status).statusLabel,
          taskId: task.taskId,
          title: task.name
        })),
        tone: definition.tone
      };
    })
    .filter((group) => group.count > 0);
}

function pickDefaultExecutionTask(summaryGroups: ExecutionSummaryGroupViewModel[]) {
  for (const groupId of executionSelectionPriority) {
    const taskId = summaryGroups.find((group) => group.id === groupId)?.tasks[0]?.taskId;

    if (taskId) {
      return taskId;
    }
  }

  return null;
}

function buildExecutionTaskRecords(tasks: ReadyRunTasks, workflowNodes: WorkflowNodes): ExecutionTaskRecord[] {
  const tasksById = new Map(tasks.map((task) => [task.taskId, task]));
  const records = workflowNodes.map((workflowNode) => {
    const task = tasksById.get(workflowNode.taskId);

    if (task) {
      return {
        conversation: task.conversation ?? null,
        dependsOn: task.dependsOn,
        description: task.description,
        endedAt: task.endedAt,
        logicalTaskId: task.logicalTaskId,
        name: task.name,
        startedAt: task.startedAt,
        status: task.status,
        taskId: task.taskId,
        taskRecordReady: true,
        updatedAt: task.updatedAt
      };
    }

    return {
      conversation: null,
      dependsOn: workflowNode.dependsOn,
      description: "Task metadata is still loading from the live task list.",
      endedAt: null,
      logicalTaskId: workflowNode.taskId,
      name: workflowNode.name,
      startedAt: null,
      status: workflowNode.status,
      taskId: workflowNode.taskId,
      taskRecordReady: false,
      updatedAt: null
    };
  });

  for (const task of tasks) {
    if (workflowNodes.some((workflowNode) => workflowNode.taskId === task.taskId)) {
      continue;
    }

    records.push({
      conversation: task.conversation ?? null,
      dependsOn: task.dependsOn,
      description: task.description,
      endedAt: task.endedAt,
      logicalTaskId: task.logicalTaskId,
      name: task.name,
      startedAt: task.startedAt,
      status: task.status,
      taskId: task.taskId,
      taskRecordReady: true,
      updatedAt: task.updatedAt
    });
  }

  return records;
}

function buildExecutionGraph(tasks: ExecutionTaskRecord[], runId: string) {
  const tasksById = new Map(tasks.map((task) => [task.taskId, task]));
  const downstreamByTaskId = buildTaskRelationshipMap(tasks);
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

      const dependsOn = task.dependsOn.flatMap((dependencyId) => {
        const dependency = tasksById.get(dependencyId);

        return dependency ? [buildTaskReference(dependency, runId)] : [];
      });
      const downstreamTasks = (downstreamByTaskId.get(task.taskId) ?? []).flatMap((downstreamTaskId) => {
        const downstreamTask = tasksById.get(downstreamTaskId);

        return downstreamTask ? [buildTaskReference(downstreamTask, runId)] : [];
      });
      const unresolvedDependencyCount = dependsOn.filter((dependency) => dependency.statusTone !== "complete").length;

      return [
        {
          activityLabel: buildExecutionActivityLabel(task),
          conversationAttached: task.conversation !== null,
          dependsOn,
          dependencyCount: task.dependsOn.length,
          description: task.description,
          detailPath: task.taskRecordReady ? buildRunTaskPath(runId, task.taskId) : null,
          downstreamTasks,
          footnote: buildExecutionNodeFootnote(task, {
            downstreamCount: downstreamTasks.length,
            unresolvedDependencyCount
          }),
          graphColumn: column.depth,
          graphRow: rowIndex,
          handoffSummary: buildExecutionHandoffSummary(task, unresolvedDependencyCount),
          logicalTaskId: task.logicalTaskId,
          ...getTaskStatusPresentation(task.status),
          taskId: task.taskId,
          taskRecordReady: task.taskRecordReady,
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
    }, 500);

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

  const executionTasks = buildExecutionTaskRecords(state.tasks, state.workflow!.nodes);
  const graph = buildExecutionGraph(executionTasks, run.runId);
  const summaryGroups = buildExecutionSummaryGroups(executionTasks, run.runId);

  return {
    columns: graph.columns,
    defaultSelectedTaskId: pickDefaultExecutionTask(summaryGroups),
    edges: graph.edges,
    nodes: graph.nodes,
    state: "ready",
    summary: buildExecutionSummary(state.workflow!.summary.totalTasks, graph.columns.length),
    summaryGroups
  };
}

export function useTaskDetailViewModel(taskId: string): TaskDetailViewModel {
  const { actions, state } = useReadyRunDetail();
  const run = state.run!;
  const backPath = buildRunPhasePath(run.runId, "execution");
  const task = state.tasks.find((candidate) => candidate.taskId === taskId) ?? null;
  const workflowNode = state.workflow?.nodes.find((candidate) => candidate.taskId === taskId) ?? null;
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

  const dependsOn = task.dependsOn.flatMap((dependencyId) => {
    const dependency = tasksById.get(dependencyId);

    return dependency ? [buildTaskReference(dependency, run.runId)] : [];
  });
  const downstreamTasks = (downstreamByTaskId.get(task.taskId) ?? []).flatMap((downstreamTaskId) => {
    const downstreamTask = tasksById.get(downstreamTaskId);

    return downstreamTask ? [buildTaskReference(downstreamTask, run.runId)] : [];
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
  const activityLabel = buildTaskDetailActivityLabel(task);
  const conversationEntries = buildTaskConversationEntries({
    activityLabel,
    conversationLocator: task.conversation ?? null,
    description: task.description,
    statusLabel: getTaskStatusPresentation(task.status).statusLabel
  });

  return {
    activityLabel,
    artifacts: artifactsViewModel,
    backPath,
    conversationLocator: task.conversation ?? null,
    conversationEntries,
    dependsOn,
    description: task.description,
    downstreamTasks,
    reviewSummary: buildTaskReviewSummary(artifactsViewModel),
    runDisplayId: run.runId,
    state: "ready",
    ...getTaskStatusPresentation(task.status),
    taskDisplayId: task.taskId,
    title: task.name
  };
}
