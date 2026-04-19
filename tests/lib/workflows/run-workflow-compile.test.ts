import { beforeEach, describe, expect, it, vi } from "vitest";

import { demoDecisionPackageFixture } from "../../../src/lib/fixtures/demo-decision-package";

const mocked = vi.hoisted(() => {
  const livePlan = {
    decisionPackageId: "demo-greeting-update",
    summary: "Live compile produced a real implementation plan.",
    tasks: [
      {
        taskId: "task-live-implementation",
        title: "Adjust the greeting implementation",
        summary: "Use the live compiler output as the task source.",
        instructions: ["Implement the approved change.", "Run the relevant checks."],
        acceptanceCriteria: ["Relevant checks pass."],
        dependsOn: [] as string[]
      }
    ]
  };
  const persistedLivePlan = {
    decisionPackageId: "demo-greeting-update",
    summary: "Persisted live compile output was reloaded for the fixture-scoped happy path.",
    tasks: [
      {
        taskId: "task-persisted-live-implementation",
        title: "Adjust the greeting implementation",
        summary: "Use the persisted compile artifact as the task source.",
        instructions: ["Implement the approved change.", "Run the relevant checks."],
        acceptanceCriteria: ["Relevant checks pass."],
        dependsOn: [] as string[]
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
        dependsOn: [] as string[]
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
    persistedLivePlan,
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
    getProject: vi.fn(async () => ({
      tenantId: "tenant-fixture",
      projectId: "project-fixture",
      projectKey: "fixture-demo-project",
      displayName: "Fixture Demo Project",
      description: "Fixture project",
      ruleSet: {
        reviewInstructions: ["Review the result."],
        testInstructions: ["Run fixture tests."]
      },
      components: [
        {
          componentKey: "demo-target",
          displayName: "Demo Target",
          kind: "git_repository",
          config: {
            localPath: "./fixtures/demo-target",
            defaultRef: "main"
          },
          metadata: {}
        }
      ],
      envVars: [
        {
          name: "KEYSTONE_FIXTURE_PROJECT",
          value: "1",
          metadata: {}
        }
      ],
      integrationBindings: [],
      metadata: {},
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    })),
    getSessionRecord: vi.fn(async () => undefined),
    ensureRunRecord: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      runId: input.runId,
      projectId: input.projectId,
      workflowInstanceId: input.workflowInstanceId,
      executionEngine: input.executionEngine,
      sandboxId: input.sandboxId ?? null,
      status: input.status,
      compiledSpecRevisionId: null,
      compiledArchitectureRevisionId: null,
      compiledExecutionPlanRevisionId: null,
      compiledAt: null,
      startedAt: null,
      endedAt: null,
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    })),
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
      state.compiledPlan = persistedLivePlan;

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

vi.mock("../../../src/lib/db/projects", () => ({
  getProject: mocked.getProject
}));

vi.mock("../../../src/lib/db/runs", () => ({
  ensureRunRecord: mocked.ensureRunRecord,
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

vi.mock("../../../src/keystone/tasks/load-task-contracts", async () => {
  const actual =
    await vi.importActual<typeof import("../../../src/keystone/tasks/load-task-contracts")>(
      "../../../src/keystone/tasks/load-task-contracts"
    );

  return {
    ...actual,
    loadCompiledRunPlanArtifact: mocked.loadCompiledRunPlanArtifact
  };
});

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
    create: vi.fn(async (entry: { id: string; params: { taskId: string } }) => {
      batches.set(entry.id, entry);
      return { id: entry.id };
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
      projectId: "project-fixture",
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

function createLiveCompileResult() {
  return {
    plan: mocked.livePlan,
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

  it("uses the persisted compile artifact for think/live fanout", async () => {
    const env = createWorkflowEnv();
    const step = createStep();
    const workflow = new RunWorkflow({} as ExecutionContext, env as never);
    const liveTask = mocked.livePlan.tasks[0];
    const persistedTask = mocked.persistedLivePlan.tasks[0];

    if (!liveTask || !persistedTask) {
      throw new Error("Expected the live compile fixture to include a task.");
    }

    const result = await workflow.run(createWorkflowEvent("live") as never, step as never);
    const [fanoutCall] = env.TASK_WORKFLOW.create.mock.calls[0] ?? [];

    if (!fanoutCall) {
      throw new Error("Expected the task fanout call to include one task.");
    }

    const statusMetadata = mocked.updateSessionStatus.mock.calls.at(-1)?.[1]?.metadata;

    expect(mocked.compileRunPlan).toHaveBeenCalledTimes(1);
    expect(mocked.compileDemoFixtureRunPlan).not.toHaveBeenCalled();
    expect(statusMetadata).toMatchObject({
      project: {
        projectId: "project-fixture",
        projectKey: "fixture-demo-project",
        displayName: "Fixture Demo Project",
        componentKeys: ["demo-target"],
        envVarNames: ["KEYSTONE_FIXTURE_PROJECT"],
        ruleSet: {
          reviewInstructions: ["Review the result."],
          testInstructions: ["Run fixture tests."]
        },
        componentRuleOverrides: []
      },
      executionEngine: "think",
      runtime: "think"
    });
    expect(mocked.ensureRunRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        runId: "run-123",
        projectId: "project-fixture",
        executionEngine: "think",
        status: "configured"
      })
    );
    expect(fanoutCall.params).toMatchObject({
      taskId: persistedTask.taskId,
      project: {
        projectId: "project-fixture",
        projectKey: "fixture-demo-project"
      },
      runtime: "think",
      options: {
        thinkMode: "live",
        preserveSandbox: false
      }
    });
    expect(fanoutCall.params.taskId).not.toBe(liveTask.taskId);
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

  it("reuses persisted run-session execution metadata over a conflicting workflow request", async () => {
    const env = createWorkflowEnv();
    const step = createStep();
    const workflow = new RunWorkflow({} as ExecutionContext, env as never);
    const persistedTask = mocked.persistedLivePlan.tasks[0];

    if (!persistedTask) {
      throw new Error("Expected the persisted live compile fixture to include a task.");
    }

    mocked.ensureSessionRecord.mockResolvedValueOnce({
      tenantId: "tenant-fixture",
      sessionId: "run-session-123",
      runId: "run-123",
      sessionType: "run",
      status: "active",
      parentSessionId: null,
      metadata: {
        project: {
          projectId: "project-fixture",
          projectKey: "fixture-demo-project",
          displayName: "Fixture Demo Project"
        },
        decisionPackageId: "demo-greeting-update",
        workflowInstanceId: "run-run-123-tenant-fixt",
        executionEngine: "think",
        runtime: "scripted",
        options: {
          thinkMode: "live",
          preserveSandbox: true
        }
      },
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    });

    const result = await workflow.run(
      {
        payload: {
          ...createWorkflowEvent("mock").payload,
          executionEngine: "scripted",
          runtime: "scripted",
          options: {
            thinkMode: "mock",
            preserveSandbox: false
          }
        }
      } as never,
      step as never
    );

    expect(mocked.compileRunPlan).toHaveBeenCalledTimes(1);
    expect(mocked.compileDemoFixtureRunPlan).not.toHaveBeenCalled();
    expect(mocked.ensureRunRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        runId: "run-123",
        executionEngine: "think",
        status: "active"
      })
    );
    expect(env.TASK_WORKFLOW.create).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          taskId: persistedTask.taskId,
          runtime: "think",
          options: {
            thinkMode: "live",
            preserveSandbox: true
          }
        })
      })
    );
    expect(result).toMatchObject({
      runId: "run-123",
      finalStatus: "archived"
    });
  });

  it("fails clearly when multiple executable project components leave compile target selection ambiguous", async () => {
    const env = createWorkflowEnv();
    const step = createStep();
    const workflow = new RunWorkflow({} as ExecutionContext, env as never);

    mocked.getProject.mockResolvedValueOnce({
      tenantId: "tenant-fixture",
      projectId: "project-fixture",
      projectKey: "fixture-demo-project",
      displayName: "Fixture Demo Project",
      description: "Fixture project",
      ruleSet: {
        reviewInstructions: ["Review the result."],
        testInstructions: ["Run fixture tests."]
      },
      components: [
        {
          componentKey: "demo-target",
          displayName: "Demo Target",
          kind: "git_repository",
          config: {
            localPath: "./fixtures/demo-target",
            defaultRef: "main"
          },
          metadata: {}
        },
        {
          componentKey: "docs",
          displayName: "Docs",
          kind: "git_repository",
          config: {
            gitUrl: "https://github.com/example/docs.git",
            defaultRef: "main"
          },
          metadata: {}
        }
      ],
      envVars: [],
      integrationBindings: [],
      metadata: {},
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    } as never);

    await expect(workflow.run(createWorkflowEvent("live") as never, step as never)).rejects.toThrow(
      /requires exactly one compile target until explicit project compile selection exists/
    );
    expect(mocked.compileRunPlan).not.toHaveBeenCalled();
    expect(mocked.compileDemoFixtureRunPlan).not.toHaveBeenCalled();
    expect(env.TASK_WORKFLOW.create).not.toHaveBeenCalled();
  });

  it("rejects persisted live compile plans when the task no longer matches the approved fixture task shape", async () => {
    const env = createWorkflowEnv();
    const step = createStep();
    const workflow = new RunWorkflow({} as ExecutionContext, env as never);
    const liveTask = mocked.livePlan.tasks[0];

    if (!liveTask) {
      throw new Error("Expected the live compile fixture to include a task.");
    }

    mocked.compileRunPlan.mockImplementationOnce(async () => {
      mocked.state.compiledPlan = {
        ...mocked.livePlan,
        tasks: [
          {
            ...liveTask,
            title: "Unexpected task title"
          }
        ]
      };

      return createLiveCompileResult();
    });

    await expect(workflow.run(createWorkflowEvent("live") as never, step as never)).rejects.toThrow(
      /could not reconcile task task-live-implementation \(Unexpected task title\) with the approved fixture decision package/
    );
    expect(env.TASK_WORKFLOW.create).not.toHaveBeenCalled();
  });

  it("rejects persisted live compile plans when the task count falls outside the fixture-scoped happy path", async () => {
    const env = createWorkflowEnv();
    const step = createStep();
    const workflow = new RunWorkflow({} as ExecutionContext, env as never);
    const persistedTask = mocked.persistedLivePlan.tasks[0];

    if (!persistedTask) {
      throw new Error("Expected the persisted live compile fixture to include a task.");
    }

    mocked.compileRunPlan.mockImplementationOnce(async () => {
      mocked.state.compiledPlan = {
        ...mocked.persistedLivePlan,
        tasks: [
          persistedTask,
          {
            ...persistedTask,
            taskId: "task-extra",
            title: "Extra unexpected task"
          }
        ]
      };

      return createLiveCompileResult();
    });

    await expect(workflow.run(createWorkflowEvent("live") as never, step as never)).rejects.toThrow(
      /produced 2 tasks, expected 1/
    );
    expect(env.TASK_WORKFLOW.create).not.toHaveBeenCalled();
  });

  it("rejects persisted live compile plans when the decision package id falls outside the fixture-scoped happy path", async () => {
    const env = createWorkflowEnv();
    const step = createStep();
    const workflow = new RunWorkflow({} as ExecutionContext, env as never);

    mocked.compileRunPlan.mockImplementationOnce(async () => {
      mocked.state.compiledPlan = {
        ...mocked.persistedLivePlan,
        decisionPackageId: "unexpected-decision-package"
      };

      return createLiveCompileResult();
    });

    await expect(workflow.run(createWorkflowEvent("live") as never, step as never)).rejects.toThrow(
      /produced decision package unexpected-decision-package, expected demo-greeting-update/
    );
    expect(env.TASK_WORKFLOW.create).not.toHaveBeenCalled();
  });

  it("rejects persisted live compile plans when dependsOn exceeds the fixture-scoped happy path", async () => {
    const env = createWorkflowEnv();
    const step = createStep();
    const workflow = new RunWorkflow({} as ExecutionContext, env as never);
    const persistedTask = mocked.persistedLivePlan.tasks[0];

    if (!persistedTask) {
      throw new Error("Expected the persisted live compile fixture to include a task.");
    }

    mocked.compileRunPlan.mockImplementationOnce(async () => {
      mocked.state.compiledPlan = {
        ...mocked.persistedLivePlan,
        tasks: [
          {
            ...persistedTask,
            dependsOn: ["task-prep"]
          }
        ]
      };

      return createLiveCompileResult();
    });

    await expect(workflow.run(createWorkflowEvent("live") as never, step as never)).rejects.toThrow(
      /returned unsupported dependsOn entries for task task-persisted-live-implementation/
    );
    expect(env.TASK_WORKFLOW.create).not.toHaveBeenCalled();
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
    expect(env.TASK_WORKFLOW.create).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          taskId: fixtureTask.taskId,
          project: expect.objectContaining({
            projectId: "project-fixture",
            projectKey: "fixture-demo-project"
          }),
          runtime: "think",
          options: {
            thinkMode: "mock",
            preserveSandbox: false
          }
        })
      })
    );
    expect(result).toMatchObject({
      runId: "run-123",
      taskCount: mocked.fixturePlan.tasks.length,
      decisionPackageId: mocked.fixturePlan.decisionPackageId,
      finalStatus: "archived",
      runSummaryArtifactRefId: "run-summary-artifact"
    });
  });
});
