import type { DatabaseClient } from "../../lib/db/client";
import { createArtifactRef } from "../../lib/db/artifacts";
import { getSessionRecord, updateSessionStatus } from "../../lib/db/runs";
import { appendAndPublishRunEvent } from "../../lib/events/publish";
import {
  decisionPackageArtifactKey,
  runPlanArtifactKey,
  taskHandoffArtifactKey
} from "../../lib/artifacts/keys";
import { putArtifactJson } from "../../lib/artifacts/r2";
import { createChatCompletion, parseStructuredChatCompletion } from "../../lib/llm/chat-completions";
import type { WorkerBindings } from "../../env";
import {
  compiledRunPlanSchema,
  decisionPackageSchema,
  type CompiledRunPlan,
  type CompiledTaskPlan,
  type DecisionPackage
} from "./contracts";

export type CompileRepoSource =
  | {
      source: "localPath";
      localPath: string;
      ref?: string | undefined;
    }
  | {
      source: "gitUrl";
      gitUrl: string;
      ref?: string | undefined;
    };

export interface CompileRunPlanInput {
  env: WorkerBindings;
  client: DatabaseClient;
  tenantId: string;
  runId: string;
  runSessionId: string;
  compileSessionId: string;
  repo: CompileRepoSource;
  decisionPackage: DecisionPackage;
}

export interface CompileRunPlanResult {
  plan: CompiledRunPlan;
  completion: Awaited<ReturnType<typeof createChatCompletion>>;
  decisionPackageArtifactRef: Awaited<ReturnType<typeof createArtifactRef>>;
  planArtifactRef: Awaited<ReturnType<typeof createArtifactRef>>;
  taskHandoffArtifactRefs: Array<Awaited<ReturnType<typeof createArtifactRef>>>;
}

function requireArtifactRef<T>(artifactRef: T | undefined, kind: string): T {
  if (!artifactRef) {
    throw new Error(`Artifact ref creation returned no row for ${kind}.`);
  }

  return artifactRef;
}

function buildRepoPointer(repo: CompileRepoSource) {
  if (repo.source === "localPath") {
    return {
      source: repo.source,
      localPath: repo.localPath,
      ref: repo.ref ?? null
    };
  }

  return {
    source: repo.source,
    gitUrl: repo.gitUrl,
    ref: repo.ref ?? null
  };
}

function buildCompileMessages(repo: CompileRepoSource, decisionPackage: DecisionPackage) {
  return [
    {
      role: "system" as const,
      content:
        "You compile an approved Keystone decision package into a small executable plan. Return JSON only. Preserve provided task ids and titles when present. Do not add commentary or markdown."
    },
    {
      role: "user" as const,
      content: JSON.stringify(
        {
          instructions: {
            schema: {
              decisionPackageId: "string",
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
              "Use the decision package tasks as the baseline work items.",
              "Keep the task count small and implementation-oriented.",
              "Do not invent dependencies unless they are necessary."
            ]
          },
          repo: buildRepoPointer(repo),
          decisionPackage
        },
        null,
        2
      )
    }
  ];
}

function buildDemoFixtureCompiledTask(task: DecisionPackage["tasks"][number]): CompiledTaskPlan {
  if (task.taskId === "task-greeting-tone") {
    return {
      taskId: task.taskId,
      title: task.title,
      summary: "Change the greeting in a reviewable way.",
      instructions: [
        "Edit the greeting implementation.",
        "Run the fixture tests."
      ],
      acceptanceCriteria: [
        "Fixture tests stay green."
      ],
      dependsOn: []
    };
  }

  return {
    taskId: task.taskId,
    title: task.title,
    summary: `Implement the approved change for ${task.title}.`,
    instructions: [
      "Implement the approved change in a reviewable way.",
      "Run the relevant verification steps for the fixture."
    ],
    acceptanceCriteria: task.acceptanceCriteria,
    dependsOn: []
  };
}

export function buildDemoFixtureCompiledPlan(decisionPackage: DecisionPackage): CompiledRunPlan {
  return compiledRunPlanSchema.parse({
    decisionPackageId: decisionPackage.decisionPackageId,
    summary:
      decisionPackage.tasks.length === 1
        ? "Compile smoke produced a single implementation task."
        : `Compile smoke produced ${decisionPackage.tasks.length} implementation tasks.`,
    tasks: decisionPackage.tasks.map((task) => buildDemoFixtureCompiledTask(task))
  });
}

async function writeJsonArtifact(
  input: {
    env: WorkerBindings;
    client: DatabaseClient;
    tenantId: string;
    runId: string;
    sessionId: string;
    key: string;
    kind: string;
    value: Record<string, unknown>;
    metadata?: Record<string, unknown> | undefined;
    status: "provisioning" | "active" | "archived";
  }
) {
  const artifact = await putArtifactJson(
    input.env.ARTIFACTS_BUCKET,
    "keystone-artifacts-dev",
    input.key,
    input.value
  );
  const artifactRef = await createArtifactRef(input.client, {
    tenantId: input.tenantId,
    runId: input.runId,
    sessionId: input.sessionId,
    kind: input.kind,
    storageBackend: artifact.storageBackend,
    storageUri: artifact.storageUri,
    contentType: "application/json; charset=utf-8",
    sizeBytes: artifact.sizeBytes,
    metadata: {
      key: artifact.key,
      etag: artifact.etag,
      ...(input.metadata ?? {})
    }
  });
  const insertedArtifactRef = requireArtifactRef(artifactRef, input.kind);

  await appendAndPublishRunEvent(input.client, input.env, {
    tenantId: input.tenantId,
    runId: input.runId,
    sessionId: input.sessionId,
    eventType: "artifact.put",
    artifactRefId: insertedArtifactRef.artifactRefId,
    payload: {
      kind: input.kind,
      storageUri: artifact.storageUri
    },
    status: input.status
  });

  return insertedArtifactRef;
}

export async function compileRunPlan(input: CompileRunPlanInput): Promise<CompileRunPlanResult> {
  const decisionPackage = decisionPackageSchema.parse(input.decisionPackage);

  await updateSessionStatus(input.client, {
    tenantId: input.tenantId,
    sessionId: input.compileSessionId,
    status: "provisioning",
    metadata: {
      providerBaseUrl: input.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL,
      providerModel: input.env.KEYSTONE_CHAT_COMPLETIONS_MODEL,
      decisionPackageId: decisionPackage.decisionPackageId
    }
  });

  await appendAndPublishRunEvent(input.client, input.env, {
    tenantId: input.tenantId,
    runId: input.runId,
    sessionId: input.compileSessionId,
    eventType: "compile.started",
    payload: {
      providerBaseUrl: input.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL,
      providerModel: input.env.KEYSTONE_CHAT_COMPLETIONS_MODEL,
      decisionPackageId: decisionPackage.decisionPackageId
    },
    status: "provisioning"
  });

  const decisionPackageArtifactRef = await writeJsonArtifact({
    env: input.env,
    client: input.client,
    tenantId: input.tenantId,
    runId: input.runId,
    sessionId: input.compileSessionId,
    key: decisionPackageArtifactKey(input.tenantId, input.runId, input.compileSessionId),
    kind: "decision_package",
    value: decisionPackage,
    metadata: {
      source: "compile_input"
    },
    status: "provisioning"
  });

  await updateSessionStatus(input.client, {
    tenantId: input.tenantId,
    sessionId: input.compileSessionId,
    status: "ready",
    metadata: {
      providerBaseUrl: input.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL,
      providerModel: input.env.KEYSTONE_CHAT_COMPLETIONS_MODEL,
      decisionPackageId: decisionPackage.decisionPackageId,
      decisionPackageArtifactRefId: decisionPackageArtifactRef.artifactRefId
    }
  });

  await updateSessionStatus(input.client, {
    tenantId: input.tenantId,
    sessionId: input.compileSessionId,
    status: "active",
    metadata: {
      providerBaseUrl: input.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL,
      providerModel: input.env.KEYSTONE_CHAT_COMPLETIONS_MODEL,
      decisionPackageId: decisionPackage.decisionPackageId,
      decisionPackageArtifactRefId: decisionPackageArtifactRef.artifactRefId,
      runSessionId: input.runSessionId
    }
  });

  try {
    const completion = await createChatCompletion({
      env: input.env,
      messages: buildCompileMessages(input.repo, decisionPackage),
      temperature: 0
    });
    const plan = parseStructuredChatCompletion(completion, compiledRunPlanSchema);
    const planArtifactRef = await writeJsonArtifact({
      env: input.env,
      client: input.client,
      tenantId: input.tenantId,
      runId: input.runId,
      sessionId: input.compileSessionId,
      key: runPlanArtifactKey(input.tenantId, input.runId),
      kind: "run_plan",
      value: plan,
      metadata: {
        decisionPackageId: decisionPackage.decisionPackageId,
        model: completion.model,
        completionId: completion.id,
        finishReason: completion.finishReason ?? null
      },
      status: "active"
    });

    const taskHandoffArtifactRefs = [];

    for (const task of plan.tasks) {
      const handoffArtifactRef = await writeJsonArtifact({
        env: input.env,
        client: input.client,
        tenantId: input.tenantId,
        runId: input.runId,
        sessionId: input.compileSessionId,
        key: taskHandoffArtifactKey(input.tenantId, input.runId, task.taskId),
        kind: "task_handoff",
        value: {
          runId: input.runId,
          decisionPackageId: plan.decisionPackageId,
          task
        },
        metadata: {
          taskId: task.taskId,
          title: task.title
        },
        status: "active"
      });

      taskHandoffArtifactRefs.push(handoffArtifactRef);
    }

    await appendAndPublishRunEvent(input.client, input.env, {
      tenantId: input.tenantId,
      runId: input.runId,
      sessionId: input.compileSessionId,
      eventType: "compile.completed",
      artifactRefId: planArtifactRef.artifactRefId,
      payload: {
        decisionPackageId: plan.decisionPackageId,
        taskCount: plan.tasks.length,
        model: completion.model,
        completionId: completion.id
      },
      status: "archived"
    });

    await updateSessionStatus(input.client, {
      tenantId: input.tenantId,
      sessionId: input.compileSessionId,
      status: "archived",
      metadata: {
        providerBaseUrl: input.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL,
        providerModel: input.env.KEYSTONE_CHAT_COMPLETIONS_MODEL,
        decisionPackageId: decisionPackage.decisionPackageId,
        decisionPackageArtifactRefId: decisionPackageArtifactRef.artifactRefId,
        planArtifactRefId: planArtifactRef.artifactRefId,
        taskCount: plan.tasks.length
      }
    });

    return {
      plan,
      completion,
      decisionPackageArtifactRef,
      planArtifactRef,
      taskHandoffArtifactRefs
    };
  } catch (error) {
    const existingCompileSession = await getSessionRecord(
      input.client,
      input.tenantId,
      input.compileSessionId
    );

    if (existingCompileSession && existingCompileSession.status !== "failed") {
      await updateSessionStatus(input.client, {
        tenantId: input.tenantId,
        sessionId: input.compileSessionId,
        status: "failed",
        metadata: {
          ...(existingCompileSession.metadata ?? {}),
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }

    await appendAndPublishRunEvent(input.client, input.env, {
      tenantId: input.tenantId,
      runId: input.runId,
      sessionId: input.compileSessionId,
      eventType: "compile.failed",
      severity: "error",
      payload: {
        message: error instanceof Error ? error.message : String(error)
      },
      status: "failed"
    });

    throw error;
  }
}

export async function compileDemoFixtureRunPlan(
  input: CompileRunPlanInput
): Promise<CompileRunPlanResult> {
  const decisionPackage = decisionPackageSchema.parse(input.decisionPackage);
  const plan = buildDemoFixtureCompiledPlan(decisionPackage);
  const completion = {
    id: `fixture-compile-${input.runId}`,
    model: "fixture-compile",
    content: JSON.stringify(plan),
    finishReason: "stop",
    usage: {
      totalTokens: 0
    },
    rawText: JSON.stringify(plan)
  };

  await updateSessionStatus(input.client, {
    tenantId: input.tenantId,
    sessionId: input.compileSessionId,
    status: "provisioning",
    metadata: {
      providerBaseUrl: input.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL,
      providerModel: input.env.KEYSTONE_CHAT_COMPLETIONS_MODEL,
      decisionPackageId: decisionPackage.decisionPackageId,
      compileMode: "fixture"
    }
  });

  await appendAndPublishRunEvent(input.client, input.env, {
    tenantId: input.tenantId,
    runId: input.runId,
    sessionId: input.compileSessionId,
    eventType: "compile.started",
    payload: {
      providerBaseUrl: input.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL,
      providerModel: input.env.KEYSTONE_CHAT_COMPLETIONS_MODEL,
      decisionPackageId: decisionPackage.decisionPackageId,
      compileMode: "fixture"
    },
    status: "provisioning"
  });

  const decisionPackageArtifactRef = await writeJsonArtifact({
    env: input.env,
    client: input.client,
    tenantId: input.tenantId,
    runId: input.runId,
    sessionId: input.compileSessionId,
    key: decisionPackageArtifactKey(input.tenantId, input.runId, input.compileSessionId),
    kind: "decision_package",
    value: decisionPackage,
    metadata: {
      source: "compile_input"
    },
    status: "provisioning"
  });

  await updateSessionStatus(input.client, {
    tenantId: input.tenantId,
    sessionId: input.compileSessionId,
    status: "ready",
    metadata: {
      providerBaseUrl: input.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL,
      providerModel: input.env.KEYSTONE_CHAT_COMPLETIONS_MODEL,
      decisionPackageId: decisionPackage.decisionPackageId,
      decisionPackageArtifactRefId: decisionPackageArtifactRef.artifactRefId,
      compileMode: "fixture"
    }
  });

  await updateSessionStatus(input.client, {
    tenantId: input.tenantId,
    sessionId: input.compileSessionId,
    status: "active",
    metadata: {
      providerBaseUrl: input.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL,
      providerModel: input.env.KEYSTONE_CHAT_COMPLETIONS_MODEL,
      decisionPackageId: decisionPackage.decisionPackageId,
      decisionPackageArtifactRefId: decisionPackageArtifactRef.artifactRefId,
      runSessionId: input.runSessionId,
      compileMode: "fixture"
    }
  });

  try {
    const planArtifactRef = await writeJsonArtifact({
      env: input.env,
      client: input.client,
      tenantId: input.tenantId,
      runId: input.runId,
      sessionId: input.compileSessionId,
      key: runPlanArtifactKey(input.tenantId, input.runId),
      kind: "run_plan",
      value: plan,
      metadata: {
        decisionPackageId: decisionPackage.decisionPackageId,
        model: completion.model,
        completionId: completion.id,
        finishReason: completion.finishReason ?? null,
        compileMode: "fixture"
      },
      status: "active"
    });

    const taskHandoffArtifactRefs = [];

    for (const task of plan.tasks) {
      const handoffArtifactRef = await writeJsonArtifact({
        env: input.env,
        client: input.client,
        tenantId: input.tenantId,
        runId: input.runId,
        sessionId: input.compileSessionId,
        key: taskHandoffArtifactKey(input.tenantId, input.runId, task.taskId),
        kind: "task_handoff",
        value: {
          runId: input.runId,
          decisionPackageId: plan.decisionPackageId,
          task
        },
        metadata: {
          taskId: task.taskId,
          title: task.title
        },
        status: "active"
      });

      taskHandoffArtifactRefs.push(handoffArtifactRef);
    }

    await appendAndPublishRunEvent(input.client, input.env, {
      tenantId: input.tenantId,
      runId: input.runId,
      sessionId: input.compileSessionId,
      eventType: "compile.completed",
      artifactRefId: planArtifactRef.artifactRefId,
      payload: {
        decisionPackageId: plan.decisionPackageId,
        taskCount: plan.tasks.length,
        model: completion.model,
        completionId: completion.id,
        compileMode: "fixture"
      },
      status: "archived"
    });

    await updateSessionStatus(input.client, {
      tenantId: input.tenantId,
      sessionId: input.compileSessionId,
      status: "archived",
      metadata: {
        providerBaseUrl: input.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL,
        providerModel: input.env.KEYSTONE_CHAT_COMPLETIONS_MODEL,
        decisionPackageId: decisionPackage.decisionPackageId,
        decisionPackageArtifactRefId: decisionPackageArtifactRef.artifactRefId,
        planArtifactRefId: planArtifactRef.artifactRefId,
        taskCount: plan.tasks.length,
        compileMode: "fixture"
      }
    });

    return {
      plan,
      completion,
      decisionPackageArtifactRef,
      planArtifactRef,
      taskHandoffArtifactRefs
    };
  } catch (error) {
    const existingCompileSession = await getSessionRecord(
      input.client,
      input.tenantId,
      input.compileSessionId
    );

    if (existingCompileSession && existingCompileSession.status !== "failed") {
      await updateSessionStatus(input.client, {
        tenantId: input.tenantId,
        sessionId: input.compileSessionId,
        status: "failed",
        metadata: {
          ...(existingCompileSession.metadata ?? {}),
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }

    await appendAndPublishRunEvent(input.client, input.env, {
      tenantId: input.tenantId,
      runId: input.runId,
      sessionId: input.compileSessionId,
      eventType: "compile.failed",
      severity: "error",
      payload: {
        message: error instanceof Error ? error.message : String(error),
        compileMode: "fixture"
      },
      status: "failed"
    });

    throw error;
  }
}
