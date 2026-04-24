import { posix as path } from "node:path";

import type { ProcessStatus } from "@cloudflare/sandbox";
import { getAgentByName } from "agents";
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import type { WorkerBindings } from "../env";
import type { KeystoneThinkAgent } from "../keystone/agents/base/KeystoneThinkAgent";
import { createThinkSmokePlan } from "../keystone/agents/implementer/ImplementerAgent";
import { readSandboxAgentFile } from "../keystone/agents/tools/filesystem";
import type { AgentRuntimeArtifact } from "../maestro/agent-runtime";
import type { TaskSessionState } from "../durable-objects/TaskSessionDO";
import {
  parseAgentRuntimeArtifactKind,
  type AgentRuntimeArtifactKind,
  type ArtifactKind
} from "../lib/artifacts/model";
import {
  getArtifactBytes,
  putArtifactBytes,
  decodeArtifactBody
} from "../lib/artifacts/r2";
import {
  createArtifactRef,
  findArtifactRefByObjectKey
} from "../lib/db/artifacts";
import { createWorkerDatabaseClient } from "../lib/db/client";
import {
  getRunTask,
  updateRunTask
} from "../lib/db/runs";
import { getTaskSessionStub } from "../lib/auth/tenant";
import { getProject } from "../lib/db/projects";
import {
  buildProjectExecutionSnapshot,
  type ProjectExecutionRuleOverride,
  type ProjectExecutionSnapshot
} from "../lib/projects/runtime";
import type { ExecutionEngine } from "../lib/runs/options";
import { taskLogArtifactKey, tenantRunPrefix } from "../lib/artifacts/keys";
import { buildStableSessionId } from "../lib/workflows/ids";
import { loadTaskHandoffArtifact } from "../keystone/tasks/load-task-contracts";
import { ensureSandboxSession } from "../lib/sandbox/client";
import { isTerminalProcessStatus } from "../lib/sandbox/processes";
import type { ProjectRuleSet } from "../keystone/projects/contracts";

export interface TaskWorkflowParams {
  tenantId: string;
  runId: string;
  sandboxId: string;
  taskId: string;
  runTaskId: string;
  executionEngine: ExecutionEngine;
  preserveSandbox?: boolean | undefined;
  project: {
    projectId: string;
    projectKey: string;
    displayName: string;
  };
}

const MAX_PROCESS_POLL_ATTEMPTS = 20;
const THINK_TASK_CONVERSATION_AGENT_CLASS = "KeystoneThinkAgent";

interface WorkflowProcessSnapshot {
  processId: string;
  command: string;
  status: ProcessStatus;
  startedAt: string;
  endedAt: string | null;
  exitCode: number | null;
}

interface ThinkTurnSnapshot {
  outcome: "completed" | "failed" | "cancelled";
  summary: string | null;
}

interface SerializableThinkTurnResult extends ThinkTurnSnapshot {
  stagedArtifacts: Array<{
    path: string;
    kind: AgentRuntimeArtifactKind;
    contentType?: string | undefined;
    metadata?: Record<string, JsonValue> | undefined;
  }>;
}

interface TaskExecutionSnapshot {
  processStatus: string;
  exitCode: number | null;
  logArtifactRefId: string | null;
  promotedArtifactRefIds: string[];
}

interface ProcessLogArtifact {
  processId: string;
  stdout: string;
  stderr: string;
}

function buildProcessLogArtifactBody(logs: ProcessLogArtifact) {
  return [
    logs.stdout
      ? JSON.stringify({
          eventType: "sandbox.process.stdout",
          processId: logs.processId,
          chunk: logs.stdout
        })
      : null,
    logs.stderr
      ? JSON.stringify({
          eventType: "sandbox.process.stderr",
          processId: logs.processId,
          chunk: logs.stderr
        })
      : null
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

interface SerializableAgentBridge {
  layout: {
    workspaceRoot: string;
    documentsRoot: string;
    artifactsInRoot: string;
    artifactsOutRoot: string;
    keystoneRoot: string;
  };
  targets: {
    workspaceRoot: string;
    documentsRoot: string;
    artifactsInRoot: string;
    artifactsOutRoot: string;
    keystoneRoot: string;
  };
  readOnlyRoots: string[];
  writableRoots: string[];
  environment?: Record<string, string> | undefined;
  controlFiles: {
    session: string;
    filesystem: string;
    artifacts: string;
  };
  projectedArtifacts: Array<{
    artifactRefId: string;
    kind: ArtifactKind;
    contentType: string;
    storageUri: string;
    projectedPath: string;
    sizeBytes?: number | null | undefined;
    metadata?: Record<string, JsonValue> | undefined;
  }>;
}

interface TaskWorkspaceSnapshot {
  taskSessionId: string;
  sandboxId: string;
  agentBridgeJson: string;
  scriptedProcessCwd: string | null;
}

interface TaskProjectContext {
  projectExecution: ProjectExecutionSnapshot;
}

interface AuthoritativeTaskRecordSnapshot {
  runTaskId: string;
}

type RunTaskRecord = NonNullable<Awaited<ReturnType<typeof getRunTask>>>;

function buildTaskConversationLocator(input: {
  executionEngine: ExecutionEngine;
  tenantId: string;
  runId: string;
  taskSessionId: string;
}) {
  if (input.executionEngine === "scripted") {
    return null;
  }

  return {
    conversationAgentClass: THINK_TASK_CONVERSATION_AGENT_CLASS,
    conversationAgentName: getThinkAgentName(input.tenantId, input.runId, input.taskSessionId)
  };
}

async function findAuthoritativeRunTaskRecord(
  client: ReturnType<typeof createWorkerDatabaseClient>,
  input: {
    tenantId: string;
    runId: string;
    runTaskId: string;
  }
) {
  const stableTask = await getRunTask(client, {
    tenantId: input.tenantId,
    runId: input.runId,
    runTaskId: input.runTaskId
  });

  if (stableTask) {
    return stableTask;
  }

  return null;
}

async function requireAuthoritativeRunTaskRecord(
  client: ReturnType<typeof createWorkerDatabaseClient>,
  input: {
    tenantId: string;
    runId: string;
    runTaskId: string;
    executionEngine: ExecutionEngine;
    taskSessionId: string;
  }
): Promise<RunTaskRecord> {
  const existing = await findAuthoritativeRunTaskRecord(client, input);
  const locator = buildTaskConversationLocator(input);

  if (!existing) {
    throw new Error(`Run task ${input.runTaskId} was not found for run ${input.runId}.`);
  }

  if (
    !locator ||
    (existing.conversationAgentClass === locator.conversationAgentClass &&
      existing.conversationAgentName === locator.conversationAgentName)
  ) {
    return existing;
  }

  return updateRunTask(client, {
    tenantId: input.tenantId,
    runId: input.runId,
    runTaskId: input.runTaskId,
    conversationAgentClass: locator.conversationAgentClass,
    conversationAgentName: locator.conversationAgentName
  });
}

async function persistAuthoritativeRunTaskStatus(
  client: ReturnType<typeof createWorkerDatabaseClient>,
  input: {
    tenantId: string;
    runId: string;
    runTaskId: string;
    executionEngine: ExecutionEngine;
    taskSessionId: string;
    status: "active" | "completed" | "failed" | "cancelled";
    at?: Date | undefined;
  }
) {
  const existing = await getRunTask(client, {
    tenantId: input.tenantId,
    runId: input.runId,
    runTaskId: input.runTaskId
  });

  if (!existing) {
    throw new Error(`Run task ${input.runTaskId} was not found for run ${input.runId}.`);
  }

  if (
    (existing.status === "completed" ||
      existing.status === "failed" ||
      existing.status === "cancelled" ||
      existing.status === "archived") &&
    existing.status !== input.status
  ) {
    return existing;
  }

  const ifStatusIn =
    input.status === "active"
      ? ["pending", "ready", "active"]
      : ["pending", "ready", "active", input.status];

  const locator = buildTaskConversationLocator(input);
  const transitionAt = input.at ?? new Date();

  return updateRunTask(client, {
    tenantId: input.tenantId,
    runId: input.runId,
    runTaskId: input.runTaskId,
    status: input.status,
    ifStatusIn,
    startedAt: existing.startedAt ?? transitionAt,
    endedAt: input.status === "active" ? null : existing.endedAt ?? transitionAt,
    ...(locator
      ? {
          conversationAgentClass: locator.conversationAgentClass,
          conversationAgentName: locator.conversationAgentName
        }
      : {})
  });
}

export class TaskWorkflow extends WorkflowEntrypoint<WorkerBindings, TaskWorkflowParams> {
  async run(event: Readonly<WorkflowEvent<TaskWorkflowParams>>, step: WorkflowStep) {
    const executionEngine = event.payload.executionEngine;
    const preserveSandbox = event.payload.preserveSandbox ?? false;
    let taskSessionPrepared = false;
    let taskSessionState: TaskWorkspaceSnapshot | null = null;
    let authoritativeTaskRecord: AuthoritativeTaskRecordSnapshot | null = null;
    let handoff: Awaited<ReturnType<typeof loadTaskHandoffArtifact>> | null = null;
    let projectContext: TaskProjectContext | null = null;
    let taskSessionId: string | null = null;

    try {
      taskSessionId = (await step.do("allocate task session id", async () =>
        buildStableSessionId(
          "task-session",
          event.payload.tenantId,
          event.payload.runId,
          event.payload.runTaskId
        )
      )) as string;
      handoff = await step.do("load task handoff", async () =>
        loadTaskHandoffArtifact(
          this.env,
          event.payload.tenantId,
          event.payload.runId,
          event.payload.runTaskId
        )
      );
      projectContext = (await step.do("load project execution", async () => {
        const client = createWorkerDatabaseClient(this.env);

        try {
          const project = await getProject(client, {
            tenantId: event.payload.tenantId,
            projectId: event.payload.project.projectId
          });

          if (!project) {
            throw new NonRetryableError(
              `Project ${event.payload.project.projectId} was not found for task ${event.payload.taskId}.`
            );
          }

          return {
            projectExecution: buildProjectExecutionSnapshot(project)
          };
        } finally {
          await client.close();
        }
      })) as TaskProjectContext;

      taskSessionState = (await step.do("ensure workspace", async () => {
        const taskSession = getTaskSessionStub(
          this.env,
          event.payload.tenantId,
          event.payload.runId,
          taskSessionId!,
          event.payload.runTaskId
        );

        await taskSession.initialize({
          tenantId: event.payload.tenantId,
          runId: event.payload.runId,
          sessionId: taskSessionId!,
          taskId: event.payload.taskId,
          runTaskId: event.payload.runTaskId,
          sandboxId: event.payload.sandboxId
        });
        taskSessionPrepared = true;

        const workspaceState = (await taskSession.ensureWorkspace({
          components: projectContext!.projectExecution.components,
          env: projectContext!.projectExecution.environment
        })) as TaskSessionState;
        const bridge = workspaceState.workspace?.agentBridge;

        if (!bridge) {
          throw new Error(`Task ${event.payload.taskId} did not materialize an agent bridge.`);
        }

        return {
          taskSessionId: taskSessionId!,
          sandboxId: workspaceState.sandboxId,
          agentBridgeJson: JSON.stringify(bridge),
          scriptedProcessCwd:
            workspaceState.workspace?.components.length === 1
              ? workspaceState.workspace.components[0]?.worktreePath ?? null
              : null
        };
      })) as TaskWorkspaceSnapshot;

      authoritativeTaskRecord = (await step.do("ensure authoritative run task", async () => {
        const client = createWorkerDatabaseClient(this.env);

        try {
          const runTask = await requireAuthoritativeRunTaskRecord(client, {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId,
            runTaskId: event.payload.runTaskId,
            executionEngine,
            taskSessionId: taskSessionId!
          });

          return {
            runTaskId: runTask.runTaskId
          };
        } finally {
          await client.close();
        }
      })) as AuthoritativeTaskRecordSnapshot;
      const preparedTaskSession = taskSessionState;
      const resolvedAuthoritativeTaskRecord = authoritativeTaskRecord;

      if (!preparedTaskSession || !resolvedAuthoritativeTaskRecord) {
        throw new NonRetryableError(
          `Task ${event.payload.taskId} could not resolve its prepared session state.`
        );
      }

      await step.do("mark task active", async () => {
        const client = createWorkerDatabaseClient(this.env);

        try {
          const persistedTask = await persistAuthoritativeRunTaskStatus(client, {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId,
            runTaskId: resolvedAuthoritativeTaskRecord.runTaskId,
            executionEngine,
            taskSessionId: taskSessionId!,
            status: "active"
          });

          if (persistedTask.status !== "active") {
            throw new NonRetryableError(
              `Task ${event.payload.taskId} is no longer runnable because its authoritative status is ${persistedTask.status}.`
            );
          }
        } finally {
          await client.close();
        }

        return true;
      });

      const completedExecution =
        executionEngine !== "scripted"
          ? await (async () => {
              const runThinkStep = step.do as unknown as (
                name: string,
                fn: () => Promise<unknown>
              ) => Promise<unknown>;
              const turnResult = (await runThinkStep("run think implementer", async () => {
                const agentBridge = JSON.parse(preparedTaskSession.agentBridgeJson) as SerializableAgentBridge;
                const agent = await getAgentByName(
                  this.env.KEYSTONE_THINK_AGENT,
                  getThinkAgentName(event.payload.tenantId, event.payload.runId, taskSessionId!)
                ) as Pick<KeystoneThinkAgent, "runImplementerTurn">;
                const turnInput = resolveThinkTurnInput(
                  projectContext!.projectExecution,
                  handoff!,
                  executionEngine
                );
                const result = await agent.runImplementerTurn({
                  tenantId: event.payload.tenantId,
                  runId: event.payload.runId,
                  sessionId: taskSessionId!,
                  taskId: event.payload.taskId,
                  prompt: buildThinkImplementerPrompt(handoff!, {
                    projectId: event.payload.project.projectId,
                    projectKey: event.payload.project.projectKey,
                    displayName: event.payload.project.displayName,
                    componentCount: projectContext!.projectExecution.components.length,
                    ruleSet: projectContext!.projectExecution.ruleSet,
                    componentRuleOverrides: projectContext!.projectExecution.componentRuleOverrides
                  }),
                  sandboxId: preparedTaskSession.sandboxId,
                  agentBridge,
                  ...turnInput
                });

                const serializedStagedArtifacts: SerializableThinkTurnResult["stagedArtifacts"] =
                  result.stagedArtifacts.map((stagedArtifact) => ({
                    path: stagedArtifact.path,
                    kind: stagedArtifact.kind,
                    contentType: stagedArtifact.contentType,
                    metadata: stagedArtifact.metadata
                      ? (JSON.parse(JSON.stringify(stagedArtifact.metadata)) as Record<string, JsonValue>)
                      : undefined
                  }));

                return {
                  outcome: result.outcome,
                  summary: result.summary ?? null,
                  stagedArtifacts: serializedStagedArtifacts
                };
              })) as unknown as SerializableThinkTurnResult;

              return await step.do("promote think artifacts", async () => {
                const client = createWorkerDatabaseClient(this.env);

                try {
                  const promotedArtifactRefIds = await promoteStagedArtifacts(this.env, client, {
                    tenantId: event.payload.tenantId,
                    projectId: event.payload.project.projectId,
                    runId: event.payload.runId,
                    runTaskId: resolvedAuthoritativeTaskRecord.runTaskId,
                    sessionId: taskSessionId!,
                    taskId: event.payload.taskId,
                    sandboxId: preparedTaskSession.sandboxId,
                    agentBridge: JSON.parse(preparedTaskSession.agentBridgeJson) as SerializableAgentBridge,
                    stagedArtifacts: turnResult.stagedArtifacts
                  });
                  const thinkExecution = {
                    processStatus:
                      turnResult.outcome === "completed" ? "completed" : turnResult.outcome,
                    exitCode: turnResult.outcome === "completed" ? 0 : 1,
                    logArtifactRefId: null,
                    promotedArtifactRefIds
                  } satisfies TaskExecutionSnapshot;

                  return thinkExecution;
                } finally {
                  await client.close();
                }
              });
            })()
          : await runScriptedTask(
              this.env,
              step,
              event.payload,
              resolvedAuthoritativeTaskRecord.runTaskId,
              taskSessionId!,
              projectContext!.projectExecution.environment,
              preparedTaskSession.scriptedProcessCwd
            );

      const persistedTaskStatus = (await step.do("persist task terminal state", async () => {
        const client = createWorkerDatabaseClient(this.env);
        const taskStatus =
          completedExecution.processStatus === "cancelled"
            ? "cancelled"
            : completedExecution.processStatus === "completed" && completedExecution.exitCode === 0
              ? "completed"
              : "failed";

        try {
          const persistedTask = await persistAuthoritativeRunTaskStatus(client, {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId,
            runTaskId: resolvedAuthoritativeTaskRecord.runTaskId,
            executionEngine,
            taskSessionId: taskSessionId!,
            status: taskStatus
          });

          return persistedTask.status;
        } finally {
          await client.close();
        }
      })) as string;

      await step.do("mark task complete", async () => {
        return persistedTaskStatus;
      });

      return {
        taskId: event.payload.taskId,
        runTaskId: event.payload.runTaskId,
        processStatus:
          persistedTaskStatus === "cancelled"
            ? "cancelled"
            : completedExecution.processStatus,
        exitCode: persistedTaskStatus === "cancelled" ? 1 : completedExecution.exitCode,
        logArtifactRefId: completedExecution.logArtifactRefId,
        workflowStatus:
          persistedTaskStatus === "completed"
            ? "complete"
            : persistedTaskStatus === "cancelled"
              ? "cancelled"
              : "errored"
      };
    } catch (error) {
      await step.do("persist task failed state", async () => {
        const client = createWorkerDatabaseClient(this.env);
        const fallbackTaskSessionId =
          taskSessionState?.taskSessionId ??
          taskSessionId ??
          (await buildStableSessionId(
            "task-session",
            event.payload.tenantId,
            event.payload.runId,
            event.payload.runTaskId
          ));

        try {
          await persistAuthoritativeRunTaskStatus(client, {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId,
            runTaskId: authoritativeTaskRecord?.runTaskId ?? event.payload.runTaskId,
            executionEngine,
            taskSessionId: fallbackTaskSessionId,
            status: "failed"
          });
        } catch (statusError) {
          console.warn("Failed to persist task failure state during workflow error handling", statusError);
        } finally {
          await client.close();
        }

        return true;
      });

      throw error;
    } finally {
      if (taskSessionPrepared) {
        await step.do(
          preserveSandbox ? "preserve task session" : "teardown task session",
          async () => {
            const taskSession = getTaskSessionStub(
              this.env,
              event.payload.tenantId,
              event.payload.runId,
              taskSessionId!,
              event.payload.runTaskId
            );

            if (preserveSandbox) {
              await taskSession.preserveForInspection();
            } else {
              await taskSession.teardown();
            }

            return true;
          }
        );
      }
    }
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

async function runScriptedTask(
  env: WorkerBindings,
  step: WorkflowStep,
  payload: TaskWorkflowParams,
  runTaskId: string,
  taskSessionId: string,
  projectEnv: Record<string, string>,
  scriptedProcessCwd: string | null
): Promise<TaskExecutionSnapshot> {
  if (!scriptedProcessCwd) {
    throw new NonRetryableError(
      "The scripted execution engine currently supports only projects with exactly one materialized component."
    );
  }

  await step.do("start task process", async () => {
    const taskSession = getTaskSessionStub(
      env,
      payload.tenantId,
      payload.runId,
      taskSessionId,
      payload.runTaskId
    );

    const process = await taskSession.startProcess({
      command: "npm test",
      cwd: scriptedProcessCwd,
      env: projectEnv
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
        env,
        payload.tenantId,
        payload.runId,
        taskSessionId,
        payload.runTaskId
      );

      const processState = (await taskSession.pollProcess()) as TaskSessionState;

      return toWorkflowProcessSnapshot(processState.activeProcess);
    });

    if (latestProcessState && isTerminalProcessStatus(latestProcessState.status)) {
      break;
    }

    await step.sleep(`wait for task process ${attempt}`, "1 second");
  }

  if (!latestProcessState) {
    throw new NonRetryableError(`Task ${payload.taskId} did not produce an active process snapshot.`);
  }

  const logArtifactRefId = await step.do("persist task logs", async () => {
    const client = createWorkerDatabaseClient(env);

    try {
      const artifactKey = taskLogArtifactKey(
        payload.tenantId,
        payload.runId,
        runTaskId,
        latestProcessState.processId
      );
      const storageUri = `r2://keystone-artifacts-dev/${artifactKey}`;
      const existingArtifactRef = await findArtifactRefByObjectKey(client, {
        tenantId: payload.tenantId,
        bucket: "keystone-artifacts-dev",
        objectKey: artifactKey,
        runId: payload.runId,
        runTaskId,
        artifactKind: "task_log"
      });

      if (existingArtifactRef) {
        return existingArtifactRef.artifactRefId;
      }

      const taskSession = getTaskSessionStub(
        env,
        payload.tenantId,
        payload.runId,
        taskSessionId,
        payload.runTaskId
      );
      const processLogs = (await taskSession.getProcessLogs()) as
        | {
            processId: string;
            stdout: string;
            stderr: string;
          }
        | null;
      const recordedProcessLogs =
        processLogs ?? {
          processId: latestProcessState.processId,
          stdout: "",
          stderr: ""
        };
      const existingArtifact = await getArtifactBytes(env.ARTIFACTS_BUCKET, storageUri);
      const artifact =
        existingArtifact ??
        (await putArtifactBytes(
          env.ARTIFACTS_BUCKET,
          "keystone-artifacts-dev",
          artifactKey,
          buildProcessLogArtifactBody(recordedProcessLogs),
          {
            httpMetadata: {
              contentType: "application/x-ndjson; charset=utf-8"
            }
          }
        ));

      const artifactRef = await createArtifactRef(client, {
        tenantId: payload.tenantId,
        projectId: payload.project.projectId,
        runId: payload.runId,
        runTaskId,
        artifactKind: "task_log",
        storageBackend: artifact.storageBackend,
        bucket: "keystone-artifacts-dev",
        objectKey: artifact.key,
        objectVersion: artifact.objectVersion,
        etag: artifact.etag,
        contentType: "application/x-ndjson; charset=utf-8",
        sha256: artifact.sha256,
        sizeBytes: artifact.sizeBytes
      });

      if (!artifactRef) {
        throw new Error(`Task log artifact ref could not be created for ${payload.taskId}.`);
      }

      return artifactRef.artifactRefId;
    } finally {
      await client.close();
    }
  });

  return {
    processStatus: latestProcessState.status,
    exitCode: latestProcessState.exitCode,
    logArtifactRefId,
    promotedArtifactRefIds: []
  };
}

function getThinkAgentName(tenantId: string, runId: string, taskSessionId: string) {
  return `tenant:${tenantId}:run:${runId}:task:${taskSessionId}`;
}

function buildRuleSection(label: string, instructions: string[]) {
  if (instructions.length === 0) {
    return null;
  }

  return [label, ...instructions.map((instruction) => `- ${instruction}`)].join("\n");
}

function buildThinkImplementerPrompt(
  handoff: Awaited<ReturnType<typeof loadTaskHandoffArtifact>>,
  project?: {
    projectId: string;
    projectKey: string;
    displayName: string;
    componentCount: number;
    ruleSet: ProjectRuleSet;
    componentRuleOverrides: ProjectExecutionRuleOverride[];
  }
) {
  const instructions = handoff.task.instructions.map((instruction) => `- ${instruction}`).join("\n");
  const acceptanceCriteria = handoff.task.acceptanceCriteria
    .map((criterion) => `- ${criterion}`)
    .join("\n");
  const dependencySummary =
    handoff.task.dependsOn.length === 0 ? "none" : handoff.task.dependsOn.join(", ");
  const projectContext = project
    ? [
        `Project: ${project.displayName} (${project.projectKey})`,
        `Project ID: ${project.projectId}`
      ]
    : [];
  const reviewRules = project
    ? buildRuleSection("Project review instructions:", project.ruleSet.reviewInstructions)
    : null;
  const testRules = project
    ? buildRuleSection("Project test instructions:", project.ruleSet.testInstructions)
    : null;
  const componentRules =
    project && project.componentRuleOverrides.length > 0
      ? [
          "Component-specific rule overrides:",
          ...project.componentRuleOverrides.flatMap((override) => {
            const lines = [`- ${override.componentKey}`];

            if (override.reviewInstructions.length > 0) {
              lines.push(`  review: ${override.reviewInstructions.join("; ")}`);
            }

            if (override.testInstructions.length > 0) {
              lines.push(`  test: ${override.testInstructions.join("; ")}`);
            }

            return lines;
          })
        ].join("\n")
      : null;
  const commitGuidance =
    project && project.componentCount > 1
      ? "When you finish, if you changed workspace files, create a git commit in each changed component repo/worktree with a concise message, then stage a concise durable handoff note under /artifacts/out and leave the workspace in a test-passing state."
      : "When you finish, if you changed workspace files, create a git commit in the changed component repo/worktree with a concise message, then stage a concise durable handoff note under /artifacts/out and leave the workspace in a test-passing state.";

  return [
    `Run ID: ${handoff.runId}`,
    `Run task ID: ${handoff.runTaskId}`,
    `Task ID: ${handoff.task.taskId}`,
    `Task: ${handoff.task.title}`,
    `Depends on: ${dependencySummary}`,
    ...projectContext,
    "",
    handoff.task.summary,
    "",
    "Instructions:",
    instructions,
    "",
    "Acceptance criteria:",
    acceptanceCriteria,
    ...(reviewRules ? ["", reviewRules] : []),
    ...(testRules ? ["", testRules] : []),
    ...(componentRules ? ["", componentRules] : []),
    "",
    "Projected run planning documents, run_plan, and task_handoff artifacts are available under /artifacts/in if you need broader context before editing.",
    "",
    commitGuidance
  ].join("\n");
}

function resolveThinkTurnInput(
  projectExecution: ProjectExecutionSnapshot,
  handoff: Awaited<ReturnType<typeof loadTaskHandoffArtifact>>,
  executionEngine: ExecutionEngine
) {
  void projectExecution;
  void handoff;

  if (executionEngine === "think_live") {
    return {};
  }

  if (
    projectExecution.components.length === 1 &&
    projectExecution.components[0]?.type === "inline" &&
    projectExecution.components[0].repoUrl === "fixture://demo-target"
  ) {
    return {
      mockModelPlan: createThinkSmokePlan()
    };
  }

  throw new NonRetryableError(
    "The mock Think runtime currently supports only fixture-scoped compiled demo handoffs."
  );
}

function buildPromotedArtifactKey(
  tenantId: string,
  runId: string,
  runTaskId: string,
  stagedPath: string
) {
  const relativePath = path.relative("/artifacts/out", path.normalize(stagedPath));

  if (!relativePath || relativePath.startsWith("..")) {
    throw new Error(`Staged artifact ${stagedPath} is outside /artifacts/out.`);
  }

  return `${tenantRunPrefix(tenantId, runId)}/tasks/${encodeURIComponent(runTaskId)}/artifacts/${relativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function promoteStagedArtifacts(
  env: WorkerBindings,
  client: ReturnType<typeof createWorkerDatabaseClient>,
  input: {
    tenantId: string;
    projectId: string;
    runId: string;
    runTaskId: string;
    sessionId: string;
    taskId: string;
    sandboxId: string;
    agentBridge: NonNullable<TaskSessionState["workspace"]>["agentBridge"];
    stagedArtifacts: AgentRuntimeArtifact[];
  }
) {
  if (input.stagedArtifacts.length === 0) {
    return [];
  }

  const stagedArtifacts = input.stagedArtifacts.map((stagedArtifact) => ({
    ...stagedArtifact,
    kind: parseAgentRuntimeArtifactKind(stagedArtifact.kind)
  }));
  const artifactRefIds: string[] = [];
  let sandboxSession: Awaited<ReturnType<typeof ensureSandboxSession>>["session"] | null = null;

  for (const stagedArtifact of stagedArtifacts) {
    const artifactKind = stagedArtifact.kind;
    const artifactKey = buildPromotedArtifactKey(
      input.tenantId,
      input.runId,
      input.runTaskId,
      stagedArtifact.path
    );
    const storageUri = `r2://keystone-artifacts-dev/${artifactKey}`;
    const existingArtifactRef = await findArtifactRefByObjectKey(client, {
      tenantId: input.tenantId,
      bucket: "keystone-artifacts-dev",
      objectKey: artifactKey,
      runId: input.runId,
      runTaskId: input.runTaskId,
      artifactKind
    });

    if (existingArtifactRef) {
      artifactRefIds.push(existingArtifactRef.artifactRefId);
      continue;
    }

    const existingArtifact = await getArtifactBytes(env.ARTIFACTS_BUCKET, storageUri);
    let contentType =
      existingArtifact?.contentType ??
      stagedArtifact.contentType ??
      "application/octet-stream";
    const artifact =
      existingArtifact ??
      (await (async () => {
        if (!sandboxSession) {
          sandboxSession = (
            await ensureSandboxSession({
              env,
              sandboxId: input.sandboxId,
              sessionId: input.sessionId
            })
          ).session;
        }

        const file = await readSandboxAgentFile(
          {
            session: sandboxSession,
            bridge: input.agentBridge
          },
          stagedArtifact.path
        );

        contentType =
          file.mimeType ??
          stagedArtifact.contentType ??
          (file.isBinary ? "application/octet-stream" : "text/plain; charset=utf-8");

        return putArtifactBytes(
          env.ARTIFACTS_BUCKET,
          "keystone-artifacts-dev",
          artifactKey,
          decodeArtifactBody(file.content, file.encoding),
          {
            httpMetadata: {
              contentType
            }
          }
        );
      })());
    const artifactRef = await createArtifactRef(client, {
      tenantId: input.tenantId,
      projectId: input.projectId,
      runId: input.runId,
      runTaskId: input.runTaskId,
      artifactKind,
      storageBackend: artifact.storageBackend,
      bucket: "keystone-artifacts-dev",
      objectKey: artifact.key,
      objectVersion: artifact.objectVersion,
      etag: artifact.etag,
      contentType,
      sha256: artifact.sha256,
      sizeBytes: artifact.sizeBytes
    });

    if (!artifactRef) {
      throw new Error(`Artifact ref could not be created for ${stagedArtifact.path}.`);
    }

    artifactRefIds.push(artifactRef.artifactRefId);
  }

  return artifactRefIds;
}
