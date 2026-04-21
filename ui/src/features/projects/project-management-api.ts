import { projectCollectionEnvelopeSchema } from "../../../../src/http/api/v1/projects/contracts";
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

export interface ProjectManagementApi {
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
  return {
    async listProjects() {
      return projects;
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
