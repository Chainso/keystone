import {
  projectConfigSchema,
  type ProjectConfig
} from "../../../../src/keystone/projects/contracts";
import {
  projectTaskCollectionEnvelopeSchema,
  projectCollectionEnvelopeSchema,
  projectDetailEnvelopeSchema,
  type ProjectTaskFilter
} from "../../../../src/http/api/v1/projects/contracts";
import { runCollectionEnvelopeSchema } from "../../../../src/http/api/v1/runs/contracts";
import { getRunPhaseDefinition } from "../../shared/navigation/run-phases";
import { uiScaffoldDataset } from "../resource-model/scaffold-dataset";
import {
  getTask,
  getProjectConfiguration,
  listProjectWorkstreamTasks,
  listRunSummaries
} from "../resource-model/selectors";
import type { ResourceModelDataset } from "../resource-model/types";

export interface CurrentProjectRecord {
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string;
}

export interface ProjectDetailRecord
  extends Omit<CurrentProjectRecord, "description"> {
  description: string | null;
  components: ProjectConfig["components"];
  envVars: ProjectConfig["envVars"];
  ruleSet: ProjectConfig["ruleSet"];
}

export interface ApiProjectRunRecord {
  source: "api";
  runId: string;
  projectId: string;
  workflowInstanceId: string;
  executionEngine: string;
  status: string;
  compiledFrom: {
    specificationRevisionId: string;
    architectureRevisionId: string;
    executionPlanRevisionId: string;
    compiledAt: string;
  } | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface ScaffoldProjectRunRecord {
  source: "scaffold";
  runId: string;
  projectId: string;
  displayId: string;
  summary: string;
  stageLabel: string;
  status: string;
  updatedLabel: string;
  detailPath: string;
}

export type ProjectRunRecord = ApiProjectRunRecord | ScaffoldProjectRunRecord;

export interface ApiProjectTaskRecord {
  source: "api";
  logicalTaskId: string;
  runId: string;
  status: string;
  taskId: string;
  title: string;
  updatedAt: string;
}

export interface ScaffoldProjectTaskRecord {
  source: "scaffold";
  logicalTaskId: string;
  runId: string;
  status: string;
  taskId: string;
  title: string;
  updatedLabel: string;
}

export type ProjectTaskRecord = ApiProjectTaskRecord | ScaffoldProjectTaskRecord;

export interface ProjectTaskListParams {
  filter: ProjectTaskFilter;
  page: number;
  pageSize: number;
}

export interface ProjectTaskCollectionRecord {
  filter: ProjectTaskFilter;
  items: ProjectTaskRecord[];
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
}

export interface ProjectValidationIssue {
  code: string;
  message: string;
  path: Array<string | number>;
}

export class ProjectManagementApiError extends Error {
  code: string;
  issues: ProjectValidationIssue[];
  status: number;

  constructor(input: {
    code: string;
    issues?: ProjectValidationIssue[];
    message: string;
    status: number;
  }) {
    super(input.message);
    this.name = "ProjectManagementApiError";
    this.code = input.code;
    this.issues = input.issues ?? [];
    this.status = input.status;
  }
}

export interface ProjectManagementApi {
  createProject: (config: ProjectConfig) => Promise<CurrentProjectRecord>;
  getProject: (projectId: string) => Promise<ProjectDetailRecord>;
  listProjects: () => Promise<CurrentProjectRecord[]>;
  listProjectRuns: (projectId: string) => Promise<ProjectRunRecord[]>;
  listProjectTasks: (
    projectId: string,
    params: ProjectTaskListParams
  ) => Promise<ProjectTaskCollectionRecord>;
  updateProject: (projectId: string, config: ProjectConfig) => Promise<ProjectDetailRecord>;
}

const currentFetchImplementation: typeof fetch = (...args) => fetch(...args);
const defaultBrowserDevAuth = {
  token: "change-me-local-token",
  tenantId: "tenant-dev-local"
} as const;

declare global {
  interface Window {
    __KESTONE_UI_DEV_AUTH__?:
      | {
          token?: string;
          tenantId?: string;
        }
      | undefined;
  }
}

function resolveBrowserDevAuth() {
  const providedAuth =
    typeof window === "undefined" ? undefined : window.__KESTONE_UI_DEV_AUTH__;

  return {
    token: providedAuth?.token?.trim() || defaultBrowserDevAuth.token,
    tenantId: providedAuth?.tenantId?.trim() || defaultBrowserDevAuth.tenantId
  };
}

export function buildProtectedBrowserHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const auth = resolveBrowserDevAuth();

  nextHeaders.set("Authorization", `Bearer ${auth.token}`);
  nextHeaders.set("X-Keystone-Tenant-Id", auth.tenantId);

  return nextHeaders;
}

function normalizeProjectRecord(project: {
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string | null;
}): CurrentProjectRecord {
  return {
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: project.description ?? ""
  };
}

function normalizeProjectDetailRecord(project: {
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string | null;
  components: ProjectConfig["components"];
  envVars: ProjectConfig["envVars"];
  ruleSet: ProjectConfig["ruleSet"];
}): ProjectDetailRecord {
  return {
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: project.description,
    components: project.components.map((component) => ({
      ...component,
      config: { ...component.config },
      ...(component.ruleOverride
        ? {
            ruleOverride: {
              ...(component.ruleOverride.reviewInstructions
                ? { reviewInstructions: [...component.ruleOverride.reviewInstructions] }
                : {}),
              ...(component.ruleOverride.testInstructions
                ? { testInstructions: [...component.ruleOverride.testInstructions] }
                : {})
            }
          }
        : {})
    })),
    envVars: project.envVars.map((envVar) => ({ ...envVar })),
    ruleSet: {
      reviewInstructions: [...project.ruleSet.reviewInstructions],
      testInstructions: [...project.ruleSet.testInstructions]
    }
  };
}

function normalizeValidationIssues(issues: unknown): ProjectValidationIssue[] {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.flatMap((issue) => {
    if (typeof issue !== "object" || issue === null) {
      return [];
    }

    const path = "path" in issue && Array.isArray(issue.path) ? issue.path : [];
    const code = "code" in issue && typeof issue.code === "string" ? issue.code : "invalid_request";
    const message =
      "message" in issue && typeof issue.message === "string"
        ? issue.message
        : "Project request validation failed.";

    return [
      {
        code,
        message,
        path: path.filter((segment: unknown): segment is string | number =>
          typeof segment === "string" || typeof segment === "number"
        )
      }
    ];
  });
}

async function buildApiError(
  response: Response,
  fallbackMessage: string
): Promise<ProjectManagementApiError> {
  const payload = await response.json().catch(() => null);
  const error =
    payload && typeof payload === "object" && "error" in payload && typeof payload.error === "object"
      ? payload.error
      : null;
  const code =
    error && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : "request_failed";
  const message =
    error && error !== null && "message" in error && typeof error.message === "string"
      ? error.message
      : fallbackMessage;
  const issues =
    error && error !== null && "details" in error && typeof error.details === "object" && error.details
      ? normalizeValidationIssues(
          "issues" in error.details ? (error.details as { issues?: unknown }).issues : undefined
        )
      : [];

  return new ProjectManagementApiError({
    code,
    issues,
    message,
    status: response.status
  });
}

function normalizeRunRecord(run: {
  runId: string;
  projectId: string;
  workflowInstanceId: string;
  executionEngine: string;
  status: string;
  compiledFrom: {
    specificationRevisionId: string;
    architectureRevisionId: string;
    executionPlanRevisionId: string;
    compiledAt: string;
  } | null;
  startedAt: string | null;
  endedAt: string | null;
}): ApiProjectRunRecord {
  return {
    source: "api",
    runId: run.runId,
    projectId: run.projectId,
    workflowInstanceId: run.workflowInstanceId,
    executionEngine: run.executionEngine,
    status: run.status,
    compiledFrom: run.compiledFrom,
    startedAt: run.startedAt,
    endedAt: run.endedAt
  };
}

function normalizeProjectTaskRecord(task: {
  logicalTaskId: string;
  name: string;
  runId: string;
  status: string;
  taskId: string;
  updatedAt: string;
}): ApiProjectTaskRecord {
  return {
    source: "api",
    logicalTaskId: task.logicalTaskId,
    runId: task.runId,
    status: task.status,
    taskId: task.taskId,
    title: task.name,
    updatedAt: task.updatedAt
  };
}

function getProjectTaskFilterBucket(status: string) {
  switch (status.toLowerCase()) {
    case "active":
    case "running":
      return "running" as const;
    case "ready":
    case "pending":
    case "queued":
      return "queued" as const;
    case "blocked":
      return "blocked" as const;
    default:
      return "terminal" as const;
  }
}

function matchesProjectTaskFilter(status: string, filter: ProjectTaskFilter) {
  if (filter === "all") {
    return true;
  }

  const bucket = getProjectTaskFilterBucket(status);

  if (filter === "active") {
    return bucket === "running" || bucket === "queued" || bucket === "blocked";
  }

  return bucket === filter;
}

function buildStaticProjectDetail(
  project: CurrentProjectRecord,
  dataset: ResourceModelDataset
): ProjectDetailRecord | null {
  const configuration = getProjectConfiguration(project.projectId, dataset);

  if (!configuration) {
    return null;
  }

  return normalizeProjectDetailRecord({
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: project.description,
    ruleSet: {
      reviewInstructions: [...configuration.rules.reviewInstructions],
      testInstructions: [...configuration.rules.testInstructions]
    },
    components: configuration.components.map((component) => ({
      componentKey: component.componentKey,
      displayName: component.displayName,
      kind: component.kind,
      config:
        component.sourceMode === "localPath"
          ? {
              ...(component.localPath ? { localPath: component.localPath } : {}),
              ...(component.defaultRef ? { ref: component.defaultRef } : {})
            }
          : {
              ...(component.gitUrl ? { gitUrl: component.gitUrl } : {}),
              ...(component.defaultRef ? { ref: component.defaultRef } : {})
            },
      ...(component.reviewInstructions.length > 0 || component.testInstructions.length > 0
        ? {
            ruleOverride: {
              ...(component.reviewInstructions.length > 0
                ? { reviewInstructions: [...component.reviewInstructions] }
                : {}),
              ...(component.testInstructions.length > 0
                ? { testInstructions: [...component.testInstructions] }
                : {})
            }
          }
        : {})
    })),
    envVars: configuration.environmentVariables.map((envVar) => ({
      name: envVar.name,
      value: envVar.value
    }))
  });
}

export function createBrowserProjectManagementApi(
  fetchImplementation: typeof fetch = currentFetchImplementation
): ProjectManagementApi {
  return {
    async createProject(config) {
      const response = await fetchImplementation("/v1/projects", {
        method: "POST",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json",
          "content-type": "application/json"
        }),
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw await buildApiError(response, `Unable to create project (${response.status}).`);
      }

      const payload = projectDetailEnvelopeSchema.parse(await response.json());

      return normalizeProjectRecord(payload.data);
    },
    async getProject(projectId) {
      const response = await fetchImplementation(`/v1/projects/${encodeURIComponent(projectId)}`, {
        method: "GET",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json"
        })
      });

      if (!response.ok) {
        throw await buildApiError(response, `Unable to load project settings (${response.status}).`);
      }

      const payload = projectDetailEnvelopeSchema.parse(await response.json());

      return normalizeProjectDetailRecord(payload.data);
    },
    async listProjects() {
      const response = await fetchImplementation("/v1/projects", {
        method: "GET",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json"
        })
      });

      if (!response.ok) {
        throw new Error(`Unable to load projects (${response.status}).`);
      }

      const payload = projectCollectionEnvelopeSchema.parse(await response.json());

      return payload.data.items.map(normalizeProjectRecord);
    },
    async listProjectRuns(projectId) {
      const response = await fetchImplementation(`/v1/projects/${encodeURIComponent(projectId)}/runs`, {
        method: "GET",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json"
        })
      });

      if (!response.ok) {
        throw new Error(`Unable to load runs (${response.status}).`);
      }

      const payload = runCollectionEnvelopeSchema.parse(await response.json());

      return payload.data.items.map(normalizeRunRecord);
    },
    async listProjectTasks(projectId, params) {
      const searchParams = new URLSearchParams({
        filter: params.filter,
        page: String(params.page),
        pageSize: String(params.pageSize)
      });
      const response = await fetchImplementation(
        `/v1/projects/${encodeURIComponent(projectId)}/tasks?${searchParams.toString()}`,
        {
          method: "GET",
          credentials: "same-origin",
          headers: buildProtectedBrowserHeaders({
            accept: "application/json"
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Unable to load workstreams (${response.status}).`);
      }

      const payload = projectTaskCollectionEnvelopeSchema.parse(await response.json());

      return {
        filter: payload.data.filter,
        items: payload.data.items.map(normalizeProjectTaskRecord),
        page: payload.data.page,
        pageCount: payload.data.pageCount,
        pageSize: payload.data.pageSize,
        total: payload.data.total
      };
    },
    async updateProject(projectId, config) {
      const response = await fetchImplementation(`/v1/projects/${encodeURIComponent(projectId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json",
          "content-type": "application/json"
        }),
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw await buildApiError(response, `Unable to save project settings (${response.status}).`);
      }

      const payload = projectDetailEnvelopeSchema.parse(await response.json());

      return normalizeProjectDetailRecord(payload.data);
    }
  };
}

export function createStaticProjectManagementApi(
  projects: CurrentProjectRecord[],
  dataset: ResourceModelDataset = uiScaffoldDataset
): ProjectManagementApi {
  let currentProjects = [...projects];
  const currentProjectDetails = new Map<string, ProjectDetailRecord>();

  currentProjects.forEach((project) => {
    const detail = buildStaticProjectDetail(project, dataset);

    if (detail) {
      currentProjectDetails.set(project.projectId, detail);
    }
  });

  return {
    async createProject(config) {
      const parsedConfig = projectConfigSchema.parse(config);
      const createdProject: CurrentProjectRecord = {
        projectId: `project-${parsedConfig.projectKey}`,
        projectKey: parsedConfig.projectKey,
        displayName: parsedConfig.displayName,
        description: parsedConfig.description ?? ""
      };
      const createdDetail = normalizeProjectDetailRecord({
        ...createdProject,
        components: parsedConfig.components,
        envVars: parsedConfig.envVars,
        ruleSet: parsedConfig.ruleSet
      });

      currentProjects = [...currentProjects, createdProject];
      currentProjectDetails.set(createdProject.projectId, createdDetail);

      return createdProject;
    },
    async getProject(projectId) {
      const project = currentProjectDetails.get(projectId);

      if (!project) {
        throw new Error(`Project ${projectId} was not found.`);
      }

      return normalizeProjectDetailRecord(project);
    },
    async listProjects() {
      return currentProjects;
    },
    async listProjectRuns(projectId) {
      return listRunSummaries(projectId, dataset).map((run) => ({
        source: "scaffold" as const,
        runId: run.runId,
        projectId,
        displayId: run.displayId,
        summary: run.summary,
        stageLabel: getRunPhaseDefinition(run.defaultPhaseId).label,
        status: run.status,
        updatedLabel: run.updatedLabel,
        detailPath: run.detailPath
      }));
    },
    async listProjectTasks(projectId, params) {
      const projectTasks = listProjectWorkstreamTasks(projectId, dataset).map((row) => {
        const task = getTask(row.taskId, dataset);

        if (!task) {
          throw new Error(`Task ${row.taskId} was not found.`);
        }

        return {
          source: "scaffold" as const,
          logicalTaskId: task.displayId,
          runId: task.runId,
          status: task.status,
          taskId: task.taskId,
          title: task.title,
          updatedLabel: task.updatedLabel
        };
      });
      const filteredTasks = projectTasks.filter((task) =>
        matchesProjectTaskFilter(task.status, params.filter)
      );
      const pageCount = Math.max(1, Math.ceil(filteredTasks.length / params.pageSize));
      const startIndex = (params.page - 1) * params.pageSize;

      return {
        filter: params.filter,
        items: filteredTasks.slice(startIndex, startIndex + params.pageSize),
        page: params.page,
        pageCount,
        pageSize: params.pageSize,
        total: filteredTasks.length
      };
    },
    async updateProject(projectId, config) {
      const parsedConfig = projectConfigSchema.parse(config);
      const existingProject = currentProjects.find((project) => project.projectId === projectId);

      if (!existingProject) {
        throw new Error(`Project ${projectId} was not found.`);
      }

      const updatedProject: ProjectDetailRecord = normalizeProjectDetailRecord({
        projectId,
        projectKey: parsedConfig.projectKey,
        displayName: parsedConfig.displayName,
        description: parsedConfig.description ?? "",
        components: parsedConfig.components,
        envVars: parsedConfig.envVars,
        ruleSet: parsedConfig.ruleSet
      });

      currentProjects = currentProjects.map((project) =>
        project.projectId === projectId ? normalizeProjectRecord(updatedProject) : project
      );
      currentProjectDetails.set(projectId, updatedProject);

      return normalizeProjectDetailRecord(updatedProject);
    }
  };
}
