import {
  buildRunPhasePath,
  runPhaseDefinitions
} from "../../shared/navigation/run-phases";
import { useRunDetail } from "./run-detail-context";
import { hasCompileProvenance } from "./run-execution-state";
import { useReadyRunDetail } from "./use-ready-run-detail";
import type {
  RunDetailLayoutViewModel,
  RunHeaderViewModel,
  RunPhaseStepViewModel
} from "./run-view-model-types";

type ReadyRun = NonNullable<ReturnType<typeof useReadyRunDetail>["state"]["run"]>;

function buildHeaderViewModel(run: ReadyRun): RunHeaderViewModel {
  return {
    displayId: run.runId
  };
}

function buildPhaseStepperViewModel(
  run: ReadyRun
): RunPhaseStepViewModel[] {
  const executionAvailable = hasCompileProvenance(run);

  return runPhaseDefinitions.map((phase) => {
    const isAvailable = phase.id === "execution" ? executionAvailable : true;

    return {
      disabledReason:
        phase.id === "execution" && !isAvailable
          ? "Compile the run to open execution."
          : undefined,
      href: buildRunPhasePath(run.runId, phase.id),
      isAvailable,
      label: phase.label,
      phaseId: phase.id
    };
  });
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
