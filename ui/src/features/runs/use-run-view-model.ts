import { useResourceModel } from "../resource-model/context";
import {
  getRunPlanningDocument,
  getRunSummary,
  listRunPlanningDocuments
} from "../resource-model/selectors";
import {
  buildRunPhasePath,
  getRunPhaseDefinition,
  runPhaseDefinitions,
  type RunPhaseId
} from "../../shared/navigation/run-phases";
import type { ConversationLocator } from "../resource-model/types";
import type { RunPlanningPhaseId } from "../resource-model/run-phase";

export interface RunHeaderViewModel {
  displayId: string;
  summary: string;
  status: string;
  updatedLabel: string;
}

export interface RunPhaseStepViewModel {
  phaseId: RunPhaseId;
  label: string;
  href: string;
  isAvailable: boolean;
}

export interface RunPlanningPhaseViewModel {
  phaseTitle: string;
  phaseSummary: string;
  conversationLocator: ConversationLocator | null;
  documentTitle: string;
  documentPath: string;
  documentLines: string[];
}

function useRequiredRunSummary(runId: string) {
  const { state } = useResourceModel();
  const summary = getRunSummary(runId, state.dataset);

  if (!summary) {
    throw new Error(`Run "${runId}" is missing from the scaffold dataset.`);
  }

  return {
    dataset: state.dataset,
    summary
  };
}

export function useRunHeaderViewModel(runId: string) {
  const { summary } = useRequiredRunSummary(runId);

  return {
    displayId: summary.displayId,
    summary: summary.summary,
    status: summary.status,
    updatedLabel: summary.updatedLabel
  };
}

export function useRunPhaseStepperViewModel(runId: string) {
  const { dataset } = useRequiredRunSummary(runId);
  const availablePlanningPhases = new Set(
    listRunPlanningDocuments(runId, dataset).map((selection) => selection.phaseId)
  );

  return {
    steps: runPhaseDefinitions.map((phase) => ({
      phaseId: phase.id,
      label: phase.label,
      href: buildRunPhasePath(runId, phase.id),
      isAvailable: phase.id === "execution" || availablePlanningPhases.has(phase.id)
    }))
  };
}

export function useRunPlanningPhaseViewModel(runId: string, phaseId: RunPlanningPhaseId) {
  const { dataset } = useRequiredRunSummary(runId);
  const selection = getRunPlanningDocument(runId, phaseId, dataset);

  if (!selection) {
    throw new Error(`Run "${runId}" has no planning document for phase "${phaseId}".`);
  }

  const phase = getRunPhaseDefinition(phaseId);

  return {
    phaseTitle: `${phase.label} conversation`,
    phaseSummary: phase.summary,
    conversationLocator: selection.document.conversationLocator ?? null,
    documentTitle: selection.revision.viewerTitle,
    documentPath: selection.document.path,
    documentLines: selection.revision.contentLines
  };
}
