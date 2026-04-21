import {
  getRunPhaseDefinition as getResourceRunPhaseDefinition,
  runPhaseDefinitions,
  type RunPhaseDefinition,
  type RunPhaseId
} from "../../features/resource-model/run-phase";

export type { RunPhaseDefinition, RunPhaseId };
export { runPhaseDefinitions };

export function getRunPhaseDefinition(phaseId: RunPhaseId) {
  return getResourceRunPhaseDefinition(phaseId);
}

export function buildRunPath(runId: string) {
  return `/runs/${runId}`;
}

export function buildRunPhasePath(runId: string, phaseId: RunPhaseId) {
  return `${buildRunPath(runId)}/${phaseId}`;
}

export function buildRunTaskPath(runId: string, taskId: string) {
  return `${buildRunPhasePath(runId, "execution")}/tasks/${taskId}`;
}
