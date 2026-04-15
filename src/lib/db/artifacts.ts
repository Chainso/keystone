import { and, asc, eq } from "drizzle-orm";

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
