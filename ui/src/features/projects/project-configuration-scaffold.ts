export type ProjectConfigurationMode = "new" | "settings";
export type ProjectConfigurationTabId = "overview" | "components" | "rules" | "environment";
export type ProjectComponentKindId = "git_repository";
export type ProjectComponentSourceMode = "localPath" | "gitUrl";

export interface ProjectConfigurationTabDefinition {
  tabId: ProjectConfigurationTabId;
  label: string;
}

export interface ProjectComponentScaffold {
  componentId: string;
  heading: string;
  displayName: string;
  componentKey: string;
  kindLabel: string;
  sourceMode: ProjectComponentSourceMode;
  localPath: string;
  gitUrl: string;
  defaultRef: string;
  reviewInstructions: string[];
  testInstructions: string[];
}

export interface ProjectComponentTypeOption {
  kindId: ProjectComponentKindId;
  label: string;
  description: string;
}

export const projectConfigurationTabs: ProjectConfigurationTabDefinition[] = [
  {
    tabId: "overview",
    label: "Overview"
  },
  {
    tabId: "components",
    label: "Components"
  },
  {
    tabId: "rules",
    label: "Rules"
  },
  {
    tabId: "environment",
    label: "Environment"
  }
];

export const projectComponentTypeOptions: ProjectComponentTypeOption[] = [
  {
    kindId: "git_repository",
    label: "Git repository",
    description: "Source code checked out from a Git repository."
  }
];

export function getProjectConfigurationDefaultTab(mode: ProjectConfigurationMode) {
  return mode === "new" ? "overview" : "components";
}

export function buildProjectConfigurationPath(
  mode: ProjectConfigurationMode,
  tabId: ProjectConfigurationTabId
) {
  return mode === "new" ? `/projects/new/${tabId}` : `/settings/${tabId}`;
}

export function getProjectComponentSourceModeLabel(sourceMode: ProjectComponentSourceMode) {
  return sourceMode === "localPath" ? "Local path" : "Git URL";
}

export function buildProjectComponentScaffold(
  mode: ProjectConfigurationMode,
  index: number
) {
  if (mode === "settings" && index === 0) {
    return {
      componentId: "component-worker-app",
      heading: "Component 1",
      displayName: "API",
      componentKey: "api",
      kindLabel: "Git repository",
      sourceMode: "localPath",
      localPath: "./services/api",
      gitUrl: "",
      defaultRef: "main",
      reviewInstructions: ["Focus on API changes"],
      testInstructions: ["Run targeted API tests"]
    } satisfies ProjectComponentScaffold;
  }

  const componentNumber = index + 1;

  return {
    componentId: `${mode}-component-${componentNumber}`,
    heading: `Component ${componentNumber}`,
    displayName: mode === "new" ? `Repository ${componentNumber}` : `Background worker ${componentNumber}`,
    componentKey:
      mode === "new" ? `repository-${componentNumber}` : `background-worker-${componentNumber}`,
    kindLabel: "Git repository",
    sourceMode: "gitUrl",
    localPath: "",
    gitUrl:
      mode === "new"
        ? `https://github.com/keystone/repository-${componentNumber}.git`
        : `https://github.com/keystone/background-worker-${componentNumber}.git`,
    defaultRef: "main",
    reviewInstructions:
      mode === "new"
        ? ["Focus on repository boundaries"]
        : ["Focus on background worker changes"],
    testInstructions:
      mode === "new"
        ? ["Run the component test plan"]
        : ["Run the worker test plan"]
  } satisfies ProjectComponentScaffold;
}
