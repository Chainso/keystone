import { z } from "zod";

export const eventSeverityValues = ["info", "warning", "error"] as const;
export const knownSessionEventTypes = [
  "session.started",
  "session.status_changed",
  "session.archived",
  "session.error",
  "workspace.initialized",
  "workspace.task_view_created",
  "workspace.merged",
  "sandbox.provisioned",
  "compile.started",
  "compile.completed",
  "compile.failed",
  "sandbox.process.started",
  "sandbox.process.stdout",
  "sandbox.process.stderr",
  "sandbox.process.completed",
  "sandbox.teardown",
  "lease.acquired",
  "lease.renewed",
  "lease.released",
  "approval.requested",
  "approval.resolved",
  "agent.message",
  "agent.tool_call",
  "agent.tool_result",
  "artifact.put",
  "artifact.linked",
  "task.status_changed"
] as const;

export type EventSeverity = (typeof eventSeverityValues)[number];
export type KnownSessionEventType = (typeof knownSessionEventTypes)[number];

const payloadSchema = z.record(z.string(), z.unknown());

export const sessionEventEnvelopeSchema = z.object({
  eventId: z.string().uuid(),
  tenantId: z.string().trim().min(1),
  runId: z.string().trim().min(1),
  sessionId: z.string().uuid(),
  taskId: z.string().trim().min(1).nullable().optional(),
  seq: z.number().int().positive(),
  eventType: z.string().regex(/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/),
  actor: z.string().trim().min(1),
  severity: z.enum(eventSeverityValues),
  timestamp: z.string().datetime(),
  idempotencyKey: z.string().trim().min(1).nullable().optional(),
  artifactRefId: z.string().uuid().nullable().optional(),
  payload: payloadSchema
});

export type SessionEventEnvelope = z.infer<typeof sessionEventEnvelopeSchema>;

export function createSessionEventEnvelope(
  input: Omit<SessionEventEnvelope, "eventId" | "timestamp"> & {
    eventId?: string | undefined;
    timestamp?: string | undefined;
  }
) {
  return sessionEventEnvelopeSchema.parse({
    ...input,
    eventId: input.eventId ?? crypto.randomUUID(),
    timestamp: input.timestamp ?? new Date().toISOString()
  });
}
