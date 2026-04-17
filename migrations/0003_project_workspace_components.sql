ALTER TABLE workspace_bindings
  ALTER COLUMN repo_url DROP NOT NULL,
  ALTER COLUMN repo_ref DROP NOT NULL,
  ALTER COLUMN base_ref DROP NOT NULL,
  ALTER COLUMN worktree_path DROP NOT NULL,
  ALTER COLUMN branch_name DROP NOT NULL;

ALTER TABLE workspace_bindings
  ADD COLUMN IF NOT EXISTS workspace_root text NULL,
  ADD COLUMN IF NOT EXISTS workspace_target_path text NULL,
  ADD COLUMN IF NOT EXISTS default_component_key text NULL;

CREATE TABLE IF NOT EXISTS workspace_materialized_components (
  tenant_id text NOT NULL,
  materialization_id uuid PRIMARY KEY,
  binding_id uuid NOT NULL REFERENCES workspace_bindings(binding_id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  run_id text NOT NULL,
  session_id uuid NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  task_id text NULL,
  component_key text NOT NULL,
  repo_url text NOT NULL,
  repo_ref text NOT NULL,
  base_ref text NOT NULL,
  repository_path text NOT NULL,
  worktree_path text NOT NULL,
  branch_name text NOT NULL,
  head_sha text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_materialized_components_workspace_key
  ON workspace_materialized_components (tenant_id, workspace_id, component_key);

CREATE INDEX IF NOT EXISTS idx_workspace_materialized_components_tenant_run
  ON workspace_materialized_components (tenant_id, run_id);
