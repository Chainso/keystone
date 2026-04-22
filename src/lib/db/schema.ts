import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  check,
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

import type { ArtifactKind } from "../artifacts/model";
import type { DocumentKind, DocumentScopeType } from "../documents/model";

const jsonbDefault = sql`'{}'::jsonb`;

export const artifactRefs = pgTable(
  "artifact_refs",
  {
    tenantId: text("tenant_id").notNull(),
    artifactRefId: uuid("artifact_ref_id").primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.projectId, { onDelete: "cascade" }),
    runId: text("run_id").references((): AnyPgColumn => runs.runId, { onDelete: "cascade" }),
    runTaskId: uuid("run_task_id"),
    artifactKind: text("artifact_kind").$type<ArtifactKind>().notNull(),
    storageBackend: text("storage_backend").notNull(),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull(),
    objectVersion: text("object_version"),
    etag: text("etag"),
    contentType: text("content_type").notNull(),
    sha256: text("sha256"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("idx_artifact_refs_tenant_run").on(table.tenantId, table.runId),
    index("idx_artifact_refs_tenant_project").on(table.tenantId, table.projectId),
    index("idx_artifact_refs_run_task").on(table.runTaskId),
    uniqueIndex("uq_artifact_refs_tenant_object").on(table.tenantId, table.bucket, table.objectKey),
    check(
      "chk_artifact_refs_run_task_requires_run",
      sql`${table.runTaskId} IS NULL OR ${table.runId} IS NOT NULL`
    ),
    foreignKey({
      name: "fk_artifact_refs_run_task",
      columns: [table.runId, table.runTaskId],
      foreignColumns: [runTasks.runId, runTasks.runTaskId]
    })
  ]
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
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
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
    ref: text("ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
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
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("uq_project_env_vars_project_key").on(table.projectId, table.envKey),
    index("idx_project_env_vars_project").on(table.projectId, table.createdAt)
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
    sandboxId: text("sandbox_id").notNull(),
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
    index("idx_runs_project_created").on(table.projectId, table.createdAt),
    check(
      "chk_runs_compile_provenance_complete",
      sql`(
        (${table.compiledSpecRevisionId} IS NULL AND ${table.compiledArchitectureRevisionId} IS NULL AND ${table.compiledExecutionPlanRevisionId} IS NULL AND ${table.compiledAt} IS NULL)
        OR
        (${table.compiledSpecRevisionId} IS NOT NULL AND ${table.compiledArchitectureRevisionId} IS NOT NULL AND ${table.compiledExecutionPlanRevisionId} IS NOT NULL AND ${table.compiledAt} IS NOT NULL)
      )`
    )
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
    check(
      "chk_run_task_dependencies_not_self",
      sql`${table.parentRunTaskId} <> ${table.childRunTaskId}`
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

export type ArtifactRefRow = typeof artifactRefs.$inferSelect;
export type NewArtifactRefRow = typeof artifactRefs.$inferInsert;
export type ProjectRow = typeof projects.$inferSelect;
export type ProjectRuleSetRow = typeof projectRuleSets.$inferSelect;
export type ProjectComponentRow = typeof projectComponents.$inferSelect;
export type ProjectComponentRuleOverrideRow = typeof projectComponentRuleOverrides.$inferSelect;
export type ProjectEnvVarRow = typeof projectEnvVars.$inferSelect;
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
  artifactRefs,
  projects,
  projectRuleSets,
  projectComponents,
  projectComponentRuleOverrides,
  projectEnvVars,
  runs,
  documents,
  documentRevisions,
  runTasks,
  runTaskDependencies
};
