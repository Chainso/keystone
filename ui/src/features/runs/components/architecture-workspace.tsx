import type { RunPlanningPhaseViewModel } from "../use-run-view-model";
import { PlanningWorkspaceFrame } from "./planning-workspace";

export function ArchitectureWorkspace(props: RunPlanningPhaseViewModel) {
  return <PlanningWorkspaceFrame {...props} />;
}
