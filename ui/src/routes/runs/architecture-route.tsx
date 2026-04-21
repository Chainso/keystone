import { useRunPlanningPhaseViewModel } from "../../features/runs/use-run-view-model";
import { ArchitectureWorkspace } from "../../features/runs/components/architecture-workspace";

export function ArchitectureRoute() {
  const model = useRunPlanningPhaseViewModel("architecture");

  return <ArchitectureWorkspace {...model} />;
}
