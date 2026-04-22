import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AgentRuntimeArtifactKind } from "../../../src/lib/artifacts/model";

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);
  const runTasks: Array<Record<string, unknown>> = [];
  const sandboxFiles = new Map<
    string,
    {
      content: string;
      mimeType: string;
      size: number;
    }
  >();
  const taskSession = {
    initialize: vi.fn(async () => undefined),
    ensureWorkspace: vi.fn(async (input: { env?: Record<string, string> }) => ({
      sandboxId: "sandbox-123",
      workspace: {
        workspaceId: "workspace-123",
        strategy: "worktree",
        defaultComponentKey: "repo",
        repoUrl: "fixture://demo-target",
        repoRef: "main",
        baseRef: "main",
        workspaceRoot: "/workspace/runs/run-123",
        workspaceTargetPath: "/workspace/runs/run-123/tasks/task-live-implementation-run-task",
        codeRoot: "/workspace/runs/run-123/tasks/task-live-implementation-run-task/code",
        defaultCwd: "/workspace/runs/run-123/tasks/task-live-implementation-run-task/code/repo",
        repositoryPath: "/workspace/runs/run-123/repositories/repo",
        worktreePath: "/workspace/runs/run-123/tasks/task-live-implementation-run-task/code/repo",
        branchName: "keystone/task-live-implementation-run-task",
        headSha: "abc123",
        components: [
          {
            componentKey: "repo",
            worktreePath: "/workspace/runs/run-123/tasks/task-live-implementation-run-task/code/repo",
            branchName: "keystone/task-live-implementation-run-task",
            baseRef: "main",
            repoUrl: "fixture://demo-target",
            repoRef: "main",
            repositoryPath: "/workspace/runs/run-123/repositories/repo",
            headSha: "abc123"
          }
        ],
        agentBridge: {
          layout: {
            workspaceRoot: "/workspace",
            artifactsInRoot: "/artifacts/in",
            artifactsOutRoot: "/artifacts/out",
            keystoneRoot: "/keystone"
          },
          targets: {
            workspaceRoot: "/workspace/runs/run-123/tasks/task-live-implementation-run-task",
            artifactsInRoot: "/artifacts/in",
            artifactsOutRoot: "/artifacts/out",
            keystoneRoot: "/keystone"
          },
          readOnlyRoots: ["/artifacts/in", "/keystone"],
          writableRoots: ["/workspace", "/artifacts/out"],
          environment: input.env,
          controlFiles: {
            session: "/keystone/session.json",
            filesystem: "/keystone/filesystem.json",
            artifacts: "/keystone/artifacts.json"
          },
          projectedArtifacts: []
        }
      }
    })),
    preserveForInspection: vi.fn(async () => undefined),
    teardown: vi.fn(async () => undefined)
  };

  return {
    close,
    runTasks,
    taskSession,
    buildStableSessionId: vi.fn(async (prefix: string, _tenantId: string, _runId: string, taskId: string) => {
      if (prefix === "task-session") {
        return `task-session-${taskId}`;
      }

      return "stable-session-id";
    }),
    createArtifactRef: vi.fn(async (_client, input) => ({
      artifactRefId: "artifact-run-note-1",
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
      createdAt: new Date("2026-04-19T00:00:00.000Z")
    })),
    createThinkSmokePlan: vi.fn(() => [{ step: "one" }, { step: "two" }]),
    createWorkerDatabaseClient: vi.fn(() => ({
      close,
      db: {},
      sql: {}
    })),
    decodeArtifactBody: vi.fn((content: string) => content),
    ensureSandboxSession: vi.fn(async () => ({
      session: {}
    })),
    findArtifactRefByObjectKey: vi.fn(async () => null),
    getArtifactBytes: vi.fn(async () => null),
    getAgentByName: vi.fn(async () => ({
      runImplementerTurn: mocked.runImplementerTurn
    })),
    getProject: vi.fn(async () => ({
      tenantId: "tenant-fixture",
      projectId: "project-fixture",
      projectKey: "fixture-demo-project",
      displayName: "Fixture Demo Project",
      description: "Fixture project",
      ruleSet: {
        reviewInstructions: ["Summarize the implementation result before handoff."],
        testInstructions: ["Run the fixture demo tests before completing the task."]
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
          ruleOverride: {
            reviewInstructions: ["Focus on app code paths."],
            testInstructions: ["Run demo-target tests first."]
          }
        }
      ],
      envVars: [
        {
          name: "KEYSTONE_FIXTURE_PROJECT",
          value: "1"
        }
      ],
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    })),
    getRunTask: vi.fn(async (_client, input) => {
      return runTasks.find((task) => task.runTaskId === input.runTaskId) ?? null;
    }),
    getTaskSessionStub: vi.fn(() => taskSession),
    handoff: {
      runId: "run-123",
      runTaskId: "run-task-123",
      sourceRevisionIds: {
        specification: "spec-rev-1",
        architecture: "arch-rev-1",
        executionPlan: "plan-rev-1"
      },
      task: {
        taskId: "task-live-implementation",
        runTaskId: "run-task-123",
        title: "Adjust the greeting implementation",
        summary: "Use the compiled handoff as the Think task input.",
        instructions: ["Edit the greeting implementation.", "Run the relevant checks."],
        acceptanceCriteria: ["Relevant checks pass."],
        dependsOn: [] as string[]
      }
    },
    loadTaskHandoffArtifact: vi.fn(async () => null),
    putArtifactBytes: vi.fn(async (_bucket, _namespace, key) => ({
      storageBackend: "r2",
      storageUri: `r2://keystone-artifacts-dev/${key}`,
      key,
      etag: "etag-1",
      sizeBytes: 50
    })),
    readSandboxAgentFile: vi.fn(async (_bridge, requestedPath: string) => {
      const file = sandboxFiles.get(requestedPath) ?? {
        content: "# Run Note\n\nImplemented the approved change.\n",
        mimeType: "text/markdown; charset=utf-8",
        size: 50
      };

      return {
        content: file.content,
        encoding: "utf-8" as const,
        mimeType: file.mimeType,
        isBinary: false,
        size: file.size
      };
    }),
    reset() {
      runTasks.length = 0;
      sandboxFiles.clear();
      taskSession.initialize.mockClear();
      taskSession.ensureWorkspace.mockClear();
      taskSession.preserveForInspection.mockClear();
      taskSession.teardown.mockClear();
      sandboxFiles.set("/artifacts/out/compiled-handoff-note.md", {
        content: "# Run Note\n\nImplemented the approved change.\n",
        mimeType: "text/markdown; charset=utf-8",
        size: 50
      });
      runTasks.push({
        runTaskId: "run-task-123",
        runId: "run-123",
        name: "Adjust the greeting implementation",
        description: "Use the compiled handoff as the Think task input.",
        status: "pending",
        conversationAgentClass: null,
        conversationAgentName: null,
        startedAt: null,
        endedAt: null,
        createdAt: new Date("2026-04-19T00:00:00.000Z"),
        updatedAt: new Date("2026-04-19T00:00:00.000Z")
      });
      this.loadTaskHandoffArtifact.mockResolvedValue(JSON.parse(JSON.stringify(this.handoff)));
      this.runImplementerTurn.mockResolvedValue({
        outcome: "completed",
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
      });
    },
    setSandboxFile(
      filePath: string,
      content: string,
      mimeType: string = "text/plain; charset=utf-8"
    ) {
      sandboxFiles.set(filePath, {
        content,
        mimeType,
        size: content.length
      });
    },
    runImplementerTurn: vi.fn(async (): Promise<{
      outcome: "completed" | "failed" | "cancelled";
      stagedArtifacts: Array<{
        path: string;
        kind: AgentRuntimeArtifactKind;
        contentType: string;
        metadata?: Record<string, string>;
      }>;
      events: unknown[];
      summary: string | null;
      metadata: Record<string, string>;
    }> => ({
      outcome: "completed",
      stagedArtifacts: [],
      events: [],
      summary: null,
      metadata: {}
    })),
    updateRunTask: vi.fn(async (_client, input) => {
      const row = runTasks.find((task) => task.runTaskId === input.runTaskId);

      if (!row) {
        throw new Error(`Run task ${input.runTaskId} was not found.`);
      }

      Object.assign(row, {
        name: input.name ?? row.name,
        description: input.description ?? row.description,
        status: input.status ?? row.status,
        conversationAgentClass:
          input.conversationAgentClass === undefined
            ? row.conversationAgentClass
            : input.conversationAgentClass,
        conversationAgentName:
          input.conversationAgentName === undefined
            ? row.conversationAgentName
            : input.conversationAgentName,
        startedAt: input.startedAt === undefined ? row.startedAt : input.startedAt,
        endedAt: input.endedAt === undefined ? row.endedAt : input.endedAt,
        updatedAt: new Date("2026-04-19T00:00:00.000Z")
      });

      return row;
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

vi.mock("agents", () => ({
  getAgentByName: mocked.getAgentByName
}));

vi.mock("../../../src/lib/auth/tenant", () => ({
  getTaskSessionStub: mocked.getTaskSessionStub
}));

vi.mock("../../../src/lib/db/client", () => ({
  createWorkerDatabaseClient: mocked.createWorkerDatabaseClient
}));

vi.mock("../../../src/lib/db/projects", () => ({
  getProject: mocked.getProject
}));

vi.mock("../../../src/lib/db/runs", () => ({
  getRunTask: mocked.getRunTask,
  updateRunTask: mocked.updateRunTask
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

vi.mock("../../../src/keystone/agents/implementer/ImplementerAgent", () => ({
  createThinkSmokePlan: mocked.createThinkSmokePlan
}));

vi.mock("../../../src/keystone/agents/tools/filesystem", () => ({
  readSandboxAgentFile: mocked.readSandboxAgentFile
}));

vi.mock("../../../src/lib/sandbox/client", () => ({
  ensureSandboxSession: mocked.ensureSandboxSession
}));

vi.mock("../../../src/lib/artifacts/r2", () => ({
  getArtifactBytes: mocked.getArtifactBytes,
  putArtifactBytes: mocked.putArtifactBytes,
  decodeArtifactBody: mocked.decodeArtifactBody,
  toR2Uri: vi.fn((bucketName: string, key: string) => `r2://${bucketName}/${key}`)
}));

vi.mock("../../../src/lib/db/artifacts", () => ({
  createArtifactRef: mocked.createArtifactRef,
  findArtifactRefByObjectKey: mocked.findArtifactRefByObjectKey
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
  agentBridge: {
    environment?: Record<string, string> | undefined;
    targets: {
      workspaceRoot: string;
    };
  };
  mockModelPlan?: unknown[] | undefined;
};

type WorkflowProjectSummary = {
  projectId: string;
  projectKey: string;
  displayName: string;
};

const fixtureProjectSummary: WorkflowProjectSummary = {
  projectId: "project-fixture",
  projectKey: "fixture-demo-project",
  displayName: "Fixture Demo Project"
};

function createSingleTargetProjectRecord() {
  return {
    tenantId: "tenant-fixture",
    projectId: "project-live",
    projectKey: "acme-live-project",
    displayName: "Acme Live Project",
    description: "Single-target project for live Think execution.",
    ruleSet: {
      reviewInstructions: ["Summarize the implementation outcome."],
      testInstructions: ["Run the Acme app tests before handoff."]
    },
    components: [
      {
        componentKey: "repo",
        displayName: "Acme App",
        kind: "git_repository",
        config: {
          localPath: "./projects/acme-app",
          ref: "main"
        },
        ruleOverride: {
          reviewInstructions: ["Focus on Acme app code paths."],
          testInstructions: ["Run Acme app checks first."]
        }
      }
    ],
    envVars: [
      {
        name: "KEYSTONE_PROJECT_MODE",
        value: "live"
      }
    ],
    createdAt: new Date("2026-04-20T00:00:00.000Z"),
    updatedAt: new Date("2026-04-20T00:00:00.000Z")
  };
}

function toProjectSummary(project: WorkflowProjectSummary): WorkflowProjectSummary {
  return {
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName
  };
}

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

function createWorkflowEvent(
  executionEngine: "think_live" | "think_mock",
  project: WorkflowProjectSummary = fixtureProjectSummary
) {
  return {
    payload: {
      tenantId: "tenant-fixture",
      runId: "run-123",
      sandboxId: "sandbox-123",
      taskId: mocked.handoff.task.taskId,
      runTaskId: mocked.handoff.runTaskId,
      executionEngine,
      preserveSandbox: false,
      project
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
    mocked.reset();
  });

  it("runs a live compiled handoff through Think and promotes artifacts under the runTaskId path", async () => {
    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();
    const result = await workflow.run(createWorkflowEvent("think_live") as never, step as never);
    const calls =
      mocked.runImplementerTurn.mock.calls as unknown as Array<[RunImplementerTurnCall]>;
    const call = calls[0]?.[0];

    expect(mocked.getTaskSessionStub).toHaveBeenCalledWith(
      expect.anything(),
      "tenant-fixture",
      "run-123",
      "task-session-run-task-123",
      "run-task-123"
    );
    expect(call).toMatchObject({
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-run-task-123",
      taskId: "task-live-implementation",
      sandboxId: "sandbox-123",
        agentBridge: {
          targets: {
            workspaceRoot: "/workspace/runs/run-123/tasks/task-live-implementation-run-task"
          },
        environment: {
          KEYSTONE_FIXTURE_PROJECT: "1"
        }
      }
    });
    expect(call?.prompt).toContain("Run task ID: run-task-123");
    expect(call?.prompt).toContain("Project: Fixture Demo Project (fixture-demo-project)");
    expect(call?.prompt).toContain("Projected run planning documents, run_plan, and task_handoff artifacts");
    expect(mocked.createArtifactRef).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        runId: "run-123",
        runTaskId: "run-task-123",
        artifactKind: "run_note",
        bucket: "keystone-artifacts-dev",
        objectKey:
          "tenants/tenant-fixture/runs/run-123/tasks/run-task-123/artifacts/compiled-handoff-note.md"
      })
    );
    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "run-task-123",
        status: "completed",
        conversationAgentClass: "KeystoneThinkAgent",
        conversationAgentName: "tenant:tenant-fixture:run:run-123:task:task-session-run-task-123",
        startedAt: expect.any(Date),
        endedAt: expect.any(Date)
      })
    ]);
    expect(result).toMatchObject({
      taskId: "task-live-implementation",
      runTaskId: "run-task-123",
      processStatus: "completed",
      exitCode: 0,
      workflowStatus: "complete"
    });
  });

  it("promotes non-markdown Think artifacts as staged_output under the runTaskId path", async () => {
    mocked.setSandboxFile(
      "/artifacts/out/result.json",
      '{ "status": "ok" }\n',
      "application/json; charset=utf-8"
    );
    mocked.runImplementerTurn.mockResolvedValueOnce({
      outcome: "completed",
      stagedArtifacts: [
        {
          path: "/artifacts/out/compiled-handoff-note.md",
          kind: "run_note",
          contentType: "text/markdown; charset=utf-8",
          metadata: {
            fileName: "compiled-handoff-note.md"
          }
        },
        {
          path: "/artifacts/out/result.json",
          kind: "staged_output",
          contentType: "application/json; charset=utf-8",
          metadata: {
            fileName: "result.json"
          }
        }
      ],
      events: [],
      summary: "Implemented the change and staged structured output.",
      metadata: {}
    });

    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();

    await workflow.run(createWorkflowEvent("think_live") as never, step as never);

    expect(mocked.createArtifactRef).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        runId: "run-123",
        runTaskId: "run-task-123",
        artifactKind: "staged_output",
        bucket: "keystone-artifacts-dev",
        objectKey: "tenants/tenant-fixture/runs/run-123/tasks/run-task-123/artifacts/result.json",
        contentType: "application/json; charset=utf-8"
      })
    );
    expect(mocked.readSandboxAgentFile).toHaveBeenCalledWith(
      expect.any(Object),
      "/artifacts/out/result.json"
    );
  });

  it("rejects unsupported staged artifact kinds from Think before promotion", async () => {
    mocked.runImplementerTurn.mockResolvedValueOnce({
      outcome: "completed",
      stagedArtifacts: [
        {
          path: "/artifacts/out/run-summary.json",
          kind: "run_summary" as never,
          contentType: "application/json; charset=utf-8",
          metadata: {
            fileName: "run-summary.json"
          }
        }
      ],
      events: [],
      summary: "Tried to stage an invalid task artifact.",
      metadata: {}
    });

    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();

    await expect(
      workflow.run(createWorkflowEvent("think_live") as never, step as never)
    ).rejects.toThrow(/agent runtime artifact kind run_summary/i);

    expect(mocked.createArtifactRef).not.toHaveBeenCalled();
    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "run-task-123",
        status: "failed",
        startedAt: expect.any(Date),
        endedAt: expect.any(Date)
      })
    ]);
  });

  it("validates all staged artifact kinds before writing any promoted artifact", async () => {
    mocked.runImplementerTurn.mockResolvedValueOnce({
      outcome: "completed",
      stagedArtifacts: [
        {
          path: "/artifacts/out/compiled-handoff-note.md",
          kind: "run_note",
          contentType: "text/markdown; charset=utf-8",
          metadata: {
            fileName: "compiled-handoff-note.md"
          }
        },
        {
          path: "/artifacts/out/run-summary.json",
          kind: "run_summary" as never,
          contentType: "application/json; charset=utf-8",
          metadata: {
            fileName: "run-summary.json"
          }
        }
      ],
      events: [],
      summary: "Mixed valid and invalid task artifacts.",
      metadata: {}
    });

    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();

    await expect(
      workflow.run(createWorkflowEvent("think_live") as never, step as never)
    ).rejects.toThrow(/agent runtime artifact kind run_summary/i);

    expect(mocked.getArtifactBytes).not.toHaveBeenCalled();
    expect(mocked.readSandboxAgentFile).not.toHaveBeenCalled();
    expect(mocked.putArtifactBytes).not.toHaveBeenCalled();
    expect(mocked.createArtifactRef).not.toHaveBeenCalled();
    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "run-task-123",
        status: "failed",
        startedAt: expect.any(Date),
        endedAt: expect.any(Date)
      })
    ]);
  });

  it("keeps think/mock deterministic for the fixture-scoped path", async () => {
    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();

    await workflow.run(createWorkflowEvent("think_mock") as never, step as never);

    const calls =
      mocked.runImplementerTurn.mock.calls as unknown as Array<[RunImplementerTurnCall]>;
    const call = calls[0]?.[0];

    expect(Array.isArray(call?.mockModelPlan)).toBe(true);
    expect(call?.mockModelPlan).toHaveLength(2);
  });

  it("runs a live compiled handoff for a non-fixture single-target project", async () => {
    const project = createSingleTargetProjectRecord();
    mocked.getProject.mockResolvedValueOnce(project);

    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();
    const result = await workflow.run(
      createWorkflowEvent("think_live", toProjectSummary(project)) as never,
      step as never
    );
    const calls =
      mocked.runImplementerTurn.mock.calls as unknown as Array<[RunImplementerTurnCall]>;
    const call = calls[0]?.[0];

    expect(mocked.taskSession.ensureWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        components: [
          expect.objectContaining({
            type: "git",
            repoUrl: "./projects/acme-app"
          })
        ],
        env: {
          KEYSTONE_PROJECT_MODE: "live"
        }
      })
    );
    expect(call?.prompt).toContain("Project: Acme Live Project (acme-live-project)");
    expect(call?.agentBridge.environment).toEqual({
      KEYSTONE_PROJECT_MODE: "live"
    });
    expect(call?.mockModelPlan).toBeUndefined();
    expect(result).toMatchObject({
      runTaskId: "run-task-123",
      processStatus: "completed",
      exitCode: 0,
      workflowStatus: "complete"
    });
  });

  it("keeps think/mock fixture-only outside the demo target", async () => {
    const project = createSingleTargetProjectRecord();
    mocked.getProject.mockResolvedValueOnce(project);

    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();

    await expect(
      workflow.run(
        createWorkflowEvent("think_mock", toProjectSummary(project)) as never,
        step as never
      )
    ).rejects.toThrow(/mock Think runtime currently supports only fixture-scoped/i);

    expect(mocked.runImplementerTurn).not.toHaveBeenCalled();
    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "run-task-123",
        status: "failed",
        conversationAgentClass: "KeystoneThinkAgent",
        conversationAgentName: "tenant:tenant-fixture:run:run-123:task:task-session-run-task-123",
        startedAt: expect.any(Date),
        endedAt: expect.any(Date)
      })
    ]);
  });

  it("marks the authoritative task failed when Think returns a non-success outcome", async () => {
    mocked.runImplementerTurn.mockResolvedValueOnce({
      outcome: "cancelled",
      stagedArtifacts: [],
      events: [],
      summary: "Execution was cancelled.",
      metadata: {}
    });

    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();
    const result = await workflow.run(createWorkflowEvent("think_live") as never, step as never);

    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "run-task-123",
        status: "cancelled",
        conversationAgentClass: "KeystoneThinkAgent",
        conversationAgentName: "tenant:tenant-fixture:run:run-123:task:task-session-run-task-123",
        startedAt: expect.any(Date),
        endedAt: expect.any(Date)
      })
    ]);
    expect(mocked.taskSession.teardown).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      runTaskId: "run-task-123",
      processStatus: "cancelled",
      exitCode: 1,
      workflowStatus: "cancelled"
    });
  });

  it("tears down and marks the task failed when workspace setup fails before activation", async () => {
    mocked.taskSession.ensureWorkspace.mockRejectedValueOnce(new Error("workspace setup failed"));

    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();

    await expect(workflow.run(createWorkflowEvent("think_live") as never, step as never)).rejects.toThrow(
      /workspace setup failed/
    );
    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "run-task-123",
        status: "failed",
        conversationAgentClass: "KeystoneThinkAgent",
        conversationAgentName: "tenant:tenant-fixture:run:run-123:task:task-session-run-task-123",
        startedAt: expect.any(Date),
        endedAt: expect.any(Date)
      })
    ]);
    expect(mocked.taskSession.teardown).toHaveBeenCalledTimes(1);
  });

  it("allows dependent live handoffs on non-fixture single-target projects", async () => {
    const project = createSingleTargetProjectRecord();
    mocked.getProject.mockResolvedValueOnce(project);
    mocked.handoff.task.dependsOn = ["task-other"];
    mocked.loadTaskHandoffArtifact.mockResolvedValue(JSON.parse(JSON.stringify(mocked.handoff)));

    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();

    const result = await workflow.run(
      createWorkflowEvent("think_live", toProjectSummary(project)) as never,
      step as never
    );
    const calls =
      mocked.runImplementerTurn.mock.calls as unknown as Array<[RunImplementerTurnCall]>;
    const call = calls[0]?.[0];

    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "run-task-123",
        status: "completed",
        conversationAgentClass: "KeystoneThinkAgent",
        conversationAgentName: "tenant:tenant-fixture:run:run-123:task:task-session-run-task-123",
        startedAt: expect.any(Date),
        endedAt: expect.any(Date)
      })
    ]);
    expect(mocked.taskSession.teardown).toHaveBeenCalledTimes(1);
    expect(call?.prompt).toContain("Depends on: task-other");
    expect(call?.mockModelPlan).toBeUndefined();
    expect(result).toMatchObject({
      runTaskId: "run-task-123",
      processStatus: "completed",
      exitCode: 0,
      workflowStatus: "complete"
    });
  });
});
