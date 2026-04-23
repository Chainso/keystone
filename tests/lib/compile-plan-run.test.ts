import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  runPlanArtifactKey,
  taskHandoffArtifactKey
} from "../../src/lib/artifacts/keys";

const RUN_TASK_ID_1 = "11111111-1111-4111-8111-111111111111";
const RUN_TASK_ID_2 = "22222222-2222-4222-8222-222222222222";

const planningDocuments = {
  specification: {
    revisionId: "revision-specification",
    path: "specification",
    body: "# Specification\n\nUpdate the demo greeting."
  },
  architecture: {
    revisionId: "revision-architecture",
    path: "architecture",
    body: "# Architecture\n\nApply the change in the demo target fixture."
  },
  executionPlan: {
    revisionId: "revision-execution-plan",
    path: "execution-plan",
    body: "# Execution Plan\n\n- Update the greeting implementation.\n- Run the fixture verification."
  }
} as const;

const mocked = vi.hoisted(() => {
  const defaultLiveParsedPlan: {
    summary: string;
    tasks: Array<{
      taskId: string;
      title: string;
      summary: string;
      instructions: string[];
      acceptanceCriteria: string[];
      dependsOn: string[];
    }>;
  } = {
    summary: "Live compile produced a task with model-authored instructions.",
    tasks: [
      {
        taskId: "task-live-implementation",
        title: "Adjust the greeting implementation",
        summary: "Use the live compiler output as the task source.",
        instructions: ["Implement the approved change.", "Run the relevant checks."],
        acceptanceCriteria: ["Relevant checks pass."],
        dependsOn: []
      }
    ]
  };
  const liveParsedPlan = JSON.parse(JSON.stringify(defaultLiveParsedPlan)) as typeof defaultLiveParsedPlan;

  function replaceLiveParsedPlan(value: typeof defaultLiveParsedPlan) {
    const next = JSON.parse(JSON.stringify(value)) as typeof defaultLiveParsedPlan;
    liveParsedPlan.summary = next.summary;
    liveParsedPlan.tasks = next.tasks;
  }

  const state = {
    artifactRefInputs: [] as Array<Record<string, unknown>>,
    artifactRefs: [] as Array<Record<string, unknown>>,
    deletedArtifactRefIds: [] as string[],
    deletedObjectKeys: [] as string[],
    jsonWrites: [] as Array<{ key: string; value: unknown }>,
    objectsByKey: new Map<string, unknown>(),
    runRecord: {
      tenantId: "tenant-fixture",
      runId: "run-123",
      projectId: "project-fixture",
      workflowInstanceId: "workflow-run-123",
      executionEngine: "think_live",
      sandboxId: null,
      status: "active",
      compiledSpecRevisionId: null as string | null,
      compiledArchitectureRevisionId: null as string | null,
      compiledExecutionPlanRevisionId: null as string | null,
      compiledAt: null as Date | null,
      startedAt: null,
      endedAt: null,
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    },
    runUpdates: [] as Array<Record<string, unknown>>,
    nextRunUpdateError: null as Error | null
  };

  function reset() {
    state.artifactRefInputs.length = 0;
    state.artifactRefs.length = 0;
    state.deletedArtifactRefIds.length = 0;
    state.deletedObjectKeys.length = 0;
    state.jsonWrites.length = 0;
    state.objectsByKey.clear();
    state.runRecord.compiledSpecRevisionId = null;
    state.runRecord.compiledArchitectureRevisionId = null;
    state.runRecord.compiledExecutionPlanRevisionId = null;
    state.runRecord.compiledAt = null;
    state.runUpdates.length = 0;
    state.nextRunUpdateError = null;
    replaceLiveParsedPlan(defaultLiveParsedPlan);
  }

  return {
    liveParsedPlan,
    replaceLiveParsedPlan,
    state,
    failNextRunUpdate: (message = "update failed") => {
      state.nextRunUpdateError = new Error(message);
    },
    reset,
    persistCompiledRunGraph: vi.fn(async (_client, input) => ({
      run: {
        runId: input.runId,
        tenantId: input.tenantId,
        projectId: "project-fixture",
        workflowInstanceId: "workflow-run-123",
        executionEngine: "think_live",
        sandboxId: null,
        status: "active",
        compiledSpecRevisionId:
          (state.runRecord.compiledSpecRevisionId =
            input.compiledSpecRevisionId ?? null),
        compiledArchitectureRevisionId:
          (state.runRecord.compiledArchitectureRevisionId =
            input.compiledArchitectureRevisionId ?? null),
        compiledExecutionPlanRevisionId:
          (state.runRecord.compiledExecutionPlanRevisionId =
            input.compiledExecutionPlanRevisionId ?? null),
        compiledAt:
          (state.runRecord.compiledAt =
            input.compiledAt ?? new Date("2026-04-17T00:00:00.000Z")),
        startedAt: null,
        endedAt: null,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        updatedAt: new Date("2026-04-17T00:00:00.000Z")
      },
      tasks: input.tasks.map(
        (
          task: {
            taskId: string;
            runTaskId?: string | undefined;
            name: string;
            description: string;
            status?: string | undefined;
          },
          index: number
        ) => ({
          taskId: task.taskId,
          runTaskId: task.runTaskId ?? [RUN_TASK_ID_1, RUN_TASK_ID_2][index] ?? crypto.randomUUID(),
          name: task.name,
          description: task.description,
          status: task.status ?? "ready",
          conversationAgentClass: null,
          conversationAgentName: null,
          startedAt: null,
          endedAt: null
        })
      ),
      dependencies: []
    })),
    createArtifactRef: vi.fn(async (_client, input) => {
      state.artifactRefInputs.push(input as Record<string, unknown>);

      const artifactRef = {
        artifactRefId: `artifact-${state.artifactRefInputs.length}`,
        tenantId: input.tenantId,
        projectId: input.projectId,
        runId: input.runId,
        runTaskId: input.runTaskId ?? null,
        artifactKind: input.artifactKind,
        storageBackend: input.storageBackend,
        bucket: input.bucket,
        objectKey: input.objectKey,
        objectVersion: input.objectVersion ?? null,
        etag: input.etag ?? null,
        contentType: input.contentType,
        sha256: input.sha256 ?? null,
        sizeBytes: input.sizeBytes ?? null,
        createdAt: new Date("2026-04-17T00:00:00.000Z")
      };

      state.artifactRefs.push(artifactRef);
      return artifactRef;
    }),
    deleteArtifactRef: vi.fn(async (_client, input) => {
      state.deletedArtifactRefIds.push(input.artifactRefId);

      const artifactIndex = state.artifactRefs.findIndex(
        (artifactRef) => artifactRef.artifactRefId === input.artifactRefId
      );

      if (artifactIndex === -1) {
        return null;
      }

      const [deletedArtifactRef] = state.artifactRefs.splice(artifactIndex, 1);
      return deletedArtifactRef ?? null;
    }),
    findArtifactRefByObjectKey: vi.fn(async (_client, input) => {
      return (
        state.artifactRefs.find(
          (artifactRef) =>
            artifactRef.tenantId === input.tenantId &&
            artifactRef.bucket === input.bucket &&
            artifactRef.objectKey === input.objectKey &&
            (input.runId === undefined || artifactRef.runId === input.runId) &&
            (input.runTaskId === undefined || artifactRef.runTaskId === (input.runTaskId ?? null)) &&
            (!input.artifactKind || artifactRef.artifactKind === input.artifactKind)
        ) ?? null
      );
    }),
    getRunRecord: vi.fn(async () => ({
      ...state.runRecord
    })),
    updateRunRecord: vi.fn(async (_client, input) => {
      if (state.nextRunUpdateError) {
        const error = state.nextRunUpdateError;
        state.nextRunUpdateError = null;
        throw error;
      }

      state.runUpdates.push(input as Record<string, unknown>);
      state.runRecord.compiledSpecRevisionId = input.compiledSpecRevisionId ?? null;
      state.runRecord.compiledArchitectureRevisionId = input.compiledArchitectureRevisionId ?? null;
      state.runRecord.compiledExecutionPlanRevisionId =
        input.compiledExecutionPlanRevisionId ?? null;
      state.runRecord.compiledAt = input.compiledAt ?? null;

      return {
        ...state.runRecord
      };
    }),
    putArtifactJson: vi.fn(async (_bucket, _namespace, key, value) => {
      state.jsonWrites.push({ key, value });
      state.objectsByKey.set(key, JSON.parse(JSON.stringify(value)));

      return {
        storageBackend: "r2",
        key,
        etag: `etag-${state.jsonWrites.length}`,
        sizeBytes: JSON.stringify(value).length
      };
    }),
    getArtifactText: vi.fn(async (_bucket, key) => {
      const value = state.objectsByKey.get(key);

      return value === undefined ? null : JSON.stringify(value, null, 2);
    }),
    deleteArtifactObject: vi.fn(async (_bucket, key) => {
      state.deletedObjectKeys.push(key);
      state.objectsByKey.delete(key);
    }),
    createChatCompletion: vi.fn(async () => ({
      id: "chatcmpl-live",
      model: "gpt-5.4",
      content: JSON.stringify(liveParsedPlan),
      rawText: JSON.stringify(liveParsedPlan),
      finishReason: "stop",
      usage: {
        totalTokens: 64
      }
    })),
    parseStructuredChatCompletion: vi.fn(() => JSON.parse(JSON.stringify(liveParsedPlan)))
  };
});

vi.mock("../../src/lib/db/artifacts", () => ({
  createArtifactRef: mocked.createArtifactRef,
  deleteArtifactRef: mocked.deleteArtifactRef,
  findArtifactRefByObjectKey: mocked.findArtifactRefByObjectKey
}));

vi.mock("../../src/lib/db/runs", () => ({
  getRunRecord: mocked.getRunRecord,
  persistCompiledRunGraph: mocked.persistCompiledRunGraph,
  updateRunRecord: mocked.updateRunRecord
}));

vi.mock("../../src/lib/artifacts/r2", () => ({
  deleteArtifactObject: mocked.deleteArtifactObject,
  getArtifactText: mocked.getArtifactText,
  putArtifactJson: mocked.putArtifactJson
}));

vi.mock("../../src/lib/llm/chat-completions", () => ({
  createChatCompletion: mocked.createChatCompletion,
  parseStructuredChatCompletion: mocked.parseStructuredChatCompletion
}));

const { compileDemoFixtureRunPlan, compileRunPlan } = await import(
  "../../src/keystone/compile/plan-run"
);

function createCompileInput() {
  return {
    env: {
      ARTIFACTS_BUCKET: {} as R2Bucket,
      KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
      KEYSTONE_CHAT_COMPLETIONS_MODEL: "gpt-5.4"
    } as never,
    client: {} as never,
    tenantId: "tenant-fixture",
    projectId: "project-fixture",
    runId: "run-123",
    planningDocuments
  };
}

describe("plan-run compile metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.reset();
  });

  it("persists live compile output with document provenance", async () => {
    const liveTask = mocked.liveParsedPlan.tasks[0];

    if (!liveTask) {
      throw new Error("Expected the live parsed plan to include a task.");
    }

    const result = await compileRunPlan(createCompileInput());

    expect(result.plan.sourceRevisionIds).toEqual({
      specification: planningDocuments.specification.revisionId,
      architecture: planningDocuments.architecture.revisionId,
      executionPlan: planningDocuments.executionPlan.revisionId
    });
    expect(result.plan.tasks[0]?.runTaskId).toBe(RUN_TASK_ID_1);
    expect(mocked.persistCompiledRunGraph).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        compiledSpecRevisionId: planningDocuments.specification.revisionId,
        compiledArchitectureRevisionId: planningDocuments.architecture.revisionId,
        compiledExecutionPlanRevisionId: planningDocuments.executionPlan.revisionId
      })
    );
    expect(mocked.state.artifactRefInputs.map((artifact) => artifact.artifactKind)).toEqual([
      "run_plan",
      "task_handoff"
    ]);
    expect(mocked.state.artifactRefInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifactKind: "task_handoff",
          runTaskId: RUN_TASK_ID_1,
          objectKey: taskHandoffArtifactKey("tenant-fixture", "run-123", RUN_TASK_ID_1)
        })
      ])
    );
    expect(mocked.state.jsonWrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: runPlanArtifactKey("tenant-fixture", "run-123"),
          value: result.plan
        }),
        expect.objectContaining({
          key: taskHandoffArtifactKey("tenant-fixture", "run-123", RUN_TASK_ID_1),
          value: {
            runId: "run-123",
            runTaskId: RUN_TASK_ID_1,
            sourceRevisionIds: result.plan.sourceRevisionIds,
            task: result.plan.tasks[0]
          }
        })
      ])
    );
    expect(mocked.state.runUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          compiledSpecRevisionId: planningDocuments.specification.revisionId,
          compiledArchitectureRevisionId: planningDocuments.architecture.revisionId,
          compiledExecutionPlanRevisionId: planningDocuments.executionPlan.revisionId,
          compiledAt: expect.any(Date)
        })
      ])
    );

    const createChatCompletionCalls = mocked.createChatCompletion.mock.calls as unknown as Array<
      [{ messages?: Array<{ content?: string }> }]
    >;
    const request = createChatCompletionCalls[0]?.[0];
    const promptPayload = JSON.parse(String(request?.messages?.[1]?.content)) as Record<string, unknown>;

    expect(promptPayload).not.toHaveProperty("repo");
    expect(promptPayload).toMatchObject({
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
    });
  });

  it("persists multi-node live compile dependencies into the DAG and task handoffs", async () => {
    mocked.replaceLiveParsedPlan({
      summary: "Live compile produced a two-task DAG.",
      tasks: [
        {
          taskId: "task-live-root",
          title: "Prepare the greeting change",
          summary: "Inspect the current implementation before editing.",
          instructions: ["Read the current greeting implementation."],
          acceptanceCriteria: ["The current implementation is understood."],
          dependsOn: []
        },
        {
          taskId: "task-live-child",
          title: "Apply the greeting change",
          summary: "Update the greeting after the inspection task finishes.",
          instructions: ["Edit the greeting implementation.", "Run the relevant checks."],
          acceptanceCriteria: ["The greeting implementation is updated."],
          dependsOn: ["task-live-root"]
        }
      ]
    });

    const result = await compileRunPlan(createCompileInput());

    expect(mocked.persistCompiledRunGraph).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tasks: [
          expect.objectContaining({
            taskId: "task-live-root",
            dependsOn: []
          }),
          expect.objectContaining({
            taskId: "task-live-child",
            dependsOn: ["task-live-root"]
          })
        ]
      })
    );
    expect(result.plan.tasks).toEqual([
      expect.objectContaining({
        taskId: "task-live-root",
        runTaskId: RUN_TASK_ID_1,
        dependsOn: []
      }),
      expect.objectContaining({
        taskId: "task-live-child",
        dependsOn: ["task-live-root"]
      })
    ]);
    expect(mocked.state.jsonWrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: taskHandoffArtifactKey("tenant-fixture", "run-123", RUN_TASK_ID_1),
          value: expect.objectContaining({
            task: expect.objectContaining({
              taskId: "task-live-root",
              dependsOn: []
            })
          })
        }),
        expect.objectContaining({
          value: expect.objectContaining({
            task: expect.objectContaining({
              taskId: "task-live-child",
              dependsOn: ["task-live-root"]
            })
          })
        })
      ])
    );
  });

  it("reuses persisted run-plan and task-handoff artifacts on replay", async () => {
    const first = await compileRunPlan(createCompileInput());
    const firstArtifactCount = mocked.state.artifactRefInputs.length;
    const firstRunUpdateCount = mocked.state.runUpdates.length;

    const second = await compileRunPlan(createCompileInput());

    expect(second.plan).toEqual(first.plan);
    expect(second.planArtifactRef.artifactRefId).toBe(first.planArtifactRef.artifactRefId);
    expect(second.taskHandoffArtifactRefs.map((artifactRef) => artifactRef.artifactRefId)).toEqual(
      first.taskHandoffArtifactRefs.map((artifactRef) => artifactRef.artifactRefId)
    );
    expect(mocked.state.artifactRefInputs).toHaveLength(firstArtifactCount);
    expect(mocked.state.runUpdates).toHaveLength(firstRunUpdateCount + 1);
  });

  it("restores the previous compiled plan when a replay fails after reusing deterministic artifact keys", async () => {
    const first = await compileRunPlan(createCompileInput());
    const runPlanKey = runPlanArtifactKey("tenant-fixture", "run-123");
    const firstTask = first.plan.tasks[0];

    if (!firstTask?.runTaskId) {
      throw new Error("Expected the initial compiled plan to include a persisted runTaskId.");
    }

    const firstHandoffKey = taskHandoffArtifactKey("tenant-fixture", "run-123", firstTask.runTaskId);
    const initialRunPlanObject = JSON.parse(
      JSON.stringify(mocked.state.objectsByKey.get(runPlanKey))
    ) as Record<string, unknown>;
    const initialHandoffObject = JSON.parse(
      JSON.stringify(mocked.state.objectsByKey.get(firstHandoffKey))
    ) as Record<string, unknown>;

    mocked.replaceLiveParsedPlan({
      summary: "Live compile produced a replay with an extra follow-up task.",
      tasks: [
        {
          taskId: firstTask.taskId,
          title: "Adjust the greeting implementation",
          summary: "Reuse the existing implementation task.",
          instructions: ["Implement the approved change.", "Run the relevant checks."],
          acceptanceCriteria: ["Relevant checks pass."],
          dependsOn: []
        },
        {
          taskId: "task-live-follow-up",
          title: "Capture the rollout note",
          summary: "Add a follow-up note after the implementation task completes.",
          instructions: ["Write the rollout note."],
          acceptanceCriteria: ["The rollout note is staged."],
          dependsOn: [firstTask.taskId]
        }
      ]
    });
    mocked.failNextRunUpdate("compiled provenance update failed");

    await expect(compileRunPlan(createCompileInput())).rejects.toThrow(
      /compiled provenance update failed/
    );

    expect(mocked.state.deletedObjectKeys).toEqual([
      taskHandoffArtifactKey("tenant-fixture", "run-123", RUN_TASK_ID_2)
    ]);
    expect(mocked.state.deletedArtifactRefIds).toHaveLength(1);
    expect(mocked.state.objectsByKey.get(runPlanKey)).toEqual(initialRunPlanObject);
    expect(mocked.state.objectsByKey.get(firstHandoffKey)).toEqual(initialHandoffObject);
    expect(
      mocked.state.objectsByKey.get(taskHandoffArtifactKey("tenant-fixture", "run-123", RUN_TASK_ID_2))
    ).toBeUndefined();
    expect(mocked.persistCompiledRunGraph).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        compiledSpecRevisionId: first.plan.sourceRevisionIds.specification,
        compiledArchitectureRevisionId: first.plan.sourceRevisionIds.architecture,
        compiledExecutionPlanRevisionId: first.plan.sourceRevisionIds.executionPlan,
        tasks: [
          expect.objectContaining({
            taskId: firstTask.taskId,
            runTaskId: firstTask.runTaskId,
            dependsOn: []
          })
        ]
      })
    );
  });

  it("rejects live compile output with unknown dependency ids", async () => {
    const liveTask = mocked.liveParsedPlan.tasks[0];

    if (!liveTask) {
      throw new Error("Expected the live parsed plan to include a task.");
    }

    mocked.replaceLiveParsedPlan({
      ...mocked.liveParsedPlan,
      tasks: [
        {
          ...liveTask,
          dependsOn: ["task-unknown"]
        }
      ]
    });

    await expect(compileRunPlan(createCompileInput())).rejects.toThrow(
      /dependency task-unknown is not present in the compiled plan/
    );
  });

  it("records live compile failures without persisting run-plan artifacts", async () => {
    const liveTask = mocked.liveParsedPlan.tasks[0];

    if (!liveTask) {
      throw new Error("Expected the live parsed plan to include a task.");
    }

    mocked.replaceLiveParsedPlan({
      ...mocked.liveParsedPlan,
      tasks: [
        {
          ...liveTask,
          dependsOn: ["task-unknown"]
        }
      ]
    });
    await expect(compileRunPlan(createCompileInput())).rejects.toThrow(
      /dependency task-unknown is not present in the compiled plan/
    );

    expect(
      mocked.state.jsonWrites.find(
        (entry) => entry.key === runPlanArtifactKey("tenant-fixture", "run-123")
      )
    ).toBeUndefined();
    expect(mocked.state.runUpdates).toEqual([]);
  });

  it("produces the deterministic fixture compile plan from planning documents", async () => {
    const result = await compileDemoFixtureRunPlan(createCompileInput());

    expect(result.plan).toEqual({
      summary: "Compile smoke produced a single implementation task.",
      sourceRevisionIds: {
        specification: planningDocuments.specification.revisionId,
        architecture: planningDocuments.architecture.revisionId,
        executionPlan: planningDocuments.executionPlan.revisionId
      },
      tasks: [
        {
          taskId: "task-implementation",
          runTaskId: RUN_TASK_ID_1,
          title: "Implement execution plan",
          summary: "Implement the approved execution plan in a reviewable way.",
          instructions: ["Implement the requested change.", "Run the relevant fixture verification."],
          acceptanceCriteria: ["The execution plan goals are satisfied."],
          dependsOn: []
        }
      ]
    });
  });
});
