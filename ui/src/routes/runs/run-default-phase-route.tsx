import { Navigate, useParams } from "react-router-dom";

import { buildRunPhasePath } from "../../shared/navigation/run-phases";

export function RunDefaultPhaseRoute() {
  const { runId } = useParams<{ runId: string }>();

  if (!runId) {
    return <Navigate to="/runs" replace />;
  }

  return <Navigate to={buildRunPhasePath(runId, "specification")} replace />;
}
