import { and, asc, eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client";
import { documentRevisions, documents, projects, runs } from "./schema";

export type DocumentScopeType = "project" | "run";

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
  kind: string;
  path: string;
  conversationAgentClass?: string | null | undefined;
  conversationAgentName?: string | null | undefined;
}

export interface CreateDocumentRevisionInput extends DocumentLookupInput {
  artifactRefId: string;
  title: string;
  setAsCurrent?: boolean | undefined;
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

  if (input.scopeType !== "run" && input.kind === "execution_plan") {
    throw new Error("Only run-scoped documents may use the execution_plan kind.");
  }
}

export async function createDocument(client: DatabaseClient, input: CreateDocumentInput) {
  assertDocumentScope(input);

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
      path: input.path,
      conversationAgentClass: input.conversationAgentClass ?? null,
      conversationAgentName: input.conversationAgentName ?? null
    })
    .returning();

  return inserted;
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
  return client.db.query.documents.findFirst({
    where: and(
      eq(documents.tenantId, input.tenantId),
      eq(documents.projectId, input.projectId),
      eq(documents.scopeType, "project"),
      eq(documents.path, input.path)
    )
  });
}

export async function getRunDocumentByPath(
  client: DatabaseClient,
  input: RunLookupInput & { path: string }
) {
  await assertRunOwnership(client, input);

  return client.db.query.documents.findFirst({
    where: and(
      eq(documents.tenantId, input.tenantId),
      eq(documents.runId, input.runId),
      eq(documents.scopeType, "run"),
      eq(documents.path, input.path)
    )
  });
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
    const document = await transaction.query.documents.findFirst({
      where: and(
        eq(documents.tenantId, input.tenantId),
        eq(documents.documentId, input.documentId)
      )
    });

    if (!document) {
      throw new Error(`Document ${input.documentId} was not found for tenant ${input.tenantId}.`);
    }

    const [nextRevision] = await transaction
      .select({
        revisionNumber: sql<number>`coalesce(max(${documentRevisions.revisionNumber}), 0) + 1`
      })
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, input.documentId));

    const [inserted] = await transaction
      .insert(documentRevisions)
      .values({
        documentRevisionId: crypto.randomUUID(),
        documentId: input.documentId,
        artifactRefId: input.artifactRefId,
        revisionNumber: nextRevision?.revisionNumber ?? 1,
        title: input.title
      })
      .returning();

    if (input.setAsCurrent ?? true) {
      await transaction
        .update(documents)
        .set({
          currentRevisionId: inserted?.documentRevisionId ?? null,
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
