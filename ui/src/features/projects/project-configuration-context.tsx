import { createContext, useContext } from "react";

import type {
  ProjectConfigurationMode,
  ProjectComponentSourceMode
} from "./project-configuration-scaffold";
import type {
  ProjectComponentField,
  ProjectComponentKind,
  ProjectConfigurationDraft,
  ProjectEnvVarField,
  ProjectOverviewField,
  ProjectRuleListKey
} from "./project-configuration-form";

export interface ProjectConfigurationModeMeta {
  componentEmptyState: string;
  id: ProjectConfigurationMode;
  primaryActionLabel: string;
  primaryPendingActionLabel: string;
  secondaryActionLabel: string;
  title: string;
}

export interface ProjectConfigurationState {
  draft: ProjectConfigurationDraft | null;
  fieldErrors: Record<string, string>;
  projectId: string | null;
}

export interface ProjectConfigurationActions {
  addComponent: (kind: ProjectComponentKind) => void;
  addComponentRuleInstruction: (
    componentId: string,
    ruleList: ProjectRuleListKey
  ) => void;
  addEnvVar: () => void;
  addProjectRuleInstruction: (ruleList: ProjectRuleListKey) => void;
  removeComponent: (componentId: string) => void;
  removeComponentRuleInstruction: (
    componentId: string,
    ruleList: ProjectRuleListKey,
    index: number
  ) => void;
  removeEnvVar: (entryId: string) => void;
  removeProjectRuleInstruction: (ruleList: ProjectRuleListKey, index: number) => void;
  retryLoad: () => void;
  runSecondaryAction: () => void;
  setComponentSourceMode: (
    componentId: string,
    sourceMode: ProjectComponentSourceMode
  ) => void;
  submit: () => Promise<boolean>;
  updateComponentField: (
    componentId: string,
    field: ProjectComponentField,
    value: string
  ) => void;
  updateComponentRuleInstruction: (
    componentId: string,
    ruleList: ProjectRuleListKey,
    index: number,
    value: string
  ) => void;
  updateEnvVar: (entryId: string, field: ProjectEnvVarField, value: string) => void;
  updateOverviewField: (field: ProjectOverviewField, value: string) => void;
  updateProjectRuleInstruction: (
    ruleList: ProjectRuleListKey,
    index: number,
    value: string
  ) => void;
}

export interface ProjectConfigurationMeta {
  hasUnsavedChanges: boolean;
  isSubmitting: boolean;
  loadError: string | null;
  mode: ProjectConfigurationModeMeta;
  status: "loading" | "ready" | "error";
  submitError: string | null;
}

export interface ProjectConfigurationValue {
  actions: ProjectConfigurationActions;
  meta: ProjectConfigurationMeta;
  state: ProjectConfigurationState;
}

export const ProjectConfigurationContext =
  createContext<ProjectConfigurationValue | null>(null);

export function buildProjectConfigurationModeMeta(
  mode: ProjectConfigurationMode,
  input?: {
    title?: string;
  }
): ProjectConfigurationModeMeta {
  if (mode === "new") {
    return {
      componentEmptyState: "Add repository components before creating the project.",
      id: mode,
      primaryActionLabel: "Create project",
      primaryPendingActionLabel: "Creating project...",
      secondaryActionLabel: "Cancel",
      title: input?.title ?? "New project"
    };
  }

  return {
    componentEmptyState: "No project components configured yet.",
    id: mode,
    primaryActionLabel: "Save changes",
    primaryPendingActionLabel: "Saving changes...",
    secondaryActionLabel: "Discard changes",
    title: input?.title ?? "Project settings"
  };
}

export function useProjectConfiguration() {
  const value = useContext(ProjectConfigurationContext);

  if (!value) {
    throw new Error(
      "useProjectConfiguration must be used within a project configuration provider."
    );
  }

  return value;
}
