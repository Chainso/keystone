import { useRunPlanningPhaseViewModel } from "../../features/runs/use-run-view-model";
import { ExecutionPlanWorkspace } from "../../features/runs/components/execution-plan-workspace";

export function ExecutionPlanRoute() {
  const model = useRunPlanningPhaseViewModel("execution-plan");

  return <ExecutionPlanWorkspace {...model} />;
}
