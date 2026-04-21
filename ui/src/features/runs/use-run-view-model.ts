import { useEffect, useRef, useState } from "react";

import type { RunResource } from "../../../../src/http/api/v1/runs/contracts";
import { useOptionalRunExecutionApi } from "../execution/execution-api";
import { useResourceModel } from "../resource-model/context";
import {
  getRunDefaultPhaseId,
  getRunPlanningDocument,
  getRunSummary,
  getRunWorkflowGraph,
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

interface LiveRunSnapshot {
  errorMessage: string | null;
  run: RunResource | null;
  status: "idle" | "loading" | "ready" | "error";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load run details.";
}

function formatUtcTimestamp(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.valueOf())) {
    return value;
  }

  return `${timestamp.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function titleCaseToken(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatStatusLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => titleCaseToken(segment.toLowerCase()))
    .join(" ");
}

function formatExecutionEngineLabel(value: RunResource["executionEngine"]) {
  return formatStatusLabel(value);
}

function buildLiveRunActivityLabel(run: RunResource) {
  if (run.endedAt) {
    return `Ended ${formatUtcTimestamp(run.endedAt)}`;
  }

  if (run.startedAt) {
    return `Started ${formatUtcTimestamp(run.startedAt)}`;
  }

  if (run.compiledFrom) {
    return `Compiled ${formatUtcTimestamp(run.compiledFrom.compiledAt)}`;
  }

  return "No recorded activity yet";
}

function buildLiveRunSummary(run: RunResource) {
  return `Workflow ${run.workflowInstanceId} · ${formatExecutionEngineLabel(run.executionEngine)} engine`;
}

function useScaffoldRunData(runId: string) {
  const { state } = useResourceModel();
  const summary = getRunSummary(runId, state.dataset);

  return {
    dataset: state.dataset,
    summary
  };
}

function requireScaffoldRunSummary(runId: string) {
  const scaffold = useScaffoldRunData(runId);

  if (!scaffold.summary) {
    throw new Error(`Run "${runId}" is missing from the scaffold dataset.`);
  }

  return scaffold;
}

function useLiveRunSnapshot(runId: string): LiveRunSnapshot {
  const api = useOptionalRunExecutionApi();
  const requestIdRef = useRef(0);
  const [snapshot, setSnapshot] = useState<LiveRunSnapshot>({
    errorMessage: null,
    run: null,
    status: api ? "loading" : "idle"
  });

  useEffect(() => {
    if (!api) {
      setSnapshot({
        errorMessage: null,
        run: null,
        status: "idle"
      });
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setSnapshot({
      errorMessage: null,
      run: null,
      status: "loading"
    });

    void api
      .getRun(runId)
      .then((run) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setSnapshot({
          errorMessage: null,
          run,
          status: "ready"
        });
      })
      .catch((error) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setSnapshot({
          errorMessage: getErrorMessage(error),
          run: null,
          status: "error"
        });
      });
  }, [api, runId]);

  return snapshot;
}

export function useRunHeaderViewModel(runId: string) {
  const liveApi = useOptionalRunExecutionApi();
  const liveSnapshot = useLiveRunSnapshot(runId);
  const scaffold = useScaffoldRunData(runId);

  if (liveApi) {
    const liveRun = liveSnapshot.run;

    return {
      displayId: liveRun?.runId ?? runId,
      summary:
        liveRun?.runId && liveSnapshot.status === "ready"
          ? buildLiveRunSummary(liveRun)
          : liveSnapshot.status === "error"
            ? liveSnapshot.errorMessage ?? "Unable to load run details."
            : "Loading live run details.",
      status:
        liveRun?.runId && liveSnapshot.status === "ready"
          ? formatStatusLabel(liveRun.status)
          : liveSnapshot.status === "error"
            ? "Unavailable"
            : "Loading",
      updatedLabel:
        liveRun?.runId && liveSnapshot.status === "ready"
          ? `Latest activity ${buildLiveRunActivityLabel(liveRun)}`
          : liveSnapshot.status === "error"
            ? "Run details unavailable"
            : "Loading live run details."
    };
  }

  if (!scaffold.summary) {
    throw new Error(`Run "${runId}" is missing from the scaffold dataset.`);
  }

  return {
    displayId: scaffold.summary.displayId,
    summary: scaffold.summary.summary,
    status: scaffold.summary.status,
    updatedLabel: `Updated ${scaffold.summary.updatedLabel}`
  };
}

export function useRunPhaseStepperViewModel(runId: string) {
  const liveApi = useOptionalRunExecutionApi();
  const scaffold = useScaffoldRunData(runId);

  if (liveApi) {
    return {
      steps: runPhaseDefinitions.map((phase) => ({
        phaseId: phase.id,
        label: phase.label,
        href: buildRunPhasePath(runId, phase.id),
        isAvailable: phase.id === "execution"
      }))
    };
  }

  if (!scaffold.summary) {
    throw new Error(`Run "${runId}" is missing from the scaffold dataset.`);
  }

  const availablePlanningPhases = new Set(
    listRunPlanningDocuments(runId, scaffold.dataset).map((selection) => selection.phaseId)
  );
  const hasRenderableExecution = getRunWorkflowGraph(runId, scaffold.dataset) !== null;

  return {
    steps: runPhaseDefinitions.map((phase) => ({
      phaseId: phase.id,
      label: phase.label,
      href: buildRunPhasePath(runId, phase.id),
      isAvailable:
        phase.id === "execution"
          ? hasRenderableExecution
          : availablePlanningPhases.has(phase.id)
    }))
  };
}

export function useRunDefaultPhaseId(runId: string): RunPhaseId {
  const liveApi = useOptionalRunExecutionApi();
  const scaffold = useScaffoldRunData(runId);

  if (liveApi) {
    return "execution";
  }

  if (!scaffold.summary) {
    throw new Error(`Run "${runId}" is missing from the scaffold dataset.`);
  }

  return getRunDefaultPhaseId(runId, scaffold.dataset);
}

export function useRunPlanningPhaseViewModel(runId: string, phaseId: RunPlanningPhaseId) {
  const { dataset } = requireScaffoldRunSummary(runId);
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
