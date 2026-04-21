import { useTaskDetailViewModel } from "../../features/execution/use-execution-view-model";
import { TaskDetailWorkspace } from "../../features/execution/components/task-detail-workspace";
import { useRequiredRunParams } from "./use-required-run-params";

export function TaskDetailRoute() {
  const { runId, taskId } = useRequiredRunParams();
  const model = useTaskDetailViewModel(runId, taskId);

  return <TaskDetailWorkspace model={model} />;
}
