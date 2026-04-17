CREATE TABLE IF NOT EXISTS projects (
  tenant_id text NOT NULL,
  project_id uuid PRIMARY KEY,
  project_key text NOT NULL,
  display_name text NOT NULL,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_tenant_key
  ON projects (tenant_id, project_key);

CREATE INDEX IF NOT EXISTS idx_projects_tenant_created
  ON projects (tenant_id, created_at);

CREATE TABLE IF NOT EXISTS project_rule_sets (
  project_id uuid PRIMARY KEY REFERENCES projects(project_id) ON DELETE CASCADE,
  review_instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  test_instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_components (
  component_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  component_key text NOT NULL,
  display_name text NOT NULL,
  kind text NOT NULL,
  local_path text NULL,
  git_url text NULL,
  default_ref text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_project_components_git_repository_source
    CHECK (
      kind <> 'git_repository'
      OR ((local_path IS NOT NULL AND git_url IS NULL) OR (local_path IS NULL AND git_url IS NOT NULL))
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_components_project_key
  ON project_components (project_id, component_key);

CREATE INDEX IF NOT EXISTS idx_project_components_project
  ON project_components (project_id, created_at);

CREATE TABLE IF NOT EXISTS project_component_rule_overrides (
  component_id uuid PRIMARY KEY REFERENCES project_components(component_id) ON DELETE CASCADE,
  review_instructions jsonb NULL,
  test_instructions jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS project_env_vars (
  env_var_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  env_key text NOT NULL,
  env_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_env_vars_project_key
  ON project_env_vars (project_id, env_key);

CREATE INDEX IF NOT EXISTS idx_project_env_vars_project
  ON project_env_vars (project_id, created_at);

CREATE TABLE IF NOT EXISTS project_integration_bindings (
  binding_id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  binding_key text NOT NULL,
  tenant_integration_id text NOT NULL,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_integration_bindings_project_key
  ON project_integration_bindings (project_id, binding_key);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_integration_bindings_project_integration
  ON project_integration_bindings (project_id, tenant_integration_id);

CREATE INDEX IF NOT EXISTS idx_project_integration_bindings_project
  ON project_integration_bindings (project_id, created_at);
