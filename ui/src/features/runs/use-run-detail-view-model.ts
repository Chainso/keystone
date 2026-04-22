import {
  buildRunPhasePath,
  runPhaseDefinitions
} from "../../shared/navigation/run-phases";
import { useRunDetail } from "./run-detail-context";
import { hasCompileProvenance } from "./run-execution-state";
import { runPlanningPhaseOrder } from "./run-planning-config";
import { buildRunActivityLabel, formatMachineLabel, getRunStatusPresentation } from "./run-status";
import { useReadyRunDetail } from "./use-ready-run-detail";
import type {
  RunDetailLayoutViewModel,
  RunHeaderViewModel,
  RunPhaseStepViewModel
} from "./run-view-model-types";

type ReadyRun = NonNullable<ReturnType<typeof useReadyRunDetail>["state"]["run"]>;

function buildHeaderViewModel(run: ReadyRun): RunHeaderViewModel {
  const status = getRunStatusPresentation(run.status);

  return {
    displayId: run.runId,
    statusLabel: status.statusLabel,
    statusTone: status.statusTone,
    summary: `Workflow ${run.workflowInstanceId} · ${formatMachineLabel(run.executionEngine)}`,
    updatedLabel: buildRunActivityLabel({
      compiledAt: run.compiledFrom?.compiledAt ?? null,
      endedAt: run.endedAt,
      startedAt: run.startedAt
    })
  };
}

function buildPhaseStepperViewModel(
  run: ReadyRun
): RunPhaseStepViewModel[] {
  return runPhaseDefinitions.map((phase) => ({
    href: buildRunPhasePath(run.runId, phase.id),
    isAvailable: phase.id === "execution" ? hasCompileProvenance(run) : true,
    label: phase.label,
    phaseId: phase.id
  }));
}

export function useRunDetailLayoutViewModel(): RunDetailLayoutViewModel {
  const { actions, meta, state } = useRunDetail();

  if (meta.status === "loading") {
    return {
      heading: "Loading run",
      message: `Keystone is loading ${meta.runId}.`,
      state: "loading"
    };
  }

  if (meta.status === "not_found") {
    return {
      heading: "Run not found",
      message: meta.errorMessage ?? `Run ${meta.runId} was not found.`,
      retry: () => {
        void actions.reload();
      },
      state: "not_found"
    };
  }

  if (meta.status === "error") {
    return {
      heading: "Unable to load run",
      message: meta.errorMessage ?? "Keystone could not load this run.",
      retry: () => {
        void actions.reload();
      },
      state: "error"
    };
  }

  if (!state.run) {
    throw new Error("Run detail layout requires a loaded run.");
  }

  return {
    header: buildHeaderViewModel(state.run),
    phaseSteps: buildPhaseStepperViewModel(state.run),
    state: "ready"
  };
}

export function useRunDefaultPhasePath() {
  const { state } = useReadyRunDetail();
  const run = state.run!;

  if (hasCompileProvenance(run)) {
    return buildRunPhasePath(run.runId, "execution");
  }

  const firstIncompletePhase =
    runPlanningPhaseOrder.find(
      (phaseId) => !state.planningDocuments[phaseId].document?.currentRevisionId
    ) ?? "execution-plan";

  return buildRunPhasePath(run.runId, firstIncompletePhase);
}
