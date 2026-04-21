import { useRunExecutionViewModel } from "../../features/execution/use-execution-view-model";
import { ExecutionWorkspace } from "../../features/execution/components/execution-workspace";

export function ExecutionRoute() {
  const model = useRunExecutionViewModel();

  return <ExecutionWorkspace model={model} />;
}
