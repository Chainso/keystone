import { useRunPlanningPhaseViewModel } from "../../features/runs/use-run-view-model";
import { PlanningWorkspace } from "../../features/runs/components/planning-workspace";
import { useRequiredRunParams } from "./use-required-run-params";

export function ExecutionPlanRoute() {
  const { runId } = useRequiredRunParams();
  const model = useRunPlanningPhaseViewModel(runId, "execution-plan");

  return <PlanningWorkspace {...model} />;
}
