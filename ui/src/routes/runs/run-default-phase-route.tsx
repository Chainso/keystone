import { Navigate } from "react-router-dom";

import { useRunDefaultPhasePath } from "../../features/runs/use-run-view-model";

export function RunDefaultPhaseRoute() {
  const defaultPhasePath = useRunDefaultPhasePath();

  return <Navigate to={defaultPhasePath} replace />;
}
