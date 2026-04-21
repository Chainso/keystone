import { useEffect, useState } from "react";

import {
  getNewProjectConfiguration,
  getProjectConfiguration
} from "../resource-model/selectors";
import { useResourceModel } from "../resource-model/context";
import {
  projectComponentTypeOptions,
  projectConfigurationTabs,
  buildProjectConfigurationPath,
  buildProjectConfigurationComponentDraft,
  type ProjectComponentScaffold,
  type ProjectComponentKindId,
  type ProjectComponentTypeOption,
  type ProjectConfigurationMode,
  type ProjectComponentSourceMode
} from "./project-configuration-scaffold";
import { useCurrentProject } from "./project-context";
import { useNewProjectConfiguration } from "./new-project-context";

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
  compatibilityState?: {
    heading: string;
    message: string;
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
  components: ProjectComponentScaffold[];
  emptyState: string;
  footerActions: ProjectConfigurationActionViewModel[];
  heading: string;
  pickComponentType: (kindId: ProjectComponentTypeOption["kindId"]) => void;
  toggleTypePicker: () => void;
  typeOptions: ProjectComponentTypeOption[];
  typePickerOpen: boolean;
  typePickerTitle: string;
}

interface ProjectRulesViewModel {
  footerActions?: ProjectConfigurationActionViewModel[] | undefined;
  heading: string;
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
  envVars: Array<{
    name: string;
    value: string;
  }>;
  heading: string;
}

function buildProjectConfigurationTabs(mode: ProjectConfigurationMode) {
  return projectConfigurationTabs.map((tab) => ({
    tabId: tab.tabId,
    label: tab.label,
    path: buildProjectConfigurationPath(mode, tab.tabId)
  }));
}

function useProjectConfigurationSeed(mode: ProjectConfigurationMode) {
  const { state } = useResourceModel();
  const project = useCurrentProject();

  if (mode === "new") {
    const configuration = getNewProjectConfiguration(state.dataset);

    if (!configuration) {
      throw new Error("New project configuration scaffold is missing.");
    }

    return {
      configuration,
      selectionKey: configuration.configurationId
    };
  }

  const configuration = getProjectConfiguration(project.projectId, state.dataset);

  if (!configuration) {
    throw new Error(`Project configuration scaffold is missing for "${project.projectId}".`);
  }

  return {
    configuration,
    selectionKey: `${project.projectId}:${configuration.configurationId}`
  };
}

function buildSettingsFooterActions() {
  return [
    {
      disabled: true,
      label: "Discard"
    },
    {
      disabled: true,
      label: "Save"
    }
  ];
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
  const { configuration, selectionKey } = useProjectConfigurationSeed("settings");
  const serializedComponents = JSON.stringify(configuration.components);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [components, setComponents] = useState(configuration.components);

  useEffect(() => {
    setComponents(JSON.parse(serializedComponents) as ProjectComponentScaffold[]);
    setTypePickerOpen(false);
  }, [selectionKey, serializedComponents]);

  return {
    components,
    emptyState: "No project components configured yet.",
    footerActions: buildSettingsFooterActions(),
    heading: "Components",
    pickComponentType(kindId) {
      setComponents((currentComponents) => [
        ...currentComponents,
        buildProjectConfigurationComponentDraft("settings", currentComponents.length, kindId)
      ]);
      setTypePickerOpen(false);
    },
    toggleTypePicker() {
      setTypePickerOpen((currentValue) => !currentValue);
    },
    typeOptions: projectComponentTypeOptions,
    typePickerOpen,
    typePickerTitle: "Add component menu"
  };
}

function useProjectSettingsOverviewModel(): ProjectOverviewViewModel {
  const { configuration } = useProjectConfigurationSeed("settings");

  return {
    descriptionField: {
      label: "Description",
      readOnly: true,
      value: configuration.overview.description
    },
    footerActions: buildSettingsFooterActions(),
    heading: "Overview",
    keyField: {
      label: "Project key",
      readOnly: true,
      value: configuration.overview.projectKey
    },
    nameField: {
      label: "Project name",
      readOnly: true,
      value: configuration.overview.displayName
    },
    submitError: null
  };
}

function useProjectSettingsRulesModel(): ProjectRulesViewModel {
  const { configuration } = useProjectConfigurationSeed("settings");

  return {
    heading: "Rules",
    reviewInstructions: {
      items: configuration.rules.reviewInstructions,
      label: "Project review instructions",
      readOnly: true
    },
    testInstructions: {
      items: configuration.rules.testInstructions,
      label: "Project test instructions",
      readOnly: true
    }
  };
}

function useProjectSettingsEnvironmentModel(): ProjectSettingsEnvironmentViewModel {
  const { configuration } = useProjectConfigurationSeed("settings");

  return {
    envVars: configuration.environmentVariables,
    heading: "Environment"
  };
}

export function useNewProjectConfigurationShellViewModel(): ProjectConfigurationShellViewModel {
  return {
    title: "New project",
    tabs: buildProjectConfigurationTabs("new")
  };
}

export function useProjectSettingsConfigurationShellViewModel(): ProjectConfigurationShellViewModel {
  const { state } = useResourceModel();
  const project = useCurrentProject();
  const hasScaffoldConfiguration = Boolean(getProjectConfiguration(project.projectId, state.dataset));

  return {
    ...(hasScaffoldConfiguration
      ? {}
      : {
          compatibilityState: {
            heading: "Settings are not available for this project yet",
            message:
              "Project settings currently depend on scaffold-backed configuration data. Switch to a scaffold-backed project to use this screen."
          }
        }),
    title: `Project settings: ${project.displayName}`,
    tabs: hasScaffoldConfiguration ? buildProjectConfigurationTabs("settings") : []
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
