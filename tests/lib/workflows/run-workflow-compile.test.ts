import { beforeEach, describe, expect, it, vi } from "vitest";

import { demoDecisionPackageFixture } from "../../../src/lib/fixtures/demo-decision-package";

const mocked = vi.hoisted(() => {
  const livePlan = {
    decisionPackageId: "demo-greeting-update",
    summary: "Live compile produced a real implementation plan.",
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
  const fixturePlan = {
    decisionPackageId: "demo-greeting-update",
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
  };
  const state = {
    compiledPlan: fixturePlan
  };
  const close = vi.fn(async () => undefined);

  return {
    close,
    livePlan,
    fixturePlan,
    state,
    getRunCoordinatorStub: vi.fn(() => ({
      initialize: vi.fn(async () => undefined),
      publish: vi.fn(async () => undefined)
    })),
    createWorkerDatabaseClient: vi.fn(() => ({
      close,
      db: {},
      sql: {}
    })),
    getSessionRecord: vi.fn(async () => undefined),
    updateSessionStatus: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      runId: "run-123",
      sessionType: "run",
      status: input.status,
      parentSessionId: null,
      metadata: input.metadata ?? null,
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    })),
    appendAndPublishRunEvent: vi.fn(async () => ({
      eventId: crypto.randomUUID(),
      ts: new Date("2026-04-17T00:00:00.000Z")
    })),
    ensureSessionRecord: vi.fn(async (_client, spec, sessionId) => ({
      tenantId: spec.tenantId,
      sessionId,
      runId: spec.runId,
      sessionType: spec.sessionType,
      status: "configured",
      parentSessionId: spec.parentSessionId ?? null,
      metadata: null,
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    })),
    loadExistingRunPlan: vi.fn(async () => null),
    evaluateRepoSourcePolicy: vi.fn(() => ({
      result: "allow"
    })),
    compileRunPlan: vi.fn(async () => {
      state.compiledPlan = livePlan;

      return {
        plan: livePlan,
        completion: {
          id: "chatcmpl-live",
          model: "gpt-5.4",
          finishReason: "stop",
          usage: {
            totalTokens: 64
          }
        },
        decisionPackageArtifactRef: {
          artifactRefId: "decision-package-live"
        },
        planArtifactRef: {
          artifactRefId: "run-plan-live"
        },
        taskHandoffArtifactRefs: [
          {
            artifactRefId: "task-handoff-live"
          }
        ]
      };
    }),
    compileDemoFixtureRunPlan: vi.fn(async () => {
      state.compiledPlan = fixturePlan;

      return {
        plan: fixturePlan,
        completion: {
          id: "chatcmpl-fixture",
          model: "fixture-compile",
          finishReason: "stop",
          usage: {
            totalTokens: 0
          }
        },
        decisionPackageArtifactRef: {
          artifactRefId: "decision-package-fixture"
        },
        planArtifactRef: {
          artifactRefId: "run-plan-fixture"
        },
        taskHandoffArtifactRefs: [
          {
            artifactRefId: "task-handoff-fixture"
          }
        ]
      };
    }),
    loadCompiledRunPlanArtifact: vi.fn(async () => state.compiledPlan),
    finalizeRun: vi.fn(async () => ({
      finalStatus: "archived",
      artifactRef: {
        artifactRefId: "run-summary-artifact"
      },
      summary: {
        successfulTasks: 1,
        failedTasks: 0
      }
    }))
  };
});

vi.mock("cloudflare:workers", () => {
  class WorkflowEntrypoint<Env = unknown> {
    protected ctx: ExecutionContext;
    protected env: Env;

    constructor(ctx: ExecutionContext, env: Env) {
      this.ctx = ctx;
      this.env = env;
    }
  }

  return {
    WorkflowEntrypoint
  };
});

vi.mock("cloudflare:workflows", () => ({
  NonRetryableError: class NonRetryableError extends Error {}
}));

vi.mock("../../../src/lib/auth/tenant", () => ({
  getRunCoordinatorStub: mocked.getRunCoordinatorStub
}));

vi.mock("../../../src/lib/db/client", () => ({
  createWorkerDatabaseClient: mocked.createWorkerDatabaseClient
}));

vi.mock("../../../src/lib/db/runs", () => ({
  getSessionRecord: mocked.getSessionRecord,
  updateSessionStatus: mocked.updateSessionStatus
}));

vi.mock("../../../src/lib/events/publish", () => ({
  appendAndPublishRunEvent: mocked.appendAndPublishRunEvent
}));

vi.mock("../../../src/lib/security/policy", () => ({
  evaluateRepoSourcePolicy: mocked.evaluateRepoSourcePolicy
}));

vi.mock("../../../src/lib/workflows/idempotency", async () => {
  const actual =
    await vi.importActual<typeof import("../../../src/lib/workflows/idempotency")>(
      "../../../src/lib/workflows/idempotency"
    );

  return {
    ...actual,
    ensureSessionRecord: mocked.ensureSessionRecord,
    loadExistingRunPlan: mocked.loadExistingRunPlan
  };
});

vi.mock("../../../src/keystone/compile/plan-run", () => ({
  compileRunPlan: mocked.compileRunPlan,
  compileDemoFixtureRunPlan: mocked.compileDemoFixtureRunPlan
}));

vi.mock("../../../src/keystone/tasks/load-task-contracts", () => ({
  loadCompiledRunPlanArtifact: mocked.loadCompiledRunPlanArtifact
}));

vi.mock("../../../src/keystone/integration/finalize-run", () => ({
  finalizeRun: mocked.finalizeRun
}));

const { RunWorkflow } = await import("../../../src/workflows/RunWorkflow");

function createStep() {
  return {
    do: vi.fn(async (_name: string, configOrCallback: unknown, maybeCallback?: unknown) => {
      const callback =
        typeof configOrCallback === "function" ? configOrCallback : maybeCallback;

      if (typeof callback !== "function") {
        throw new Error("Workflow step callback was not provided.");
      }

      return callback({
        attempt: 1
      });
    }),
    sleep: vi.fn(async () => undefined),
    waitForEvent: vi.fn(async () => ({
      payload: {
        approvalId: "approval-1",
        resolution: "approved"
      },
      timestamp: new Date("2026-04-17T00:00:00.000Z"),
      type: "approval.resolved.approval-1"
    }))
  };
}

function createTaskWorkflowBinding() {
  const batches = new Map<string, { params: { taskId: string } }>();

  return {
    createBatch: vi.fn(async (batch: Array<{ id: string; params: { taskId: string } }>) => {
      for (const entry of batch) {
        batches.set(entry.id, entry);
      }
    }),
    get: vi.fn(async (instanceId: string) => ({
      status: vi.fn(async () => ({
        status: "complete",
        output: {
          taskId: batches.get(instanceId)?.params.taskId ?? "unknown-task",
          taskSessionId: `${instanceId}-session`,
          processStatus: "completed",
          exitCode: 0,
          logArtifactRefId: null,
          workflowStatus: "complete"
        }
      }))
    }))
  };
}

function createWorkflowEnv() {
  return {
    ARTIFACTS_BUCKET: {} as R2Bucket,
    TASK_WORKFLOW: createTaskWorkflowBinding()
  };
}

function createWorkflowEvent(thinkMode: "live" | "mock") {
  return {
    payload: {
      tenantId: "tenant-fixture",
      runId: "run-123",
      runSessionId: "run-session-123",
      repo: {
        source: "localPath" as const,
        localPath: "./fixtures/demo-target",
        ref: "main"
      },
      decisionPackage: {
        source: "payload" as const,
        payload: JSON.parse(JSON.stringify(demoDecisionPackageFixture))
      },
      runtime: "think" as const,
      options: {
        thinkMode,
        preserveSandbox: false
      }
    }
  };
}

describe("RunWorkflow compile routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.state.compiledPlan = mocked.fixturePlan;
    mocked.loadExistingRunPlan.mockResolvedValue(null);
    mocked.evaluateRepoSourcePolicy.mockReturnValue({
      result: "allow"
    });
  });

  it("uses the real compiler for think/live fixture runs", async () => {
    const env = createWorkflowEnv();
    const step = createStep();
    const workflow = new RunWorkflow({} as ExecutionContext, env as never);
    const liveTask = mocked.livePlan.tasks[0];

    if (!liveTask) {
      throw new Error("Expected the live compile fixture to include a task.");
    }

    const result = await workflow.run(createWorkflowEvent("live") as never, step as never);

    expect(mocked.compileRunPlan).toHaveBeenCalledTimes(1);
    expect(mocked.compileDemoFixtureRunPlan).not.toHaveBeenCalled();
    expect(env.TASK_WORKFLOW.createBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        params: expect.objectContaining({
          taskId: liveTask.taskId,
          runtime: "think",
          options: {
            thinkMode: "live",
            preserveSandbox: false
          }
        })
      })
    ]);
    expect(mocked.loadCompiledRunPlanArtifact).toHaveBeenCalledWith(
      env,
      "tenant-fixture",
      "run-123"
    );
    expect(result).toMatchObject({
      runId: "run-123",
      taskCount: mocked.livePlan.tasks.length,
      decisionPackageId: mocked.livePlan.decisionPackageId,
      finalStatus: "archived",
      runSummaryArtifactRefId: "run-summary-artifact"
    });
  });

  it("preserves the deterministic fixture compiler for think/mock runs", async () => {
    const env = createWorkflowEnv();
    const step = createStep();
    const workflow = new RunWorkflow({} as ExecutionContext, env as never);
    const fixtureTask = mocked.fixturePlan.tasks[0];

    if (!fixtureTask) {
      throw new Error("Expected the fixture compile plan to include a task.");
    }

    const result = await workflow.run(createWorkflowEvent("mock") as never, step as never);

    expect(mocked.compileDemoFixtureRunPlan).toHaveBeenCalledTimes(1);
    expect(mocked.compileRunPlan).not.toHaveBeenCalled();
    expect(env.TASK_WORKFLOW.createBatch).toHaveBeenCalledWith([
      expect.objectContaining({
        params: expect.objectContaining({
          taskId: fixtureTask.taskId,
          runtime: "think",
          options: {
            thinkMode: "mock",
            preserveSandbox: false
          }
        })
      })
    ]);
    expect(result).toMatchObject({
      runId: "run-123",
      taskCount: mocked.fixturePlan.tasks.length,
      decisionPackageId: mocked.fixturePlan.decisionPackageId,
      finalStatus: "archived",
      runSummaryArtifactRefId: "run-summary-artifact"
    });
  });
});
