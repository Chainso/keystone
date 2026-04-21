ALTER TABLE artifact_refs
  DROP COLUMN IF EXISTS kind,
  DROP COLUMN IF EXISTS storage_uri;
