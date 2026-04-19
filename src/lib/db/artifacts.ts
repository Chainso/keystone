import { and, asc, eq, isNull, ne, or } from "drizzle-orm";

import type { ArtifactStorageBackend } from "../../maestro/contracts";
import { parseR2Uri } from "../artifacts/r2";
import type { DatabaseClient } from "./client";
import { artifactRefs } from "./schema";

const PROJECT_SCOPED_ARTIFACT_RUN_ID_PREFIX = "project:";

export interface CreateArtifactRefInput {
  tenantId: string;
  runId?: string | null | undefined;
  projectId?: string | null | undefined;
  sessionId?: string | null | undefined;
  taskId?: string | null | undefined;
  runTaskId?: string | null | undefined;
  kind: string;
  artifactKind?: string | null | undefined;
  storageBackend: ArtifactStorageBackend;
  storageUri: string;
  bucket?: string | null | undefined;
  objectKey?: string | null | undefined;
  objectVersion?: string | null | undefined;
  etag?: string | null | undefined;
  contentType: string;
  sha256?: string | null | undefined;
  sizeBytes?: number | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export function buildProjectScopedArtifactRunId(projectId: string) {
  return `${PROJECT_SCOPED_ARTIFACT_RUN_ID_PREFIX}${projectId}`;
}

export function isProjectScopedArtifactRunId(runId: string | null | undefined) {
  return Boolean(runId?.startsWith(PROJECT_SCOPED_ARTIFACT_RUN_ID_PREFIX));
}

function resolvePhysicalObjectLocation(input: CreateArtifactRefInput) {
  if (input.bucket || input.objectKey) {
    return {
      bucket: input.bucket ?? null,
      objectKey: input.objectKey ?? null
    };
  }

  if (input.storageBackend !== "r2") {
    return {
      bucket: null,
      objectKey: null
    };
  }

  try {
    const parsed = parseR2Uri(input.storageUri);

    return {
      bucket: parsed.bucketName,
      objectKey: parsed.key
    };
  } catch {
    return {
      bucket: null,
      objectKey: null
    };
  }
}

function resolveArtifactOwnershipRunId(input: CreateArtifactRefInput) {
  if (input.runId) {
    return input.runId;
  }

  if (input.projectId) {
    return buildProjectScopedArtifactRunId(input.projectId);
  }

  throw new Error("Artifact refs require either a runId or projectId.");
}

export async function createArtifactRef(
  client: DatabaseClient,
  input: CreateArtifactRefInput
) {
  const physicalLocation = resolvePhysicalObjectLocation(input);
  const ownershipRunId = resolveArtifactOwnershipRunId(input);
  const [inserted] = await client.db
    .insert(artifactRefs)
    .values({
      tenantId: input.tenantId,
      artifactRefId: crypto.randomUUID(),
      projectId: input.projectId ?? null,
      runId: ownershipRunId,
      sessionId: input.sessionId ?? null,
      taskId: input.taskId ?? null,
      runTaskId: input.runTaskId ?? null,
      kind: input.kind,
      artifactKind: input.artifactKind ?? input.kind,
      storageBackend: input.storageBackend,
      storageUri: input.storageUri,
      bucket: physicalLocation.bucket,
      objectKey: physicalLocation.objectKey,
      objectVersion: input.objectVersion ?? null,
      etag: input.etag ?? null,
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
