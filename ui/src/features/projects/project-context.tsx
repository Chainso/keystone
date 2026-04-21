import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";

import { ResourceModelProvider, useCurrentResourceProject } from "../resource-model/context";
import {
  createProjectOverrideDataset,
  selectCurrentProjectSummary
} from "../resource-model/selectors";
import {
  createBrowserProjectManagementApi,
  type CurrentProjectRecord,
  type ProjectDetailRecord,
  type ProjectManagementApi
} from "./project-management-api";
import type { ProjectConfig } from "../../../../src/keystone/projects/contracts";

export type CurrentProject = CurrentProjectRecord;

export interface ProjectManagementState {
  currentProject: CurrentProject | null;
  currentProjectId: string | null;
  projects: CurrentProject[];
}

export interface ProjectManagementActions {
  createProject: (config: ProjectConfig) => Promise<CurrentProject>;
  reloadProjects: () => Promise<void>;
  selectProject: (projectId: string) => void;
  updateProject: (projectId: string, config: ProjectConfig) => Promise<ProjectDetailRecord>;
}

export interface ProjectManagementMeta {
  errorMessage: string | null;
  source: "api" | "provided";
  status: "loading" | "ready" | "empty" | "error";
  storageKey: string;
}

export interface ProjectManagementValue {
  state: ProjectManagementState;
  actions: ProjectManagementActions;
  meta: ProjectManagementMeta;
}

interface CurrentProjectProviderProps {
  api?: ProjectManagementApi;
  children: ReactNode;
  project?: CurrentProject;
}

interface ProjectManagementSnapshot {
  currentProjectId: string | null;
  errorMessage: string | null;
  projects: CurrentProject[];
  status: ProjectManagementMeta["status"];
}

interface LoadProjectsOptions {
  fallbackProject?: CurrentProject | undefined;
  preserveStatus?: boolean;
  preferredProjectId?: string | null;
}

const browserProjectManagementApi = createBrowserProjectManagementApi();
const ProjectManagementApiContext = createContext<ProjectManagementApi | null>(null);
const ProjectManagementContext = createContext<ProjectManagementValue | null>(null);
const scaffoldProject = selectCurrentProjectSummary();

export const currentProjectStorageKey = "keystone.ui.current-project.v1";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function readStoredProjectId() {
  try {
    return getStorage()?.getItem(currentProjectStorageKey) ?? null;
  } catch {
    return null;
  }
}

function writeStoredProjectId(projectId: string | null) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    if (projectId) {
      storage.setItem(currentProjectStorageKey, projectId);
      return;
    }

    storage.removeItem(currentProjectStorageKey);
  } catch {
    // Ignore storage failures and keep the in-memory selection usable.
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load projects.";
}

function resolveCurrentProject(
  projects: CurrentProject[],
  requestedProjectId: string | null
) {
  if (projects.length === 0) {
    return null;
  }

  return (
    (requestedProjectId
      ? projects.find((project) => project.projectId === requestedProjectId)
      : null) ?? projects[0]!
  );
}

function buildProvidedSnapshot(project: CurrentProject): ProjectManagementSnapshot {
  const compatibilityProject =
    project.projectId === scaffoldProject.projectId &&
    project.projectKey === scaffoldProject.projectKey &&
    project.displayName === scaffoldProject.displayName &&
    project.description === scaffoldProject.description
      ? scaffoldProject
      : project;

  return {
    currentProjectId: compatibilityProject.projectId,
    errorMessage: null,
    projects: [compatibilityProject],
    status: "ready"
  };
}

function upsertProjectRecord(
  projects: CurrentProject[],
  project: CurrentProject
) {
  const existingProjectIndex = projects.findIndex(
    (candidate) => candidate.projectId === project.projectId
  );

  if (existingProjectIndex === -1) {
    return [...projects, project];
  }

  return projects.map((candidate, index) =>
    index === existingProjectIndex ? project : candidate
  );
}

function syncProjectSnapshot(
  snapshot: ProjectManagementSnapshot,
  project: CurrentProject
): ProjectManagementSnapshot {
  return {
    currentProjectId: project.projectId,
    errorMessage: null,
    projects: upsertProjectRecord(snapshot.projects, project),
    status: "ready"
  };
}

function deriveSnapshotStatus(
  projects: CurrentProject[],
  currentProjectId: string | null
): ProjectManagementMeta["status"] {
  if (projects.length === 0) {
    return "empty";
  }

  return resolveCurrentProject(projects, currentProjectId) ? "ready" : "ready";
}

function ProjectManagementCompatibilityProvider({
  children,
  currentProjectId,
  providedProject
}: {
  children: ReactNode;
  currentProjectId: string | null;
  providedProject?: CurrentProject;
}) {
  const providerProps = providedProject
    ? {
        currentProjectId: providedProject.projectId,
        dataset: createProjectOverrideDataset(providedProject)
      }
    : currentProjectId
      ? { currentProjectId }
      : {};

  return (
    <ResourceModelProvider {...providerProps}>{children}</ResourceModelProvider>
  );
}

export function CurrentProjectProvider({
  api = browserProjectManagementApi,
  children,
  project
}: CurrentProjectProviderProps) {
  const [snapshot, setSnapshot] = useState<ProjectManagementSnapshot>(() => {
    if (project) {
      return buildProvidedSnapshot(project);
    }

    return {
      currentProjectId: null,
      errorMessage: null,
      projects: [],
      status: "loading"
    };
  });
  const requestIdRef = useRef(0);
  const selectedProjectIdRef = useRef<string | null>(project?.projectId ?? null);

  async function loadProjects(options: LoadProjectsOptions = {}) {
    if (project) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!options.preserveStatus) {
      setSnapshot((current) => ({
        ...current,
        errorMessage: null,
        status: "loading"
      }));
    }

    try {
      const projects = await api.listProjects();

      if (requestIdRef.current !== requestId) {
        return;
      }

      const preferredProjectId =
        options.preferredProjectId ?? selectedProjectIdRef.current ?? readStoredProjectId();
      const currentProject = resolveCurrentProject(projects, preferredProjectId);
      const nextProjectId = currentProject?.projectId ?? null;

      selectedProjectIdRef.current = nextProjectId;
      writeStoredProjectId(nextProjectId);
      setSnapshot({
        currentProjectId: nextProjectId,
        errorMessage: null,
        projects,
        status: currentProject ? "ready" : "empty"
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (options.fallbackProject) {
        const fallbackProject = options.fallbackProject;

        selectedProjectIdRef.current = fallbackProject.projectId;
        writeStoredProjectId(fallbackProject.projectId);
        setSnapshot((current) => ({
          currentProjectId: fallbackProject.projectId,
          errorMessage: null,
          projects: upsertProjectRecord(current.projects, fallbackProject),
          status: "ready"
        }));

        return;
      }

      selectedProjectIdRef.current = null;
      setSnapshot({
        currentProjectId: null,
        errorMessage: getErrorMessage(error),
        projects: [],
        status: "error"
      });
    }
  }

  useEffect(() => {
    if (project) {
      selectedProjectIdRef.current = project.projectId;
      setSnapshot(buildProvidedSnapshot(project));
      return;
    }

    void loadProjects();
  }, [api, project]);

  const currentProject = resolveCurrentProject(snapshot.projects, snapshot.currentProjectId);
  const value: ProjectManagementValue = {
    state: {
      currentProject,
      currentProjectId: currentProject?.projectId ?? null,
      projects: snapshot.projects
    },
    actions: {
      async createProject(config) {
        const createdProject = await api.createProject(config);
        selectedProjectIdRef.current = createdProject.projectId;
        await loadProjects({
          fallbackProject: createdProject,
          preferredProjectId: createdProject.projectId,
          preserveStatus: true
        });

        return createdProject;
      },
      async reloadProjects() {
        await loadProjects();
      },
      selectProject(projectId) {
        setSnapshot((current) => {
          const nextProject = current.projects.find((candidate) => candidate.projectId === projectId);

          if (!nextProject) {
            return current;
          }

          selectedProjectIdRef.current = nextProject.projectId;
          writeStoredProjectId(nextProject.projectId);

          return {
            ...current,
            currentProjectId: nextProject.projectId,
            errorMessage: null,
            status: "ready"
          };
        });
      },
      async updateProject(projectId, config) {
        const updatedProject = await api.updateProject(projectId, config);
        const nextProject = {
          projectId: updatedProject.projectId,
          projectKey: updatedProject.projectKey,
          displayName: updatedProject.displayName,
          description: updatedProject.description ?? ""
        };
        const shouldKeepProjectSelected = selectedProjectIdRef.current === nextProject.projectId;

        setSnapshot((current) => {
          const nextProjects = upsertProjectRecord(current.projects, nextProject);

          if (shouldKeepProjectSelected) {
            selectedProjectIdRef.current = nextProject.projectId;
            writeStoredProjectId(nextProject.projectId);

            return syncProjectSnapshot(current, nextProject);
          }

          return {
            currentProjectId: current.currentProjectId,
            errorMessage: current.errorMessage,
            projects: nextProjects,
            status: deriveSnapshotStatus(nextProjects, current.currentProjectId)
          };
        });

        return updatedProject;
      }
    },
    meta: {
      errorMessage: snapshot.errorMessage,
      source: project ? "provided" : "api",
      status: snapshot.status,
      storageKey: currentProjectStorageKey
    }
  };

  return (
    <ProjectManagementApiContext.Provider value={api}>
      <ProjectManagementContext.Provider value={value}>
        <ProjectManagementCompatibilityProvider
          currentProjectId={value.state.currentProjectId}
          {...(project ? { providedProject: project } : {})}
        >
          {children}
        </ProjectManagementCompatibilityProvider>
      </ProjectManagementContext.Provider>
    </ProjectManagementApiContext.Provider>
  );
}

export function useProjectManagement() {
  const value = useContext(ProjectManagementContext);

  if (!value) {
    throw new Error("useProjectManagement must be used within CurrentProjectProvider.");
  }

  return value;
}

export function useProjectManagementApi() {
  const value = useContext(ProjectManagementApiContext);

  if (!value) {
    throw new Error("useProjectManagementApi must be used within CurrentProjectProvider.");
  }

  return value;
}

export function useCurrentProject() {
  const projectManagement = useContext(ProjectManagementContext);
  const resourceProject = useCurrentResourceProject();

  if (projectManagement?.state.currentProject) {
    return projectManagement.state.currentProject;
  }

  return resourceProject;
}
