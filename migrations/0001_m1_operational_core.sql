CREATE TABLE IF NOT EXISTS sessions (
  tenant_id text NOT NULL,
  session_id uuid PRIMARY KEY,
  run_id text NOT NULL,
  session_type text NOT NULL,
  status text NOT NULL,
  parent_session_id uuid NULL REFERENCES sessions(session_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant_run
  ON sessions (tenant_id, run_id);

CREATE TABLE IF NOT EXISTS artifact_refs (
  tenant_id text NOT NULL,
  artifact_ref_id uuid PRIMARY KEY,
  run_id text NOT NULL,
  session_id uuid NULL REFERENCES sessions(session_id) ON DELETE SET NULL,
  task_id text NULL,
  kind text NOT NULL,
  storage_backend text NOT NULL,
  storage_uri text NOT NULL,
  content_type text NOT NULL,
  sha256 text NULL,
  size_bytes bigint NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_artifact_refs_tenant_run
  ON artifact_refs (tenant_id, run_id);

CREATE TABLE IF NOT EXISTS session_events (
  tenant_id text NOT NULL,
  event_id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  run_id text NOT NULL,
  task_id text NULL,
  seq integer NOT NULL,
  event_type text NOT NULL,
  actor text NOT NULL DEFAULT 'keystone',
  severity text NOT NULL DEFAULT 'info',
  ts timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NULL,
  artifact_ref_id uuid NULL REFERENCES artifact_refs(artifact_ref_id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_session_events_tenant_session_ts
  ON session_events (tenant_id, session_id, ts);

CREATE UNIQUE INDEX IF NOT EXISTS uq_session_events_idempo
  ON session_events (tenant_id, session_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_session_events_tenant_session_seq
  ON session_events (tenant_id, session_id, seq);

CREATE TABLE IF NOT EXISTS approvals (
  tenant_id text NOT NULL,
  approval_id uuid PRIMARY KEY,
  run_id text NOT NULL,
  session_id uuid NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  approval_type text NOT NULL,
  status text NOT NULL,
  requested_by text NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  resolution jsonb NULL,
  wait_event_type text NULL,
  wait_event_key text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_approvals_tenant_run_status
  ON approvals (tenant_id, run_id, status);

CREATE TABLE IF NOT EXISTS workspace_bindings (
  tenant_id text NOT NULL,
  binding_id uuid PRIMARY KEY,
  workspace_id text NOT NULL,
  run_id text NOT NULL,
  session_id uuid NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  task_id text NULL,
  strategy text NOT NULL DEFAULT 'worktree',
  sandbox_id text NOT NULL,
  repo_url text NOT NULL,
  repo_ref text NOT NULL,
  base_ref text NOT NULL,
  worktree_path text NOT NULL,
  branch_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_binding_workspace
  ON workspace_bindings (tenant_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_bindings_tenant_run
  ON workspace_bindings (tenant_id, run_id);

CREATE TABLE IF NOT EXISTS worker_leases (
  tenant_id text NOT NULL,
  lease_id uuid PRIMARY KEY,
  lease_type text NOT NULL,
  lease_key text NOT NULL,
  owner_session_id uuid NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_worker_lease_key
  ON worker_leases (tenant_id, lease_type, lease_key);
