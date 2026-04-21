import { and, asc, eq, inArray } from "drizzle-orm";

import { buildStableRunTaskId } from "../workflows/ids";
import { buildRunSandboxId } from "../workspace/worktree";
import type { DatabaseClient } from "./client";
import {
  artifactRefs,
  documentRevisions,
  documents,
  projects,
  runTaskDependencies,
  runTasks,
  runs,
  type RunRow,
  type RunTaskDependencyRow,
  type RunTaskRow
} from "./schema";

interface RunLookupInput {
  tenantId: string;
  runId: string;
}

export type ProjectTaskCollectionFilter = "all" | "active" | "running" | "queued" | "blocked";

export interface ListProjectTasksInput {
  tenantId: string;
  projectId: string;
  filter: ProjectTaskCollectionFilter;
  page: number;
  pageSize: number;
}

export interface ListProjectTasksResult {
  items: RunTaskRow[];
  dependencies: RunTaskDependencyRow[];
  total: number;
  page: number;
  pageSize: number;
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
  ifStatusIn?: string[] | undefined;
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

export interface PersistCompiledRunGraphTaskInput {
  taskId: string;
  runTaskId?: string | undefined;
  name: string;
  description: string;
  dependsOn?: string[] | undefined;
  status?: string | undefined;
  conversationAgentClass?: string | null | undefined;
  conversationAgentName?: string | null | undefined;
}

export interface PersistCompiledRunGraphInput extends RunLookupInput {
  compiledSpecRevisionId?: string | null | undefined;
  compiledArchitectureRevisionId?: string | null | undefined;
  compiledExecutionPlanRevisionId?: string | null | undefined;
  compiledAt?: Date | null | undefined;
  tasks: PersistCompiledRunGraphTaskInput[];
}

export interface PersistCompiledRunGraphTaskRecord {
  taskId: string;
  runTaskId: string;
  name: string;
  description: string;
  status: string;
  conversationAgentClass: string | null;
  conversationAgentName: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
}

export interface PersistCompiledRunGraphDependencyRecord {
  runTaskDependencyId: string;
  parentTaskId: string;
  childTaskId: string;
  parentRunTaskId: string;
  childRunTaskId: string;
}

export interface PersistCompiledRunGraphResult {
  run: RunRow;
  tasks: PersistCompiledRunGraphTaskRecord[];
  dependencies: PersistCompiledRunGraphDependencyRecord[];
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

function hasCompileProvenanceValues(input: CompileProvenanceInput) {
  return (
    input.compiledSpecRevisionId !== undefined ||
    input.compiledArchitectureRevisionId !== undefined ||
    input.compiledExecutionPlanRevisionId !== undefined
  );
}

function assertCompleteCompileProvenanceInput(input: CompileProvenanceInput) {
  if (!hasCompileProvenanceValues(input)) {
    return;
  }

  const values = [
    input.compiledSpecRevisionId ?? null,
    input.compiledArchitectureRevisionId ?? null,
    input.compiledExecutionPlanRevisionId ?? null
  ];
  const presentCount = values.filter((value) => value !== null).length;

  if (presentCount !== 0 && presentCount !== values.length) {
    throw new Error(
      "Compiled run graph persistence requires specification, architecture, and execution-plan revision ids together."
    );
  }
}

function requireReturnedRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message);
  }

  return row;
}

function normalizeDependencyIds(dependsOn: string[] | undefined) {
  return [...new Set((dependsOn ?? []).map((dependency) => dependency.trim()).filter(Boolean))];
}

function deriveCompiledTaskInitialStatus(dependsOn: string[]) {
  return dependsOn.length === 0 ? "ready" : "pending";
}

function assertAcyclicCompiledTaskGraph(
  tasks: Array<{
    taskId: string;
    dependsOn: string[];
  }>
) {
  const dependenciesByTaskId = new Map(tasks.map((task) => [task.taskId, task.dependsOn]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (taskId: string, lineage: string[]) => {
    if (visited.has(taskId)) {
      return;
    }

    if (visiting.has(taskId)) {
      throw new Error(
        `Compiled run graph must be acyclic; detected a dependency cycle involving ${[...lineage, taskId].join(" -> ")}.`
      );
    }

    visiting.add(taskId);

    for (const dependencyId of dependenciesByTaskId.get(taskId) ?? []) {
      visit(dependencyId, [...lineage, taskId]);
    }

    visiting.delete(taskId);
    visited.add(taskId);
  };

  for (const task of tasks) {
    visit(task.taskId, []);
  }
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

function resolveProjectTaskStatuses(filter: ProjectTaskCollectionFilter) {
  switch (filter) {
    case "active":
      return ["active", "ready", "pending", "blocked"];
    case "running":
      return ["active"];
    case "queued":
      return ["ready", "pending"];
    case "blocked":
      return ["blocked"];
    case "all":
    default:
      return null;
  }
}

function deriveRunLifecycleTimestamps(
  existing: RunRow | null,
  status: string,
  transitionAt: Date
) {
  if (status === "active") {
    return {
      startedAt: existing?.startedAt ?? transitionAt,
      endedAt: null
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
  assertCompleteCompileProvenanceInput(input);

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
  const sandboxId = input.sandboxId ?? buildRunSandboxId(input.tenantId, input.runId);
  const [inserted] = await db
    .insert(runs)
    .values({
      runId: input.runId,
      tenantId: input.tenantId,
      projectId: input.projectId,
      workflowInstanceId: input.workflowInstanceId,
      executionEngine: input.executionEngine,
      sandboxId,
      status: input.status,
      compiledSpecRevisionId: input.compiledSpecRevisionId ?? null,
      compiledArchitectureRevisionId: input.compiledArchitectureRevisionId ?? null,
      compiledExecutionPlanRevisionId: input.compiledExecutionPlanRevisionId ?? null,
      compiledAt: input.compiledAt ?? null,
      startedAt: input.startedAt ?? null,
      endedAt: input.endedAt ?? null
    })
    .returning();

  return requireReturnedRow(inserted, `Run insert returned no row for ${input.runId}.`);
}

async function updateRunRecordRow(
  db: RunDbExecutor,
  existing: RunRow,
  input: UpdateRunRecordInput
) {
  const sandboxId = input.sandboxId ?? existing.sandboxId;
  const [updated] = await db
    .update(runs)
    .set({
      workflowInstanceId: input.workflowInstanceId ?? existing.workflowInstanceId,
      executionEngine: input.executionEngine ?? existing.executionEngine,
      sandboxId,
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

  return requireReturnedRow(updated, `Run update returned no row for ${input.runId}.`);
}

async function insertRunTaskRow(db: RunDbExecutor, input: CreateRunTaskInput) {
  const [inserted] = await db
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

  return requireReturnedRow(
    inserted,
    `Run task insert returned no row for ${input.runTaskId ?? "generated task"}.`
  );
}

async function updateRunTaskRow(
  db: RunDbExecutor,
  existing: RunTaskRow,
  input: UpdateRunTaskInput
) {
  const whereClauses = [
    eq(runTasks.runId, input.runId),
    eq(runTasks.runTaskId, input.runTaskId)
  ];

  if (input.ifStatusIn && input.ifStatusIn.length > 0) {
    whereClauses.push(inArray(runTasks.status, input.ifStatusIn));
  }

  const [updated] = await db
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
    .where(and(...whereClauses))
    .returning();

  if (updated) {
    return updated;
  }

  const current = await db.query.runTasks.findFirst({
    where: and(eq(runTasks.runId, input.runId), eq(runTasks.runTaskId, input.runTaskId))
  });

  return requireReturnedRow(current, `Run task update returned no row for ${input.runTaskId}.`);
}

async function insertRunTaskDependencyRow(db: RunDbExecutor, input: CreateRunTaskDependencyInput) {
  const [inserted] = await db
    .insert(runTaskDependencies)
    .values({
      runTaskDependencyId: input.runTaskDependencyId ?? crypto.randomUUID(),
      runId: input.runId,
      parentRunTaskId: input.parentRunTaskId,
      childRunTaskId: input.childRunTaskId
    })
    .returning();

  return requireReturnedRow(
    inserted,
    `Run task dependency insert returned no row for ${input.parentRunTaskId} -> ${input.childRunTaskId}.`
  );
}

export async function createRunRecord(client: DatabaseClient, input: CreateRunRecordInput) {
  const sandboxId = input.sandboxId ?? buildRunSandboxId(input.tenantId, input.runId);

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

  return insertRunRecord(client.db, {
    ...input,
    sandboxId
  });
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

  if (input.status === "active" && isTerminalRunStatus(existing.status)) {
    throw new Error(
      `Run ${input.runId} is already ${existing.status} and cannot transition back to active.`
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

export async function listProjectTasks(
  client: DatabaseClient,
  input: ListProjectTasksInput
): Promise<ListProjectTasksResult> {
  await assertProjectOwnership(client.db, input);

  const filteredStatuses = resolveProjectTaskStatuses(input.filter);
  const whereClauses = [eq(runs.tenantId, input.tenantId), eq(runs.projectId, input.projectId)];

  if (filteredStatuses) {
    whereClauses.push(inArray(runTasks.status, filteredStatuses));
  }

  const offset = (input.page - 1) * input.pageSize;
  const matchingTaskIds = await client.db
    .select({
      runTaskId: runTasks.runTaskId
    })
    .from(runTasks)
    .innerJoin(runs, eq(runs.runId, runTasks.runId))
    .where(and(...whereClauses));
  const rows = await client.db
    .select({
      task: runTasks
    })
    .from(runTasks)
    .innerJoin(runs, eq(runs.runId, runTasks.runId))
    .where(and(...whereClauses))
    .orderBy(asc(runs.createdAt), asc(runTasks.createdAt))
    .limit(input.pageSize)
    .offset(offset);
  const items = rows.map((row) => row.task);
  const runIds = [...new Set(items.map((task) => task.runId))];
  const runTaskIds = items.map((task) => task.runTaskId);
  const dependencies =
    runIds.length === 0 || runTaskIds.length === 0
      ? []
      : await client.db.query.runTaskDependencies.findMany({
          where: and(
            inArray(runTaskDependencies.runId, runIds),
            inArray(runTaskDependencies.childRunTaskId, runTaskIds)
          ),
          orderBy: [asc(runTaskDependencies.createdAt)]
        });

  return {
    items,
    dependencies,
    total: matchingTaskIds.length,
    page: input.page,
    pageSize: input.pageSize
  };
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

export async function failRunAndCancelOutstandingTasks(
  client: DatabaseClient,
  input: RunLookupInput
) {
  return client.db.transaction(async (transaction) => {
    const existingRun = await assertRunOwnership(transaction, input);
    const transitionAt = new Date();
    const existingTasks = await transaction.query.runTasks.findMany({
      where: eq(runTasks.runId, input.runId)
    });
    const cancelledTasks: RunTaskRow[] = [];

    for (const task of existingTasks) {
      if (task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
        continue;
      }

      cancelledTasks.push(
        await updateRunTaskRow(transaction, task, {
          tenantId: input.tenantId,
          runId: input.runId,
          runTaskId: task.runTaskId,
          status: "cancelled",
          endedAt: task.endedAt ?? transitionAt
        })
      );
    }

    const lifecycleTimestamps = deriveRunLifecycleTimestamps(existingRun, "failed", transitionAt);
    const run = await updateRunRecordRow(transaction, existingRun, {
      tenantId: input.tenantId,
      runId: input.runId,
      status: "failed",
      startedAt: lifecycleTimestamps.startedAt,
      endedAt: lifecycleTimestamps.endedAt
    });

    return {
      run,
      cancelledTasks
    };
  });
}

export async function persistCompiledRunGraph(
  client: DatabaseClient,
  input: PersistCompiledRunGraphInput
): Promise<PersistCompiledRunGraphResult> {
  const compiledAt = input.compiledAt ?? new Date();
  const normalizedTasks = await Promise.all(
    input.tasks.map(async (task) => {
      const taskId = task.taskId.trim();
      const dependsOn = normalizeDependencyIds(task.dependsOn);
      const runTaskId =
        task.runTaskId ?? (await buildStableRunTaskId(input.tenantId, input.runId, taskId));

      return {
        taskId,
        runTaskId,
        name: task.name,
        description: task.description,
        status: task.status ?? deriveCompiledTaskInitialStatus(dependsOn),
        conversationAgentClass: task.conversationAgentClass ?? null,
        conversationAgentName: task.conversationAgentName ?? null,
        dependsOn
      };
    })
  );

  const taskIds = new Set<string>();
  const runTaskIds = new Set<string>();

  for (const task of normalizedTasks) {
    if (taskIds.has(task.taskId)) {
      throw new Error(`Compiled run graph contains duplicate task id ${task.taskId}.`);
    }

    if (runTaskIds.has(task.runTaskId)) {
      throw new Error(`Compiled run graph contains duplicate runTaskId ${task.runTaskId}.`);
    }

    taskIds.add(task.taskId);
    runTaskIds.add(task.runTaskId);
  }

  for (const task of normalizedTasks) {
    for (const dependencyId of task.dependsOn) {
      if (dependencyId === task.taskId) {
        throw new Error(
          `Compiled run graph cannot make task ${task.taskId} depend on itself.`
        );
      }

      if (!taskIds.has(dependencyId)) {
        throw new Error(
          `Compiled run graph for run ${input.runId} references unknown dependency ${dependencyId} from task ${task.taskId}.`
        );
      }
    }
  }

  assertAcyclicCompiledTaskGraph(normalizedTasks);

  return client.db.transaction(async (transaction) => {
    const existingRun = await assertRunOwnership(transaction, input);

    await assertCompileProvenanceRevisions(
      transaction,
      {
        tenantId: existingRun.tenantId,
        projectId: existingRun.projectId,
        runId: existingRun.runId
      },
      input
    );

    const existingTasks = await transaction.query.runTasks.findMany({
      where: eq(runTasks.runId, input.runId)
    });
    const existingTasksById = new Map(existingTasks.map((task) => [task.runTaskId, task]));
    const desiredRunTaskIds = new Set(normalizedTasks.map((task) => task.runTaskId));

    await transaction
      .delete(runTaskDependencies)
      .where(eq(runTaskDependencies.runId, input.runId));

    for (const existingTask of existingTasks) {
      if (desiredRunTaskIds.has(existingTask.runTaskId)) {
        continue;
      }

      await transaction
        .update(artifactRefs)
        .set({
          runTaskId: null
        })
        .where(
          and(
            eq(artifactRefs.runId, input.runId),
            eq(artifactRefs.runTaskId, existingTask.runTaskId)
          )
        );

      await transaction
        .delete(runTasks)
        .where(
          and(eq(runTasks.runId, input.runId), eq(runTasks.runTaskId, existingTask.runTaskId))
        );
    }

    const persistedTasks: PersistCompiledRunGraphTaskRecord[] = [];

    for (const task of normalizedTasks) {
      const existingTask = existingTasksById.get(task.runTaskId);
      const persistedTask = existingTask
        ? await updateRunTaskRow(transaction, existingTask, {
            tenantId: input.tenantId,
            runId: input.runId,
            runTaskId: task.runTaskId,
            name: task.name,
            description: task.description,
            status: task.status,
            conversationAgentClass: task.conversationAgentClass,
            conversationAgentName: task.conversationAgentName,
            startedAt: null,
            endedAt: null
          })
        : await insertRunTaskRow(transaction, {
            tenantId: input.tenantId,
            runId: input.runId,
            runTaskId: task.runTaskId,
            name: task.name,
            description: task.description,
            status: task.status,
            conversationAgentClass: task.conversationAgentClass,
            conversationAgentName: task.conversationAgentName,
            startedAt: null,
            endedAt: null
          });

      persistedTasks.push({
        taskId: task.taskId,
        runTaskId: persistedTask.runTaskId,
        name: persistedTask.name,
        description: persistedTask.description,
        status: persistedTask.status,
        conversationAgentClass: persistedTask.conversationAgentClass,
        conversationAgentName: persistedTask.conversationAgentName,
        startedAt: persistedTask.startedAt,
        endedAt: persistedTask.endedAt
      });
    }

    const persistedTaskIdsByLogicalId = new Map(
      persistedTasks.map((task) => [task.taskId, task.runTaskId])
    );
    const persistedDependencies: PersistCompiledRunGraphDependencyRecord[] = [];

    for (const task of normalizedTasks) {
      const childRunTaskId = persistedTaskIdsByLogicalId.get(task.taskId);

      if (!childRunTaskId) {
        throw new Error(
          `Compiled run graph persistence could not resolve run task id for ${task.taskId}.`
        );
      }

      for (const dependencyId of task.dependsOn) {
        const parentRunTaskId = persistedTaskIdsByLogicalId.get(dependencyId);

        if (!parentRunTaskId) {
          throw new Error(
            `Compiled run graph persistence could not resolve parent task ${dependencyId}.`
          );
        }

        const dependency = await insertRunTaskDependencyRow(transaction, {
          tenantId: input.tenantId,
          runId: input.runId,
          parentRunTaskId,
          childRunTaskId
        });

        persistedDependencies.push({
          runTaskDependencyId: dependency.runTaskDependencyId,
          parentTaskId: dependencyId,
          childTaskId: task.taskId,
          parentRunTaskId,
          childRunTaskId
        });
      }
    }

    const run = await updateRunRecordRow(transaction, existingRun, {
      tenantId: input.tenantId,
      runId: input.runId,
      compiledSpecRevisionId: input.compiledSpecRevisionId,
      compiledArchitectureRevisionId: input.compiledArchitectureRevisionId,
      compiledExecutionPlanRevisionId: input.compiledExecutionPlanRevisionId,
      compiledAt
    });

    return {
      run,
      tasks: persistedTasks,
      dependencies: persistedDependencies
    };
  });
}

export async function createRunTask(client: DatabaseClient, input: CreateRunTaskInput) {
  await assertRunOwnership(client.db, input);

  return insertRunTaskRow(client.db, input);
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

  return updateRunTaskRow(client.db, existing, input);
}

export async function createRunTaskDependency(
  client: DatabaseClient,
  input: CreateRunTaskDependencyInput
) {
  await assertRunOwnership(client.db, input);

  if (input.parentRunTaskId === input.childRunTaskId) {
    throw new Error("Run task dependencies cannot reference the same task on both ends.");
  }

  return insertRunTaskDependencyRow(client.db, input);
}

export async function listRunTaskDependencies(client: DatabaseClient, input: RunLookupInput) {
  await assertRunOwnership(client.db, input);

  return client.db.query.runTaskDependencies.findMany({
    where: eq(runTaskDependencies.runId, input.runId),
    orderBy: [asc(runTaskDependencies.createdAt)]
  });
}
