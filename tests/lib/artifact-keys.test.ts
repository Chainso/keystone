import { describe, expect, it } from "vitest";

import {
  runPlanArtifactKey,
  runSummaryArtifactKey,
  sandboxBackupArtifactKey,
  taskHandoffArtifactKey,
  taskLogArtifactKey
} from "../../src/lib/artifacts/keys";
import {
  artifactKindValues,
  parseAgentRuntimeArtifactKind,
  parseArtifactKind
} from "../../src/lib/artifacts/model";
import { artifactResourceSchema } from "../../src/http/api/v1/artifacts/contracts";

describe("artifact helpers", () => {
  it("builds deterministic run-scoped keys", () => {
    expect(runPlanArtifactKey("tenant-a", "run-1")).toBe(
      "tenants/tenant-a/runs/run-1/plan/plan.json"
    );
    expect(taskHandoffArtifactKey("tenant-a", "run-1", "task/42")).toBe(
      "tenants/tenant-a/runs/run-1/tasks/task%2F42/handoff.json"
    );
    expect(taskLogArtifactKey("tenant-a", "run-1", "task/42", "attempt-1")).toBe(
      "tenants/tenant-a/runs/run-1/tasks/task%2F42/logs/attempt-1.jsonl"
    );
    expect(runSummaryArtifactKey("tenant-a", "run-1")).toBe(
      "tenants/tenant-a/runs/run-1/release/run-summary.json"
    );
  });

  it("builds deterministic sandbox backup keys", () => {
    expect(sandboxBackupArtifactKey("tenant-a", "sandbox/alpha", "backup-1")).toBe(
      "tenants/tenant-a/sandboxes/sandbox%2Falpha/backups/backup-1.squashfs"
    );
  });

  it("admits only the surviving live artifact families", () => {
    expect(artifactKindValues).toEqual([
      "document_revision",
      "run_plan",
      "task_handoff",
      "task_log",
      "run_note",
      "run_summary",
      "staged_output"
    ]);
    expect(parseArtifactKind("run_summary")).toBe("run_summary");
    expect(() => parseArtifactKind("release_pack")).toThrow(/not supported/i);
    expect(parseAgentRuntimeArtifactKind("run_note")).toBe("run_note");
    expect(() => parseAgentRuntimeArtifactKind("run_summary")).toThrow(/not supported/i);
  });

  it("rejects stale artifact kinds at the public resource schema seam", () => {
    expect(() =>
      artifactResourceSchema.parse({
        resourceType: "artifact",
        scaffold: {
          implementation: "reused",
          note: null
        },
        artifactId: "artifact-1",
        kind: "release_pack",
        contentType: "application/zip",
        sizeBytes: 42,
        sha256: null,
        contentUrl: "/v1/artifacts/artifact-1/content"
      })
    ).toThrow();
  });
});
