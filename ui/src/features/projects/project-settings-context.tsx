import {
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";

import { projectConfigSchema } from "../../../../src/keystone/projects/contracts";
import { buildProjectConfigurationComponentDraft } from "./project-configuration-scaffold";
import {
  ProjectConfigurationContext,
  buildProjectConfigurationModeMeta,
  type ProjectConfigurationValue,
  useProjectConfiguration
} from "./project-configuration-context";
import {
  buildProjectConfigurationDraft,
  buildProjectConfigurationFieldErrors,
  removeStringListItem,
  serializeProjectConfigurationDraft,
  updateStringList,
  type ProjectComponentKind,
  type ProjectConfigurationComponentDraft,
  type ProjectConfigurationDraft
} from "./project-configuration-form";
import { ProjectManagementApiError } from "./project-management-api";
import {
  useProjectManagement,
  useProjectManagementApi
} from "./project-context";

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
  const projectManagement = useProjectManagement();
  const project = projectManagement.state.currentProject;
  const [draft, setDraft] = useState<ProjectConfigurationDraft | null>(null);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [loadedDraft, setLoadedDraft] = useState<ProjectConfigurationDraft | null>(null);
  const [loadedDraftProjectId, setLoadedDraftProjectId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingProjectId, setSubmittingProjectId] = useState<string | null>(null);
  const nextComponentIndexRef = useRef(0);
  const nextEnvVarIndexRef = useRef(0);
  const requestIdRef = useRef(0);
  const submitRequestIdRef = useRef(0);
  const currentProjectIdRef = useRef<string | null>(project?.projectId ?? null);

  currentProjectIdRef.current = project?.projectId ?? null;

  function resetDraft(nextDraft: ProjectConfigurationDraft, projectId: string) {
    nextComponentIndexRef.current = nextDraft.components.length;
    nextEnvVarIndexRef.current = nextDraft.envVars.length;
    setDraft(nextDraft);
    setDraftProjectId(projectId);
    setLoadedDraft(nextDraft);
    setLoadedDraftProjectId(projectId);
    setFieldErrors({});
    setSubmitError(null);
  }

  function clearDraftState() {
    setDraft(null);
    setDraftProjectId(null);
    setLoadedDraft(null);
    setLoadedDraftProjectId(null);
    setFieldErrors({});
    setSubmitError(null);
  }

  async function loadSettings(projectId: string) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setStatus("loading");
    setLoadError(null);
    clearDraftState();

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
        }),
        projectId
      );
      setStatus("ready");
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      clearDraftState();
      setLoadError(getErrorMessage(error));
      setStatus("error");
    }
  }

  const unresolvedProjectStatus = project ? null : projectManagement.meta.status;
  const unresolvedProjectError = project ? null : projectManagement.meta.errorMessage;

  useEffect(() => {
    if (project?.projectId) {
      void loadSettings(project.projectId);
      return;
    }

    requestIdRef.current += 1;
    clearDraftState();

    if (projectManagement.meta.status === "loading") {
      setLoadError(null);
      setStatus("loading");
      return;
    }

    setLoadError(projectManagement.meta.errorMessage ?? "Unable to load project settings.");
    setStatus("error");
  }, [api, project?.projectId, unresolvedProjectError, unresolvedProjectStatus]);

  function updateDraft(
    recipe: (currentDraft: ProjectConfigurationDraft) => ProjectConfigurationDraft
  ) {
    setDraft((currentDraft) => {
      const isCurrentProjectSubmitting =
        isSubmitting && submittingProjectId === currentProjectIdRef.current;

      if (!currentDraft || draftProjectId !== currentProjectIdRef.current || isCurrentProjectSubmitting) {
        return currentDraft;
      }

      return recipe(currentDraft);
    });
    setFieldErrors({});
    setSubmitError(null);
  }

  const currentDraft = project && draftProjectId === project.projectId ? draft : null;
  const currentLoadedDraft =
    project && loadedDraftProjectId === project.projectId ? loadedDraft : null;
  const effectiveStatus =
    status === "ready" && !currentDraft ? "loading" : status;
  const effectiveSubmitError =
    submittingProjectId === null || submittingProjectId === project?.projectId ? submitError : null;
  const effectiveIsSubmitting = Boolean(
    project && isSubmitting && submittingProjectId === project.projectId
  );

  const value: ProjectConfigurationValue = {
    state: {
      draft: currentDraft,
      fieldErrors,
      projectId: currentDraft && project ? project.projectId : null
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
      runSecondaryAction() {
        if (!project || !currentLoadedDraft || effectiveIsSubmitting) {
          return;
        }

        resetDraft(currentLoadedDraft, project.projectId);
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
        if (project) {
          void loadSettings(project.projectId);
          return;
        }

        void projectManagement.actions.reloadProjects();
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
        const activeProjectId = currentProjectIdRef.current;
        const draftToSubmit = draftProjectId === activeProjectId ? draft : null;

        if (effectiveIsSubmitting || !activeProjectId || !draftToSubmit) {
          return false;
        }

        const validation = projectConfigSchema.safeParse(
          serializeProjectConfigurationDraft(draftToSubmit)
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
        setSubmittingProjectId(activeProjectId);
        const submitRequestId = submitRequestIdRef.current + 1;
        submitRequestIdRef.current = submitRequestId;

        try {
          const updatedProject = await projectManagement.actions.updateProject(
            activeProjectId,
            validation.data
          );

          if (submitRequestIdRef.current !== submitRequestId) {
            return false;
          }

          if (currentProjectIdRef.current === activeProjectId) {
            resetDraft(
              buildProjectConfigurationDraft({
                projectKey: updatedProject.projectKey,
                displayName: updatedProject.displayName,
                description: updatedProject.description,
                ruleSet: updatedProject.ruleSet,
                components: updatedProject.components,
                envVars: updatedProject.envVars
              }),
              activeProjectId
            );
            setStatus("ready");
          }

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
          if (submitRequestIdRef.current === submitRequestId) {
            setIsSubmitting(false);
            setSubmittingProjectId(null);
          }
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
            ...(field === "description"
              ? {
                  description: value,
                  descriptionWasNull:
                    value === "" ? currentDraft.overview.descriptionWasNull : false
                }
              : {
                  [field]: value
                })
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
      hasUnsavedChanges: !areDraftsEqual(currentDraft, currentLoadedDraft),
      isSubmitting: effectiveIsSubmitting,
      loadError,
      mode: buildProjectConfigurationModeMeta("settings"),
      status: effectiveStatus,
      submitError: effectiveSubmitError
    }
  };

  return (
    <ProjectConfigurationContext.Provider value={value}>
      {children}
    </ProjectConfigurationContext.Provider>
  );
}

export function useProjectSettingsConfiguration() {
  return useProjectConfiguration();
}
