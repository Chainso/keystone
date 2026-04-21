import { Navigate } from "react-router-dom";

import { useResourceModel } from "../../features/resource-model/context";
import { getRunSummary } from "../../features/resource-model/selectors";
import { useRequiredRunParams } from "./use-required-run-params";

export function RunDefaultPhaseRoute() {
  const { runId } = useRequiredRunParams();
  const { state } = useResourceModel();
  const run = getRunSummary(runId, state.dataset);

  if (!run) {
    throw new Error(`Run "${runId}" is missing from the scaffold dataset.`);
  }

  return <Navigate to={run.defaultPhaseId} replace />;
}
