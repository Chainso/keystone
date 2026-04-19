import { useState } from "react";

import {
  getNewProjectConfiguration,
  getProjectConfiguration
} from "../resource-model/selectors";
import {
  buildProjectConfigurationComponentDraft,
  buildProjectConfigurationPath,
  projectComponentTypeOptions,
  projectConfigurationTabs,
  type ProjectComponentScaffold,
  type ProjectComponentTypeOption,
  type ProjectConfigurationMode
} from "./project-configuration-scaffold";
import { useCurrentProject } from "./project-context";
import { useResourceModel } from "../resource-model/context";

interface ProjectConfigurationShellViewModel {
  title: string;
  tabs: Array<{
    label: string;
    path: string;
    tabId: (typeof projectConfigurationTabs)[number]["tabId"];
  }>;
}

interface ProjectOverviewViewModel {
  heading: string;
  descriptionField: {
    label: string;
    value: string;
  };
  footerActions: string[];
  keyField: {
    label: string;
    value: string;
  };
  nameField: {
    label: string;
    value: string;
  };
}

interface ProjectComponentsViewModel {
  components: ProjectComponentScaffold[];
  emptyState: string;
  footerActions: string[];
  heading: string;
  pickComponentType: (kindId: ProjectComponentTypeOption["kindId"]) => void;
  toggleTypePicker: () => void;
  typeOptions: ProjectComponentTypeOption[];
  typePickerOpen: boolean;
  typePickerTitle: string;
}

interface ProjectRulesViewModel {
  heading: string;
  reviewInstructions: string[];
  testInstructions: string[];
}

interface ProjectEnvironmentViewModel {
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

    return configuration;
  }

  const configuration = getProjectConfiguration(project.projectId, state.dataset);

  if (!configuration) {
    throw new Error(`Project configuration scaffold is missing for "${project.projectId}".`);
  }

  return configuration;
}

function useProjectComponentsModel(mode: ProjectConfigurationMode): ProjectComponentsViewModel {
  const configuration = useProjectConfigurationSeed(mode);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [components, setComponents] = useState(configuration.components);

  return {
    components,
    emptyState:
      mode === "new"
        ? "Add repository components before saving the project scaffold."
        : "No project components configured yet.",
    footerActions: mode === "new" ? ["Cancel", "Save Draft", "Next"] : ["Discard", "Save"],
    heading: "Components",
    pickComponentType() {
      setComponents((currentComponents) => [
        ...currentComponents,
        buildProjectConfigurationComponentDraft(mode, currentComponents.length)
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

function useProjectOverviewModel(mode: ProjectConfigurationMode): ProjectOverviewViewModel {
  const configuration = useProjectConfigurationSeed(mode);

  return {
    heading: "Overview",
    descriptionField: {
      label: "Description",
      value: configuration.overview.description
    },
    footerActions: mode === "new" ? ["Cancel", "Save Draft", "Next"] : ["Discard", "Save"],
    keyField: {
      label: "Project key",
      value: configuration.overview.projectKey
    },
    nameField: {
      label: "Project name",
      value: configuration.overview.displayName
    }
  };
}

function useProjectRulesModel(mode: ProjectConfigurationMode): ProjectRulesViewModel {
  const configuration = useProjectConfigurationSeed(mode);

  return {
    heading: "Rules",
    reviewInstructions: configuration.rules.reviewInstructions,
    testInstructions: configuration.rules.testInstructions
  };
}

function useProjectEnvironmentModel(mode: ProjectConfigurationMode): ProjectEnvironmentViewModel {
  const configuration = useProjectConfigurationSeed(mode);

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
  const project = useCurrentProject();

  return {
    title: `Project settings: ${project.displayName}`,
    tabs: buildProjectConfigurationTabs("settings")
  };
}

export function useNewProjectOverviewViewModel() {
  return useProjectOverviewModel("new");
}

export function useProjectSettingsOverviewViewModel() {
  return useProjectOverviewModel("settings");
}

export function useNewProjectComponentsViewModel() {
  return useProjectComponentsModel("new");
}

export function useProjectSettingsComponentsViewModel() {
  return useProjectComponentsModel("settings");
}

export function useNewProjectRulesViewModel() {
  return useProjectRulesModel("new");
}

export function useProjectSettingsRulesViewModel() {
  return useProjectRulesModel("settings");
}

export function useNewProjectEnvironmentViewModel() {
  return useProjectEnvironmentModel("new");
}

export function useProjectSettingsEnvironmentViewModel() {
  return useProjectEnvironmentModel("settings");
}
