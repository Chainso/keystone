import { Outlet } from "react-router-dom";

import { useRunHeaderViewModel } from "../../features/runs/use-run-view-model";
import { RunDetailScaffold } from "../../features/runs/components/run-detail-scaffold";
import { useRequiredRunParams } from "./use-required-run-params";

export function RunDetailLayout() {
  const { runId } = useRequiredRunParams();
  const model = useRunHeaderViewModel(runId);

  return (
    <RunDetailScaffold displayId={model.displayId}>
      <Outlet />
    </RunDetailScaffold>
  );
}
