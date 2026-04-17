import type { WorkerBindings } from "../../env";
import type { DatabaseClient } from "../db/client";
import { createApprovalRecord } from "../db/approvals";
import { getSessionRecord, updateSessionStatus } from "../db/runs";
import { appendAndPublishRunEvent } from "../events/publish";
import { buildStableSessionId } from "../workflows/ids";

export interface EnsureApprovalRequestInput {
  tenantId: string;
  runId: string;
  sessionId: string;
  approvalType: string;
  requestedBy?: string | null | undefined;
  reason: string;
  metadata?: Record<string, unknown> | undefined;
}

export async function ensureApprovalRequest(
  client: DatabaseClient,
  env: Pick<WorkerBindings, "RUN_COORDINATOR">,
  input: EnsureApprovalRequestInput
) {
  const approvalId = await buildStableSessionId(
    "approval",
    input.approvalType,
    input.tenantId,
    input.runId,
    input.sessionId
  );
  const waitEventType = `approval.resolved.${approvalId}`;
  const approval = await createApprovalRecord(client, {
    tenantId: input.tenantId,
    approvalId,
    runId: input.runId,
    sessionId: input.sessionId,
    approvalType: input.approvalType,
    status: "pending",
    requestedBy: input.requestedBy ?? "keystone",
    waitEventType,
    waitEventKey: input.runId,
    metadata: {
      reason: input.reason,
      ...(input.metadata ?? {})
    }
  });
  const created = Boolean(approval);

  const session = await getSessionRecord(client, input.tenantId, input.sessionId);

  if (session && session.status === "active") {
    await updateSessionStatus(client, {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      status: "paused_for_approval",
      metadata: {
        ...(session.metadata ?? {}),
        pendingApprovalId: approvalId,
        pendingApprovalType: input.approvalType
      }
    });
  }

  if (created) {
    await appendAndPublishRunEvent(client, env, {
      tenantId: input.tenantId,
      runId: input.runId,
      sessionId: input.sessionId,
      eventType: "approval.requested",
      payload: {
        approvalId,
        approvalType: input.approvalType,
        reason: input.reason,
        ...(input.metadata ?? {})
      },
      status: "paused_for_approval"
    });
  }

  return {
    approvalId,
    waitEventType,
    status: approval?.status ?? "pending"
  };
}
