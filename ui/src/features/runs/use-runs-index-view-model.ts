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
    summary:
      "Phase 2 replaces the empty landing route with a real run index and nested run-detail routes, while keeping current backend gaps explicit.",
    contractNotes: [
      "`GET /v1/projects/:projectId/runs` is the eventual table source, but the UI still uses fixed view models in this phase.",
      "`POST /v1/runs` only launches inline decision-package payloads today, so the New run control stays intentionally disabled.",
      "Opening a run now lands in the persistent stepper shell without creating a second app frame."
    ],
    deferredWork: [
      "No live project selection, run creation, pagination, or streaming table refresh exists yet.",
      "The index proves structure and route ownership only; it does not claim real data loading."
    ],
    runs
  };
}
