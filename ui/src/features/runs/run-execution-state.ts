import type { RunPlanningDocumentState } from "./run-detail-context";
import type { RunPlanningPhaseId } from "./run-types";

export function hasCompiledWorkflowData(input: {
  compiledFrom: object | null;
  workflow: {
    summary: {
      totalTasks: number;
    };
  };
}) {
  return input.compiledFrom !== null && input.workflow.summary.totalTasks > 0;
}

export function hasCompileProvenance(run: {
  compiledFrom: object | null;
}) {
  return run.compiledFrom !== null;
}

export function hasCurrentCompiledPlanningRevisions(input: {
  planningDocuments: Record<RunPlanningPhaseId, RunPlanningDocumentState>;
  run: {
    compiledFrom: {
      architectureRevisionId: string;
      executionPlanRevisionId: string;
      specificationRevisionId: string;
    } | null;
  };
}) {
  const compiledFrom = input.run.compiledFrom;

  if (!compiledFrom) {
    return false;
  }

  return (
    input.planningDocuments.specification.document?.currentRevisionId ===
      compiledFrom.specificationRevisionId &&
    input.planningDocuments.architecture.document?.currentRevisionId ===
      compiledFrom.architectureRevisionId &&
    input.planningDocuments["execution-plan"].document?.currentRevisionId ===
      compiledFrom.executionPlanRevisionId
  );
}
