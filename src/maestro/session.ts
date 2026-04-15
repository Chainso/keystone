import type { Session, SessionSpec, SessionStatus } from "./contracts";

export const sessionStatusTransitions: Record<SessionStatus, readonly SessionStatus[]> = {
  configured: ["configured", "provisioning", "failed", "cancelled", "archived"],
  provisioning: ["provisioning", "ready", "failed", "cancelled", "archived"],
  ready: ["ready", "active", "failed", "cancelled", "archived"],
  active: ["active", "paused_for_approval", "failed", "cancelled", "archived"],
  paused_for_approval: ["paused_for_approval", "active", "failed", "cancelled", "archived"],
  archived: ["archived"],
  failed: ["failed", "archived"],
  cancelled: ["cancelled", "archived"]
};

export function canTransitionSessionStatus(
  fromStatus: SessionStatus,
  toStatus: SessionStatus
) {
  return sessionStatusTransitions[fromStatus].includes(toStatus);
}

export function assertSessionStatusTransition(
  fromStatus: SessionStatus,
  toStatus: SessionStatus
) {
  if (!canTransitionSessionStatus(fromStatus, toStatus)) {
    throw new Error(`Invalid session status transition: ${fromStatus} -> ${toStatus}`);
  }
}

export function buildConfiguredSession(
  sessionSpec: SessionSpec,
  overrides?: {
    sessionId?: string | undefined;
    status?: SessionStatus | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
  }
): Session {
  const createdAt = overrides?.createdAt ?? new Date();
  const updatedAt = overrides?.updatedAt ?? createdAt;

  return {
    tenantId: sessionSpec.tenantId,
    sessionId: overrides?.sessionId ?? crypto.randomUUID(),
    runId: sessionSpec.runId,
    sessionType: sessionSpec.sessionType,
    status: overrides?.status ?? "configured",
    parentSessionId: sessionSpec.parentSessionId ?? null,
    metadata: sessionSpec.metadata ?? {},
    createdAt,
    updatedAt
  };
}
