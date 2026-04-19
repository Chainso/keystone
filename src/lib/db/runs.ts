import { and, asc, eq, inArray } from "drizzle-orm";

import { assertSessionStatusTransition, buildConfiguredSession } from "../../maestro/session";
import type { SessionSpec, SessionStatus } from "../../maestro/contracts";
import { resolveRunExecutionEngine } from "../runs/options";
import { buildRunWorkflowInstanceId } from "../workflows/ids";
import type { DatabaseClient } from "./client";
import {
  documentRevisions,
  documents,
  projects,
  runTaskDependencies,
  runTasks,
  runs,
  sessions,
  type RunRow,
  type SessionRow
} from "./schema";

interface RunLookupInput {
  tenantId: string;
  runId: string;
}

export interface CreateRunRecordInput {
  tenantId: string;
  runId: string;
  projectId: string;
  workflowInstanceId: string;
  executionEngine: string;
  sandboxId?: string | null | undefined;
  status: string;
  compiledSpecRevisionId?: string | null | undefined;
  compiledArchitectureRevisionId?: string | null | undefined;
  compiledExecutionPlanRevisionId?: string | null | undefined;
  compiledAt?: Date | null | undefined;
  startedAt?: Date | null | undefined;
  endedAt?: Date | null | undefined;
}

export interface UpdateRunRecordInput extends RunLookupInput {
  workflowInstanceId?: string | undefined;
  executionEngine?: string | undefined;
  sandboxId?: string | null | undefined;
  status?: string | undefined;
  compiledSpecRevisionId?: string | null | undefined;
  compiledArchitectureRevisionId?: string | null | undefined;
  compiledExecutionPlanRevisionId?: string | null | undefined;
  compiledAt?: Date | null | undefined;
  startedAt?: Date | null | undefined;
  endedAt?: Date | null | undefined;
}

export interface CreateRunTaskInput extends RunLookupInput {
  runTaskId?: string | undefined;
  name: string;
  description: string;
  status: string;
  conversationAgentClass?: string | null | undefined;
  conversationAgentName?: string | null | undefined;
  startedAt?: Date | null | undefined;
  endedAt?: Date | null | undefined;
}

export interface UpdateRunTaskInput extends RunLookupInput {
  runTaskId: string;
  name?: string | undefined;
  description?: string | undefined;
  status?: string | undefined;
  conversationAgentClass?: string | null | undefined;
  conversationAgentName?: string | null | undefined;
  startedAt?: Date | null | undefined;
  endedAt?: Date | null | undefined;
}

export interface CreateRunTaskDependencyInput extends RunLookupInput {
  runTaskDependencyId?: string | undefined;
  parentRunTaskId: string;
  childRunTaskId: string;
}

const compileProvenanceRequirements = {
  compiledSpecRevisionId: {
    kind: "specification",
    path: "specification"
  },
  compiledArchitectureRevisionId: {
    kind: "architecture",
    path: "architecture"
  },
  compiledExecutionPlanRevisionId: {
    kind: "execution_plan",
    path: "execution-plan"
  }
} as const;

type CompileProvenanceField = keyof typeof compileProvenanceRequirements;

type RunDbTransaction = Parameters<Parameters<DatabaseClient["db"]["transaction"]>[0]>[0];
type RunDbExecutor = DatabaseClient["db"] | RunDbTransaction;

type CompileProvenanceInput = Pick<
  CreateRunRecordInput,
  | "compiledSpecRevisionId"
  | "compiledArchitectureRevisionId"
  | "compiledExecutionPlanRevisionId"
> &
  Pick<
    UpdateRunRecordInput,
    | "compiledSpecRevisionId"
    | "compiledArchitectureRevisionId"
    | "compiledExecutionPlanRevisionId"
  >;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

async function findProjectRecord(
  db: RunDbExecutor,
  input: {
    tenantId: string;
    projectId: string;
  }
) {
  return db.query.projects.findFirst({
    where: and(eq(projects.tenantId, input.tenantId), eq(projects.projectId, input.projectId))
  });
}

async function assertProjectOwnership(
  db: RunDbExecutor,
  input: {
    tenantId: string;
    projectId: string;
  }
) {
  const project = await findProjectRecord(db, input);

  if (!project) {
    throw new Error(`Project ${input.projectId} was not found for tenant ${input.tenantId}.`);
  }

  return project;
}

async function findRunRecord(db: RunDbExecutor, input: RunLookupInput) {
  return db.query.runs.findFirst({
    where: and(eq(runs.tenantId, input.tenantId), eq(runs.runId, input.runId))
  });
}

async function assertRunOwnership(db: RunDbExecutor, input: RunLookupInput) {
  const run = await findRunRecord(db, input);

  if (!run) {
    throw new Error(`Run ${input.runId} was not found for tenant ${input.tenantId}.`);
  }

  return run;
}

function isTerminalRunStatus(status: string) {
  return status === "archived" || status === "failed" || status === "cancelled";
}

function deriveRunLifecycleTimestamps(
  existing: RunRow | null,
  status: string,
  transitionAt: Date
) {
  if (status === "active") {
    return {
      startedAt: existing?.startedAt ?? transitionAt,
      endedAt: existing?.endedAt ?? null
    };
  }

  if (isTerminalRunStatus(status)) {
    return {
      startedAt: existing?.startedAt ?? transitionAt,
      endedAt: existing?.endedAt ?? transitionAt
    };
  }

  return {
    startedAt: existing?.startedAt,
    endedAt: existing?.endedAt
  };
}

async function assertCompileProvenanceRevisions(
  db: RunDbExecutor,
  context: {
    tenantId: string;
    projectId: string;
    runId: string;
  },
  input: CompileProvenanceInput
) {
  const requestedRevisions = (
    Object.entries(compileProvenanceRequirements) as Array<
      [CompileProvenanceField, (typeof compileProvenanceRequirements)[CompileProvenanceField]]
    >
  )
    .map(([field, requirement]) => {
      const revisionId = input[field];

      if (!revisionId) {
        return null;
      }

      return {
        field,
        revisionId,
        requirement
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (requestedRevisions.length === 0) {
    return;
  }

  const revisions = await db
    .select({
      documentRevisionId: documentRevisions.documentRevisionId,
      documentId: documentRevisions.documentId,
      documentProjectId: documents.projectId,
      documentRunId: documents.runId,
      documentScopeType: documents.scopeType,
      documentKind: documents.kind,
      documentPath: documents.path
    })
    .from(documentRevisions)
    .innerJoin(documents, eq(documents.documentId, documentRevisions.documentId))
    .where(
      and(
        eq(documents.tenantId, context.tenantId),
        inArray(
          documentRevisions.documentRevisionId,
          requestedRevisions.map((entry) => entry.revisionId)
        )
      )
    );

  const revisionsById = new Map(revisions.map((revision) => [revision.documentRevisionId, revision]));

  for (const { field, revisionId, requirement } of requestedRevisions) {
    const revision = revisionsById.get(revisionId);

    if (!revision) {
      throw new Error(
        `${field} ${revisionId} was not found for run ${context.runId} in tenant ${context.tenantId}.`
      );
    }

    if (revision.documentProjectId !== context.projectId) {
      throw new Error(
        `${field} ${revisionId} does not belong to project ${context.projectId} for run ${context.runId}.`
      );
    }

    if (revision.documentScopeType !== "run" || revision.documentRunId !== context.runId) {
      throw new Error(
        `${field} ${revisionId} does not belong to run ${context.runId} for tenant ${context.tenantId}.`
      );
    }

    if (revision.documentKind !== requirement.kind || revision.documentPath !== requirement.path) {
      throw new Error(
        `${field} ${revisionId} must reference the run ${requirement.path} planning document.`
      );
    }
  }
}

async function insertRunRecord(db: RunDbExecutor, input: CreateRunRecordInput) {
  const [inserted] = await db
    .insert(runs)
    .values({
      runId: input.runId,
      tenantId: input.tenantId,
      projectId: input.projectId,
      workflowInstanceId: input.workflowInstanceId,
      executionEngine: input.executionEngine,
      sandboxId: input.sandboxId ?? null,
      status: input.status,
      compiledSpecRevisionId: input.compiledSpecRevisionId ?? null,
      compiledArchitectureRevisionId: input.compiledArchitectureRevisionId ?? null,
      compiledExecutionPlanRevisionId: input.compiledExecutionPlanRevisionId ?? null,
      compiledAt: input.compiledAt ?? null,
      startedAt: input.startedAt ?? null,
      endedAt: input.endedAt ?? null
    })
    .returning();

  return inserted;
}

async function updateRunRecordRow(
  db: RunDbExecutor,
  existing: RunRow,
  input: UpdateRunRecordInput
) {
  const [updated] = await db
    .update(runs)
    .set({
      workflowInstanceId: input.workflowInstanceId ?? existing.workflowInstanceId,
      executionEngine: input.executionEngine ?? existing.executionEngine,
      sandboxId: input.sandboxId === undefined ? existing.sandboxId : input.sandboxId,
      status: input.status ?? existing.status,
      compiledSpecRevisionId:
        input.compiledSpecRevisionId === undefined
          ? existing.compiledSpecRevisionId
          : input.compiledSpecRevisionId,
      compiledArchitectureRevisionId:
        input.compiledArchitectureRevisionId === undefined
          ? existing.compiledArchitectureRevisionId
          : input.compiledArchitectureRevisionId,
      compiledExecutionPlanRevisionId:
        input.compiledExecutionPlanRevisionId === undefined
          ? existing.compiledExecutionPlanRevisionId
          : input.compiledExecutionPlanRevisionId,
      compiledAt: input.compiledAt === undefined ? existing.compiledAt : input.compiledAt,
      startedAt: input.startedAt === undefined ? existing.startedAt : input.startedAt,
      endedAt: input.endedAt === undefined ? existing.endedAt : input.endedAt,
      updatedAt: new Date()
    })
    .where(and(eq(runs.tenantId, input.tenantId), eq(runs.runId, input.runId)))
    .returning();

  return updated;
}

async function findSessionRecord(
  db: RunDbExecutor,
  tenantId: string,
  sessionId: string
) {
  return db.query.sessions.findFirst({
    where: and(eq(sessions.tenantId, tenantId), eq(sessions.sessionId, sessionId))
  });
}

async function insertSessionRecordRow(db: RunDbExecutor, session: ReturnType<typeof buildConfiguredSession>) {
  const [inserted] = await db
    .insert(sessions)
    .values({
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      runId: session.runId,
      sessionType: session.sessionType,
      status: session.status,
      parentSessionId: session.parentSessionId ?? null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: session.metadata
    })
    .returning();

  return inserted;
}

function deriveRunSeedFromSession(
  session: SessionRow,
  status: SessionStatus,
  metadata: Record<string, unknown>,
  transitionAt: Date
): CreateRunRecordInput | null {
  const projectId = asString(asRecord(metadata.project)?.projectId);

  if (!projectId) {
    return null;
  }

  const lifecycleTimestamps = deriveRunLifecycleTimestamps(null, status, transitionAt);

  return {
    tenantId: session.tenantId,
    runId: session.runId,
    projectId,
    workflowInstanceId:
      asString(metadata.workflowInstanceId) ??
      buildRunWorkflowInstanceId(session.tenantId, session.runId),
    executionEngine: resolveRunExecutionEngine(undefined, metadata),
    status,
    startedAt: lifecycleTimestamps.startedAt ?? null,
    endedAt: lifecycleTimestamps.endedAt ?? null
  };
}

export async function createRunRecord(client: DatabaseClient, input: CreateRunRecordInput) {
  await assertProjectOwnership(client.db, {
    tenantId: input.tenantId,
    projectId: input.projectId
  });

  await assertCompileProvenanceRevisions(
    client.db,
    {
      tenantId: input.tenantId,
      projectId: input.projectId,
      runId: input.runId
    },
    input
  );

  return insertRunRecord(client.db, input);
}

export async function getRunRecord(client: DatabaseClient, input: RunLookupInput) {
  return findRunRecord(client.db, input);
}

export async function ensureRunRecord(client: DatabaseClient, input: CreateRunRecordInput) {
  const existing = await getRunRecord(client, {
    tenantId: input.tenantId,
    runId: input.runId
  });

  if (!existing) {
    return createRunRecord(client, input);
  }

  if (existing.projectId !== input.projectId) {
    throw new Error(
      `Run ${input.runId} already belongs to project ${existing.projectId}, not ${input.projectId}.`
    );
  }

  const lifecycleTimestamps = deriveRunLifecycleTimestamps(existing, input.status, new Date());

  return updateRunRecord(client, {
    tenantId: input.tenantId,
    runId: input.runId,
    workflowInstanceId: input.workflowInstanceId,
    executionEngine: input.executionEngine,
    sandboxId: input.sandboxId,
    status: input.status,
    compiledSpecRevisionId: input.compiledSpecRevisionId,
    compiledArchitectureRevisionId: input.compiledArchitectureRevisionId,
    compiledExecutionPlanRevisionId: input.compiledExecutionPlanRevisionId,
    compiledAt: input.compiledAt,
    startedAt: input.startedAt ?? lifecycleTimestamps.startedAt,
    endedAt: input.endedAt ?? lifecycleTimestamps.endedAt
  });
}

export async function listProjectRuns(
  client: DatabaseClient,
  input: {
    tenantId: string;
    projectId: string;
  }
) {
  await assertProjectOwnership(client.db, input);

  return client.db.query.runs.findMany({
    where: and(eq(runs.tenantId, input.tenantId), eq(runs.projectId, input.projectId)),
    orderBy: [asc(runs.createdAt)]
  });
}

export async function updateRunRecord(client: DatabaseClient, input: UpdateRunRecordInput) {
  const existing = await assertRunOwnership(client.db, input);

  await assertCompileProvenanceRevisions(
    client.db,
    {
      tenantId: existing.tenantId,
      projectId: existing.projectId,
      runId: existing.runId
    },
    input
  );

  return updateRunRecordRow(client.db, existing, input);
}

export async function createRunTask(client: DatabaseClient, input: CreateRunTaskInput) {
  await assertRunOwnership(client.db, input);

  const [inserted] = await client.db
    .insert(runTasks)
    .values({
      runTaskId: input.runTaskId ?? crypto.randomUUID(),
      runId: input.runId,
      name: input.name,
      description: input.description,
      status: input.status,
      conversationAgentClass: input.conversationAgentClass ?? null,
      conversationAgentName: input.conversationAgentName ?? null,
      startedAt: input.startedAt ?? null,
      endedAt: input.endedAt ?? null
    })
    .returning();

  return inserted;
}

export async function getRunTask(
  client: DatabaseClient,
  input: RunLookupInput & {
    runTaskId: string;
  }
) {
  await assertRunOwnership(client.db, input);

  return client.db.query.runTasks.findFirst({
    where: and(eq(runTasks.runId, input.runId), eq(runTasks.runTaskId, input.runTaskId))
  });
}

export async function listRunTasks(client: DatabaseClient, input: RunLookupInput) {
  await assertRunOwnership(client.db, input);

  return client.db.query.runTasks.findMany({
    where: eq(runTasks.runId, input.runId),
    orderBy: [asc(runTasks.createdAt)]
  });
}

export async function updateRunTask(client: DatabaseClient, input: UpdateRunTaskInput) {
  const existing = await getRunTask(client, input);

  if (!existing) {
    throw new Error(`Run task ${input.runTaskId} was not found for run ${input.runId}.`);
  }

  const [updated] = await client.db
    .update(runTasks)
    .set({
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      status: input.status ?? existing.status,
      conversationAgentClass:
        input.conversationAgentClass === undefined
          ? existing.conversationAgentClass
          : input.conversationAgentClass,
      conversationAgentName:
        input.conversationAgentName === undefined
          ? existing.conversationAgentName
          : input.conversationAgentName,
      startedAt: input.startedAt === undefined ? existing.startedAt : input.startedAt,
      endedAt: input.endedAt === undefined ? existing.endedAt : input.endedAt,
      updatedAt: new Date()
    })
    .where(and(eq(runTasks.runId, input.runId), eq(runTasks.runTaskId, input.runTaskId)))
    .returning();

  return updated;
}

export async function createRunTaskDependency(
  client: DatabaseClient,
  input: CreateRunTaskDependencyInput
) {
  await assertRunOwnership(client.db, input);

  if (input.parentRunTaskId === input.childRunTaskId) {
    throw new Error("Run task dependencies cannot reference the same task on both ends.");
  }

  const [inserted] = await client.db
    .insert(runTaskDependencies)
    .values({
      runTaskDependencyId: input.runTaskDependencyId ?? crypto.randomUUID(),
      runId: input.runId,
      parentRunTaskId: input.parentRunTaskId,
      childRunTaskId: input.childRunTaskId
    })
    .returning();

  return inserted;
}

export async function listRunTaskDependencies(client: DatabaseClient, input: RunLookupInput) {
  await assertRunOwnership(client.db, input);

  return client.db.query.runTaskDependencies.findMany({
    where: eq(runTaskDependencies.runId, input.runId),
    orderBy: [asc(runTaskDependencies.createdAt)]
  });
}

export async function createSessionRecord(
  client: DatabaseClient,
  sessionSpec: SessionSpec,
  overrides?: {
    sessionId?: string | undefined;
    status?: SessionStatus | undefined;
  }
) {
  const session = buildConfiguredSession(sessionSpec, overrides);
  return insertSessionRecordRow(client.db, session);
}

export async function getSessionRecord(
  client: DatabaseClient,
  tenantId: string,
  sessionId: string
) {
  return findSessionRecord(client.db, tenantId, sessionId);
}

export async function createRunSessionMirror(
  client: DatabaseClient,
  input: {
    sessionSpec: SessionSpec;
    projectId: string;
    workflowInstanceId: string;
    executionEngine: string;
    sessionId?: string | undefined;
    status?: SessionStatus | undefined;
  }
) {
  return client.db.transaction(async (transaction) => {
    await assertProjectOwnership(transaction, {
      tenantId: input.sessionSpec.tenantId,
      projectId: input.projectId
    });

    const session = buildConfiguredSession(input.sessionSpec, {
      sessionId: input.sessionId,
      status: input.status
    });
    const insertedSession = await insertSessionRecordRow(transaction, session);
    const lifecycleTimestamps = deriveRunLifecycleTimestamps(
      null,
      insertedSession.status as SessionStatus,
      insertedSession.updatedAt
    );
    const runRecord = await insertRunRecord(transaction, {
      tenantId: insertedSession.tenantId,
      runId: insertedSession.runId,
      projectId: input.projectId,
      workflowInstanceId: input.workflowInstanceId,
      executionEngine: input.executionEngine,
      status: insertedSession.status,
      startedAt: lifecycleTimestamps.startedAt ?? null,
      endedAt: lifecycleTimestamps.endedAt ?? null
    });

    return {
      session: insertedSession,
      runRecord
    };
  });
}

export async function listRunSessions(
  client: DatabaseClient,
  tenantId: string,
  runId: string
) {
  return client.db.query.sessions.findMany({
    where: and(eq(sessions.tenantId, tenantId), eq(sessions.runId, runId)),
    orderBy: [asc(sessions.createdAt)]
  });
}

export async function listProjectRunSessions(
  client: DatabaseClient,
  input: {
    tenantId: string;
    projectId: string;
  }
) {
  const projectRuns = await listProjectRuns(client, input);

  if (projectRuns.length === 0) {
    return [];
  }

  const runIds = new Set(projectRuns.map((run) => run.runId));

  return client.db.query.sessions.findMany({
    where: and(
      eq(sessions.tenantId, input.tenantId),
      eq(sessions.sessionType, "run")
    ),
    orderBy: [asc(sessions.createdAt)]
  }).then((rows) => rows.filter((row) => runIds.has(row.runId)));
}

export async function updateSessionStatus(
  client: DatabaseClient,
  input: {
    tenantId: string;
    sessionId: string;
    status: SessionStatus;
    metadata?: Record<string, unknown> | undefined;
  }
) {
  return client.db.transaction(async (transaction) => {
    const existing = await findSessionRecord(transaction, input.tenantId, input.sessionId);

    if (!existing) {
      throw new Error(`Session ${input.sessionId} was not found for tenant ${input.tenantId}.`);
    }

    assertSessionStatusTransition(existing.status as SessionStatus, input.status);

    const nextMetadata = input.metadata ?? existing.metadata;
    const [updated] = await transaction
      .update(sessions)
      .set({
        status: input.status,
        updatedAt: new Date(),
        metadata: nextMetadata
      })
      .where(and(eq(sessions.tenantId, input.tenantId), eq(sessions.sessionId, input.sessionId)))
      .returning();

    if (existing.sessionType === "run") {
      const run = await findRunRecord(transaction, {
        tenantId: existing.tenantId,
        runId: existing.runId
      });

      if (run) {
        const lifecycleTimestamps = deriveRunLifecycleTimestamps(run, input.status, updated.updatedAt);

        await updateRunRecordRow(transaction, run, {
          tenantId: existing.tenantId,
          runId: existing.runId,
          status: input.status,
          startedAt: lifecycleTimestamps.startedAt,
          endedAt: lifecycleTimestamps.endedAt
        });
      } else {
        const runSeed = deriveRunSeedFromSession(
          existing,
          input.status,
          nextMetadata,
          updated.updatedAt
        );

        if (!runSeed) {
          throw new Error(
            `Run ${existing.runId} is missing while updating run session ${existing.sessionId}, and the session metadata cannot reconstruct the mirror row.`
          );
        }

        await assertProjectOwnership(transaction, {
          tenantId: runSeed.tenantId,
          projectId: runSeed.projectId
        });
        await insertRunRecord(transaction, runSeed);
      }
    }

    return updated;
  });
}
