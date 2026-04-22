import { useTaskDetailViewModel } from "../../features/execution/use-execution-view-model";
import { TaskDetailWorkspace } from "../../features/execution/components/task-detail-workspace";
import { useRequiredRunParams } from "./use-required-run-params";

export function TaskDetailRoute() {
  const { taskId } = useRequiredRunParams();
  const model = useTaskDetailViewModel(taskId);

  return <TaskDetailWorkspace model={model} />;
}
