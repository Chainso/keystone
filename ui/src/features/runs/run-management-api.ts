import {
  artifactCollectionEnvelopeSchema,
  type ArtifactResource
} from "../../../../src/http/api/v1/artifacts/contracts";
import {
  documentCreateRequestSchema,
  documentCollectionEnvelopeSchema,
  documentDetailEnvelopeSchema,
  documentRevisionCreateRequestSchema,
  documentRevisionDetailEnvelopeSchema,
  type DocumentCreateRequest,
  type DocumentResource,
  type DocumentRevisionCreateRequest,
  type DocumentRevisionResource
} from "../../../../src/http/api/v1/documents/contracts";
import {
  runDetailEnvelopeSchema,
  runCreateRequestSchema,
  taskCollectionEnvelopeSchema,
  workflowGraphDetailEnvelopeSchema,
  type RunCreateRequest,
  type RunResource,
  type TaskResource,
  type WorkflowGraphResource
} from "../../../../src/http/api/v1/runs/contracts";
import { buildProtectedBrowserHeaders } from "../projects/project-management-api";

export interface StaticRunDocumentRevisionRecord {
  content: string;
  documentId?: string;
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
  createRun: (projectId: string, input?: RunCreateRequest) => Promise<RunResource>;
  createRunDocument: (runId: string, input: DocumentCreateRequest) => Promise<DocumentResource>;
  createRunDocumentRevision: (
    runId: string,
    documentId: string,
    input: DocumentRevisionCreateRequest
  ) => Promise<DocumentRevisionResource>;
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
    async createRun(projectId, input) {
      const payload = runCreateRequestSchema.parse(input ?? {});
      const response = await fetchImplementation(
        `/v1/projects/${encodeURIComponent(projectId)}/runs`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: buildProtectedBrowserHeaders({
            accept: "application/json",
            "content-type": "application/json"
          }),
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw await buildApiError(response, `Unable to create run (${response.status}).`);
      }

      const envelope = runDetailEnvelopeSchema.parse(await response.json());

      return envelope.data;
    },
    async createRunDocument(runId, input) {
      const payload = documentCreateRequestSchema.parse(input);
      const response = await fetchImplementation(`/v1/runs/${encodeURIComponent(runId)}/documents`, {
        method: "POST",
        credentials: "same-origin",
        headers: buildProtectedBrowserHeaders({
          accept: "application/json",
          "content-type": "application/json"
        }),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw await buildApiError(response, `Unable to create run document (${response.status}).`);
      }

      const envelope = documentDetailEnvelopeSchema.parse(await response.json());

      return envelope.data;
    },
    async createRunDocumentRevision(runId, documentId, input) {
      const payload = documentRevisionCreateRequestSchema.parse(input);
      const response = await fetchImplementation(
        `/v1/runs/${encodeURIComponent(runId)}/documents/${encodeURIComponent(
          documentId
        )}/revisions`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: buildProtectedBrowserHeaders({
            accept: "application/json",
            "content-type": "application/json"
          }),
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw await buildApiError(
          response,
          `Unable to save document revision (${response.status}).`
        );
      }

      const envelope = documentRevisionDetailEnvelopeSchema.parse(await response.json());

      return envelope.data;
    },
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
      ? runs.map((run) => [run.run.runId, structuredClone(run)] as const)
      : Object.entries(runs).map(([runId, run]) => [runId, structuredClone(run)] as const)
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

  function getStaticRunDocument(run: StaticRunDetailRecord, documentId: string) {
    return run.documents?.find((document) => document.documentId === documentId) ?? null;
  }

  function hasStaticDocumentRevision(
    run: StaticRunDetailRecord,
    documentId: string,
    documentRevisionId: string
  ) {
    return run.revisions?.some((candidate) => {
      if (candidate.documentId) {
        return (
          candidate.documentId === documentId &&
          candidate.revision.documentRevisionId === documentRevisionId
        );
      }

      const document = getStaticRunDocument(run, documentId);

      return document?.currentRevisionId === candidate.revision.documentRevisionId;
    });
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
    async createRun(projectId, input) {
      const payload = runCreateRequestSchema.parse(input ?? {});
      const runId = `run-generated-${runRecords.size + 1}`;
      const run: RunResource = {
        compiledFrom: null,
        endedAt: null,
        executionEngine: payload.executionEngine,
        projectId,
        runId,
        startedAt: null,
        status: "configured",
        workflowInstanceId: `wf-${runId}`
      };

      runRecords.set(runId, {
        artifactContents: {},
        documents: [],
        revisions: [],
        run,
        taskArtifacts: {},
        tasks: [],
        workflow: {
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
      });

      return run;
    },
    async createRunDocument(runId, input) {
      const payload = documentCreateRequestSchema.parse(input);
      const run = getStaticRunRecord(runId);
      const existingDocument =
        run.documents?.find((document) => document.path === payload.path) ?? null;

      if (existingDocument) {
        throw new RunManagementApiError({
          code: "document_path_conflict",
          message: "A document with that logical path already exists in this scope.",
          status: 409
        });
      }

      const createdDocument: DocumentResource = {
        conversation: payload.conversation ?? null,
        currentRevisionId: null,
        documentId: `${runId}-${payload.path.replace(/\//g, "-")}`,
        kind: payload.kind,
        path: payload.path,
        scopeType: "run"
      };

      run.documents = [...(run.documents ?? []), createdDocument];

      return createdDocument;
    },
    async createRunDocumentRevision(runId, documentId, input) {
      const payload = documentRevisionCreateRequestSchema.parse(input);
      const run = getStaticRunRecord(runId);
      const document = getStaticRunDocument(run, documentId);

      if (!document) {
        throw new RunManagementApiError({
          code: "document_not_found",
          message: `Document ${documentId} was not found for run ${runId}.`,
          status: 404
        });
      }

      const currentRevision = document.currentRevisionId
        ? run.revisions?.find(
            (candidate) => candidate.revision.documentRevisionId === document.currentRevisionId
          ) ?? null
        : null;
      const revisionNumber = (currentRevision?.revision.revisionNumber ?? 0) + 1;
      const artifactId = `${document.documentId}-artifact-v${revisionNumber}`;
      const contentUrl = `/v1/artifacts/${artifactId}/content`;
      const createdRevision: StaticRunDocumentRevisionRecord = {
        content: payload.body,
        documentId: document.documentId,
        revision: {
          artifactId,
          contentUrl,
          createdAt: new Date().toISOString(),
          documentRevisionId: `${document.documentId}-v${revisionNumber}`,
          revisionNumber,
          title: payload.title
        }
      };

      run.revisions = [...(run.revisions ?? []), createdRevision];
      run.documents = (run.documents ?? []).map((candidate) =>
        candidate.documentId === document.documentId
          ? {
              ...candidate,
              currentRevisionId: createdRevision.revision.documentRevisionId
            }
          : candidate
      );
      run.artifactContents = {
        ...(run.artifactContents ?? {}),
        [contentUrl]: payload.body
      };

      return createdRevision.revision;
    },
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
          hasStaticDocumentRevision(run, documentId, documentRevisionId)
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
