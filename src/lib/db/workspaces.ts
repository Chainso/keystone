import { and, asc, eq } from "drizzle-orm";

import type { WorkspaceStrategy } from "../../maestro/contracts";
import type { DatabaseClient } from "./client";
import { workspaceBindings } from "./schema";

export interface CreateWorkspaceBindingInput {
  tenantId: string;
  workspaceId: string;
  runId: string;
  sessionId: string;
  taskId?: string | null | undefined;
  strategy: WorkspaceStrategy;
  sandboxId: string;
  repoUrl: string;
  repoRef: string;
  baseRef: string;
  worktreePath: string;
  branchName: string;
  metadata?: Record<string, unknown> | undefined;
}

export async function createWorkspaceBinding(
  client: DatabaseClient,
  input: CreateWorkspaceBindingInput
) {
  const [inserted] = await client.db
    .insert(workspaceBindings)
    .values({
      tenantId: input.tenantId,
      bindingId: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      runId: input.runId,
      sessionId: input.sessionId,
      taskId: input.taskId ?? null,
      strategy: input.strategy,
      sandboxId: input.sandboxId,
      repoUrl: input.repoUrl,
      repoRef: input.repoRef,
      baseRef: input.baseRef,
      worktreePath: input.worktreePath,
      branchName: input.branchName,
      metadata: input.metadata ?? {}
    })
    .returning();

  return inserted;
}

export async function getWorkspaceBindingForSession(
  client: DatabaseClient,
  input: {
    tenantId: string;
    sessionId: string;
  }
) {
  return client.db.query.workspaceBindings.findFirst({
    where: and(
      eq(workspaceBindings.tenantId, input.tenantId),
      eq(workspaceBindings.sessionId, input.sessionId)
    )
  });
}

export async function listRunWorkspaceBindings(
  client: DatabaseClient,
  input: {
    tenantId: string;
    runId: string;
  }
) {
  return client.db.query.workspaceBindings.findMany({
    where: and(
      eq(workspaceBindings.tenantId, input.tenantId),
      eq(workspaceBindings.runId, input.runId)
    ),
    orderBy: [asc(workspaceBindings.createdAt)]
  });
}

export async function updateWorkspaceBindingMetadata(
  client: DatabaseClient,
  input: {
    tenantId: string;
    workspaceId: string;
    metadata: Record<string, unknown>;
  }
) {
  const [updated] = await client.db
    .update(workspaceBindings)
    .set({
      metadata: input.metadata,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(workspaceBindings.tenantId, input.tenantId),
        eq(workspaceBindings.workspaceId, input.workspaceId)
      )
    )
    .returning();

  return updated;
}
