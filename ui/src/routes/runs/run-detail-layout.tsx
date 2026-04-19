import { Outlet } from "react-router-dom";

import {
  useRunHeaderViewModel,
  useRunPhaseStepperViewModel
} from "../../features/runs/use-run-view-model";
import { RunDetailScaffold } from "../../features/runs/components/run-detail-scaffold";
import { useRequiredRunParams } from "./use-required-run-params";

export function RunDetailLayout() {
  const { runId } = useRequiredRunParams();
  const headerModel = useRunHeaderViewModel(runId);
  const stepperModel = useRunPhaseStepperViewModel(runId);

  return (
    <RunDetailScaffold {...headerModel} phaseSteps={stepperModel.steps}>
      <Outlet />
    </RunDetailScaffold>
  );
}
