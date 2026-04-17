import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const state = {
    artifactRefInputs: [] as Array<Record<string, unknown>>,
    events: [] as Array<Record<string, unknown>>,
    jsonWrites: [] as Array<{ key: string; value: unknown }>,
    statusUpdates: [] as Array<Record<string, unknown>>
  };

  function reset() {
    state.artifactRefInputs.length = 0;
    state.events.length = 0;
    state.jsonWrites.length = 0;
    state.statusUpdates.length = 0;
  }

  return {
    state,
    reset,
    createArtifactRef: vi.fn(async (_client, input) => {
      state.artifactRefInputs.push(input as Record<string, unknown>);

      return {
        artifactRefId: "run-summary-artifact",
        tenantId: input.tenantId,
        runId: input.runId,
        sessionId: input.sessionId,
        taskId: null,
        kind: input.kind,
        storageBackend: input.storageBackend,
        storageUri: input.storageUri,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes ?? null,
        metadata: input.metadata ?? null,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        updatedAt: new Date("2026-04-17T00:00:00.000Z")
      };
    }),
    putArtifactJson: vi.fn(async (_bucket, _namespace, key, value) => {
      state.jsonWrites.push({
        key,
        value
      });

      return {
        storageBackend: "r2",
        storageUri: `r2://keystone-artifacts-dev/${key}`,
        key,
        etag: "etag-run-summary",
        sizeBytes: JSON.stringify(value).length
      };
    }),
    appendAndPublishRunEvent: vi.fn(async (_client, _env, input) => {
      state.events.push(input as Record<string, unknown>);

      return {
        eventId: "event-run-summary",
        ts: new Date("2026-04-17T00:00:00.000Z")
      };
    }),
    getSessionRecord: vi.fn(async () => ({
      tenantId: "tenant-fixture",
      sessionId: "run-session-123",
      runId: "run-123",
      sessionType: "run",
      status: "active",
      parentSessionId: null,
      metadata: {
        runtime: "think",
        options: {
          thinkMode: "live",
          preserveSandbox: true
        },
        repo: {
          source: "localPath",
          localPath: "./fixtures/demo-target"
        },
        workflowInstanceId: "run-workflow-123"
      },
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    })),
    updateSessionStatus: vi.fn(async (_client, input) => {
      state.statusUpdates.push(input as Record<string, unknown>);

      return {
        tenantId: input.tenantId,
        sessionId: input.sessionId,
        runId: "run-123",
        sessionType: "run",
        status: input.status,
        parentSessionId: null,
        metadata: input.metadata ?? null,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        updatedAt: new Date("2026-04-17T00:00:00.000Z")
      };
    })
  };
});

vi.mock("../../src/lib/db/artifacts", () => ({
  createArtifactRef: mocked.createArtifactRef
}));

vi.mock("../../src/lib/artifacts/r2", () => ({
  putArtifactJson: mocked.putArtifactJson
}));

vi.mock("../../src/lib/events/publish", () => ({
  appendAndPublishRunEvent: mocked.appendAndPublishRunEvent
}));

vi.mock("../../src/lib/db/runs", () => ({
  getSessionRecord: mocked.getSessionRecord,
  updateSessionStatus: mocked.updateSessionStatus
}));

const { finalizeRun } = await import("../../src/keystone/integration/finalize-run");

describe("finalizeRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.reset();
  });

  it("preserves existing run-session metadata when archiving the run", async () => {
    const result = await finalizeRun(
      {
        ARTIFACTS_BUCKET: {} as R2Bucket
      } as never,
      {} as never,
      {
        tenantId: "tenant-fixture",
        runId: "run-123",
        runSessionId: "run-session-123",
        taskResults: [
          {
            taskId: "task-greeting-tone",
            workflowStatus: "complete",
            processStatus: "completed",
            exitCode: 0,
            logArtifactRefId: null
          }
        ]
      }
    );

    expect(result.finalStatus).toBe("archived");
    expect(mocked.state.statusUpdates).toEqual([
      expect.objectContaining({
        status: "archived",
        metadata: expect.objectContaining({
          runtime: "think",
          options: {
            thinkMode: "live",
            preserveSandbox: true
          },
          repo: {
            source: "localPath",
            localPath: "./fixtures/demo-target"
          },
          workflowInstanceId: "run-workflow-123",
          runSummaryArtifactRefId: "run-summary-artifact",
          successfulTasks: 1,
          failedTasks: 0
        })
      })
    ]);
    expect(mocked.state.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "session.archived",
          artifactRefId: "run-summary-artifact",
          status: "archived"
        })
      ])
    );
  });
});
