import type {
  ProjectComponent,
  ProjectRuleSet,
  StoredProject
} from "../../keystone/projects/contracts";
import { demoTargetFixtureFiles } from "../workspace/fixtures";
import type { WorkspaceMaterializationSource } from "../workspace/init";

export interface ProjectExecutionRuleOverride {
  componentKey: string;
  reviewInstructions: string[];
  testInstructions: string[];
}

export interface ProjectExecutionSnapshot {
  projectId: string;
  projectKey: string;
  displayName: string;
  components: WorkspaceMaterializationSource[];
  environment: Record<string, string>;
  ruleSet: ProjectRuleSet;
  componentRuleOverrides: ProjectExecutionRuleOverride[];
}

function isFixtureLocalComponent(component: ProjectComponent) {
  return (
    component.kind === "git_repository" &&
    component.config.localPath?.endsWith("fixtures/demo-target") === true
  );
}

function resolveWorkspaceComponent(
  component: ProjectComponent
): WorkspaceMaterializationSource {
  if (component.kind !== "git_repository") {
    throw new Error(`Unsupported project component kind ${String(component.kind)}.`);
  }

  if (component.config.gitUrl) {
    return {
      type: "git",
      componentKey: component.componentKey,
      repoUrl: component.config.gitUrl,
      repoRef: component.config.ref,
      baseRef: component.config.ref
    };
  }

  if (isFixtureLocalComponent(component)) {
    return {
      type: "inline",
      componentKey: component.componentKey,
      repoUrl: "fixture://demo-target",
      repoRef: component.config.ref ?? "main",
      baseRef: component.config.ref ?? "main",
      files: demoTargetFixtureFiles
    };
  }

  if (component.config.localPath) {
    return {
      type: "git",
      componentKey: component.componentKey,
      repoUrl: component.config.localPath,
      repoRef: component.config.ref,
      baseRef: component.config.ref
    };
  }

  throw new Error(`Project component ${component.componentKey} is missing a workspace source.`);
}

export function buildProjectExecutionSnapshot(
  project: StoredProject
): ProjectExecutionSnapshot {
  const components = project.components.map(resolveWorkspaceComponent);

  return {
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    components,
    environment: Object.fromEntries(
      project.envVars.map((envVar) => [envVar.name, envVar.value])
    ),
    ruleSet: project.ruleSet,
    componentRuleOverrides: project.components.flatMap((component) => {
      if (!component.ruleOverride) {
        return [];
      }

      return [
        {
          componentKey: component.componentKey,
          reviewInstructions: component.ruleOverride.reviewInstructions ?? [],
          testInstructions: component.ruleOverride.testInstructions ?? []
        }
      ];
    })
  };
}
