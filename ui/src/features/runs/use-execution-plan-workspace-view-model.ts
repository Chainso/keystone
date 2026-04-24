import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { buildRunPhasePath, getRunPhaseDefinition } from "../../shared/navigation/run-phases";
import { useReadyRunDetail } from "./use-ready-run-detail";
import { hasCompiledWorkflowData, hasCurrentCompiledPlanningRevisions } from "./run-execution-state";
import { runPlanningPhaseOrder } from "./run-planning-config";
import { formatMachineLabel, isTerminalRunStatus } from "./run-status";
import { useRunPlanningPhaseViewModel } from "./use-run-planning-phase-view-model";
import type {
  ExecutionPlanCompileViewModel,
  ExecutionPlanWorkspaceViewModel,
  RunPlanningPhaseViewModel
} from "./run-view-model-types";

function getCompileBlockingMessage(input: {
  executionAvailable: boolean;
  hasCompileProvenance: boolean;
  missingPhaseLabels: string[];
  planningChangedSinceCompile: boolean;
  planningState: RunPlanningPhaseViewModel["state"];
  runStatus: string;
}) {
  if (input.planningState === "editing") {
    return "Save or discard the current execution-plan draft before compiling this run.";
  }

  if (input.planningState === "error") {
    return "Reload the current execution plan before compiling so Keystone is using the live document state.";
  }

  if (input.missingPhaseLabels.length > 0) {
    const missingList = input.missingPhaseLabels.join(", ");

    return `Compile becomes available once current revisions exist for: ${missingList}.`;
  }

  if (input.planningChangedSinceCompile) {
    if (input.runStatus === "active") {
      return "Current planning revisions are newer than the executing workflow. Recompile becomes available after this run finishes.";
    }

    if (isTerminalRunStatus(input.runStatus)) {
      return `Run status is ${formatMachineLabel(input.runStatus)}. Execution still reflects older planning revisions and cannot be refreshed here.`;
    }

    if (input.executionAvailable) {
      return "Current planning revisions are newer than the execution graph. Recompile this run to refresh Execution with the latest live documents.";
    }
  }

  if (input.hasCompileProvenance) {
    return "Compile was accepted for this run. Keystone is waiting for the live execution graph to become available.";
  }

  if (input.runStatus === "active") {
    return "This run is already executing. Open Execution to inspect the live workflow.";
  }

  if (isTerminalRunStatus(input.runStatus)) {
    return `Run status is ${formatMachineLabel(input.runStatus)}. This run cannot be compiled again.`;
  }

  return "Compile is unavailable until Keystone can confirm the latest planning state.";
}

export function useExecutionPlanWorkspaceViewModel(): ExecutionPlanWorkspaceViewModel {
  const navigate = useNavigate();
  const { actions, state } = useReadyRunDetail();
  const planning = useRunPlanningPhaseViewModel("execution-plan");
  const run = state.run!;
  const workflow = state.workflow!;
  const executionPath = buildRunPhasePath(run.runId, "execution");
  const [isCompiling, setIsCompiling] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const compileInFlightRef = useRef(false);
  const compileCompletionGuardRef = useRef(0);
  const compileSourceKey = [
    run.runId,
    run.status,
    run.compiledFrom?.compiledAt ?? "not-compiled",
    run.compiledFrom?.specificationRevisionId ?? "missing-specification-compile",
    run.compiledFrom?.architectureRevisionId ?? "missing-architecture-compile",
    run.compiledFrom?.executionPlanRevisionId ?? "missing-execution-plan-compile",
    workflow.summary.totalTasks,
    planning.state,
    ...runPlanningPhaseOrder.map((phaseId) =>
      state.planningDocuments[phaseId].document?.currentRevisionId ?? "missing"
    )
  ].join(":");

  useEffect(() => {
    compileInFlightRef.current = false;
    setIsCompiling(false);
    setSubmitErrorMessage(null);
  }, [compileSourceKey]);

  useEffect(() => {
    return () => {
      compileCompletionGuardRef.current += 1;
      compileInFlightRef.current = false;
    };
  }, []);

  const executionAvailable = hasCompiledWorkflowData({
    compiledFrom: run.compiledFrom,
    workflow
  });
  const currentCompileMatchesPlanning = hasCurrentCompiledPlanningRevisions({
    planningDocuments: state.planningDocuments,
    run
  });
  const planningChangedSinceCompile = run.compiledFrom !== null && !currentCompileMatchesPlanning;
  const compileAcceptedWithoutWorkflow =
    run.compiledFrom !== null &&
    currentCompileMatchesPlanning &&
    !executionAvailable;
  const missingPhaseLabels = runPlanningPhaseOrder.flatMap((phaseId) =>
    state.planningDocuments[phaseId].document?.currentRevisionId
      ? []
      : [getRunPhaseDefinition(phaseId).label]
  );

  async function compileRun() {
    if (compileInFlightRef.current) {
      return;
    }

    const compileGuard = compileCompletionGuardRef.current;
    compileInFlightRef.current = true;
    setIsCompiling(true);
    setSubmitErrorMessage(null);

    try {
      const result = await actions.compileRun();

      if (compileCompletionGuardRef.current !== compileGuard || result.cancelled) {
        return;
      }

      if (!result.executionAvailable && !result.workflowPending) {
        setIsCompiling(false);
        setSubmitErrorMessage(
          "Compile was accepted, but the execution graph is not ready yet. Refresh the run and try opening Execution again."
        );
        return;
      }

      navigate(executionPath);
    } catch (error) {
      if (compileCompletionGuardRef.current !== compileGuard) {
        return;
      }

      setIsCompiling(false);
      setSubmitErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Unable to compile this run."
      );
    } finally {
      compileInFlightRef.current = false;
    }
  }

  let compile: ExecutionPlanCompileViewModel;

  if (executionAvailable && !planningChangedSinceCompile) {
    compile = {
      actionHref: executionPath,
      actionLabel: "Open execution",
      state: "compiled",
      title: "Execution ready"
    };
  } else if (
    planning.state === "editing" ||
    planning.state === "error" ||
    compileAcceptedWithoutWorkflow ||
    (planningChangedSinceCompile && (run.status === "active" || isTerminalRunStatus(run.status))) ||
    missingPhaseLabels.length > 0 ||
    run.status === "active" ||
    isTerminalRunStatus(run.status)
  ) {
    compile = {
      actionHref: executionAvailable ? executionPath : undefined,
      actionLabel: executionAvailable ? "Open current execution" : undefined,
      helperMessage: getCompileBlockingMessage({
        executionAvailable,
        hasCompileProvenance: compileAcceptedWithoutWorkflow,
        missingPhaseLabels,
        planningChangedSinceCompile,
        planningState: planning.state,
        runStatus: run.status
      }),
      refresh: compileAcceptedWithoutWorkflow
        ? () => {
            void actions.reload();
          }
        : undefined,
      refreshLabel: compileAcceptedWithoutWorkflow ? "Refresh run" : undefined,
      state: "blocked",
      title: planningChangedSinceCompile ? "Recompile unavailable" : "Compile unavailable"
    };
  } else {
    compile = {
      actionLabel: isCompiling
        ? planningChangedSinceCompile
          ? "Recompiling run..."
          : "Compiling run..."
        : planningChangedSinceCompile
          ? "Recompile run"
          : "Compile run",
      compileRun: () => {
        void compileRun();
      },
      helperMessage: planningChangedSinceCompile
        ? "Current planning revisions are newer than the execution graph."
        : undefined,
      isSubmitting: isCompiling,
      secondaryActionHref: executionAvailable ? executionPath : undefined,
      secondaryActionLabel: executionAvailable ? "Open current execution" : undefined,
      state: "ready",
      submitErrorMessage,
      title: planningChangedSinceCompile ? "Recompile run" : "Compile run"
    };
  }

  return {
    compile,
    planning
  };
}
