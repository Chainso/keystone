import type {
  ResourceProjectConfigurationComponent,
  ResourceProjectComponentKind,
  ResourceProjectComponentSourceMode
} from "../resource-model/types";

export type ProjectConfigurationMode = "new" | "settings";
export type ProjectConfigurationTabId = "overview" | "components" | "rules" | "environment";
export type ProjectComponentKindId = ResourceProjectComponentKind;
export type ProjectComponentSourceMode = ResourceProjectComponentSourceMode;
export type ProjectComponentScaffold = ResourceProjectConfigurationComponent;

export interface ProjectConfigurationTabDefinition {
  tabId: ProjectConfigurationTabId;
  label: string;
  summary: string;
}

export interface ProjectComponentTypeOption {
  description?: string;
  kindId: ProjectComponentKindId;
  label: string;
}

export const projectConfigurationTabs: ProjectConfigurationTabDefinition[] = [
  {
    label: "Overview",
    summary: "Project identity and operator-facing context.",
    tabId: "overview"
  },
  {
    label: "Components",
    summary: "Repository-backed components and source selection.",
    tabId: "components"
  },
  {
    label: "Rules",
    summary: "Review and test guidance as checklist items.",
    tabId: "rules"
  },
  {
    label: "Environment",
    summary: "Non-secret project environment variables.",
    tabId: "environment"
  }
];

export const projectComponentTypeOptions: ProjectComponentTypeOption[] = [
  {
    description: "Connect a repository by Git URL or a local workspace path.",
    kindId: "git_repository",
    label: "Git repository"
  }
];

export function getProjectConfigurationDefaultTab(mode: ProjectConfigurationMode) {
  switch (mode) {
    case "new":
    case "settings":
      return "overview";
  }
}

export function buildProjectConfigurationPath(
  mode: ProjectConfigurationMode,
  tabId: ProjectConfigurationTabId
) {
  return mode === "new" ? `/projects/new/${tabId}` : `/settings/${tabId}`;
}

export function getProjectComponentKindLabel(kind: ProjectComponentKindId) {
  return kind === "git_repository" ? "Git repository" : kind;
}

export function buildProjectConfigurationComponentDraft(
  mode: ProjectConfigurationMode,
  index: number,
  kindId: ProjectComponentKindId
): ProjectComponentScaffold {
  if (mode === "settings" && index === 0) {
    return {
      componentId: "component-worker-app",
      heading: "Component 1",
      displayName: "API",
      componentKey: "api",
      kind: kindId,
      sourceMode: "localPath",
      localPath: "./services/api",
      gitUrl: "",
      defaultRef: "main",
      reviewInstructions: ["Focus on API changes"],
      testInstructions: ["Run targeted API tests"]
    };
  }

  const componentNumber = index + 1;

  return {
    componentId: `${mode}-component-${componentNumber}`,
    heading: `Component ${componentNumber}`,
    displayName: mode === "new" ? `Repository ${componentNumber}` : `Service ${componentNumber}`,
    componentKey:
      mode === "new" ? `repository-${componentNumber}` : `service-${componentNumber}`,
    kind: kindId,
    sourceMode: "gitUrl",
    localPath: "",
    gitUrl:
      mode === "new"
        ? `https://github.com/keystone/repository-${componentNumber}.git`
        : `https://github.com/keystone/service-${componentNumber}.git`,
    defaultRef: "main",
    reviewInstructions:
      mode === "new"
        ? ["Focus on repository boundaries"]
        : ["Focus on service changes"],
    testInstructions:
      mode === "new"
        ? ["Run targeted component tests"]
        : ["Run targeted component tests"]
  };
}

export function buildNewProjectComponentDraft(
  index: number,
  kindId: ProjectComponentKindId
) {
  return buildProjectConfigurationComponentDraft("new", index, kindId);
}
