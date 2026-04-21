import { useResourceModel } from "../resource-model/context";
import { listRunSummaries } from "../resource-model/selectors";
import { getRunPhaseDefinition } from "../../shared/navigation/run-phases";

export function useRunsIndexViewModel() {
  const { state } = useResourceModel();
  const runs = listRunSummaries(state.currentProjectId, state.dataset).map((run) => ({
    runId: run.runId,
    displayId: run.displayId,
    summary: run.summary,
    status: run.status,
    updatedLabel: run.updatedLabel,
    stageLabel: getRunPhaseDefinition(run.defaultPhaseId).label,
    detailPath: run.detailPath
  }));

  return {
    title: "Runs",
    runs
  };
}
