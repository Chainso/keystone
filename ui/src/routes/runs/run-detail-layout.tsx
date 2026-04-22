import { Outlet } from "react-router-dom";

import {
  useRunDetailLayoutViewModel
} from "../../features/runs/use-run-view-model";
import { RunDetailScaffold } from "../../features/runs/components/run-detail-scaffold";
import { RunDetailProvider } from "../../features/runs/run-detail-context";
import { RunDetailState } from "../../features/runs/components/run-detail-state";
import { useRequiredRunParams } from "./use-required-run-params";

function RunDetailLayoutContent() {
  const model = useRunDetailLayoutViewModel();

  if (model.state !== "ready") {
    return <RunDetailState model={model} />;
  }

  return (
    <RunDetailScaffold {...model.header} phaseSteps={model.phaseSteps}>
      <Outlet />
    </RunDetailScaffold>
  );
}

export function RunDetailLayout() {
  const { runId } = useRequiredRunParams();

  return (
    <RunDetailProvider key={runId} runId={runId}>
      <RunDetailLayoutContent />
    </RunDetailProvider>
  );
}
