import { getRunPhaseLabel, listRunScaffolds } from "./run-scaffold";

export function useRunsIndexViewModel() {
  const runs = listRunScaffolds().map((run) => ({
    runId: run.runId,
    displayId: run.displayId,
    summary: run.summary,
    status: run.status,
    updatedLabel: run.updatedLabel,
    currentPhaseLabel: getRunPhaseLabel(run.currentPhase),
    detailPath: run.detailPath
  }));

  return {
    title: "Runs",
    runs
  };
}
