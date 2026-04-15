import { and, asc, eq, sql } from "drizzle-orm";

import type { DatabaseClient } from "./client";
import { sessionEvents } from "./schema";
import { createSessionEventEnvelope, type EventSeverity } from "../events/types";

export interface AppendSessionEventInput {
  tenantId: string;
  runId: string;
  sessionId: string;
  taskId?: string | null | undefined;
  eventType: string;
  actor?: string | undefined;
  severity?: EventSeverity | undefined;
  idempotencyKey?: string | null | undefined;
  artifactRefId?: string | null | undefined;
  payload?: Record<string, unknown> | undefined;
}

export async function appendSessionEvent(
  client: DatabaseClient,
  input: AppendSessionEventInput
) {
  return client.db.transaction(async (transaction) => {
    const [seqRow] = await transaction
      .select({
        nextSeq: sql<number>`coalesce(max(${sessionEvents.seq}), 0) + 1`
      })
      .from(sessionEvents)
      .where(
        and(
          eq(sessionEvents.tenantId, input.tenantId),
          eq(sessionEvents.sessionId, input.sessionId)
        )
      );

    const envelope = createSessionEventEnvelope({
      tenantId: input.tenantId,
      runId: input.runId,
      sessionId: input.sessionId,
      taskId: input.taskId ?? null,
      seq: seqRow?.nextSeq ?? 1,
      eventType: input.eventType,
      actor: input.actor ?? "keystone",
      severity: input.severity ?? "info",
      idempotencyKey: input.idempotencyKey ?? null,
      artifactRefId: input.artifactRefId ?? null,
      payload: input.payload ?? {}
    });

    const [inserted] = await transaction
      .insert(sessionEvents)
      .values({
        tenantId: envelope.tenantId,
        eventId: envelope.eventId,
        runId: envelope.runId,
        sessionId: envelope.sessionId,
        taskId: envelope.taskId ?? null,
        seq: envelope.seq,
        eventType: envelope.eventType,
        actor: envelope.actor,
        severity: envelope.severity,
        ts: new Date(envelope.timestamp),
        idempotencyKey: envelope.idempotencyKey ?? null,
        artifactRefId: envelope.artifactRefId ?? null,
        payload: envelope.payload
      })
      .returning();

    return inserted;
  });
}

export async function listSessionEvents(
  client: DatabaseClient,
  input: {
    tenantId: string;
    sessionId: string;
  }
) {
  return client.db.query.sessionEvents.findMany({
    where: and(
      eq(sessionEvents.tenantId, input.tenantId),
      eq(sessionEvents.sessionId, input.sessionId)
    ),
    orderBy: [asc(sessionEvents.seq)]
  });
}

export async function listRunEvents(
  client: DatabaseClient,
  input: {
    tenantId: string;
    runId: string;
  }
) {
  return client.db.query.sessionEvents.findMany({
    where: and(eq(sessionEvents.tenantId, input.tenantId), eq(sessionEvents.runId, input.runId)),
    orderBy: [asc(sessionEvents.ts), asc(sessionEvents.seq)]
  });
}
