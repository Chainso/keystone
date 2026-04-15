import { and, asc, eq } from "drizzle-orm";

import { assertSessionStatusTransition, buildConfiguredSession } from "../../maestro/session";
import type { SessionSpec, SessionStatus } from "../../maestro/contracts";
import type { DatabaseClient } from "./client";
import { sessions } from "./schema";

export async function createSessionRecord(
  client: DatabaseClient,
  sessionSpec: SessionSpec,
  overrides?: {
    sessionId?: string | undefined;
    status?: SessionStatus | undefined;
  }
) {
  const session = buildConfiguredSession(sessionSpec, overrides);
  const [inserted] = await client.db
    .insert(sessions)
    .values({
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      runId: session.runId,
      sessionType: session.sessionType,
      status: session.status,
      parentSessionId: session.parentSessionId ?? null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: session.metadata
    })
    .returning();

  return inserted;
}

export async function getSessionRecord(
  client: DatabaseClient,
  tenantId: string,
  sessionId: string
) {
  return client.db.query.sessions.findFirst({
    where: and(eq(sessions.tenantId, tenantId), eq(sessions.sessionId, sessionId))
  });
}

export async function listRunSessions(
  client: DatabaseClient,
  tenantId: string,
  runId: string
) {
  return client.db.query.sessions.findMany({
    where: and(eq(sessions.tenantId, tenantId), eq(sessions.runId, runId)),
    orderBy: [asc(sessions.createdAt)]
  });
}

export async function updateSessionStatus(
  client: DatabaseClient,
  input: {
    tenantId: string;
    sessionId: string;
    status: SessionStatus;
    metadata?: Record<string, unknown> | undefined;
  }
) {
  const existing = await getSessionRecord(client, input.tenantId, input.sessionId);

  if (!existing) {
    throw new Error(`Session ${input.sessionId} was not found for tenant ${input.tenantId}.`);
  }

  assertSessionStatusTransition(existing.status as SessionStatus, input.status);

  const [updated] = await client.db
    .update(sessions)
    .set({
      status: input.status,
      updatedAt: new Date(),
      metadata: input.metadata ?? existing.metadata
    })
    .where(and(eq(sessions.tenantId, input.tenantId), eq(sessions.sessionId, input.sessionId)))
    .returning();

  return updated;
}
