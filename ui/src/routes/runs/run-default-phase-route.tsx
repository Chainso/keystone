import { Navigate } from "react-router-dom";

import { getRunScaffold } from "../../features/runs/run-scaffold";
import { useRequiredRunParams } from "./use-required-run-params";

export function RunDefaultPhaseRoute() {
  const { runId } = useRequiredRunParams();
  const run = getRunScaffold(runId);

  return <Navigate to={run.currentPhase} replace />;
}
