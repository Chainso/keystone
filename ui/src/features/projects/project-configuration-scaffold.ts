export type ProjectConfigurationMode = "new" | "settings";
export type ProjectConfigurationTabId = "overview" | "components" | "rules" | "environment";
export type ProjectComponentKindId = "git_repository";

export interface ProjectConfigurationTabDefinition {
  tabId: ProjectConfigurationTabId;
  label: string;
  summary: string;
}

export interface ProjectComponentScaffold {
  componentId: string;
  heading: string;
  statusLabel: string;
  displayName: string;
  componentKey: string;
  kindLabel: string;
  sourceModeLabel: string;
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
    label: "Overview",
    summary: "Project identity and framing."
  },
  {
    tabId: "components",
    label: "Components",
    summary: "Source components and component-level rules."
  },
  {
    tabId: "rules",
    label: "Rules",
    summary: "Review and test instructions."
  },
  {
    tabId: "environment",
    label: "Environment",
    summary: "Non-secret project variables."
  }
];

export const projectComponentTypeOptions: ProjectComponentTypeOption[] = [
  {
    kindId: "git_repository",
    label: "Git repository",
    description:
      "The only supported component type today. It still goes through a picker so future component kinds fit the same flow."
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

export function buildProjectComponentScaffold(
  mode: ProjectConfigurationMode,
  index: number
) {
  if (mode === "settings" && index === 0) {
    return {
      componentId: "component-worker-app",
      heading: "Component 1",
      statusLabel: "Current component",
      displayName: "Worker app",
      componentKey: "worker-app",
      kindLabel: "Git repository",
      sourceModeLabel: "Local path",
      localPath: "./",
      gitUrl: "",
      defaultRef: "main",
      reviewInstructions: ["Focus on Worker/runtime boundaries and route ownership."],
      testInstructions: ["Run `npm run test` and preserve the existing route smoke coverage."]
    } satisfies ProjectComponentScaffold;
  }

  const componentNumber = index + 1;

  return {
    componentId: `${mode}-component-${componentNumber}`,
    heading: `Component ${componentNumber}`,
    statusLabel: mode === "new" ? "Draft component" : "Pending addition",
    displayName: mode === "new" ? `Repository ${componentNumber}` : `Background worker ${componentNumber}`,
    componentKey:
      mode === "new" ? `repository-${componentNumber}` : `background-worker-${componentNumber}`,
    kindLabel: "Git repository",
    sourceModeLabel: "Local path",
    localPath:
      mode === "new"
        ? `./services/repository-${componentNumber}`
        : `./workers/background-${componentNumber}`,
    gitUrl: "",
    defaultRef: "main",
    reviewInstructions:
      mode === "new"
        ? ["Capture component-specific review focus after the draft project scaffold is stable."]
        : ["Limit review overrides to the background worker behavior introduced in this draft."],
    testInstructions:
      mode === "new"
        ? ["Add targeted test instructions after the first runnable component path is confirmed."]
        : ["Add any worker-specific validation once this placeholder becomes a real component."]
  } satisfies ProjectComponentScaffold;
}
