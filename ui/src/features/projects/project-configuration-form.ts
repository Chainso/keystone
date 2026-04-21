import {
  projectComponentKindValues,
  type ProjectConfig
} from "../../../../src/keystone/projects/contracts";
import type { ProjectValidationIssue } from "./project-management-api";

export type ProjectRuleListKey = "reviewInstructions" | "testInstructions";
export type ProjectOverviewField = "displayName" | "projectKey" | "description";
export type ProjectEnvVarField = "name" | "value";
export type ProjectComponentKind = (typeof projectComponentKindValues)[number];
export type ProjectComponentField =
  | "componentKey"
  | "defaultRef"
  | "displayName"
  | "gitUrl"
  | "localPath";

export interface ProjectConfigurationComponentDraft {
  componentId: string;
  componentKey: string;
  defaultRef: string;
  displayName: string;
  gitUrl: string;
  kind: ProjectComponentKind;
  localPath: string;
  reviewInstructions: string[];
  sourceMode: "gitUrl" | "localPath";
  testInstructions: string[];
}

export interface ProjectConfigurationEnvVarDraft {
  entryId: string;
  name: string;
  value: string;
}

export interface ProjectConfigurationDraft {
  components: ProjectConfigurationComponentDraft[];
  envVars: ProjectConfigurationEnvVarDraft[];
  overview: {
    description: string;
    displayName: string;
    projectKey: string;
  };
  ruleSet: {
    reviewInstructions: string[];
    testInstructions: string[];
  };
}

export function buildProjectConfigurationDraft(
  config: ProjectConfig
): ProjectConfigurationDraft {
  return {
    components: config.components.map((component, index) => ({
      componentId: `component-${index + 1}`,
      componentKey: component.componentKey,
      defaultRef: component.config.ref ?? "",
      displayName: component.displayName,
      gitUrl: "gitUrl" in component.config ? component.config.gitUrl ?? "" : "",
      kind: component.kind,
      localPath: "localPath" in component.config ? component.config.localPath ?? "" : "",
      reviewInstructions: [...(component.ruleOverride?.reviewInstructions ?? [])],
      sourceMode: "localPath" in component.config ? "localPath" : "gitUrl",
      testInstructions: [...(component.ruleOverride?.testInstructions ?? [])]
    })),
    envVars: config.envVars.map((envVar, index) => ({
      entryId: `env-var-${index + 1}`,
      name: envVar.name,
      value: envVar.value
    })),
    overview: {
      description: config.description ?? "",
      displayName: config.displayName,
      projectKey: config.projectKey
    },
    ruleSet: {
      reviewInstructions: [...config.ruleSet.reviewInstructions],
      testInstructions: [...config.ruleSet.testInstructions]
    }
  };
}

export function serializeProjectConfigurationDraft(
  draft: ProjectConfigurationDraft
): ProjectConfig {
  return {
    projectKey: draft.overview.projectKey,
    displayName: draft.overview.displayName,
    description: draft.overview.description,
    ruleSet: {
      reviewInstructions: draft.ruleSet.reviewInstructions,
      testInstructions: draft.ruleSet.testInstructions
    },
    components: draft.components.map((component) => {
      const selectedConfig =
        component.sourceMode === "localPath"
          ? {
              ...(component.localPath ? { localPath: component.localPath } : {}),
              ...(component.defaultRef ? { ref: component.defaultRef } : {})
            }
          : {
              ...(component.gitUrl ? { gitUrl: component.gitUrl } : {}),
              ...(component.defaultRef ? { ref: component.defaultRef } : {})
            };
      const ruleOverride = {
        ...(component.reviewInstructions.length > 0
          ? { reviewInstructions: component.reviewInstructions }
          : {}),
        ...(component.testInstructions.length > 0
          ? { testInstructions: component.testInstructions }
          : {})
      };

      return {
        componentKey: component.componentKey,
        displayName: component.displayName,
        kind: component.kind,
        config: selectedConfig,
        ...(Object.keys(ruleOverride).length > 0 ? { ruleOverride } : {})
      };
    }),
    envVars: draft.envVars.map((envVar) => ({
      name: envVar.name,
      value: envVar.value
    }))
  };
}

export function updateStringList(items: string[], index: number, value: string) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

export function removeStringListItem(items: string[], index: number) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function normalizeIssuePath(path: Array<string | number>) {
  if (path[0] === "displayName") {
    return "overview.displayName";
  }

  if (path[0] === "projectKey") {
    return "overview.projectKey";
  }

  if (path[0] === "description") {
    return "overview.description";
  }

  if (path[0] === "ruleSet" && typeof path[1] === "string") {
    return ["rules", path[1], path[2]].filter((segment) => segment !== undefined).join(".");
  }

  if (path[0] === "components") {
    if (typeof path[1] !== "number") {
      return "components";
    }

    if (path[2] === "config" && typeof path[3] === "string") {
      const field =
        path[3] === "ref"
          ? "defaultRef"
          : path[3] === "localPath" || path[3] === "gitUrl"
            ? path[3]
            : null;

      return field ? `components.${path[1]}.${field}` : null;
    }

    if (path[2] === "ruleOverride" && typeof path[3] === "string") {
      return ["components", path[1], path[3], path[4]]
        .filter((segment) => segment !== undefined)
        .join(".");
    }

    if (typeof path[2] === "string") {
      return `components.${path[1]}.${path[2]}`;
    }

    return "components";
  }

  if (path[0] === "envVars") {
    if (typeof path[1] !== "number") {
      return "environment";
    }

    if (typeof path[2] === "string") {
      return `environment.${path[1]}.${path[2]}`;
    }

    return "environment";
  }

  return null;
}

function getIssueMessage(key: string, issue: ProjectValidationIssue) {
  if (issue.code === "custom") {
    return issue.message;
  }

  if (key === "overview.displayName") {
    return "Project name is required.";
  }

  if (key === "overview.projectKey") {
    return "Project key is required.";
  }

  if (key === "overview.description") {
    return "Description is required.";
  }

  if (key === "components") {
    return "Add at least one component before creating the project.";
  }

  if (key.endsWith(".displayName")) {
    return "Component name is required.";
  }

  if (key.endsWith(".componentKey")) {
    return "Component key is required.";
  }

  if (key.endsWith(".localPath")) {
    return "Enter a local path for this repository.";
  }

  if (key.endsWith(".gitUrl")) {
    return issue.message === "Invalid URL" ? "Enter a valid Git URL." : issue.message;
  }

  if (key.endsWith(".name")) {
    return "Environment variable name is required.";
  }

  if (key.includes(".reviewInstructions.") || key.includes(".testInstructions.")) {
    return "Instructions cannot be empty.";
  }

  return issue.message;
}

export function buildProjectConfigurationFieldErrors(
  issues: ProjectValidationIssue[]
) {
  return issues.reduce<Record<string, string>>((errors, issue) => {
    const key = normalizeIssuePath(issue.path);

    if (!key || errors[key]) {
      return errors;
    }

    errors[key] = getIssueMessage(key, issue);

    return errors;
  }, {});
}
