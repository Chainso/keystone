import { describe, expect, it } from "vitest";

import {
  decisionPackageArtifactKey,
  integrationMergeReportArtifactKey,
  releasePackArtifactKey,
  sandboxBackupArtifactKey,
  taskEvidenceIndexArtifactKey,
  taskHandoffArtifactKey,
  taskLogArtifactKey
} from "../../src/lib/artifacts/keys";

describe("artifact key helpers", () => {
  it("builds deterministic run-scoped keys", () => {
    expect(decisionPackageArtifactKey("tenant-a", "run-1", "artifact-9")).toBe(
      "tenants/tenant-a/runs/run-1/inputs/decision-package/artifact-9.json"
    );
    expect(taskHandoffArtifactKey("tenant-a", "run-1", "task/42")).toBe(
      "tenants/tenant-a/runs/run-1/tasks/task%2F42/handoff.json"
    );
    expect(taskLogArtifactKey("tenant-a", "run-1", "task/42", "attempt-1")).toBe(
      "tenants/tenant-a/runs/run-1/tasks/task%2F42/logs/attempt-1.jsonl"
    );
    expect(taskEvidenceIndexArtifactKey("tenant-a", "run-1", "task/42", "attempt-1")).toBe(
      "tenants/tenant-a/runs/run-1/tasks/task%2F42/evidence/attempt-1/index.json"
    );
    expect(integrationMergeReportArtifactKey("tenant-a", "run-1", "merge-7")).toBe(
      "tenants/tenant-a/runs/run-1/integration/merge-7/merge-report.json"
    );
    expect(releasePackArtifactKey("tenant-a", "run-1")).toBe(
      "tenants/tenant-a/runs/run-1/release/release-pack.zip"
    );
  });

  it("builds deterministic sandbox backup keys", () => {
    expect(sandboxBackupArtifactKey("tenant-a", "sandbox/alpha", "backup-1")).toBe(
      "tenants/tenant-a/sandboxes/sandbox%2Falpha/backups/backup-1.squashfs"
    );
  });
});
