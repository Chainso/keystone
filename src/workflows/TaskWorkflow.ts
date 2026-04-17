import type { ProcessStatus } from "@cloudflare/sandbox";
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import type { WorkerBindings } from "../env";
import { putArtifactBytes } from "../lib/artifacts/r2";
import { createArtifactRef } from "../lib/db/artifacts";
import { createWorkerDatabaseClient } from "../lib/db/client";
import { listSessionEvents } from "../lib/db/events";
import { appendAndPublishRunEvent } from "../lib/events/publish";
import { getTaskSessionStub } from "../lib/auth/tenant";
import { demoTargetFixtureFiles } from "../lib/workspace/fixtures";
import { buildStableSessionId } from "../lib/workflows/ids";
import { taskLogArtifactKey } from "../lib/artifacts/keys";
import { loadTaskHandoffArtifact } from "../keystone/tasks/load-task-contracts";
import { isTerminalProcessStatus } from "../lib/sandbox/processes";

export interface TaskWorkflowParams {
  tenantId: string;
  runId: string;
  runSessionId: string;
  taskId: string;
  repo: {
    source: "localPath" | "gitUrl";
    localPath?: string | undefined;
    gitUrl?: string | undefined;
    ref?: string | undefined;
  };
}

function resolveWorkspaceSource(repo: TaskWorkflowParams["repo"]) {
  if (repo.source === "gitUrl" && repo.gitUrl) {
    return {
      type: "git" as const,
      repoUrl: repo.gitUrl,
      repoRef: repo.ref,
      baseRef: repo.ref
    };
  }

  if (
    repo.source === "localPath" &&
    repo.localPath &&
    repo.localPath.endsWith("fixtures/demo-target")
  ) {
    return {
      type: "inline" as const,
      repoUrl: "fixture://demo-target",
      repoRef: "main",
      baseRef: "main",
      files: demoTargetFixtureFiles
    };
  }

  throw new NonRetryableError(
    "Task workflows currently support the committed demo fixture or gitUrl inputs."
  );
}

const MAX_PROCESS_POLL_ATTEMPTS = 20;

interface WorkflowProcessSnapshot {
  processId: string;
  command: string;
  status: ProcessStatus;
  startedAt: string;
  endedAt: string | null;
  exitCode: number | null;
}

export class TaskWorkflow extends WorkflowEntrypoint<WorkerBindings, TaskWorkflowParams> {
  async run(event: Readonly<WorkflowEvent<TaskWorkflowParams>>, step: WorkflowStep) {
    const handoff = await step.do("load task handoff", async () =>
      loadTaskHandoffArtifact(this.env, event.payload.tenantId, event.payload.runId, event.payload.taskId)
    );

    const taskSessionState = await step.do("ensure workspace", async () => {
      const taskSessionId = await buildStableSessionId(
        "task-session",
        event.payload.tenantId,
        event.payload.runId,
        event.payload.taskId
      );
      const taskSession = getTaskSessionStub(
        this.env,
        event.payload.tenantId,
        event.payload.runId,
        taskSessionId,
        event.payload.taskId
      );

      await taskSession.initialize({
        tenantId: event.payload.tenantId,
        runId: event.payload.runId,
        sessionId: taskSessionId,
        taskId: event.payload.taskId,
        parentSessionId: event.payload.runSessionId
      });

      await taskSession.ensureWorkspace({
        source: resolveWorkspaceSource(event.payload.repo)
      });

      return {
        taskSessionId
      };
    });

    await step.do("mark task active", async () => {
      const client = createWorkerDatabaseClient(this.env);

      try {
        await appendAndPublishRunEvent(client, this.env, {
          tenantId: event.payload.tenantId,
          runId: event.payload.runId,
          sessionId: taskSessionState.taskSessionId,
          taskId: event.payload.taskId,
          eventType: "task.status_changed",
          payload: {
            taskId: event.payload.taskId,
            status: "active",
            summary: handoff.task.summary
          },
          status: "active"
        });
      } finally {
        await client.close();
      }

      return true;
    });

    await step.do("start task process", async () => {
      const taskSession = getTaskSessionStub(
        this.env,
        event.payload.tenantId,
        event.payload.runId,
        taskSessionState.taskSessionId,
        event.payload.taskId
      );

      const process = await taskSession.startProcess({
        command: "npm test"
      });

      return {
        processId: process.processId,
        status: process.status
      };
    });

    let latestProcessState: WorkflowProcessSnapshot | null = null;

    for (let attempt = 0; attempt < MAX_PROCESS_POLL_ATTEMPTS; attempt += 1) {
      latestProcessState = await step.do(`poll task process ${attempt}`, async () => {
        const taskSession = getTaskSessionStub(
          this.env,
          event.payload.tenantId,
          event.payload.runId,
          taskSessionState.taskSessionId,
          event.payload.taskId
        );

        const processState = await taskSession.pollProcess();

        return toWorkflowProcessSnapshot(processState.activeProcess);
      });

      if (latestProcessState && isTerminalProcessStatus(latestProcessState.status)) {
        break;
      }

      await step.sleep(`wait for task process ${attempt}`, "1 second");
    }

    if (!latestProcessState) {
      throw new NonRetryableError(`Task ${event.payload.taskId} did not produce an active process snapshot.`);
    }

    const logArtifactRefId = await step.do("persist task logs", async () => {
      const client = createWorkerDatabaseClient(this.env);

      try {
        const sessionEvents = await listSessionEvents(client, {
          tenantId: event.payload.tenantId,
          sessionId: taskSessionState.taskSessionId
        });
        const logLines = sessionEvents
          .filter(
            (sessionEvent) =>
              sessionEvent.eventType === "sandbox.process.stdout" ||
              sessionEvent.eventType === "sandbox.process.stderr"
          )
          .map((sessionEvent) =>
            JSON.stringify({
              timestamp: sessionEvent.ts.toISOString(),
              eventType: sessionEvent.eventType,
              chunk: sessionEvent.payload.chunk ?? ""
            })
          )
          .join("\n");
        const artifact = await putArtifactBytes(
          this.env.ARTIFACTS_BUCKET,
          "keystone-artifacts-dev",
          taskLogArtifactKey(
            event.payload.tenantId,
            event.payload.runId,
            event.payload.taskId,
            latestProcessState.processId
          ),
          logLines,
          {
            httpMetadata: {
              contentType: "application/x-ndjson; charset=utf-8"
            }
          }
        );
        const artifactRef = await createArtifactRef(client, {
          tenantId: event.payload.tenantId,
          runId: event.payload.runId,
          sessionId: taskSessionState.taskSessionId,
          taskId: event.payload.taskId,
          kind: "task_log",
          storageBackend: artifact.storageBackend,
          storageUri: artifact.storageUri,
          contentType: "application/x-ndjson; charset=utf-8",
          sizeBytes: artifact.sizeBytes,
          metadata: {
            key: artifact.key,
            etag: artifact.etag
          }
        });

        if (!artifactRef) {
          throw new Error(`Task log artifact ref could not be created for ${event.payload.taskId}.`);
        }

        await appendAndPublishRunEvent(client, this.env, {
          tenantId: event.payload.tenantId,
          runId: event.payload.runId,
          sessionId: taskSessionState.taskSessionId,
          taskId: event.payload.taskId,
          eventType: "artifact.put",
          artifactRefId: artifactRef.artifactRefId,
          payload: {
            kind: "task_log",
            storageUri: artifact.storageUri
          },
          status: latestProcessState.exitCode === 0 ? "active" : "failed"
        });

        return artifactRef.artifactRefId;
      } finally {
        await client.close();
      }
    });

    await step.do("mark task complete", async () => {
      const client = createWorkerDatabaseClient(this.env);
      const taskStatus = latestProcessState.exitCode === 0 ? "completed" : "failed";

      try {
        await appendAndPublishRunEvent(client, this.env, {
          tenantId: event.payload.tenantId,
          runId: event.payload.runId,
          sessionId: taskSessionState.taskSessionId,
          taskId: event.payload.taskId,
          eventType: "task.status_changed",
          severity: latestProcessState.exitCode === 0 ? "info" : "error",
          payload: {
            taskId: event.payload.taskId,
            status: taskStatus,
            exitCode: latestProcessState.exitCode
          },
          status: latestProcessState.exitCode === 0 ? "active" : "failed"
        });
      } finally {
        await client.close();
      }

      return taskStatus;
    });

    await step.do("teardown task session", async () => {
      const taskSession = getTaskSessionStub(
        this.env,
        event.payload.tenantId,
        event.payload.runId,
        taskSessionState.taskSessionId,
        event.payload.taskId
      );

      await taskSession.teardown();

      return true;
    });

    return {
      taskId: event.payload.taskId,
      taskSessionId: taskSessionState.taskSessionId,
      processStatus: latestProcessState.status,
      exitCode: latestProcessState.exitCode,
      logArtifactRefId,
      workflowStatus: latestProcessState.exitCode === 0 ? "complete" : "errored"
    };
  }
}

function toWorkflowProcessSnapshot(
  activeProcess:
    | {
        processId: string;
        command: string;
        status: ProcessStatus;
        startedAt: string;
        endedAt?: string | undefined;
        exitCode?: number | undefined;
      }
    | undefined
): WorkflowProcessSnapshot {
  if (!activeProcess) {
    throw new NonRetryableError("Task process snapshot was unexpectedly empty.");
  }

  return {
    processId: activeProcess.processId,
    command: activeProcess.command,
    status: activeProcess.status,
    startedAt: activeProcess.startedAt,
    endedAt: activeProcess.endedAt ?? null,
    exitCode: activeProcess.exitCode ?? null
  };
}
