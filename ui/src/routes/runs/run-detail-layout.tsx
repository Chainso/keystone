import { Outlet } from "react-router-dom";

import { useRunHeaderViewModel } from "../../features/runs/use-run-view-model";
import { RunDetailScaffold } from "../../shared/layout/run-detail-scaffold";
import { useRequiredRunParams } from "./use-required-run-params";

export function RunDetailLayout() {
  const { runId } = useRequiredRunParams();
  const model = useRunHeaderViewModel(runId);

  return (
    <RunDetailScaffold
      displayId={model.displayId}
      summary={model.summary}
      status={model.status}
      updatedLabel={model.updatedLabel}
      currentPhaseLabel={model.currentPhaseLabel}
      statusNote={model.statusNote}
      coverageNotes={model.coverageNotes}
    >
      <Outlet />
    </RunDetailScaffold>
  );
}
