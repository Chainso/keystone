import type { DatabaseClient } from "../../lib/db/client";
import { createArtifactRef, deleteArtifactRef, findArtifactRefByObjectKey } from "../../lib/db/artifacts";
import { getRunRecord, persistCompiledRunGraph, updateRunRecord } from "../../lib/db/runs";
import type { ArtifactKind } from "../../lib/artifacts/model";
import {
  runPlanArtifactKey,
  taskHandoffArtifactKey
} from "../../lib/artifacts/keys";
import { deleteArtifactObject, getArtifactText, putArtifactJson } from "../../lib/artifacts/r2";
import { createChatCompletion, parseStructuredChatCompletion } from "../../lib/llm/chat-completions";
import type { WorkerBindings } from "../../env";
import {
  compiledRunPlanSchema,
  compilePlanningDocumentsSchema,
  type CompiledRunPlan,
  type CompiledTaskPlan,
  type CompilePlanningDocuments,
  type CompiledRunPlanSourceRevisionIds
} from "./contracts";
import { assertCompiledPlanIsInternallyConsistent } from "../tasks/load-task-contracts";

export interface CompileRunPlanInput {
  env: WorkerBindings;
  client: DatabaseClient;
  tenantId: string;
  projectId: string;
  runId: string;
  planningDocuments: CompilePlanningDocuments;
}

export interface CompileRunPlanResult {
  plan: CompiledRunPlan;
  completion: Awaited<ReturnType<typeof createChatCompletion>>;
  planArtifactRef: Awaited<ReturnType<typeof createArtifactRef>>;
  taskHandoffArtifactRefs: Array<Awaited<ReturnType<typeof createArtifactRef>>>;
}

interface CompiledPlanArtifactWrite {
  artifactKind: ArtifactKind;
  objectKey: string;
  runTaskId?: string | null | undefined;
  value: Record<string, unknown>;
}

interface PreviousCompiledPlanState {
  plan: CompiledRunPlan;
  compiledAt: Date | null;
}

const compiledRunPlanResponseSchema = compiledRunPlanSchema.omit({
  sourceRevisionIds: true
});

function requireArtifactRef<T>(artifactRef: T | undefined, kind: ArtifactKind): T {
  if (!artifactRef) {
    throw new Error(`Artifact ref creation returned no row for ${kind}.`);
  }

  return artifactRef;
}

async function persistCompiledPlanGraph(
  client: DatabaseClient,
  input: {
    tenantId: string;
    runId: string;
    plan: CompiledRunPlan;
    sourceRevisionIds: CompiledRunPlanSourceRevisionIds;
    compiledAt?: Date | null | undefined;
  }
) {
  const persistedGraph = await persistCompiledRunGraph(client, {
    tenantId: input.tenantId,
    runId: input.runId,
    compiledSpecRevisionId: input.sourceRevisionIds.specification,
    compiledArchitectureRevisionId: input.sourceRevisionIds.architecture,
    compiledExecutionPlanRevisionId: input.sourceRevisionIds.executionPlan,
    compiledAt: input.compiledAt,
    tasks: input.plan.tasks.map((task) => ({
      taskId: task.taskId,
      runTaskId: task.runTaskId,
      name: task.title,
      description: task.summary,
      dependsOn: task.dependsOn
    }))
  });
  const runTaskIdsByTaskId = new Map(
    persistedGraph.tasks.map((task) => [task.taskId, task.runTaskId])
  );

  return compiledRunPlanSchema.parse({
    ...input.plan,
    sourceRevisionIds: input.sourceRevisionIds,
    tasks: input.plan.tasks.map((task) => ({
      ...task,
      runTaskId: runTaskIdsByTaskId.get(task.taskId) ?? task.runTaskId
    }))
  });
}

function buildSourceRevisionIds(
  planningDocuments: CompilePlanningDocuments
): CompiledRunPlanSourceRevisionIds {
  return {
    specification: planningDocuments.specification.revisionId,
    architecture: planningDocuments.architecture.revisionId,
    executionPlan: planningDocuments.executionPlan.revisionId
  };
}

function buildCompileMessages(planningDocuments: CompilePlanningDocuments) {
  return [
    {
      role: "system" as const,
      content:
        "You compile Keystone planning documents into a small executable DAG for implementation. Return JSON only. Do not add commentary or markdown."
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          instructions: {
            schema: {
              summary: "string",
              tasks: [
                {
                  taskId: "string",
                  title: "string",
                  summary: "string",
                  instructions: ["string"],
                  acceptanceCriteria: ["string"],
                  dependsOn: ["string"]
                }
              ]
            },
            requirements: [
              "Return valid JSON that matches the schema exactly.",
              "Use the execution plan as the primary task breakdown.",
              "Use specification and architecture as product and implementation context.",
              "Treat the three planning documents as the full compile context.",
              "Keep the task graph small, implementation-oriented, and executable.",
              "Do not invent dependencies unless they are necessary.",
              "Each task summary must stay short."
            ]
          },
          planningDocuments: {
            specification: {
              path: planningDocuments.specification.path,
              body: planningDocuments.specification.body
            },
            architecture: {
              path: planningDocuments.architecture.path,
              body: planningDocuments.architecture.body
            },
            executionPlan: {
              path: planningDocuments.executionPlan.path,
              body: planningDocuments.executionPlan.body
            }
          }
        },
        null,
        2
      )
    }
  ];
}

function buildDemoFixtureCompiledTask(): CompiledTaskPlan {
  return {
    taskId: "task-implementation",
    title: "Implement execution plan",
    summary: "Implement the approved execution plan in a reviewable way.",
    instructions: ["Implement the requested change.", "Run the relevant fixture verification."],
    acceptanceCriteria: ["The execution plan goals are satisfied."],
    dependsOn: []
  };
}

export function buildDemoFixtureCompiledPlan(
  planningDocuments: CompilePlanningDocuments
): CompiledRunPlan {
  return compiledRunPlanSchema.parse({
    summary: "Compile smoke produced a single implementation task.",
    sourceRevisionIds: buildSourceRevisionIds(planningDocuments),
    tasks: [buildDemoFixtureCompiledTask()]
  });
}

async function writeJsonArtifact(
  input: {
    env: WorkerBindings;
    client: DatabaseClient;
    tenantId: string;
    projectId: string;
    runId: string;
    runTaskId?: string | null | undefined;
    key: string;
    kind: ArtifactKind;
    value: Record<string, unknown>;
  }
) {
  const artifact = await putArtifactJson(
    input.env.ARTIFACTS_BUCKET,
    "keystone-artifacts-dev",
    input.key,
    input.value
  );
  const artifactRef =
    (await findArtifactRefByObjectKey(input.client, {
      tenantId: input.tenantId,
      bucket: "keystone-artifacts-dev",
      objectKey: artifact.key,
      runId: input.runId,
      runTaskId: input.runTaskId,
      artifactKind: input.kind
    })) ??
    (await createArtifactRef(input.client, {
      tenantId: input.tenantId,
      projectId: input.projectId,
      runId: input.runId,
      runTaskId: input.runTaskId,
      artifactKind: input.kind,
      storageBackend: artifact.storageBackend,
      bucket: "keystone-artifacts-dev",
      objectKey: artifact.key,
      objectVersion: artifact.objectVersion,
      etag: artifact.etag,
      contentType: "application/json; charset=utf-8",
      sha256: artifact.sha256,
      sizeBytes: artifact.sizeBytes
    }));
  const insertedArtifactRef = requireArtifactRef(artifactRef, input.kind);

  return insertedArtifactRef;
}

function buildCompiledPlanArtifactWrites(input: {
  tenantId: string;
  runId: string;
  plan: CompiledRunPlan;
}): CompiledPlanArtifactWrite[] {
  return [
    {
      artifactKind: "run_plan",
      objectKey: runPlanArtifactKey(input.tenantId, input.runId),
      value: input.plan
    },
    ...input.plan.tasks.map((task) => {
      if (!task.runTaskId) {
        throw new Error(`Compiled plan task ${task.taskId} is missing its persisted runTaskId.`);
      }

      return {
        artifactKind: "task_handoff" as const,
        runTaskId: task.runTaskId,
        objectKey: taskHandoffArtifactKey(input.tenantId, input.runId, task.runTaskId),
        value: {
          runId: input.runId,
          runTaskId: task.runTaskId,
          sourceRevisionIds: input.plan.sourceRevisionIds,
          task
        }
      };
    })
  ];
}

async function loadExistingCompiledPlanState(input: {
  env: WorkerBindings;
  client: DatabaseClient;
  tenantId: string;
  runId: string;
}): Promise<PreviousCompiledPlanState | null> {
  const objectKey = runPlanArtifactKey(input.tenantId, input.runId);
  const artifactText = await getArtifactText(input.env.ARTIFACTS_BUCKET, objectKey);

  if (!artifactText) {
    return null;
  }

  const existingRun = await getRunRecord(input.client, {
    tenantId: input.tenantId,
    runId: input.runId
  });
  const existingPlan = compiledRunPlanSchema.parse(JSON.parse(artifactText));

  assertCompiledPlanIsInternallyConsistent(existingPlan, "Existing compiled plan snapshot");

  return {
    plan: existingPlan,
    compiledAt: existingRun?.compiledAt ?? null
  };
}

async function restoreCompiledPlanPersistence(input: {
  env: WorkerBindings;
  client: DatabaseClient;
  tenantId: string;
  projectId: string;
  runId: string;
  previousState: PreviousCompiledPlanState;
}) {
  const restoredPlan = await persistCompiledPlanGraph(input.client, {
    tenantId: input.tenantId,
    runId: input.runId,
    plan: input.previousState.plan,
    sourceRevisionIds: input.previousState.plan.sourceRevisionIds,
    compiledAt: input.previousState.compiledAt ?? undefined
  });
  const restoredArtifactWrites = buildCompiledPlanArtifactWrites({
    tenantId: input.tenantId,
    runId: input.runId,
    plan: restoredPlan
  });

  for (const artifactWrite of restoredArtifactWrites) {
    await writeJsonArtifact({
      env: input.env,
      client: input.client,
      tenantId: input.tenantId,
      projectId: input.projectId,
      runId: input.runId,
      runTaskId: artifactWrite.runTaskId,
      key: artifactWrite.objectKey,
      kind: artifactWrite.artifactKind,
      value: artifactWrite.value
    });
  }
}

async function rollbackCompiledPlanPersistence(input: {
  env: WorkerBindings;
  client: DatabaseClient;
  tenantId: string;
  projectId: string;
  runId: string;
  writtenArtifacts: CompiledPlanArtifactWrite[];
  previousState: PreviousCompiledPlanState | null;
}) {
  const retainedObjectKeys = new Set(
    input.previousState
      ? buildCompiledPlanArtifactWrites({
          tenantId: input.tenantId,
          runId: input.runId,
          plan: input.previousState.plan
        }).map((artifactWrite) => artifactWrite.objectKey)
      : []
  );
  const deletableArtifacts = input.writtenArtifacts.filter(
    (artifactWrite) => !retainedObjectKeys.has(artifactWrite.objectKey)
  );

  for (const { artifactKind, objectKey } of deletableArtifacts) {
    try {
      const artifactRef = await findArtifactRefByObjectKey(input.client, {
        tenantId: input.tenantId,
        bucket: "keystone-artifacts-dev",
        objectKey,
        runId: input.runId,
        artifactKind
      });

      if (artifactRef) {
        await deleteArtifactRef(input.client, {
          tenantId: input.tenantId,
          artifactRefId: artifactRef.artifactRefId
        });
      }
    } catch (error) {
      console.warn("Failed to delete compiled artifact ref during rollback", {
        tenantId: input.tenantId,
        runId: input.runId,
        artifactKind,
        objectKey,
        error
      });
    }

    try {
      await deleteArtifactObject(input.env.ARTIFACTS_BUCKET, objectKey);
    } catch (error) {
      console.warn("Failed to delete compiled artifact object during rollback", {
        tenantId: input.tenantId,
        runId: input.runId,
        artifactKind,
        objectKey,
        error
      });
    }
  }

  if (input.previousState) {
    await restoreCompiledPlanPersistence({
      env: input.env,
      client: input.client,
      tenantId: input.tenantId,
      projectId: input.projectId,
      runId: input.runId,
      previousState: input.previousState
    });

    return;
  }

  await persistCompiledRunGraph(input.client, {
    tenantId: input.tenantId,
    runId: input.runId,
    compiledSpecRevisionId: null,
    compiledArchitectureRevisionId: null,
    compiledExecutionPlanRevisionId: null,
    compiledAt: null,
    tasks: []
  });
}

export async function compileRunPlan(input: CompileRunPlanInput): Promise<CompileRunPlanResult> {
  const planningDocuments = compilePlanningDocumentsSchema.parse(input.planningDocuments);
  const sourceRevisionIds = buildSourceRevisionIds(planningDocuments);
  const previousState = await loadExistingCompiledPlanState({
    env: input.env,
    client: input.client,
    tenantId: input.tenantId,
    runId: input.runId
  });
  let parsedPlan: CompiledRunPlan | null = null;
  const writtenArtifacts: CompiledPlanArtifactWrite[] = [];

  try {
    const completion = await createChatCompletion({
      env: input.env,
      messages: buildCompileMessages(planningDocuments),
      temperature: 0
    });
    parsedPlan = compiledRunPlanSchema.parse({
      ...parseStructuredChatCompletion(completion, compiledRunPlanResponseSchema),
      sourceRevisionIds
    });

    assertCompiledPlanIsInternallyConsistent(parsedPlan, "Live compile");
    const plan = await persistCompiledPlanGraph(input.client, {
      tenantId: input.tenantId,
      runId: input.runId,
      plan: parsedPlan,
      sourceRevisionIds
    });
    const artifactWrites = buildCompiledPlanArtifactWrites({
      tenantId: input.tenantId,
      runId: input.runId,
      plan
    });
    const artifactRefs = [];

    for (const artifactWrite of artifactWrites) {
      const artifactRef = await writeJsonArtifact({
        env: input.env,
        client: input.client,
        tenantId: input.tenantId,
        projectId: input.projectId,
        runId: input.runId,
        runTaskId: artifactWrite.runTaskId,
        key: artifactWrite.objectKey,
        kind: artifactWrite.artifactKind,
        value: artifactWrite.value
      });

      writtenArtifacts.push(artifactWrite);
      artifactRefs.push(artifactRef);
    }
    const [planArtifactRef, ...taskHandoffArtifactRefs] = artifactRefs;

    if (!planArtifactRef) {
      throw new Error("Artifact ref creation returned no row for run_plan.");
    }

    await updateRunRecord(input.client, {
      tenantId: input.tenantId,
      runId: input.runId,
      compiledSpecRevisionId: plan.sourceRevisionIds.specification,
      compiledArchitectureRevisionId: plan.sourceRevisionIds.architecture,
      compiledExecutionPlanRevisionId: plan.sourceRevisionIds.executionPlan,
      compiledAt: new Date()
    });

    return {
      plan,
      completion,
      planArtifactRef,
      taskHandoffArtifactRefs
    };
  } catch (error) {
    if (parsedPlan) {
      try {
        await rollbackCompiledPlanPersistence({
          env: input.env,
          client: input.client,
          tenantId: input.tenantId,
          projectId: input.projectId,
          runId: input.runId,
          writtenArtifacts,
          previousState
        });
      } catch (rollbackError) {
        console.warn("Failed to roll back compiled plan persistence after live compile error", {
          tenantId: input.tenantId,
          runId: input.runId,
          error: rollbackError
        });
      }
    }

    throw error;
  }
}

export async function compileDemoFixtureRunPlan(
  input: CompileRunPlanInput
): Promise<CompileRunPlanResult> {
  const planningDocuments = compilePlanningDocumentsSchema.parse(input.planningDocuments);
  const sourceRevisionIds = buildSourceRevisionIds(planningDocuments);
  const previousState = await loadExistingCompiledPlanState({
    env: input.env,
    client: input.client,
    tenantId: input.tenantId,
    runId: input.runId
  });
  const parsedPlan = buildDemoFixtureCompiledPlan(planningDocuments);
  const writtenArtifacts: CompiledPlanArtifactWrite[] = [];
  const completion = {
    id: `fixture-compile-${input.runId}`,
    model: "fixture-compile",
    content: JSON.stringify(parsedPlan),
    finishReason: "stop",
    usage: {
      totalTokens: 0
    },
    rawText: JSON.stringify(parsedPlan)
  };

  try {
    const plan = await persistCompiledPlanGraph(input.client, {
      tenantId: input.tenantId,
      runId: input.runId,
      plan: parsedPlan,
      sourceRevisionIds
    });
    const artifactWrites = buildCompiledPlanArtifactWrites({
      tenantId: input.tenantId,
      runId: input.runId,
      plan
    });
    const artifactRefs = [];

    for (const artifactWrite of artifactWrites) {
      const artifactRef = await writeJsonArtifact({
        env: input.env,
        client: input.client,
        tenantId: input.tenantId,
        projectId: input.projectId,
        runId: input.runId,
        runTaskId: artifactWrite.runTaskId,
        key: artifactWrite.objectKey,
        kind: artifactWrite.artifactKind,
        value: artifactWrite.value
      });

      writtenArtifacts.push(artifactWrite);
      artifactRefs.push(artifactRef);
    }
    const [planArtifactRef, ...taskHandoffArtifactRefs] = artifactRefs;

    if (!planArtifactRef) {
      throw new Error("Artifact ref creation returned no row for run_plan.");
    }

    await updateRunRecord(input.client, {
      tenantId: input.tenantId,
      runId: input.runId,
      compiledSpecRevisionId: plan.sourceRevisionIds.specification,
      compiledArchitectureRevisionId: plan.sourceRevisionIds.architecture,
      compiledExecutionPlanRevisionId: plan.sourceRevisionIds.executionPlan,
      compiledAt: new Date()
    });

    return {
      plan,
      completion,
      planArtifactRef,
      taskHandoffArtifactRefs
    };
  } catch (error) {
    try {
      await rollbackCompiledPlanPersistence({
        env: input.env,
        client: input.client,
        tenantId: input.tenantId,
        projectId: input.projectId,
        runId: input.runId,
        writtenArtifacts,
        previousState
      });
    } catch (rollbackError) {
      console.warn("Failed to roll back compiled plan persistence after fixture compile error", {
        tenantId: input.tenantId,
        runId: input.runId,
        error: rollbackError
      });
    }

    throw error;
  }
}
