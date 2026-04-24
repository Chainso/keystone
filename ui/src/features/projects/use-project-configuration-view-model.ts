import { useState } from "react";

import {
  buildProjectConfigurationPath,
  projectComponentTypeOptions,
  projectConfigurationTabs,
  type ProjectComponentKindId,
  type ProjectComponentSourceMode,
  type ProjectConfigurationMode
} from "./project-configuration-scaffold";
import {
  useProjectConfiguration,
  type ProjectConfigurationValue
} from "./project-configuration-context";

export interface ProjectConfigurationActionViewModel {
  disabled?: boolean | undefined;
  label: string;
  onPress?: (() => void) | undefined;
}

export interface ProjectConfigurationTextFieldViewModel {
  disabled?: boolean | undefined;
  errorMessage?: string | undefined;
  label: string;
  onChange?: ((value: string) => void) | undefined;
  readOnly?: boolean | undefined;
  value: string;
}

export interface ProjectConfigurationListFieldViewModel {
  addLabel?: string | undefined;
  emptyMessage?: string | undefined;
  errorMessage?: string | undefined;
  items: string[];
  label: string;
  onAdd?: (() => void) | undefined;
  onChange?: ((index: number, value: string) => void) | undefined;
  onRemove?: ((index: number) => void) | undefined;
  readOnly?: boolean | undefined;
  rowErrors?: Record<number, string> | undefined;
}

export interface EditableProjectComponentViewModel {
  componentId: string;
  componentKeyField: ProjectConfigurationTextFieldViewModel;
  defaultRefField: ProjectConfigurationTextFieldViewModel;
  displayNameField: ProjectConfigurationTextFieldViewModel;
  gitUrlField: ProjectConfigurationTextFieldViewModel;
  heading: string;
  kind: ProjectComponentKindId;
  localPathField: ProjectConfigurationTextFieldViewModel;
  onRemove: () => void;
  reviewInstructions: ProjectConfigurationListFieldViewModel;
  setSourceMode: (sourceMode: ProjectComponentSourceMode) => void;
  sourceMode: ProjectComponentSourceMode;
  testInstructions: ProjectConfigurationListFieldViewModel;
}

export interface ProjectConfigurationShellViewModel {
  shellState?: {
    actionLabel?: string | undefined;
    heading: string;
    message: string;
    onAction?: (() => void) | undefined;
  } | undefined;
  tabs: Array<{
    label: string;
    path: string;
    tabId: (typeof projectConfigurationTabs)[number]["tabId"];
  }>;
  title: string;
}

export interface ProjectOverviewViewModel {
  descriptionField: ProjectConfigurationTextFieldViewModel;
  footerActions: ProjectConfigurationActionViewModel[];
  heading: string;
  isSubmitting: boolean;
  keyField: ProjectConfigurationTextFieldViewModel;
  nameField: ProjectConfigurationTextFieldViewModel;
  submitError: string | null;
}

export interface ProjectConfigurationComponentsViewModel {
  components: EditableProjectComponentViewModel[];
  emptyError?: string | undefined;
  emptyState: string;
  footerActions: ProjectConfigurationActionViewModel[];
  heading: string;
  isSubmitting: boolean;
  pickComponentType: (kindId: (typeof projectComponentTypeOptions)[number]["kindId"]) => void;
  submitError: string | null;
  toggleTypePicker: () => void;
  typeOptions: typeof projectComponentTypeOptions;
  typePickerOpen: boolean;
  typePickerTitle: string;
}

export interface ProjectRulesViewModel {
  footerActions: ProjectConfigurationActionViewModel[];
  heading: string;
  isSubmitting: boolean;
  reviewInstructions: ProjectConfigurationListFieldViewModel;
  submitError: string | null;
  testInstructions: ProjectConfigurationListFieldViewModel;
}

export interface ProjectConfigurationEnvironmentViewModel {
  addEnvVar: () => void;
  emptyMessage: string;
  envVars: Array<{
    entryId: string;
    nameField: ProjectConfigurationTextFieldViewModel;
    onRemove: () => void;
    valueField: ProjectConfigurationTextFieldViewModel;
  }>;
  footerActions: ProjectConfigurationActionViewModel[];
  heading: string;
  isSubmitting: boolean;
  submitError: string | null;
}

interface ReadyProjectConfigurationValue extends ProjectConfigurationValue {
  state: ProjectConfigurationValue["state"] & {
    draft: NonNullable<ProjectConfigurationValue["state"]["draft"]>;
  };
}

function buildProjectConfigurationTabs(mode: ProjectConfigurationMode) {
  return projectConfigurationTabs.map((tab) => ({
    tabId: tab.tabId,
    label: tab.label,
    path: buildProjectConfigurationPath(mode, tab.tabId)
  }));
}

function getReadyProjectConfiguration(
  configuration: ProjectConfigurationValue
): ReadyProjectConfigurationValue | null {
  if (configuration.meta.status !== "ready" || !configuration.state.draft) {
    return null;
  }

  return configuration as ReadyProjectConfigurationValue;
}

function getListItemErrors(
  fieldErrors: Record<string, string>,
  prefix: string
): Record<number, string> {
  return Object.entries(fieldErrors).reduce<Record<number, string>>((errors, [key, message]) => {
    if (!key.startsWith(`${prefix}.`)) {
      return errors;
    }

    const index = Number(key.slice(prefix.length + 1));

    if (Number.isNaN(index) || errors[index]) {
      return errors;
    }

    errors[index] = message;

    return errors;
  }, {});
}

function useProjectConfigurationFooterActions(): ProjectConfigurationActionViewModel[] {
  const { actions, meta } = useProjectConfiguration();
  const requiresReadyDraft = meta.mode.id === "settings";
  const disabled =
    meta.isSubmitting || (requiresReadyDraft && (meta.status !== "ready" || !meta.hasUnsavedChanges));

  return [
    {
      disabled,
      label: meta.mode.secondaryActionLabel,
      onPress: actions.runSecondaryAction
    },
    {
      disabled,
      label: meta.isSubmitting
        ? meta.mode.primaryPendingActionLabel
        : meta.mode.primaryActionLabel,
      onPress() {
        void actions.submit();
      }
    }
  ];
}

function buildProjectComponentViewModels(
  configuration: ReadyProjectConfigurationValue
): EditableProjectComponentViewModel[] {
  const { actions, state } = configuration;

  return state.draft.components.map((component, index) => ({
    componentId: component.componentId,
    componentKeyField: {
      errorMessage: state.fieldErrors[`components.${index}.componentKey`],
      label: "Key",
      onChange(value) {
        actions.updateComponentField(component.componentId, "componentKey", value);
      },
      value: component.componentKey
    },
    defaultRefField: {
      errorMessage: state.fieldErrors[`components.${index}.defaultRef`],
      label: "Default ref",
      onChange(value) {
        actions.updateComponentField(component.componentId, "defaultRef", value);
      },
      value: component.defaultRef
    },
    displayNameField: {
      errorMessage: state.fieldErrors[`components.${index}.displayName`],
      label: "Name",
      onChange(value) {
        actions.updateComponentField(component.componentId, "displayName", value);
      },
      value: component.displayName
    },
    gitUrlField: {
      disabled: component.sourceMode !== "gitUrl",
      errorMessage: state.fieldErrors[`components.${index}.gitUrl`],
      label: "Git URL",
      onChange(value) {
        actions.updateComponentField(component.componentId, "gitUrl", value);
      },
      value: component.gitUrl
    },
    heading: `Component ${index + 1}`,
    kind: component.kind,
    localPathField: {
      disabled: component.sourceMode !== "localPath",
      errorMessage: state.fieldErrors[`components.${index}.localPath`],
      label: "Local path",
      onChange(value) {
        actions.updateComponentField(component.componentId, "localPath", value);
      },
      value: component.localPath
    },
    onRemove() {
      actions.removeComponent(component.componentId);
    },
    reviewInstructions: {
      addLabel: "Add review instruction",
      items: component.reviewInstructions,
      label: "Review",
      onAdd() {
        actions.addComponentRuleInstruction(component.componentId, "reviewInstructions");
      },
      onChange(itemIndex, value) {
        actions.updateComponentRuleInstruction(
          component.componentId,
          "reviewInstructions",
          itemIndex,
          value
        );
      },
      onRemove(itemIndex) {
        actions.removeComponentRuleInstruction(
          component.componentId,
          "reviewInstructions",
          itemIndex
        );
      },
      rowErrors: getListItemErrors(
        state.fieldErrors,
        `components.${index}.reviewInstructions`
      )
    },
    setSourceMode(sourceMode) {
      actions.setComponentSourceMode(component.componentId, sourceMode);
    },
    sourceMode: component.sourceMode,
    testInstructions: {
      addLabel: "Add test instruction",
      items: component.testInstructions,
      label: "Test",
      onAdd() {
        actions.addComponentRuleInstruction(component.componentId, "testInstructions");
      },
      onChange(itemIndex, value) {
        actions.updateComponentRuleInstruction(
          component.componentId,
          "testInstructions",
          itemIndex,
          value
        );
      },
      onRemove(itemIndex) {
        actions.removeComponentRuleInstruction(
          component.componentId,
          "testInstructions",
          itemIndex
        );
      },
      rowErrors: getListItemErrors(state.fieldErrors, `components.${index}.testInstructions`)
    }
  }));
}

export function useProjectConfigurationShellViewModel(): ProjectConfigurationShellViewModel {
  const { actions, meta } = useProjectConfiguration();

  return {
    title: meta.mode.title,
    tabs: meta.status === "ready" ? buildProjectConfigurationTabs(meta.mode.id) : [],
    ...(meta.status === "loading"
        ? {
          shellState: {
            heading: "Loading project settings",
            message: "Keystone is loading project settings."
          }
        }
      : meta.status === "error"
        ? {
            shellState: {
              actionLabel: "Retry",
              heading: "Unable to load project settings",
              message: meta.loadError ?? "Keystone could not load project settings.",
              onAction: actions.retryLoad
            }
          }
        : {})
  };
}

export function useProjectConfigurationOverviewViewModel(): ProjectOverviewViewModel {
  const configuration = useProjectConfiguration();
  const footerActions = useProjectConfigurationFooterActions();
  const readyConfiguration = getReadyProjectConfiguration(configuration);

  if (!readyConfiguration) {
    return {
      descriptionField: {
        label: "Description",
        value: ""
      },
      footerActions,
      heading: "Overview",
      isSubmitting: configuration.meta.isSubmitting,
      keyField: {
        label: "Project key",
        value: ""
      },
      nameField: {
        label: "Project name",
        value: ""
      },
      submitError: configuration.meta.submitError
    };
  }

  const { actions, meta, state } = readyConfiguration;

  return {
    descriptionField: {
      errorMessage: state.fieldErrors["overview.description"],
      label: "Description",
      onChange(value) {
        actions.updateOverviewField("description", value);
      },
      value: state.draft.overview.description
    },
    footerActions,
    heading: "Overview",
    isSubmitting: meta.isSubmitting,
    keyField: {
      errorMessage: state.fieldErrors["overview.projectKey"],
      label: "Project key",
      onChange(value) {
        actions.updateOverviewField("projectKey", value);
      },
      value: state.draft.overview.projectKey
    },
    nameField: {
      errorMessage: state.fieldErrors["overview.displayName"],
      label: "Project name",
      onChange(value) {
        actions.updateOverviewField("displayName", value);
      },
      value: state.draft.overview.displayName
    },
    submitError: meta.submitError
  };
}

export function useProjectConfigurationComponentsViewModel(): ProjectConfigurationComponentsViewModel {
  const configuration = useProjectConfiguration();
  const footerActions = useProjectConfigurationFooterActions();
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const readyConfiguration = getReadyProjectConfiguration(configuration);

  if (!readyConfiguration) {
    return {
      components: [],
      emptyState:
        configuration.meta.mode.id === "settings"
          ? "Keystone is loading project components."
          : configuration.meta.mode.componentEmptyState,
      footerActions,
      heading: "Components",
      isSubmitting: configuration.meta.isSubmitting,
      pickComponentType() {},
      submitError: configuration.meta.submitError,
      toggleTypePicker() {},
      typeOptions: projectComponentTypeOptions,
      typePickerOpen: false,
      typePickerTitle: "Add component menu"
    };
  }

  const { actions, meta, state } = readyConfiguration;

  return {
    components: buildProjectComponentViewModels(readyConfiguration),
    emptyError: state.fieldErrors.components,
    emptyState: meta.mode.componentEmptyState,
    footerActions,
    heading: "Components",
    isSubmitting: meta.isSubmitting,
    pickComponentType(kindId) {
      actions.addComponent(kindId);
      setTypePickerOpen(false);
    },
    submitError: meta.submitError,
    toggleTypePicker() {
      setTypePickerOpen((currentValue) => !currentValue);
    },
    typeOptions: projectComponentTypeOptions,
    typePickerOpen,
    typePickerTitle: "Add component menu"
  };
}

export function useProjectConfigurationRulesViewModel(): ProjectRulesViewModel {
  const configuration = useProjectConfiguration();
  const footerActions = useProjectConfigurationFooterActions();
  const readyConfiguration = getReadyProjectConfiguration(configuration);

  if (!readyConfiguration) {
    return {
      footerActions,
      heading: "Rules",
      isSubmitting: configuration.meta.isSubmitting,
      reviewInstructions: {
        items: [],
        label: "Project review instructions"
      },
      submitError: configuration.meta.submitError,
      testInstructions: {
        items: [],
        label: "Project test instructions"
      }
    };
  }

  const { actions, meta, state } = readyConfiguration;

  return {
    footerActions,
    heading: "Rules",
    isSubmitting: meta.isSubmitting,
    reviewInstructions: {
      addLabel: "Add review instruction",
      items: state.draft.ruleSet.reviewInstructions,
      label: "Project review instructions",
      onAdd() {
        actions.addProjectRuleInstruction("reviewInstructions");
      },
      onChange(index, value) {
        actions.updateProjectRuleInstruction("reviewInstructions", index, value);
      },
      onRemove(index) {
        actions.removeProjectRuleInstruction("reviewInstructions", index);
      },
      rowErrors: getListItemErrors(state.fieldErrors, "rules.reviewInstructions")
    },
    submitError: meta.submitError,
    testInstructions: {
      addLabel: "Add test instruction",
      items: state.draft.ruleSet.testInstructions,
      label: "Project test instructions",
      onAdd() {
        actions.addProjectRuleInstruction("testInstructions");
      },
      onChange(index, value) {
        actions.updateProjectRuleInstruction("testInstructions", index, value);
      },
      onRemove(index) {
        actions.removeProjectRuleInstruction("testInstructions", index);
      },
      rowErrors: getListItemErrors(state.fieldErrors, "rules.testInstructions")
    }
  };
}

export function useProjectConfigurationEnvironmentViewModel(): ProjectConfigurationEnvironmentViewModel {
  const configuration = useProjectConfiguration();
  const footerActions = useProjectConfigurationFooterActions();
  const readyConfiguration = getReadyProjectConfiguration(configuration);

  if (!readyConfiguration) {
    return {
      addEnvVar() {},
      emptyMessage: "No environment variables added yet.",
      envVars: [],
      footerActions,
      heading: "Environment",
      isSubmitting: configuration.meta.isSubmitting,
      submitError: configuration.meta.submitError
    };
  }

  const { actions, meta, state } = readyConfiguration;

  return {
    addEnvVar: actions.addEnvVar,
    emptyMessage: "No environment variables added yet.",
    envVars: state.draft.envVars.map((envVar, index) => ({
      entryId: envVar.entryId,
      nameField: {
        errorMessage: state.fieldErrors[`environment.${index}.name`],
        label: "Name",
        onChange(value) {
          actions.updateEnvVar(envVar.entryId, "name", value);
        },
        value: envVar.name
      },
      onRemove() {
        actions.removeEnvVar(envVar.entryId);
      },
      valueField: {
        errorMessage: state.fieldErrors[`environment.${index}.value`],
        label: "Value",
        onChange(value) {
          actions.updateEnvVar(envVar.entryId, "value", value);
        },
        value: envVar.value
      }
    })),
    footerActions,
    heading: "Environment",
    isSubmitting: meta.isSubmitting,
    submitError: meta.submitError
  };
}

export function useNewProjectConfigurationShellViewModel() {
  return useProjectConfigurationShellViewModel();
}

export function useProjectSettingsConfigurationShellViewModel() {
  return useProjectConfigurationShellViewModel();
}

export function useNewProjectOverviewViewModel() {
  return useProjectConfigurationOverviewViewModel();
}

export function useProjectSettingsOverviewViewModel() {
  return useProjectConfigurationOverviewViewModel();
}

export function useNewProjectComponentsViewModel() {
  return useProjectConfigurationComponentsViewModel();
}

export function useProjectSettingsComponentsViewModel() {
  return useProjectConfigurationComponentsViewModel();
}

export function useNewProjectRulesViewModel() {
  return useProjectConfigurationRulesViewModel();
}

export function useProjectSettingsRulesViewModel() {
  return useProjectConfigurationRulesViewModel();
}

export function useNewProjectEnvironmentViewModel() {
  return useProjectConfigurationEnvironmentViewModel();
}

export function useProjectSettingsEnvironmentViewModel() {
  return useProjectConfigurationEnvironmentViewModel();
}
