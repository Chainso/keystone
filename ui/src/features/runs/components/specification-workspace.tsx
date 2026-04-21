import type { RunPlanningPhaseViewModel } from "../use-run-view-model";
import { PlanningWorkspaceFrame } from "./planning-workspace";

export function SpecificationWorkspace(props: RunPlanningPhaseViewModel) {
  return <PlanningWorkspaceFrame {...props} />;
}
