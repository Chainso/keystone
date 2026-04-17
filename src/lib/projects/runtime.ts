import type { CompileRepoSource } from "../../keystone/compile/plan-run";
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
  compileRepo: CompileRepoSource;
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

function resolveCompileRepo(component: ProjectComponent): CompileRepoSource {
  if (component.kind !== "git_repository") {
    throw new Error(`Unsupported project component kind ${String(component.kind)}.`);
  }

  if (component.config.gitUrl) {
    return {
      source: "gitUrl",
      gitUrl: component.config.gitUrl,
      ref: component.config.defaultRef
    };
  }

  if (component.config.localPath) {
    return {
      source: "localPath",
      localPath: component.config.localPath,
      ref: component.config.defaultRef
    };
  }

  throw new Error(`Project component ${component.componentKey} is missing a repository source.`);
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
      repoRef: component.config.defaultRef,
      baseRef: component.config.defaultRef
    };
  }

  if (isFixtureLocalComponent(component)) {
    return {
      type: "inline",
      componentKey: component.componentKey,
      repoUrl: "fixture://demo-target",
      repoRef: component.config.defaultRef ?? "main",
      baseRef: component.config.defaultRef ?? "main",
      files: demoTargetFixtureFiles
    };
  }

  throw new Error(
    `Project component ${component.componentKey} uses localPath execution, but only the committed demo fixture localPath is currently supported in the runtime proof.`
  );
}

export function buildProjectExecutionSnapshot(
  project: StoredProject
): ProjectExecutionSnapshot {
  const compileComponent = project.components[0];

  if (!compileComponent) {
    throw new Error(`Project ${project.projectId} does not define any executable components.`);
  }

  return {
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    compileRepo: resolveCompileRepo(compileComponent),
    components: project.components.map(resolveWorkspaceComponent),
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
