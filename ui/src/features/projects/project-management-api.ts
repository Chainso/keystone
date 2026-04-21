import {
  projectConfigSchema,
  type ProjectConfig
} from "../../../../src/keystone/projects/contracts";
import {
  projectCollectionEnvelopeSchema,
  projectDetailEnvelopeSchema
} from "../../../../src/http/api/v1/projects/contracts";
import { runCollectionEnvelopeSchema } from "../../../../src/http/api/v1/runs/contracts";
import { getRunPhaseDefinition } from "../../shared/navigation/run-phases";
import { uiScaffoldDataset } from "../resource-model/scaffold-dataset";
import { listRunSummaries } from "../resource-model/selectors";
import type { ResourceModelDataset } from "../resource-model/types";

export interface CurrentProjectRecord {
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string;
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
  listProjects: () => Promise<CurrentProjectRecord[]>;
  listProjectRuns: (projectId: string) => Promise<ProjectRunRecord[]>;
}

const currentFetchImplementation: typeof fetch = (...args) => fetch(...args);

function normalizeProjectRecord(project: {
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string | null;
}) {
  return {
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: project.description ?? ""
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

export function createBrowserProjectManagementApi(
  fetchImplementation: typeof fetch = currentFetchImplementation
): ProjectManagementApi {
  return {
    async createProject(config) {
      const response = await fetchImplementation("/v1/projects", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw await buildApiError(response, `Unable to create project (${response.status}).`);
      }

      const payload = projectDetailEnvelopeSchema.parse(await response.json());

      return normalizeProjectRecord(payload.data);
    },
    async listProjects() {
      const response = await fetchImplementation("/v1/projects", {
        method: "GET",
        credentials: "same-origin",
        headers: {
          accept: "application/json"
        }
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
        headers: {
          accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Unable to load runs (${response.status}).`);
      }

      const payload = runCollectionEnvelopeSchema.parse(await response.json());

      return payload.data.items.map(normalizeRunRecord);
    }
  };
}

export function createStaticProjectManagementApi(
  projects: CurrentProjectRecord[],
  dataset: ResourceModelDataset = uiScaffoldDataset
): ProjectManagementApi {
  let currentProjects = [...projects];

  return {
    async createProject(config) {
      const parsedConfig = projectConfigSchema.parse(config);
      const createdProject = {
        projectId: `project-${parsedConfig.projectKey}`,
        projectKey: parsedConfig.projectKey,
        displayName: parsedConfig.displayName,
        description: parsedConfig.description ?? ""
      };

      currentProjects = [...currentProjects, createdProject];

      return createdProject;
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
    }
  };
}
