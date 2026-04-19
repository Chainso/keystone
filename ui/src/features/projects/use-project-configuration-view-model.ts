import { useState } from "react";

import {
  buildProjectComponentScaffold,
  buildProjectConfigurationPath,
  projectComponentTypeOptions,
  projectConfigurationTabs,
  type ProjectComponentScaffold,
  type ProjectComponentTypeOption
} from "./project-configuration-scaffold";
import { useCurrentProject } from "./project-context";

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

function buildProjectConfigurationTabs(mode: "new" | "settings") {
  return projectConfigurationTabs.map((tab) => ({
    tabId: tab.tabId,
    label: tab.label,
    path: buildProjectConfigurationPath(mode, tab.tabId)
  }));
}

function useProjectComponentsModel(
  mode: "new" | "settings",
  initialComponents: ProjectComponentScaffold[]
): ProjectComponentsViewModel {
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [components, setComponents] = useState(initialComponents);

  return {
    components,
    emptyState: "No components added yet.",
    footerActions: mode === "new" ? ["Cancel", "Save Draft", "Next"] : ["Discard", "Save"],
    heading: "Components",
    pickComponentType() {
      setComponents((currentComponents) => [
        ...currentComponents,
        buildProjectComponentScaffold(mode, currentComponents.length)
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

export function useNewProjectOverviewViewModel(): ProjectOverviewViewModel {
  return {
    heading: "Overview",
    descriptionField: {
      label: "Description",
      value: "Internal operator workspace for the Keystone Cloudflare project."
    },
    footerActions: ["Cancel", "Save Draft", "Next"],
    keyField: {
      label: "Project key",
      value: "keystone-cloudflare"
    },
    nameField: {
      label: "Project name",
      value: "Keystone Cloudflare"
    }
  };
}

export function useProjectSettingsOverviewViewModel(): ProjectOverviewViewModel {
  const project = useCurrentProject();

  return {
    heading: "Overview",
    descriptionField: {
      label: "Description",
      value: "Internal operator workspace for runs, documentation, and workstreams."
    },
    footerActions: ["Discard", "Save"],
    keyField: {
      label: "Project key",
      value: project.projectKey
    },
    nameField: {
      label: "Project name",
      value: project.displayName
    }
  };
}

export function useNewProjectComponentsViewModel(): ProjectComponentsViewModel {
  return useProjectComponentsModel("new", []);
}

export function useProjectSettingsComponentsViewModel(): ProjectComponentsViewModel {
  return useProjectComponentsModel("settings", [buildProjectComponentScaffold("settings", 0)]);
}

export function useProjectRulesViewModel(): ProjectRulesViewModel {
  return {
    heading: "Rules",
    reviewInstructions: [
      "Keep route ownership explicit.",
      "Capture component-specific review focus when needed."
    ],
    testInstructions: [
      "Run lint, typecheck, and test before handoff.",
      "Verify the project configuration tabs."
    ]
  };
}

export function useProjectEnvironmentViewModel(): ProjectEnvironmentViewModel {
  return {
    envVars: [
      {
        name: "KEYSTONE_AGENT_RUNTIME",
        value: "scripted"
      },
      {
        name: "KEYSTONE_CHAT_COMPLETIONS_BASE_URL",
        value: "http://localhost:10531"
      },
      {
        name: "KEYSTONE_CHAT_COMPLETIONS_MODEL",
        value: "gpt-5.4-mini"
      }
    ],
    heading: "Environment"
  };
}
