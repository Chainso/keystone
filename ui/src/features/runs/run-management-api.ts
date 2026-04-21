import {
  artifactCollectionEnvelopeSchema,
  type ArtifactResource
} from "../../../../src/http/api/v1/artifacts/contracts";
import {
  documentCollectionEnvelopeSchema,
  documentRevisionDetailEnvelopeSchema,
  type DocumentResource,
  type DocumentRevisionResource
} from "../../../../src/http/api/v1/documents/contracts";
import {
  runDetailEnvelopeSchema,
  taskCollectionEnvelopeSchema,
  workflowGraphDetailEnvelopeSchema,
  type RunResource,
  type TaskResource,
  type WorkflowGraphResource
} from "../../../../src/http/api/v1/runs/contracts";
import { buildProtectedBrowserHeaders } from "../projects/project-management-api";

export interface StaticRunDocumentRevisionRecord {
  content: string;
  revision: DocumentRevisionResource;
}

export interface StaticRunDetailRecord {
  artifactContents?: Record<string, string>;
  documents?: DocumentResource[];
  revisions?: StaticRunDocumentRevisionRecord[];
  run: RunResource;
  taskArtifacts?: Record<string, ArtifactResource[]>;
  tasks?: TaskResource[];
  workflow?: WorkflowGraphResource;
}

export interface RunManagementApi {
  getArtifactContent: (contentUrl: string) => Promise<string>;
  getDocumentContent: (contentUrl: string) => Promise<string>;
  getRun: (runId: string) => Promise<RunResource>;
  getRunDocumentRevision: (
    runId: string,
    documentId: string,
    documentRevisionId: string
  ) => Promise<DocumentRevisionResource>;
  getRunWorkflow: (runId: string) => Promise<WorkflowGraphResource>;
  listRunDocuments: (runId: string) => Promise<DocumentResource[]>;
  listRunTasks: (runId: string) => Promise<TaskResource[]>;
  listTaskArtifacts: (runId: string, taskId: string) => Promise<ArtifactResource[]>;
}

export interface RunValidationIssue {
  code: string;
  message: string;
  path: Array<string | number>;
}

export class RunManagementApiError extends Error {
  code: string;
  issues: RunValidationIssue[];
  status: number;

  constructor(input: {
    code: string;
    issues?: RunValidationIssue[];
    message: string;
    status: number;
  }) {
    super(input.message);
    this.name = "RunManagementApiError";
    this.code = input.code;
    this.issues = input.issues ?? [];
    this.status = input.status;
  }
}

const currentFetchImplementation: typeof fetch = (...args) => fetch(...args);

function normalizeValidationIssues(issues: unknown): RunValidationIssue[] {
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
        : "Run request validation failed.";

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
): Promise<RunManagementApiError> {
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

  return new RunManagementApiError({
    code,
    issues,
    message,
    status: response.status
  });
}

export function createBrowserRunManagementApi(
  fetchImplementation: typeof fetch = currentFetchImplementation
): RunManagementApi {
  async function getProtectedTextContent(contentUrl: string, fallbackMessage: string) {
    const response = await fetchImplementation(contentUrl, {
      method: "GET",
      credentials: "same-origin",
      headers: buildProtectedBrowserHeaders({
        accept: "text/plain, text/markdown, application/octet-stream;q=0.9"
      })
    });

    if (!response.ok) {
      throw await buildApiError(response, fallbackMessage);
    }

    return response.text();
  }

  return {
    async getArtifactContent(contentUrl) {
      return getProtectedTextContent(contentUrl, "Unable to load artifact content.");
    },
    async getDocumentContent(contentUrl) {
      return getProtectedTextContent(contentUrl, "Unable to load document content.");
    },
    async getRun(runId) {
      const response = await fetchImplementation(`/v1/runs/${encodeURIComponent(runId)}`, {
        method: "GET",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json"
        })
      });

      if (!response.ok) {
        throw await buildApiError(response, `Unable to load run (${response.status}).`);
      }

      const payload = runDetailEnvelopeSchema.parse(await response.json());

      return payload.data;
    },
    async getRunDocumentRevision(runId, documentId, documentRevisionId) {
      const response = await fetchImplementation(
        `/v1/runs/${encodeURIComponent(runId)}/documents/${encodeURIComponent(
          documentId
        )}/revisions/${encodeURIComponent(documentRevisionId)}`,
        {
          method: "GET",
          credentials: "same-origin",
          headers: buildProtectedBrowserHeaders({
            accept: "application/json"
          })
        }
      );

      if (!response.ok) {
        throw await buildApiError(
          response,
          `Unable to load document revision (${response.status}).`
        );
      }

      const payload = documentRevisionDetailEnvelopeSchema.parse(await response.json());

      return payload.data;
    },
    async getRunWorkflow(runId) {
      const response = await fetchImplementation(`/v1/runs/${encodeURIComponent(runId)}/workflow`, {
        method: "GET",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json"
        })
      });

      if (!response.ok) {
        throw await buildApiError(
          response,
          `Unable to load execution workflow (${response.status}).`
        );
      }

      const payload = workflowGraphDetailEnvelopeSchema.parse(await response.json());

      return payload.data;
    },
    async listRunDocuments(runId) {
      const response = await fetchImplementation(`/v1/runs/${encodeURIComponent(runId)}/documents`, {
        method: "GET",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json"
        })
      });

      if (!response.ok) {
        throw await buildApiError(
          response,
          `Unable to load run documents (${response.status}).`
        );
      }

      const payload = documentCollectionEnvelopeSchema.parse(await response.json());

      return payload.data.items;
    },
    async listRunTasks(runId) {
      const response = await fetchImplementation(`/v1/runs/${encodeURIComponent(runId)}/tasks`, {
        method: "GET",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json"
        })
      });

      if (!response.ok) {
        throw await buildApiError(response, `Unable to load run tasks (${response.status}).`);
      }

      const payload = taskCollectionEnvelopeSchema.parse(await response.json());

      return payload.data.items;
    },
    async listTaskArtifacts(runId, taskId) {
      const response = await fetchImplementation(
        `/v1/runs/${encodeURIComponent(runId)}/tasks/${encodeURIComponent(taskId)}/artifacts`,
        {
          method: "GET",
          credentials: "same-origin",
          headers: buildProtectedBrowserHeaders({
            accept: "application/json"
          })
        }
      );

      if (!response.ok) {
        throw await buildApiError(
          response,
          `Unable to load task artifacts (${response.status}).`
        );
      }

      const payload = artifactCollectionEnvelopeSchema.parse(await response.json());

      return payload.data.items;
    }
  };
}

export function createStaticRunManagementApi(
  runs: Record<string, StaticRunDetailRecord> | StaticRunDetailRecord[]
): RunManagementApi {
  const runRecords = new Map(
    Array.isArray(runs)
      ? runs.map((run) => [run.run.runId, run] as const)
      : Object.entries(runs)
  );

  function getStaticRunRecord(runId: string) {
    const run = runRecords.get(runId);

    if (!run) {
      throw new RunManagementApiError({
        code: "run_not_found",
        message: `Run ${runId} was not found.`,
        status: 404
      });
    }

    return run;
  }

  function getStaticContent(contentUrl: string) {
    for (const run of runRecords.values()) {
      const revisionRecord = run.revisions?.find(
        (candidate) => candidate.revision.contentUrl === contentUrl
      );

      if (revisionRecord) {
        return revisionRecord.content;
      }

      const artifactContent = run.artifactContents?.[contentUrl];

      if (artifactContent) {
        return artifactContent;
      }
    }

    throw new Error(`Artifact content ${contentUrl} was not found.`);
  }

  return {
    async getArtifactContent(contentUrl) {
      return getStaticContent(contentUrl);
    },
    async getDocumentContent(contentUrl) {
      return getStaticContent(contentUrl);
    },
    async getRun(runId) {
      return getStaticRunRecord(runId).run;
    },
    async getRunDocumentRevision(runId, documentId, documentRevisionId) {
      const run = getStaticRunRecord(runId);
      const revision = run.revisions?.find(
        (candidate) =>
          candidate.revision.documentRevisionId === documentRevisionId &&
          run.documents?.some((document) => document.documentId === documentId)
      );

      if (!revision) {
        throw new RunManagementApiError({
          code: "document_revision_not_found",
          message: `Document revision ${documentRevisionId} was not found for run ${runId}.`,
          status: 404
        });
      }

      return revision.revision;
    },
    async getRunWorkflow(runId) {
      return (
        getStaticRunRecord(runId).workflow ?? {
          edges: [],
          nodes: [],
          summary: {
            activeTasks: 0,
            cancelledTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            pendingTasks: 0,
            readyTasks: 0,
            totalTasks: 0
          }
        }
      );
    },
    async listRunDocuments(runId) {
      return getStaticRunRecord(runId).documents ?? [];
    },
    async listRunTasks(runId) {
      return getStaticRunRecord(runId).tasks ?? [];
    },
    async listTaskArtifacts(runId, taskId) {
      const run = getStaticRunRecord(runId);

      return run.taskArtifacts?.[taskId] ?? [];
    }
  };
}
