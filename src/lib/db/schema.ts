import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

const jsonbDefault = sql`'{}'::jsonb`;

export const sessions = pgTable(
  "sessions",
  {
    tenantId: text("tenant_id").notNull(),
    sessionId: uuid("session_id").primaryKey(),
    runId: text("run_id").notNull(),
    sessionType: text("session_type").notNull(),
    status: text("status").notNull(),
    parentSessionId: uuid("parent_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [index("idx_sessions_tenant_run").on(table.tenantId, table.runId)]
);

export const artifactRefs = pgTable(
  "artifact_refs",
  {
    tenantId: text("tenant_id").notNull(),
    artifactRefId: uuid("artifact_ref_id").primaryKey(),
    runId: text("run_id").notNull(),
    sessionId: uuid("session_id"),
    taskId: text("task_id"),
    kind: text("kind").notNull(),
    storageBackend: text("storage_backend").notNull(),
    storageUri: text("storage_uri").notNull(),
    contentType: text("content_type").notNull(),
    sha256: text("sha256"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [index("idx_artifact_refs_tenant_run").on(table.tenantId, table.runId)]
);

export const sessionEvents = pgTable(
  "session_events",
  {
    tenantId: text("tenant_id").notNull(),
    eventId: uuid("event_id").primaryKey(),
    sessionId: uuid("session_id").notNull(),
    runId: text("run_id").notNull(),
    taskId: text("task_id"),
    seq: integer("seq").notNull(),
    eventType: text("event_type").notNull(),
    actor: text("actor").notNull().default("keystone"),
    severity: text("severity").notNull().default("info"),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    idempotencyKey: text("idempotency_key"),
    artifactRefId: uuid("artifact_ref_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [
    index("idx_session_events_tenant_session_ts").on(table.tenantId, table.sessionId, table.ts),
    uniqueIndex("uq_session_events_idempo").on(
      table.tenantId,
      table.sessionId,
      table.idempotencyKey
    ),
    uniqueIndex("uq_session_events_tenant_session_seq").on(
      table.tenantId,
      table.sessionId,
      table.seq
    )
  ]
);

export const approvals = pgTable(
  "approvals",
  {
    tenantId: text("tenant_id").notNull(),
    approvalId: uuid("approval_id").primaryKey(),
    runId: text("run_id").notNull(),
    sessionId: uuid("session_id").notNull(),
    approvalType: text("approval_type").notNull(),
    status: text("status").notNull(),
    requestedBy: text("requested_by"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolution: jsonb("resolution").$type<Record<string, unknown> | null>(),
    waitEventType: text("wait_event_type"),
    waitEventKey: text("wait_event_key"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [index("idx_approvals_tenant_run_status").on(table.tenantId, table.runId, table.status)]
);

export const workspaceBindings = pgTable(
  "workspace_bindings",
  {
    tenantId: text("tenant_id").notNull(),
    bindingId: uuid("binding_id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    runId: text("run_id").notNull(),
    sessionId: uuid("session_id").notNull(),
    taskId: text("task_id"),
    strategy: text("strategy").notNull().default("worktree"),
    sandboxId: text("sandbox_id").notNull(),
    repoUrl: text("repo_url").notNull(),
    repoRef: text("repo_ref").notNull(),
    baseRef: text("base_ref").notNull(),
    worktreePath: text("worktree_path").notNull(),
    branchName: text("branch_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [
    uniqueIndex("uq_workspace_binding_workspace").on(table.tenantId, table.workspaceId),
    index("idx_workspace_bindings_tenant_run").on(table.tenantId, table.runId)
  ]
);

export const workerLeases = pgTable(
  "worker_leases",
  {
    tenantId: text("tenant_id").notNull(),
    leaseId: uuid("lease_id").primaryKey(),
    leaseType: text("lease_type").notNull(),
    leaseKey: text("lease_key").notNull(),
    ownerSessionId: uuid("owner_session_id").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [uniqueIndex("uq_worker_lease_key").on(table.tenantId, table.leaseType, table.leaseKey)]
);

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type SessionEventRow = typeof sessionEvents.$inferSelect;
export type NewSessionEventRow = typeof sessionEvents.$inferInsert;
export type ArtifactRefRow = typeof artifactRefs.$inferSelect;
export type NewArtifactRefRow = typeof artifactRefs.$inferInsert;
export type ApprovalRow = typeof approvals.$inferSelect;
export type WorkspaceBindingRow = typeof workspaceBindings.$inferSelect;
export type WorkerLeaseRow = typeof workerLeases.$inferSelect;

export const schema = {
  sessions,
  sessionEvents,
  approvals,
  workspaceBindings,
  workerLeases,
  artifactRefs
};
