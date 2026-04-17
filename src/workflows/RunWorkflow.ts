import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowInstanceStatus,
  type WorkflowStep
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";

import type { WorkerBindings } from "../env";
import { getRunCoordinatorStub } from "../lib/auth/tenant";
import { ensureApprovalRequest } from "../lib/approvals/service";
import { createWorkerDatabaseClient } from "../lib/db/client";
import { getProject } from "../lib/db/projects";
import type { AgentRuntimeKind } from "../maestro/contracts";
import { getSessionRecord, updateSessionStatus } from "../lib/db/runs";
import { appendAndPublishRunEvent } from "../lib/events/publish";
import { demoDecisionPackageFixture } from "../lib/fixtures/demo-decision-package";
import {
  buildProjectExecutionSnapshot,
  type ProjectExecutionSnapshot
} from "../lib/projects/runtime";
import type { RunExecutionOptions } from "../lib/runs/options";
import {
  isLiveThinkExecution,
  isMockThinkExecution,
  resolveRunExecutionOptions
} from "../lib/runs/options";
import { evaluateRepoSourcePolicy } from "../lib/security/policy";
import {
  buildRunWorkflowInstanceId,
  buildStableSessionId,
  buildTaskWorkflowInstanceId
} from "../lib/workflows/ids";
import {
  ensureSessionRecord,
  loadExistingRunPlan,
  resolveRunAgentRuntime
} from "../lib/workflows/idempotency";
import {
  compileDemoFixtureRunPlan,
  compileRunPlan,
  type CompileRepoSource
} from "../keystone/compile/plan-run";
import { decisionPackageSchema, type DecisionPackage } from "../keystone/compile/contracts";
import { finalizeRun } from "../keystone/integration/finalize-run";
import {
  assertFixtureScopedCompiledPlan,
  loadCompiledRunPlanArtifact
} from "../keystone/tasks/load-task-contracts";
import { isTerminalWorkflowInstanceStatus } from "../keystone/tasks/task-status";

export type RunWorkflowDecisionPackageInput =
  | {
      source: "payload";
      payload: Record<string, unknown>;
    }
  | {
      source: "localPath";
      localPath: string;
    };

export interface RunWorkflowParams {
  tenantId: string;
  runId: string;
  runSessionId?: string | undefined;
  projectId: string;
  decisionPackage?: RunWorkflowDecisionPackageInput | undefined;
  runtime?: AgentRuntimeKind | undefined;
  options?: RunExecutionOptions | undefined;
}

const DEFAULT_MAX_TASK_POLL_ATTEMPTS = 20;
const LIVE_THINK_MAX_TASK_POLL_ATTEMPTS = 120;

interface TaskWorkflowOutput {
  taskId: string;
  taskSessionId: string;
  processStatus: string;
  exitCode: number | null;
  logArtifactRefId: string | null;
  workflowStatus: string;
}

interface TaskWorkflowStatusSnapshot {
  taskInstanceId: string;
  status: WorkflowInstanceStatus;
  errorMessage: string | null;
  output: TaskWorkflowOutput | null;
}

interface FinalizeRunSnapshot {
  finalStatus: string;
  runSummaryArtifactRefId: string;
  successfulTasks: number;
  failedTasks: number;
}

interface ApprovalResolutionPayload {
  approvalId: string;
  resolution: "approved" | "rejected" | "cancelled";
}

interface RunContextSnapshot {
  runSessionId: string;
  workflowInstanceId: string;
  projectExecution: ProjectExecutionSnapshot;
  runtime: AgentRuntimeKind;
  options: RunExecutionOptions;
}

function resolveDecisionPackage(
  decisionPackageInput: RunWorkflowDecisionPackageInput | undefined
): DecisionPackage {
  if (!decisionPackageInput) {
    return demoDecisionPackageFixture;
  }

  if (decisionPackageInput.source === "payload") {
    return decisionPackageSchema.parse(decisionPackageInput.payload);
  }

  if (decisionPackageInput.localPath.endsWith("fixtures/demo-decision-package/decision-package.json")) {
    return demoDecisionPackageFixture;
  }

  throw new NonRetryableError(
    "Only inline decision-package payloads and the committed demo fixture path are supported before broader repo ingestion lands."
  );
}

export function shouldUseFixtureCompileForRun(
  repo: CompileRepoSource,
  decisionPackage: DecisionPackage,
  runtime: AgentRuntimeKind,
  options: RunExecutionOptions
) {
  return (
    isMockThinkExecution(runtime, options) &&
    repo.source === "localPath" &&
    repo.localPath.endsWith("fixtures/demo-target") &&
    decisionPackage.decisionPackageId === "demo-greeting-update"
  );
}

export class RunWorkflow extends WorkflowEntrypoint<WorkerBindings, RunWorkflowParams> {
  async run(event: Readonly<WorkflowEvent<RunWorkflowParams>>, step: WorkflowStep) {
    const decisionPackage = resolveDecisionPackage(event.payload.decisionPackage);
    const runSessionId =
      event.payload.runSessionId ??
      (await buildStableSessionId("run-session", event.payload.tenantId, event.payload.runId));
    const workflowInstanceId = buildRunWorkflowInstanceId(event.payload.tenantId, event.payload.runId);

    const runContext = (await step.do("load run context", async () => {
      const client = createWorkerDatabaseClient(this.env);

      try {
        const project = await getProject(client, {
          tenantId: event.payload.tenantId,
          projectId: event.payload.projectId
        });

        if (!project) {
          throw new NonRetryableError(
            `Project ${event.payload.projectId} was not found for tenant ${event.payload.tenantId}.`
          );
        }

        const projectExecution = buildProjectExecutionSnapshot(project);
        const session = await ensureSessionRecord(
          client,
          {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId,
            sessionType: "run",
            metadata: {
              project: {
                projectId: project.projectId,
                projectKey: project.projectKey,
                displayName: project.displayName
              },
              decisionPackageId: decisionPackage.decisionPackageId,
              workflowInstanceId
            }
          },
          runSessionId
        );

        let currentSession =
          session ?? (await getSessionRecord(client, event.payload.tenantId, runSessionId));

        if (!currentSession) {
          throw new Error(`Run session ${runSessionId} could not be loaded.`);
        }

        const statusMetadata = {
          project: {
            projectId: project.projectId,
            projectKey: project.projectKey,
            displayName: project.displayName,
            componentKeys: projectExecution.components.map((component) => component.componentKey),
            envVarNames: Object.keys(projectExecution.environment),
            ruleSet: projectExecution.ruleSet,
            componentRuleOverrides: projectExecution.componentRuleOverrides
          },
          decisionPackageId: decisionPackage.decisionPackageId,
          workflowInstanceId,
          runtime: resolveRunAgentRuntime(event.payload.runtime, currentSession.metadata),
          options: resolveRunExecutionOptions(event.payload.options, currentSession.metadata)
        };

        if (currentSession.status === "configured") {
          currentSession = await updateSessionStatus(client, {
            tenantId: event.payload.tenantId,
            sessionId: runSessionId,
            status: "provisioning",
            metadata: statusMetadata
          });
        }

        if (currentSession?.status === "provisioning") {
          currentSession = await updateSessionStatus(client, {
            tenantId: event.payload.tenantId,
            sessionId: runSessionId,
            status: "ready",
            metadata: statusMetadata
          });
        }

        const activatedThisRun = currentSession?.status === "ready";

        if (activatedThisRun) {
          currentSession = await updateSessionStatus(client, {
            tenantId: event.payload.tenantId,
            sessionId: runSessionId,
            status: "active",
            metadata: statusMetadata
          });
        }

        if (!currentSession) {
          throw new Error(`Run session ${runSessionId} did not resolve to a durable session row.`);
        }

        const coordinator = getRunCoordinatorStub(this.env, event.payload.tenantId, event.payload.runId);
        await coordinator.initialize({
          tenantId: event.payload.tenantId,
          runId: event.payload.runId,
          status: currentSession.status as "active" | "archived" | "cancelled" | "configured" | "failed" | "paused_for_approval" | "provisioning" | "ready"
        });

        if (activatedThisRun || currentSession.status === "active") {
          await appendAndPublishRunEvent(client, this.env, {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId,
            sessionId: runSessionId,
            eventType: "session.status_changed",
            payload: {
              status: "active",
              phase: "run-workflow"
            },
            status: "active"
          });
        }

        return {
          runSessionId,
          workflowInstanceId,
          projectExecution,
          runtime: statusMetadata.runtime,
          options: statusMetadata.options
        };
      } finally {
        await client.close();
      }
    })) as RunContextSnapshot;

    const repoPolicyDecision = evaluateRepoSourcePolicy(runContext.projectExecution.compileRepo);

    if (repoPolicyDecision.result === "deny") {
      throw new NonRetryableError(repoPolicyDecision.reason);
    }

    if (repoPolicyDecision.result === "require_approval") {
      const approvalRequest = await step.do("request repo approval", async () => {
        const client = createWorkerDatabaseClient(this.env);

        try {
          return ensureApprovalRequest(client, this.env, {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId,
            sessionId: runSessionId,
              approvalType: repoPolicyDecision.approvalType ?? "outbound_network",
              reason: repoPolicyDecision.reason,
              metadata: {
                projectId: event.payload.projectId,
                repo: runContext.projectExecution.compileRepo
              }
          });
        } finally {
          await client.close();
        }
      });

      const approvalResolution = await step.waitForEvent<ApprovalResolutionPayload>(
        "wait for repo approval",
        {
          type: approvalRequest.waitEventType
        }
      );

      await step.do("apply repo approval resolution", async () => {
        const client = createWorkerDatabaseClient(this.env);

        try {
          const resolution = approvalResolution.payload.resolution;
          const session = await getSessionRecord(client, event.payload.tenantId, runSessionId);

          if (!session) {
            throw new Error(`Run session ${runSessionId} was not found while applying approval resolution.`);
          }

          if (resolution === "approved") {
            const resumedSession =
              session.status === "paused_for_approval"
                ? await updateSessionStatus(client, {
                    tenantId: event.payload.tenantId,
                    sessionId: runSessionId,
                    status: "active",
                    metadata: {
                      ...(session.metadata ?? {}),
                      resumedFromApprovalId: approvalResolution.payload.approvalId
                    }
                  })
                : session;

            await appendAndPublishRunEvent(client, this.env, {
              tenantId: event.payload.tenantId,
              runId: event.payload.runId,
              sessionId: runSessionId,
              eventType: "session.status_changed",
              payload: {
                status: "active",
                phase: "approval.resume"
              },
              status: resumedSession?.status === "active" ? "active" : undefined
            });

            return {
              resolution
            };
          }

          if (session.status === "paused_for_approval") {
            await updateSessionStatus(client, {
              tenantId: event.payload.tenantId,
              sessionId: runSessionId,
              status: "cancelled",
              metadata: {
                ...(session.metadata ?? {}),
                cancelledByApprovalId: approvalResolution.payload.approvalId
              }
            });
          }

          throw new NonRetryableError(
            `Repo access approval ${approvalResolution.payload.approvalId} resolved as ${resolution}.`
          );
        } finally {
          await client.close();
        }
      });
    }

    const compileSummary = await step.do("compile plan", async () => {
      const existingPlan = await loadExistingRunPlan(this.env, event.payload.tenantId, event.payload.runId);

      if (existingPlan) {
        return {
          taskCount: existingPlan.tasks.length,
          decisionPackageId: existingPlan.decisionPackageId
        };
      }

      const client = createWorkerDatabaseClient(this.env);
      const compileSessionId = await buildStableSessionId(
        "compile-session",
        event.payload.tenantId,
        event.payload.runId
      );

      try {
        await ensureSessionRecord(
          client,
          {
            tenantId: event.payload.tenantId,
            runId: event.payload.runId,
            sessionType: "compile",
            parentSessionId: runSessionId,
            metadata: {
              workflowInstanceId
            }
          },
          compileSessionId
        );

        const compile = shouldUseFixtureCompileForRun(
          runContext.projectExecution.compileRepo,
          decisionPackage,
          runContext.runtime,
          runContext.options
        )
          ? compileDemoFixtureRunPlan
          : compileRunPlan;
        const result = await compile({
          env: this.env,
          client,
          tenantId: event.payload.tenantId,
          runId: event.payload.runId,
          runSessionId,
          compileSessionId,
          repo: runContext.projectExecution.compileRepo,
          decisionPackage
        });

        return {
          taskCount: result.plan.tasks.length,
          decisionPackageId: result.plan.decisionPackageId
        };
      } finally {
        await client.close();
      }
    });

    const taskInstanceIds = await step.do("fanout tasks", async () => {
      const plan = await loadCompiledRunPlanArtifact(this.env, event.payload.tenantId, event.payload.runId);

      if (isLiveThinkExecution(runContext.runtime, runContext.options)) {
        try {
          assertFixtureScopedCompiledPlan(
            plan,
            decisionPackage,
            "Persisted live Think plan"
          );
        } catch (error) {
          throw new NonRetryableError(
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      const batch = plan.tasks.map((task) => ({
        id: buildTaskWorkflowInstanceId(event.payload.tenantId, event.payload.runId, task.taskId),
        params: {
          tenantId: event.payload.tenantId,
          runId: event.payload.runId,
          runSessionId,
          taskId: task.taskId,
          project: {
            projectId: runContext.projectExecution.projectId,
            projectKey: runContext.projectExecution.projectKey,
            displayName: runContext.projectExecution.displayName
          },
          runtime: runContext.runtime,
          options: runContext.options
        }
      }));

      await Promise.all(batch.map((entry) => this.env.TASK_WORKFLOW.create(entry)));

      return batch.map((entry) => entry.id as string);
    });

    let taskResults: TaskWorkflowOutput[] = [];
    const maxTaskPollAttempts = isLiveThinkExecution(runContext.runtime, runContext.options)
      ? LIVE_THINK_MAX_TASK_POLL_ATTEMPTS
      : DEFAULT_MAX_TASK_POLL_ATTEMPTS;

    for (let attempt = 0; attempt < maxTaskPollAttempts; attempt += 1) {
      const pollSnapshot: TaskWorkflowStatusSnapshot[] = await step.do(
        `poll task workflows ${attempt}`,
        async () => {
        const statuses = await Promise.all(
          taskInstanceIds.map(async (taskInstanceId) => {
            const instance = await this.env.TASK_WORKFLOW.get(taskInstanceId);
            const status = await instance.status();

            return {
              taskInstanceId,
              status: status.status,
              errorMessage: status.error?.message ?? null,
              output: parseTaskWorkflowOutput(status.output)
            };
          })
        );

        return statuses;
        }
      );

      if (pollSnapshot.every((status) => isTerminalWorkflowInstanceStatus(status.status))) {
        taskResults = pollSnapshot.map((status) =>
          status.output ?? {
            taskId: status.taskInstanceId,
            taskSessionId: "",
            processStatus: status.status,
            exitCode: null,
            logArtifactRefId: null,
            workflowStatus: status.status
          }
        );
        break;
      }

      await step.sleep(`wait for task workflows ${attempt}`, "1 second");
    }

    if (taskResults.length === 0) {
      throw new NonRetryableError("Task workflows did not reach a terminal state within the polling window.");
    }

    const finalizedRun: FinalizeRunSnapshot = await step.do("finalize run", async () => {
      const client = createWorkerDatabaseClient(this.env);

      try {
        const result = await finalizeRun(this.env, client, {
          tenantId: event.payload.tenantId,
          runId: event.payload.runId,
          runSessionId,
          taskResults
        });

        return {
          finalStatus: result.finalStatus,
          runSummaryArtifactRefId: result.artifactRef.artifactRefId,
          successfulTasks: result.summary.successfulTasks,
          failedTasks: result.summary.failedTasks
        };
      } finally {
        await client.close();
      }
    });

    return {
      runId: event.payload.runId,
      runSessionId,
      workflowInstanceId,
      taskCount: compileSummary.taskCount,
      decisionPackageId: compileSummary.decisionPackageId,
      finalStatus: finalizedRun.finalStatus,
      runSummaryArtifactRefId: finalizedRun.runSummaryArtifactRefId
    };
  }
}

function parseTaskWorkflowOutput(value: unknown): TaskWorkflowOutput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  return {
    taskId: typeof candidate.taskId === "string" ? candidate.taskId : "",
    taskSessionId: typeof candidate.taskSessionId === "string" ? candidate.taskSessionId : "",
    processStatus: typeof candidate.processStatus === "string" ? candidate.processStatus : "unknown",
    exitCode: typeof candidate.exitCode === "number" ? candidate.exitCode : null,
    logArtifactRefId: typeof candidate.logArtifactRefId === "string" ? candidate.logArtifactRefId : null,
    workflowStatus: typeof candidate.workflowStatus === "string" ? candidate.workflowStatus : "unknown"
  };
}
