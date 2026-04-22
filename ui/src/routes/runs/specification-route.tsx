import { useRunPlanningPhaseViewModel } from "../../features/runs/use-run-view-model";
import { PlanningWorkspaceFrame } from "../../features/runs/components/planning-workspace";

export function SpecificationRoute() {
  const model = useRunPlanningPhaseViewModel("specification");

  return <PlanningWorkspaceFrame {...model} />;
}
