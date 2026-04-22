import {
  useRef,
  useState,
  type ReactNode
} from "react";
import { useNavigate } from "react-router-dom";

import {
  projectConfigSchema
} from "../../../../src/keystone/projects/contracts";
import { useResourceModel } from "../resource-model/context";
import { getNewProjectConfiguration } from "../resource-model/selectors";
import { buildNewProjectComponentDraft } from "./project-configuration-scaffold";
import {
  ProjectConfigurationContext,
  buildProjectConfigurationModeMeta,
  type ProjectConfigurationValue,
  useProjectConfiguration
} from "./project-configuration-context";
import {
  buildProjectConfigurationFieldErrors,
  removeStringListItem,
  serializeProjectConfigurationDraft,
  updateStringList,
  type ProjectComponentKind,
  type ProjectConfigurationComponentDraft,
  type ProjectConfigurationDraft
} from "./project-configuration-form";
import { ProjectManagementApiError } from "./project-management-api";
import { useProjectManagement } from "./project-context";

type NewProjectDraft = ProjectConfigurationDraft;
type NewProjectComponentDraft = ProjectConfigurationComponentDraft;

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
      descriptionWasNull: false,
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

  const value: ProjectConfigurationValue = {
    state: {
      draft,
      fieldErrors,
      projectId: null
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
      retryLoad() {},
      runSecondaryAction() {
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

        const validation = projectConfigSchema.safeParse(
          serializeProjectConfigurationDraft(draft)
        );

        if (!validation.success) {
          setFieldErrors(
            buildProjectConfigurationFieldErrors(
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
              setFieldErrors(buildProjectConfigurationFieldErrors(error.issues));
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
      hasUnsavedChanges: false,
      isSubmitting,
      loadError: null,
      mode: buildProjectConfigurationModeMeta("new"),
      status: "ready" as const,
      submitError
    }
  };

  return (
    <ProjectConfigurationContext.Provider value={value}>
      {children}
    </ProjectConfigurationContext.Provider>
  );
}

export function useNewProjectConfiguration() {
  return useProjectConfiguration();
}
