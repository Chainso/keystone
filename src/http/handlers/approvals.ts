import type { Context } from "hono";
import { z } from "zod";

import type { AppEnv } from "../../env";
import { getRunCoordinatorStub } from "../../lib/auth/tenant";
import { resolveApprovalRecord, getApprovalRecord } from "../../lib/db/approvals";
import { createWorkerDatabaseClient } from "../../lib/db/client";
import { appendSessionEvent } from "../../lib/db/events";
import { jsonErrorResponse, throwJsonHttpError } from "../../lib/http/errors";
import { buildRunWorkflowInstanceId } from "../../lib/workflows/ids";

const approvalResolutionSchema = z.object({
  resolution: z.enum(["approved", "rejected", "cancelled"]),
  data: z.record(z.string(), z.unknown()).optional()
});

export async function resolveApprovalHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const runId = context.req.param("runId");
  const approvalId = context.req.param("approvalId");

  if (!runId || !approvalId) {
    throwJsonHttpError(400, "invalid_path", "Run ID and approval ID are required.");
  }

  const body = approvalResolutionSchema.parse(await context.req.json());
  const client = createWorkerDatabaseClient(context.env);

  try {
    const approval = await getApprovalRecord(client, {
      tenantId: auth.tenantId,
      approvalId
    });

    if (!approval || approval.runId !== runId) {
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

    await appendSessionEvent(client, {
      tenantId: auth.tenantId,
      runId,
      sessionId: approval.sessionId,
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

    if (updated.waitEventType) {
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

    return context.json({
      approvalId,
      runId,
      status: updated.status,
      resolvedAt:
        updated.resolvedAt == null ? null : new Date(updated.resolvedAt).toISOString()
    });
  } finally {
    await client.close();
  }
}
