import type { DatabaseClient } from "./client";

interface ApprovalRecordRow {
  tenantId: string;
  approvalId: string;
  runId: string;
  sessionId: string;
  approvalType: string;
  status: string;
  requestedBy: string | null;
  requestedAt: Date | string;
  resolvedAt: Date | string | null;
  resolution: Record<string, unknown> | null;
  waitEventType: string | null;
  waitEventKey: string | null;
  metadata: Record<string, unknown>;
}

function normalizeApprovalRecord<T extends ApprovalRecordRow | undefined>(row: T) {
  if (!row) {
    return row;
  }

  return {
    ...row,
    requestedAt: row.requestedAt instanceof Date ? row.requestedAt : new Date(row.requestedAt),
    resolvedAt:
      row.resolvedAt == null
        ? null
        : row.resolvedAt instanceof Date
          ? row.resolvedAt
          : new Date(row.resolvedAt)
  };
}

export interface ResolveApprovalRecordResult extends ApprovalRecordRow {
  resolutionApplied: boolean;
  resolutionMatchesRequest: boolean;
}

export async function createApprovalRecord(
  client: DatabaseClient,
  input: {
    tenantId: string;
    approvalId: string;
    runId: string;
    sessionId: string;
    approvalType: string;
    status: string;
    requestedBy?: string | null | undefined;
    waitEventType?: string | null | undefined;
    waitEventKey?: string | null | undefined;
    metadata?: Record<string, unknown> | undefined;
  }
) {
  const inserted = await client.sql<ApprovalRecordRow[]>`
    insert into approvals (
      tenant_id,
      approval_id,
      run_id,
      session_id,
      approval_type,
      status,
      requested_by,
      wait_event_type,
      wait_event_key,
      metadata
    ) values (
      ${input.tenantId},
      ${input.approvalId}::uuid,
      ${input.runId},
      ${input.sessionId}::uuid,
      ${input.approvalType},
      ${input.status},
      ${input.requestedBy ?? null},
      ${input.waitEventType ?? null},
      ${input.waitEventKey ?? null},
      ${JSON.stringify(input.metadata ?? {})}::jsonb
    )
    on conflict do nothing
    returning
      tenant_id as "tenantId",
      approval_id::text as "approvalId",
      run_id as "runId",
      session_id::text as "sessionId",
      approval_type as "approvalType",
      status,
      requested_by as "requestedBy",
      requested_at as "requestedAt",
      resolved_at as "resolvedAt",
      resolution,
      wait_event_type as "waitEventType",
      wait_event_key as "waitEventKey",
      metadata
  `;

  return normalizeApprovalRecord(inserted[0]);
}

export async function getApprovalRecord(
  client: DatabaseClient,
  input: {
    tenantId: string;
    approvalId: string;
  }
) {
  const rows = await client.sql<ApprovalRecordRow[]>`
    select
      tenant_id as "tenantId",
      approval_id::text as "approvalId",
      run_id as "runId",
      session_id::text as "sessionId",
      approval_type as "approvalType",
      status,
      requested_by as "requestedBy",
      requested_at as "requestedAt",
      resolved_at as "resolvedAt",
      resolution,
      wait_event_type as "waitEventType",
      wait_event_key as "waitEventKey",
      metadata
    from approvals
    where tenant_id = ${input.tenantId}
      and approval_id = ${input.approvalId}::uuid
    limit 1
  `;

  return normalizeApprovalRecord(rows[0]);
}

export async function listRunApprovalRecords(
  client: DatabaseClient,
  input: {
    tenantId: string;
    runId: string;
  }
) {
  const rows = await client.sql<ApprovalRecordRow[]>`
    select
      tenant_id as "tenantId",
      approval_id::text as "approvalId",
      run_id as "runId",
      session_id::text as "sessionId",
      approval_type as "approvalType",
      status,
      requested_by as "requestedBy",
      requested_at as "requestedAt",
      resolved_at as "resolvedAt",
      resolution,
      wait_event_type as "waitEventType",
      wait_event_key as "waitEventKey",
      metadata
    from approvals
    where tenant_id = ${input.tenantId}
      and run_id = ${input.runId}
    order by requested_at asc, approval_id asc
  `;

  return rows.map((row) => normalizeApprovalRecord(row));
}

export async function resolveApprovalRecord(
  client: DatabaseClient,
  input: {
    tenantId: string;
    approvalId: string;
    resolution: Record<string, unknown>;
    status: "approved" | "rejected" | "cancelled";
  }
) {
  const updated = await client.sql<ApprovalRecordRow[]>`
    update approvals
    set
      status = ${input.status},
      resolution = ${JSON.stringify(input.resolution)}::jsonb,
      resolved_at = now()
    where tenant_id = ${input.tenantId}
      and approval_id = ${input.approvalId}::uuid
      and status = 'pending'
    returning
      tenant_id as "tenantId",
      approval_id::text as "approvalId",
      run_id as "runId",
      session_id::text as "sessionId",
      approval_type as "approvalType",
      status,
      requested_by as "requestedBy",
      requested_at as "requestedAt",
      resolved_at as "resolvedAt",
      resolution,
      wait_event_type as "waitEventType",
      wait_event_key as "waitEventKey",
      metadata
  `;

  const applied = normalizeApprovalRecord(updated[0]);

  if (applied) {
    return {
      ...applied,
      resolutionApplied: true,
      resolutionMatchesRequest: true
    } satisfies ResolveApprovalRecordResult;
  }

  const existing = await getApprovalRecord(client, {
    tenantId: input.tenantId,
    approvalId: input.approvalId
  });

  if (!existing) {
    return undefined;
  }

  return {
    ...existing,
    resolutionApplied: false,
    resolutionMatchesRequest: existing.status === input.status
  } satisfies ResolveApprovalRecordResult;
}
