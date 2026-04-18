import { useRunPlanningPhaseViewModel } from "../../features/runs/use-run-view-model";
import { PlanningWorkspace } from "../../shared/layout/planning-workspace";
import { useRequiredRunParams } from "./use-required-run-params";

export function ArchitectureRoute() {
  const { runId } = useRequiredRunParams();
  const model = useRunPlanningPhaseViewModel(runId, "architecture");

  return <PlanningWorkspace {...model} />;
}
