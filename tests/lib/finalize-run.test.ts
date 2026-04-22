import { beforeEach, describe, expect, it, vi } from "vitest";

import { runSummaryArtifactKey } from "../../src/lib/artifacts/keys";

const mocked = vi.hoisted(() => {
  const state = {
    artifactRefs: [] as Array<Record<string, unknown>>,
    deletedObjects: [] as string[],
    jsonWrites: [] as Array<{ key: string; value: unknown }>,
    runUpdates: [] as Array<Record<string, unknown>>
  };

  function reset() {
    state.artifactRefs.length = 0;
    state.deletedObjects.length = 0;
    state.jsonWrites.length = 0;
    state.runUpdates.length = 0;
  }

  return {
    state,
    reset,
    createArtifactRef: vi.fn(async (_client, input) => {
      const artifactRef = {
        artifactRefId: "run-summary-artifact",
        tenantId: input.tenantId,
        projectId: input.projectId,
        runId: input.runId,
        artifactKind: input.artifactKind,
        storageBackend: input.storageBackend,
        bucket: input.bucket,
        objectKey: input.objectKey,
        objectVersion: input.objectVersion ?? null,
        etag: input.etag ?? null,
        contentType: input.contentType,
        sha256: input.sha256 ?? null,
        sizeBytes: input.sizeBytes ?? null
      };
      state.artifactRefs.push(artifactRef as Record<string, unknown>);
      return artifactRef;
    }),
    deleteArtifactRef: vi.fn(async (_client, input) => {
      const index = state.artifactRefs.findIndex(
        (artifactRef) => artifactRef.artifactRefId === input.artifactRefId
      );

      if (index === -1) {
        return null;
      }

      const [deleted] = state.artifactRefs.splice(index, 1);
      return deleted ?? null;
    }),
    findArtifactRefByObjectKey: vi.fn(async (_client, input) => {
      return (
        state.artifactRefs.find(
          (artifactRef) =>
            artifactRef.bucket === input.bucket &&
            artifactRef.objectKey === input.objectKey &&
            artifactRef.runId === input.runId &&
            artifactRef.artifactKind === input.artifactKind
        ) ?? null
      );
    }),
    getArtifactRef: vi.fn(async () => null),
    putArtifactJson: vi.fn(async (_bucket, _namespace, key, value) => {
      state.jsonWrites.push({ key, value });
      return {
        storageBackend: "r2",
        storageUri: `r2://keystone-artifacts-dev/${key}`,
        key,
        etag: "etag-run-summary",
        sizeBytes: JSON.stringify(value).length
      };
    }),
    deleteArtifactObject: vi.fn(async (_bucket, key) => {
      state.deletedObjects.push(key);
    }),
    getRunRecord: vi.fn(async () => ({
      tenantId: "tenant-fixture",
      runId: "run-123",
      projectId: "project-123",
      workflowInstanceId: "run-workflow-123",
      executionEngine: "scripted",
      sandboxId: "sandbox-run-123",
      status: "active",
      compiledSpecRevisionId: null,
      compiledArchitectureRevisionId: null,
      compiledExecutionPlanRevisionId: null,
      compiledAt: null,
      startedAt: new Date("2026-04-17T00:00:00.000Z"),
      endedAt: null,
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    })),
    listRunTasks: vi.fn(async () => [
      {
        runTaskId: "run-task-1",
        runId: "run-123",
        name: "Implement the change",
        description: "Apply the approved change.",
        status: "completed",
        conversationAgentClass: null,
        conversationAgentName: null,
        startedAt: new Date("2026-04-17T00:01:00.000Z"),
        endedAt: new Date("2026-04-17T00:02:00.000Z"),
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        updatedAt: new Date("2026-04-17T00:02:00.000Z")
      }
    ]),
    listRunTaskDependencies: vi.fn(async () => []),
    updateRunRecord: vi.fn(async (_client, input) => {
      state.runUpdates.push(input as Record<string, unknown>);
      return {
        ...input,
        projectId: "project-123",
        workflowInstanceId: "run-workflow-123",
        executionEngine: "scripted",
        sandboxId: "sandbox-run-123",
        compiledSpecRevisionId: null,
        compiledArchitectureRevisionId: null,
        compiledExecutionPlanRevisionId: null,
        compiledAt: null,
        startedAt: new Date("2026-04-17T00:00:00.000Z"),
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        updatedAt: new Date("2026-04-17T00:00:00.000Z")
      };
    })
  };
});

vi.mock("../../src/lib/db/artifacts", () => ({
  createArtifactRef: mocked.createArtifactRef,
  deleteArtifactRef: mocked.deleteArtifactRef,
  findArtifactRefByObjectKey: mocked.findArtifactRefByObjectKey,
  getArtifactRef: mocked.getArtifactRef
}));

vi.mock("../../src/lib/artifacts/r2", () => ({
  deleteArtifactObject: mocked.deleteArtifactObject,
  putArtifactJson: mocked.putArtifactJson
}));

vi.mock("../../src/lib/db/runs", () => ({
  getRunRecord: mocked.getRunRecord,
  listRunTasks: mocked.listRunTasks,
  listRunTaskDependencies: mocked.listRunTaskDependencies,
  updateRunRecord: mocked.updateRunRecord
}));

const { finalizeRun } = await import("../../src/keystone/integration/finalize-run");

describe("finalizeRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.reset();
  });

  it("writes a run summary artifact and archives a successful run", async () => {
    const result = await finalizeRun(
      {
        ARTIFACTS_BUCKET: {} as R2Bucket
      } as never,
      {} as never,
      {
        tenantId: "tenant-fixture",
        runId: "run-123"
      }
    );

    expect(result.finalStatus).toBe("archived");
    expect(mocked.updateRunRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        runId: "run-123",
        status: "archived",
        endedAt: expect.any(Date)
      })
    );
    expect(mocked.createArtifactRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        projectId: "project-123",
        runId: "run-123",
        artifactKind: "run_summary",
        bucket: "keystone-artifacts-dev",
        objectKey: runSummaryArtifactKey("tenant-fixture", "run-123")
      })
    );
    expect(mocked.state.jsonWrites).toEqual([
      expect.objectContaining({
        key: runSummaryArtifactKey("tenant-fixture", "run-123")
      })
    ]);
  });

  it("reuses an existing deterministic run-summary artifact ref on retry", async () => {
    mocked.state.artifactRefs.push({
      artifactRefId: "run-summary-artifact-existing",
      tenantId: "tenant-fixture",
      projectId: "project-123",
      runId: "run-123",
      artifactKind: "run_summary",
      storageBackend: "r2",
      bucket: "keystone-artifacts-dev",
      objectKey: runSummaryArtifactKey("tenant-fixture", "run-123"),
      objectVersion: null,
      etag: "etag-run-summary",
      contentType: "application/json; charset=utf-8",
      sha256: null,
      sizeBytes: 128
    });

    const result = await finalizeRun(
      {
        ARTIFACTS_BUCKET: {} as R2Bucket
      } as never,
      {} as never,
      {
        tenantId: "tenant-fixture",
        runId: "run-123"
      }
    );

    expect(result.artifactRef.artifactRefId).toBe("run-summary-artifact-existing");
    expect(mocked.createArtifactRef).not.toHaveBeenCalled();
  });

  it("cleans up a newly written summary artifact when run status persistence fails", async () => {
    mocked.updateRunRecord.mockRejectedValueOnce(new Error("status update failed"));

    await expect(
      finalizeRun(
        {
          ARTIFACTS_BUCKET: {} as R2Bucket
        } as never,
        {} as never,
        {
          tenantId: "tenant-fixture",
          runId: "run-123"
        }
      )
    ).rejects.toThrow("status update failed");

    expect(mocked.deleteArtifactRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        artifactRefId: "run-summary-artifact"
      })
    );
    expect(mocked.deleteArtifactObject).toHaveBeenCalledWith(
      expect.anything(),
      runSummaryArtifactKey("tenant-fixture", "run-123")
    );
  });
});
