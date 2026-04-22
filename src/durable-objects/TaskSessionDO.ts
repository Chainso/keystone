import { DurableObject } from "cloudflare:workers";

import type { WorkerBindings } from "../env";
import type { ArtifactKind } from "../lib/artifacts/model";
import {
  getArtifactBytes,
  isTextArtifactContentType
} from "../lib/artifacts/r2";
import {
  getArtifactStorageUri,
  listArtifactsForSandboxProjection
} from "../lib/db/artifacts";
import { createWorkerDatabaseClient } from "../lib/db/client";
import {
  applyProcessLogDelta,
  createProcessSnapshot,
  isTerminalProcessStatus,
  type ProcessSnapshot
} from "../lib/sandbox/processes";
import { ensureSandboxSession, getSandboxClient } from "../lib/sandbox/client";
import { buildRunSandboxId } from "../lib/workspace/worktree";
import {
  ensureWorkspaceMaterialized,
  materializeSandboxAgentBridge,
  type MaterializedWorkspace,
  type ProjectedArtifactInput,
  type WorkspaceMaterializationSource,
  type WorkspaceSource
} from "../lib/workspace/init";

export type TaskSessionState = {
  tenantId: string;
  runId: string;
  sessionId: string;
  taskId: string;
  runTaskId: string;
  sandboxId: string;
  workspace?: MaterializedWorkspace | undefined;
  activeProcess?: ProcessSnapshot | undefined;
  lastPolledAt?: string | undefined;
};

export type InitializeTaskSessionInput = {
  tenantId: string;
  runId: string;
  sessionId: string;
  taskId: string;
  runTaskId: string;
  sandboxId?: string | undefined;
};

export type EnsureWorkspaceInput = {
  source?: WorkspaceSource | undefined;
  components?: WorkspaceMaterializationSource[] | undefined;
  env?: Record<string, string> | undefined;
};

export type StartProcessInput = {
  command: string;
  cwd?: string | undefined;
  env?: Record<string, string | undefined> | undefined;
  processId?: string | undefined;
};

const STATE_STORAGE_KEY = "task-session-state";
const TASK_PROCESS_ID_PREFIX = "task-process";

function hasEnvOverrides(
  value: Record<string, string | undefined> | undefined
): value is Record<string, string | undefined> {
  return !!value && Object.keys(value).length > 0;
}

function buildTaskProcessId(sessionId: string) {
  return `${TASK_PROCESS_ID_PREFIX}:${sessionId}`;
}

function refreshProcessSnapshot(
  process: Parameters<typeof createProcessSnapshot>[0],
  previousSnapshot?: ProcessSnapshot | undefined
) {
  const nextSnapshot = createProcessSnapshot(process);

  if (!previousSnapshot) {
    return nextSnapshot;
  }

  return {
    ...nextSnapshot,
    logCursor: previousSnapshot.logCursor,
    terminalEventRecorded: previousSnapshot.terminalEventRecorded
  } satisfies ProcessSnapshot;
}

function arrayBufferToBase64(value: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(value);

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function deriveProjectedArtifactFileName(
  artifact: {
    contentType: string;
    artifactKind: ArtifactKind;
    objectKey: string;
  }
) {
  const storageName = artifact.objectKey.split("/").at(-1);

  if (storageName) {
    return storageName;
  }

  if (artifact.contentType.includes("json")) {
    return "artifact.json";
  }

  if (artifact.contentType.startsWith("text/")) {
    return "artifact.txt";
  }

  return "artifact.bin";
}

async function loadProjectedArtifacts(
  env: Pick<WorkerBindings, "ARTIFACTS_BUCKET">,
  artifacts: Awaited<ReturnType<typeof listArtifactsForSandboxProjection>>
): Promise<ProjectedArtifactInput[]> {
  const projectedArtifacts: ProjectedArtifactInput[] = [];

  for (const artifact of artifacts) {
    if (artifact.storageBackend !== "r2") {
      continue;
    }

    const storageUri = getArtifactStorageUri(artifact);
    const storedArtifact = await getArtifactBytes(env.ARTIFACTS_BUCKET, storageUri);

    if (!storedArtifact) {
      continue;
    }

    const contentType = storedArtifact.contentType ?? artifact.contentType;
    const isTextArtifact = isTextArtifactContentType(contentType);

    projectedArtifacts.push({
      artifactRefId: artifact.artifactRefId,
      kind: artifact.artifactKind,
      contentType,
      storageUri,
      body: isTextArtifact
        ? new TextDecoder().decode(storedArtifact.body)
        : arrayBufferToBase64(storedArtifact.body),
      encoding: isTextArtifact ? "utf-8" : "base64",
      fileName: deriveProjectedArtifactFileName({
        contentType,
        artifactKind: artifact.artifactKind,
        objectKey: artifact.objectKey
      }),
      sizeBytes: artifact.sizeBytes,
      metadata: {}
    });
  }

  return projectedArtifacts;
}

export class TaskSessionDO extends DurableObject<WorkerBindings> {
  private stateSnapshot: TaskSessionState | null = null;

  constructor(ctx: DurableObjectState, env: WorkerBindings) {
    super(ctx, env);

    ctx.blockConcurrencyWhile(async () => {
      this.stateSnapshot = (await this.ctx.storage.get<TaskSessionState>(STATE_STORAGE_KEY)) ?? null;
    });
  }

  async initialize(input: InitializeTaskSessionInput): Promise<TaskSessionState> {
    if (!this.stateSnapshot) {
      this.stateSnapshot = {
        tenantId: input.tenantId,
        runId: input.runId,
        sessionId: input.sessionId,
        taskId: input.taskId,
        runTaskId: input.runTaskId,
        sandboxId: input.sandboxId ?? buildRunSandboxId(input.tenantId, input.runId)
      };
      await this.persistState();
    }

    return this.requireState();
  }

  async ensureWorkspace(input: EnsureWorkspaceInput): Promise<TaskSessionState> {
    const snapshot = this.requireState();
    const client = createWorkerDatabaseClient(this.env);

    try {
      const { session: sandboxSession } = await ensureSandboxSession({
        env: this.env,
        sandboxId: snapshot.sandboxId,
        sessionId: snapshot.sessionId
      });
      const workspaceMaterializationInput =
        input.components && input.components.length > 0
          ? {
              runId: snapshot.runId,
              taskId: snapshot.taskId,
              runTaskId: snapshot.runTaskId,
              components: input.components
            }
          : input.source
            ? {
                runId: snapshot.runId,
                taskId: snapshot.taskId,
                runTaskId: snapshot.runTaskId,
                source: input.source
              }
            : null;

      if (!workspaceMaterializationInput) {
        throw new Error("Workspace materialization requires a source or components.");
      }

      let workspace = await ensureWorkspaceMaterialized(
        sandboxSession,
        workspaceMaterializationInput
      );
      const artifactsForProjection = await listArtifactsForSandboxProjection(client, {
        tenantId: snapshot.tenantId,
        runId: snapshot.runId,
        excludeRunTaskId: snapshot.runTaskId
      });
      const projectedArtifacts = await loadProjectedArtifacts(this.env, artifactsForProjection);
      const agentBridge = await materializeSandboxAgentBridge(sandboxSession, {
        workspace,
        tenantId: snapshot.tenantId,
        runId: snapshot.runId,
        sessionId: snapshot.sessionId,
        taskId: snapshot.taskId,
        sandboxId: snapshot.sandboxId,
        environment: input.env,
        artifacts: projectedArtifacts
      });
      workspace = {
        ...workspace,
        agentBridge
      };
      const liveTrackedProcess = snapshot.activeProcess
        ? await sandboxSession.getProcess(snapshot.activeProcess.processId)
        : null;

      this.stateSnapshot = {
        ...snapshot,
        workspace,
        activeProcess: liveTrackedProcess
          ? refreshProcessSnapshot(liveTrackedProcess, snapshot.activeProcess)
          : undefined
      };
      await this.persistState();

      return this.requireState();
    } finally {
      await client.close();
    }
  }

  async startProcess(input: StartProcessInput): Promise<ProcessSnapshot> {
    const snapshot = this.requireState();

    if (!snapshot.workspace) {
      throw new Error("Workspace must be ensured before starting a process.");
    }
    try {
      const { session } = await ensureSandboxSession({
        env: this.env,
        sandboxId: snapshot.sandboxId,
        sessionId: snapshot.sessionId
      });
      const processId = input.processId ?? buildTaskProcessId(snapshot.sessionId);
      const trackedActiveProcess = snapshot.activeProcess;
      let previousActiveProcess = snapshot.activeProcess;

      if (previousActiveProcess) {
        const sandboxProcess = await session.getProcess(previousActiveProcess.processId);

        if (sandboxProcess) {
          if (previousActiveProcess.command !== input.command) {
            throw new Error(
              `Task session ${snapshot.sessionId} is already tracking ${previousActiveProcess.command}; refusing to start ${input.command}.`
            );
          }

          const processSnapshot = refreshProcessSnapshot(
            sandboxProcess,
            previousActiveProcess
          );

          this.stateSnapshot = {
            ...snapshot,
            activeProcess: processSnapshot
          };
          await this.persistState();

          return processSnapshot;
        }

        previousActiveProcess = undefined;
        this.stateSnapshot = {
          ...snapshot,
          activeProcess: undefined
        };
        await this.persistState();
      }

      const existingProcess = await session.getProcess(processId);

      if (existingProcess) {
        if (existingProcess.command !== input.command) {
          throw new Error(
            `Task session ${snapshot.sessionId} recovered ${existingProcess.command} for ${processId}; refusing to attach it to ${input.command}.`
          );
        }

        const processSnapshot = refreshProcessSnapshot(
          existingProcess,
          previousActiveProcess ?? trackedActiveProcess
        );

        this.stateSnapshot = {
          ...snapshot,
          activeProcess: processSnapshot
        };
        await this.persistState();

        return processSnapshot;
      }

      const processOptions: {
        cwd: string;
        env?: Record<string, string | undefined>;
        processId?: string;
      } = {
        cwd: input.cwd ?? snapshot.workspace.defaultCwd
      };

      const mergedEnv =
        snapshot.workspace.agentBridge.environment || input.env
          ? {
              ...(snapshot.workspace.agentBridge.environment ?? {}),
              ...(input.env ?? {})
            }
          : undefined;

      if (hasEnvOverrides(mergedEnv)) {
        processOptions.env = mergedEnv;
      }

      processOptions.processId = processId;

      const process = await session.startProcess(input.command, processOptions);
      const processSnapshot = createProcessSnapshot(process);

      this.stateSnapshot = {
        ...snapshot,
        activeProcess: processSnapshot
      };
      await this.persistState();

      return processSnapshot;
    } finally {
      // no-op
    }
  }

  async pollProcess(): Promise<TaskSessionState> {
    const snapshot = this.requireState();

    if (!snapshot.activeProcess) {
      return snapshot;
    }

    try {
      const { session } = await ensureSandboxSession({
        env: this.env,
        sandboxId: snapshot.sandboxId,
        sessionId: snapshot.sessionId
      });
      const process = await session.getProcess(snapshot.activeProcess.processId);

      if (!process) {
        this.stateSnapshot = {
          ...snapshot,
          activeProcess: undefined,
          lastPolledAt: new Date().toISOString()
        };
        await this.persistState();

        return this.requireState();
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

      if (isTerminalProcessStatus(nextProcessSnapshot.status) && !nextProcessSnapshot.terminalEventRecorded) {
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
      // no-op
    }
  }

  async getProcessLogs(): Promise<{
    processId: string;
    stdout: string;
    stderr: string;
  } | null> {
    const snapshot = this.requireState();

    if (!snapshot.activeProcess) {
      return null;
    }

    try {
      const { session } = await ensureSandboxSession({
        env: this.env,
        sandboxId: snapshot.sandboxId,
        sessionId: snapshot.sessionId
      });
      const process = await session.getProcess(snapshot.activeProcess.processId);

      if (!process) {
        return null;
      }

      const logs = await process.getLogs();

      return {
        processId: process.id,
        stdout: logs.stdout,
        stderr: logs.stderr
      };
    } catch (error) {
      console.warn("Failed to read sandbox process logs for task session replay", error);
      return null;
    }
  }

  async teardown(): Promise<TaskSessionState> {
    const snapshot = this.requireState();
    const sandbox = getSandboxClient(this.env, snapshot.sandboxId);

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

    this.stateSnapshot = {
      ...snapshot,
      workspace: undefined,
      activeProcess: undefined,
      lastPolledAt: new Date().toISOString()
    };
    await this.persistState();

    return this.requireState();
  }

  async preserveForInspection(): Promise<TaskSessionState> {
    const snapshot = this.requireState();
    this.stateSnapshot = {
      ...snapshot,
      lastPolledAt: new Date().toISOString()
    };
    await this.persistState();

    return this.requireState();
  }

  async getSnapshot(): Promise<TaskSessionState | null> {
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
