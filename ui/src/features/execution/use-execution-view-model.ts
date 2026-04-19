import { buildRunPhasePath } from "../../shared/navigation/run-phases";
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

export interface ExecutionNodeViewModel {
  taskId: string;
  displayId: string;
  graphLabel: string;
  title: string;
  status: string;
  dependencyCount: number;
  blockedByCount: number;
  detailPath: string;
}

export interface ExecutionRowViewModel {
  rowId: string;
  tasks: ExecutionNodeViewModel[];
}

export interface RunExecutionViewModel {
  rows: ExecutionRowViewModel[];
}

export interface TaskArtifactViewModel {
  artifactId: string;
  path: string;
  summary: string;
  diff: string[];
}

export interface TaskDependencyViewModel {
  taskId: string;
  displayId: string;
  title: string;
}

export interface TaskDetailViewModel {
  runDisplayId: string;
  taskDisplayId: string;
  title: string;
  status: string;
  backPath: string;
  conversationLocator: ConversationLocator | null;
  dependsOn: TaskDependencyViewModel[];
  blockedBy: TaskDependencyViewModel[];
  artifacts: TaskArtifactViewModel[];
}

function groupTaskIdsByDepth(tasks: ResourceTask[]) {
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

  return tasks.reduce<Map<number, ResourceTask[]>>((rows, task) => {
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

function toExecutionNodeViewModel(task: ResourceTask): ExecutionNodeViewModel {
  return {
    taskId: task.taskId,
    displayId: task.displayId,
    graphLabel: task.graphLabel,
    title: task.title,
    status: task.status,
    dependencyCount: task.dependsOn.length,
    blockedByCount: task.blockedBy.length,
    detailPath: buildRunPhasePath(task.runId, "execution") + `/tasks/${task.taskId}`
  };
}

function selectTaskDependency(
  taskId: string,
  tasksById: Map<string, ResourceTask>,
  runId: string
): TaskDependencyViewModel {
  const task = tasksById.get(taskId);

  if (!task || task.runId !== runId) {
    throw new Error(`Task "${taskId}" is missing from run "${runId}".`);
  }

  return {
    taskId: task.taskId,
    displayId: task.displayId,
    title: task.title
  };
}

export function useRunExecutionViewModel(runId: string): RunExecutionViewModel {
  const { state } = useResourceModel();
  const workflowGraph = getRunWorkflowGraph(runId, state.dataset);

  if (!workflowGraph) {
    throw new Error(`Run "${runId}" has no workflow graph in the scaffold dataset.`);
  }

  const tasks = workflowGraph.nodes.map((node) => {
    const task = getTask(node.taskId, state.dataset);

    if (!task || task.runId !== runId) {
      throw new Error(`Workflow graph for run "${runId}" references missing task "${node.taskId}".`);
    }

    return task;
  });

  const rowsByDepth = groupTaskIdsByDepth(tasks);

  return {
    rows: [...rowsByDepth.entries()]
      .sort(([left], [right]) => left - right)
      .map(([depth, rowTasks]) => ({
        rowId: `execution-row-${depth}`,
        tasks: rowTasks.map(toExecutionNodeViewModel)
      }))
  };
}

export function useTaskDetailViewModel(runId: string, taskId: string): TaskDetailViewModel {
  const { state } = useResourceModel();
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

  const runTasks = listRunTasks(runId, state.dataset);
  const runTasksById = new Map(runTasks.map((candidate) => [candidate.taskId, candidate]));

  return {
    runDisplayId: runSummary.displayId,
    taskDisplayId: task.displayId,
    title: task.title,
    status: task.status,
    backPath: buildRunPhasePath(runId, "execution"),
    conversationLocator: task.conversationLocator ?? null,
    dependsOn: task.dependsOn.map((dependencyId) => selectTaskDependency(dependencyId, runTasksById, runId)),
    blockedBy: task.blockedBy.map((dependencyId) => selectTaskDependency(dependencyId, runTasksById, runId)),
    artifacts: getTaskArtifacts(task.taskId, state.dataset).map((artifact) => ({
      artifactId: artifact.artifactId,
      path: artifact.path,
      summary: artifact.summary,
      diff: artifact.diff
    }))
  };
}
