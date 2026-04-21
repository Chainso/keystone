import { useRunPlanningPhaseViewModel } from "../../features/runs/use-run-view-model";
import { ArchitectureWorkspace } from "../../features/runs/components/architecture-workspace";
import { useRequiredRunParams } from "./use-required-run-params";

export function ArchitectureRoute() {
  const { runId } = useRequiredRunParams();
  const model = useRunPlanningPhaseViewModel(runId, "architecture");

  return <ArchitectureWorkspace {...model} />;
}
