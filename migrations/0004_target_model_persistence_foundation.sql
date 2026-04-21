CREATE TABLE IF NOT EXISTS runs (
  run_id text PRIMARY KEY,
  tenant_id text NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  workflow_instance_id text NOT NULL,
  execution_engine text NOT NULL,
  sandbox_id text NULL,
  status text NOT NULL,
  compiled_spec_revision_id uuid NULL,
  compiled_architecture_revision_id uuid NULL,
  compiled_execution_plan_revision_id uuid NULL,
  compiled_at timestamptz NULL,
  started_at timestamptz NULL,
  ended_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runs_tenant_project_created
  ON runs (tenant_id, project_id, created_at);

CREATE INDEX IF NOT EXISTS idx_runs_project_created
  ON runs (project_id, created_at);

CREATE TABLE IF NOT EXISTS documents (
  document_id uuid PRIMARY KEY,
  tenant_id text NOT NULL,
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  run_id text NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  scope_type text NOT NULL,
  kind text NOT NULL,
  path text NOT NULL,
  current_revision_id uuid NULL,
  conversation_agent_class text NULL,
  conversation_agent_name text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_documents_scope_type
    CHECK (scope_type IN ('project', 'run')),
  CONSTRAINT chk_documents_scope_binding
    CHECK (
      (scope_type = 'project' AND run_id IS NULL)
      OR (scope_type = 'run' AND run_id IS NOT NULL)
    ),
  CONSTRAINT chk_documents_execution_plan_scope
    CHECK (kind <> 'execution_plan' OR scope_type = 'run')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_project_path
  ON documents (project_id, path)
  WHERE scope_type = 'project';

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_run_path
  ON documents (run_id, path)
  WHERE scope_type = 'run';

CREATE INDEX IF NOT EXISTS idx_documents_tenant_project_created
  ON documents (tenant_id, project_id, created_at);

CREATE INDEX IF NOT EXISTS idx_documents_run_created
  ON documents (run_id, created_at);

CREATE TABLE IF NOT EXISTS run_tasks (
  run_task_id uuid PRIMARY KEY,
  run_id text NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  status text NOT NULL,
  conversation_agent_class text NULL,
  conversation_agent_name text NULL,
  started_at timestamptz NULL,
  ended_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_run_tasks_run_task
  ON run_tasks (run_id, run_task_id);

CREATE INDEX IF NOT EXISTS idx_run_tasks_run_created
  ON run_tasks (run_id, created_at);

CREATE TABLE IF NOT EXISTS run_task_dependencies (
  run_task_dependency_id uuid PRIMARY KEY,
  run_id text NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  parent_run_task_id uuid NOT NULL,
  child_run_task_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_run_task_dependencies_not_self
    CHECK (parent_run_task_id <> child_run_task_id),
  CONSTRAINT fk_run_task_dependencies_parent
    FOREIGN KEY (run_id, parent_run_task_id)
    REFERENCES run_tasks(run_id, run_task_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_run_task_dependencies_child
    FOREIGN KEY (run_id, child_run_task_id)
    REFERENCES run_tasks(run_id, run_task_id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_run_task_dependencies_run_edge
  ON run_task_dependencies (run_id, parent_run_task_id, child_run_task_id);

CREATE INDEX IF NOT EXISTS idx_run_task_dependencies_run_created
  ON run_task_dependencies (run_id, created_at);

ALTER TABLE artifact_refs
  ADD COLUMN IF NOT EXISTS project_id uuid NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS run_task_id uuid NULL REFERENCES run_tasks(run_task_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS artifact_kind text NULL,
  ADD COLUMN IF NOT EXISTS bucket text NULL,
  ADD COLUMN IF NOT EXISTS object_key text NULL,
  ADD COLUMN IF NOT EXISTS object_version text NULL,
  ADD COLUMN IF NOT EXISTS etag text NULL;

CREATE INDEX IF NOT EXISTS idx_artifact_refs_tenant_project
  ON artifact_refs (tenant_id, project_id);

CREATE INDEX IF NOT EXISTS idx_artifact_refs_run_task
  ON artifact_refs (run_task_id);

CREATE TABLE IF NOT EXISTS document_revisions (
  document_revision_id uuid PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
  artifact_ref_id uuid NOT NULL REFERENCES artifact_refs(artifact_ref_id),
  revision_number integer NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_revisions_document_revision_number
  ON document_revisions (document_id, revision_number);

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_revisions_artifact_ref
  ON document_revisions (artifact_ref_id);

CREATE INDEX IF NOT EXISTS idx_document_revisions_document_created
  ON document_revisions (document_id, created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_documents_current_revision'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT fk_documents_current_revision
      FOREIGN KEY (current_revision_id)
      REFERENCES document_revisions(document_revision_id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_runs_compiled_spec_revision'
  ) THEN
    ALTER TABLE runs
      ADD CONSTRAINT fk_runs_compiled_spec_revision
      FOREIGN KEY (compiled_spec_revision_id)
      REFERENCES document_revisions(document_revision_id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_runs_compiled_architecture_revision'
  ) THEN
    ALTER TABLE runs
      ADD CONSTRAINT fk_runs_compiled_architecture_revision
      FOREIGN KEY (compiled_architecture_revision_id)
      REFERENCES document_revisions(document_revision_id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_runs_compiled_execution_plan_revision'
  ) THEN
    ALTER TABLE runs
      ADD CONSTRAINT fk_runs_compiled_execution_plan_revision
      FOREIGN KEY (compiled_execution_plan_revision_id)
      REFERENCES document_revisions(document_revision_id)
      ON DELETE SET NULL;
  END IF;
END $$;

UPDATE artifact_refs
SET artifact_kind = kind
WHERE artifact_kind IS NULL;

UPDATE artifact_refs
SET
  bucket = COALESCE(bucket, substring(storage_uri from '^r2://([^/]+)/')),
  object_key = COALESCE(object_key, substring(storage_uri from '^r2://[^/]+/(.+)$'))
WHERE storage_backend = 'r2'
  AND storage_uri LIKE 'r2://%';
