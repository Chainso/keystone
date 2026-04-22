import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  runPlanArtifactKey,
  taskHandoffArtifactKey
} from "../../src/lib/artifacts/keys";

const RUN_TASK_ID_1 = "11111111-1111-4111-8111-111111111111";

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
    jsonWrites: [] as Array<{ key: string; value: unknown }>,
    runUpdates: [] as Array<Record<string, unknown>>
  };

  function reset() {
    state.artifactRefInputs.length = 0;
    state.artifactRefs.length = 0;
    state.jsonWrites.length = 0;
    state.runUpdates.length = 0;
    replaceLiveParsedPlan(defaultLiveParsedPlan);
  }

  return {
    liveParsedPlan,
    replaceLiveParsedPlan,
    state,
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
        compiledSpecRevisionId: input.compiledSpecRevisionId ?? null,
        compiledArchitectureRevisionId: input.compiledArchitectureRevisionId ?? null,
        compiledExecutionPlanRevisionId: input.compiledExecutionPlanRevisionId ?? null,
        compiledAt: new Date("2026-04-17T00:00:00.000Z"),
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
          runTaskId: task.runTaskId ?? [RUN_TASK_ID_1][index] ?? crypto.randomUUID(),
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
    updateRunRecord: vi.fn(async (_client, input) => {
      state.runUpdates.push(input as Record<string, unknown>);

      return {
        tenantId: input.tenantId,
        runId: "run-123",
        projectId: "project-fixture",
        workflowInstanceId: "workflow-run-123",
        executionEngine: "think_live",
        sandboxId: null,
        status: "active",
        compiledSpecRevisionId: input.compiledSpecRevisionId ?? null,
        compiledArchitectureRevisionId: input.compiledArchitectureRevisionId ?? null,
        compiledExecutionPlanRevisionId: input.compiledExecutionPlanRevisionId ?? null,
        compiledAt: input.compiledAt ?? null,
        startedAt: null,
        endedAt: null,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        updatedAt: new Date("2026-04-17T00:00:00.000Z")
      };
    }),
    putArtifactJson: vi.fn(async (_bucket, _namespace, key, value) => {
      state.jsonWrites.push({ key, value });

      return {
        storageBackend: "r2",
        key,
        etag: `etag-${state.jsonWrites.length}`,
        sizeBytes: JSON.stringify(value).length
      };
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
  findArtifactRefByObjectKey: mocked.findArtifactRefByObjectKey
}));

vi.mock("../../src/lib/db/runs", () => ({
  persistCompiledRunGraph: mocked.persistCompiledRunGraph,
  updateRunRecord: mocked.updateRunRecord
}));

vi.mock("../../src/lib/artifacts/r2", () => ({
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
    repo: {
      source: "localPath" as const,
      localPath: "./fixtures/demo-target",
      ref: "main"
    },
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
