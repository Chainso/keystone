import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);
  const getThinkAgentStub = vi.fn(() => ({
    runImplementerTurn: vi.fn(async () => ({
      outcome: "completed",
      stagedArtifacts: [
        {
          path: "/artifacts/out/implementer-summary.md",
          kind: "run_note",
          contentType: "text/markdown; charset=utf-8",
          metadata: {
            fileName: "implementer-summary.md"
          }
        }
      ],
      events: [
        {
          eventType: "agent.turn.completed",
          payload: {
            stagedArtifactCount: 1
          }
        }
      ],
      summary: "Updated the greeting implementation.",
      metadata: {
        modelId: "mock-implementer"
      }
    }))
  }));

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
          strategy: "worktree",
          defaultComponentKey: "repo",
          repoUrl: "fixture://demo-target",
          repoRef: "main",
          baseRef: "main",
          workspaceRoot: "/workspace/runs/sandbox-smoke",
          workspaceTargetPath: "/workspace/runs/sandbox-smoke",
          codeRoot: "/workspace/runs/sandbox-smoke/code",
          defaultCwd: "/workspace/runs/sandbox-smoke/code/repo",
          repositoryPath: "/workspace/runs/sandbox-smoke/repositories/repo",
          worktreePath: "/workspace/runs/sandbox-smoke/code/repo",
          branchName: "keystone/sandbox-smoke",
          headSha: "abc123",
          components: [
            {
              componentKey: "repo",
              repoUrl: "fixture://demo-target",
              repoRef: "main",
              baseRef: "main",
              repositoryPath: "/workspace/runs/sandbox-smoke/repositories/repo",
              worktreePath: "/workspace/runs/sandbox-smoke/code/repo",
              branchName: "keystone/sandbox-smoke",
              headSha: "abc123"
            }
          ],
          agentBridge: {
            layout: {
              workspaceRoot: "/workspace",
              artifactsInRoot: "/artifacts/in",
              artifactsOutRoot: "/artifacts/out",
              keystoneRoot: "/keystone"
            },
            targets: {
              workspaceRoot: "/workspace/runs/sandbox-smoke",
              artifactsInRoot: "/artifacts/in",
              artifactsOutRoot: "/artifacts/out",
              keystoneRoot: "/keystone"
            },
            readOnlyRoots: ["/artifacts/in", "/keystone"],
            writableRoots: ["/workspace", "/artifacts/out"],
            controlFiles: {
              session: "/keystone/session.json",
              filesystem: "/keystone/filesystem.json",
              artifacts: "/keystone/artifacts.json"
            },
            projectedArtifacts: []
          }
        }
      })),
      startProcess: vi.fn(async () => undefined),
      pollProcess: vi.fn(async () => ({
        activeProcess: {
          status: "completed",
          exitCode: 0
        }
      })),
      preserveForInspection: vi.fn(async () => undefined),
      teardown: vi.fn(async () => undefined)
    })),
    getThinkAgentStub,
    getAgentByName: vi.fn(async () => getThinkAgentStub()),
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
        model: "gpt-5.4",
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

vi.mock("agents", () => ({
  getAgentByName: mocked.getAgentByName
}));

const { app } = await import("../../src/http/app");

const env = {
  ARTIFACTS_BUCKET: {} as R2Bucket,
  HYPERDRIVE: {
    connectionString: "postgres://test"
  } as Hyperdrive,
  KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
  KEYSTONE_CHAT_COMPLETIONS_MODEL: "gpt-5.4",
  KEYSTONE_DEV_TENANT_ID: "tenant-local",
  KEYSTONE_DEV_TOKEN: "secret-dev-token",
  RUN_WORKFLOW: {
    create: mocked.runWorkflowCreate,
    get: mocked.runWorkflowGet
  } as unknown as Workflow<unknown>,
  RUN_COORDINATOR: {} as DurableObjectNamespace,
  SANDBOX: {} as DurableObjectNamespace,
  TASK_SESSION: {} as DurableObjectNamespace,
  KEYSTONE_THINK_AGENT: {} as DurableObjectNamespace
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
      llmBaseUrl: "http://localhost:10531"
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
      runtime: "scripted",
      inputMode: {
        repo: "localPath",
        decisionPackage: "localPath"
      },
      workflowInstanceId: expect.any(String)
    });
    expect(mocked.runWorkflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          runtime: "scripted"
        })
      })
    );
  });

  it("keeps invalid run payloads on the existing non-project error path", async () => {
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
          repo: {},
          decisionPackage: {
            localPath: "./fixtures/demo-decision-package/decision-package.json"
          }
        })
      },
      env
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "internal_error",
        message: "Unexpected application error."
      }
    });
  });

  it("defaults Think runtime requests to mock validation mode", async () => {
    const response = await app.request(
      "http://example.com/v1/runs",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Agent-Runtime": "think",
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
      runtime: "think",
      options: {
        thinkMode: "mock",
        preserveSandbox: false
      }
    });
    expect(mocked.runWorkflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          runtime: "think",
          options: {
            thinkMode: "mock",
            preserveSandbox: false
          }
        })
      })
    );
  });

  it("passes an explicit live Think request into the workflow", async () => {
    const response = await app.request(
      "http://example.com/v1/runs",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Agent-Runtime": "think",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          repo: {
            localPath: "./fixtures/demo-target"
          },
          decisionPackage: {
            localPath: "./fixtures/demo-decision-package/decision-package.json"
          },
          options: {
            thinkMode: "live",
            preserveSandbox: true
          }
        })
      },
      env
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      status: "accepted",
      runtime: "think",
      options: {
        thinkMode: "live",
        preserveSandbox: true
      }
    });
    expect(mocked.runWorkflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          runtime: "think",
          options: {
            thinkMode: "live",
            preserveSandbox: true
          }
        })
      })
    );
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

  it("returns the persisted event log for an existing run", async () => {
    mocked.listRunEvents.mockResolvedValueOnce([
      {
        eventId: "event-1",
        tenantId: "tenant-fixture",
        sessionId: "task-session-1",
        runId: "run-123",
        taskId: "task-greeting-tone",
        seq: 1,
        eventType: "workspace.task_view_created",
        actor: "keystone",
        severity: "info",
        ts: new Date("2026-04-14T00:00:03.000Z"),
        idempotencyKey: null,
        artifactRefId: null,
        payload: {
          workspaceTargetPath: "/workspace/runs/run-123",
          defaultCwd: "/workspace/runs/run-123/code/repo",
          components: [
            {
              componentKey: "repo",
              worktreePath: "/workspace/runs/run-123/code/repo"
            }
          ]
        }
      },
      {
        eventId: "event-2",
        tenantId: "tenant-fixture",
        sessionId: "task-session-1",
        runId: "run-123",
        taskId: "task-greeting-tone",
        seq: 2,
        eventType: "agent.tool_call",
        actor: "keystone-think-implementer",
        severity: "info",
        ts: new Date("2026-04-14T00:00:04.000Z"),
        idempotencyKey: null,
        artifactRefId: null,
        payload: {
          toolName: "write_file",
          path: "/workspace/code/repo/src/greeting.js"
        }
      }
    ] as never);

    const response = await app.request(
      "http://example.com/v1/runs/run-123/events",
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
      total: 2,
      events: [
        {
          eventType: "workspace.task_view_created",
          taskId: "task-greeting-tone",
          payload: {
            defaultCwd: "/workspace/runs/run-123/code/repo"
          }
        },
        {
          eventType: "agent.tool_call",
          actor: "keystone-think-implementer",
          payload: {
            toolName: "write_file",
            path: "/workspace/code/repo/src/greeting.js"
          }
        }
      ]
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
      model: "gpt-5.4"
    });
  });

  it("executes the think smoke route with dev auth", async () => {
    const response = await app.request(
      "http://example.com/internal/dev/think-smoke",
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
      summary: "Updated the greeting implementation.",
      stagedArtifacts: [
        expect.objectContaining({
          path: "/artifacts/out/implementer-summary.md"
        })
      ]
    });
  });
});
