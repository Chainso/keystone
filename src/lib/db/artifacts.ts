import { and, asc, eq, isNull, ne, or } from "drizzle-orm";

import type { ArtifactStorageBackend } from "../../maestro/contracts";
import type { DatabaseClient } from "./client";
import { artifactRefs } from "./schema";

export interface CreateArtifactRefInput {
  tenantId: string;
  runId: string;
  sessionId?: string | null | undefined;
  taskId?: string | null | undefined;
  kind: string;
  storageBackend: ArtifactStorageBackend;
  storageUri: string;
  contentType: string;
  sha256?: string | null | undefined;
  sizeBytes?: number | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export async function createArtifactRef(
  client: DatabaseClient,
  input: CreateArtifactRefInput
) {
  const [inserted] = await client.db
    .insert(artifactRefs)
    .values({
      tenantId: input.tenantId,
      artifactRefId: crypto.randomUUID(),
      runId: input.runId,
      sessionId: input.sessionId ?? null,
      taskId: input.taskId ?? null,
      kind: input.kind,
      storageBackend: input.storageBackend,
      storageUri: input.storageUri,
      contentType: input.contentType,
      sha256: input.sha256 ?? null,
      sizeBytes: input.sizeBytes ?? null,
      metadata: input.metadata ?? {}
    })
    .returning();

  return inserted;
}

export async function getArtifactRef(
  client: DatabaseClient,
  tenantId: string,
  artifactRefId: string
) {
  return client.db.query.artifactRefs.findFirst({
    where: and(
      eq(artifactRefs.tenantId, tenantId),
      eq(artifactRefs.artifactRefId, artifactRefId)
    )
  });
}

export async function findArtifactRefByStorageUri(
  client: DatabaseClient,
  input: {
    tenantId: string;
    runId: string;
    storageUri: string;
    sessionId?: string | null | undefined;
    taskId?: string | null | undefined;
    kind?: string | undefined;
  }
) {
  return client.db.query.artifactRefs.findFirst({
    where: and(
      eq(artifactRefs.tenantId, input.tenantId),
      eq(artifactRefs.runId, input.runId),
      eq(artifactRefs.storageUri, input.storageUri),
      input.sessionId === undefined
        ? undefined
        : input.sessionId === null
          ? isNull(artifactRefs.sessionId)
          : eq(artifactRefs.sessionId, input.sessionId),
      input.taskId === undefined
        ? undefined
        : input.taskId === null
          ? isNull(artifactRefs.taskId)
          : eq(artifactRefs.taskId, input.taskId),
      input.kind ? eq(artifactRefs.kind, input.kind) : undefined
    )
  });
}

export async function listRunArtifacts(
  client: DatabaseClient,
  tenantId: string,
  runId: string
) {
  return client.db.query.artifactRefs.findMany({
    where: and(eq(artifactRefs.tenantId, tenantId), eq(artifactRefs.runId, runId)),
    orderBy: [asc(artifactRefs.createdAt)]
  });
}

export async function listArtifactsForSandboxProjection(
  client: DatabaseClient,
  input: {
    tenantId: string;
    runId: string;
    excludeSessionId?: string | undefined;
  }
) {
  const baseWhere = and(
    eq(artifactRefs.tenantId, input.tenantId),
    eq(artifactRefs.runId, input.runId)
  );
  const where = input.excludeSessionId
    ? and(
        baseWhere,
        or(isNull(artifactRefs.sessionId), ne(artifactRefs.sessionId, input.excludeSessionId))
      )
    : baseWhere;

  return client.db.query.artifactRefs.findMany({
    where,
    orderBy: [asc(artifactRefs.createdAt)]
  });
}
