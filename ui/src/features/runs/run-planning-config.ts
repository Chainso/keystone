import type { RunPlanningPhaseId } from "./run-types";

export const runPlanningPhaseOrder: RunPlanningPhaseId[] = [
  "specification",
  "architecture",
  "execution-plan"
];

export const defaultRunPlanningPhaseId =
  runPlanningPhaseOrder[runPlanningPhaseOrder.length - 1]!;

export function buildRunPlanningPhaseRecord<Value>(
  getValue: (phaseId: RunPlanningPhaseId) => Value
): Record<RunPlanningPhaseId, Value> {
  return Object.fromEntries(
    runPlanningPhaseOrder.map((phaseId) => [phaseId, getValue(phaseId)] as const)
  ) as Record<RunPlanningPhaseId, Value>;
}

export function getDefaultRunPlanningPhaseId(
  hasCurrentRevision: (phaseId: RunPlanningPhaseId) => boolean
) {
  return runPlanningPhaseOrder.find((phaseId) => !hasCurrentRevision(phaseId)) ?? defaultRunPlanningPhaseId;
}

export const canonicalDocumentPathByPhase: Record<RunPlanningPhaseId, string> = {
  specification: "specification",
  architecture: "architecture",
  "execution-plan": "execution-plan"
};

export const defaultRevisionTitleByPhase: Record<RunPlanningPhaseId, string> = {
  specification: "Run Specification",
  architecture: "Run Architecture",
  "execution-plan": "Execution Plan"
};
