import { and, eq } from "drizzle-orm";

import type { DatabaseClient } from "./client";
import { approvals } from "./schema";

export async function getApprovalRecord(
  client: DatabaseClient,
  input: {
    tenantId: string;
    approvalId: string;
  }
) {
  return client.db.query.approvals.findFirst({
    where: and(
      eq(approvals.tenantId, input.tenantId),
      eq(approvals.approvalId, input.approvalId)
    )
  });
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
  const [updated] = await client.db
    .update(approvals)
    .set({
      status: input.status,
      resolution: input.resolution,
      resolvedAt: new Date()
    })
    .where(
      and(eq(approvals.tenantId, input.tenantId), eq(approvals.approvalId, input.approvalId))
    )
    .returning();

  return updated;
}
