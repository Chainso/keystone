import { and, asc, eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client";
import type {
  ArtifactRefRow,
  DocumentRevisionRow,
  DocumentRow
} from "./schema";
import {
  type DocumentKind,
  type DocumentScopeType,
  validateDocumentPath,
  validateDocumentKindPath
} from "../documents/model";
import { artifactRefs, documentRevisions, documents, projects, runs } from "./schema";

interface ProjectLookupInput {
  tenantId: string;
  projectId: string;
}

interface RunLookupInput {
  tenantId: string;
  runId: string;
}

interface DocumentLookupInput {
  tenantId: string;
  documentId: string;
}

export interface CreateDocumentInput extends ProjectLookupInput {
  runId?: string | null | undefined;
  scopeType: DocumentScopeType;
  kind: DocumentKind;
  path: string;
  conversationAgentClass?: string | null | undefined;
  conversationAgentName?: string | null | undefined;
}

export interface CreateDocumentRevisionInput extends DocumentLookupInput {
  documentRevisionId?: string | undefined;
  artifactRefId: string;
  title: string;
  setAsCurrent?: boolean | undefined;
}

const DOCUMENT_REVISION_ARTIFACT_KIND = "document_revision";

function requireInsertedRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message);
  }

  return row;
}

export interface DocumentWithCurrentRevision extends DocumentRow {
  currentRevision: DocumentRevisionRow | null;
}

async function assertProjectOwnership(client: DatabaseClient, input: ProjectLookupInput) {
  const project = await client.db.query.projects.findFirst({
    where: and(eq(projects.tenantId, input.tenantId), eq(projects.projectId, input.projectId))
  });

  if (!project) {
    throw new Error(`Project ${input.projectId} was not found for tenant ${input.tenantId}.`);
  }

  return project;
}

async function assertRunOwnership(client: DatabaseClient, input: RunLookupInput) {
  const run = await client.db.query.runs.findFirst({
    where: and(eq(runs.tenantId, input.tenantId), eq(runs.runId, input.runId))
  });

  if (!run) {
    throw new Error(`Run ${input.runId} was not found for tenant ${input.tenantId}.`);
  }

  return run;
}

function assertDocumentScope(input: CreateDocumentInput) {
  if (input.scopeType === "project" && input.runId) {
    throw new Error("Project-scoped documents cannot reference a run.");
  }

  if (input.scopeType === "run" && !input.runId) {
    throw new Error("Run-scoped documents require a run id.");
  }

  validateDocumentKindPath(input.scopeType, input.kind, input.path);
}

function assertRevisionArtifactBoundary(document: DocumentRow, artifact: ArtifactRefRow) {
  if (artifact.projectId !== document.projectId) {
    throw new Error(
      `Artifact ${artifact.artifactRefId} does not belong to project ${document.projectId} for document ${document.documentId}.`
    );
  }

  if (document.scopeType === "project") {
    if (artifact.runId) {
      throw new Error(
        `Artifact ${artifact.artifactRefId} does not belong to the project-scoped document boundary for document ${document.documentId}.`
      );
    }
  } else {
    if (!document.runId) {
      throw new Error(`Run-scoped document ${document.documentId} is missing its run id.`);
    }

    if (artifact.runId !== document.runId) {
      throw new Error(
        `Artifact ${artifact.artifactRefId} does not belong to run ${document.runId} for document ${document.documentId}.`
      );
    }
  }

  if (artifact.artifactKind !== DOCUMENT_REVISION_ARTIFACT_KIND) {
    throw new Error(
      `Artifact ${artifact.artifactRefId} is not a ${DOCUMENT_REVISION_ARTIFACT_KIND} artifact.`
    );
  }

  if (artifact.runTaskId) {
    throw new Error(
      `Artifact ${artifact.artifactRefId} is task-scoped and cannot back a document revision.`
    );
  }
}

export async function createDocument(client: DatabaseClient, input: CreateDocumentInput) {
  assertDocumentScope(input);
  const normalizedPath = validateDocumentKindPath(input.scopeType, input.kind, input.path);

  await assertProjectOwnership(client, {
    tenantId: input.tenantId,
    projectId: input.projectId
  });

  if (input.runId) {
    const run = await assertRunOwnership(client, {
      tenantId: input.tenantId,
      runId: input.runId
    });

    if (run.projectId !== input.projectId) {
      throw new Error(
        `Run ${input.runId} does not belong to project ${input.projectId} for tenant ${input.tenantId}.`
      );
    }
  }

  const [inserted] = await client.db
    .insert(documents)
    .values({
      documentId: crypto.randomUUID(),
      tenantId: input.tenantId,
      projectId: input.projectId,
      runId: input.runId ?? null,
      scopeType: input.scopeType,
      kind: input.kind,
      path: normalizedPath,
      conversationAgentClass: input.conversationAgentClass ?? null,
      conversationAgentName: input.conversationAgentName ?? null
    })
    .returning();

  return requireInsertedRow(
    inserted,
    `Document insert returned no row for ${input.scopeType} document ${normalizedPath}.`
  );
}

export async function getDocument(client: DatabaseClient, input: DocumentLookupInput) {
  return client.db.query.documents.findFirst({
    where: and(eq(documents.tenantId, input.tenantId), eq(documents.documentId, input.documentId))
  });
}

export async function getProjectDocumentByPath(
  client: DatabaseClient,
  input: ProjectLookupInput & { path: string }
) {
  const normalizedPath = validateDocumentPath(input.path);

  return client.db.query.documents.findFirst({
    where: and(
      eq(documents.tenantId, input.tenantId),
      eq(documents.projectId, input.projectId),
      eq(documents.scopeType, "project"),
      eq(documents.path, normalizedPath)
    )
  });
}

export async function getRunDocumentByPath(
  client: DatabaseClient,
  input: RunLookupInput & { path: string }
) {
  await assertRunOwnership(client, input);
  const normalizedPath = validateDocumentPath(input.path);

  return client.db.query.documents.findFirst({
    where: and(
      eq(documents.tenantId, input.tenantId),
      eq(documents.runId, input.runId),
      eq(documents.scopeType, "run"),
      eq(documents.path, normalizedPath)
    )
  });
}

export async function getProjectDocument(
  client: DatabaseClient,
  input: ProjectLookupInput & { documentId: string }
) {
  const document = await getDocument(client, {
    tenantId: input.tenantId,
    documentId: input.documentId
  });

  if (!document || document.scopeType !== "project" || document.projectId !== input.projectId) {
    return null;
  }

  return document;
}

export async function getRunDocument(
  client: DatabaseClient,
  input: RunLookupInput & { documentId: string }
) {
  const document = await getDocument(client, {
    tenantId: input.tenantId,
    documentId: input.documentId
  });

  if (!document || document.scopeType !== "run" || document.runId !== input.runId) {
    return null;
  }

  return document;
}

export async function listProjectDocuments(client: DatabaseClient, input: ProjectLookupInput) {
  await assertProjectOwnership(client, input);

  return client.db.query.documents.findMany({
    where: and(
      eq(documents.tenantId, input.tenantId),
      eq(documents.projectId, input.projectId),
      eq(documents.scopeType, "project")
    ),
    orderBy: [asc(documents.path), asc(documents.createdAt)]
  });
}

export async function listRunDocuments(client: DatabaseClient, input: RunLookupInput) {
  await assertRunOwnership(client, input);

  return client.db.query.documents.findMany({
    where: and(
      eq(documents.tenantId, input.tenantId),
      eq(documents.runId, input.runId),
      eq(documents.scopeType, "run")
    ),
    orderBy: [asc(documents.path), asc(documents.createdAt)]
  });
}

export async function createDocumentRevision(
  client: DatabaseClient,
  input: CreateDocumentRevisionInput
) {
  return client.db.transaction(async (transaction) => {
    const [document] = await transaction
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.tenantId, input.tenantId),
          eq(documents.documentId, input.documentId)
        )
      )
      .for("update");

    if (!document) {
      throw new Error(`Document ${input.documentId} was not found for tenant ${input.tenantId}.`);
    }

    const artifact = await transaction.query.artifactRefs.findFirst({
      where: and(
        eq(artifactRefs.tenantId, input.tenantId),
        eq(artifactRefs.artifactRefId, input.artifactRefId)
      )
    });

    if (!artifact) {
      throw new Error(
        `Artifact ${input.artifactRefId} was not found for tenant ${input.tenantId}.`
      );
    }

    assertRevisionArtifactBoundary(document, artifact);

    const [nextRevision] = await transaction
      .select({
        revisionNumber: sql<number>`coalesce(max(${documentRevisions.revisionNumber}), 0) + 1`
      })
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, input.documentId));

    const [insertedRow] = await transaction
      .insert(documentRevisions)
      .values({
        documentRevisionId: input.documentRevisionId ?? crypto.randomUUID(),
        documentId: input.documentId,
        artifactRefId: input.artifactRefId,
        revisionNumber: nextRevision?.revisionNumber ?? 1,
        title: input.title
      })
      .returning();
    const inserted = requireInsertedRow(
      insertedRow,
      `Document revision insert returned no row for document ${input.documentId}.`
    );

    if (input.setAsCurrent ?? true) {
      await transaction
        .update(documents)
        .set({
          currentRevisionId: inserted.documentRevisionId,
          updatedAt: new Date()
        })
        .where(eq(documents.documentId, input.documentId));
    }

    return inserted;
  });
}

export async function getDocumentRevision(
  client: DatabaseClient,
  input: DocumentLookupInput & { documentRevisionId: string }
) {
  const document = await getDocument(client, input);

  if (!document) {
    return null;
  }

  return client.db.query.documentRevisions.findFirst({
    where: and(
      eq(documentRevisions.documentId, input.documentId),
      eq(documentRevisions.documentRevisionId, input.documentRevisionId)
    )
  });
}

export async function listDocumentRevisions(client: DatabaseClient, input: DocumentLookupInput) {
  const document = await getDocument(client, input);

  if (!document) {
    return [];
  }

  return client.db.query.documentRevisions.findMany({
    where: eq(documentRevisions.documentId, input.documentId),
    orderBy: [asc(documentRevisions.revisionNumber)]
  });
}

export async function getDocumentWithCurrentRevision(
  client: DatabaseClient,
  input: DocumentLookupInput
): Promise<DocumentWithCurrentRevision | null> {
  const document = await getDocument(client, input);

  if (!document) {
    return null;
  }

  const currentRevision = document.currentRevisionId
    ? await getDocumentRevision(client, {
        tenantId: input.tenantId,
        documentId: input.documentId,
        documentRevisionId: document.currentRevisionId
      })
    : null;

  return {
    ...document,
    currentRevision: currentRevision ?? null
  };
}

export async function listProjectDocumentsWithCurrentRevision(
  client: DatabaseClient,
  input: ProjectLookupInput
): Promise<DocumentWithCurrentRevision[]> {
  const projectDocuments = await listProjectDocuments(client, input);
  const documentsWithRevisions: DocumentWithCurrentRevision[] = [];

  for (const document of projectDocuments) {
    const currentRevision = document.currentRevisionId
      ? await getDocumentRevision(client, {
          tenantId: input.tenantId,
          documentId: document.documentId,
          documentRevisionId: document.currentRevisionId
        })
      : null;

    documentsWithRevisions.push({
      ...document,
      currentRevision: currentRevision ?? null
    });
  }

  return documentsWithRevisions;
}

export async function listRunDocumentsWithCurrentRevision(
  client: DatabaseClient,
  input: RunLookupInput
): Promise<DocumentWithCurrentRevision[]> {
  const scopedRunDocuments = await listRunDocuments(client, input);
  const documentsWithRevisions: DocumentWithCurrentRevision[] = [];

  for (const document of scopedRunDocuments) {
    const currentRevision = document.currentRevisionId
      ? await getDocumentRevision(client, {
          tenantId: input.tenantId,
          documentId: document.documentId,
          documentRevisionId: document.currentRevisionId
        })
      : null;

    documentsWithRevisions.push({
      ...document,
      currentRevision: currentRevision ?? null
    });
  }

  return documentsWithRevisions;
}
