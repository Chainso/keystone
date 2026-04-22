import { useRunPlanningPhaseViewModel } from "../../features/runs/use-run-view-model";
import { PlanningWorkspaceFrame } from "../../features/runs/components/planning-workspace";

export function ArchitectureRoute() {
  const model = useRunPlanningPhaseViewModel("architecture");

  return <PlanningWorkspaceFrame {...model} />;
}
