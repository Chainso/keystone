import { useRunPlanningPhaseViewModel } from "../../features/runs/use-run-view-model";
import { SpecificationWorkspace } from "../../features/runs/components/specification-workspace";

export function SpecificationRoute() {
  const model = useRunPlanningPhaseViewModel("specification");

  return <SpecificationWorkspace {...model} />;
}
