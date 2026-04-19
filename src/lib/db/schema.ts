import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import type { DocumentKind, DocumentScopeType } from "../documents/model";

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
    projectId: uuid("project_id").references(() => projects.projectId, { onDelete: "cascade" }),
    runId: text("run_id").notNull(),
    sessionId: uuid("session_id"),
    taskId: text("task_id"),
    runTaskId: uuid("run_task_id").references(() => runTasks.runTaskId, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    artifactKind: text("artifact_kind"),
    storageBackend: text("storage_backend").notNull(),
    storageUri: text("storage_uri").notNull(),
    bucket: text("bucket"),
    objectKey: text("object_key"),
    objectVersion: text("object_version"),
    etag: text("etag"),
    contentType: text("content_type").notNull(),
    sha256: text("sha256"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [
    index("idx_artifact_refs_tenant_run").on(table.tenantId, table.runId),
    index("idx_artifact_refs_tenant_project").on(table.tenantId, table.projectId),
    index("idx_artifact_refs_run_task").on(table.runTaskId)
  ]
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
    repoUrl: text("repo_url"),
    repoRef: text("repo_ref"),
    baseRef: text("base_ref"),
    worktreePath: text("worktree_path"),
    branchName: text("branch_name"),
    workspaceRoot: text("workspace_root"),
    workspaceTargetPath: text("workspace_target_path"),
    defaultComponentKey: text("default_component_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [
    uniqueIndex("uq_workspace_binding_workspace").on(table.tenantId, table.workspaceId),
    index("idx_workspace_bindings_tenant_run").on(table.tenantId, table.runId)
  ]
);

export const workspaceMaterializedComponents = pgTable(
  "workspace_materialized_components",
  {
    tenantId: text("tenant_id").notNull(),
    materializationId: uuid("materialization_id").primaryKey(),
    bindingId: uuid("binding_id")
      .notNull()
      .references(() => workspaceBindings.bindingId, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull(),
    runId: text("run_id").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.sessionId, { onDelete: "cascade" }),
    taskId: text("task_id"),
    componentKey: text("component_key").notNull(),
    repoUrl: text("repo_url").notNull(),
    repoRef: text("repo_ref").notNull(),
    baseRef: text("base_ref").notNull(),
    repositoryPath: text("repository_path").notNull(),
    worktreePath: text("worktree_path").notNull(),
    branchName: text("branch_name").notNull(),
    headSha: text("head_sha").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [
    uniqueIndex("uq_workspace_materialized_components_workspace_key").on(
      table.tenantId,
      table.workspaceId,
      table.componentKey
    ),
    index("idx_workspace_materialized_components_tenant_run").on(table.tenantId, table.runId)
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

const jsonbArrayDefault = sql`'[]'::jsonb`;

export const projects = pgTable(
  "projects",
  {
    tenantId: text("tenant_id").notNull(),
    projectId: uuid("project_id").primaryKey(),
    projectKey: text("project_key").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [
    uniqueIndex("uq_projects_tenant_key").on(table.tenantId, table.projectKey),
    index("idx_projects_tenant_created").on(table.tenantId, table.createdAt)
  ]
);

export const projectRuleSets = pgTable("project_rule_sets", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projects.projectId, { onDelete: "cascade" }),
  reviewInstructions: jsonb("review_instructions").$type<string[]>().notNull().default(jsonbArrayDefault),
  testInstructions: jsonb("test_instructions").$type<string[]>().notNull().default(jsonbArrayDefault),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const projectComponents = pgTable(
  "project_components",
  {
    componentId: uuid("component_id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    componentKey: text("component_key").notNull(),
    displayName: text("display_name").notNull(),
    kind: text("kind").notNull(),
    localPath: text("local_path"),
    gitUrl: text("git_url"),
    defaultRef: text("default_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [
    uniqueIndex("uq_project_components_project_key").on(table.projectId, table.componentKey),
    index("idx_project_components_project").on(table.projectId, table.createdAt)
  ]
);

export const projectComponentRuleOverrides = pgTable("project_component_rule_overrides", {
  componentId: uuid("component_id")
    .primaryKey()
    .references(() => projectComponents.componentId, { onDelete: "cascade" }),
  reviewInstructions: jsonb("review_instructions").$type<string[] | null>(),
  testInstructions: jsonb("test_instructions").$type<string[] | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
});

export const projectEnvVars = pgTable(
  "project_env_vars",
  {
    envVarId: uuid("env_var_id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    envKey: text("env_key").notNull(),
    envValue: text("env_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [
    uniqueIndex("uq_project_env_vars_project_key").on(table.projectId, table.envKey),
    index("idx_project_env_vars_project").on(table.projectId, table.createdAt)
  ]
);

export const projectIntegrationBindings = pgTable(
  "project_integration_bindings",
  {
    bindingId: uuid("binding_id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    bindingKey: text("binding_key").notNull(),
    tenantIntegrationId: text("tenant_integration_id").notNull(),
    overrides: jsonb("overrides").$type<Record<string, unknown>>().notNull().default(jsonbDefault),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(jsonbDefault)
  },
  (table) => [
    uniqueIndex("uq_project_integration_bindings_project_key").on(table.projectId, table.bindingKey),
    uniqueIndex("uq_project_integration_bindings_project_integration").on(
      table.projectId,
      table.tenantIntegrationId
    ),
    index("idx_project_integration_bindings_project").on(table.projectId, table.createdAt)
  ]
);

export const runs = pgTable(
  "runs",
  {
    runId: text("run_id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    workflowInstanceId: text("workflow_instance_id").notNull(),
    executionEngine: text("execution_engine").notNull(),
    sandboxId: text("sandbox_id"),
    status: text("status").notNull(),
    compiledSpecRevisionId: uuid("compiled_spec_revision_id").references(
      (): AnyPgColumn => documentRevisions.documentRevisionId,
      { onDelete: "set null" }
    ),
    compiledArchitectureRevisionId: uuid("compiled_architecture_revision_id").references(
      (): AnyPgColumn => documentRevisions.documentRevisionId,
      { onDelete: "set null" }
    ),
    compiledExecutionPlanRevisionId: uuid("compiled_execution_plan_revision_id").references(
      (): AnyPgColumn => documentRevisions.documentRevisionId,
      { onDelete: "set null" }
    ),
    compiledAt: timestamp("compiled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("idx_runs_tenant_project_created").on(table.tenantId, table.projectId, table.createdAt),
    index("idx_runs_project_created").on(table.projectId, table.createdAt)
  ]
);

export const documents = pgTable(
  "documents",
  {
    documentId: uuid("document_id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    runId: text("run_id").references((): AnyPgColumn => runs.runId, { onDelete: "cascade" }),
    scopeType: text("scope_type").$type<DocumentScopeType>().notNull(),
    kind: text("kind").$type<DocumentKind>().notNull(),
    path: text("path").notNull(),
    currentRevisionId: uuid("current_revision_id").references(
      (): AnyPgColumn => documentRevisions.documentRevisionId,
      { onDelete: "set null" }
    ),
    conversationAgentClass: text("conversation_agent_class"),
    conversationAgentName: text("conversation_agent_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("uq_documents_project_path")
      .on(table.projectId, table.path)
      .where(sql`${table.scopeType} = 'project'`),
    uniqueIndex("uq_documents_run_path")
      .on(table.runId, table.path)
      .where(sql`${table.scopeType} = 'run'`),
    index("idx_documents_tenant_project_created").on(table.tenantId, table.projectId, table.createdAt),
    index("idx_documents_run_created").on(table.runId, table.createdAt)
  ]
);

export const documentRevisions = pgTable(
  "document_revisions",
  {
    documentRevisionId: uuid("document_revision_id").primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references((): AnyPgColumn => documents.documentId, { onDelete: "cascade" }),
    artifactRefId: uuid("artifact_ref_id")
      .notNull()
      .references(() => artifactRefs.artifactRefId),
    revisionNumber: integer("revision_number").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("uq_document_revisions_document_revision_number").on(
      table.documentId,
      table.revisionNumber
    ),
    uniqueIndex("uq_document_revisions_artifact_ref").on(table.artifactRefId),
    index("idx_document_revisions_document_created").on(table.documentId, table.createdAt)
  ]
);

export const runTasks = pgTable(
  "run_tasks",
  {
    runTaskId: uuid("run_task_id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.runId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull(),
    conversationAgentClass: text("conversation_agent_class"),
    conversationAgentName: text("conversation_agent_name"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("uq_run_tasks_run_task").on(table.runId, table.runTaskId),
    index("idx_run_tasks_run_created").on(table.runId, table.createdAt)
  ]
);

export const runTaskDependencies = pgTable(
  "run_task_dependencies",
  {
    runTaskDependencyId: uuid("run_task_dependency_id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.runId, { onDelete: "cascade" }),
    parentRunTaskId: uuid("parent_run_task_id").notNull(),
    childRunTaskId: uuid("child_run_task_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("uq_run_task_dependencies_run_edge").on(
      table.runId,
      table.parentRunTaskId,
      table.childRunTaskId
    ),
    index("idx_run_task_dependencies_run_created").on(table.runId, table.createdAt),
    foreignKey({
      name: "fk_run_task_dependencies_parent",
      columns: [table.runId, table.parentRunTaskId],
      foreignColumns: [runTasks.runId, runTasks.runTaskId]
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_run_task_dependencies_child",
      columns: [table.runId, table.childRunTaskId],
      foreignColumns: [runTasks.runId, runTasks.runTaskId]
    }).onDelete("cascade")
  ]
);

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type SessionEventRow = typeof sessionEvents.$inferSelect;
export type NewSessionEventRow = typeof sessionEvents.$inferInsert;
export type ArtifactRefRow = typeof artifactRefs.$inferSelect;
export type NewArtifactRefRow = typeof artifactRefs.$inferInsert;
export type ApprovalRow = typeof approvals.$inferSelect;
export type WorkspaceBindingRow = typeof workspaceBindings.$inferSelect;
export type WorkspaceMaterializedComponentRow = typeof workspaceMaterializedComponents.$inferSelect;
export type WorkerLeaseRow = typeof workerLeases.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type ProjectRuleSetRow = typeof projectRuleSets.$inferSelect;
export type ProjectComponentRow = typeof projectComponents.$inferSelect;
export type ProjectComponentRuleOverrideRow = typeof projectComponentRuleOverrides.$inferSelect;
export type ProjectEnvVarRow = typeof projectEnvVars.$inferSelect;
export type ProjectIntegrationBindingRow = typeof projectIntegrationBindings.$inferSelect;
export type RunRow = typeof runs.$inferSelect;
export type NewRunRow = typeof runs.$inferInsert;
export type DocumentRow = typeof documents.$inferSelect;
export type NewDocumentRow = typeof documents.$inferInsert;
export type DocumentRevisionRow = typeof documentRevisions.$inferSelect;
export type NewDocumentRevisionRow = typeof documentRevisions.$inferInsert;
export type RunTaskRow = typeof runTasks.$inferSelect;
export type NewRunTaskRow = typeof runTasks.$inferInsert;
export type RunTaskDependencyRow = typeof runTaskDependencies.$inferSelect;
export type NewRunTaskDependencyRow = typeof runTaskDependencies.$inferInsert;

export const schema = {
  sessions,
  sessionEvents,
  approvals,
  workspaceBindings,
  workspaceMaterializedComponents,
  workerLeases,
  artifactRefs,
  projects,
  projectRuleSets,
  projectComponents,
  projectComponentRuleOverrides,
  projectEnvVars,
  projectIntegrationBindings,
  runs,
  documents,
  documentRevisions,
  runTasks,
  runTaskDependencies
};
