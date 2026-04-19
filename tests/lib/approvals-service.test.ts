import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  buildStableSessionId: vi.fn(async () => "approval-1"),
  createApprovalRecord: vi.fn(async () => undefined),
  getApprovalRecord: vi.fn(async () => ({
    approvalId: "approval-1",
    tenantId: "tenant-fixture",
    runId: "run-123",
    sessionId: "run-session-123",
    approvalType: "outbound_network",
    status: "pending",
    requestedBy: "keystone",
    requestedAt: new Date("2026-04-17T00:00:00.000Z"),
    resolvedAt: null,
    resolution: null,
    metadata: {},
    waitEventType: "approval.resolved.approval-1",
    waitEventKey: "run-123"
  })),
  getSessionRecord: vi.fn(async () => ({
    tenantId: "tenant-fixture",
    sessionId: "run-session-123",
    runId: "run-123",
    sessionType: "run",
    status: "paused_for_approval",
    parentSessionId: null,
    metadata: {
      taskId: "task-greeting-tone"
    },
    createdAt: new Date("2026-04-17T00:00:00.000Z"),
    updatedAt: new Date("2026-04-17T00:00:00.000Z")
  })),
  updateSessionStatus: vi.fn(async () => ({
    tenantId: "tenant-fixture",
    sessionId: "run-session-123",
    runId: "run-123",
    sessionType: "run",
    status: "paused_for_approval",
    parentSessionId: null,
    metadata: {
      taskId: "task-greeting-tone"
    },
    createdAt: new Date("2026-04-17T00:00:00.000Z"),
    updatedAt: new Date("2026-04-17T00:00:00.000Z")
  })),
  appendAndPublishRunEvent: vi.fn(async () => ({
    eventId: crypto.randomUUID(),
    ts: new Date("2026-04-17T00:00:00.000Z")
  }))
}));

vi.mock("../../src/lib/workflows/ids", () => ({
  buildStableSessionId: mocked.buildStableSessionId
}));

vi.mock("../../src/lib/db/approvals", () => ({
  createApprovalRecord: mocked.createApprovalRecord,
  getApprovalRecord: mocked.getApprovalRecord
}));

vi.mock("../../src/lib/db/runs", () => ({
  getSessionRecord: mocked.getSessionRecord,
  updateSessionStatus: mocked.updateSessionStatus
}));

vi.mock("../../src/lib/events/publish", () => ({
  appendAndPublishRunEvent: mocked.appendAndPublishRunEvent
}));

const { ensureApprovalRequest } = await import("../../src/lib/approvals/service");

describe("ensureApprovalRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.buildStableSessionId.mockResolvedValue("approval-1");
    mocked.createApprovalRecord.mockResolvedValue(undefined);
    mocked.getApprovalRecord.mockResolvedValue({
      approvalId: "approval-1",
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "run-session-123",
      approvalType: "outbound_network",
      status: "pending",
      requestedBy: "keystone",
      requestedAt: new Date("2026-04-17T00:00:00.000Z"),
      resolvedAt: null,
      resolution: null,
      metadata: {},
      waitEventType: "approval.resolved.approval-1",
      waitEventKey: "run-123"
    });
    mocked.getSessionRecord.mockResolvedValue({
      tenantId: "tenant-fixture",
      sessionId: "run-session-123",
      runId: "run-123",
      sessionType: "run",
      status: "paused_for_approval",
      parentSessionId: null,
      metadata: {
        taskId: "task-greeting-tone"
      },
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    });
    mocked.updateSessionStatus.mockResolvedValue({
      tenantId: "tenant-fixture",
      sessionId: "run-session-123",
      runId: "run-123",
      sessionType: "run",
      status: "paused_for_approval",
      parentSessionId: null,
      metadata: {
        taskId: "task-greeting-tone"
      },
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z")
    });
  });

  it("re-publishes a pending approval request on retry after the approval row already exists", async () => {
    const result = await ensureApprovalRequest({} as never, { RUN_COORDINATOR: {} as never }, {
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "run-session-123",
      approvalType: "outbound_network",
      reason: "Repo access needs approval.",
      metadata: {
        projectId: "project-fixture"
      }
    });

    expect(result).toMatchObject({
      approvalId: "approval-1",
      waitEventType: "approval.resolved.approval-1",
      status: "pending"
    });
    expect(mocked.getApprovalRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        approvalId: "approval-1"
      })
    );
    expect(mocked.updateSessionStatus).not.toHaveBeenCalled();
    expect(mocked.appendAndPublishRunEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        runId: "run-123",
        sessionId: "run-session-123",
        taskId: "task-greeting-tone",
        eventType: "approval.requested",
        idempotencyKey: "approval.requested:approval-1",
        status: "paused_for_approval",
        payload: expect.objectContaining({
          approvalId: "approval-1",
          approvalType: "outbound_network",
          reason: "Repo access needs approval.",
          projectId: "project-fixture"
        })
      })
    );
  });
});
