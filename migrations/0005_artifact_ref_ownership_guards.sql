DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'artifact_refs_run_task_id_run_tasks_run_task_id_fk'
  ) THEN
    ALTER TABLE artifact_refs
      DROP CONSTRAINT artifact_refs_run_task_id_run_tasks_run_task_id_fk;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_artifact_refs_run_task_requires_run'
  ) THEN
    ALTER TABLE artifact_refs
      ADD CONSTRAINT chk_artifact_refs_run_task_requires_run
      CHECK (run_task_id IS NULL OR run_id IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_artifact_refs_run_task'
  ) THEN
    ALTER TABLE artifact_refs
      ADD CONSTRAINT fk_artifact_refs_run_task
      FOREIGN KEY (run_id, run_task_id)
      REFERENCES run_tasks(run_id, run_task_id);
  END IF;
END $$;
