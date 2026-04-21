import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRunSandboxId } from "../../src/lib/workspace/worktree";

function buildRunningProcess(processId = "process-123") {
  return {
    id: processId,
    command: "npm test",
    status: "running" as const,
    startTime: new Date("2026-04-19T00:00:00.000Z"),
    endTime: undefined,
    exitCode: undefined
  };
}

function buildCompletedProcess(processId = "process-123") {
  return {
    id: processId,
    command: "npm test",
    status: "completed" as const,
    startTime: new Date("2026-04-19T00:00:00.000Z"),
    endTime: new Date("2026-04-19T00:05:00.000Z"),
    exitCode: 1,
    getLogs: vi.fn(async () => ({
      stdout: "ok\n",
      stderr: "warn\n"
    })),
    getStatus: vi.fn(async () => "completed" as const)
  };
}

vi.mock("cloudflare:workers", () => {
  class DurableObject<Env = unknown> {
    protected ctx: DurableObjectState;
    protected env: Env;

    constructor(ctx: DurableObjectState, env: Env) {
      this.ctx = ctx;
      this.env = env;
    }
  }

  return {
    DurableObject
  };
});

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);
  const killProcess = vi.fn(async () => undefined);
  const deleteSession = vi.fn(async () => undefined);
  const startProcess = vi.fn(async () => buildRunningProcess());
  const getProcess = vi.fn(async (processId?: string) => {
    if (processId === "task-process:task-session-123" && startProcess.mock.calls.length > 0) {
      return buildRunningProcess();
    }

    return null;
  });

  return {
    close,
    deleteSession,
    getArtifactBytes: vi.fn(async () => null),
    getProcess,
    listArtifactsForSandboxProjection: vi.fn(async () => []),
    killProcess,
    startProcess,
    createWorkerDatabaseClient: vi.fn(() => ({
      close,
      db: {},
      sql: {}
    })),
    ensureWorkspaceMaterialized: vi.fn(async () => ({
      workspaceId: "workspace-run-123",
      strategy: "worktree",
      defaultComponentKey: "repo",
      repoUrl: "fixture://demo-target",
      repoRef: "main",
      baseRef: "main",
      workspaceRoot: "/workspace/runs/run-123",
      workspaceTargetPath: "/workspace/runs/run-123/tasks/task-1-run-task",
      codeRoot: "/workspace/runs/run-123/tasks/task-1-run-task/code",
      defaultCwd: "/workspace/runs/run-123/tasks/task-1-run-task/code/repo",
      repositoryPath: "/workspace/runs/run-123/repositories/repo",
      worktreePath: "/workspace/runs/run-123/tasks/task-1-run-task/code/repo",
      branchName: "keystone/task-1-run-task",
      headSha: "abc123",
      components: [
        {
          componentKey: "repo",
          worktreePath: "/workspace/runs/run-123/tasks/task-1-run-task/code/repo",
          branchName: "keystone/task-1-run-task",
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
          workspaceRoot: "/workspace/runs/run-123/tasks/task-1-run-task",
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
    })),
    materializeSandboxAgentBridge: vi.fn(async (_session, input) => ({
      layout: {
        workspaceRoot: "/workspace",
        artifactsInRoot: "/artifacts/in",
        artifactsOutRoot: "/artifacts/out",
        keystoneRoot: "/keystone"
      },
      targets: {
        workspaceRoot: "/workspace/runs/run-123/tasks/task-1-run-task",
        artifactsInRoot: "/artifacts/in",
        artifactsOutRoot: "/artifacts/out",
        keystoneRoot: "/keystone"
      },
      readOnlyRoots: ["/artifacts/in", "/keystone"],
      writableRoots: ["/workspace", "/artifacts/out"],
      environment: input.environment,
      controlFiles: {
        session: "/keystone/session.json",
        filesystem: "/keystone/filesystem.json",
        artifacts: "/keystone/artifacts.json"
      },
      projectedArtifacts: input.artifacts ?? []
    })),
    ensureSandboxSession: vi.fn(async () => ({
      session: {
        getProcess,
        startProcess
      }
    }))
  };
});

vi.mock("../../src/lib/db/client", () => ({
  createWorkerDatabaseClient: mocked.createWorkerDatabaseClient
}));

vi.mock("../../src/lib/sandbox/client", () => ({
  ensureSandboxSession: mocked.ensureSandboxSession,
  getSandboxClient: vi.fn(() => ({
    killProcess: mocked.killProcess,
    deleteSession: mocked.deleteSession,
    destroy: vi.fn(async () => undefined)
  }))
}));

vi.mock("../../src/lib/workspace/init", () => ({
  ensureWorkspaceMaterialized: mocked.ensureWorkspaceMaterialized,
  materializeSandboxAgentBridge: mocked.materializeSandboxAgentBridge
}));

vi.mock("../../src/lib/db/artifacts", () => ({
  listArtifactsForSandboxProjection: mocked.listArtifactsForSandboxProjection,
  getArtifactStorageUri: vi.fn(() => "r2://keystone-artifacts-dev/example")
}));

vi.mock("../../src/lib/artifacts/r2", () => ({
  getArtifactBytes: mocked.getArtifactBytes,
  isTextArtifactContentType: vi.fn(() => true)
}));

const { TaskSessionDO } = await import("../../src/durable-objects/TaskSessionDO");

class MemoryStorage {
  private values = new Map<string, unknown>();

  async get<T>(key: string) {
    return (this.values.get(key) as T | undefined) ?? undefined;
  }

  async put(key: string, value: unknown) {
    this.values.set(key, value);
  }
}

class FakeDurableObjectState {
  storage = new MemoryStorage();
  ready = Promise.resolve();

  blockConcurrencyWhile<T>(callback: () => Promise<T>) {
    this.ready = Promise.resolve(callback()).then(() => undefined);
    return this.ready;
  }
}

function seedTaskSession(
  taskSession: InstanceType<typeof TaskSessionDO>,
  state: FakeDurableObjectState,
  value: Record<string, unknown>
) {
  (taskSession as unknown as { stateSnapshot: Record<string, unknown> }).stateSnapshot = value;

  return state.storage.put("task-session-state", value);
}

describe("TaskSessionDO", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.startProcess.mockImplementation(async () => buildRunningProcess());
    mocked.listArtifactsForSandboxProjection.mockResolvedValue([]);
    mocked.getArtifactBytes.mockResolvedValue(null);
    mocked.getProcess.mockImplementation(async (processId?: string) => {
      if (processId === "task-process:task-session-123" && mocked.startProcess.mock.calls.length > 0) {
        return buildRunningProcess();
      }

      return null;
    });
  });

  it("materializes a run-owned workspace with a task-specific target path", async () => {
    const state = new FakeDurableObjectState();
    const taskSession = new TaskSessionDO(state as never, {} as never);
    await state.ready;

    await taskSession.initialize({
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-123",
      taskId: "task-1",
      runTaskId: "run-task-123"
    });

    const snapshot = await taskSession.ensureWorkspace({
      components: [
        {
          type: "inline",
          componentKey: "repo",
          repoUrl: "fixture://demo-target",
          repoRef: "main",
          baseRef: "main",
          files: []
        }
      ],
      env: {
        KEYSTONE_FIXTURE_PROJECT: "1"
      }
    });

    expect(mocked.ensureWorkspaceMaterialized).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        runId: "run-123",
        taskId: "task-1",
        runTaskId: "run-task-123"
      })
    );
    expect(mocked.listArtifactsForSandboxProjection).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        runId: "run-123",
        excludeRunTaskId: "run-task-123"
      })
    );
    expect(snapshot.workspace).toMatchObject({
      workspaceId: "workspace-run-123",
      workspaceRoot: "/workspace/runs/run-123",
      workspaceTargetPath: "/workspace/runs/run-123/tasks/task-1-run-task",
      codeRoot: "/workspace/runs/run-123/tasks/task-1-run-task/code",
      defaultCwd: "/workspace/runs/run-123/tasks/task-1-run-task/code/repo",
      worktreePath: "/workspace/runs/run-123/tasks/task-1-run-task/code/repo"
    });
    expect(snapshot.sandboxId).toBe(buildRunSandboxId("tenant-fixture", "run-123"));
  });

  it("reuses an existing tracked process instead of starting a second sandbox process", async () => {
    const state = new FakeDurableObjectState();
    const taskSession = new TaskSessionDO(state as never, {} as never);
    await state.ready;

    mocked.getProcess.mockImplementation(async (processId?: string) => {
      if (processId === "process-123") {
        return buildRunningProcess("process-123");
      }

      return null;
    });

    await seedTaskSession(taskSession, state, {
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-123",
      taskId: "task-1",
      runTaskId: "run-task-123",
      sandboxId: "sandbox-123",
      workspace: {
        defaultCwd: "/workspace/runs/run-123/tasks/task-1-run-task/code/repo",
        agentBridge: {
          environment: {
            KEYSTONE_FIXTURE_PROJECT: "1"
          }
        }
      }
    });

    const first = await taskSession.startProcess({
      command: "npm test",
      env: {
        KEYSTONE_FIXTURE_PROJECT: "1"
      }
    });

    expect(mocked.startProcess).toHaveBeenCalledTimes(1);
    expect(mocked.startProcess).toHaveBeenCalledWith("npm test", {
      cwd: "/workspace/runs/run-123/tasks/task-1-run-task/code/repo",
      env: {
        KEYSTONE_FIXTURE_PROJECT: "1"
      },
      processId: "task-process:task-session-123"
    });

    const persistedState = await state.storage.get<{
      activeProcess?: {
        logCursor?: {
          stdoutBytes: number;
          stderrBytes: number;
        };
        terminalEventRecorded?: boolean;
      };
    }>("task-session-state");

    await state.storage.put("task-session-state", {
      ...(persistedState ?? {}),
      activeProcess: {
        ...(persistedState?.activeProcess ?? {}),
        logCursor: {
          stdoutBytes: 3,
          stderrBytes: 1
        },
        terminalEventRecorded: true
      }
    });

    mocked.getProcess.mockClear();
    mocked.startProcess.mockClear();

    const reloadedTaskSession = new TaskSessionDO(state as never, {} as never);
    await state.ready;
    const second = await reloadedTaskSession.startProcess({
      command: "npm test",
      env: {
        KEYSTONE_FIXTURE_PROJECT: "1"
      }
    });

    expect(mocked.startProcess).not.toHaveBeenCalled();
    expect(mocked.getProcess).toHaveBeenCalledTimes(1);
    expect(mocked.getProcess).toHaveBeenCalledWith("process-123");
    expect(second).toEqual({
      ...first,
      logCursor: {
        stdoutBytes: 3,
        stderrBytes: 1
      },
      terminalEventRecorded: true
    });
  });

  it("reattaches to a deterministic sandbox process when no active snapshot is stored", async () => {
    const state = new FakeDurableObjectState();
    const taskSession = new TaskSessionDO(state as never, {} as never);
    await state.ready;

    mocked.getProcess.mockImplementation(async (processId?: string) => {
      if (processId === "task-process:task-session-123") {
        return buildRunningProcess("process-123");
      }

      return null;
    });

    await seedTaskSession(taskSession, state, {
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-123",
      taskId: "task-1",
      runTaskId: "run-task-123",
      sandboxId: "sandbox-123",
      workspace: {
        defaultCwd: "/workspace/runs/run-123/tasks/task-1-run-task/code/repo",
        agentBridge: {
          environment: {
            KEYSTONE_FIXTURE_PROJECT: "1"
          }
        }
      }
    });

    const process = await taskSession.startProcess({
      command: "npm test",
      env: {
        KEYSTONE_FIXTURE_PROJECT: "1"
      }
    });

    expect(mocked.startProcess).not.toHaveBeenCalled();
    expect(mocked.getProcess).toHaveBeenCalledWith("task-process:task-session-123");
    expect(process).toMatchObject({
      processId: "process-123",
      command: "npm test"
    });
  });

  it("preserves cursor state when it falls back from a missing tracked process to the deterministic id", async () => {
    const state = new FakeDurableObjectState();
    const taskSession = new TaskSessionDO(state as never, {} as never);
    await state.ready;

    mocked.getProcess.mockImplementation(async (processId?: string) => {
      if (processId === "process-123") {
        return null;
      }

      if (processId === "task-process:task-session-123") {
        return buildRunningProcess("task-process:task-session-123");
      }

      return null;
    });

    await seedTaskSession(taskSession, state, {
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-123",
      taskId: "task-1",
      runTaskId: "run-task-123",
      sandboxId: "sandbox-123",
      workspace: {
        defaultCwd: "/workspace/runs/run-123/tasks/task-1-run-task/code/repo",
        agentBridge: {
          environment: {
            KEYSTONE_FIXTURE_PROJECT: "1"
          }
        }
      },
      activeProcess: {
        processId: "process-123",
        command: "npm test",
        status: "running",
        startedAt: "2026-04-19T00:00:00.000Z",
        logCursor: {
          stdoutBytes: 7,
          stderrBytes: 3
        },
        terminalEventRecorded: true
      }
    });

    const process = await taskSession.startProcess({
      command: "npm test"
    });

    expect(process).toMatchObject({
      processId: "task-process:task-session-123",
      logCursor: {
        stdoutBytes: 7,
        stderrBytes: 3
      },
      terminalEventRecorded: true
    });
    expect(mocked.startProcess).not.toHaveBeenCalled();
  });

  it("rejects reattaching a deterministic sandbox process that is running a different command", async () => {
    const state = new FakeDurableObjectState();
    const taskSession = new TaskSessionDO(state as never, {} as never);
    await state.ready;

    mocked.getProcess.mockImplementation(async (processId?: string) => {
      if (processId === "task-process:task-session-123") {
        return {
          ...buildRunningProcess("task-process:task-session-123"),
          command: "npm lint"
        };
      }

      return null;
    });

    await seedTaskSession(taskSession, state, {
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-123",
      taskId: "task-1",
      runTaskId: "run-task-123",
      sandboxId: "sandbox-123",
      workspace: {
        defaultCwd: "/workspace/runs/run-123/tasks/task-1-run-task/code/repo",
        agentBridge: {
          environment: {
            KEYSTONE_FIXTURE_PROJECT: "1"
          }
        }
      }
    });

    await expect(
      taskSession.startProcess({
        command: "npm test"
      })
    ).rejects.toThrow(/refusing to attach it to npm test/);
  });

  it("clears stale tracked process state and starts a new attempt when the live process is gone", async () => {
    const state = new FakeDurableObjectState();
    const taskSession = new TaskSessionDO(state as never, {} as never);
    await state.ready;

    mocked.getProcess.mockResolvedValue(null as never);

    await seedTaskSession(taskSession, state, {
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-123",
      taskId: "task-1",
      runTaskId: "run-task-123",
      sandboxId: "sandbox-123",
      workspace: {
        defaultCwd: "/workspace/runs/run-123/tasks/task-1-run-task/code/repo",
        agentBridge: {
          environment: {
            KEYSTONE_FIXTURE_PROJECT: "1"
          }
        }
      },
      activeProcess: {
        processId: "process-123",
        command: "npm test",
        status: "running",
        startedAt: "2026-04-19T00:00:00.000Z",
        logCursor: {
          stdoutBytes: 4,
          stderrBytes: 1
        },
        terminalEventRecorded: false
      }
    });

    const nextProcess = await taskSession.startProcess({
      command: "npm test"
    });

    expect(mocked.startProcess).toHaveBeenCalledTimes(1);
    expect(nextProcess).toMatchObject({
      processId: "process-123",
      status: "running"
    });
  });

  it("polls process logs and marks terminal processes as recorded", async () => {
    const state = new FakeDurableObjectState();
    const taskSession = new TaskSessionDO(state as never, {} as never);
    await state.ready;

    mocked.getProcess.mockImplementation((async (processId?: string) => {
      if (processId === "process-123") {
        return buildCompletedProcess("process-123");
      }

      return null;
    }) as never);

    await seedTaskSession(taskSession, state, {
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-123",
      taskId: "task-1",
      runTaskId: "run-task-123",
      sandboxId: "sandbox-123",
      activeProcess: {
        processId: "process-123",
        command: "npm test",
        status: "running",
        startedAt: "2026-04-19T00:00:00.000Z",
        logCursor: {
          stdoutBytes: 0,
          stderrBytes: 0
        },
        terminalEventRecorded: false
      }
    });

    const snapshot = await taskSession.pollProcess();

    expect(snapshot.activeProcess).toMatchObject({
      processId: "process-123",
      status: "completed",
      exitCode: 1,
      terminalEventRecorded: true,
      logCursor: {
        stdoutBytes: 3,
        stderrBytes: 5
      }
    });
  });

  it("preserves and tears down the sandbox session through the live sandbox client", async () => {
    const state = new FakeDurableObjectState();
    const taskSession = new TaskSessionDO(state as never, {} as never);
    await state.ready;

    await seedTaskSession(taskSession, state, {
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-123",
      taskId: "task-1",
      runTaskId: "run-task-123",
      sandboxId: "sandbox-123",
      activeProcess: {
        processId: "process-123",
        command: "npm test",
        status: "running",
        startedAt: "2026-04-19T00:00:00.000Z",
        logCursor: {
          stdoutBytes: 0,
          stderrBytes: 0
        },
        terminalEventRecorded: false
      }
    });

    const preserved = await taskSession.preserveForInspection();
    expect(preserved.lastPolledAt).toEqual(expect.any(String));

    const tornDown = await taskSession.teardown();
    expect(mocked.killProcess).toHaveBeenCalledWith(
      "process-123",
      "SIGTERM",
      "task-session-123"
    );
    expect(mocked.deleteSession).toHaveBeenCalledWith("task-session-123");
    expect(tornDown.lastPolledAt).toEqual(expect.any(String));
    expect(tornDown.workspace).toBeUndefined();
    expect(tornDown.activeProcess).toBeUndefined();
    await expect(
      state.storage.get<{
        workspace?: unknown;
        activeProcess?: unknown;
      }>("task-session-state")
    ).resolves.toMatchObject({
      workspace: undefined,
      activeProcess: undefined
    });
  });
});
