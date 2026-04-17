import { and, asc, eq } from "drizzle-orm";

import type { WorkspaceStrategy } from "../../maestro/contracts";
import type { DatabaseClient } from "./client";
import { workspaceBindings, workspaceMaterializedComponents } from "./schema";

export interface CreateWorkspaceMaterializedComponentInput {
  componentKey: string;
  repoUrl: string;
  repoRef: string;
  baseRef: string;
  repositoryPath: string;
  worktreePath: string;
  branchName: string;
  headSha: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface CreateWorkspaceBindingInput {
  tenantId: string;
  workspaceId: string;
  runId: string;
  sessionId: string;
  taskId?: string | null | undefined;
  strategy: WorkspaceStrategy;
  sandboxId: string;
  workspaceRoot: string;
  workspaceTargetPath: string;
  defaultComponentKey?: string | undefined;
  materializedComponents: CreateWorkspaceMaterializedComponentInput[];
  metadata?: Record<string, unknown> | undefined;
}

export async function createWorkspaceBinding(
  client: DatabaseClient,
  input: CreateWorkspaceBindingInput
) {
  const defaultComponent =
    input.materializedComponents.find((component) => component.componentKey === input.defaultComponentKey) ??
    input.materializedComponents[0];

  return client.db.transaction(async (tx) => {
    const bindingId = crypto.randomUUID();
    const [inserted] = await tx
      .insert(workspaceBindings)
      .values({
        tenantId: input.tenantId,
        bindingId,
        workspaceId: input.workspaceId,
        runId: input.runId,
        sessionId: input.sessionId,
        taskId: input.taskId ?? null,
        strategy: input.strategy,
        sandboxId: input.sandboxId,
        repoUrl: defaultComponent?.repoUrl ?? null,
        repoRef: defaultComponent?.repoRef ?? null,
        baseRef: defaultComponent?.baseRef ?? null,
        worktreePath: defaultComponent?.worktreePath ?? null,
        branchName: defaultComponent?.branchName ?? null,
        workspaceRoot: input.workspaceRoot,
        workspaceTargetPath: input.workspaceTargetPath,
        defaultComponentKey: defaultComponent?.componentKey ?? input.defaultComponentKey ?? null,
        metadata: input.metadata ?? {}
      })
      .returning();

    if (input.materializedComponents.length > 0) {
      await tx.insert(workspaceMaterializedComponents).values(
        input.materializedComponents.map((component) => ({
          tenantId: input.tenantId,
          materializationId: crypto.randomUUID(),
          bindingId,
          workspaceId: input.workspaceId,
          runId: input.runId,
          sessionId: input.sessionId,
          taskId: input.taskId ?? null,
          componentKey: component.componentKey,
          repoUrl: component.repoUrl,
          repoRef: component.repoRef,
          baseRef: component.baseRef,
          repositoryPath: component.repositoryPath,
          worktreePath: component.worktreePath,
          branchName: component.branchName,
          headSha: component.headSha,
          metadata: component.metadata ?? {}
        }))
      );
    }

    return inserted;
  });
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

export async function listWorkspaceMaterializedComponents(
  client: DatabaseClient,
  input: {
    tenantId: string;
    workspaceId: string;
  }
) {
  return client.db.query.workspaceMaterializedComponents.findMany({
    where: and(
      eq(workspaceMaterializedComponents.tenantId, input.tenantId),
      eq(workspaceMaterializedComponents.workspaceId, input.workspaceId)
    ),
    orderBy: [asc(workspaceMaterializedComponents.componentKey)]
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
