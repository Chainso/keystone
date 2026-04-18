export type RunPhaseId = "specification" | "architecture" | "execution-plan" | "execution";

export interface RunPhaseDefinition {
  id: RunPhaseId;
  label: string;
  summary: string;
}

export const runPhaseDefinitions: RunPhaseDefinition[] = [
  {
    id: "specification",
    label: "Specification",
    summary: "Agent chat plus the living product spec."
  },
  {
    id: "architecture",
    label: "Architecture",
    summary: "Agent chat plus the current technical shape."
  },
  {
    id: "execution-plan",
    label: "Execution Plan",
    summary: "Agent chat plus the staged delivery plan."
  },
  {
    id: "execution",
    label: "Execution",
    summary: "Workflow DAG first, then task detail."
  }
];

export function getRunPhaseDefinition(phaseId: RunPhaseId) {
  return runPhaseDefinitions.find((phase) => phase.id === phaseId) ?? runPhaseDefinitions[0]!;
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
