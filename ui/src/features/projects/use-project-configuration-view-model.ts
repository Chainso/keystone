import { useState } from "react";

import {
  projectComponentTypeOptions,
  projectConfigurationTabs,
  buildProjectConfigurationPath,
  type ProjectComponentKindId,
  type ProjectComponentTypeOption,
  type ProjectConfigurationMode,
  type ProjectComponentSourceMode
} from "./project-configuration-scaffold";
import { useCurrentProject } from "./project-context";
import { useNewProjectConfiguration } from "./new-project-context";
import { useProjectSettingsConfiguration } from "./project-settings-context";

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

interface ProjectConfigurationShellViewModel {
  shellState?: {
    actionLabel?: string | undefined;
    heading: string;
    message: string;
    onAction?: (() => void) | undefined;
  } | undefined;
  title: string;
  tabs: Array<{
    label: string;
    path: string;
    tabId: (typeof projectConfigurationTabs)[number]["tabId"];
  }>;
}

interface ProjectOverviewViewModel {
  descriptionField: ProjectConfigurationTextFieldViewModel;
  footerActions: ProjectConfigurationActionViewModel[];
  heading: string;
  isSubmitting?: boolean | undefined;
  keyField: ProjectConfigurationTextFieldViewModel;
  nameField: ProjectConfigurationTextFieldViewModel;
  submitError: string | null;
}

interface NewProjectComponentsViewModel {
  components: EditableProjectComponentViewModel[];
  emptyError?: string | undefined;
  emptyState: string;
  footerActions: ProjectConfigurationActionViewModel[];
  heading: string;
  pickComponentType: (kindId: ProjectComponentTypeOption["kindId"]) => void;
  submitError: string | null;
  toggleTypePicker: () => void;
  typeOptions: ProjectComponentTypeOption[];
  typePickerOpen: boolean;
  typePickerTitle: string;
}

interface ProjectSettingsComponentsViewModel {
  components: EditableProjectComponentViewModel[];
  emptyError?: string | undefined;
  emptyState: string;
  footerActions: ProjectConfigurationActionViewModel[];
  heading: string;
  isSubmitting: boolean;
  pickComponentType: (kindId: ProjectComponentTypeOption["kindId"]) => void;
  submitError: string | null;
  toggleTypePicker: () => void;
  typeOptions: ProjectComponentTypeOption[];
  typePickerOpen: boolean;
  typePickerTitle: string;
}

interface ProjectRulesViewModel {
  footerActions?: ProjectConfigurationActionViewModel[] | undefined;
  heading: string;
  isSubmitting?: boolean | undefined;
  reviewInstructions: ProjectConfigurationListFieldViewModel;
  submitError?: string | null | undefined;
  testInstructions: ProjectConfigurationListFieldViewModel;
}

interface NewProjectEnvironmentViewModel {
  emptyMessage: string;
  envVars: Array<{
    entryId: string;
    nameField: ProjectConfigurationTextFieldViewModel;
    onRemove: () => void;
    valueField: ProjectConfigurationTextFieldViewModel;
  }>;
  footerActions: ProjectConfigurationActionViewModel[];
  heading: string;
  submitError: string | null;
  addEnvVar: () => void;
}

interface ProjectSettingsEnvironmentViewModel {
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
  addEnvVar: () => void;
}

function buildProjectConfigurationTabs(mode: ProjectConfigurationMode) {
  return projectConfigurationTabs.map((tab) => ({
    tabId: tab.tabId,
    label: tab.label,
    path: buildProjectConfigurationPath(mode, tab.tabId)
  }));
}

function useNewProjectFooterActions(): ProjectConfigurationActionViewModel[] {
  const { actions, meta } = useNewProjectConfiguration();

  return [
    {
      disabled: meta.isSubmitting,
      label: "Cancel",
      onPress: actions.cancel
    },
    {
      disabled: meta.isSubmitting,
      label: meta.isSubmitting ? "Creating project..." : "Create project",
      onPress() {
        void actions.submit();
      }
    }
  ];
}

function useReadyProjectSettings() {
  const projectSettings = useProjectSettingsConfiguration();
  const draft = projectSettings.state.draft;

  if (projectSettings.meta.status !== "ready" || !draft) {
    return null;
  }

  return {
    ...projectSettings,
    meta: {
      ...projectSettings.meta,
      status: "ready" as const
    },
    state: {
      ...projectSettings.state,
      draft
    }
  };
}

function useProjectSettingsFooterActions(): ProjectConfigurationActionViewModel[] {
  const { actions, meta } = useProjectSettingsConfiguration();
  const disabled = meta.status !== "ready" || !meta.hasUnsavedChanges || meta.isSubmitting;

  return [
    {
      disabled,
      label: "Discard changes",
      onPress: actions.discardChanges
    },
    {
      disabled,
      label: meta.isSubmitting ? "Saving changes..." : "Save changes",
      onPress() {
        void actions.submit();
      }
    }
  ];
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

function useProjectSettingsComponentsModel(): ProjectSettingsComponentsViewModel {
  const footerActions = useProjectSettingsFooterActions();
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const projectSettings = useReadyProjectSettings();

  if (!projectSettings) {
    return {
      components: [],
      emptyState: "Keystone is loading the selected project's components.",
      footerActions,
      heading: "Components",
      isSubmitting: false,
      pickComponentType() {},
      submitError: null,
      toggleTypePicker() {},
      typeOptions: projectComponentTypeOptions,
      typePickerOpen: false,
      typePickerTitle: "Add component menu"
    };
  }

  const { actions, meta, state } = projectSettings;
  const components = state.draft.components;

  return {
    components: components.map((component, index) => ({
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
    })),
    emptyError: state.fieldErrors.components,
    emptyState: "No project components configured yet.",
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

function useProjectSettingsOverviewModel(): ProjectOverviewViewModel {
  const footerActions = useProjectSettingsFooterActions();
  const projectSettings = useReadyProjectSettings();

  if (!projectSettings) {
    return {
      descriptionField: {
        label: "Description",
        value: ""
      },
      footerActions,
      heading: "Overview",
      isSubmitting: false,
      keyField: {
        label: "Project key",
        value: ""
      },
      nameField: {
        label: "Project name",
        value: ""
      },
      submitError: null
    };
  }

  const { actions, meta, state } = projectSettings;

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

function useProjectSettingsRulesModel(): ProjectRulesViewModel {
  const footerActions = useProjectSettingsFooterActions();
  const projectSettings = useReadyProjectSettings();

  if (!projectSettings) {
    return {
      footerActions,
      heading: "Rules",
      isSubmitting: false,
      reviewInstructions: {
        items: [],
        label: "Project review instructions"
      },
      submitError: null,
      testInstructions: {
        items: [],
        label: "Project test instructions"
      }
    };
  }

  const { actions, meta, state } = projectSettings;

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

function useProjectSettingsEnvironmentModel(): ProjectSettingsEnvironmentViewModel {
  const footerActions = useProjectSettingsFooterActions();
  const projectSettings = useReadyProjectSettings();

  if (!projectSettings) {
    return {
      addEnvVar() {},
      emptyMessage: "No environment variables added yet.",
      envVars: [],
      footerActions,
      heading: "Environment",
      isSubmitting: false,
      submitError: null
    };
  }

  const { actions, meta, state } = projectSettings;

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

export function useNewProjectConfigurationShellViewModel(): ProjectConfigurationShellViewModel {
  return {
    title: "New project",
    tabs: buildProjectConfigurationTabs("new")
  };
}

export function useProjectSettingsConfigurationShellViewModel(): ProjectConfigurationShellViewModel {
  const { actions, meta } = useProjectSettingsConfiguration();
  const project = useCurrentProject();

  return {
    title: `Project settings: ${project.displayName}`,
    tabs: meta.status === "ready" ? buildProjectConfigurationTabs("settings") : [],
    ...(meta.status === "loading"
      ? {
          shellState: {
            heading: "Loading project settings",
            message: "Keystone is loading the selected project's settings."
          }
        }
      : meta.status === "error"
        ? {
            shellState: {
              actionLabel: "Retry",
              heading: "Unable to load project settings",
              message: meta.loadError ?? "Keystone could not load the selected project's settings.",
              onAction: actions.retryLoad
            }
          }
        : {})
  };
}

export function useNewProjectOverviewViewModel(): ProjectOverviewViewModel {
  const { actions, meta, state } = useNewProjectConfiguration();

  return {
    descriptionField: {
      errorMessage: state.fieldErrors["overview.description"],
      label: "Description",
      onChange(value) {
        actions.updateOverviewField("description", value);
      },
      value: state.draft.overview.description
    },
    footerActions: useNewProjectFooterActions(),
    heading: "Overview",
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

export function useProjectSettingsOverviewViewModel() {
  return useProjectSettingsOverviewModel();
}

export function useNewProjectComponentsViewModel(): NewProjectComponentsViewModel {
  const { actions, meta, state } = useNewProjectConfiguration();
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  return {
    components: state.draft.components.map((component, index) => ({
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
    })),
    emptyError: state.fieldErrors.components,
    emptyState: "Add repository components before creating the project.",
    footerActions: useNewProjectFooterActions(),
    heading: "Components",
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

export function useProjectSettingsComponentsViewModel() {
  return useProjectSettingsComponentsModel();
}

export function useNewProjectRulesViewModel(): ProjectRulesViewModel {
  const { actions, meta, state } = useNewProjectConfiguration();

  return {
    footerActions: useNewProjectFooterActions(),
    heading: "Rules",
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

export function useProjectSettingsRulesViewModel() {
  return useProjectSettingsRulesModel();
}

export function useNewProjectEnvironmentViewModel(): NewProjectEnvironmentViewModel {
  const { actions, meta, state } = useNewProjectConfiguration();

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
    footerActions: useNewProjectFooterActions(),
    heading: "Environment",
    submitError: meta.submitError
  };
}

export function useProjectSettingsEnvironmentViewModel() {
  return useProjectSettingsEnvironmentModel();
}
