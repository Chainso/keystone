import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);
  const runTasks: Array<Record<string, unknown>> = [];
  const artifacts: Array<Record<string, unknown>> = [];
  const taskSession = {
    initialize: vi.fn(async () => undefined),
    ensureWorkspace: vi.fn(async () => ({
      sandboxId: "sandbox-123",
      workspace: {
        workspaceId: "workspace-run-123",
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
          environment: {
            KEYSTONE_FIXTURE_PROJECT: "1"
          },
          controlFiles: {
            session: "/keystone/session.json",
            filesystem: "/keystone/filesystem.json",
            artifacts: "/keystone/artifacts.json"
          },
          projectedArtifacts: []
        }
      }
    })),
    startProcess: vi.fn(async () => ({
      processId: "task-process:task-session-run-task-123",
      command: "npm test",
      status: "running" as const
    })),
    pollProcess: vi.fn(async () => ({
      activeProcess: {
        processId: "task-process:task-session-run-task-123",
        command: "npm test",
        status: "completed" as const,
        startedAt: "2026-04-19T00:00:00.000Z",
        endedAt: "2026-04-19T00:05:00.000Z",
        exitCode: 0
      }
    })),
    getProcessLogs: vi.fn(async (): Promise<{
      processId: string;
      stdout: string;
      stderr: string;
    } | null> => ({
      processId: "task-process:task-session-run-task-123",
      stdout: "ok\n",
      stderr: ""
    })),
    preserveForInspection: vi.fn(async () => undefined),
    teardown: vi.fn(async () => undefined)
  };

  return {
    artifacts,
    close,
    runTasks,
    taskSession,
    buildStableSessionId: vi.fn(async (prefix: string, _tenantId: string, _runId: string, taskId: string) => {
      if (prefix === "task-session") {
        return `task-session-${taskId}`;
      }

      return "stable-session-id";
    }),
    createArtifactRef: vi.fn(async (_client, input) => {
      const artifactRef = {
        artifactRefId: `artifact-${artifacts.length + 1}`,
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
      };

      artifacts.push(artifactRef);
      return artifactRef;
    }),
    createWorkerDatabaseClient: vi.fn(() => ({
      close,
      db: {},
      sql: {}
    })),
    findArtifactRefByObjectKey: vi.fn(async (_client, input) => {
      return (
        artifacts.find(
          (artifact) =>
            artifact.bucket === input.bucket &&
            artifact.objectKey === input.objectKey &&
            artifact.runId === input.runId &&
            artifact.runTaskId === (input.runTaskId ?? null) &&
            artifact.artifactKind === input.artifactKind
        ) ?? null
      );
    }),
    getArtifactBytes: vi.fn(async () => null),
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
        summary: "Use the compiled handoff as the scripted task input.",
        instructions: ["Edit the greeting implementation.", "Run the relevant checks."],
        acceptanceCriteria: ["Relevant checks pass."],
        dependsOn: [] as string[]
      }
    },
    loadTaskHandoffArtifact: vi.fn(async () => null),
    putArtifactBytes: vi.fn(async (_bucket, _namespace, key, body) => ({
      storageBackend: "r2" as const,
      storageUri: `r2://keystone-artifacts-dev/${key}`,
      key,
      etag: "etag-1",
      sizeBytes: typeof body === "string" ? body.length : 0
    })),
    reset() {
      artifacts.length = 0;
      runTasks.length = 0;
      taskSession.initialize.mockClear();
      taskSession.ensureWorkspace.mockClear();
      taskSession.startProcess.mockClear();
      taskSession.pollProcess.mockClear();
      taskSession.getProcessLogs.mockClear();
      taskSession.getProcessLogs.mockResolvedValue({
        processId: "task-process:task-session-run-task-123",
        stdout: "ok\n",
        stderr: ""
      });
      taskSession.teardown.mockClear();
      taskSession.preserveForInspection.mockClear();
      runTasks.push({
        runTaskId: "run-task-123",
        runId: "run-123",
        name: "Adjust the greeting implementation",
        description: "Use the compiled handoff as the scripted task input.",
        status: "pending",
        conversationAgentClass: null,
        conversationAgentName: null,
        startedAt: null,
        endedAt: null,
        createdAt: new Date("2026-04-19T00:00:00.000Z"),
        updatedAt: new Date("2026-04-19T00:00:00.000Z")
      });
      this.loadTaskHandoffArtifact.mockResolvedValue(JSON.parse(JSON.stringify(this.handoff)));
    },
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
  getAgentByName: vi.fn(async () => {
    throw new Error("Think agent should not be loaded during scripted task tests.");
  })
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
  createThinkSmokePlan: vi.fn(() => [])
}));

vi.mock("../../../src/keystone/agents/tools/filesystem", () => ({
  readSandboxAgentFile: vi.fn(async () => {
    throw new Error("Sandbox artifact reads should not occur during scripted task tests.");
  })
}));

vi.mock("../../../src/lib/sandbox/client", () => ({
  ensureSandboxSession: vi.fn(async () => {
    throw new Error("Sandbox session promotion should not occur during scripted task tests.");
  })
}));

vi.mock("../../../src/lib/artifacts/r2", () => ({
  getArtifactBytes: mocked.getArtifactBytes,
  putArtifactBytes: mocked.putArtifactBytes,
  decodeArtifactBody: vi.fn((content: string) => content),
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
      sandboxId: "sandbox-123",
      taskId: mocked.handoff.task.taskId,
      runTaskId: mocked.handoff.runTaskId,
      executionEngine: "scripted" as const,
      preserveSandbox: false,
      project: {
        projectId: "project-fixture",
        projectKey: "fixture-demo-project",
        displayName: "Fixture Demo Project"
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

describe("TaskWorkflow scripted runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.reset();
  });

  it("runs the authoritative run task and persists task logs under the runTaskId path", async () => {
    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();
    const result = await workflow.run(createWorkflowEvent() as never, step as never);

    expect(mocked.taskSession.startProcess).toHaveBeenCalledWith({
      command: "npm test",
      cwd: "/workspace/runs/run-123/tasks/task-live-implementation-run-task/code/repo",
      env: {
        KEYSTONE_FIXTURE_PROJECT: "1"
      }
    });
    expect(mocked.getTaskSessionStub).toHaveBeenCalledWith(
      expect.anything(),
      "tenant-fixture",
      "run-123",
      "task-session-run-task-123",
      "run-task-123"
    );
    expect(mocked.createArtifactRef).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        runId: "run-123",
        runTaskId: "run-task-123",
        artifactKind: "task_log",
        bucket: "keystone-artifacts-dev",
        objectKey:
          "tenants/tenant-fixture/runs/run-123/tasks/run-task-123/logs/task-process%3Atask-session-run-task-123.jsonl"
      })
    );
    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "run-task-123",
        status: "completed",
        conversationAgentClass: null,
        conversationAgentName: null,
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

  it("rejects scripted execution for multi-component projects instead of running from the shared task root", async () => {
    mocked.getProject.mockResolvedValueOnce({
      tenantId: "tenant-fixture",
      projectId: "project-multi-target",
      projectKey: "acme-multi-target-project",
      displayName: "Acme Multi-Target Project",
      description: "Two-component scripted project.",
      ruleSet: {
        reviewInstructions: [],
        testInstructions: []
      },
      components: [
        {
          componentKey: "web",
          displayName: "Acme Web",
          kind: "git_repository",
          config: {
            localPath: "./projects/acme-web",
            ref: "main"
          },
          ruleOverride: null
        },
        {
          componentKey: "worker",
          displayName: "Acme Worker",
          kind: "git_repository",
          config: {
            localPath: "./projects/acme-worker",
            ref: "main"
          },
          ruleOverride: null
        }
      ],
      envVars: [
        {
          name: "KEYSTONE_PROJECT_MODE",
          value: "multi-target"
        }
      ],
      createdAt: new Date("2026-04-20T00:00:00.000Z"),
      updatedAt: new Date("2026-04-20T00:00:00.000Z")
    });
    mocked.taskSession.ensureWorkspace.mockResolvedValueOnce({
      sandboxId: "sandbox-123",
      workspace: {
        workspaceId: "workspace-run-123",
        strategy: "worktree",
        defaultComponentKey: "web",
        repoUrl: "./projects/acme-web",
        repoRef: "main",
        baseRef: "main",
        workspaceRoot: "/workspace/runs/run-123",
        workspaceTargetPath: "/workspace/runs/run-123/tasks/task-live-implementation-run-task",
        codeRoot: "/workspace/runs/run-123/tasks/task-live-implementation-run-task/code",
        defaultCwd: "/workspace/runs/run-123/tasks/task-live-implementation-run-task/code",
        repositoryPath: "/workspace/runs/run-123/repositories/web",
        worktreePath: "/workspace/runs/run-123/tasks/task-live-implementation-run-task/code/web",
        branchName: "keystone/task-live-implementation-run-task",
        headSha: "abc123",
        components: [
          {
            componentKey: "web",
            worktreePath: "/workspace/runs/run-123/tasks/task-live-implementation-run-task/code/web",
            branchName: "keystone/task-live-implementation-run-task",
            baseRef: "main",
            repoUrl: "./projects/acme-web",
            repoRef: "main",
            repositoryPath: "/workspace/runs/run-123/repositories/web",
            headSha: "abc123"
          },
          {
            componentKey: "worker",
            worktreePath: "/workspace/runs/run-123/tasks/task-live-implementation-run-task/code/worker",
            branchName: "keystone/task-live-implementation-run-task",
            baseRef: "main",
            repoUrl: "./projects/acme-worker",
            repoRef: "main",
            repositoryPath: "/workspace/runs/run-123/repositories/worker",
            headSha: "def456"
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
          environment: {
            KEYSTONE_PROJECT_MODE: "multi-target"
          },
          controlFiles: {
            session: "/keystone/session.json",
            filesystem: "/keystone/filesystem.json",
            artifacts: "/keystone/artifacts.json"
          },
          projectedArtifacts: []
        }
      }
    } as never);

    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();

    await expect(workflow.run(createWorkflowEvent() as never, step as never)).rejects.toThrow(
      /scripted execution engine currently supports only projects with exactly one materialized component/i
    );

    expect(mocked.taskSession.ensureWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        components: [
          expect.objectContaining({
            componentKey: "web",
            repoUrl: "./projects/acme-web"
          }),
          expect.objectContaining({
            componentKey: "worker",
            repoUrl: "./projects/acme-worker"
          })
        ],
        env: {
          KEYSTONE_PROJECT_MODE: "multi-target"
        }
      })
    );
    expect(mocked.taskSession.startProcess).not.toHaveBeenCalled();
    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "run-task-123",
        status: "failed",
        startedAt: expect.any(Date),
        endedAt: expect.any(Date)
      })
    ]);
  });

  it("persists an empty task-log artifact when live logs are unavailable", async () => {
    mocked.taskSession.getProcessLogs.mockResolvedValueOnce(null);

    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();

    await workflow.run(createWorkflowEvent() as never, step as never);

    expect(mocked.putArtifactBytes).toHaveBeenCalledWith(
      expect.anything(),
      "keystone-artifacts-dev",
      "tenants/tenant-fixture/runs/run-123/tasks/run-task-123/logs/task-process%3Atask-session-run-task-123.jsonl",
      "",
      expect.any(Object)
    );
    expect(mocked.createArtifactRef).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        runTaskId: "run-task-123"
      })
    );
  });

  it("marks the authoritative task failed when the scripted process exits non-zero", async () => {
    mocked.taskSession.pollProcess.mockResolvedValueOnce({
      activeProcess: {
        processId: "task-process:task-session-run-task-123",
        command: "npm test",
        status: "completed" as const,
        startedAt: "2026-04-19T00:00:00.000Z",
        endedAt: "2026-04-19T00:05:00.000Z",
        exitCode: 1
      }
    });

    const workflow = new TaskWorkflow({} as ExecutionContext, createEnv() as never);
    const step = createStep();
    const result = await workflow.run(createWorkflowEvent() as never, step as never);

    expect(mocked.runTasks).toEqual([
      expect.objectContaining({
        runTaskId: "run-task-123",
        status: "failed",
        startedAt: expect.any(Date),
        endedAt: expect.any(Date)
      })
    ]);
    expect(mocked.taskSession.teardown).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      runTaskId: "run-task-123",
      processStatus: "completed",
      exitCode: 1,
      workflowStatus: "errored"
    });
  });
});
