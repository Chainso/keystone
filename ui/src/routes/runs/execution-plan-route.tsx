import { useRunPlanningPhaseViewModel } from "../../features/runs/use-run-view-model";
import { ExecutionPlanWorkspace } from "../../features/runs/components/execution-plan-workspace";
import { useRequiredRunParams } from "./use-required-run-params";

export function ExecutionPlanRoute() {
  const { runId } = useRequiredRunParams();
  const model = useRunPlanningPhaseViewModel(runId, "execution-plan");

  return <ExecutionPlanWorkspace {...model} />;
}
