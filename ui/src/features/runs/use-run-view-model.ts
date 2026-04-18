import { getRunPhaseLabel, getRunScaffold, type RunPlanningPhaseId } from "./run-scaffold";

export function useRunHeaderViewModel(runId: string) {
  const run = getRunScaffold(runId);

  return {
    displayId: run.displayId,
    summary: run.summary,
    status: run.status,
    updatedLabel: run.updatedLabel,
    currentPhaseLabel: getRunPhaseLabel(run.currentPhase),
    statusNote: run.statusNote,
    coverageNotes: [
      "Run detail routing is now fixed under the existing shell and project-scoped sidebar.",
      "The UI does not load live run detail yet, even though the run, graph, task, and stream seams already exist.",
      "Typed stubs for evidence, integration, and release remain visibly deferred."
    ]
  };
}

export function useRunPlanningPhaseViewModel(runId: string, phaseId: RunPlanningPhaseId) {
  const run = getRunScaffold(runId);
  const phase = run.planningPhases[phaseId];

  return {
    runDisplayId: run.displayId,
    phaseLabel: getRunPhaseLabel(phaseId),
    chatTitle: phase.chatTitle,
    documentTitle: phase.documentTitle,
    documentName: phase.documentName,
    documentSummary: phase.documentSummary,
    composerPlaceholder: phase.composerPlaceholder,
    messages: phase.messages,
    currentState: phase.currentState,
    backendCoverage: phase.backendCoverage,
    deferredWork: phase.deferredWork
  };
}
