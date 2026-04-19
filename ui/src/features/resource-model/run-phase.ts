import type { ResourceDocumentKind } from "./types";

export type RunPhaseId = "specification" | "architecture" | "execution-plan" | "execution";

export type RunPlanningPhaseId = Exclude<RunPhaseId, "execution">;

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

export const planningDocumentKindByRunPhase: Record<RunPlanningPhaseId, ResourceDocumentKind> = {
  specification: "product-specification",
  architecture: "technical-architecture",
  "execution-plan": "execution-plan"
};

export function getRunPhaseDefinition(phaseId: RunPhaseId) {
  return runPhaseDefinitions.find((phase) => phase.id === phaseId) ?? runPhaseDefinitions[0]!;
}

export function getPlanningPhaseForDocumentKind(kind: ResourceDocumentKind) {
  return (
    (Object.entries(planningDocumentKindByRunPhase).find(([, candidate]) => candidate === kind)?.[0] as
      | RunPlanningPhaseId
      | undefined) ?? null
  );
}
