import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildTaskWorkflowInstanceId } from "../../../src/lib/workflows/ids";

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);
  const runTasks: Array<Record<string, unknown>> = [];
  const dependencies: Array<Record<string, unknown>> = [];
  const artifacts: Array<Record<string, unknown>> = [];
  const runState = {
    runRecord: null as Record<string, unknown> | null,
    compiledPlan: {
      summary: "Fixture compile emitted a two-node DAG.",
      sourceRevisionIds: {
        specification: "spec-rev-1",
        architecture: "arch-rev-1",
        executionPlan: "plan-rev-1"
      },
      tasks: [
        {
          taskId: "task-root",
          runTaskId: "11111111-1111-4111-8111-111111111111",
          title: "Implement the root change",
          summary: "Apply the primary change in the repository.",
          instructions: ["Edit the implementation.", "Run the checks."],
          acceptanceCriteria: ["Root checks pass."],
          dependsOn: [] as string[]
        },
        {
          taskId: "task-child",
          runTaskId: "22222222-2222-4222-8222-222222222222",
          title: "Document the change",
          summary: "Update documentation after the root task completes.",
          instructions: ["Update docs."],
          acceptanceCriteria: ["Docs are updated."],
          dependsOn: ["task-root"]
        }
      ]
    }
  };

  function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  function seedCompiledGraph(plan = runState.compiledPlan) {
    runTasks.length = 0;
    dependencies.length = 0;

    for (const task of plan.tasks) {
      runTasks.push({
        runTaskId: task.runTaskId,
        runId: "run-123",
        name: task.title,
        description: task.summary,
        status: task.dependsOn.length === 0 ? "ready" : "pending",
        conversationAgentClass: null,
        conversationAgentName: null,
        startedAt: null,
        endedAt: null,
        createdAt: new Date("2026-04-19T00:00:00.000Z"),
        updatedAt: new Date("2026-04-19T00:00:00.000Z")
      });
    }

    for (const task of plan.tasks) {
      for (const dependencyId of task.dependsOn) {
        const parent = plan.tasks.find((candidate) => candidate.taskId === dependencyId);

        if (!parent) {
          throw new Error(`Missing dependency ${dependencyId} for task ${task.taskId}.`);
        }

        dependencies.push({
          runTaskDependencyId: crypto.randomUUID(),
          runId: "run-123",
          parentRunTaskId: parent.runTaskId,
          childRunTaskId: task.runTaskId,
          createdAt: new Date("2026-04-19T00:00:00.000Z")
        });
      }
    }
  }

  return {
    artifacts,
    close,
    dependencies,
    runTasks,
    runState,
    seedCompiledGraph,
    compileDemoFixtureRunPlan: vi.fn(async () => {
      seedCompiledGraph();
      return {
        plan: clone(runState.compiledPlan)
      };
    }),
    compileRunPlan: vi.fn(async () => {
      seedCompiledGraph();
      return {
        plan: clone(runState.compiledPlan)
      };
    }),
    createWorkerDatabaseClient: vi.fn(() => ({
      close,
      db: {},
      sql: {}
    })),
    ensureRunRecord: vi.fn(async (_client, input) => {
      const runRecord = {
        tenantId: input.tenantId,
        runId: input.runId,
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
        endedAt: input.endedAt ?? null,
        createdAt: new Date("2026-04-19T00:00:00.000Z"),
        updatedAt: new Date("2026-04-19T00:00:00.000Z")
      };

      runState.runRecord = runRecord;
      return runRecord;
    }),
    ensureRunWorkspace: vi.fn(async () => ({
      workspace: {
        agentBridge: {}
      }
    })),
    failRunAndCancelOutstandingTasks: vi.fn(async (_client, input) => {
      if (!runState.runRecord) {
        throw new Error(`Run ${input.runId} was not found.`);
      }

      const cancelledTasks = runTasks
        .filter((task) => !["completed", "failed", "cancelled"].includes(String(task.status)))
        .map((task) => {
          Object.assign(task, {
            status: "cancelled",
            endedAt: task.endedAt ?? new Date("2026-04-19T00:05:00.000Z")
          });

          return task;
        });

      Object.assign(runState.runRecord, {
        status: "failed",
        endedAt: runState.runRecord.endedAt ?? new Date("2026-04-19T00:05:00.000Z"),
        updatedAt: new Date("2026-04-19T00:05:00.000Z")
      });

      return {
        run: runState.runRecord,
        cancelledTasks
      };
    }),
    finalizeRun: vi.fn(async (env, client, input) => {
      void env;
      void client;
      void input;
      const failedTasks = mocked.runTasks.filter((task) => task.status !== "completed");
      const finalStatus = failedTasks.length === 0 ? "archived" : "failed";

      return {
        finalStatus,
        artifactRef: {
          artifactRefId: "run-summary-1"
        },
        summary: {
          successfulTasks: mocked.runTasks.length - failedTasks.length,
          failedTasks: failedTasks.length,
          tasks: mocked.runTasks
        }
      };
    }),
    getProject: vi.fn(async () => ({
      tenantId: "tenant-fixture",
      projectId: "project-fixture",
      projectKey: "fixture-demo-project",
      displayName: "Fixture Demo Project",
      description: "Fixture project",
      ruleSet: {
        reviewInstructions: [],
        testInstructions: []
      },
      components: [
        {
          componentKey: "demo-target",
          displayName: "Demo Target",
          kind: "git_repository",
          config: {
            localPath: "./fixtures/demo-target",
            ref: "main"
          },
          ruleOverride: null
        }
      ],
      envVars: [],
      createdAt: new Date("2026-04-19T00:00:00.000Z"),
      updatedAt: new Date("2026-04-19T00:00:00.000Z")
    })),
    getRunRecord: vi.fn(async () => runState.runRecord),
    listRunArtifacts: vi.fn(async () => artifacts),
    listRunTaskDependencies: vi.fn(async () => clone(dependencies)),
    listRunTasks: vi.fn(async () => clone(runTasks)),
    loadCompiledRunPlanArtifact: vi.fn(async () => clone(runState.compiledPlan)),
    loadExistingRunPlan: vi.fn(async () => null),
    loadRequiredRunPlanningDocuments: vi.fn(async () => ({
      specification: {
        revisionId: "spec-rev-1",
        document: {
          path: "specification"
        },
        body: "# Run specification"
      },
      architecture: {
        revisionId: "arch-rev-1",
        document: {
          path: "architecture"
        },
        body: "# Run architecture"
      },
      executionPlan: {
        revisionId: "plan-rev-1",
        document: {
          path: "execution-plan"
        },
        body: "# Execution plan"
      }
    })),
    loadTaskHandoffArtifact: vi.fn(async (_env, runTenantId: string, runId: string, runTaskId: string) => {
      const task = runState.compiledPlan.tasks.find((entry) => entry.runTaskId === runTaskId);

      if (!task) {
        throw new Error(`Task handoff missing for ${runTaskId}`);
      }

      return {
        runId,
        runTaskId,
        sourceRevisionIds: runState.compiledPlan.sourceRevisionIds,
        task
      };
    }),
    persistCompiledRunGraph: vi.fn(async (_client, input) => {
      const plan = {
        summary: runState.compiledPlan.summary,
        sourceRevisionIds: {
          specification: input.compiledSpecRevisionId ?? "spec-rev-1",
          architecture: input.compiledArchitectureRevisionId ?? "arch-rev-1",
          executionPlan: input.compiledExecutionPlanRevisionId ?? "plan-rev-1"
        },
        tasks: input.tasks.map((task: Record<string, unknown>) => ({
          taskId: String(task.taskId),
          runTaskId: String(task.runTaskId),
          title: String(task.name),
          summary: String(task.description),
          instructions: ["Instruction"],
          acceptanceCriteria: ["Criterion"],
          dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn : []
        }))
      };

      runState.compiledPlan = plan;
      seedCompiledGraph(plan);

      return {
        run: {
          ...(runState.runRecord ?? {}),
          runId: input.runId
        },
        tasks: plan.tasks.map((task: (typeof plan.tasks)[number]) => ({
          taskId: task.taskId,
          runTaskId: task.runTaskId,
          name: task.title,
          description: task.summary,
          status: task.dependsOn.length === 0 ? "ready" : "pending",
          conversationAgentClass: null,
          conversationAgentName: null,
          startedAt: null,
          endedAt: null
        })),
        dependencies: dependencies.map((dependency) => ({
          runTaskDependencyId: String(dependency.runTaskDependencyId),
          parentTaskId:
            plan.tasks.find((task: (typeof plan.tasks)[number]) => task.runTaskId === dependency.parentRunTaskId)?.taskId ?? "",
          childTaskId:
            plan.tasks.find((task: (typeof plan.tasks)[number]) => task.runTaskId === dependency.childRunTaskId)?.taskId ?? "",
          parentRunTaskId: String(dependency.parentRunTaskId),
          childRunTaskId: String(dependency.childRunTaskId)
        }))
      };
    }),
    reset() {
      artifacts.length = 0;
      runTasks.length = 0;
      dependencies.length = 0;
      runState.runRecord = null;
      runState.compiledPlan = {
        summary: "Fixture compile emitted a two-node DAG.",
        sourceRevisionIds: {
          specification: "spec-rev-1",
          architecture: "arch-rev-1",
          executionPlan: "plan-rev-1"
        },
        tasks: [
          {
            taskId: "task-root",
            runTaskId: "11111111-1111-4111-8111-111111111111",
            title: "Implement the root change",
            summary: "Apply the primary change in the repository.",
            instructions: ["Edit the implementation.", "Run the checks."],
            acceptanceCriteria: ["Root checks pass."],
            dependsOn: [] as string[]
          },
          {
            taskId: "task-child",
            runTaskId: "22222222-2222-4222-8222-222222222222",
            title: "Document the change",
            summary: "Update documentation after the root task completes.",
            instructions: ["Update docs."],
            acceptanceCriteria: ["Docs are updated."],
            dependsOn: ["task-root"]
          }
        ]
      };
    },
    updateRunTask: vi.fn(async (_client, input) => {
      const row = runTasks.find((task) => task.runTaskId === input.runTaskId);

      if (!row) {
        throw new Error(`Run task ${input.runTaskId} was not found.`);
      }

      if (input.ifStatusIn && input.ifStatusIn.length > 0 && !input.ifStatusIn.includes(String(row.status))) {
        return row;
      }

      Object.assign(row, {
        status: input.status ?? row.status,
        startedAt: input.startedAt === undefined ? row.startedAt : input.startedAt,
        endedAt: input.endedAt === undefined ? row.endedAt : input.endedAt,
        conversationAgentClass:
          input.conversationAgentClass === undefined
            ? row.conversationAgentClass
            : input.conversationAgentClass,
        conversationAgentName:
          input.conversationAgentName === undefined
            ? row.conversationAgentName
            : input.conversationAgentName,
        updatedAt: new Date("2026-04-19T00:00:00.000Z")
      });

      return row;
    }),
    updateRunRecord: vi.fn(async (_client, input) => {
      if (!runState.runRecord) {
        throw new Error(`Run ${input.runId} was not found.`);
      }

      Object.assign(runState.runRecord, {
        workflowInstanceId: input.workflowInstanceId ?? runState.runRecord.workflowInstanceId,
        executionEngine: input.executionEngine ?? runState.runRecord.executionEngine,
        sandboxId: input.sandboxId === undefined ? runState.runRecord.sandboxId : input.sandboxId,
        status: input.status ?? runState.runRecord.status,
        compiledSpecRevisionId:
          input.compiledSpecRevisionId === undefined
            ? runState.runRecord.compiledSpecRevisionId
            : input.compiledSpecRevisionId,
        compiledArchitectureRevisionId:
          input.compiledArchitectureRevisionId === undefined
            ? runState.runRecord.compiledArchitectureRevisionId
            : input.compiledArchitectureRevisionId,
        compiledExecutionPlanRevisionId:
          input.compiledExecutionPlanRevisionId === undefined
            ? runState.runRecord.compiledExecutionPlanRevisionId
            : input.compiledExecutionPlanRevisionId,
        compiledAt: input.compiledAt === undefined ? runState.runRecord.compiledAt : input.compiledAt,
        startedAt: input.startedAt === undefined ? runState.runRecord.startedAt : input.startedAt,
        endedAt: input.endedAt === undefined ? runState.runRecord.endedAt : input.endedAt,
        updatedAt: new Date("2026-04-19T00:00:00.000Z")
      });

      return runState.runRecord;
    })
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

vi.mock("../../../src/lib/db/client", () => ({
  createWorkerDatabaseClient: mocked.createWorkerDatabaseClient
}));

vi.mock("../../../src/lib/db/projects", () => ({
  getProject: mocked.getProject
}));

vi.mock("../../../src/lib/documents/runtime", () => ({
  loadRequiredRunPlanningDocuments: mocked.loadRequiredRunPlanningDocuments
}));

vi.mock("../../../src/lib/db/artifacts", () => ({
  listRunArtifacts: mocked.listRunArtifacts
}));

vi.mock("../../../src/lib/db/runs", () => ({
  ensureRunRecord: mocked.ensureRunRecord,
  failRunAndCancelOutstandingTasks: mocked.failRunAndCancelOutstandingTasks,
  getRunRecord: mocked.getRunRecord,
  listRunTaskDependencies: mocked.listRunTaskDependencies,
  listRunTasks: mocked.listRunTasks,
  persistCompiledRunGraph: mocked.persistCompiledRunGraph,
  updateRunRecord: mocked.updateRunRecord,
  updateRunTask: mocked.updateRunTask
}));

vi.mock("../../../src/lib/workflows/idempotency", () => ({
  loadExistingRunPlan: mocked.loadExistingRunPlan
}));

vi.mock("../../../src/lib/workspace/run-workspace", () => ({
  ensureRunWorkspace: mocked.ensureRunWorkspace
}));

vi.mock("../../../src/keystone/compile/plan-run", () => ({
  compileDemoFixtureRunPlan: mocked.compileDemoFixtureRunPlan,
  compileRunPlan: mocked.compileRunPlan
}));

vi.mock("../../../src/keystone/integration/finalize-run", () => ({
  finalizeRun: mocked.finalizeRun
}));

vi.mock("../../../src/keystone/tasks/load-task-contracts", async () => {
  const actual =
    await vi.importActual<typeof import("../../../src/keystone/tasks/load-task-contracts")>(
      "../../../src/keystone/tasks/load-task-contracts"
    );

  return {
    ...actual,
    loadCompiledRunPlanArtifact: mocked.loadCompiledRunPlanArtifact,
    loadTaskHandoffArtifact: mocked.loadTaskHandoffArtifact
  };
});

const { RunWorkflow } = await import("../../../src/workflows/RunWorkflow");

function createStep() {
  return {
    do: vi.fn(async (_name: string, configOrCallback: unknown, maybeCallback?: unknown) => {
      const callback = typeof configOrCallback === "function" ? configOrCallback : maybeCallback;

      if (typeof callback !== "function") {
        throw new Error("Workflow step callback was not provided.");
      }

      return callback({
        attempt: 1
      });
    }),
    sleep: vi.fn(async () => undefined)
  };
}

function createWorkflowEvent() {
  return {
    payload: {
      tenantId: "tenant-fixture",
      runId: "run-123",
      projectId: "project-fixture",
      executionEngine: "scripted" as const
    }
  };
}

type TaskWorkflowOutcome = "complete" | "errored" | "running";
type TaskWorkflowOutcomeScript = TaskWorkflowOutcome | TaskWorkflowOutcome[];
type TaskWorkflowEvent =
  | {
      kind: "createBatch";
      runTaskIds: string[];
    }
  | {
      kind: "status";
      instanceId: string;
      runTaskId?: string;
      workflowStatus: "unknown" | TaskWorkflowOutcome;
    };

function createTaskWorkflowNamespace(outcomes: Record<string, TaskWorkflowOutcomeScript> = {}) {
  const entries = new Map<
    string,
    {
      id: string;
      params: {
        taskId: string;
        runTaskId: string;
      };
    }
  >();
  const events: TaskWorkflowEvent[] = [];
  const statusChecks = new Map<string, number>();
  const createBatch = vi.fn(async (batch: Array<{ id: string; params: { taskId: string; runTaskId: string } }>) => {
    events.push({
      kind: "createBatch",
      runTaskIds: batch.map((entry) => entry.params.runTaskId)
    });

    for (const entry of batch) {
      entries.set(entry.id, entry);

      const runTask = mocked.runTasks.find((task) => task.runTaskId === entry.params.runTaskId);

      if (runTask && runTask.status === "ready") {
        Object.assign(runTask, {
          status: "active",
          startedAt: runTask.startedAt ?? new Date("2026-04-19T00:00:00.000Z")
        });
      }
    }
  });

  const get = vi.fn(async (id: string) => ({
    status: vi.fn(async () => {
      const entry = entries.get(id);

      if (!entry) {
        events.push({
          kind: "status",
          instanceId: id,
          workflowStatus: "unknown"
        });

        return {
          status: "unknown"
        };
      }

      const runTask = mocked.runTasks.find((task) => task.runTaskId === entry.params.runTaskId);

      if (!runTask) {
        throw new Error(`Missing run task ${entry.params.runTaskId}.`);
      }

      const scriptedOutcome = outcomes[entry.params.runTaskId] ?? "complete";
      const outcomeSequence = Array.isArray(scriptedOutcome) ? scriptedOutcome : [scriptedOutcome];
      const statusCheckCount = statusChecks.get(entry.params.runTaskId) ?? 0;
      const outcome = outcomeSequence[Math.min(statusCheckCount, outcomeSequence.length - 1)] ?? "complete";

      statusChecks.set(entry.params.runTaskId, statusCheckCount + 1);

      if (outcome === "running") {
        events.push({
          kind: "status",
          instanceId: id,
          runTaskId: entry.params.runTaskId,
          workflowStatus: "running"
        });
        Object.assign(runTask, {
          status: "active",
          startedAt: runTask.startedAt ?? new Date("2026-04-19T00:00:00.000Z")
        });

        return {
          status: "running"
        };
      }

      if (outcome === "complete") {
        events.push({
          kind: "status",
          instanceId: id,
          runTaskId: entry.params.runTaskId,
          workflowStatus: "complete"
        });
        Object.assign(runTask, {
          status: "completed",
          startedAt: runTask.startedAt ?? new Date("2026-04-19T00:00:00.000Z"),
          endedAt: new Date("2026-04-19T00:05:00.000Z")
        });

        return {
          status: "complete",
          output: {
            taskId: entry.params.taskId,
            runTaskId: entry.params.runTaskId,
            taskSessionId: `task-session-${entry.params.runTaskId}`,
            processStatus: "completed",
            exitCode: 0,
            logArtifactRefId: null,
            workflowStatus: "complete"
          }
        };
      }

      events.push({
        kind: "status",
        instanceId: id,
        runTaskId: entry.params.runTaskId,
        workflowStatus: "errored"
      });
      Object.assign(runTask, {
        status: "failed",
        startedAt: runTask.startedAt ?? new Date("2026-04-19T00:00:00.000Z"),
        endedAt: new Date("2026-04-19T00:05:00.000Z")
      });

      return {
        status: "errored",
        output: {
          taskId: entry.params.taskId,
          runTaskId: entry.params.runTaskId,
          taskSessionId: `task-session-${entry.params.runTaskId}`,
          processStatus: "failed",
          exitCode: 1,
          logArtifactRefId: null,
          workflowStatus: "errored"
        }
      };
    })
  }));

  return {
    createBatch,
    events,
    get
  };
}

function createEnv(taskWorkflow = createTaskWorkflowNamespace()) {
  return {
    HYPERDRIVE: {
      connectionString: "postgres://test"
    } as Hyperdrive,
    TASK_WORKFLOW: taskWorkflow,
    ARTIFACTS_BUCKET: {} as R2Bucket
  };
}

describe("RunWorkflow authoritative DAG scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.reset();
  });

  it("launches ready nodes first and promotes dependents only after their parents complete", async () => {
    const taskWorkflow = createTaskWorkflowNamespace();
    const env = createEnv(taskWorkflow) as never;
    const workflow = new RunWorkflow({} as ExecutionContext, env);
    const step = createStep();

    const result = await workflow.run(createWorkflowEvent() as never, step as never);

    expect(mocked.ensureRunWorkspace).toHaveBeenCalledWith(
      env,
      expect.objectContaining({
        tenantId: "tenant-fixture",
        runId: "run-123",
        sandboxId: "kt-tenant-fixture-run-123-run-123"
      })
    );
    expect(mocked.compileRunPlan).toHaveBeenCalledTimes(1);
    expect(mocked.compileRunPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        runId: "run-123",
        planningDocuments: {
          specification: {
            revisionId: "spec-rev-1",
            path: "specification",
            body: "# Run specification"
          },
          architecture: {
            revisionId: "arch-rev-1",
            path: "architecture",
            body: "# Run architecture"
          },
          executionPlan: {
            revisionId: "plan-rev-1",
            path: "execution-plan",
            body: "# Execution plan"
          }
        }
      })
    );
    const compileRunPlanCalls = mocked.compileRunPlan.mock.calls as unknown as Array<
      [Record<string, unknown>]
    >;
    const compileCall = compileRunPlanCalls[0]?.[0];

    expect(compileCall).not.toHaveProperty("repo");
    expect(taskWorkflow.createBatch).toHaveBeenCalledTimes(2);
    expect(taskWorkflow.createBatch.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        params: expect.objectContaining({
          taskId: "task-root",
          runTaskId: "11111111-1111-4111-8111-111111111111"
        })
      })
    ]);
    expect(taskWorkflow.createBatch.mock.calls[1]?.[0]).toEqual([
      expect.objectContaining({
        params: expect.objectContaining({
          taskId: "task-child",
          runTaskId: "22222222-2222-4222-8222-222222222222"
        })
      })
    ]);
    expect(mocked.updateRunTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        runTaskId: "22222222-2222-4222-8222-222222222222",
        status: "ready",
        ifStatusIn: ["pending"]
      })
    );
    expect(mocked.finalizeRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        runId: "run-123"
      })
    );
    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "11111111-1111-4111-8111-111111111111",
        status: "completed"
      }),
      expect.objectContaining({
        runTaskId: "22222222-2222-4222-8222-222222222222",
        status: "completed"
      })
    ]);
    expect(result).toMatchObject({
      runId: "run-123",
      finalStatus: "archived",
      runSummaryArtifactRefId: "run-summary-1"
    });
  });

  it("launches all independent ready roots in the first scheduler batch", async () => {
    mocked.runState.compiledPlan = {
      summary: "Fixture compile emitted two independent roots.",
      sourceRevisionIds: {
        specification: "spec-rev-1",
        architecture: "arch-rev-1",
        executionPlan: "plan-rev-1"
      },
      tasks: [
        {
          taskId: "task-root-a",
          runTaskId: "aaaaaaaa-1111-4111-8111-111111111111",
          title: "Root task A",
          summary: "First independent task.",
          instructions: ["Do task A."],
          acceptanceCriteria: ["Task A completes."],
          dependsOn: []
        },
        {
          taskId: "task-root-b",
          runTaskId: "bbbbbbbb-2222-4222-8222-222222222222",
          title: "Root task B",
          summary: "Second independent task.",
          instructions: ["Do task B."],
          acceptanceCriteria: ["Task B completes."],
          dependsOn: []
        }
      ]
    };

    const taskWorkflow = createTaskWorkflowNamespace();
    const env = createEnv(taskWorkflow) as never;
    const workflow = new RunWorkflow({} as ExecutionContext, env);
    const step = createStep();

    await workflow.run(createWorkflowEvent() as never, step as never);

    expect(taskWorkflow.createBatch).toHaveBeenCalledTimes(1);
    expect(taskWorkflow.createBatch.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        params: expect.objectContaining({
          taskId: "task-root-a",
          runTaskId: "aaaaaaaa-1111-4111-8111-111111111111"
        })
      }),
      expect.objectContaining({
        params: expect.objectContaining({
          taskId: "task-root-b",
          runTaskId: "bbbbbbbb-2222-4222-8222-222222222222"
        })
      })
    ]);
  });

  it("launches newly ready work while unrelated tasks remain active", async () => {
    mocked.runState.compiledPlan = {
      summary: "Fixture compile emitted active and ready fanout work.",
      sourceRevisionIds: {
        specification: "spec-rev-1",
        architecture: "arch-rev-1",
        executionPlan: "plan-rev-1"
      },
      tasks: [
        {
          taskId: "task-root-a",
          runTaskId: "aaaaaaaa-1111-4111-8111-111111111111",
          title: "Root task A",
          summary: "Long-running independent task.",
          instructions: ["Do task A."],
          acceptanceCriteria: ["Task A completes."],
          dependsOn: []
        },
        {
          taskId: "task-root-b",
          runTaskId: "bbbbbbbb-2222-4222-8222-222222222222",
          title: "Root task B",
          summary: "Independent task that unlocks follow-up work.",
          instructions: ["Do task B."],
          acceptanceCriteria: ["Task B completes."],
          dependsOn: []
        },
        {
          taskId: "task-child-c",
          runTaskId: "cccccccc-3333-4333-8333-333333333333",
          title: "Child task C",
          summary: "Runs after task B completes.",
          instructions: ["Do task C."],
          acceptanceCriteria: ["Task C completes."],
          dependsOn: ["task-root-b"]
        }
      ]
    };

    const taskWorkflow = createTaskWorkflowNamespace({
      "aaaaaaaa-1111-4111-8111-111111111111": ["running", "running", "complete"],
      "bbbbbbbb-2222-4222-8222-222222222222": "complete",
      "cccccccc-3333-4333-8333-333333333333": "complete"
    });
    const env = createEnv(taskWorkflow) as never;
    const workflow = new RunWorkflow({} as ExecutionContext, env);
    const step = createStep();

    await workflow.run(createWorkflowEvent() as never, step as never);

    expect(taskWorkflow.createBatch).toHaveBeenCalledTimes(2);
    expect(taskWorkflow.createBatch.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        params: expect.objectContaining({
          taskId: "task-root-a",
          runTaskId: "aaaaaaaa-1111-4111-8111-111111111111"
        })
      }),
      expect.objectContaining({
        params: expect.objectContaining({
          taskId: "task-root-b",
          runTaskId: "bbbbbbbb-2222-4222-8222-222222222222"
        })
      })
    ]);
    expect(taskWorkflow.createBatch.mock.calls[1]?.[0]).toEqual([
      expect.objectContaining({
        params: expect.objectContaining({
          taskId: "task-child-c",
          runTaskId: "cccccccc-3333-4333-8333-333333333333"
        })
      })
    ]);
    const secondChildLaunchEventIndex = taskWorkflow.events.findIndex(
      (event) =>
        event.kind === "createBatch" &&
        event.runTaskIds.length === 1 &&
        event.runTaskIds[0] === "cccccccc-3333-4333-8333-333333333333"
    );
    expect(secondChildLaunchEventIndex).toBeGreaterThanOrEqual(2);
    expect(taskWorkflow.events.slice(secondChildLaunchEventIndex - 2, secondChildLaunchEventIndex)).toEqual([
      {
        kind: "status",
        instanceId: buildTaskWorkflowInstanceId(
          "tenant-fixture",
          "run-123",
          "aaaaaaaa-1111-4111-8111-111111111111"
        ),
        runTaskId: "aaaaaaaa-1111-4111-8111-111111111111",
        workflowStatus: "running"
      },
      {
        kind: "status",
        instanceId: buildTaskWorkflowInstanceId(
          "tenant-fixture",
          "run-123",
          "cccccccc-3333-4333-8333-333333333333"
        ),
        workflowStatus: "unknown"
      }
    ]);
    expect(mocked.updateRunTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        runTaskId: "cccccccc-3333-4333-8333-333333333333",
        status: "ready",
        ifStatusIn: ["pending"]
      })
    );
  });

  it("cancels blocked dependents after an upstream task fails", async () => {
    const taskWorkflow = createTaskWorkflowNamespace({
      "11111111-1111-4111-8111-111111111111": "errored"
    });
    const env = createEnv(taskWorkflow) as never;
    const workflow = new RunWorkflow({} as ExecutionContext, env);
    const step = createStep();

    await workflow.run(createWorkflowEvent() as never, step as never);

    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "11111111-1111-4111-8111-111111111111",
        status: "failed"
      }),
      expect.objectContaining({
        runTaskId: "22222222-2222-4222-8222-222222222222",
        status: "cancelled"
      })
    ]);
    expect(mocked.updateRunTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        runTaskId: "22222222-2222-4222-8222-222222222222",
        status: "cancelled",
        ifStatusIn: ["pending"]
      })
    );
    expect(mocked.finalizeRun).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        runId: "run-123"
      })
    );
  });

  it("replays a persisted compile artifact by loading task handoffs through runTaskId", async () => {
    mocked.loadExistingRunPlan.mockResolvedValueOnce(JSON.parse(JSON.stringify(mocked.runState.compiledPlan)));
    mocked.artifacts.push(
      {
        artifactRefId: "run-plan-artifact",
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        runId: "run-123",
        runTaskId: null,
        artifactKind: "run_plan",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: "tenants/tenant-fixture/runs/run-123/plan/plan.json",
        objectVersion: null,
        etag: "etag-plan",
        contentType: "application/json; charset=utf-8",
        sha256: null,
        sizeBytes: 256,
        createdAt: new Date("2026-04-19T00:00:00.000Z")
      },
      {
        artifactRefId: "handoff-root",
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        runId: "run-123",
        runTaskId: "11111111-1111-4111-8111-111111111111",
        artifactKind: "task_handoff",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: "root-handoff",
        objectVersion: null,
        etag: "etag-root",
        contentType: "application/json; charset=utf-8",
        sha256: null,
        sizeBytes: 128,
        createdAt: new Date("2026-04-19T00:00:00.000Z")
      },
      {
        artifactRefId: "handoff-child",
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        runId: "run-123",
        runTaskId: "22222222-2222-4222-8222-222222222222",
        artifactKind: "task_handoff",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: "child-handoff",
        objectVersion: null,
        etag: "etag-child",
        contentType: "application/json; charset=utf-8",
        sha256: null,
        sizeBytes: 128,
        createdAt: new Date("2026-04-19T00:00:00.000Z")
      }
    );

    const taskWorkflow = createTaskWorkflowNamespace();
    const env = createEnv(taskWorkflow) as never;
    const workflow = new RunWorkflow({} as ExecutionContext, env);
    const step = createStep();

    await workflow.run(createWorkflowEvent() as never, step as never);

    expect(mocked.compileRunPlan).not.toHaveBeenCalled();
    expect(mocked.persistCompiledRunGraph).toHaveBeenCalledTimes(1);
    expect(mocked.loadTaskHandoffArtifact).toHaveBeenCalledWith(
      expect.anything(),
      "tenant-fixture",
      "run-123",
      "11111111-1111-4111-8111-111111111111"
    );
    expect(mocked.loadTaskHandoffArtifact).toHaveBeenCalledWith(
      expect.anything(),
      "tenant-fixture",
      "run-123",
      "22222222-2222-4222-8222-222222222222"
    );
  });

  it("recompiles when persisted plan revisions no longer match the current run documents", async () => {
    mocked.loadExistingRunPlan.mockResolvedValueOnce({
      ...JSON.parse(JSON.stringify(mocked.runState.compiledPlan)),
      sourceRevisionIds: {
        specification: "spec-rev-stale",
        architecture: "arch-rev-1",
        executionPlan: "plan-rev-1"
      }
    });

    const taskWorkflow = createTaskWorkflowNamespace();
    const env = createEnv(taskWorkflow) as never;
    const workflow = new RunWorkflow({} as ExecutionContext, env);
    const step = createStep();

    await workflow.run(createWorkflowEvent() as never, step as never);

    expect(mocked.compileRunPlan).toHaveBeenCalledTimes(1);
    expect(mocked.compileDemoFixtureRunPlan).not.toHaveBeenCalled();
  });

  it("marks an existing run failed when context loading fails before execution starts", async () => {
    mocked.runState.runRecord = {
      tenantId: "tenant-fixture",
      runId: "run-123",
      projectId: "project-fixture",
      workflowInstanceId: "run-workflow-run-123",
      executionEngine: "scripted",
      sandboxId: "sandbox-run-123",
      status: "configured",
      compiledSpecRevisionId: null,
      compiledArchitectureRevisionId: null,
      compiledExecutionPlanRevisionId: null,
      compiledAt: null,
      startedAt: null,
      endedAt: null,
      createdAt: new Date("2026-04-19T00:00:00.000Z"),
      updatedAt: new Date("2026-04-19T00:00:00.000Z")
    };
    mocked.getProject.mockResolvedValueOnce(undefined as never);

    const taskWorkflow = createTaskWorkflowNamespace();
    const env = createEnv(taskWorkflow) as never;
    const workflow = new RunWorkflow({} as ExecutionContext, env);
    const step = createStep();

    await expect(workflow.run(createWorkflowEvent() as never, step as never)).rejects.toThrow(
      /Project project-fixture was not found/
    );
    expect(mocked.runState.runRecord).toMatchObject({
      status: "failed",
      endedAt: expect.any(Date)
    });
  });

  it("cancels remaining run tasks when a top-level run failure aborts execution", async () => {
    mocked.loadCompiledRunPlanArtifact.mockRejectedValueOnce(new Error("compiled plan missing"));
    mocked.runTasks.splice(
      0,
      mocked.runTasks.length,
      {
        runTaskId: "11111111-1111-4111-8111-111111111111",
        runId: "run-123",
        name: "Implement the root change",
        description: "Apply the primary change in the repository.",
        status: "active",
        conversationAgentClass: null,
        conversationAgentName: null,
        startedAt: new Date("2026-04-19T00:00:00.000Z"),
        endedAt: null,
        createdAt: new Date("2026-04-19T00:00:00.000Z"),
        updatedAt: new Date("2026-04-19T00:00:00.000Z")
      },
      {
        runTaskId: "22222222-2222-4222-8222-222222222222",
        runId: "run-123",
        name: "Document the change",
        description: "Update documentation after the root task completes.",
        status: "ready",
        conversationAgentClass: null,
        conversationAgentName: null,
        startedAt: null,
        endedAt: null,
        createdAt: new Date("2026-04-19T00:00:00.000Z"),
        updatedAt: new Date("2026-04-19T00:00:00.000Z")
      }
    );

    const taskWorkflow = createTaskWorkflowNamespace();
    const env = createEnv(taskWorkflow) as never;
    const workflow = new RunWorkflow({} as ExecutionContext, env);
    const step = createStep();

    await expect(workflow.run(createWorkflowEvent() as never, step as never)).rejects.toThrow(
      /compiled plan missing/
    );
    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "11111111-1111-4111-8111-111111111111",
        status: "cancelled",
        endedAt: expect.any(Date)
      }),
      expect.objectContaining({
        runTaskId: "22222222-2222-4222-8222-222222222222",
        status: "cancelled",
        endedAt: expect.any(Date)
      })
    ]);
    expect(mocked.runState.runRecord).toMatchObject({
      status: "failed",
      endedAt: expect.any(Date)
    });
  });
});
