import { getRunScaffold, type RunPlanningPhaseId } from "./run-scaffold";

export function useRunHeaderViewModel(runId: string) {
  const run = getRunScaffold(runId);

  return {
    displayId: run.displayId
  };
}

export function useRunPlanningPhaseViewModel(runId: string, phaseId: RunPlanningPhaseId) {
  const run = getRunScaffold(runId);
  const phase = run.planningPhases[phaseId];

  return {
    chatTitle: phase.chatTitle,
    documentTitle: phase.documentTitle,
    documentName: phase.documentName,
    documentLines: phase.documentLines,
    composerText: phase.composerText,
    messages: phase.messages
  };
}
