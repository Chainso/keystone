import { deleteArtifactObject, getArtifactText, putArtifactBytes } from "../artifacts/r2";
import { createArtifactRef, deleteArtifactRef, getArtifactRef } from "../db/artifacts";
import { createWorkerDatabaseClient } from "../db/client";
import {
  createDocumentRevision,
  getDocumentWithCurrentRevision,
  getRunDocumentByPath
} from "../db/documents";
import type { DocumentKind } from "./model";
import type { WorkerBindings } from "../../env";

const ARTIFACTS_BUCKET_NAME = "keystone-artifacts-dev";
const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

function buildRunDocumentArtifactKey(input: {
  runId: string;
  documentId: string;
  documentRevisionId: string;
}) {
  return `documents/run/${encodeURIComponent(input.runId)}/${encodeURIComponent(input.documentId)}/${encodeURIComponent(input.documentRevisionId)}`;
}

export async function loadRunDocumentCurrentText(input: {
  env: WorkerBindings;
  tenantId: string;
  runId: string;
  path: string;
}) {
  const client = createWorkerDatabaseClient(input.env);

  try {
    const document = await getRunDocumentByPath(client, {
      tenantId: input.tenantId,
      runId: input.runId,
      path: input.path
    });

    if (!document) {
      return null;
    }

    const documentWithRevision = await getDocumentWithCurrentRevision(client, {
      tenantId: input.tenantId,
      documentId: document.documentId
    });

    if (!documentWithRevision?.currentRevision) {
      return {
        document,
        content: ""
      };
    }

    const artifact = await getArtifactRef(
      client,
      input.tenantId,
      documentWithRevision.currentRevision.artifactRefId
    );

    if (!artifact) {
      throw new Error(
        `Current artifact ${documentWithRevision.currentRevision.artifactRefId} was not found for document ${document.documentId}.`
      );
    }

    const content = await getArtifactText(input.env.ARTIFACTS_BUCKET, artifact.objectKey);

    if (content === null) {
      throw new Error(`Current document artifact ${artifact.objectKey} was not found in R2.`);
    }

    return {
      document,
      content
    };
  } finally {
    await client.close();
  }
}
export async function saveRunDocumentTextRevision(input: {
  env: WorkerBindings;
  tenantId: string;
  runId: string;
  path: string;
  kind: DocumentKind;
  content: string;
  title: string;
}) {
  const client = createWorkerDatabaseClient(input.env);
  let artifactKey: string | null = null;
  let artifactRefId: string | null = null;

  try {
    const document = await getRunDocumentByPath(client, {
      tenantId: input.tenantId,
      runId: input.runId,
      path: input.path
    });

    if (!document) {
      throw new Error(`Run document ${input.path} was not found for run ${input.runId}.`);
    }

    if (document.kind !== input.kind) {
      throw new Error(
        `Run document ${input.path} is kind ${document.kind}, expected ${input.kind}.`
      );
    }

    const documentRevisionId = crypto.randomUUID();
    artifactKey = buildRunDocumentArtifactKey({
      runId: input.runId,
      documentId: document.documentId,
      documentRevisionId
    });
    const storedArtifact = await putArtifactBytes(
      input.env.ARTIFACTS_BUCKET,
      ARTIFACTS_BUCKET_NAME,
      artifactKey,
      input.content,
      {
        httpMetadata: {
          contentType: MARKDOWN_CONTENT_TYPE
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
      contentType: MARKDOWN_CONTENT_TYPE,
      sha256: storedArtifact.sha256,
      sizeBytes: storedArtifact.sizeBytes
    });
    artifactRefId = artifact.artifactRefId;
    const revision = await createDocumentRevision(client, {
      tenantId: document.tenantId,
      documentId: document.documentId,
      documentRevisionId,
      artifactRefId: artifact.artifactRefId,
      title: input.title
    });

    return {
      document,
      revision,
      artifact
    };
  } catch (error) {
    const cleanupErrors: unknown[] = [];

    if (artifactRefId) {
      try {
        await deleteArtifactRef(client, {
          tenantId: input.tenantId,
          artifactRefId
        });
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }

    if (artifactKey) {
      try {
        await deleteArtifactObject(input.env.ARTIFACTS_BUCKET, artifactKey);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }
    }

    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        "Document revision save failed and cleanup did not complete."
      );
    }

    throw error;
  } finally {
    await client.close();
  }
}
