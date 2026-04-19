import type { Context } from "hono";
import { z } from "zod";

import type { AppEnv } from "../../../../env";
import { decisionPackageSchema } from "../../../../keystone/compile/contracts";
import { getRunCoordinatorStub } from "../../../../lib/auth/tenant";
import { listRunArtifacts } from "../../../../lib/db/artifacts";
import {
  getApprovalRecord,
  listRunApprovalRecords,
  resolveApprovalRecord
} from "../../../../lib/db/approvals";
import { createWorkerDatabaseClient } from "../../../../lib/db/client";
import { appendSessionEvent, listRunEvents } from "../../../../lib/db/events";
import { getProject } from "../../../../lib/db/projects";
import {
  createRunSessionMirror,
  deleteRunSessionMirror,
  getRunRecord,
  listRunSessions
} from "../../../../lib/db/runs";
import { jsonErrorResponse, throwJsonHttpError } from "../../../../lib/http/errors";
import {
  resolveRunExecutionEngine,
  resolveRunExecutionOptions
} from "../../../../lib/runs/options";
import { buildRunWorkflowInstanceId } from "../../../../lib/workflows/ids";
import { jsonNotImplementedResponse } from "../common/not-implemented";
import { artifactCollectionEnvelopeSchema } from "../artifacts/contracts";
import {
  approvalActionEnvelopeSchema,
  approvalCollectionEnvelopeSchema,
  approvalDetailEnvelopeSchema,
  evidenceBundleDetailEnvelopeSchema,
  integrationRecordDetailEnvelopeSchema,
  releaseDetailEnvelopeSchema,
  runActionEnvelopeSchema,
  runCreateRequestSchema,
  runDetailEnvelopeSchema,
  taskCollectionEnvelopeSchema,
  taskConversationDetailEnvelopeSchema,
  taskConversationMessageWriteInputSchema,
  taskDetailEnvelopeSchema,
  workflowGraphDetailEnvelopeSchema
} from "./contracts";
import {
  loadRunPlanSummary,
  projectApprovalResource,
  projectArtifactResource,
  projectRunResource,
  projectTaskConversationResource,
  projectTaskResources,
  projectWorkflowGraphResource
} from "./projections";

const approvalResolutionSchema = z.object({
  resolution: z.enum(["approved", "rejected", "cancelled"]),
  data: z.record(z.string(), z.unknown()).optional()
});

function parseRunCreateInput(value: unknown) {
  const result = runCreateRequestSchema.safeParse(value);

  if (!result.success) {
    throwJsonHttpError(400, "invalid_request", "Run request validation failed.", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        code: issue.code
      }))
    });
  }

  return result.data;
}

function parseApprovalResolution(value: unknown) {
  const result = approvalResolutionSchema.safeParse(value);

  if (!result.success) {
    throwJsonHttpError(400, "invalid_request", "Approval resolution validation failed.", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        code: issue.code
      }))
    });
  }

  return result.data;
}

async function loadRunState(context: Context<AppEnv>, runId: string) {
  const auth = context.get("auth");
  const client = createWorkerDatabaseClient(context.env);

  try {
    const [runRecord, sessions] = await Promise.all([
      getRunRecord(client, {
        tenantId: auth.tenantId,
        runId
      }),
      listRunSessions(client, auth.tenantId, runId)
    ]);

    if (!runRecord && sessions.length === 0) {
      await client.close();
      return null;
    }

    const [events, artifacts, runPlanSummary] = await Promise.all([
      listRunEvents(client, {
        tenantId: auth.tenantId,
        runId
      }),
      listRunArtifacts(client, auth.tenantId, runId),
      loadRunPlanSummary(context.env, auth.tenantId, runId)
    ]);

    return {
      auth,
      client,
      runRecord,
      sessions,
      events,
      artifacts,
      runPlanSummary
    };
  } catch (error) {
    await client.close();
    throw error;
  }
}

function requireRunId(context: Context<AppEnv>) {
  const runId = context.req.param("runId");

  if (!runId) {
    throwJsonHttpError(400, "invalid_path", "Run ID is required.");
  }

  return runId;
}

function requireTaskId(context: Context<AppEnv>) {
  const taskId = context.req.param("taskId");

  if (!taskId) {
    throwJsonHttpError(400, "invalid_path", "Task ID is required.");
  }

  return taskId;
}

function requireApprovalId(context: Context<AppEnv>) {
  const approvalId = context.req.param("approvalId");

  if (!approvalId) {
    throwJsonHttpError(400, "invalid_path", "Approval ID is required.");
  }

  return approvalId;
}

export async function createRunHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const input = parseRunCreateInput(await context.req.json());

  if (input.decisionPackage.source !== "inline") {
    return jsonNotImplementedResponse({
      resourceType: "run",
      implementation: "projected",
      operation: "POST",
      route: "/v1/runs",
      reason:
        "Phase 2 reuses the current workflow launcher, which only supports inline decision-package payloads."
    });
  }

  const executionEngine = resolveRunExecutionEngine(
    context.req.header("X-Keystone-Agent-Runtime")
  );
  const options = resolveRunExecutionOptions(input.options);
  const runId = crypto.randomUUID();
  const workflowInstanceId = buildRunWorkflowInstanceId(auth.tenantId, runId);
  const client = createWorkerDatabaseClient(context.env);
  let mirroredRunSessionId: string | null = null;
  let workflowCreated = false;

  try {
    const project = await getProject(client, {
      tenantId: auth.tenantId,
      projectId: input.projectId
    });

    if (!project) {
      return jsonErrorResponse(
        "project_not_found",
        `Project ${input.projectId} was not found.`,
        404
      );
    }

    const { session, runRecord } = await createRunSessionMirror(client, {
      sessionSpec: {
        tenantId: auth.tenantId,
        runId,
        sessionType: "run",
        metadata: {
          authMode: auth.authMode,
          project: {
            projectId: project.projectId,
            projectKey: project.projectKey,
            displayName: project.displayName
          },
          decisionPackageId: input.decisionPackage.payload.decisionPackageId,
          decisionPackageSummary: input.decisionPackage.payload.summary,
          decisionPackage: input.decisionPackage,
          executionEngine,
          runtime: executionEngine,
          options
        }
      },
      projectId: project.projectId,
      workflowInstanceId,
      executionEngine
    });
    mirroredRunSessionId = session.sessionId;

    const now = new Date();
    const acceptedResponse = runActionEnvelopeSchema.parse({
      data: {
        status: "accepted",
        workflowInstanceId,
        run: projectRunResource({
          tenantId: auth.tenantId,
          runId,
          runRecord,
          sessions: [
            {
              tenantId: auth.tenantId,
              sessionId: session.sessionId,
              runId,
              sessionType: "run",
              status: session.status,
              parentSessionId: null,
              createdAt: session.createdAt instanceof Date ? session.createdAt : now,
              updatedAt: session.updatedAt instanceof Date ? session.updatedAt : now,
              metadata: {
                ...(typeof session.metadata === "object" && session.metadata !== null
                  ? session.metadata
                  : {}),
                project: {
                  projectId: project.projectId,
                  projectKey: project.projectKey,
                  displayName: project.displayName
                },
                decisionPackageId: input.decisionPackage.payload.decisionPackageId,
                decisionPackageSummary: input.decisionPackage.payload.summary,
                decisionPackage: input.decisionPackage,
                executionEngine,
                runtime: executionEngine,
                options
              }
            }
          ],
          events: [],
          artifacts: [],
          liveSnapshot: {
            tenantId: auth.tenantId,
            runId,
            status: session.status,
            updatedAt: (session.updatedAt instanceof Date ? session.updatedAt : now).toISOString(),
            websocketCount: 0,
            latestEvent: null,
            eventCount: 1
          },
          runPlanSummary: {
            decisionPackageId: input.decisionPackage.payload.decisionPackageId,
            summary: input.decisionPackage.payload.summary
          }
        })
      },
      meta: {
        apiVersion: "v1",
        envelope: "action",
        resourceType: "run"
      }
    });

    await appendSessionEvent(client, {
      tenantId: auth.tenantId,
      runId,
      sessionId: session.sessionId,
      eventType: "session.started",
      actor: "keystone",
      payload: {
        inputMode: {
          project: "stored",
          decisionPackage: input.decisionPackage.source
        }
      }
    });

    const coordinator = getRunCoordinatorStub(context.env, auth.tenantId, runId);
    await coordinator.initialize({
      tenantId: auth.tenantId,
      runId,
      status: session.status
    });
    await coordinator.publish({
      eventType: "session.started",
      severity: "info",
      status: session.status
    });
    await context.env.RUN_WORKFLOW.create({
      id: workflowInstanceId,
      params: {
        tenantId: auth.tenantId,
        runId,
        runSessionId: session.sessionId,
        projectId: project.projectId,
        decisionPackage: {
          source: "payload",
          payload: decisionPackageSchema.parse(input.decisionPackage.payload)
        },
        executionEngine,
        runtime: executionEngine,
        options
      }
    });
    workflowCreated = true;

    return context.json(acceptedResponse, 202);
  } catch (error) {
    if (mirroredRunSessionId && !workflowCreated) {
      const cleanupErrors: unknown[] = [];

      try {
        await deleteRunSessionMirror(client, {
          tenantId: auth.tenantId,
          runId,
          sessionId: mirroredRunSessionId
        });
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }

      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          "Run creation failed and mirror cleanup did not complete."
        );
      }
    }

    throw error;
  } finally {
    await client.close();
  }
}

export async function getRunHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const liveSnapshot = await getRunCoordinatorStub(context.env, state.auth.tenantId, runId).getSnapshot();
    const run = projectRunResource({
      tenantId: state.auth.tenantId,
      runId,
      runRecord: state.runRecord,
      sessions: state.sessions,
      events: state.events,
      artifacts: state.artifacts,
      liveSnapshot,
      runPlanSummary: state.runPlanSummary
    });

    return context.json(
      runDetailEnvelopeSchema.parse({
        data: run,
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "run"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function getRunWorkflowGraphHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const tasks = projectTaskResources({
      tenantId: state.auth.tenantId,
      runId,
      events: state.events,
      runPlanSummary: state.runPlanSummary
    });
    const graph = projectWorkflowGraphResource({
      tenantId: state.auth.tenantId,
      runId,
      tasks
    });

    return context.json(
      workflowGraphDetailEnvelopeSchema.parse({
        data: graph,
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "workflow_graph"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function listRunTasksHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const tasks = projectTaskResources({
      tenantId: state.auth.tenantId,
      runId,
      events: state.events,
      runPlanSummary: state.runPlanSummary
    });

    return context.json(
      taskCollectionEnvelopeSchema.parse({
        data: {
          items: tasks,
          total: tasks.length
        },
        meta: {
          apiVersion: "v1",
          envelope: "collection",
          resourceType: "task"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function getTaskHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const taskId = requireTaskId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const task = projectTaskResources({
      tenantId: state.auth.tenantId,
      runId,
      events: state.events,
      runPlanSummary: state.runPlanSummary
    }).find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return jsonErrorResponse(
        "task_not_found",
        `Task ${taskId} was not found for run ${runId}.`,
        404
      );
    }

    return context.json(
      taskDetailEnvelopeSchema.parse({
        data: task,
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "task"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function getTaskConversationHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const taskId = requireTaskId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const task = projectTaskResources({
      tenantId: state.auth.tenantId,
      runId,
      events: state.events,
      runPlanSummary: state.runPlanSummary
    }).find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return jsonErrorResponse(
        "task_not_found",
        `Task ${taskId} was not found for run ${runId}.`,
        404
      );
    }

    const conversation = projectTaskConversationResource({
      tenantId: state.auth.tenantId,
      runId,
      taskId,
      events: state.events
    });

    return context.json(
      taskConversationDetailEnvelopeSchema.parse({
        data: conversation,
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "task_conversation"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function postTaskConversationMessageHandler(context: Context<AppEnv>) {
  taskConversationMessageWriteInputSchema.parse(await context.req.json());

  return jsonNotImplementedResponse({
    resourceType: "task_conversation_message",
    implementation: "projected",
    operation: "POST",
    route: "/v1/runs/:runId/tasks/:taskId/conversation/messages",
    reason:
      "Phase 2 keeps manual operator steering as a frozen contract without adding new message persistence or delivery behavior yet."
  });
}

export async function listTaskArtifactsHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const taskId = requireTaskId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const task = projectTaskResources({
      tenantId: state.auth.tenantId,
      runId,
      events: state.events,
      runPlanSummary: state.runPlanSummary
    }).find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return jsonErrorResponse(
        "task_not_found",
        `Task ${taskId} was not found for run ${runId}.`,
        404
      );
    }

    const items = state.artifacts
      .filter((artifact) => artifact.taskId === taskId)
      .map(projectArtifactResource);

    return context.json(
      artifactCollectionEnvelopeSchema.parse({
        data: {
          items,
          total: items.length
        },
        meta: {
          apiVersion: "v1",
          envelope: "collection",
          resourceType: "artifact"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function listRunApprovalsHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const approvals = await listRunApprovalRecords(state.client, {
      tenantId: state.auth.tenantId,
      runId
    });
    const sessionById = new Map(state.sessions.map((session) => [session.sessionId, session]));
    const items = approvals.map((approval) => projectApprovalResource(approval, sessionById));

    return context.json(
      approvalCollectionEnvelopeSchema.parse({
        data: {
          items,
          total: items.length
        },
        meta: {
          apiVersion: "v1",
          envelope: "collection",
          resourceType: "approval"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function getApprovalHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const runId = requireRunId(context);
  const approvalId = requireApprovalId(context);
  const client = createWorkerDatabaseClient(context.env);

  try {
    const [approval, sessions] = await Promise.all([
      getApprovalRecord(client, {
        tenantId: auth.tenantId,
        approvalId
      }),
      listRunSessions(client, auth.tenantId, runId)
    ]);

    if (!approval || approval.runId !== runId || sessions.length === 0) {
      return jsonErrorResponse(
        "approval_not_found",
        `Approval ${approvalId} was not found for run ${runId}.`,
        404
      );
    }

    return context.json(
      approvalDetailEnvelopeSchema.parse({
        data: projectApprovalResource(
          approval,
          new Map(sessions.map((session) => [session.sessionId, session]))
        ),
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "approval"
        }
      })
    );
  } finally {
    await client.close();
  }
}

export async function resolveApprovalHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const runId = requireRunId(context);
  const approvalId = requireApprovalId(context);
  const body = parseApprovalResolution(await context.req.json());
  const client = createWorkerDatabaseClient(context.env);

  try {
    const [approval, sessions] = await Promise.all([
      getApprovalRecord(client, {
        tenantId: auth.tenantId,
        approvalId
      }),
      listRunSessions(client, auth.tenantId, runId)
    ]);

    if (!approval || approval.runId !== runId || sessions.length === 0) {
      return jsonErrorResponse(
        "approval_not_found",
        `Approval ${approvalId} was not found for run ${runId}.`,
        404
      );
    }

    const updated = await resolveApprovalRecord(client, {
      tenantId: auth.tenantId,
      approvalId,
      status: body.resolution,
      resolution: body.data ?? {}
    });

    if (!updated) {
      throwJsonHttpError(500, "approval_update_failed", "Approval update returned no row.");
    }

    if (!updated.resolutionMatchesRequest) {
      return jsonErrorResponse(
        "approval_already_resolved",
        `Approval ${approvalId} was already resolved as ${updated.status}.`,
        409
      );
    }

    const approvalSession = sessions.find((session) => session.sessionId === approval.sessionId);
    const taskId =
      approvalSession?.metadata &&
      typeof approvalSession.metadata === "object" &&
      "taskId" in approvalSession.metadata &&
      typeof approvalSession.metadata.taskId === "string" &&
      approvalSession.metadata.taskId.trim().length > 0
        ? approvalSession.metadata.taskId
        : undefined;

    if (updated.resolutionApplied) {
      await appendSessionEvent(client, {
        tenantId: auth.tenantId,
        runId,
        sessionId: approval.sessionId,
        taskId,
        eventType: "approval.resolved",
        actor: `user:${auth.tenantId}`,
        payload: {
          approvalId,
          resolution: body.resolution
        }
      });

      const coordinator = getRunCoordinatorStub(context.env, auth.tenantId, runId);
      await coordinator.publish({
        eventType: "approval.resolved",
        severity: "info"
      });
    }

    if (updated.waitEventType && (updated.resolutionApplied || approvalSession?.status === "paused_for_approval")) {
      const workflow = await context.env.RUN_WORKFLOW.get(
        buildRunWorkflowInstanceId(auth.tenantId, runId)
      );

      await workflow.sendEvent({
        type: updated.waitEventType,
        payload: {
          approvalId,
          resolution: body.resolution
        }
      });
    }

    return context.json(
      approvalActionEnvelopeSchema.parse({
        data: projectApprovalResource(
          {
            ...approval,
            ...updated
          },
          new Map(sessions.map((session) => [session.sessionId, session]))
        ),
        meta: {
          apiVersion: "v1",
          envelope: "action",
          resourceType: "approval"
        }
      })
    );
  } finally {
    await client.close();
  }
}

export async function getEvidenceHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const runId = requireRunId(context);

  return context.json(
    evidenceBundleDetailEnvelopeSchema.parse({
      data: {
        resourceType: "evidence_bundle",
        scaffold: {
          implementation: "stub",
          note: "Evidence bundles are not materialized yet."
        },
        tenantId: auth.tenantId,
        runId,
        evidenceBundleId: `stub-evidence-${runId}`,
        status: "stub",
        summary: null,
        artifactIds: [],
        updatedAt: null
      },
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "evidence_bundle"
      }
    })
  );
}

export async function getIntegrationHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const runId = requireRunId(context);

  return context.json(
    integrationRecordDetailEnvelopeSchema.parse({
      data: {
        resourceType: "integration_record",
        scaffold: {
          implementation: "stub",
          note: "Integration records are not materialized yet."
        },
        tenantId: auth.tenantId,
        runId,
        integrationRecordId: `stub-integration-${runId}`,
        status: "stub",
        summary: null,
        artifactIds: [],
        updatedAt: null
      },
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "integration_record"
      }
    })
  );
}

export async function getReleaseHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const runId = requireRunId(context);

  return context.json(
    releaseDetailEnvelopeSchema.parse({
      data: {
        resourceType: "release",
        scaffold: {
          implementation: "stub",
          note: "Release records are not materialized yet."
        },
        tenantId: auth.tenantId,
        runId,
        releaseId: `stub-release-${runId}`,
        status: "stub",
        summary: null,
        artifactIds: [],
        updatedAt: null
      },
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "release"
      }
    })
  );
}

export async function getRunEventsHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    return context.json({
      tenantId: state.auth.tenantId,
      runId,
      total: state.events.length,
      events: state.events.map((event) => ({
        eventId: event.eventId,
        sessionId: event.sessionId,
        taskId: event.taskId,
        seq: event.seq,
        eventType: event.eventType,
        actor: event.actor,
        severity: event.severity,
        timestamp: event.ts.toISOString(),
        artifactRefId: event.artifactRefId,
        payload: event.payload
      }))
    });
  } finally {
    await state.client.close();
  }
}
