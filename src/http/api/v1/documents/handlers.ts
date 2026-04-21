import type { Context } from "hono";

import type { AppEnv } from "../../../../env";
import {
  decodeArtifactBody,
  deleteArtifactObject,
  InvalidArtifactBodyError,
  putArtifactBytes
} from "../../../../lib/artifacts/r2";
import { createArtifactRef, deleteArtifactRef } from "../../../../lib/db/artifacts";
import { createWorkerDatabaseClient } from "../../../../lib/db/client";
import {
  createDocument,
  createDocumentRevision,
  getDocumentWithCurrentRevision,
  getProjectDocument,
  getRunDocument,
  listProjectDocumentsWithCurrentRevision,
  listRunDocumentsWithCurrentRevision,
  type DocumentWithCurrentRevision
} from "../../../../lib/db/documents";
import { getProject } from "../../../../lib/db/projects";
import { getRunRecord } from "../../../../lib/db/runs";
import {
  type DocumentScopeType,
  validateDocumentKindPath
} from "../../../../lib/documents/model";
import { jsonErrorResponse, throwJsonHttpError } from "../../../../lib/http/errors";
import {
  documentCollectionEnvelopeSchema,
  documentCreateRequestSchema,
  documentDetailEnvelopeSchema,
  documentRevisionCreateRequestSchema,
  documentRevisionDetailEnvelopeSchema,
  serializeDocumentResource,
  serializeDocumentRevisionResource
} from "./contracts";

const ARTIFACTS_BUCKET_NAME = "keystone-artifacts-dev";

type ProjectDocumentParent = {
  scopeType: "project";
  tenantId: string;
  projectId: string;
  runId: null;
};

type RunDocumentParent = {
  scopeType: "run";
  tenantId: string;
  projectId: string;
  runId: string;
};

function parseDocumentCreateInput(value: unknown) {
  const result = documentCreateRequestSchema.safeParse(value);

  if (!result.success) {
    throwJsonHttpError(400, "invalid_request", "Document request validation failed.", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        code: issue.code
      }))
    });
  }

  return result.data;
}

function parseDocumentRevisionCreateInput(value: unknown) {
  const result = documentRevisionCreateRequestSchema.safeParse(value);

  if (!result.success) {
    throwJsonHttpError(400, "invalid_request", "Document revision validation failed.", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        code: issue.code
      }))
    });
  }

  return result.data;
}

function resolveDocumentError(error: unknown) {
  if (error instanceof InvalidArtifactBodyError) {
    return jsonErrorResponse("invalid_request", error.message, 400);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    return jsonErrorResponse(
      "document_path_conflict",
      "A document with that logical path already exists in this scope.",
      409
    );
  }

  if (error instanceof Error) {
    console.error("Document persistence failed", error);
    return jsonErrorResponse("internal_error", "Document persistence failed.", 500);
  }

  return null;
}

function validateScopedDocumentCreateInput(
  scopeType: DocumentScopeType,
  input: ReturnType<typeof parseDocumentCreateInput>
) {
  try {
    return {
      ...input,
      path: validateDocumentKindPath(scopeType, input.kind, input.path)
    };
  } catch (error) {
    if (error instanceof Error) {
      throwJsonHttpError(400, "invalid_request", error.message);
    }

    throw error;
  }
}

function getDocumentFileExtension(contentType: string) {
  if (contentType.includes("json")) {
    return ".json";
  }

  if (contentType.includes("markdown")) {
    return ".md";
  }

  if (contentType.includes("yaml")) {
    return ".yaml";
  }

  if (contentType.startsWith("text/")) {
    return ".txt";
  }

  return "";
}

function buildDocumentFileName(path: string, contentType: string) {
  const lastSegment = path.split("/").at(-1) ?? "document";
  const extension = getDocumentFileExtension(contentType);

  if (extension.length === 0 || lastSegment.endsWith(extension)) {
    return lastSegment;
  }

  return `${lastSegment}${extension}`;
}

function buildDocumentArtifactKey(input: {
  scopeType: DocumentScopeType;
  projectId: string;
  runId: string | null;
  documentId: string;
  documentRevisionId: string;
}) {
  if (input.scopeType === "project") {
    return `documents/project/${encodeURIComponent(input.projectId)}/${encodeURIComponent(input.documentId)}/${encodeURIComponent(input.documentRevisionId)}`;
  }

  if (!input.runId) {
    throw new Error(`Run-scoped document ${input.documentId} is missing its run id.`);
  }

  return `documents/run/${encodeURIComponent(input.runId)}/${encodeURIComponent(input.documentId)}/${encodeURIComponent(input.documentRevisionId)}`;
}

async function requireProjectParent(
  context: Context<AppEnv>,
  projectId: string
): Promise<ProjectDocumentParent | null> {
  const auth = context.get("auth");
  const client = createWorkerDatabaseClient(context.env);

  try {
    const project = await getProject(client, {
      tenantId: auth.tenantId,
      projectId
    });

    if (!project) {
      return null;
    }

    return {
      scopeType: "project",
      tenantId: auth.tenantId,
      projectId: project.projectId,
      runId: null
    };
  } finally {
    await client.close();
  }
}

async function requireRunParent(
  context: Context<AppEnv>,
  runId: string
): Promise<RunDocumentParent | null> {
  const auth = context.get("auth");
  const client = createWorkerDatabaseClient(context.env);

  try {
    const run = await getRunRecord(client, {
      tenantId: auth.tenantId,
      runId
    });

    if (!run) {
      return null;
    }

    return {
      scopeType: "run",
      tenantId: auth.tenantId,
      projectId: run.projectId,
      runId: run.runId
    };
  } finally {
    await client.close();
  }
}

async function writeDocumentRevision(
  context: Context<AppEnv>,
  document: DocumentWithCurrentRevision,
  input: ReturnType<typeof parseDocumentRevisionCreateInput>
) {
  const client = createWorkerDatabaseClient(context.env);
  let artifactKey: string | null = null;
  let createdArtifactRefId: string | null = null;

  try {
    const artifactBody = decodeArtifactBody(input.body, input.encoding);
    const documentRevisionId = crypto.randomUUID();
    artifactKey = buildDocumentArtifactKey({
      scopeType: document.scopeType,
      projectId: document.projectId,
      runId: document.runId,
      documentId: document.documentId,
      documentRevisionId
    });
    const storedArtifact = await putArtifactBytes(
      context.env.ARTIFACTS_BUCKET,
      ARTIFACTS_BUCKET_NAME,
      artifactKey,
      artifactBody,
      {
        httpMetadata: {
          contentType: input.contentType
        }
      }
    );
    const artifact = await createArtifactRef(client, {
      tenantId: document.tenantId,
      projectId: document.projectId,
      runId: document.runId,
      artifactKind: "document_revision",
      storageBackend: storedArtifact.storageBackend,
      bucket: ARTIFACTS_BUCKET_NAME,
      objectKey: storedArtifact.key,
      objectVersion: storedArtifact.objectVersion,
      etag: storedArtifact.etag,
      contentType: input.contentType,
      sha256: storedArtifact.sha256,
      sizeBytes: storedArtifact.sizeBytes
    });
    createdArtifactRefId = artifact.artifactRefId;
    const revision = await createDocumentRevision(client, {
      tenantId: document.tenantId,
      documentId: document.documentId,
      documentRevisionId,
      artifactRefId: artifact.artifactRefId,
      title: input.title
    });

    return serializeDocumentRevisionResource(revision);
  } catch (error) {
    const cleanupErrors: unknown[] = [];

    if (createdArtifactRefId) {
      try {
        await deleteArtifactRef(client, {
          tenantId: document.tenantId,
          artifactRefId: createdArtifactRefId
        });
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }

    if (artifactKey) {
      try {
        await deleteArtifactObject(context.env.ARTIFACTS_BUCKET, artifactKey);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }

    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        "Document revision write failed and cleanup did not complete."
      );
    }

    throw error;
  } finally {
    await client.close();
  }
}

async function loadProjectDocument(
  context: Context<AppEnv>,
  projectId: string,
  documentId: string
) {
  const auth = context.get("auth");
  const client = createWorkerDatabaseClient(context.env);

  try {
    const document = await getProjectDocument(client, {
      tenantId: auth.tenantId,
      projectId,
      documentId
    });

    if (!document) {
      return null;
    }

    return await getDocumentWithCurrentRevision(client, {
      tenantId: auth.tenantId,
      documentId: document.documentId
    });
  } finally {
    await client.close();
  }
}

async function loadRunDocument(
  context: Context<AppEnv>,
  runId: string,
  documentId: string
) {
  const auth = context.get("auth");
  const client = createWorkerDatabaseClient(context.env);

  try {
    const document = await getRunDocument(client, {
      tenantId: auth.tenantId,
      runId,
      documentId
    });

    if (!document) {
      return null;
    }

    return await getDocumentWithCurrentRevision(client, {
      tenantId: auth.tenantId,
      documentId: document.documentId
    });
  } finally {
    await client.close();
  }
}

export async function listProjectDocumentsHandler(context: Context<AppEnv>) {
  const projectId = context.req.param("projectId");

  if (!projectId) {
    throwJsonHttpError(400, "invalid_path", "Project ID is required.");
  }

  const parent = await requireProjectParent(context, projectId);

  if (!parent) {
    return jsonErrorResponse("project_not_found", `Project ${projectId} was not found.`, 404);
  }

  const client = createWorkerDatabaseClient(context.env);

  try {
    const documents = await listProjectDocumentsWithCurrentRevision(client, {
      tenantId: parent.tenantId,
      projectId: parent.projectId
    });

    return context.json(
      documentCollectionEnvelopeSchema.parse({
        data: {
          items: documents.map(serializeDocumentResource),
          total: documents.length
        },
        meta: {
          apiVersion: "v1",
          envelope: "collection",
          resourceType: "document"
        }
      })
    );
  } finally {
    await client.close();
  }
}

export async function createProjectDocumentHandler(context: Context<AppEnv>) {
  const projectId = context.req.param("projectId");

  if (!projectId) {
    throwJsonHttpError(400, "invalid_path", "Project ID is required.");
  }

  const parent = await requireProjectParent(context, projectId);

  if (!parent) {
    return jsonErrorResponse("project_not_found", `Project ${projectId} was not found.`, 404);
  }

  const input = validateScopedDocumentCreateInput(
    "project",
    parseDocumentCreateInput(await context.req.json())
  );
  const client = createWorkerDatabaseClient(context.env);

  try {
    const created = await createDocument(client, {
      tenantId: parent.tenantId,
      projectId: parent.projectId,
      scopeType: "project",
      kind: input.kind,
      path: input.path,
      conversationAgentClass: input.conversation?.agentClass ?? null,
      conversationAgentName: input.conversation?.agentName ?? null
    });

    return context.json(
      documentDetailEnvelopeSchema.parse({
        data: serializeDocumentResource({
          ...created,
          currentRevision: null
        }),
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "document"
        }
      }),
      201
    );
  } catch (error) {
    const response = resolveDocumentError(error);

    if (response) {
      return response;
    }

    throw error;
  } finally {
    await client.close();
  }
}

export async function getProjectDocumentHandler(context: Context<AppEnv>) {
  const projectId = context.req.param("projectId");
  const documentId = context.req.param("documentId");

  if (!projectId) {
    throwJsonHttpError(400, "invalid_path", "Project ID is required.");
  }

  if (!documentId) {
    throwJsonHttpError(400, "invalid_path", "Document ID is required.");
  }

  const parent = await requireProjectParent(context, projectId);

  if (!parent) {
    return jsonErrorResponse("project_not_found", `Project ${projectId} was not found.`, 404);
  }

  const document = await loadProjectDocument(context, projectId, documentId);

  if (!document) {
    return jsonErrorResponse(
      "document_not_found",
      `Document ${documentId} was not found for project ${projectId}.`,
      404
    );
  }

  return context.json(
    documentDetailEnvelopeSchema.parse({
      data: serializeDocumentResource(document),
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "document"
      }
    })
  );
}

export async function createProjectDocumentRevisionHandler(context: Context<AppEnv>) {
  const projectId = context.req.param("projectId");
  const documentId = context.req.param("documentId");

  if (!projectId) {
    throwJsonHttpError(400, "invalid_path", "Project ID is required.");
  }

  if (!documentId) {
    throwJsonHttpError(400, "invalid_path", "Document ID is required.");
  }

  const parent = await requireProjectParent(context, projectId);

  if (!parent) {
    return jsonErrorResponse("project_not_found", `Project ${projectId} was not found.`, 404);
  }

  const document = await loadProjectDocument(context, projectId, documentId);

  if (!document) {
    return jsonErrorResponse(
      "document_not_found",
      `Document ${documentId} was not found for project ${projectId}.`,
      404
    );
  }

  const input = parseDocumentRevisionCreateInput(await context.req.json());

  try {
    const revision = await writeDocumentRevision(context, document, input);

    return context.json(
      documentRevisionDetailEnvelopeSchema.parse({
        data: revision,
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "document_revision"
        }
      }),
      201
    );
  } catch (error) {
    const response = resolveDocumentError(error);

    if (response) {
      return response;
    }

    throw error;
  }
}

export async function listRunDocumentsHandler(context: Context<AppEnv>) {
  const runId = context.req.param("runId");

  if (!runId) {
    throwJsonHttpError(400, "invalid_path", "Run ID is required.");
  }

  const parent = await requireRunParent(context, runId);

  if (!parent) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  const client = createWorkerDatabaseClient(context.env);

  try {
    const documents = await listRunDocumentsWithCurrentRevision(client, {
      tenantId: parent.tenantId,
      runId: parent.runId
    });

    return context.json(
      documentCollectionEnvelopeSchema.parse({
        data: {
          items: documents.map(serializeDocumentResource),
          total: documents.length
        },
        meta: {
          apiVersion: "v1",
          envelope: "collection",
          resourceType: "document"
        }
      })
    );
  } finally {
    await client.close();
  }
}

export async function createRunDocumentHandler(context: Context<AppEnv>) {
  const runId = context.req.param("runId");

  if (!runId) {
    throwJsonHttpError(400, "invalid_path", "Run ID is required.");
  }

  const parent = await requireRunParent(context, runId);

  if (!parent) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  const input = validateScopedDocumentCreateInput(
    "run",
    parseDocumentCreateInput(await context.req.json())
  );
  const client = createWorkerDatabaseClient(context.env);

  try {
    const created = await createDocument(client, {
      tenantId: parent.tenantId,
      projectId: parent.projectId,
      runId: parent.runId,
      scopeType: "run",
      kind: input.kind,
      path: input.path,
      conversationAgentClass: input.conversation?.agentClass ?? null,
      conversationAgentName: input.conversation?.agentName ?? null
    });

    return context.json(
      documentDetailEnvelopeSchema.parse({
        data: serializeDocumentResource({
          ...created,
          currentRevision: null
        }),
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "document"
        }
      }),
      201
    );
  } catch (error) {
    const response = resolveDocumentError(error);

    if (response) {
      return response;
    }

    throw error;
  } finally {
    await client.close();
  }
}

export async function getRunDocumentHandler(context: Context<AppEnv>) {
  const runId = context.req.param("runId");
  const documentId = context.req.param("documentId");

  if (!runId) {
    throwJsonHttpError(400, "invalid_path", "Run ID is required.");
  }

  if (!documentId) {
    throwJsonHttpError(400, "invalid_path", "Document ID is required.");
  }

  const parent = await requireRunParent(context, runId);

  if (!parent) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  const document = await loadRunDocument(context, runId, documentId);

  if (!document) {
    return jsonErrorResponse(
      "document_not_found",
      `Document ${documentId} was not found for run ${runId}.`,
      404
    );
  }

  return context.json(
    documentDetailEnvelopeSchema.parse({
      data: serializeDocumentResource(document),
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "document"
      }
    })
  );
}

export async function createRunDocumentRevisionHandler(context: Context<AppEnv>) {
  const runId = context.req.param("runId");
  const documentId = context.req.param("documentId");

  if (!runId) {
    throwJsonHttpError(400, "invalid_path", "Run ID is required.");
  }

  if (!documentId) {
    throwJsonHttpError(400, "invalid_path", "Document ID is required.");
  }

  const parent = await requireRunParent(context, runId);

  if (!parent) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  const document = await loadRunDocument(context, runId, documentId);

  if (!document) {
    return jsonErrorResponse(
      "document_not_found",
      `Document ${documentId} was not found for run ${runId}.`,
      404
    );
  }

  const input = parseDocumentRevisionCreateInput(await context.req.json());

  try {
    const revision = await writeDocumentRevision(context, document, input);

    return context.json(
      documentRevisionDetailEnvelopeSchema.parse({
        data: revision,
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "document_revision"
        }
      }),
      201
    );
  } catch (error) {
    const response = resolveDocumentError(error);

    if (response) {
      return response;
    }

    throw error;
  }
}
