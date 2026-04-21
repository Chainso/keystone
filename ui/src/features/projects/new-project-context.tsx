import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode
} from "react";
import { useNavigate } from "react-router-dom";

import {
  projectComponentKindValues,
  projectConfigSchema,
  type ProjectConfig
} from "../../../../src/keystone/projects/contracts";
import { useResourceModel } from "../resource-model/context";
import { getNewProjectConfiguration } from "../resource-model/selectors";
import {
  buildNewProjectComponentDraft,
  type ProjectComponentSourceMode
} from "./project-configuration-scaffold";
import {
  ProjectManagementApiError,
  type ProjectValidationIssue
} from "./project-management-api";
import { useProjectManagement } from "./project-context";

type ProjectRuleListKey = "reviewInstructions" | "testInstructions";
type ProjectOverviewField = "displayName" | "projectKey" | "description";
type ProjectEnvVarField = "name" | "value";
type ProjectComponentKind = (typeof projectComponentKindValues)[number];
type ProjectComponentField =
  | "componentKey"
  | "defaultRef"
  | "displayName"
  | "gitUrl"
  | "localPath";

export interface NewProjectComponentDraft {
  componentId: string;
  componentKey: string;
  defaultRef: string;
  displayName: string;
  gitUrl: string;
  kind: ProjectComponentKind;
  localPath: string;
  reviewInstructions: string[];
  sourceMode: ProjectComponentSourceMode;
  testInstructions: string[];
}

export interface NewProjectEnvVarDraft {
  entryId: string;
  name: string;
  value: string;
}

export interface NewProjectDraft {
  components: NewProjectComponentDraft[];
  envVars: NewProjectEnvVarDraft[];
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

export interface NewProjectConfigurationState {
  draft: NewProjectDraft;
  fieldErrors: Record<string, string>;
}

export interface NewProjectConfigurationActions {
  addComponent: (kind: ProjectComponentKind) => void;
  addComponentRuleInstruction: (
    componentId: string,
    ruleList: ProjectRuleListKey
  ) => void;
  addEnvVar: () => void;
  addProjectRuleInstruction: (ruleList: ProjectRuleListKey) => void;
  cancel: () => void;
  removeComponent: (componentId: string) => void;
  removeComponentRuleInstruction: (
    componentId: string,
    ruleList: ProjectRuleListKey,
    index: number
  ) => void;
  removeEnvVar: (entryId: string) => void;
  removeProjectRuleInstruction: (ruleList: ProjectRuleListKey, index: number) => void;
  setComponentSourceMode: (
    componentId: string,
    sourceMode: ProjectComponentSourceMode
  ) => void;
  submit: () => Promise<boolean>;
  updateComponentField: (
    componentId: string,
    field: ProjectComponentField,
    value: string
  ) => void;
  updateComponentRuleInstruction: (
    componentId: string,
    ruleList: ProjectRuleListKey,
    index: number,
    value: string
  ) => void;
  updateEnvVar: (entryId: string, field: ProjectEnvVarField, value: string) => void;
  updateOverviewField: (field: ProjectOverviewField, value: string) => void;
  updateProjectRuleInstruction: (
    ruleList: ProjectRuleListKey,
    index: number,
    value: string
  ) => void;
}

export interface NewProjectConfigurationMeta {
  isSubmitting: boolean;
  submitError: string | null;
}

export interface NewProjectConfigurationValue {
  actions: NewProjectConfigurationActions;
  meta: NewProjectConfigurationMeta;
  state: NewProjectConfigurationState;
}

const NewProjectConfigurationContext = createContext<NewProjectConfigurationValue | null>(null);

function buildInitialDraft(dataset: ReturnType<typeof useResourceModel>["state"]["dataset"]): NewProjectDraft {
  const configuration = getNewProjectConfiguration(dataset);

  if (!configuration) {
    throw new Error("New project configuration scaffold is missing.");
  }

  return {
    components: configuration.components.map((component) => ({
      componentId: component.componentId,
      componentKey: component.componentKey,
      defaultRef: component.defaultRef,
      displayName: component.displayName,
      gitUrl: component.gitUrl,
      kind: component.kind,
      localPath: component.localPath,
      reviewInstructions: [...component.reviewInstructions],
      sourceMode: component.sourceMode,
      testInstructions: [...component.testInstructions]
    })),
    envVars: configuration.environmentVariables.map((envVar, index) => ({
      entryId: `env-var-${index + 1}`,
      name: envVar.name,
      value: envVar.value
    })),
    overview: {
      description: configuration.overview.description,
      displayName: configuration.overview.displayName,
      projectKey: configuration.overview.projectKey
    },
    ruleSet: {
      reviewInstructions: [...configuration.rules.reviewInstructions],
      testInstructions: [...configuration.rules.testInstructions]
    }
  };
}

function mapNewProjectComponentDraft(index: number, kind: ProjectComponentKind): NewProjectComponentDraft {
  const draft = buildNewProjectComponentDraft(index, kind);

  return {
    componentId: draft.componentId,
    componentKey: draft.componentKey,
    defaultRef: draft.defaultRef,
    displayName: draft.displayName,
    gitUrl: draft.gitUrl,
    kind: draft.kind,
    localPath: draft.localPath,
    reviewInstructions: [...draft.reviewInstructions],
    sourceMode: draft.sourceMode,
    testInstructions: [...draft.testInstructions]
  };
}

function updateStringList(items: string[], index: number, value: string) {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function removeStringListItem(items: string[], index: number) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function serializeDraft(draft: NewProjectDraft): ProjectConfig {
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

function buildFieldErrors(issues: ProjectValidationIssue[]) {
  return issues.reduce<Record<string, string>>((errors, issue) => {
    const key = normalizeIssuePath(issue.path);

    if (!key || errors[key]) {
      return errors;
    }

    errors[key] = getIssueMessage(key, issue);

    return errors;
  }, {});
}

export function NewProjectConfigurationProvider({
  children
}: {
  children: ReactNode;
}) {
  const { state } = useResourceModel();
  const navigate = useNavigate();
  const projectManagement = useProjectManagement();
  const [draft, setDraft] = useState<NewProjectDraft>(() => buildInitialDraft(state.dataset));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const nextComponentIndexRef = useRef(draft.components.length);
  const nextEnvVarIndexRef = useRef(draft.envVars.length);

  function updateDraft(recipe: (currentDraft: NewProjectDraft) => NewProjectDraft) {
    setDraft((currentDraft) => recipe(currentDraft));
    setFieldErrors({});
    setSubmitError(null);
  }

  const value: NewProjectConfigurationValue = {
    state: {
      draft,
      fieldErrors
    },
    actions: {
      addComponent(kind) {
        updateDraft((currentDraft) => {
          const componentIndex = nextComponentIndexRef.current;
          nextComponentIndexRef.current += 1;

          return {
            ...currentDraft,
            components: [
              ...currentDraft.components,
              mapNewProjectComponentDraft(componentIndex, kind)
            ]
          };
        });
      },
      addComponentRuleInstruction(componentId, ruleList) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          components: currentDraft.components.map((component) =>
            component.componentId === componentId
              ? {
                  ...component,
                  [ruleList]: [...component[ruleList], ""]
                }
              : component
          )
        }));
      },
      addEnvVar() {
        updateDraft((currentDraft) => {
          nextEnvVarIndexRef.current += 1;

          return {
            ...currentDraft,
            envVars: [
              ...currentDraft.envVars,
              {
                entryId: `env-var-${nextEnvVarIndexRef.current}`,
                name: "",
                value: ""
              }
            ]
          };
        });
      },
      addProjectRuleInstruction(ruleList) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          ruleSet: {
            ...currentDraft.ruleSet,
            [ruleList]: [...currentDraft.ruleSet[ruleList], ""]
          }
        }));
      },
      cancel() {
        navigate("/runs");
      },
      removeComponent(componentId) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          components: currentDraft.components.filter(
            (component) => component.componentId !== componentId
          )
        }));
      },
      removeComponentRuleInstruction(componentId, ruleList, index) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          components: currentDraft.components.map((component) =>
            component.componentId === componentId
              ? {
                  ...component,
                  [ruleList]: removeStringListItem(component[ruleList], index)
                }
              : component
          )
        }));
      },
      removeEnvVar(entryId) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          envVars: currentDraft.envVars.filter((envVar) => envVar.entryId !== entryId)
        }));
      },
      removeProjectRuleInstruction(ruleList, index) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          ruleSet: {
            ...currentDraft.ruleSet,
            [ruleList]: removeStringListItem(currentDraft.ruleSet[ruleList], index)
          }
        }));
      },
      setComponentSourceMode(componentId, sourceMode) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          components: currentDraft.components.map((component) =>
            component.componentId === componentId
              ? {
                  ...component,
                  sourceMode
                }
              : component
          )
        }));
      },
      async submit() {
        if (isSubmitting) {
          return false;
        }

        const validation = projectConfigSchema.safeParse(serializeDraft(draft));

        if (!validation.success) {
          setFieldErrors(
            buildFieldErrors(
              validation.error.issues.map((issue) => ({
                code: issue.code,
                message: issue.message,
                path: issue.path.filter(
                  (segment): segment is string | number =>
                    typeof segment === "string" || typeof segment === "number"
                )
              }))
            )
          );
          setSubmitError("Fix the validation errors before creating the project.");

          return false;
        }

        setFieldErrors({});
        setSubmitError(null);
        setIsSubmitting(true);

        try {
          await projectManagement.actions.createProject(validation.data);
          navigate("/runs");

          return true;
        } catch (error) {
          if (error instanceof ProjectManagementApiError) {
            if (error.issues.length > 0) {
              setFieldErrors(buildFieldErrors(error.issues));
            }

            setSubmitError(error.message);

            return false;
          }

          setSubmitError(
            error instanceof Error && error.message
              ? error.message
              : "Unable to create the project."
          );

          return false;
        } finally {
          setIsSubmitting(false);
        }
      },
      updateComponentField(componentId, field, value) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          components: currentDraft.components.map((component) =>
            component.componentId === componentId
              ? {
                  ...component,
                  [field]: value
                }
              : component
          )
        }));
      },
      updateComponentRuleInstruction(componentId, ruleList, index, value) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          components: currentDraft.components.map((component) =>
            component.componentId === componentId
              ? {
                  ...component,
                  [ruleList]: updateStringList(component[ruleList], index, value)
                }
              : component
          )
        }));
      },
      updateEnvVar(entryId, field, value) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          envVars: currentDraft.envVars.map((envVar) =>
            envVar.entryId === entryId
              ? {
                  ...envVar,
                  [field]: value
                }
              : envVar
          )
        }));
      },
      updateOverviewField(field, value) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          overview: {
            ...currentDraft.overview,
            [field]: value
          }
        }));
      },
      updateProjectRuleInstruction(ruleList, index, value) {
        updateDraft((currentDraft) => ({
          ...currentDraft,
          ruleSet: {
            ...currentDraft.ruleSet,
            [ruleList]: updateStringList(currentDraft.ruleSet[ruleList], index, value)
          }
        }));
      }
    },
    meta: {
      isSubmitting,
      submitError
    }
  };

  return (
    <NewProjectConfigurationContext.Provider value={value}>
      {children}
    </NewProjectConfigurationContext.Provider>
  );
}

export function useNewProjectConfiguration() {
  const value = useContext(NewProjectConfigurationContext);

  if (!value) {
    throw new Error(
      "useNewProjectConfiguration must be used within NewProjectConfigurationProvider."
    );
  }

  return value;
}
