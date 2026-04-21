UPDATE artifact_refs AS artifact
SET project_id = run.project_id
FROM runs AS run
WHERE artifact.project_id IS NULL
  AND artifact.run_id = run.run_id;

DELETE FROM artifact_refs AS artifact
WHERE artifact.project_id IS NULL;

ALTER TABLE runs
  ALTER COLUMN sandbox_id SET NOT NULL;

ALTER TABLE artifact_refs
  ALTER COLUMN project_id SET NOT NULL,
  ALTER COLUMN artifact_kind SET NOT NULL,
  ALTER COLUMN bucket SET NOT NULL,
  ALTER COLUMN object_key SET NOT NULL;
