import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  decisionPackageArtifactKey,
  runPlanArtifactKey,
  taskHandoffArtifactKey
} from "../../src/lib/artifacts/keys";
import { demoDecisionPackageFixture } from "../../src/lib/fixtures/demo-decision-package";

const mocked = vi.hoisted(() => {
  const liveParsedPlan = {
    decisionPackageId: "live-compiler-output",
    summary: "Live compile produced a task with model-authored instructions.",
    tasks: [
      {
        taskId: "task-live-implementation",
        title: "Implement the approved live task",
        summary: "Use the live compiler output as the task source.",
        instructions: ["Implement the approved change.", "Run the relevant checks."],
        acceptanceCriteria: ["Relevant checks pass."],
        dependsOn: []
      }
    ]
  };

  const state = {
    artifactRefInputs: [] as Array<Record<string, unknown>>,
    events: [] as Array<Record<string, unknown>>,
    jsonWrites: [] as Array<{ key: string; value: unknown }>,
    statusUpdates: [] as Array<Record<string, unknown>>
  };

  function reset() {
    state.artifactRefInputs.length = 0;
    state.events.length = 0;
    state.jsonWrites.length = 0;
    state.statusUpdates.length = 0;
  }

  return {
    liveParsedPlan,
    state,
    reset,
    createArtifactRef: vi.fn(async (_client, input) => {
      state.artifactRefInputs.push(input as Record<string, unknown>);

      return {
        artifactRefId: `artifact-${state.artifactRefInputs.length}`,
        tenantId: input.tenantId,
        runId: input.runId,
        sessionId: input.sessionId,
        taskId: input.taskId ?? null,
        kind: input.kind,
        storageBackend: input.storageBackend,
        storageUri: input.storageUri,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes ?? null,
        metadata: input.metadata ?? null,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        updatedAt: new Date("2026-04-17T00:00:00.000Z")
      };
    }),
    updateSessionStatus: vi.fn(async (_client, input) => {
      state.statusUpdates.push(input as Record<string, unknown>);

      return {
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        runId: "run-123",
        sessionType: "compile",
        status: input.status,
        parentSessionId: "run-session-123",
        metadata: input.metadata ?? null,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        updatedAt: new Date("2026-04-17T00:00:00.000Z")
      };
    }),
    getSessionRecord: vi.fn(async () => null),
    appendAndPublishRunEvent: vi.fn(async (_client, _env, input) => {
      state.events.push(input as Record<string, unknown>);

      return {
        eventId: `event-${state.events.length}`,
        ts: new Date("2026-04-17T00:00:00.000Z")
      };
    }),
    putArtifactJson: vi.fn(async (_bucket, _namespace, key, value) => {
      state.jsonWrites.push({
        key,
        value
      });

      return {
        storageBackend: "r2",
        storageUri: `r2://keystone-artifacts-dev/${key}`,
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
  createArtifactRef: mocked.createArtifactRef
}));

vi.mock("../../src/lib/db/runs", () => ({
  getSessionRecord: mocked.getSessionRecord,
  updateSessionStatus: mocked.updateSessionStatus
}));

vi.mock("../../src/lib/events/publish", () => ({
  appendAndPublishRunEvent: mocked.appendAndPublishRunEvent
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
    runId: "run-123",
    runSessionId: "run-session-123",
    compileSessionId: "compile-session-123",
    repo: {
      source: "localPath" as const,
      localPath: "./fixtures/demo-target",
      ref: "main"
    },
    decisionPackage: JSON.parse(JSON.stringify(demoDecisionPackageFixture))
  };
}

describe("plan-run compile metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.reset();
  });

  it("canonicalizes live compile output onto the decision-package task contract and stamps compileMode", async () => {
    const decisionTask = demoDecisionPackageFixture.tasks[0];

    if (!decisionTask) {
      throw new Error("Expected the demo decision package fixture to include a task.");
    }

    const result = await compileRunPlan(createCompileInput());
    const runPlanWrite = mocked.state.jsonWrites.find(
      (entry) => entry.key === runPlanArtifactKey("tenant-fixture", "run-123")
    );
    const taskHandoffWrite = mocked.state.jsonWrites.find(
      (entry) =>
        entry.key === taskHandoffArtifactKey("tenant-fixture", "run-123", decisionTask.taskId)
    );
    const unexpectedTaskHandoffWrite = mocked.state.jsonWrites.find(
      (entry) =>
        entry.key === taskHandoffArtifactKey(
          "tenant-fixture",
          "run-123",
          mocked.liveParsedPlan.tasks[0]?.taskId ?? "task-live-implementation"
        )
    );

    expect(result.plan).toEqual({
      decisionPackageId: demoDecisionPackageFixture.decisionPackageId,
      summary: mocked.liveParsedPlan.summary,
      tasks: [
        {
          ...mocked.liveParsedPlan.tasks[0],
          taskId: decisionTask.taskId,
          title: decisionTask.title
        }
      ]
    });
    expect(mocked.parseStructuredChatCompletion).toHaveBeenCalledTimes(1);
    expect(mocked.state.statusUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "provisioning",
          metadata: expect.objectContaining({
            compileMode: "live",
            decisionPackageId: demoDecisionPackageFixture.decisionPackageId
          })
        }),
        expect.objectContaining({
          status: "ready",
          metadata: expect.objectContaining({
            compileMode: "live",
            decisionPackageArtifactRefId: "artifact-1"
          })
        }),
        expect.objectContaining({
          status: "active",
          metadata: expect.objectContaining({
            compileMode: "live",
            runSessionId: "run-session-123"
          })
        }),
        expect.objectContaining({
          status: "archived",
          metadata: expect.objectContaining({
            compileMode: "live",
            planArtifactRefId: "artifact-2",
            taskCount: 1
          })
        })
      ])
    );
    expect(mocked.state.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "compile.started",
          payload: expect.objectContaining({
            compileMode: "live",
            decisionPackageId: demoDecisionPackageFixture.decisionPackageId
          }),
          status: "provisioning"
        }),
        expect.objectContaining({
          eventType: "compile.completed",
          artifactRefId: "artifact-2",
          payload: expect.objectContaining({
            compileMode: "live",
            decisionPackageId: demoDecisionPackageFixture.decisionPackageId,
            taskCount: 1,
            completionId: "chatcmpl-live",
            model: "gpt-5.4"
          }),
          status: "archived"
        })
      ])
    );
    expect(mocked.state.artifactRefInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "decision_package",
          metadata: expect.objectContaining({
            compileMode: "live",
            source: "compile_input"
          })
        }),
        expect.objectContaining({
          kind: "run_plan",
          metadata: expect.objectContaining({
            compileMode: "live",
            decisionPackageId: demoDecisionPackageFixture.decisionPackageId,
            completionId: "chatcmpl-live",
            model: "gpt-5.4"
          })
        }),
        expect.objectContaining({
          kind: "task_handoff",
          metadata: expect.objectContaining({
            compileMode: "live",
            taskId: decisionTask.taskId,
            title: decisionTask.title
          })
        })
      ])
    );
    expect(mocked.state.jsonWrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: decisionPackageArtifactKey("tenant-fixture", "run-123", "compile-session-123"),
          value: demoDecisionPackageFixture
        }),
        expect.objectContaining({
          key: runPlanArtifactKey("tenant-fixture", "run-123"),
          value: result.plan
        }),
        expect.objectContaining({
          key: taskHandoffArtifactKey("tenant-fixture", "run-123", decisionTask.taskId),
          value: {
            runId: "run-123",
            decisionPackageId: demoDecisionPackageFixture.decisionPackageId,
            task: result.plan.tasks[0]
          }
        })
      ])
    );
    expect(runPlanWrite?.value).toEqual(result.plan);
    expect(taskHandoffWrite?.value).toEqual({
      runId: "run-123",
      decisionPackageId: demoDecisionPackageFixture.decisionPackageId,
      task: result.plan.tasks[0]
    });
    expect(unexpectedTaskHandoffWrite).toBeUndefined();
  });

  it("stamps compileMode across the deterministic fixture compile path", async () => {
    const result = await compileDemoFixtureRunPlan(createCompileInput());
    const decisionTask = result.plan.tasks[0];

    if (!decisionTask) {
      throw new Error("Expected the deterministic fixture compile to produce a task.");
    }

    expect(mocked.createChatCompletion).not.toHaveBeenCalled();
    expect(mocked.parseStructuredChatCompletion).not.toHaveBeenCalled();
    expect(result.plan).toEqual({
      decisionPackageId: demoDecisionPackageFixture.decisionPackageId,
      summary: "Compile smoke produced a single implementation task.",
      tasks: [
        {
          taskId: "task-greeting-tone",
          title: "Adjust the greeting implementation",
          summary: "Change the greeting in a reviewable way.",
          instructions: ["Edit the greeting implementation.", "Run the fixture tests."],
          acceptanceCriteria: ["Fixture tests stay green."],
          dependsOn: []
        }
      ]
    });
    expect(mocked.state.statusUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "provisioning",
          metadata: expect.objectContaining({
            compileMode: "fixture",
            decisionPackageId: demoDecisionPackageFixture.decisionPackageId
          })
        }),
        expect.objectContaining({
          status: "archived",
          metadata: expect.objectContaining({
            compileMode: "fixture",
            taskCount: 1
          })
        })
      ])
    );
    expect(mocked.state.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "compile.started",
          payload: expect.objectContaining({
            compileMode: "fixture"
          })
        }),
        expect.objectContaining({
          eventType: "compile.completed",
          payload: expect.objectContaining({
            compileMode: "fixture",
            taskCount: 1,
            model: "fixture-compile"
          })
        })
      ])
    );
    expect(mocked.state.artifactRefInputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "decision_package",
          metadata: expect.objectContaining({
            compileMode: "fixture"
          })
        }),
        expect.objectContaining({
          kind: "run_plan",
          metadata: expect.objectContaining({
            compileMode: "fixture",
            model: "fixture-compile"
          })
        }),
        expect.objectContaining({
          kind: "task_handoff",
          metadata: expect.objectContaining({
            compileMode: "fixture",
            taskId: decisionTask.taskId
          })
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
          key: taskHandoffArtifactKey("tenant-fixture", "run-123", decisionTask.taskId),
          value: {
            runId: "run-123",
            decisionPackageId: demoDecisionPackageFixture.decisionPackageId,
            task: decisionTask
          }
        })
      ])
    );
  });
});
