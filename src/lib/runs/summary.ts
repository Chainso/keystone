import type { ArtifactRefRow, SessionEventRow, SessionRow } from "../db/schema";

export interface RunCoordinatorSnapshot {
  tenantId: string;
  runId: string;
  status: string;
  updatedAt: string;
  websocketCount: number;
  latestEvent: {
    eventType: string;
    severity: string;
    timestamp: string;
  } | null;
  eventCount: number;
}

export interface RunSummary {
  tenantId: string;
  runId: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  inputs: Record<string, unknown> | null;
  sessions: {
    total: number;
    byStatus: Record<string, number>;
  };
  artifacts: {
    total: number;
    byKind: Record<string, number>;
  };
  latestEvent: {
    eventType: string;
    severity: string;
    timestamp: string;
    actor: string;
  } | null;
  live: RunCoordinatorSnapshot | null;
}

export function buildRunSummary(input: {
  tenantId: string;
  runId: string;
  sessions: SessionRow[];
  events: SessionEventRow[];
  artifacts: ArtifactRefRow[];
  liveSnapshot?: RunCoordinatorSnapshot | null | undefined;
}): RunSummary {
  const runSession = input.sessions.find((session) => session.sessionType === "run") ?? input.sessions[0];
  const byStatus = input.sessions.reduce<Record<string, number>>((accumulator, session) => {
    accumulator[session.status] = (accumulator[session.status] ?? 0) + 1;
    return accumulator;
  }, {});
  const artifactsByKind = input.artifacts.reduce<Record<string, number>>((accumulator, artifact) => {
    accumulator[artifact.kind] = (accumulator[artifact.kind] ?? 0) + 1;
    return accumulator;
  }, {});
  const latestEvent = input.events.at(-1);

  return {
    tenantId: input.tenantId,
    runId: input.runId,
    status: input.liveSnapshot?.status ?? runSession?.status ?? "unknown",
    createdAt: runSession?.createdAt?.toISOString() ?? null,
    updatedAt:
      input.liveSnapshot?.updatedAt ??
      latestEvent?.ts?.toISOString() ??
      runSession?.updatedAt?.toISOString() ??
      null,
    inputs: (runSession?.metadata as Record<string, unknown> | undefined) ?? null,
    sessions: {
      total: input.sessions.length,
      byStatus
    },
    artifacts: {
      total: input.artifacts.length,
      byKind: artifactsByKind
    },
    latestEvent: latestEvent
      ? {
          eventType: latestEvent.eventType,
          severity: latestEvent.severity,
          timestamp: latestEvent.ts.toISOString(),
          actor: latestEvent.actor
        }
      : null,
    live: input.liveSnapshot ?? null
  };
}
