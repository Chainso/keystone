import { TextDecoder } from "node:util";

import type { WorkerBindings } from "../../env";
import { getArtifactBytes, isTextArtifactContentType } from "../artifacts/r2";
import { getArtifactRef, getArtifactStorageUri } from "../db/artifacts";
import {
  getDocumentWithCurrentRevision,
  getDocumentRevision,
  getRunDocumentByPath,
  type DocumentWithCurrentRevision
} from "../db/documents";
import type { DatabaseClient } from "../db/client";
import type { DocumentKind } from "./model";
import { getCanonicalDocumentPath } from "./model";

const decoder = new TextDecoder();

export interface LoadedRunPlanningDocument {
  document: DocumentWithCurrentRevision;
  revisionId: string;
  artifactRefId: string;
  contentType: string | null;
  body: string;
}

export interface LoadedRunPlanningDocuments {
  specification: LoadedRunPlanningDocument;
  architecture: LoadedRunPlanningDocument;
  executionPlan: LoadedRunPlanningDocument;
}

async function requireRunPlanningDocument(
  env: Pick<WorkerBindings, "ARTIFACTS_BUCKET">,
  client: DatabaseClient,
  input: {
    tenantId: string;
    runId: string;
    kind: Extract<DocumentKind, "specification" | "architecture" | "execution_plan">;
  }
): Promise<LoadedRunPlanningDocument> {
  const path = getCanonicalDocumentPath("run", input.kind);

  if (!path) {
    throw new Error(`No canonical run document path exists for kind ${input.kind}.`);
  }

  const documentRow = await getRunDocumentByPath(client, {
    tenantId: input.tenantId,
    runId: input.runId,
    path
  });

  if (!documentRow) {
    throw new Error(`Run ${input.runId} is missing its required ${input.kind} document.`);
  }

  const document = await getDocumentWithCurrentRevision(client, {
    tenantId: input.tenantId,
    documentId: documentRow.documentId
  });

  if (!document) {
    throw new Error(
      `Run ${input.runId} ${input.kind} document ${documentRow.documentId} could not be reloaded.`
    );
  }

  if (!document.currentRevisionId) {
    throw new Error(
      `Run ${input.runId} ${input.kind} document ${document.documentId} has no current revision.`
    );
  }

  const currentRevision =
    document.currentRevision ??
    (await getDocumentRevision(client, {
      tenantId: input.tenantId,
      documentId: document.documentId,
      documentRevisionId: document.currentRevisionId
    }));

  if (!currentRevision) {
    throw new Error(
      `Run ${input.runId} ${input.kind} document ${document.documentId} could not load its current revision ${document.currentRevisionId}.`
    );
  }

  const artifactRef = await getArtifactRef(client, input.tenantId, currentRevision.artifactRefId);

  if (!artifactRef) {
    throw new Error(
      `Run ${input.runId} ${input.kind} document revision ${currentRevision.documentRevisionId} is missing artifact ${currentRevision.artifactRefId}.`
    );
  }

  const artifactStorageUri = getArtifactStorageUri(artifactRef);
  const artifactBytes = await getArtifactBytes(env.ARTIFACTS_BUCKET, artifactStorageUri);

  if (!artifactBytes) {
    throw new Error(
      `Run ${input.runId} ${input.kind} document artifact ${artifactRef.artifactRefId} could not be read from ${artifactStorageUri}.`
    );
  }

  const contentType = artifactBytes.contentType ?? artifactRef.contentType ?? null;

  if (!isTextArtifactContentType(contentType)) {
    throw new Error(
      `Run ${input.runId} ${input.kind} document artifact ${artifactRef.artifactRefId} must be text-readable.`
    );
  }

  return {
    document: {
      ...document,
      currentRevision
    },
    revisionId: currentRevision.documentRevisionId,
    artifactRefId: artifactRef.artifactRefId,
    contentType,
    body: decoder.decode(artifactBytes.body)
  };
}

export async function loadRequiredRunPlanningDocuments(
  env: Pick<WorkerBindings, "ARTIFACTS_BUCKET">,
  client: DatabaseClient,
  input: {
    tenantId: string;
    runId: string;
  }
): Promise<LoadedRunPlanningDocuments> {
  const [specification, architecture, executionPlan] = await Promise.all([
    requireRunPlanningDocument(env, client, {
      tenantId: input.tenantId,
      runId: input.runId,
      kind: "specification"
    }),
    requireRunPlanningDocument(env, client, {
      tenantId: input.tenantId,
      runId: input.runId,
      kind: "architecture"
    }),
    requireRunPlanningDocument(env, client, {
      tenantId: input.tenantId,
      runId: input.runId,
      kind: "execution_plan"
    })
  ]);

  return {
    specification,
    architecture,
    executionPlan
  };
}
