import { Navigate } from "react-router-dom";

import { useRunDefaultPhaseId } from "../../features/runs/use-run-view-model";
import { useRequiredRunParams } from "./use-required-run-params";

export function RunDefaultPhaseRoute() {
  const { runId } = useRequiredRunParams();
  const phaseId = useRunDefaultPhaseId(runId);

  return <Navigate to={phaseId} replace />;
}
