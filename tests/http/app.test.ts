import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);

  return {
    createSessionRecord: vi.fn(async () => ({
      sessionId: "de305d54-75b4-431b-adb2-eb6b9e546014",
      status: "configured"
    })),
    listRunSessions: vi.fn(async () => [
      {
        tenantId: "tenant-fixture",
        sessionId: "de305d54-75b4-431b-adb2-eb6b9e546014",
        runId: "run-123",
        sessionType: "run",
        status: "configured",
        parentSessionId: null,
        createdAt: new Date("2026-04-14T00:00:00.000Z"),
        updatedAt: new Date("2026-04-14T00:00:00.000Z"),
        metadata: {
          repo: {
            source: "localPath"
          }
        }
      }
    ]),
    appendSessionEvent: vi.fn(async () => ({
      seq: 1,
      eventType: "session.started",
      ts: new Date("2026-04-14T00:00:01.000Z"),
      actor: "keystone",
      severity: "info",
      artifactRefId: null
    })),
    listRunEvents: vi.fn(async () => [
      {
        eventId: crypto.randomUUID(),
        tenantId: "tenant-fixture",
        sessionId: "de305d54-75b4-431b-adb2-eb6b9e546014",
        runId: "run-123",
        taskId: null,
        seq: 1,
        eventType: "session.started",
        actor: "keystone",
        severity: "info",
        ts: new Date("2026-04-14T00:00:01.000Z"),
        idempotencyKey: null,
        artifactRefId: null,
        payload: {}
      }
    ]),
    listRunArtifacts: vi.fn(async () => []),
    getApprovalRecord: vi.fn(async () => undefined),
    resolveApprovalRecord: vi.fn(async () => ({
      status: "approved",
      resolvedAt: new Date("2026-04-14T00:00:02.000Z"),
      waitEventType: "approval.resolved.approval-1"
    })),
    getRunCoordinatorStub: vi.fn(() => ({
      initialize: vi.fn(async () => undefined),
      publish: vi.fn(async () => undefined),
      getSnapshot: vi.fn(async () => ({
        tenantId: "tenant-fixture",
        runId: "run-123",
        status: "configured",
        updatedAt: "2026-04-14T00:00:01.000Z",
        websocketCount: 0,
        latestEvent: null,
        eventCount: 1
      })),
      fetch: vi.fn(async () => new Response("ws-ok", { status: 200 }))
    })),
    getTaskSessionStub: vi.fn(() => ({
      initialize: vi.fn(async () => undefined),
      ensureWorkspace: vi.fn(async () => ({
        workspace: {
          workspaceId: "workspace-smoke",
          worktreePath: "/workspace/tasks/sandbox-smoke"
        }
      })),
      startProcess: vi.fn(async () => undefined),
      pollProcess: vi.fn(async () => ({
        activeProcess: {
          status: "completed",
          exitCode: 0
        }
      })),
      teardown: vi.fn(async () => undefined)
    })),
    compileRunPlan: vi.fn(async () => ({
      plan: {
        decisionPackageId: "demo-greeting-update",
        summary: "Compile smoke produced a single implementation task.",
        tasks: [
          {
            taskId: "task-greeting-tone",
            title: "Adjust the greeting implementation",
            summary: "Change the greeting in a reviewable way.",
            instructions: ["Edit the greeting implementation.", "Run the fixture tests."],
            acceptanceCriteria: ["Fixture tests stay green."],
            dependsOn: []
          }
        ]
      },
      completion: {
        id: "chatcmpl-demo",
        model: "gemini-3-flash-preview",
        finishReason: "stop",
        usage: {
          totalTokens: 42
        }
      },
      planArtifactRef: {
        artifactRefId: crypto.randomUUID()
      },
      taskHandoffArtifactRefs: [
        {
          artifactRefId: crypto.randomUUID()
        }
      ]
    })),
    createWorkerDatabaseClient: vi.fn(() => ({
      close,
      db: {},
      sql: {}
    })),
    runWorkflowCreate: vi.fn(async () => ({
      id: "run-workflow-instance"
    })),
    runWorkflowGet: vi.fn(async () => ({
      sendEvent: vi.fn(async () => undefined)
    }))
  };
});

vi.mock("../../src/lib/db/client", () => ({
  createWorkerDatabaseClient: mocked.createWorkerDatabaseClient
}));

vi.mock("../../src/lib/db/runs", () => ({
  createSessionRecord: mocked.createSessionRecord,
  listRunSessions: mocked.listRunSessions
}));

vi.mock("../../src/lib/db/events", () => ({
  appendSessionEvent: mocked.appendSessionEvent,
  listRunEvents: mocked.listRunEvents
}));

vi.mock("../../src/lib/db/artifacts", () => ({
  listRunArtifacts: mocked.listRunArtifacts
}));

vi.mock("../../src/lib/db/approvals", () => ({
  getApprovalRecord: mocked.getApprovalRecord,
  resolveApprovalRecord: mocked.resolveApprovalRecord
}));

vi.mock("../../src/lib/auth/tenant", () => ({
  getRunCoordinatorStub: mocked.getRunCoordinatorStub,
  getTaskSessionStub: mocked.getTaskSessionStub
}));

vi.mock("../../src/keystone/compile/plan-run", () => ({
  compileRunPlan: mocked.compileRunPlan
}));

const { app } = await import("../../src/http/app");

const env = {
  ARTIFACTS_BUCKET: {} as R2Bucket,
  HYPERDRIVE: {
    connectionString: "postgres://test"
  } as Hyperdrive,
  KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:4001",
  KEYSTONE_CHAT_COMPLETIONS_MODEL: "gemini-3-flash-preview",
  KEYSTONE_DEV_TENANT_ID: "tenant-local",
  KEYSTONE_DEV_TOKEN: "secret-dev-token",
  RUN_WORKFLOW: {
    create: mocked.runWorkflowCreate,
    get: mocked.runWorkflowGet
  } as unknown as Workflow<unknown>,
  RUN_COORDINATOR: {} as DurableObjectNamespace,
  SANDBOX: {} as DurableObjectNamespace,
  TASK_SESSION: {} as DurableObjectNamespace
} as const;

describe("app", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.createWorkerDatabaseClient.mockReturnValue({
      close: vi.fn(async () => undefined),
      db: {},
      sql: {}
    });
    mocked.runWorkflowCreate.mockResolvedValue({
      id: "run-workflow-instance"
    });
    mocked.runWorkflowGet.mockResolvedValue({
      sendEvent: vi.fn(async () => undefined)
    });
  });

  it("serves the health routes without auth", async () => {
    const response = await app.request("http://example.com/v1/health", {}, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      llmBaseUrl: "http://localhost:4001"
    });
  });

  it("requires auth for run creation", async () => {
    const response = await app.request(
      "http://example.com/v1/runs",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repo: {
            localPath: "./fixtures/demo-target"
          },
          decisionPackage: {
            localPath: "./fixtures/demo-decision-package/decision-package.json"
          }
        })
      },
      env
    );

    expect(response.status).toBe(401);
  });

  it("accepts a tenant-scoped run request with dev auth", async () => {
    const response = await app.request(
      "http://example.com/v1/runs",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          repo: {
            localPath: "./fixtures/demo-target"
          },
          decisionPackage: {
            localPath: "./fixtures/demo-decision-package/decision-package.json"
          }
        })
      },
      env
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      status: "accepted",
      tenantId: "tenant-fixture",
      inputMode: {
        repo: "localPath",
        decisionPackage: "localPath"
      },
      workflowInstanceId: expect.any(String)
    });
  });

  it("returns a run summary for an existing run", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      runId: "run-123",
      tenantId: "tenant-fixture",
      status: "configured"
    });
  });

  it("returns a not-found response for unknown approvals", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/approvals/approval-1/resolve",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          resolution: "approved"
        })
      },
      env
    );

    expect(response.status).toBe(404);
  });

  it("resolves approvals and signals the workflow instance", async () => {
    mocked.getApprovalRecord.mockResolvedValueOnce({
      approvalId: "approval-1",
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "de305d54-75b4-431b-adb2-eb6b9e546014",
      waitEventType: "approval.resolved.approval-1"
    } as never);

    const response = await app.request(
      "http://example.com/v1/runs/run-123/approvals/approval-1/resolve",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          resolution: "approved"
        })
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      approvalId: "approval-1",
      runId: "run-123",
      status: "approved"
    });
    expect(mocked.runWorkflowGet).toHaveBeenCalledTimes(1);
  });

  it("proxies the websocket route to the coordinator stub", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/ws",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("ws-ok");
  });

  it("executes the compile smoke route with dev auth", async () => {
    const response = await app.request(
      "http://example.com/internal/dev/compile-smoke",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      taskCount: 1,
      model: "gemini-3-flash-preview"
    });
  });
});
