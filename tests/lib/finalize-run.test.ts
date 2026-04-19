import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionStatus } from "../../src/maestro/contracts";
import {
  buildRunRow,
  buildSessionRow,
  createMirrorClient
} from "./run-session-mirror-fixture";

const mocked = vi.hoisted(() => {
  const state = {
    artifactRefs: [] as Array<Record<string, unknown>>,
    artifactRefInputs: [] as Array<Record<string, unknown>>,
    deletedObjects: [] as string[],
    events: [] as Array<Record<string, unknown>>,
    jsonWrites: [] as Array<{ key: string; value: unknown }>,
    statusUpdates: [] as Array<Record<string, unknown>>
  };

  function reset() {
    state.artifactRefs.length = 0;
    state.artifactRefInputs.length = 0;
    state.deletedObjects.length = 0;
    state.events.length = 0;
    state.jsonWrites.length = 0;
    state.statusUpdates.length = 0;
  }

  return {
    state,
    reset,
    createArtifactRef: vi.fn(async (_client, input) => {
      state.artifactRefInputs.push(input as Record<string, unknown>);
      const artifactRef = {
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
    getArtifactRef: vi.fn(async (_client, _tenantId, artifactRefId) => {
      return (
        state.artifactRefs.find((artifactRef) => artifactRef.artifactRefId === artifactRefId) ?? null
      );
    }),
    findArtifactRefByStorageUri: vi.fn(async (_client, input) => {
      return (
        state.artifactRefs.find(
          (artifactRef) =>
            artifactRef.storageUri === input.storageUri &&
            artifactRef.runId === input.runId &&
            artifactRef.sessionId === input.sessionId &&
            artifactRef.kind === input.kind
        ) ?? null
      );
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
    deleteArtifactObject: vi.fn(async (_bucket, key) => {
      state.deletedObjects.push(key);
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
  createArtifactRef: mocked.createArtifactRef,
  deleteArtifactRef: mocked.deleteArtifactRef,
  findArtifactRefByStorageUri: mocked.findArtifactRefByStorageUri,
  getArtifactRef: mocked.getArtifactRef
}));

vi.mock("../../src/lib/artifacts/r2", () => ({
  deleteArtifactObject: mocked.deleteArtifactObject,
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
const {
  createRunSessionMirror: actualCreateRunSessionMirror,
  deleteRunSessionMirror: actualDeleteRunSessionMirror,
  getSessionRecord: actualGetSessionRecord,
  updateSessionStatus: actualUpdateSessionStatus
} = await vi.importActual<typeof import("../../src/lib/db/runs")>("../../src/lib/db/runs");

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

  it("reuses an existing deterministic run-summary artifact ref on retry", async () => {
    mocked.state.artifactRefs.push({
      artifactRefId: "run-summary-artifact-existing",
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "run-session-123",
      taskId: null,
      runTaskId: null,
      kind: "run_summary",
      storageBackend: "r2",
      storageUri:
        "r2://keystone-artifacts-dev/tenants/tenant-fixture/runs/run-123/release/run-summary.json",
      contentType: "application/json; charset=utf-8",
      sizeBytes: 128,
      metadata: {
        key: "tenants/tenant-fixture/runs/run-123/release/run-summary.json"
      },
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    });
    mocked.putArtifactJson.mockResolvedValueOnce({
      storageBackend: "r2",
      storageUri:
        "r2://keystone-artifacts-dev/tenants/tenant-fixture/runs/run-123/release/run-summary.json",
      key: "tenants/tenant-fixture/runs/run-123/release/run-summary.json",
      etag: "etag-run-summary-retry",
      sizeBytes: 64
    });

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

    expect(result.artifactRef.artifactRefId).toBe("run-summary-artifact-existing");
    expect(mocked.createArtifactRef).not.toHaveBeenCalled();
  });

  it("cleans up a new summary artifact when final status persistence fails", async () => {
    mocked.updateSessionStatus.mockRejectedValueOnce(new Error("status update failed"));

    await expect(
      finalizeRun(
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
      )
    ).rejects.toThrow(/status update failed/);

    expect(mocked.deleteArtifactRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        artifactRefId: "run-summary-artifact"
      })
    );
    expect(mocked.deleteArtifactObject).toHaveBeenCalledWith(
      expect.anything(),
      "tenants/tenant-fixture/runs/run-123/release/run-summary.json"
    );
  });

  it("mirrors finalization status into the authoritative run row", async () => {
    const { client, getState } = createMirrorClient({
      session: buildSessionRow(),
      run: buildRunRow()
    });

    mocked.getSessionRecord.mockImplementationOnce(
      ((dbClient: unknown, tenantId: string, sessionId: string) =>
        actualGetSessionRecord(dbClient as never, tenantId, sessionId)) as never
    );
    mocked.updateSessionStatus.mockImplementationOnce(
      ((dbClient: unknown, input: { tenantId: string; sessionId: string; status: SessionStatus; metadata?: Record<string, unknown> | undefined }) =>
        actualUpdateSessionStatus(dbClient as never, input)) as never
    );

    const result = await finalizeRun(
      {
        ARTIFACTS_BUCKET: {} as R2Bucket
      } as never,
      client as never,
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

    const state = getState();

    expect(result.finalStatus).toBe("archived");
    expect(state.session?.status).toBe("archived");
    expect(state.session?.metadata).toMatchObject({
      runSummaryArtifactRefId: "run-summary-artifact",
      successfulTasks: 1,
      failedTasks: 0
    });
    expect(state.run).toMatchObject({
      runId: "run-123",
      executionEngine: "think",
      status: "archived"
    });
    expect(state.run?.endedAt).toBeInstanceOf(Date);
  });
});

describe("run/session mirror safeguards", () => {
  it("creates the run/session mirror on the happy path", async () => {
    const { client, getState } = createMirrorClient();

    const mirrored = await actualCreateRunSessionMirror(client as never, {
      sessionSpec: {
        tenantId: "tenant-fixture",
        runId: "run-123",
        sessionType: "run",
        metadata: buildSessionRow({
          status: "configured",
          updatedAt: new Date("2026-04-17T00:00:00.000Z")
        }).metadata
      },
      projectId: "project-fixture",
      workflowInstanceId: "run-workflow-123",
      executionEngine: "think"
    });

    const state = getState();

    expect(mirrored.session).toMatchObject({
      runId: "run-123",
      sessionType: "run",
      status: "configured"
    });
    expect(mirrored.runRecord).toMatchObject({
      runId: "run-123",
      projectId: "project-fixture",
      executionEngine: "think",
      status: "configured"
    });
    expect(state.session).toMatchObject({
      runId: "run-123",
      status: "configured"
    });
    expect(state.run).toMatchObject({
      runId: "run-123",
      projectId: "project-fixture",
      status: "configured"
    });
  });

  it("deletes the mirrored session, events, and run rows together on cleanup", async () => {
    const { client, getState } = createMirrorClient({
      session: buildSessionRow(),
      run: buildRunRow(),
      events: [
        {
          eventId: crypto.randomUUID(),
          tenantId: "tenant-fixture",
          sessionId: "run-session-123",
          runId: "run-123",
          taskId: null,
          seq: 1,
          eventType: "session.started",
          actor: "keystone",
          severity: "info",
          ts: new Date("2026-04-17T00:00:00.000Z"),
          idempotencyKey: null,
          artifactRefId: null,
          payload: {}
        }
      ]
    });

    const deleted = await actualDeleteRunSessionMirror(client as never, {
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "run-session-123"
    });

    expect(deleted.deletedEvents).toHaveLength(1);
    expect(deleted.deletedSessions).toHaveLength(1);
    expect(deleted.deletedRuns).toHaveLength(1);
    expect(getState()).toMatchObject({
      session: null,
      run: null,
      events: []
    });
  });

  it("rolls back run creation if the session/run mirror cannot be written atomically", async () => {
    const { client, getState } = createMirrorClient({
      failRunInsert: true
    });

    await expect(
      actualCreateRunSessionMirror(client as never, {
        sessionSpec: {
          tenantId: "tenant-fixture",
          runId: "run-123",
          sessionType: "run",
          metadata: buildSessionRow().metadata
        },
        projectId: "project-fixture",
        workflowInstanceId: "run-workflow-123",
        executionEngine: "think"
      })
    ).rejects.toThrow(/run insert failed/);

    expect(getState()).toMatchObject({
      session: null,
      run: null
    });
  });

  it("backfills a missing run row from run-session metadata during terminal status updates", async () => {
    const { client, getState } = createMirrorClient({
      session: buildSessionRow(),
      run: null
    });

    const updated = await actualUpdateSessionStatus(client as never, {
      tenantId: "tenant-fixture",
      sessionId: "run-session-123",
      status: "archived",
      metadata: {
        ...buildSessionRow().metadata,
        runSummaryArtifactRefId: "run-summary-artifact",
        successfulTasks: 1,
        failedTasks: 0
      }
    });

    const state = getState();

    expect(updated.status).toBe("archived");
    expect(state.session?.status).toBe("archived");
    expect(state.run).toMatchObject({
      runId: "run-123",
      projectId: "project-fixture",
      workflowInstanceId: "run-workflow-123",
      executionEngine: "think",
      status: "archived"
    });
    expect(state.run?.endedAt).toBeInstanceOf(Date);
  });

  it("rolls back the session update when the mirrored run update fails", async () => {
    const { client, getState } = createMirrorClient({
      session: buildSessionRow(),
      run: buildRunRow(),
      failRunUpdate: true
    });

    await expect(
      actualUpdateSessionStatus(client as never, {
        tenantId: "tenant-fixture",
        sessionId: "run-session-123",
        status: "archived",
        metadata: {
          ...buildSessionRow().metadata,
          runSummaryArtifactRefId: "run-summary-artifact"
        }
      })
    ).rejects.toThrow(/run update failed/);

    const state = getState();

    expect(state.session?.status).toBe("active");
    expect(state.run?.status).toBe("active");
    expect(state.run?.endedAt).toBeNull();
  });
});
