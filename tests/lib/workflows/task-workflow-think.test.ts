import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);
  const runImplementerTurn = vi.fn(async () => ({
    outcome: "completed" as const,
    stagedArtifacts: [
      {
        path: "/artifacts/out/compiled-handoff-note.md",
        kind: "run_note",
        contentType: "text/markdown; charset=utf-8",
        metadata: {
          fileName: "compiled-handoff-note.md"
        }
      }
    ],
    events: [],
    summary: "Implemented the compiled handoff.",
    metadata: {
      modelId: "gpt-5.4"
    }
  }));
  const handoff = {
    runId: "run-123",
    decisionPackageId: "demo-greeting-update",
    task: {
      taskId: "task-live-implementation",
      title: "Adjust the greeting implementation",
      summary: "Use the compiled handoff as the Think task input.",
      instructions: ["Edit the greeting implementation.", "Run the relevant checks."],
      acceptanceCriteria: ["Relevant checks pass."],
      dependsOn: [] as string[]
    }
  };
  const bridge = {
    layout: {
      workspaceRoot: "/workspace",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    targets: {
      workspaceRoot: "/workspace/runs/run-123/tasks/task-live-implementation",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    readOnlyRoots: ["/artifacts/in", "/keystone"],
    writableRoots: ["/workspace", "/artifacts/out"],
    controlFiles: {
      session: "/keystone/session.json",
      filesystem: "/keystone/filesystem.json",
      artifacts: "/keystone/artifacts.json"
    },
    projectedArtifacts: []
  };

  return {
    close,
    bridge,
    handoff,
    runImplementerTurn,
    loadTaskHandoffArtifact: vi.fn(async () => JSON.parse(JSON.stringify(handoff))),
    getTaskSessionStub: vi.fn(() => ({
      initialize: vi.fn(async () => undefined),
      ensureWorkspace: vi.fn(async () => ({
        sandboxId: "sandbox-123",
        workspace: {
          workspaceId: "workspace-123",
          worktreePath: "/workspace/runs/run-123/tasks/task-live-implementation",
          agentBridge: JSON.parse(JSON.stringify(bridge))
        }
      })),
      preserveForInspection: vi.fn(async () => undefined),
      teardown: vi.fn(async () => undefined)
    })),
    getAgentByName: vi.fn(async () => ({
      runImplementerTurn
    })),
    createWorkerDatabaseClient: vi.fn(() => ({
      close,
      db: {},
      sql: {}
    })),
    appendAndPublishRunEvent: vi.fn(async () => ({
      eventId: crypto.randomUUID(),
      ts: new Date("2026-04-17T00:00:00.000Z")
    })),
    readSandboxAgentFile: vi.fn(async () => ({
      content: "# Compiled Handoff\n\nImplemented the approved change.\n",
      encoding: "utf-8" as const,
      mimeType: "text/markdown; charset=utf-8",
      isBinary: false,
      size: 50
    })),
    ensureSandboxSession: vi.fn(async () => ({
      session: {}
    })),
    putArtifactBytes: vi.fn(async (_bucket, _namespace, key) => ({
      storageBackend: "r2",
      storageUri: `r2://keystone-artifacts-dev/${key}`,
      key,
      etag: "etag-1",
      sizeBytes: 50
    })),
    decodeArtifactBody: vi.fn(() => "compiled-handoff-note"),
    findArtifactRefByStorageUri: vi.fn(async () => null),
    createArtifactRef: vi.fn(async (_client, input) => ({
      artifactRefId: "artifact-run-note-1",
      tenantId: input.tenantId,
      runId: input.runId,
      sessionId: input.sessionId,
      taskId: input.taskId,
      kind: input.kind,
      storageBackend: input.storageBackend,
      storageUri: input.storageUri,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes ?? null,
      metadata: input.metadata ?? null,
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    })),
    findArtifactRefByStorageUriCalls: [] as Array<Record<string, unknown>>,
    buildStableSessionId: vi.fn(async () => "task-session-123")
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

vi.mock("agents", () => ({
  getAgentByName: mocked.getAgentByName
}));

vi.mock("../../../src/lib/auth/tenant", () => ({
  getTaskSessionStub: mocked.getTaskSessionStub
}));

vi.mock("../../../src/lib/db/client", () => ({
  createWorkerDatabaseClient: mocked.createWorkerDatabaseClient
}));

vi.mock("../../../src/lib/events/publish", () => ({
  appendAndPublishRunEvent: mocked.appendAndPublishRunEvent
}));

vi.mock("../../../src/keystone/tasks/load-task-contracts", async () => {
  const actual =
    await vi.importActual<typeof import("../../../src/keystone/tasks/load-task-contracts")>(
      "../../../src/keystone/tasks/load-task-contracts"
    );

  return {
    ...actual,
    loadTaskHandoffArtifact: mocked.loadTaskHandoffArtifact
  };
});

vi.mock("../../../src/keystone/agents/tools/filesystem", () => ({
  readSandboxAgentFile: mocked.readSandboxAgentFile
}));

vi.mock("../../../src/lib/sandbox/client", () => ({
  ensureSandboxSession: mocked.ensureSandboxSession
}));

vi.mock("../../../src/lib/artifacts/r2", () => ({
  putArtifactBytes: mocked.putArtifactBytes,
  decodeArtifactBody: mocked.decodeArtifactBody
}));

vi.mock("../../../src/lib/db/artifacts", () => ({
  createArtifactRef: mocked.createArtifactRef,
  findArtifactRefByStorageUri: mocked.findArtifactRefByStorageUri
}));

vi.mock("../../../src/lib/workflows/ids", async () => {
  const actual =
    await vi.importActual<typeof import("../../../src/lib/workflows/ids")>(
      "../../../src/lib/workflows/ids"
    );

  return {
    ...actual,
    buildStableSessionId: mocked.buildStableSessionId
  };
});

const { TaskWorkflow } = await import("../../../src/workflows/TaskWorkflow");

type RunImplementerTurnCall = {
  tenantId: string;
  runId: string;
  sessionId: string;
  taskId: string;
  sandboxId: string;
  prompt: string;
  mockModelPlan?: unknown[] | undefined;
};

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
    sleep: vi.fn(async () => undefined)
  };
}

function createWorkflowEvent(thinkMode: "live" | "mock") {
  return {
    payload: {
      tenantId: "tenant-fixture",
      runId: "run-123",
      runSessionId: "run-session-123",
      taskId: mocked.handoff.task.taskId,
      runtime: "think" as const,
      options: {
        thinkMode,
        preserveSandbox: false
      },
      repo: {
        source: "localPath" as const,
        localPath: "./fixtures/demo-target",
        ref: "main"
      }
    }
  };
}

function createEnv() {
  return {
    ARTIFACTS_BUCKET: {} as R2Bucket,
    HYPERDRIVE: {
      connectionString: "postgres://test"
    } as Hyperdrive,
    TASK_SESSION: {} as DurableObjectNamespace,
    SANDBOX: {} as DurableObjectNamespace,
    KEYSTONE_THINK_AGENT: {} as DurableObjectNamespace
  };
}

describe("TaskWorkflow Think runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.handoff.task.dependsOn = [];
    mocked.loadTaskHandoffArtifact.mockResolvedValue(JSON.parse(JSON.stringify(mocked.handoff)));
    mocked.getAgentByName.mockResolvedValue({
      runImplementerTurn: mocked.runImplementerTurn
    });
    mocked.findArtifactRefByStorageUri.mockResolvedValue(null);
  });

  it("runs a live compiled handoff through the Think implementer path and promotes a run_note", async () => {
    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();
    const result = await workflow.run(createWorkflowEvent("live") as never, step as never);
    const calls =
      mocked.runImplementerTurn.mock.calls as unknown as Array<[RunImplementerTurnCall]>;
    const call = calls[0]?.[0];

    expect(mocked.runImplementerTurn).toHaveBeenCalledTimes(1);
    expect(call).toMatchObject({
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-123",
      taskId: "task-live-implementation",
      sandboxId: "sandbox-123"
    });
    expect(call?.mockModelPlan).toBeUndefined();
    expect(call?.prompt).toContain("Decision package: demo-greeting-update");
    expect(call?.prompt).toContain("Task ID: task-live-implementation");
    expect(call?.prompt).toContain("Depends on: none");
    expect(call?.prompt).toContain("Projected decision_package, run_plan, and task_handoff artifacts");
    expect(mocked.createArtifactRef).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        runId: "run-123",
        sessionId: "task-session-123",
        taskId: "task-live-implementation",
        kind: "run_note",
        metadata: expect.objectContaining({
          fileName: "compiled-handoff-note.md",
          stagedPath: "/artifacts/out/compiled-handoff-note.md"
        })
      })
    );
    expect(result).toMatchObject({
      taskId: "task-live-implementation",
      taskSessionId: "task-session-123",
      processStatus: "completed",
      exitCode: 0,
      workflowStatus: "complete"
    });
  });

  it("keeps think/mock deterministic for the fixture-scoped handoff path", async () => {
    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();

    await workflow.run(createWorkflowEvent("mock") as never, step as never);

    const calls =
      mocked.runImplementerTurn.mock.calls as unknown as Array<[RunImplementerTurnCall]>;
    const call = calls[0]?.[0];

    expect(mocked.runImplementerTurn).toHaveBeenCalledTimes(1);
    expect(Array.isArray(call?.mockModelPlan)).toBe(true);
    expect(call?.mockModelPlan).toHaveLength(2);
  });

  it("rejects dependent live handoffs until the fixture-scoped happy path widens", async () => {
    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();

    mocked.loadTaskHandoffArtifact.mockResolvedValue({
      ...JSON.parse(JSON.stringify(mocked.handoff)),
      task: {
        ...JSON.parse(JSON.stringify(mocked.handoff.task)),
        dependsOn: ["task-prep"]
      }
    });

    await expect(workflow.run(createWorkflowEvent("live") as never, step as never)).rejects.toThrow(
      /currently supports only independent fixture-scoped compiled demo handoffs/
    );
    expect(mocked.runImplementerTurn).not.toHaveBeenCalled();
  });
});
