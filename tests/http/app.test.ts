import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDocumentRepositoryClient } from "./document-db-fixture";

const runDocumentFixture = {
  tenantId: "tenant-fixture",
  projectId: "project-fixture",
  documentId: "doc-run-plan",
  runId: "run-123",
  scopeType: "run" as const,
  kind: "execution_plan" as const,
  path: "execution-plan",
  currentRevisionId: "revision-run-plan-v1",
  conversationAgentClass: "PlanningDocumentAgent",
  conversationAgentName: "run-execution-plan",
  createdAt: new Date("2026-04-14T00:01:00.000Z"),
  updatedAt: new Date("2026-04-14T00:05:00.000Z")
};

const runDocumentRevisionFixture = {
  documentRevisionId: "revision-run-plan-v1",
  documentId: "doc-run-plan",
  artifactRefId: "artifact-run-plan-v1",
  revisionNumber: 1,
  title: "Execution Plan v1",
  createdAt: new Date("2026-04-14T00:05:00.000Z")
};

const runDocumentRepositoryFixture = {
  projects: [],
  runs: [
    {
      tenantId: "tenant-fixture",
      runId: "run-123",
      projectId: "project-fixture"
    }
  ],
  documents: [runDocumentFixture],
  documentRevisions: [runDocumentRevisionFixture]
};

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
    bucketGet: vi.fn(async () => null),
    bucketDelete: vi.fn(async () => undefined),
    bucketPut: vi.fn(async () => ({
      httpEtag: "etag-run-plan-v2",
      size: 19
    })),
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
          project: {
            projectId: "project-fixture",
            projectKey: "fixture-demo-project",
            displayName: "Fixture Demo Project"
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
    createArtifactRef: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      artifactRefId: "artifact-run-plan-v2",
      projectId: input.projectId ?? null,
      runId: input.runId ?? "run-123",
      sessionId: null,
      taskId: null,
      runTaskId: null,
      kind: input.kind,
      artifactKind: input.artifactKind ?? input.kind,
      storageBackend: input.storageBackend,
      storageUri: input.storageUri,
      bucket: input.bucket ?? "keystone-artifacts-dev",
      objectKey: input.objectKey ?? "documents/run/run-123/doc-run-plan/revision-run-plan-v2",
      objectVersion: null,
      etag: input.etag ?? null,
      contentType: input.contentType,
      sha256: null,
      sizeBytes: input.sizeBytes ?? null,
      createdAt: new Date("2026-04-14T00:06:00.000Z"),
      metadata: input.metadata ?? {}
    })),
    deleteArtifactRef: vi.fn(async () => null),
    getArtifactRef: vi.fn(async (_client, _tenantId, artifactId) => ({
      tenantId: "tenant-fixture",
      artifactRefId: artifactId,
      projectId: "project-fixture",
      runId: "run-123",
      taskId: "task-greeting-tone",
      kind: "run_note",
      contentType: "text/markdown; charset=utf-8",
      sizeBytes: 128,
      sha256: "abc123",
      storageBackend: "r2",
      storageUri: `runs/run-123/artifacts/${artifactId}.md`,
      metadata: {
        fileName: "implementer-summary.md"
      },
      createdAt: new Date("2026-04-14T00:00:05.000Z")
    })),
    getApprovalRecord: vi.fn(async () => undefined),
    createDocument: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      projectId: input.projectId,
      documentId: "doc-run-notes",
      runId: input.runId ?? null,
      scopeType: input.scopeType,
      kind: input.kind,
      path: input.path,
      currentRevisionId: null,
      conversationAgentClass: input.conversationAgentClass ?? null,
      conversationAgentName: input.conversationAgentName ?? null,
      createdAt: new Date("2026-04-14T00:02:00.000Z"),
      updatedAt: new Date("2026-04-14T00:02:00.000Z")
    })),
    createDocumentRevision: vi.fn(async (_client, input) => ({
      documentRevisionId: input.documentRevisionId ?? "revision-run-plan-v2",
      documentId: input.documentId,
      artifactRefId: input.artifactRefId,
      revisionNumber: 2,
      title: input.title,
      createdAt: new Date("2026-04-14T00:06:00.000Z")
    })),
    listRunApprovalRecords: vi.fn(async () => []),
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
    getArtifactText: vi.fn(async (): Promise<string | null> => null),
    getArtifactBytes: vi.fn(async () => ({
      body: new TextEncoder().encode("# artifact"),
      contentType: "text/markdown; charset=utf-8"
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
    createWorkerDatabaseClient: vi.fn(() =>
      createDocumentRepositoryClient(runDocumentRepositoryFixture, close)
    ),
    getProject: vi.fn(async () => ({
      tenantId: "tenant-fixture",
      projectId: "project-fixture",
      projectKey: "fixture-demo-project",
      displayName: "Fixture Demo Project",
      description: "Fixture project",
      ruleSet: {
        reviewInstructions: ["Review the result."],
        testInstructions: ["Run fixture tests."]
      },
      components: [
        {
          componentKey: "demo-target",
          displayName: "Demo Target",
          kind: "git_repository",
          config: {
            localPath: "./fixtures/demo-target",
            defaultRef: "main"
          },
          metadata: {}
        }
      ],
      envVars: [
        {
          name: "KEYSTONE_FIXTURE_PROJECT",
          value: "1",
          metadata: {}
        }
      ],
      integrationBindings: [],
      metadata: {},
      createdAt: new Date("2026-04-14T00:00:00.000Z"),
      updatedAt: new Date("2026-04-14T00:00:00.000Z")
    })),
    getRunRecord: vi.fn(async (_client, input) => {
      if (input.runId !== "run-123") {
        return undefined;
      }

      return {
        tenantId: input.tenantId,
        runId: input.runId,
        projectId: "project-fixture",
        workflowInstanceId: "run-workflow-instance",
        executionEngine: "think",
        sandboxId: null,
        status: "configured",
        compiledSpecRevisionId: null,
        compiledArchitectureRevisionId: null,
        compiledExecutionPlanRevisionId: null,
        compiledAt: null,
        startedAt: null,
        endedAt: null,
        createdAt: new Date("2026-04-14T00:00:00.000Z"),
        updatedAt: new Date("2026-04-14T00:00:00.000Z")
      };
    }),
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
  getRunRecord: mocked.getRunRecord,
  listRunSessions: mocked.listRunSessions
}));

vi.mock("../../src/lib/db/projects", () => ({
  getProject: mocked.getProject
}));

vi.mock("../../src/lib/db/events", () => ({
  appendSessionEvent: mocked.appendSessionEvent,
  listRunEvents: mocked.listRunEvents
}));

vi.mock("../../src/lib/db/artifacts", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/db/artifacts")>(
    "../../src/lib/db/artifacts"
  );

  return {
    ...actual,
    createArtifactRef: mocked.createArtifactRef,
    deleteArtifactRef: mocked.deleteArtifactRef,
    getArtifactRef: mocked.getArtifactRef,
    listRunArtifacts: mocked.listRunArtifacts
  };
});

vi.mock("../../src/lib/db/documents", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/db/documents")>(
    "../../src/lib/db/documents"
  );

  return {
    ...actual,
    createDocument: mocked.createDocument,
    createDocumentRevision: mocked.createDocumentRevision,
    getDocumentWithCurrentRevision: vi.fn(actual.getDocumentWithCurrentRevision),
    getProjectDocument: vi.fn(actual.getProjectDocument),
    getRunDocument: vi.fn(actual.getRunDocument),
    listProjectDocumentsWithCurrentRevision: vi.fn(actual.listProjectDocumentsWithCurrentRevision),
    listRunDocumentsWithCurrentRevision: vi.fn(actual.listRunDocumentsWithCurrentRevision)
  };
});

vi.mock("../../src/lib/db/approvals", () => ({
  getApprovalRecord: mocked.getApprovalRecord,
  listRunApprovalRecords: mocked.listRunApprovalRecords,
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

vi.mock("../../src/lib/artifacts/r2", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/artifacts/r2")>(
    "../../src/lib/artifacts/r2"
  );

  return {
    ...actual,
    getArtifactBytes: mocked.getArtifactBytes,
    getArtifactText: mocked.getArtifactText
  };
});

const documentsDb = await import("../../src/lib/db/documents");
const { app } = await import("../../src/http/app");

const env = {
  ARTIFACTS_BUCKET: {
    delete: mocked.bucketDelete,
    get: mocked.bucketGet,
    put: mocked.bucketPut
  } as unknown as R2Bucket,
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

function buildInlineDecisionPackage() {
  return {
    source: "inline" as const,
    payload: {
      decisionPackageId: "decision-package-ui-first-api",
      summary: "Freeze the UI-first API contract.",
      objectives: ["Define stable UI resources.", "Keep backend and UI parallelizable."],
      tasks: [
        {
          taskId: "task-ui-first-contract",
          title: "Freeze the HTTP contract",
          acceptanceCriteria: ["Routes and schemas are defined."]
        }
      ]
    }
  };
}

function buildCompiledRunPlan() {
  return {
    decisionPackageId: "decision-package-ui-first-api",
    summary: "Freeze the UI-first API contract.",
    tasks: [
      {
        taskId: "task-greeting-tone",
        title: "Adjust the greeting implementation",
        summary: "Change the greeting implementation in a reviewable way.",
        instructions: ["Edit the greeting implementation.", "Run the fixture tests."],
        acceptanceCriteria: ["Fixture tests stay green."],
        dependsOn: []
      }
    ]
  };
}

describe("app", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.createWorkerDatabaseClient.mockImplementation(() =>
      createDocumentRepositoryClient(runDocumentRepositoryFixture, mocked.close)
    );
    mocked.listRunSessions.mockResolvedValue([
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
          project: {
            projectId: "project-fixture",
            projectKey: "fixture-demo-project",
            displayName: "Fixture Demo Project"
          }
        }
      }
    ] as never);
    mocked.listRunEvents.mockResolvedValue([
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
    ] as never);
    mocked.listRunArtifacts.mockResolvedValue([]);
    mocked.getApprovalRecord.mockResolvedValue(undefined);
    mocked.listRunApprovalRecords.mockResolvedValue([]);
    mocked.getArtifactText.mockResolvedValue(null);
    mocked.getArtifactBytes.mockResolvedValue({
      body: new TextEncoder().encode("# artifact"),
      contentType: "text/markdown; charset=utf-8"
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
          projectId: "project-fixture",
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
          projectId: "project-fixture",
          decisionPackage: buildInlineDecisionPackage()
        })
      },
      env
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        status: "accepted",
        workflowInstanceId: expect.any(String),
        run: {
          tenantId: "tenant-fixture",
          projectId: "project-fixture",
          status: "configured",
          execution: {
            runtime: "scripted",
            thinkMode: "mock",
            preserveSandbox: false
          }
        }
      },
      meta: {
        apiVersion: "v1",
        envelope: "action",
        resourceType: "run"
      }
    });
    expect(mocked.runWorkflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          projectId: "project-fixture",
          runtime: "scripted"
        })
      })
    );
  });

  it.each([
    {
      label: "artifact-backed decision packages",
      decisionPackage: {
        source: "artifact" as const,
        artifactId: "artifact-decision-package"
      }
    },
    {
      label: "project decision-package references",
      decisionPackage: {
        source: "project_collection" as const,
        decisionPackageId: "decision-package-stored"
      }
    }
  ])("returns not_implemented for $label", async ({ decisionPackage }) => {
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
          projectId: "project-fixture",
          decisionPackage
        })
      },
      env
    );

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "not_implemented",
        details: {
          apiVersion: "v1",
          resourceType: "run"
        }
      }
    });
    expect(mocked.runWorkflowCreate).not.toHaveBeenCalled();
  });

  it("returns project_not_found when the requested project is missing", async () => {
    mocked.getProject.mockResolvedValueOnce(undefined as never);

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
          projectId: "project-missing",
          decisionPackage: buildInlineDecisionPackage()
        })
      },
      env
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "project_not_found",
        message: "Project project-missing was not found."
      }
    });
    expect(mocked.runWorkflowCreate).not.toHaveBeenCalled();
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
          projectId: "",
          decisionPackage: buildInlineDecisionPackage()
        })
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "Run request validation failed."
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
          projectId: "project-fixture",
          decisionPackage: buildInlineDecisionPackage()
        })
      },
      env
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        status: "accepted",
        run: {
          execution: {
            runtime: "think",
            thinkMode: "mock",
            preserveSandbox: false
          }
        }
      }
    });
    expect(mocked.runWorkflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          projectId: "project-fixture",
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
          projectId: "project-fixture",
          decisionPackage: buildInlineDecisionPackage(),
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
      data: {
        status: "accepted",
        run: {
          execution: {
            runtime: "think",
            thinkMode: "live",
            preserveSandbox: true
          }
        }
      }
    });
    expect(mocked.runWorkflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          projectId: "project-fixture",
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
      data: {
        runId: "run-123",
        tenantId: "tenant-fixture",
        decisionPackageId: null,
        status: "configured",
        sessions: {
          total: 1
        },
        artifacts: {
          total: 0
        }
      },
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "run"
      }
    });
  });

  it("lists persisted run documents", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/documents",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        total: 1,
        items: [
          {
            tenantId: "tenant-fixture",
            projectId: "project-fixture",
            runId: "run-123",
            documentId: "doc-run-plan",
            scopeType: "run",
            kind: "execution_plan",
            path: "execution-plan",
            currentRevision: {
              documentRevisionId: "revision-run-plan-v1",
              artifactId: "artifact-run-plan-v1"
            }
          }
        ]
      },
      meta: {
        resourceType: "document"
      }
    });
    expect(documentsDb.listRunDocumentsWithCurrentRevision).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        runId: "run-123"
      })
    );
  });

  it("creates a run-scoped document identity", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/documents",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          kind: "other",
          path: "notes/compile-issues",
          conversation: {
            agentClass: "PlanningDocumentAgent",
            agentName: "run-compile-notes"
          }
        })
      },
      env
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        runId: "run-123",
        documentId: "doc-run-notes",
        scopeType: "run",
        kind: "other",
        path: "notes/compile-issues",
        currentRevisionId: null,
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: "run-compile-notes"
        }
      },
      meta: {
        resourceType: "document"
      }
    });
    expect(mocked.createDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        runId: "run-123",
        scopeType: "run",
        kind: "other",
        path: "notes/compile-issues"
      })
    );
  });

  it("returns a run document detail", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/documents/doc-run-plan",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        documentId: "doc-run-plan",
        kind: "execution_plan",
        path: "execution-plan",
        currentRevision: {
          title: "Execution Plan v1"
        }
      },
      meta: {
        resourceType: "document"
      }
    });
  });

  it("creates a run document revision backed by an artifact", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/documents/doc-run-plan/revisions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          title: "Execution Plan v2",
          body: "# Update\n",
          contentType: "text/markdown; charset=utf-8"
        })
      },
      env
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        runId: "run-123",
        documentId: "doc-run-plan",
        revisionNumber: 2,
        title: "Execution Plan v2",
        artifactId: "artifact-run-plan-v2"
      },
      meta: {
        resourceType: "document_revision"
      }
    });
    expect(mocked.bucketPut).toHaveBeenCalled();
    expect(mocked.createArtifactRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        runId: "run-123",
        kind: "document_revision"
      })
    );
  });

  it("deletes uploaded run revision artifacts when persistence fails downstream", async () => {
    mocked.createDocumentRevision.mockRejectedValueOnce(new Error("document revision insert failed"));

    const response = await app.request(
      "http://example.com/v1/runs/run-123/documents/doc-run-plan/revisions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          title: "Execution Plan v2",
          body: "# Update\n",
          contentType: "text/markdown; charset=utf-8"
        })
      },
      env
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "internal_error",
        message: "Document persistence failed."
      }
    });
    expect(mocked.deleteArtifactRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        artifactRefId: "artifact-run-plan-v2"
      })
    );
    expect(mocked.bucketDelete).toHaveBeenCalledWith(
      expect.stringMatching(/^documents\/run\/run-123\/doc-run-plan\//)
    );
  });

  it("rejects invalid canonical run document paths", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/documents",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          kind: "execution_plan",
          path: "notes/compile-issues"
        })
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "run-scoped execution_plan documents must use the canonical path execution-plan."
      }
    });
    expect(mocked.createDocument).not.toHaveBeenCalled();
  });

  it("returns projected workflow graph, task, and conversation resources", async () => {
    mocked.getArtifactText.mockResolvedValue(JSON.stringify(buildCompiledRunPlan()));
    mocked.listRunEvents.mockResolvedValue([
      {
        eventId: "task-status-1",
        tenantId: "tenant-fixture",
        sessionId: "task-session-1",
        runId: "run-123",
        taskId: "task-greeting-tone",
        seq: 1,
        eventType: "task.status_changed",
        actor: "keystone",
        severity: "info",
        ts: new Date("2026-04-14T00:00:02.000Z"),
        idempotencyKey: null,
        artifactRefId: null,
        payload: {
          status: "active",
          summary: "Reviewing..."
        }
      },
      {
        eventId: "agent-message-1",
        tenantId: "tenant-fixture",
        sessionId: "task-session-1",
        runId: "run-123",
        taskId: "task-greeting-tone",
        seq: 2,
        eventType: "agent.message",
        actor: "keystone-think-implementer",
        severity: "info",
        ts: new Date("2026-04-14T00:00:03.000Z"),
        idempotencyKey: null,
        artifactRefId: "artifact-implementer-note",
        payload: {
          text: "Implemented the requested change."
        }
      },
      {
        eventId: "approval-requested-1",
        tenantId: "tenant-fixture",
        sessionId: "task-session-1",
        runId: "run-123",
        taskId: "task-greeting-tone",
        seq: 3,
        eventType: "approval.requested",
        actor: "keystone",
        severity: "info",
        ts: new Date("2026-04-14T00:00:04.000Z"),
        idempotencyKey: null,
        artifactRefId: null,
        payload: {
          approvalId: "approval-1"
        }
      }
    ] as never);
    mocked.listRunArtifacts.mockResolvedValue([
      {
        tenantId: "tenant-fixture",
        artifactRefId: "artifact-implementer-note",
        runId: "run-123",
        taskId: "task-greeting-tone",
        kind: "run_note",
        contentType: "text/markdown; charset=utf-8",
        sizeBytes: 128,
        sha256: "abc123",
        storageBackend: "r2",
        storageUri: "runs/run-123/artifacts/implementer-note.md",
        metadata: {},
        createdAt: new Date("2026-04-14T00:00:04.000Z")
      }
    ] as never);

    const [graphResponse, tasksResponse, taskResponse, conversationResponse, artifactsResponse] =
      await Promise.all([
        app.request(
          "http://example.com/v1/runs/run-123/graph",
          {
            headers: {
              Authorization: "Bearer secret-dev-token",
              "X-Keystone-Tenant-Id": "tenant-fixture"
            }
          },
          env
        ),
        app.request(
          "http://example.com/v1/runs/run-123/tasks",
          {
            headers: {
              Authorization: "Bearer secret-dev-token",
              "X-Keystone-Tenant-Id": "tenant-fixture"
            }
          },
          env
        ),
        app.request(
          "http://example.com/v1/runs/run-123/tasks/task-greeting-tone",
          {
            headers: {
              Authorization: "Bearer secret-dev-token",
              "X-Keystone-Tenant-Id": "tenant-fixture"
            }
          },
          env
        ),
        app.request(
          "http://example.com/v1/runs/run-123/tasks/task-greeting-tone/conversation",
          {
            headers: {
              Authorization: "Bearer secret-dev-token",
              "X-Keystone-Tenant-Id": "tenant-fixture"
            }
          },
          env
        ),
        app.request(
          "http://example.com/v1/runs/run-123/tasks/task-greeting-tone/artifacts",
          {
            headers: {
              Authorization: "Bearer secret-dev-token",
              "X-Keystone-Tenant-Id": "tenant-fixture"
            }
          },
          env
        )
      ]);

    expect(graphResponse.status).toBe(200);
    await expect(graphResponse.json()).resolves.toMatchObject({
      data: {
        runId: "run-123",
        nodes: [
          {
            taskId: "task-greeting-tone",
            status: "active"
          }
        ],
        summary: {
          totalTasks: 1,
          activeTasks: 1
        }
      },
      meta: {
        resourceType: "workflow_graph"
      }
    });

    expect(tasksResponse.status).toBe(200);
    await expect(tasksResponse.json()).resolves.toMatchObject({
      data: {
        total: 1,
        items: [
          {
            taskId: "task-greeting-tone",
            status: "active"
          }
        ]
      },
      meta: {
        resourceType: "task"
      }
    });

    expect(taskResponse.status).toBe(200);
    await expect(taskResponse.json()).resolves.toMatchObject({
      data: {
        taskId: "task-greeting-tone",
        title: "Adjust the greeting implementation"
      }
    });

    expect(conversationResponse.status).toBe(200);
    await expect(conversationResponse.json()).resolves.toMatchObject({
      data: {
        taskId: "task-greeting-tone",
        messageCount: 3,
        messages: [
          expect.objectContaining({
            messageType: "workflow_notice",
            body: "Reviewing..."
          }),
          expect.objectContaining({
            messageType: "implementer_message",
            body: "Implemented the requested change."
          }),
          expect.objectContaining({
            messageType: "workflow_notice",
            body: "Waiting for approval."
          })
        ]
      },
      meta: {
        resourceType: "task_conversation"
      }
    });

    expect(artifactsResponse.status).toBe(200);
    await expect(artifactsResponse.json()).resolves.toMatchObject({
      data: {
        total: 1,
        items: [
          {
            artifactId: "artifact-implementer-note",
            taskId: "task-greeting-tone"
          }
        ]
      },
      meta: {
        resourceType: "artifact"
      }
    });
  });

  it("returns the canonical operator-steering not_implemented contract", async () => {
    mocked.getArtifactText.mockResolvedValueOnce(JSON.stringify(buildCompiledRunPlan()));

    const response = await app.request(
      "http://example.com/v1/runs/run-123/tasks/task-greeting-tone/conversation/messages",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          messageType: "operator_message",
          body: "Please adjust the implementation."
        })
      },
      env
    );

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "not_implemented",
        details: {
          apiVersion: "v1",
          resourceType: "task_conversation_message"
        }
      }
    });
  });

  it("returns the stub release surfaces and decision-package detail", async () => {
    const [decisionPackageResponse, evidenceResponse, integrationResponse, releaseResponse] =
      await Promise.all([
        app.request(
          "http://example.com/v1/decision-packages/decision-package-ui-first-api",
          {
            headers: {
              Authorization: "Bearer secret-dev-token",
              "X-Keystone-Tenant-Id": "tenant-fixture"
            }
          },
          env
        ),
        app.request(
          "http://example.com/v1/runs/run-123/evidence",
          {
            headers: {
              Authorization: "Bearer secret-dev-token",
              "X-Keystone-Tenant-Id": "tenant-fixture"
            }
          },
          env
        ),
        app.request(
          "http://example.com/v1/runs/run-123/integration",
          {
            headers: {
              Authorization: "Bearer secret-dev-token",
              "X-Keystone-Tenant-Id": "tenant-fixture"
            }
          },
          env
        ),
        app.request(
          "http://example.com/v1/runs/run-123/release",
          {
            headers: {
              Authorization: "Bearer secret-dev-token",
              "X-Keystone-Tenant-Id": "tenant-fixture"
            }
          },
          env
        )
      ]);

    await expect(decisionPackageResponse.json()).resolves.toMatchObject({
      data: {
        decisionPackageId: "decision-package-ui-first-api",
        status: "stub"
      },
      meta: {
        resourceType: "decision_package"
      }
    });
    await expect(evidenceResponse.json()).resolves.toMatchObject({
      data: {
        runId: "run-123",
        status: "stub"
      },
      meta: {
        resourceType: "evidence_bundle"
      }
    });
    await expect(integrationResponse.json()).resolves.toMatchObject({
      data: {
        runId: "run-123",
        status: "stub"
      },
      meta: {
        resourceType: "integration_record"
      }
    });
    await expect(releaseResponse.json()).resolves.toMatchObject({
      data: {
        runId: "run-123",
        status: "stub"
      },
      meta: {
        resourceType: "release"
      }
    });
  });

  it("lists and reads run approvals through the canonical detail envelopes", async () => {
    mocked.listRunSessions.mockResolvedValue([
      {
        tenantId: "tenant-fixture",
        sessionId: "task-session-1",
        runId: "run-123",
        sessionType: "task",
        status: "paused_for_approval",
        parentSessionId: "de305d54-75b4-431b-adb2-eb6b9e546014",
        createdAt: new Date("2026-04-14T00:00:00.000Z"),
        updatedAt: new Date("2026-04-14T00:00:04.000Z"),
        metadata: {
          taskId: "task-greeting-tone"
        }
      }
    ] as never);
    mocked.listRunApprovalRecords.mockResolvedValueOnce([
      {
        approvalId: "approval-1",
        tenantId: "tenant-fixture",
        runId: "run-123",
        sessionId: "task-session-1",
        approvalType: "outbound_network",
        status: "pending",
        requestedBy: "keystone",
        requestedAt: new Date("2026-04-14T00:00:03.000Z"),
        resolvedAt: null,
        resolution: null,
        metadata: {}
      }
    ] as never);
    mocked.getApprovalRecord.mockResolvedValueOnce({
      approvalId: "approval-1",
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-1",
      approvalType: "outbound_network",
      status: "pending",
      requestedBy: "keystone",
      requestedAt: new Date("2026-04-14T00:00:03.000Z"),
      resolvedAt: null,
      resolution: null,
      metadata: {}
    } as never);

    const [approvalsResponse, approvalResponse] = await Promise.all([
      app.request(
        "http://example.com/v1/runs/run-123/approvals",
        {
          headers: {
            Authorization: "Bearer secret-dev-token",
            "X-Keystone-Tenant-Id": "tenant-fixture"
          }
        },
        env
      ),
      app.request(
        "http://example.com/v1/runs/run-123/approvals/approval-1",
        {
          headers: {
            Authorization: "Bearer secret-dev-token",
            "X-Keystone-Tenant-Id": "tenant-fixture"
          }
        },
        env
      )
    ]);

    await expect(approvalsResponse.json()).resolves.toMatchObject({
      data: {
        total: 1,
        items: [
          {
            approvalId: "approval-1",
            taskId: "task-greeting-tone",
            status: "pending"
          }
        ]
      },
      meta: {
        resourceType: "approval"
      }
    });
    await expect(approvalResponse.json()).resolves.toMatchObject({
      data: {
        approvalId: "approval-1",
        taskId: "task-greeting-tone"
      },
      meta: {
        resourceType: "approval"
      }
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
    mocked.listRunSessions.mockResolvedValueOnce([
      {
        tenantId: "tenant-fixture",
        sessionId: "task-session-1",
        runId: "run-123",
        sessionType: "task",
        status: "paused_for_approval",
        parentSessionId: "de305d54-75b4-431b-adb2-eb6b9e546014",
        createdAt: new Date("2026-04-14T00:00:00.000Z"),
        updatedAt: new Date("2026-04-14T00:00:04.000Z"),
        metadata: {
          taskId: "task-greeting-tone"
        }
      }
    ] as never);
    mocked.getApprovalRecord.mockResolvedValueOnce({
      approvalId: "approval-1",
      tenantId: "tenant-fixture",
      runId: "run-123",
      sessionId: "task-session-1",
      approvalType: "outbound_network",
      status: "pending",
      requestedBy: "keystone",
      requestedAt: new Date("2026-04-14T00:00:01.000Z"),
      resolvedAt: null,
      resolution: null,
      metadata: {},
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
      data: {
        approvalId: "approval-1",
        runId: "run-123",
        status: "approved"
      },
      meta: {
        apiVersion: "v1",
        envelope: "action",
        resourceType: "approval"
      }
    });
    expect(mocked.runWorkflowGet).toHaveBeenCalledTimes(1);
    expect(mocked.appendSessionEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        sessionId: "task-session-1",
        taskId: "task-greeting-tone",
        eventType: "approval.resolved"
      })
    );
  });

  it("proxies the websocket route to the coordinator stub", async () => {
    const [streamResponse, wsResponse] = await Promise.all([
      app.request(
        "http://example.com/v1/runs/run-123/stream",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer secret-dev-token",
            "X-Keystone-Tenant-Id": "tenant-fixture"
          }
        },
        env
      ),
      app.request(
        "http://example.com/v1/runs/run-123/ws",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer secret-dev-token",
            "X-Keystone-Tenant-Id": "tenant-fixture"
          }
        },
        env
      )
    ]);

    expect(streamResponse.status).toBe(200);
    await expect(streamResponse.text()).resolves.toBe("ws-ok");
    expect(wsResponse.status).toBe(200);
    await expect(wsResponse.text()).resolves.toBe("ws-ok");
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
