import { useRunPlanningPhaseViewModel } from "../../features/runs/use-run-view-model";
import { SpecificationWorkspace } from "../../features/runs/components/specification-workspace";
import { useRequiredRunParams } from "./use-required-run-params";

export function SpecificationRoute() {
  const { runId } = useRequiredRunParams();
  const model = useRunPlanningPhaseViewModel(runId, "specification");

  return <SpecificationWorkspace {...model} />;
}
