import { and, asc, eq, isNull, ne, or } from "drizzle-orm";

import type { ArtifactStorageBackend } from "../../maestro/contracts";
import { toR2Uri } from "../artifacts/r2";
import type { DatabaseClient } from "./client";
import type { ArtifactRefRow } from "./schema";
import { artifactRefs, projects, runs, runTasks } from "./schema";

function requireInsertedRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message);
  }

  return row;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function sameNullableString(left: string | null | undefined, right: string | null | undefined) {
  return (left ?? null) === (right ?? null);
}

function sameNullableNumber(left: number | null | undefined, right: number | null | undefined) {
  return (left ?? null) === (right ?? null);
}

function assertArtifactRefOwnership(
  existing: ArtifactRefRow,
  input: CreateArtifactRefInput
) {
  if (
    existing.projectId !== input.projectId ||
    !sameNullableString(existing.runId, input.runId) ||
    !sameNullableString(existing.runTaskId, input.runTaskId) ||
    existing.artifactKind !== input.artifactKind ||
    existing.storageBackend !== input.storageBackend ||
    existing.contentType !== input.contentType ||
    !sameNullableString(existing.objectVersion, input.objectVersion) ||
    !sameNullableString(existing.etag, input.etag) ||
    !sameNullableString(existing.sha256, input.sha256) ||
    !sameNullableNumber(existing.sizeBytes, input.sizeBytes)
  ) {
    throw new Error(
      `Artifact object ${input.bucket}/${input.objectKey} already exists with conflicting ownership, blob identity, or contract data.`
    );
  }
}

async function assertArtifactRefTargets(client: DatabaseClient, input: CreateArtifactRefInput) {
  const project = await client.db.query.projects.findFirst({
    where: and(eq(projects.projectId, input.projectId), eq(projects.tenantId, input.tenantId))
  });

  if (!project) {
    throw new Error(
      `Project ${input.projectId} was not found for tenant ${input.tenantId}.`
    );
  }

  if (input.runTaskId && !input.runId) {
    throw new Error("Artifact refs with a runTaskId must also include a runId.");
  }

  if (!input.runId) {
    return;
  }

  const run = await client.db.query.runs.findFirst({
    where: and(eq(runs.runId, input.runId), eq(runs.tenantId, input.tenantId))
  });

  if (!run) {
    throw new Error(`Run ${input.runId} was not found for artifact ${input.objectKey}.`);
  }

  if (run.projectId !== input.projectId) {
    throw new Error(
      `Artifact ${input.objectKey} run ${input.runId} belongs to project ${run.projectId}, not ${input.projectId}.`
    );
  }

  if (!input.runTaskId) {
    return;
  }

  const runTask = await client.db.query.runTasks.findFirst({
    where: and(eq(runTasks.runId, input.runId), eq(runTasks.runTaskId, input.runTaskId))
  });

  if (!runTask) {
    throw new Error(
      `Artifact ${input.objectKey} run task ${input.runTaskId} does not belong to run ${input.runId}.`
    );
  }
}

export interface CreateArtifactRefInput {
  tenantId: string;
  projectId: string;
  runId?: string | null | undefined;
  runTaskId?: string | null | undefined;
  artifactKind: string;
  storageBackend: ArtifactStorageBackend;
  bucket: string;
  objectKey: string;
  objectVersion?: string | null | undefined;
  etag?: string | null | undefined;
  contentType: string;
  sha256?: string | null | undefined;
  sizeBytes?: number | null | undefined;
}

export function getArtifactStorageUri(
  artifact: Pick<ArtifactRefRow, "storageBackend" | "bucket" | "objectKey">
) {
  if (artifact.storageBackend !== "r2") {
    throw new Error(
      `Artifact storage backend ${artifact.storageBackend} does not support URI derivation.`
    );
  }

  return toR2Uri(artifact.bucket, artifact.objectKey);
}

export async function createArtifactRef(
  client: DatabaseClient,
  input: CreateArtifactRefInput
) {
  await assertArtifactRefTargets(client, input);

  try {
    const [inserted] = await client.db
      .insert(artifactRefs)
      .values({
        tenantId: input.tenantId,
        artifactRefId: crypto.randomUUID(),
        projectId: input.projectId,
        runId: input.runId ?? null,
        runTaskId: input.runTaskId ?? null,
        artifactKind: input.artifactKind,
        storageBackend: input.storageBackend,
        bucket: input.bucket,
        objectKey: input.objectKey,
        objectVersion: input.objectVersion ?? null,
        etag: input.etag ?? null,
        contentType: input.contentType,
        sha256: input.sha256 ?? null,
        sizeBytes: input.sizeBytes ?? null
      })
      .returning();

    return requireInsertedRow(
      inserted,
      `Artifact ref insert returned no row for ${input.artifactKind}.`
    );
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }

    const existing = await findArtifactRefByObjectKey(client, {
      tenantId: input.tenantId,
      bucket: input.bucket,
      objectKey: input.objectKey
    });

    if (existing) {
      assertArtifactRefOwnership(existing, input);
      return existing;
    }

    throw error;
  }
}

export async function deleteArtifactRef(
  client: DatabaseClient,
  input: {
    tenantId: string;
    artifactRefId: string;
  }
) {
  const [deleted] = await client.db
    .delete(artifactRefs)
    .where(
      and(
        eq(artifactRefs.tenantId, input.tenantId),
        eq(artifactRefs.artifactRefId, input.artifactRefId)
      )
    )
    .returning();

  return deleted ?? null;
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

export async function findArtifactRefByObjectKey(
  client: DatabaseClient,
  input: {
    tenantId: string;
    bucket: string;
    objectKey: string;
    runId?: string | null | undefined;
    runTaskId?: string | null | undefined;
    artifactKind?: string | undefined;
  }
) {
  return client.db.query.artifactRefs.findFirst({
    where: and(
      eq(artifactRefs.tenantId, input.tenantId),
      eq(artifactRefs.bucket, input.bucket),
      eq(artifactRefs.objectKey, input.objectKey),
      input.runId === undefined
        ? undefined
        : input.runId === null
          ? isNull(artifactRefs.runId)
          : eq(artifactRefs.runId, input.runId),
      input.runTaskId === undefined
        ? undefined
        : input.runTaskId === null
          ? isNull(artifactRefs.runTaskId)
          : eq(artifactRefs.runTaskId, input.runTaskId),
      input.artifactKind ? eq(artifactRefs.artifactKind, input.artifactKind) : undefined
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
    excludeRunTaskId?: string | undefined;
  }
) {
  const baseWhere = and(
    eq(artifactRefs.tenantId, input.tenantId),
    eq(artifactRefs.runId, input.runId)
  );
  const where = input.excludeRunTaskId
    ? and(
        baseWhere,
        or(isNull(artifactRefs.runTaskId), ne(artifactRefs.runTaskId, input.excludeRunTaskId))
      )
    : baseWhere;

  return client.db.query.artifactRefs.findMany({
    where,
    orderBy: [asc(artifactRefs.createdAt)]
  });
}
