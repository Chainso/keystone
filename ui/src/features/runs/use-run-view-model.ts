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
  phaseSummary: string;
  phaseTitle: string;
}

export interface RunPlanningPhaseReadyViewModel extends RunPlanningPhaseBaseViewModel {
  documentLines: string[];
  documentTitle: string;
  state: "ready";
}

export interface RunPlanningPhaseEmptyViewModel extends RunPlanningPhaseBaseViewModel {
  emptyMessage: string;
  emptyTitle: string;
  state: "empty";
}

export interface RunPlanningPhaseErrorViewModel extends RunPlanningPhaseBaseViewModel {
  errorMessage: string;
  errorTitle: string;
  retry: () => void;
  state: "error";
}

export type RunPlanningPhaseViewModel =
  | RunPlanningPhaseReadyViewModel
  | RunPlanningPhaseEmptyViewModel
  | RunPlanningPhaseErrorViewModel;

const canonicalDocumentPathByPhase: Record<RunPlanningPhaseId, string> = {
  specification: "specification",
  architecture: "architecture",
  "execution-plan": "execution-plan"
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

function buildPhaseStepperViewModel(
  run: NonNullable<ReturnType<typeof useReadyRunDetail>["state"]["run"]>
): RunPhaseStepViewModel[] {
  const executionAvailable = run.compiledFrom !== null;

  return runPhaseDefinitions.map((phase) => ({
    href: buildRunPhasePath(run.runId, phase.id),
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
    phaseSummary: phase.summary,
    phaseTitle: `${phase.label} conversation`
  };
}

function buildPlanningEmptyViewModel(
  phaseId: RunPlanningPhaseId,
  planningState: Extract<RunPlanningDocumentState, { status: "empty" }>,
  base: ReturnType<typeof buildPhaseBaseViewModel>
): RunPlanningPhaseEmptyViewModel {
  const phase = getRunPhaseDefinition(phaseId);
  const label = phase.label.toLowerCase();

  if (planningState.reason === "missing_document") {
    return {
      conversationLocator: base.conversationLocator,
      documentPath: base.documentPath,
      emptyMessage: `This run does not have a ${label} document yet. Editing is not available on the live run path yet.`,
      emptyTitle: `No ${label} document yet`,
      phaseSummary: base.phaseSummary,
      phaseTitle: base.phaseTitle,
      state: "empty"
    };
  }

  return {
    conversationLocator: base.conversationLocator,
    documentPath: base.documentPath,
    emptyMessage: `This ${label} document exists, but it does not have a current revision yet. Editing is not available on the live run path yet.`,
    emptyTitle: `No current ${label} revision`,
    phaseSummary: base.phaseSummary,
    phaseTitle: base.phaseTitle,
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
    steps: buildPhaseStepperViewModel(state.run!)
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
    phaseSteps: buildPhaseStepperViewModel(state.run),
    state: "ready"
  };
}

export function useRunDefaultPhasePath() {
  const { state } = useReadyRunDetail();
  const run = state.run!;

  if (run.compiledFrom) {
    return buildRunPhasePath(run.runId, "execution");
  }

  if (state.planningDocuments["execution-plan"].document?.currentRevisionId) {
    return buildRunPhasePath(run.runId, "execution-plan");
  }

  if (state.planningDocuments.architecture.document?.currentRevisionId) {
    return buildRunPhasePath(run.runId, "architecture");
  }

  return buildRunPhasePath(run.runId, "specification");
}

export function useRunPlanningPhaseViewModel(phaseId: RunPlanningPhaseId): RunPlanningPhaseViewModel {
  const { actions, state } = useReadyRunDetail();
  const planningState = state.planningDocuments[phaseId];
  const base = buildPhaseBaseViewModel(phaseId, planningState);

  if (planningState.status === "ready") {
    return {
      conversationLocator: base.conversationLocator,
      documentLines: planningState.content.split(/\r?\n/),
      documentPath: base.documentPath,
      documentTitle: planningState.revision.title,
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
      phaseSummary: base.phaseSummary,
      phaseTitle: base.phaseTitle,
      retry: () => {
        void actions.reload();
      },
      state: "error"
    };
  }

  return buildPlanningEmptyViewModel(phaseId, planningState, base);
}
