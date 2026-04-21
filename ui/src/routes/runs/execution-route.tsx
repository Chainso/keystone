import { useRunExecutionViewModel } from "../../features/execution/use-execution-view-model";
import { ExecutionWorkspace } from "../../features/execution/components/execution-workspace";
import { useRequiredRunParams } from "./use-required-run-params";

export function ExecutionRoute() {
  const { runId } = useRequiredRunParams();
  const model = useRunExecutionViewModel(runId);

  return <ExecutionWorkspace model={model} />;
}
