import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";

import { projectConfigSchema } from "../../../../src/keystone/projects/contracts";
import {
  buildProjectConfigurationComponentDraft,
  type ProjectComponentSourceMode
} from "./project-configuration-scaffold";
import {
  buildProjectConfigurationDraft,
  buildProjectConfigurationFieldErrors,
  removeStringListItem,
  serializeProjectConfigurationDraft,
  updateStringList,
  type ProjectComponentField,
  type ProjectComponentKind,
  type ProjectConfigurationComponentDraft,
  type ProjectConfigurationDraft,
  type ProjectEnvVarField,
  type ProjectOverviewField,
  type ProjectRuleListKey
} from "./project-configuration-form";
import { ProjectManagementApiError } from "./project-management-api";
import {
  useCurrentProject,
  useProjectManagement,
  useProjectManagementApi
} from "./project-context";

export interface ProjectSettingsConfigurationState {
  draft: ProjectConfigurationDraft | null;
  fieldErrors: Record<string, string>;
}

export interface ProjectSettingsConfigurationActions {
  addComponent: (kind: ProjectComponentKind) => void;
  addComponentRuleInstruction: (
    componentId: string,
    ruleList: ProjectRuleListKey
  ) => void;
  addEnvVar: () => void;
  addProjectRuleInstruction: (ruleList: ProjectRuleListKey) => void;
  discardChanges: () => void;
  removeComponent: (componentId: string) => void;
  removeComponentRuleInstruction: (
    componentId: string,
    ruleList: ProjectRuleListKey,
    index: number
  ) => void;
  removeEnvVar: (entryId: string) => void;
  removeProjectRuleInstruction: (ruleList: ProjectRuleListKey, index: number) => void;
  retryLoad: () => void;
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

export interface ProjectSettingsConfigurationMeta {
  hasUnsavedChanges: boolean;
  isSubmitting: boolean;
  loadError: string | null;
  status: "loading" | "ready" | "error";
  submitError: string | null;
}

export interface ProjectSettingsConfigurationValue {
  actions: ProjectSettingsConfigurationActions;
  meta: ProjectSettingsConfigurationMeta;
  state: ProjectSettingsConfigurationState;
}

const ProjectSettingsConfigurationContext =
  createContext<ProjectSettingsConfigurationValue | null>(null);

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load project settings.";
}

function mapSettingsComponentDraft(
  index: number,
  kind: ProjectComponentKind
): ProjectConfigurationComponentDraft {
  const draft = buildProjectConfigurationComponentDraft("settings", index, kind);

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

function areDraftsEqual(
  currentDraft: ProjectConfigurationDraft | null,
  loadedDraft: ProjectConfigurationDraft | null
) {
  if (!currentDraft || !loadedDraft) {
    return true;
  }

  return (
    JSON.stringify(serializeProjectConfigurationDraft(currentDraft)) ===
    JSON.stringify(serializeProjectConfigurationDraft(loadedDraft))
  );
}

export function ProjectSettingsConfigurationProvider({
  children
}: {
  children: ReactNode;
}) {
  const api = useProjectManagementApi();
  const project = useCurrentProject();
  const projectManagement = useProjectManagement();
  const [draft, setDraft] = useState<ProjectConfigurationDraft | null>(null);
  const [loadedDraft, setLoadedDraft] = useState<ProjectConfigurationDraft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<ProjectSettingsConfigurationMeta["status"]>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextComponentIndexRef = useRef(0);
  const nextEnvVarIndexRef = useRef(0);
  const requestIdRef = useRef(0);

  function resetDraft(nextDraft: ProjectConfigurationDraft) {
    nextComponentIndexRef.current = nextDraft.components.length;
    nextEnvVarIndexRef.current = nextDraft.envVars.length;
    setDraft(nextDraft);
    setLoadedDraft(nextDraft);
    setFieldErrors({});
    setSubmitError(null);
  }

  async function loadSettings(projectId: string) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setStatus("loading");
    setLoadError(null);

    try {
      const detail = await api.getProject(projectId);

      if (requestIdRef.current !== requestId) {
        return;
      }

      resetDraft(
        buildProjectConfigurationDraft({
          projectKey: detail.projectKey,
          displayName: detail.displayName,
          description: detail.description,
          ruleSet: detail.ruleSet,
          components: detail.components,
          envVars: detail.envVars
        })
      );
      setStatus("ready");
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setDraft(null);
      setLoadedDraft(null);
      setFieldErrors({});
      setSubmitError(null);
      setLoadError(getErrorMessage(error));
      setStatus("error");
    }
  }

  useEffect(() => {
    void loadSettings(project.projectId);
  }, [api, project.projectId]);

  function updateDraft(
    recipe: (currentDraft: ProjectConfigurationDraft) => ProjectConfigurationDraft
  ) {
    setDraft((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return recipe(currentDraft);
    });
    setFieldErrors({});
    setSubmitError(null);
  }

  const value: ProjectSettingsConfigurationValue = {
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
              mapSettingsComponentDraft(componentIndex, kind)
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
      discardChanges() {
        if (!loadedDraft) {
          return;
        }

        resetDraft(loadedDraft);
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
      retryLoad() {
        void loadSettings(project.projectId);
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
        if (isSubmitting || !draft) {
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
          setSubmitError("Fix the validation errors before saving project settings.");

          return false;
        }

        setFieldErrors({});
        setSubmitError(null);
        setIsSubmitting(true);

        try {
          const updatedProject = await projectManagement.actions.updateProject(
            project.projectId,
            validation.data
          );

          resetDraft(
            buildProjectConfigurationDraft({
              projectKey: updatedProject.projectKey,
              displayName: updatedProject.displayName,
              description: updatedProject.description,
              ruleSet: updatedProject.ruleSet,
              components: updatedProject.components,
              envVars: updatedProject.envVars
            })
          );

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
              : "Unable to save project settings."
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
      hasUnsavedChanges: !areDraftsEqual(draft, loadedDraft),
      isSubmitting,
      loadError,
      status,
      submitError
    }
  };

  return (
    <ProjectSettingsConfigurationContext.Provider value={value}>
      {children}
    </ProjectSettingsConfigurationContext.Provider>
  );
}

export function useProjectSettingsConfiguration() {
  const value = useContext(ProjectSettingsConfigurationContext);

  if (!value) {
    throw new Error(
      "useProjectSettingsConfiguration must be used within ProjectSettingsConfigurationProvider."
    );
  }

  return value;
}
