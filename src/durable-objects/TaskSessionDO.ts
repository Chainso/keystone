import { DurableObject } from "cloudflare:workers";

import type { WorkerBindings } from "../env";
import type { SessionStatus } from "../maestro/contracts";
import { createWorkerDatabaseClient } from "../lib/db/client";
import { createWorkspaceBinding, getWorkspaceBindingForSession } from "../lib/db/workspaces";
import { appendAndPublishRunEvent } from "../lib/events/publish";
import {
  applyProcessLogDelta,
  createProcessSnapshot,
  isTerminalProcessStatus,
  type ProcessSnapshot
} from "../lib/sandbox/processes";
import { ensureSandboxSession, getSandboxClient } from "../lib/sandbox/client";
import { createSessionRecord, getSessionRecord, updateSessionStatus } from "../lib/db/runs";
import { buildSandboxId } from "../lib/workspace/worktree";
import {
  ensureWorkspaceMaterialized,
  type MaterializedWorkspace,
  type WorkspaceSource
} from "../lib/workspace/init";

type TaskSessionState = {
  tenantId: string;
  runId: string;
  sessionId: string;
  taskId: string;
  parentSessionId?: string | null | undefined;
  sandboxId: string;
  workspace?: MaterializedWorkspace | undefined;
  activeProcess?: ProcessSnapshot | undefined;
  lastPolledAt?: string | undefined;
};

type InitializeTaskSessionInput = {
  tenantId: string;
  runId: string;
  sessionId: string;
  taskId: string;
  parentSessionId?: string | null | undefined;
  sandboxId?: string | undefined;
};

type EnsureWorkspaceInput = {
  source: WorkspaceSource;
};

type StartProcessInput = {
  command: string;
  cwd?: string | undefined;
  env?: Record<string, string | undefined> | undefined;
  processId?: string | undefined;
};

const STATE_STORAGE_KEY = "task-session-state";

export class TaskSessionDO extends DurableObject<WorkerBindings> {
  private stateSnapshot: TaskSessionState | null = null;

  constructor(ctx: DurableObjectState, env: WorkerBindings) {
    super(ctx, env);

    ctx.blockConcurrencyWhile(async () => {
      this.stateSnapshot = (await this.ctx.storage.get<TaskSessionState>(STATE_STORAGE_KEY)) ?? null;
    });
  }

  async initialize(input: InitializeTaskSessionInput) {
    if (!this.stateSnapshot) {
      this.stateSnapshot = {
        tenantId: input.tenantId,
        runId: input.runId,
        sessionId: input.sessionId,
        taskId: input.taskId,
        parentSessionId: input.parentSessionId ?? null,
        sandboxId:
          input.sandboxId ?? buildSandboxId(input.tenantId, input.runId, input.sessionId)
      };
      await this.persistState();
    }

    return this.requireState();
  }

  async ensureWorkspace(input: EnsureWorkspaceInput) {
    const snapshot = this.requireState();
    const client = createWorkerDatabaseClient(this.env);

    try {
      let session = await getSessionRecord(client, snapshot.tenantId, snapshot.sessionId);

      if (!session) {
        session = await createSessionRecord(
          client,
          {
            tenantId: snapshot.tenantId,
            runId: snapshot.runId,
            sessionType: "task",
            parentSessionId: snapshot.parentSessionId ?? null,
            metadata: {
              taskId: snapshot.taskId,
              sandboxId: snapshot.sandboxId
            }
          },
          {
            sessionId: snapshot.sessionId
          }
        );
      }

      if (!session) {
        throw new Error("Task session record could not be created.");
      }

      if (session.status === "configured") {
        session = await updateSessionStatus(client, {
          tenantId: snapshot.tenantId,
          sessionId: snapshot.sessionId,
          status: "provisioning",
          metadata: {
            ...session.metadata,
            taskId: snapshot.taskId,
            sandboxId: snapshot.sandboxId
          }
        });
      }

      if (!session) {
        throw new Error("Task session provisioning could not load a durable session row.");
      }

      const { session: sandboxSession } = await ensureSandboxSession({
        env: this.env,
        sandboxId: snapshot.sandboxId,
        sessionId: snapshot.sessionId
      });
      const workspace = await ensureWorkspaceMaterialized(sandboxSession, {
        runId: snapshot.runId,
        sessionId: snapshot.sessionId,
        taskId: snapshot.taskId,
        source: input.source
      });

      const binding = await getWorkspaceBindingForSession(client, {
        tenantId: snapshot.tenantId,
        sessionId: snapshot.sessionId
      });

      if (!binding) {
        await createWorkspaceBinding(client, {
          tenantId: snapshot.tenantId,
          workspaceId: workspace.workspaceId,
          runId: snapshot.runId,
          sessionId: snapshot.sessionId,
          taskId: snapshot.taskId,
          strategy: workspace.strategy,
          sandboxId: snapshot.sandboxId,
          repoUrl: workspace.repoUrl,
          repoRef: workspace.repoRef,
          baseRef: workspace.baseRef,
          worktreePath: workspace.worktreePath,
          branchName: workspace.branchName,
          metadata: {
            workspaceRoot: workspace.workspaceRoot,
            repositoryPath: workspace.repositoryPath,
            headSha: workspace.headSha
          }
        });
      }

      session = await updateSessionStatus(client, {
        tenantId: snapshot.tenantId,
        sessionId: snapshot.sessionId,
        status: "ready",
        metadata: {
          ...(session.metadata ?? {}),
          taskId: snapshot.taskId,
          sandboxId: snapshot.sandboxId,
          workspaceId: workspace.workspaceId,
          headSha: workspace.headSha
        }
      });

      if (!session) {
        throw new Error("Task session ready transition did not return a session row.");
      }

      const durableSessionStatus = session.status as SessionStatus;

      await appendAndPublishRunEvent(client, this.env, {
        tenantId: snapshot.tenantId,
        runId: snapshot.runId,
        sessionId: snapshot.sessionId,
        taskId: snapshot.taskId,
        eventType: "sandbox.provisioned",
        payload: {
          sandboxId: snapshot.sandboxId
        },
        status: durableSessionStatus
      });
      await appendAndPublishRunEvent(client, this.env, {
        tenantId: snapshot.tenantId,
        runId: snapshot.runId,
        sessionId: snapshot.sessionId,
        taskId: snapshot.taskId,
        eventType: "workspace.initialized",
        payload: {
          workspaceId: workspace.workspaceId,
          repositoryPath: workspace.repositoryPath,
          repoUrl: workspace.repoUrl,
          repoRef: workspace.repoRef
        },
        status: durableSessionStatus
      });
      await appendAndPublishRunEvent(client, this.env, {
        tenantId: snapshot.tenantId,
        runId: snapshot.runId,
        sessionId: snapshot.sessionId,
        taskId: snapshot.taskId,
        eventType: "workspace.task_view_created",
        payload: {
          worktreePath: workspace.worktreePath,
          branchName: workspace.branchName,
          baseRef: workspace.baseRef
        },
        status: durableSessionStatus
      });

      this.stateSnapshot = {
        ...snapshot,
        workspace
      };
      await this.persistState();

      return this.requireState();
    } finally {
      await client.close();
    }
  }

  async startProcess(input: StartProcessInput) {
    const snapshot = this.requireState();

    if (!snapshot.workspace) {
      throw new Error("Workspace must be ensured before starting a process.");
    }

    const client = createWorkerDatabaseClient(this.env);

    try {
      const existingSession = await getSessionRecord(client, snapshot.tenantId, snapshot.sessionId);

      if (existingSession?.status === "ready") {
        await updateSessionStatus(client, {
          tenantId: snapshot.tenantId,
          sessionId: snapshot.sessionId,
          status: "active",
          metadata: {
            ...(existingSession.metadata ?? {}),
            activeCommand: input.command
          }
        });
      }

      const { session } = await ensureSandboxSession({
        env: this.env,
        sandboxId: snapshot.sandboxId,
        sessionId: snapshot.sessionId
      });
      const processOptions: {
        cwd: string;
        env?: Record<string, string | undefined>;
        processId?: string;
      } = {
        cwd: input.cwd ?? snapshot.workspace.worktreePath
      };

      if (input.env) {
        processOptions.env = input.env;
      }

      if (input.processId) {
        processOptions.processId = input.processId;
      }

      const process = await session.startProcess(input.command, processOptions);
      const processSnapshot = createProcessSnapshot(process);

      this.stateSnapshot = {
        ...snapshot,
        activeProcess: processSnapshot
      };
      await this.persistState();

      await appendAndPublishRunEvent(client, this.env, {
        tenantId: snapshot.tenantId,
        runId: snapshot.runId,
        sessionId: snapshot.sessionId,
        taskId: snapshot.taskId,
        eventType: "sandbox.process.started",
        payload: {
          processId: process.id,
          command: process.command,
          cwd: input.cwd ?? snapshot.workspace.worktreePath
        },
        status: "active"
      });

      return processSnapshot;
    } finally {
      await client.close();
    }
  }

  async pollProcess() {
    const snapshot = this.requireState();

    if (!snapshot.activeProcess) {
      return snapshot;
    }

    const client = createWorkerDatabaseClient(this.env);

    try {
      const { session } = await ensureSandboxSession({
        env: this.env,
        sandboxId: snapshot.sandboxId,
        sessionId: snapshot.sessionId
      });
      const process = await session.getProcess(snapshot.activeProcess.processId);

      if (!process) {
        return snapshot;
      }

      const logs = await process.getLogs();
      const delta = applyProcessLogDelta(logs, snapshot.activeProcess.logCursor);
      const nextProcessSnapshot: ProcessSnapshot = {
        ...snapshot.activeProcess,
        status: await process.getStatus(),
        exitCode: process.exitCode,
        endedAt: process.endTime?.toISOString(),
        logCursor: delta.nextCursor
      };

      if (delta.stdout) {
        await appendAndPublishRunEvent(client, this.env, {
          tenantId: snapshot.tenantId,
          runId: snapshot.runId,
          sessionId: snapshot.sessionId,
          taskId: snapshot.taskId,
          eventType: "sandbox.process.stdout",
          payload: {
            processId: process.id,
            chunk: delta.stdout
          },
          status: "active"
        });
      }

      if (delta.stderr) {
        await appendAndPublishRunEvent(client, this.env, {
          tenantId: snapshot.tenantId,
          runId: snapshot.runId,
          sessionId: snapshot.sessionId,
          taskId: snapshot.taskId,
          eventType: "sandbox.process.stderr",
          severity: "warning",
          payload: {
            processId: process.id,
            chunk: delta.stderr
          },
          status: "active"
        });
      }

      if (isTerminalProcessStatus(nextProcessSnapshot.status) && !nextProcessSnapshot.terminalEventRecorded) {
        await appendAndPublishRunEvent(client, this.env, {
          tenantId: snapshot.tenantId,
          runId: snapshot.runId,
          sessionId: snapshot.sessionId,
          taskId: snapshot.taskId,
          eventType: "sandbox.process.completed",
          severity: nextProcessSnapshot.exitCode && nextProcessSnapshot.exitCode > 0 ? "error" : "info",
          payload: {
            processId: process.id,
            command: process.command,
            exitCode: nextProcessSnapshot.exitCode ?? null,
            status: nextProcessSnapshot.status
          },
          status: nextProcessSnapshot.exitCode && nextProcessSnapshot.exitCode > 0 ? "failed" : "active"
        });
        nextProcessSnapshot.terminalEventRecorded = true;
      }

      this.stateSnapshot = {
        ...snapshot,
        activeProcess: nextProcessSnapshot,
        lastPolledAt: new Date().toISOString()
      };
      await this.persistState();

      return this.requireState();
    } finally {
      await client.close();
    }
  }

  async teardown() {
    const snapshot = this.requireState();
    const sandbox = getSandboxClient(this.env, snapshot.sandboxId);
    const client = createWorkerDatabaseClient(this.env);

    try {
      if (snapshot.activeProcess && !isTerminalProcessStatus(snapshot.activeProcess.status)) {
        try {
          await sandbox.killProcess(snapshot.activeProcess.processId, "SIGTERM", snapshot.sessionId);
        } catch (error) {
          console.warn("Failed to kill sandbox process during teardown", error);
        }
      }

      try {
        await sandbox.deleteSession(snapshot.sessionId);
      } catch (error) {
        console.warn("Failed to delete sandbox execution session during teardown", error);
      }

      await sandbox.destroy();

      const existingSession = await getSessionRecord(client, snapshot.tenantId, snapshot.sessionId);

      if (existingSession && existingSession.status !== "archived") {
        await updateSessionStatus(client, {
          tenantId: snapshot.tenantId,
          sessionId: snapshot.sessionId,
          status: "archived",
          metadata: {
            ...(existingSession.metadata ?? {}),
            tornDownAt: new Date().toISOString()
          }
        });
      }

      await appendAndPublishRunEvent(client, this.env, {
        tenantId: snapshot.tenantId,
        runId: snapshot.runId,
        sessionId: snapshot.sessionId,
        taskId: snapshot.taskId,
        eventType: "sandbox.teardown",
        payload: {
          sandboxId: snapshot.sandboxId
        },
        status: "archived"
      });

      return {
        ...snapshot,
        lastPolledAt: new Date().toISOString()
      };
    } finally {
      await client.close();
    }
  }

  async getSnapshot() {
    return this.stateSnapshot;
  }

  async fetch() {
    return Response.json({
      snapshot: this.stateSnapshot
    });
  }

  private requireState() {
    if (!this.stateSnapshot) {
      throw new Error("TaskSessionDO was not initialized before use.");
    }

    return this.stateSnapshot;
  }

  private async persistState() {
    if (!this.stateSnapshot) {
      return;
    }

    await this.ctx.storage.put(STATE_STORAGE_KEY, this.stateSnapshot);
  }
}
