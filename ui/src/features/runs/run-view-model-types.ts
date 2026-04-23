import type { StatusTone } from "../../shared/layout/status-pill";
import type { RunPhaseId } from "../../shared/navigation/run-phases";
import type { ConversationLocator } from "./run-types";

export interface RunHeaderViewModel {
  displayId: string;
  statusLabel: string;
  statusTone: StatusTone;
  summary: string;
  updatedLabel: string;
}

export interface RunPhaseStepViewModel {
  href: string;
  isAvailable: boolean;
  label: string;
  phaseId: RunPhaseId;
  summary: string;
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
  documentMarkdown: string;
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
  canSave: boolean;
  discardChanges: () => void;
  documentEditor: {
    disabled: boolean;
    editorLabel: string;
    markdown: string;
    markdownSourceKey: string;
    onChange: (markdown: string) => void;
    placeholder: string;
  };
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
  secondaryActionHref?: string | undefined;
  secondaryActionLabel?: string | undefined;
  state: "ready";
  submitErrorMessage: string | null;
  title: string;
}

export interface ExecutionPlanCompileBlockedViewModel {
  actionHref?: string | undefined;
  actionLabel?: string | undefined;
  helperMessage: string;
  refresh?: (() => void) | undefined;
  refreshLabel?: string | undefined;
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
