import { useEffect, useRef, useState } from "react";

import type { ArtifactResource } from "../../../../src/http/api/v1/artifacts/contracts";
import type { TaskResource, WorkflowGraphResource } from "../../../../src/http/api/v1/runs/contracts";
import { buildRunPhasePath } from "../../shared/navigation/run-phases";
import { useOptionalRunExecutionApi } from "./execution-api";
import { useResourceModel } from "../resource-model/context";
import {
  getRun,
  getRunSummary,
  getRunWorkflowGraph,
  getTask,
  getTaskArtifacts,
  listRunTasks
} from "../resource-model/selectors";
import type { ConversationLocator, ResourceTask } from "../resource-model/types";

type ExecutionNodeTone = "active" | "blocked" | "complete" | "queued";

interface CompatibilityState {
  actionLabel?: string;
  heading: string;
  message: string;
}

interface ExecutionTaskRecord {
  blockedBy: string[];
  conversationLocator: ConversationLocator | null;
  dependsOn: string[];
  displayId: string;
  runId: string;
  status: string;
  taskId: string;
  title: string;
}

interface LiveExecutionSnapshot {
  errorMessage: string | null;
  rows: ExecutionRowViewModel[];
  status: "idle" | "loading" | "ready" | "empty" | "error";
}

interface ArtifactPanelState {
  message: string | null;
  status: "loading" | "ready" | "empty" | "error";
}

interface LiveTaskDetailSnapshot {
  artifactState: ArtifactPanelState;
  artifactNotice: string | null;
  artifacts: TaskArtifactViewModel[];
  errorMessage: string | null;
  task: TaskResource | null;
  tasks: TaskResource[];
  status: "idle" | "loading" | "ready" | "error";
}

export interface ExecutionNodeViewModel {
  blockedByCount: number;
  dependencyCount: number;
  detailPath: string;
  displayId: string;
  graphLabel: string;
  statusLabel: string;
  statusTone: ExecutionNodeTone;
  taskId: string;
  title: string;
}

export interface ExecutionRowViewModel {
  depth: number;
  rowId: string;
  tasks: ExecutionNodeViewModel[];
}

export interface RunExecutionViewModel {
  compatibilityState?: CompatibilityState;
  retry: () => void;
  rows: ExecutionRowViewModel[];
}

export interface TaskArtifactViewModel {
  artifactId: string;
  details: string[];
  href?: string;
  summary: string;
  title: string;
}

export interface TaskDependencyViewModel {
  displayId: string;
  taskId: string;
  title: string;
}

export interface TaskDetailViewModel {
  artifactState: ArtifactPanelState;
  artifactNotice: string | null;
  artifactSectionLabel: string;
  artifacts: TaskArtifactViewModel[];
  backPath: string;
  blockedBy: TaskDependencyViewModel[];
  compatibilityState?: CompatibilityState;
  conversationLocator: ConversationLocator | null;
  dependsOn: TaskDependencyViewModel[];
  retry: () => void;
  runDisplayId: string;
  status: string;
  taskDisplayId: string;
  title: string;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load execution data.";
}

function humanizeToken(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatHumanLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => humanizeToken(segment.toLowerCase()))
    .join(" ");
}

function getTaskStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case "active":
    case "running":
      return "Running";
    case "blocked":
      return "Blocked";
    case "ready":
      return "Ready";
    case "queued":
      return "Queued";
    case "pending":
      return "Queued";
    case "completed":
    case "complete":
      return "Complete";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return formatHumanLabel(status);
  }
}

function getTaskStatusTone(status: string): ExecutionNodeTone {
  switch (status.toLowerCase()) {
    case "active":
    case "running":
      return "active";
    case "completed":
    case "complete":
      return "complete";
    case "ready":
    case "pending":
    case "queued":
      return "queued";
    case "blocked":
    case "failed":
    case "cancelled":
    default:
      return "blocked";
  }
}

function resolveTaskDisplayId(logicalTaskId: string | null | undefined, taskId: string) {
  if (typeof logicalTaskId === "string" && logicalTaskId.trim().length > 0) {
    return logicalTaskId;
  }

  return taskId;
}

function buildBlockedByIndex(tasks: Array<Pick<ExecutionTaskRecord, "dependsOn" | "taskId">>) {
  const blockedByIndex = new Map<string, string[]>();

  for (const task of tasks) {
    for (const dependencyId of task.dependsOn) {
      const existing = blockedByIndex.get(dependencyId) ?? [];

      existing.push(task.taskId);
      blockedByIndex.set(dependencyId, existing);
    }
  }

  return blockedByIndex;
}

function groupTaskIdsByDepth(tasks: ExecutionTaskRecord[], errorContext = "Workflow graph") {
  const tasksById = new Map(tasks.map((task) => [task.taskId, task]));
  const depthByTaskId = new Map<string, number>();

  function getTaskDepth(taskId: string): number {
    const cached = depthByTaskId.get(taskId);

    if (cached !== undefined) {
      return cached;
    }

    const task = tasksById.get(taskId);

    if (!task) {
      throw new Error(`${errorContext} references missing dependency task "${taskId}".`);
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

  return tasks.reduce<Map<number, ExecutionTaskRecord[]>>((rows, task) => {
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

function buildExecutionRows(tasks: ExecutionTaskRecord[], errorContext?: string) {
  const rowsByDepth = groupTaskIdsByDepth(tasks, errorContext);

  return [...rowsByDepth.entries()]
    .sort(([left], [right]) => left - right)
    .map(([depth, rowTasks]) => ({
      rowId: `execution-row-${depth}`,
      depth,
      tasks: rowTasks.map(toExecutionNodeViewModel)
    }));
}

function toExecutionNodeViewModel(task: ExecutionTaskRecord): ExecutionNodeViewModel {
  return {
    taskId: task.taskId,
    displayId: task.displayId,
    graphLabel: task.displayId,
    title: task.title,
    statusLabel: getTaskStatusLabel(task.status),
    statusTone: getTaskStatusTone(task.status),
    dependencyCount: task.dependsOn.length,
    blockedByCount: task.blockedBy.length,
    detailPath: buildRunPhasePath(task.runId, "execution") + `/tasks/${task.taskId}`
  };
}

function selectTaskDependency(
  taskId: string,
  tasksById: ReadonlyMap<string, ExecutionTaskRecord>
): TaskDependencyViewModel {
  const task = tasksById.get(taskId);

  if (!task) {
    return {
      taskId,
      displayId: taskId,
      title: "Task details are unavailable for this dependency."
    };
  }

  return {
    taskId: task.taskId,
    displayId: task.displayId,
    title: task.title
  };
}

function toScaffoldTaskRecord(task: ResourceTask): ExecutionTaskRecord {
  return {
    blockedBy: [...task.blockedBy],
    conversationLocator: task.conversationLocator ?? null,
    dependsOn: [...task.dependsOn],
    displayId: task.displayId,
    runId: task.runId,
    status: task.status,
    taskId: task.taskId,
    title: task.title
  };
}

function buildLiveExecutionTaskRecords(
  runId: string,
  workflow: WorkflowGraphResource,
  tasks: TaskResource[]
) {
  const tasksById = new Map(tasks.map((task) => [task.taskId, task]));
  const taskRecords = workflow.nodes.map((node) => {
    const task = tasksById.get(node.taskId);

    return {
      blockedBy: [],
      conversationLocator: task?.conversation ?? null,
      dependsOn: [...node.dependsOn],
      displayId: resolveTaskDisplayId(task?.logicalTaskId, node.taskId),
      runId,
      status: task?.status ?? node.status,
      taskId: node.taskId,
      title: task?.name ?? node.name
    } satisfies ExecutionTaskRecord;
  });
  const blockedByIndex = buildBlockedByIndex(taskRecords);

  return taskRecords.map((task) => ({
    ...task,
    blockedBy: blockedByIndex.get(task.taskId) ?? []
  }));
}

function formatArtifactSize(sizeBytes: number | null) {
  if (sizeBytes === null) {
    return "Size unknown";
  }

  return `${sizeBytes} bytes`;
}

function toScaffoldArtifactViewModel(artifact: {
  artifactId: string;
  diff: string[];
  path: string;
  summary: string;
}): TaskArtifactViewModel {
  return {
    artifactId: artifact.artifactId,
    title: artifact.path,
    summary: artifact.summary,
    details: artifact.diff
  };
}

function toLiveArtifactViewModel(artifact: ArtifactResource): TaskArtifactViewModel {
  return {
    artifactId: artifact.artifactId,
    title: artifact.artifactId,
    summary: `${formatHumanLabel(artifact.kind)} · ${artifact.contentType} · ${formatArtifactSize(artifact.sizeBytes)}`,
    details: [
      `Kind: ${formatHumanLabel(artifact.kind)}`,
      `Content type: ${artifact.contentType}`,
      `Size: ${formatArtifactSize(artifact.sizeBytes)}`,
      ...(artifact.sha256 ? [`SHA-256: ${artifact.sha256}`] : [])
    ],
    href: artifact.contentUrl
  };
}

function useLiveRunExecutionSnapshot(runId: string) {
  const api = useOptionalRunExecutionApi();
  const requestIdRef = useRef(0);
  const [snapshot, setSnapshot] = useState<LiveExecutionSnapshot>({
    errorMessage: null,
    rows: [],
    status: api ? "loading" : "idle"
  });

  function loadExecution() {
    if (!api) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setSnapshot({
      errorMessage: null,
      rows: [],
      status: "loading"
    });

    void Promise.all([api.getRunWorkflow(runId), api.listRunTasks(runId)])
      .then(([workflow, tasks]) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        const rows = buildExecutionRows(
          buildLiveExecutionTaskRecords(runId, workflow, tasks),
          `Workflow graph for run "${runId}"`
        );

        setSnapshot({
          errorMessage: null,
          rows,
          status: rows.length > 0 ? "ready" : "empty"
        });
      })
      .catch((error) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setSnapshot({
          errorMessage: getErrorMessage(error),
          rows: [],
          status: "error"
        });
      });
  }

  useEffect(() => {
    if (!api) {
      setSnapshot({
        errorMessage: null,
        rows: [],
        status: "idle"
      });
      return;
    }

    loadExecution();
  }, [api, runId]);

  return {
    retry: loadExecution,
    snapshot
  };
}

function useLiveTaskDetailSnapshot(runId: string, taskId: string) {
  const api = useOptionalRunExecutionApi();
  const requestIdRef = useRef(0);
  const [snapshot, setSnapshot] = useState<LiveTaskDetailSnapshot>({
    artifactState: {
      message: "Loading task artifacts.",
      status: "loading"
    },
    artifactNotice: null,
    artifacts: [],
    errorMessage: null,
    task: null,
    tasks: [],
    status: api ? "loading" : "idle"
  });

  function loadTaskDetail() {
    if (!api) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setSnapshot({
      artifactState: {
        message: "Loading task artifacts.",
        status: "loading"
      },
      artifactNotice: null,
      artifacts: [],
      errorMessage: null,
      task: null,
      tasks: [],
      status: "loading"
    });

    const artifactsPromise = api
      .listRunTaskArtifacts(runId, taskId)
      .then((artifacts) => {
        if (artifacts.length === 0) {
          return {
            artifactNotice: null,
            artifactState: {
              message: "No artifacts recorded for this task yet.",
              status: "empty" as const
            },
            artifacts: [] as TaskArtifactViewModel[]
          };
        }

        return {
          artifactNotice:
            "File-level review metadata is not part of the live artifact contract yet. Raw artifact links are shown instead.",
          artifactState: {
            message: null,
            status: "ready" as const
          },
          artifacts: artifacts.map(toLiveArtifactViewModel)
        };
      })
      .catch(() => ({
        artifactNotice: null,
        artifactState: {
          message: "Unable to load task artifacts.",
          status: "error" as const
        },
        artifacts: [] as TaskArtifactViewModel[]
      }));

    void Promise.all([api.getRunTask(runId, taskId), api.listRunTasks(runId), artifactsPromise])
      .then(([task, tasks, artifactResult]) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setSnapshot({
          artifactState: artifactResult.artifactState,
          artifactNotice: artifactResult.artifactNotice,
          artifacts: artifactResult.artifacts,
          errorMessage: null,
          task,
          tasks,
          status: "ready"
        });
      })
      .catch((error) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setSnapshot({
          artifactState: {
            message: "Task artifacts are unavailable until task detail loads.",
            status: "error"
          },
          artifactNotice: null,
          artifacts: [],
          errorMessage: getErrorMessage(error),
          task: null,
          tasks: [],
          status: "error"
        });
      });
  }

  useEffect(() => {
    if (!api) {
      setSnapshot({
        artifactState: {
          message: "Loading task artifacts.",
          status: "loading"
        },
        artifactNotice: null,
        artifacts: [],
        errorMessage: null,
        task: null,
        tasks: [],
        status: "idle"
      });
      return;
    }

    loadTaskDetail();
  }, [api, runId, taskId]);

  return {
    retry: loadTaskDetail,
    snapshot
  };
}

export function useRunExecutionViewModel(runId: string): RunExecutionViewModel {
  const liveApi = useOptionalRunExecutionApi();
  const { state } = useResourceModel();
  const live = useLiveRunExecutionSnapshot(runId);

  if (liveApi) {
    if (live.snapshot.status === "loading") {
      return {
        compatibilityState: {
          heading: "Loading execution",
          message: `Keystone is loading the live execution graph for ${runId}.`
        },
        retry: live.retry,
        rows: []
      };
    }

    if (live.snapshot.status === "error") {
      return {
        compatibilityState: {
          actionLabel: "Retry",
          heading: "Unable to load execution",
          message: live.snapshot.errorMessage ?? "Keystone could not load the execution graph."
        },
        retry: live.retry,
        rows: []
      };
    }

    if (live.snapshot.status === "empty") {
      return {
        compatibilityState: {
          heading: "No execution tasks yet",
          message: `${runId} does not have any execution tasks to render yet.`
        },
        retry: live.retry,
        rows: []
      };
    }

    return {
      retry: live.retry,
      rows: live.snapshot.rows
    };
  }

  const workflowGraph = getRunWorkflowGraph(runId, state.dataset);

  if (!workflowGraph) {
    throw new Error(`Run "${runId}" has no workflow graph in the scaffold dataset.`);
  }

  const tasks = workflowGraph.nodes.map((node) => {
    const task = getTask(node.taskId, state.dataset);

    if (!task || task.runId !== runId) {
      throw new Error(`Workflow graph for run "${runId}" references missing task "${node.taskId}".`);
    }

    return toScaffoldTaskRecord(task);
  });

  return {
    retry() {},
    rows: buildExecutionRows(tasks, `Workflow graph for run "${runId}"`)
  };
}

export function useTaskDetailViewModel(runId: string, taskId: string): TaskDetailViewModel {
  const liveApi = useOptionalRunExecutionApi();
  const { state } = useResourceModel();
  const live = useLiveTaskDetailSnapshot(runId, taskId);
  const backPath = buildRunPhasePath(runId, "execution");

  if (liveApi) {
    if (live.snapshot.status === "loading") {
      return {
        artifactState: {
          message: "Loading task artifacts.",
          status: "loading"
        },
        artifactNotice: null,
        artifactSectionLabel: "Execution artifacts",
        artifacts: [],
        backPath,
        blockedBy: [],
        compatibilityState: {
          heading: "Loading task detail",
          message: `Keystone is loading live task detail for ${taskId}.`
        },
        conversationLocator: null,
        dependsOn: [],
        retry: live.retry,
        runDisplayId: runId,
        status: "Loading",
        taskDisplayId: taskId,
        title: "Loading task detail."
      };
    }

    if (live.snapshot.status === "error" || !live.snapshot.task) {
      return {
        artifactState: live.snapshot.artifactState,
        artifactNotice: null,
        artifactSectionLabel: "Execution artifacts",
        artifacts: [],
        backPath,
        blockedBy: [],
        compatibilityState: {
          actionLabel: "Retry",
          heading: "Unable to load task detail",
          message: live.snapshot.errorMessage ?? "Keystone could not load this task."
        },
        conversationLocator: null,
        dependsOn: [],
        retry: live.retry,
        runDisplayId: runId,
        status: "Unavailable",
        taskDisplayId: taskId,
        title: "Task detail unavailable."
      };
    }

    const allTaskRecords = live.snapshot.tasks.map((task) => ({
      blockedBy: [],
      conversationLocator: task.conversation ?? null,
      dependsOn: [...task.dependsOn],
      displayId: resolveTaskDisplayId(task.logicalTaskId, task.taskId),
      runId: task.runId,
      status: task.status,
      taskId: task.taskId,
      title: task.name
    }));
    const blockedByIndex = buildBlockedByIndex(allTaskRecords);
    const runTasksById = new Map(
      allTaskRecords.map((task) => [
        task.taskId,
        {
          ...task,
          blockedBy: blockedByIndex.get(task.taskId) ?? []
        }
      ])
    );
    const currentTask =
      runTasksById.get(live.snapshot.task.taskId) ?? {
        blockedBy: blockedByIndex.get(live.snapshot.task.taskId) ?? [],
        conversationLocator: live.snapshot.task.conversation ?? null,
        dependsOn: [...live.snapshot.task.dependsOn],
        displayId: resolveTaskDisplayId(
          live.snapshot.task.logicalTaskId,
          live.snapshot.task.taskId
        ),
        runId: live.snapshot.task.runId,
        status: live.snapshot.task.status,
        taskId: live.snapshot.task.taskId,
        title: live.snapshot.task.name
      };

    return {
      artifactState: live.snapshot.artifactState,
      artifactNotice: live.snapshot.artifactNotice,
      artifactSectionLabel: "Execution artifacts",
      artifacts: live.snapshot.artifacts,
      backPath,
      blockedBy: currentTask.blockedBy.map((dependencyId) =>
        selectTaskDependency(dependencyId, runTasksById)
      ),
      conversationLocator: currentTask.conversationLocator,
      dependsOn: currentTask.dependsOn.map((dependencyId) =>
        selectTaskDependency(dependencyId, runTasksById)
      ),
      retry: live.retry,
      runDisplayId: runId,
      status: getTaskStatusLabel(currentTask.status),
      taskDisplayId: currentTask.displayId,
      title: currentTask.title
    };
  }

  const run = getRun(runId, state.dataset);
  const runSummary = getRunSummary(runId, state.dataset);
  const task = getTask(taskId, state.dataset);

  if (!run || !runSummary) {
    throw new Error(`Run "${runId}" is missing from the scaffold dataset.`);
  }

  if (!task || task.runId !== runId) {
    throw new Error(
      `Task route "/runs/${runId}/execution/tasks/${taskId}" does not match any known execution task.`
    );
  }

  const runTasks = listRunTasks(runId, state.dataset).map(toScaffoldTaskRecord);
  const runTasksById = new Map(runTasks.map((candidate) => [candidate.taskId, candidate]));

  return {
    artifactState: {
      message:
        task.artifactIds.length === 0 ? "No artifacts recorded for this task yet." : null,
      status: task.artifactIds.length === 0 ? "empty" : "ready"
    },
    artifactNotice: null,
    artifactSectionLabel: "Changed files",
    artifacts: getTaskArtifacts(task.taskId, state.dataset).map(toScaffoldArtifactViewModel),
    backPath,
    blockedBy: task.blockedBy.map((dependencyId) => selectTaskDependency(dependencyId, runTasksById)),
    conversationLocator: task.conversationLocator ?? null,
    dependsOn: task.dependsOn.map((dependencyId) => selectTaskDependency(dependencyId, runTasksById)),
    retry() {},
    runDisplayId: runSummary.displayId,
    status: getTaskStatusLabel(task.status),
    taskDisplayId: task.displayId,
    title: task.title
  };
}
