import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  buildRunPhasePath,
  getRunPhaseDefinition,
  runPhaseDefinitions,
  type RunPhaseId
} from "../../shared/navigation/run-phases";
import {
  useRunDetail,
  type RunPlanningDocumentState
} from "./run-detail-context";

type RunPlanningPhaseId = Exclude<RunPhaseId, "execution">;
type ConversationLocator = {
  agentClass: string;
  agentName: string;
};
const runPlanningPhaseOrder: RunPlanningPhaseId[] = [
  "specification",
  "architecture",
  "execution-plan"
];

export interface RunHeaderViewModel {
  displayId: string;
  status: string;
  summary: string;
  updatedLabel: string;
}

export interface RunPhaseStepViewModel {
  href: string;
  isAvailable: boolean;
  label: string;
  phaseId: RunPhaseId;
}

export interface RunDetailStateViewModel {
  heading: string;
  message: string;
  retry?: (() => void) | undefined;
  state: "loading" | "not_found" | "error";
}

export interface RunDetailReadyViewModel {
  header: RunHeaderViewModel;
  phaseSteps: RunPhaseStepViewModel[];
  state: "ready";
}

export type RunDetailLayoutViewModel =
  | RunDetailReadyViewModel
  | RunDetailStateViewModel;

interface RunPlanningPhaseBaseViewModel {
  conversationLocator: ConversationLocator | null;
  documentPath: string;
  panelTitle: string;
  phaseSummary: string;
  phaseTitle: string;
}

export interface RunPlanningPhaseReadyViewModel extends RunPlanningPhaseBaseViewModel {
  documentLines: string[];
  editDocument: () => void;
  state: "ready";
}

export interface RunPlanningPhaseEmptyViewModel extends RunPlanningPhaseBaseViewModel {
  actionErrorMessage: string | null;
  actionLabel: string;
  emptyMessage: string;
  emptyTitle: string;
  isCreating: boolean;
  startEditing: () => void;
  state: "empty";
}

export interface RunPlanningPhaseErrorViewModel extends RunPlanningPhaseBaseViewModel {
  errorMessage: string;
  errorTitle: string;
  retry: () => void;
  state: "error";
}

export interface RunPlanningPhaseEditingViewModel extends RunPlanningPhaseBaseViewModel {
  bodyField: {
    label: string;
    onChange: (value: string) => void;
    value: string;
  };
  canSave: boolean;
  discardChanges: () => void;
  hasUnsavedChanges: boolean;
  helperMessage: string;
  isSubmitting: boolean;
  saveChanges: () => void;
  saveLabel: string;
  submitErrorMessage: string | null;
  titleField: {
    label: string;
    onChange: (value: string) => void;
    value: string;
  };
  state: "editing";
}

export type RunPlanningPhaseViewModel =
  | RunPlanningPhaseReadyViewModel
  | RunPlanningPhaseEditingViewModel
  | RunPlanningPhaseEmptyViewModel
  | RunPlanningPhaseErrorViewModel;

export interface ExecutionPlanCompileReadyViewModel {
  actionLabel: string;
  compileRun: () => void;
  helperMessage: string;
  isSubmitting: boolean;
  state: "ready";
  submitErrorMessage: string | null;
  title: string;
}

export interface ExecutionPlanCompileBlockedViewModel {
  helperMessage: string;
  state: "blocked";
  title: string;
}

export interface ExecutionPlanCompileCompletedViewModel {
  actionHref: string;
  actionLabel: string;
  helperMessage: string;
  state: "compiled";
  title: string;
}

export type ExecutionPlanCompileViewModel =
  | ExecutionPlanCompileReadyViewModel
  | ExecutionPlanCompileBlockedViewModel
  | ExecutionPlanCompileCompletedViewModel;

export interface ExecutionPlanWorkspaceViewModel {
  compile: ExecutionPlanCompileViewModel;
  planning: RunPlanningPhaseViewModel;
}

const canonicalDocumentPathByPhase: Record<RunPlanningPhaseId, string> = {
  specification: "specification",
  architecture: "architecture",
  "execution-plan": "execution-plan"
};

const defaultRevisionTitleByPhase: Record<RunPlanningPhaseId, string> = {
  specification: "Run Specification",
  architecture: "Run Architecture",
  "execution-plan": "Execution Plan"
};

function formatRunTimestamp(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.valueOf())) {
    return value;
  }

  return `${timestamp.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function formatStatusLabel(status: string) {
  if (!status.trim()) {
    return status;
  }

  return status
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildRunActivityLabel(input: {
  compiledAt: string | null;
  endedAt: string | null;
  startedAt: string | null;
}) {
  if (input.endedAt) {
    return `Ended ${formatRunTimestamp(input.endedAt)}`;
  }

  if (input.startedAt) {
    return `Started ${formatRunTimestamp(input.startedAt)}`;
  }

  if (input.compiledAt) {
    return `Compiled ${formatRunTimestamp(input.compiledAt)}`;
  }

  return "No recorded activity yet";
}

function useReadyRunDetail() {
  const runDetail = useRunDetail();

  if (runDetail.meta.status !== "ready" || !runDetail.state.run || !runDetail.state.workflow) {
    throw new Error("Run view models require a ready RunDetailProvider.");
  }

  return runDetail;
}

function buildHeaderViewModel(run: NonNullable<ReturnType<typeof useReadyRunDetail>["state"]["run"]>): RunHeaderViewModel {
  return {
    displayId: run.runId,
    status: formatStatusLabel(run.status),
    summary: `Workflow ${run.workflowInstanceId} · ${formatStatusLabel(run.executionEngine)}`,
    updatedLabel: buildRunActivityLabel({
      compiledAt: run.compiledFrom?.compiledAt ?? null,
      endedAt: run.endedAt,
      startedAt: run.startedAt
    })
  };
}

function hasCompiledWorkflowData(input: {
  compiledFrom: NonNullable<ReturnType<typeof useReadyRunDetail>["state"]["run"]>["compiledFrom"];
  workflow: NonNullable<ReturnType<typeof useReadyRunDetail>["state"]["workflow"]>;
}) {
  return input.compiledFrom !== null && input.workflow.summary.totalTasks > 0;
}

function buildPhaseStepperViewModel(
  input: {
    run: NonNullable<ReturnType<typeof useReadyRunDetail>["state"]["run"]>;
    workflow: NonNullable<ReturnType<typeof useReadyRunDetail>["state"]["workflow"]>;
  }
): RunPhaseStepViewModel[] {
  const executionAvailable = hasCompiledWorkflowData({
    compiledFrom: input.run.compiledFrom,
    workflow: input.workflow
  });

  return runPhaseDefinitions.map((phase) => ({
    href: buildRunPhasePath(input.run.runId, phase.id),
    isAvailable: phase.id === "execution" ? executionAvailable : true,
    label: phase.label,
    phaseId: phase.id
  }));
}

function buildPhaseBaseViewModel(
  phaseId: RunPlanningPhaseId,
  planningState: RunPlanningDocumentState
) {
  const phase = getRunPhaseDefinition(phaseId);

  return {
    conversationLocator: planningState.document?.conversation ?? null,
    documentPath: planningState.document?.path ?? canonicalDocumentPathByPhase[phaseId],
    panelTitle:
      planningState.status === "ready"
        ? planningState.revision.title
        : `${phase.label} document`,
    phaseSummary: phase.summary,
    phaseTitle: `${phase.label} conversation`
  };
}

function buildPlanningDocumentSourceKey(
  input: {
    documentId: string | null;
    reason: "missing_document" | "missing_revision" | null;
    revisionId: string | null;
    status: RunPlanningDocumentState["status"];
  }
) {
  return [
    input.status,
    input.documentId ?? "missing-document",
    input.revisionId ?? "missing-revision",
    input.reason ?? "none"
  ].join(":");
}

function getPlanningDocumentSourceKey(planningState: RunPlanningDocumentState) {
  return buildPlanningDocumentSourceKey({
    documentId: planningState.document?.documentId ?? null,
    reason: planningState.status === "empty" ? planningState.reason : null,
    revisionId: planningState.revision?.documentRevisionId ?? null,
    status: planningState.status
  });
}

function buildPlanningDraftSource(
  phaseId: RunPlanningPhaseId,
  planningState: RunPlanningDocumentState
) {
  if (planningState.status === "ready") {
    return {
      body: planningState.content,
      title: planningState.revision.title
    };
  }

  return {
    body: "",
    title: defaultRevisionTitleByPhase[phaseId]
  };
}

function getCompileBlockingMessage(input: {
  hasCompileProvenance: boolean;
  missingPhaseLabels: string[];
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

  if (input.hasCompileProvenance) {
    return "Compile was accepted for this run. Keystone is waiting for the live execution graph to become available.";
  }

  if (input.runStatus === "active") {
    return "This run is already executing. Open Execution to inspect the live workflow.";
  }

  if (["archived", "failed", "cancelled"].includes(input.runStatus)) {
    return `Run status is ${formatStatusLabel(input.runStatus)}. This run cannot be compiled again.`;
  }

  return "Compile is unavailable until Keystone can confirm the latest planning state.";
}

function buildPlanningEmptyViewModel(
  phaseId: RunPlanningPhaseId,
  planningState: Extract<RunPlanningDocumentState, { status: "empty" }>,
  base: ReturnType<typeof buildPhaseBaseViewModel>,
  input: {
    actionErrorMessage: string | null;
    isCreating: boolean;
    startEditing: () => void;
  }
): RunPlanningPhaseEmptyViewModel {
  const phase = getRunPhaseDefinition(phaseId);
  const label = phase.label.toLowerCase();

  if (planningState.reason === "missing_document") {
    return {
      actionErrorMessage: input.actionErrorMessage,
      actionLabel: input.isCreating ? "Creating document..." : `Create ${label} document`,
      conversationLocator: base.conversationLocator,
      documentPath: base.documentPath,
      emptyMessage: `This run does not have a ${label} document yet. Create it to start writing the current ${label}.`,
      emptyTitle: `No ${label} document yet`,
      isCreating: input.isCreating,
      phaseSummary: base.phaseSummary,
      phaseTitle: base.phaseTitle,
      panelTitle: base.panelTitle,
      startEditing: input.startEditing,
      state: "empty"
    };
  }

  return {
    actionErrorMessage: input.actionErrorMessage,
    actionLabel: "Write first revision",
    conversationLocator: base.conversationLocator,
    documentPath: base.documentPath,
    emptyMessage: `This ${label} document exists, but it does not have a current revision yet. Write the first revision to make it the current document surface.`,
    emptyTitle: `No current ${label} revision`,
    isCreating: input.isCreating,
    phaseSummary: base.phaseSummary,
    phaseTitle: base.phaseTitle,
    panelTitle: base.panelTitle,
    startEditing: input.startEditing,
    state: "empty"
  };
}

export function useRunHeaderViewModel() {
  const { state } = useReadyRunDetail();

  return buildHeaderViewModel(state.run!);
}

export function useRunPhaseStepperViewModel() {
  const { state } = useReadyRunDetail();

  return {
    steps: buildPhaseStepperViewModel({
      run: state.run!,
      workflow: state.workflow!
    })
  };
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
    phaseSteps: buildPhaseStepperViewModel({
      run: state.run,
      workflow: state.workflow!
    }),
    state: "ready"
  };
}

export function useRunDefaultPhasePath() {
  const { state } = useReadyRunDetail();
  const run = state.run!;

  if (
    hasCompiledWorkflowData({
      compiledFrom: run.compiledFrom,
      workflow: state.workflow!
    })
  ) {
    return buildRunPhasePath(run.runId, "execution");
  }

  const firstIncompletePhase =
    runPlanningPhaseOrder.find(
      (phaseId) => !state.planningDocuments[phaseId].document?.currentRevisionId
    ) ?? "execution-plan";

  return buildRunPhasePath(run.runId, firstIncompletePhase);
}

export function useRunPlanningPhaseViewModel(phaseId: RunPlanningPhaseId): RunPlanningPhaseViewModel {
  const { actions, state } = useReadyRunDetail();
  const planningState = state.planningDocuments[phaseId];
  const base = buildPhaseBaseViewModel(phaseId, planningState);
  const phase = getRunPhaseDefinition(phaseId);
  const sourceDraft = buildPlanningDraftSource(phaseId, planningState);
  const sourceKey = getPlanningDocumentSourceKey(planningState);
  const [title, setTitle] = useState(sourceDraft.title);
  const [body, setBody] = useState(sourceDraft.body);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const pendingEditorSourceKeyRef = useRef<string | null>(null);
  const createInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    const shouldEnterEditor = pendingEditorSourceKeyRef.current === sourceKey;

    createInFlightRef.current = false;
    pendingEditorSourceKeyRef.current = null;
    saveInFlightRef.current = false;
    setBody(sourceDraft.body);
    setIsCreating(false);
    setIsEditing(shouldEnterEditor);
    setIsSubmitting(false);
    setSubmitErrorMessage(null);
    setTitle(sourceDraft.title);
  }, [sourceDraft.body, sourceDraft.title, sourceKey]);

  async function startEditing() {
    setSubmitErrorMessage(null);

    if (planningState.status === "empty" && planningState.reason === "missing_document") {
      if (createInFlightRef.current) {
        return;
      }

      createInFlightRef.current = true;
      setIsCreating(true);

      try {
        const document = await actions.createPlanningDocument(phaseId);

        pendingEditorSourceKeyRef.current = buildPlanningDocumentSourceKey({
          documentId: document.documentId,
          reason: "missing_revision",
          revisionId: null,
          status: "empty"
        });
      } catch (error) {
        setIsCreating(false);
        setSubmitErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : `Unable to create ${phase.label.toLowerCase()} document.`
        );
      } finally {
        createInFlightRef.current = false;
      }

      return;
    }

    setIsEditing(true);
  }

  function discardChanges() {
    setBody(sourceDraft.body);
    setIsEditing(false);
    setIsSubmitting(false);
    setSubmitErrorMessage(null);
    setTitle(sourceDraft.title);
  }

  const hasUnsavedChanges = body !== sourceDraft.body || title !== sourceDraft.title;
  const canSave =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    hasUnsavedChanges &&
    !isSubmitting;

  async function saveChanges() {
    const trimmedTitle = title.trim();
    const hasBody = body.trim().length > 0;
    const canSaveNow = trimmedTitle.length > 0 && hasBody && hasUnsavedChanges;

    if (!canSaveNow || saveInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmitErrorMessage(null);

    try {
      await actions.savePlanningDocument(phaseId, {
        body,
        title: trimmedTitle
      });
    } catch (error) {
      setIsSubmitting(false);
      setSubmitErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : `Unable to save ${phase.label.toLowerCase()}.`
      );
    } finally {
      saveInFlightRef.current = false;
    }
  }

  if (isEditing) {
    return {
      bodyField: {
        label: "Document body",
        onChange: setBody,
        value: body
      },
      canSave,
      conversationLocator: base.conversationLocator,
      discardChanges,
      documentPath: base.documentPath,
      hasUnsavedChanges,
      helperMessage:
        planningState.status === "ready"
          ? "Saving creates a new current revision for this run document."
          : "Saving creates the first current revision for this run document.",
      isSubmitting,
      panelTitle: title.trim() || base.panelTitle,
      phaseSummary: base.phaseSummary,
      phaseTitle: base.phaseTitle,
      saveChanges,
      saveLabel: isSubmitting ? "Saving changes..." : "Save changes",
      state: "editing",
      submitErrorMessage,
      titleField: {
        label: "Document title",
        onChange: setTitle,
        value: title
      }
    };
  }

  if (planningState.status === "ready") {
    return {
      conversationLocator: base.conversationLocator,
      documentLines: planningState.content.split(/\r?\n/),
      editDocument: startEditing,
      documentPath: base.documentPath,
      panelTitle: planningState.revision.title,
      phaseSummary: base.phaseSummary,
      phaseTitle: base.phaseTitle,
      state: "ready"
    };
  }

  if (planningState.status === "error") {
    const phase = getRunPhaseDefinition(phaseId);

    return {
      conversationLocator: base.conversationLocator,
      documentPath: base.documentPath,
      errorMessage: planningState.errorMessage,
      errorTitle: `Unable to load ${phase.label.toLowerCase()}`,
      panelTitle: base.panelTitle,
      phaseSummary: base.phaseSummary,
      phaseTitle: base.phaseTitle,
      retry: () => {
        void actions.reload();
      },
      state: "error"
    };
  }

  return buildPlanningEmptyViewModel(phaseId, planningState, base, {
    actionErrorMessage: submitErrorMessage,
    isCreating,
    startEditing
  });
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
  const compileSourceKey = [
    run.runId,
    run.status,
    run.compiledFrom?.compiledAt ?? "not-compiled",
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

  const executionAvailable = hasCompiledWorkflowData({
    compiledFrom: run.compiledFrom,
    workflow
  });
  const compileAcceptedWithoutWorkflow = run.compiledFrom !== null && !executionAvailable;
  const missingPhaseLabels = runPlanningPhaseOrder.flatMap((phaseId) =>
    state.planningDocuments[phaseId].document?.currentRevisionId
      ? []
      : [getRunPhaseDefinition(phaseId).label]
  );

  async function compileRun() {
    if (compileInFlightRef.current) {
      return;
    }

    compileInFlightRef.current = true;
    setIsCompiling(true);
    setSubmitErrorMessage(null);

    try {
      const result = await actions.compileRun();

      if (!result.executionAvailable) {
        setIsCompiling(false);
        setSubmitErrorMessage(
          "Compile was accepted, but the execution graph is not ready yet. Refresh the run and try opening Execution again."
        );
        return;
      }

      navigate(executionPath);
    } catch (error) {
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

  if (executionAvailable) {
    compile = {
      actionHref: executionPath,
      actionLabel: "Open execution",
      helperMessage: "Execution is enabled for this run. Open the DAG to inspect live task state.",
      state: "compiled",
      title: "Execution ready"
    };
  } else if (
    planning.state === "editing" ||
    planning.state === "error" ||
    compileAcceptedWithoutWorkflow ||
    missingPhaseLabels.length > 0 ||
    run.status === "active" ||
    ["archived", "failed", "cancelled"].includes(run.status)
  ) {
    compile = {
      helperMessage: getCompileBlockingMessage({
        hasCompileProvenance: compileAcceptedWithoutWorkflow,
        missingPhaseLabels,
        planningState: planning.state,
        runStatus: run.status
      }),
      state: "blocked",
      title: "Compile unavailable"
    };
  } else {
    compile = {
      actionLabel: isCompiling ? "Compiling run..." : "Compile run",
      compileRun: () => {
        void compileRun();
      },
      helperMessage:
        "Compile persists the execution graph from the current specification, architecture, and execution plan.",
      isSubmitting: isCompiling,
      state: "ready",
      submitErrorMessage,
      title: "Compile run"
    };
  }

  return {
    compile,
    planning
  };
}
