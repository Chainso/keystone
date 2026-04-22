import type { RunPlanningPhaseId } from "./run-types";

export const runPlanningPhaseOrder: RunPlanningPhaseId[] = [
  "specification",
  "architecture",
  "execution-plan"
];

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
