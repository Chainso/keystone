ALTER TABLE artifact_refs
  ALTER COLUMN run_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_artifact_refs_tenant_object
  ON artifact_refs (tenant_id, bucket, object_key);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_runs_compile_provenance_complete'
  ) THEN
    ALTER TABLE runs
      ADD CONSTRAINT chk_runs_compile_provenance_complete
      CHECK (
        (
          compiled_spec_revision_id IS NULL
          AND compiled_architecture_revision_id IS NULL
          AND compiled_execution_plan_revision_id IS NULL
          AND compiled_at IS NULL
        )
        OR
        (
          compiled_spec_revision_id IS NOT NULL
          AND compiled_architecture_revision_id IS NOT NULL
          AND compiled_execution_plan_revision_id IS NOT NULL
          AND compiled_at IS NOT NULL
        )
      );
  END IF;
END $$;
