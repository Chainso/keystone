import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDocumentRepositoryClient } from "./document-db-fixture";

const executionPlanDocument = {
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

const executionPlanRevision = {
  documentRevisionId: "revision-run-plan-v1",
  documentId: "doc-run-plan",
  artifactRefId: "artifact-run-plan-v1",
  revisionNumber: 1,
  title: "Execution Plan v1",
  createdAt: new Date("2026-04-14T00:05:00.000Z")
};

const specificationDocument = {
  tenantId: "tenant-fixture",
  projectId: "project-fixture",
  documentId: "doc-run-specification",
  runId: "run-123",
  scopeType: "run" as const,
  kind: "specification" as const,
  path: "specification",
  currentRevisionId: "revision-run-specification-v1",
  conversationAgentClass: "PlanningDocumentAgent",
  conversationAgentName: "run-specification",
  createdAt: new Date("2026-04-14T00:01:00.000Z"),
  updatedAt: new Date("2026-04-14T00:05:00.000Z")
};

const specificationRevision = {
  documentRevisionId: "revision-run-specification-v1",
  documentId: "doc-run-specification",
  artifactRefId: "artifact-run-specification-v1",
  revisionNumber: 1,
  title: "Run Specification v1",
  createdAt: new Date("2026-04-14T00:05:00.000Z")
};

const architectureDocument = {
  tenantId: "tenant-fixture",
  projectId: "project-fixture",
  documentId: "doc-run-architecture",
  runId: "run-123",
  scopeType: "run" as const,
  kind: "architecture" as const,
  path: "architecture",
  currentRevisionId: "revision-run-architecture-v1",
  conversationAgentClass: "PlanningDocumentAgent",
  conversationAgentName: "run-architecture",
  createdAt: new Date("2026-04-14T00:01:00.000Z"),
  updatedAt: new Date("2026-04-14T00:05:00.000Z")
};

const architectureRevision = {
  documentRevisionId: "revision-run-architecture-v1",
  documentId: "doc-run-architecture",
  artifactRefId: "artifact-run-architecture-v1",
  revisionNumber: 1,
  title: "Run Architecture v1",
  createdAt: new Date("2026-04-14T00:05:00.000Z")
};

function buildRunDocumentRepositoryFixture(includeRequiredPlanningDocuments = false) {
  return {
    projects: [],
    runs: [
      {
        tenantId: "tenant-fixture",
        runId: "run-123",
        projectId: "project-fixture"
      }
    ],
    documents: includeRequiredPlanningDocuments
      ? [specificationDocument, architectureDocument, executionPlanDocument]
      : [executionPlanDocument],
    documentRevisions: includeRequiredPlanningDocuments
      ? [specificationRevision, architectureRevision, executionPlanRevision]
      : [executionPlanRevision]
  };
}

const RUN_TASK_PREPARE_ID = "11111111-1111-4111-8111-111111111111";
const RUN_TASK_IMPLEMENTATION_ID = "22222222-2222-4222-8222-222222222222";

const activeTaskFixture = {
  runTaskId: RUN_TASK_IMPLEMENTATION_ID,
  runId: "run-123",
  name: "Implement execution plan",
  description: "Apply the approved change in a reviewable way.",
  status: "active",
  conversationAgentClass: "KeystoneThinkAgent",
  conversationAgentName: `tenant:tenant-fixture:run:run-123:task:${RUN_TASK_IMPLEMENTATION_ID}`,
  startedAt: new Date("2026-04-14T00:10:00.000Z"),
  endedAt: null,
  createdAt: new Date("2026-04-14T00:09:00.000Z"),
  updatedAt: new Date("2026-04-14T00:11:00.000Z")
};

const readyTaskFixture = {
  runTaskId: RUN_TASK_PREPARE_ID,
  runId: "run-123",
  name: "Prepare implementation context",
  description: "Review the planning documents and repo state.",
  status: "ready",
  conversationAgentClass: null,
  conversationAgentName: null,
  startedAt: null,
  endedAt: null,
  createdAt: new Date("2026-04-14T00:08:00.000Z"),
  updatedAt: new Date("2026-04-14T00:08:00.000Z")
};

const dependencyFixture = {
  runTaskDependencyId: "run-task-dependency-1",
  runId: "run-123",
  parentRunTaskId: RUN_TASK_PREPARE_ID,
  childRunTaskId: RUN_TASK_IMPLEMENTATION_ID,
  createdAt: new Date("2026-04-14T00:08:30.000Z")
};

const compiledRunPlanFixture = {
  summary: "Fixture compiled plan for run-123.",
  sourceRevisionIds: {
    specification: "revision-run-specification-v1",
    architecture: "revision-run-architecture-v1",
    executionPlan: "revision-run-plan-v1"
  },
  tasks: [
    {
      taskId: "TASK-001",
      runTaskId: RUN_TASK_PREPARE_ID,
      title: "Prepare implementation context",
      summary: "Review the planning documents and repo state.",
      instructions: ["Review the planning documents."],
      acceptanceCriteria: ["Implementation context is ready."],
      dependsOn: []
    },
    {
      taskId: "TASK-002",
      runTaskId: RUN_TASK_IMPLEMENTATION_ID,
      title: "Implement execution plan",
      summary: "Apply the approved change in a reviewable way.",
      instructions: ["Implement the approved change."],
      acceptanceCriteria: ["The implementation is complete."],
      dependsOn: ["TASK-001"]
    }
  ]
} as const;

const runArtifactFixture = {
  tenantId: "tenant-fixture",
  artifactRefId: "artifact-implementer-note",
  projectId: "project-fixture",
  runId: "run-123",
  runTaskId: RUN_TASK_IMPLEMENTATION_ID,
  artifactKind: "run_note",
  storageBackend: "r2",
  bucket: "keystone-artifacts-dev",
  objectKey: "runs/run-123/artifacts/implementer-note.md",
  objectVersion: null,
  etag: "etag-run-note",
  contentType: "text/markdown; charset=utf-8",
  sha256: "abc123",
  sizeBytes: 128,
  createdAt: new Date("2026-04-14T00:12:00.000Z")
};

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);

  return {
    close,
    bucketGet: vi.fn(async () => null),
    bucketDelete: vi.fn(async () => undefined),
    bucketPut: vi.fn(async () => ({
      httpEtag: "etag-run-plan-v2",
      size: 19
    })),
    createWorkerDatabaseClient: vi.fn(() =>
      createDocumentRepositoryClient(buildRunDocumentRepositoryFixture(false), close)
    ),
    createRunRecord: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      runId: input.runId,
      projectId: input.projectId,
      workflowInstanceId: input.workflowInstanceId,
      executionEngine: input.executionEngine,
      sandboxId: input.sandboxId ?? null,
      status: input.status,
      compiledSpecRevisionId: input.compiledSpecRevisionId ?? null,
      compiledArchitectureRevisionId: input.compiledArchitectureRevisionId ?? null,
      compiledExecutionPlanRevisionId: input.compiledExecutionPlanRevisionId ?? null,
      compiledAt: input.compiledAt ?? null,
      startedAt: input.startedAt ?? null,
      endedAt: input.endedAt ?? null,
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
        executionEngine: "think_mock",
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
    listRunTasks: vi.fn(async () => [activeTaskFixture]),
    listRunTaskDependencies: vi.fn(async () => []),
    listRunArtifacts: vi.fn(async () => []),
    createArtifactRef: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      artifactRefId: "artifact-run-plan-v2",
      projectId: input.projectId ?? null,
      runId: input.runId ?? "run-123",
      runTaskId: null,
      artifactKind: input.artifactKind,
      storageBackend: input.storageBackend,
      bucket: input.bucket ?? "keystone-artifacts-dev",
      objectKey: input.objectKey ?? "documents/run/run-123/doc-run-plan/revision-run-plan-v2",
      objectVersion: null,
      etag: input.etag ?? null,
      contentType: input.contentType,
      sha256: null,
      sizeBytes: input.sizeBytes ?? null,
      createdAt: new Date("2026-04-14T00:06:00.000Z")
    })),
    deleteArtifactRef: vi.fn(async () => null),
    getArtifactText: vi.fn(async (): Promise<string | null> => null),
    getArtifactRef: vi.fn(async (_client, _tenantId, artifactId) => ({
      tenantId: "tenant-fixture",
      artifactRefId: artifactId,
      projectId: "project-fixture",
      runId: "run-123",
      runTaskId: RUN_TASK_IMPLEMENTATION_ID,
      artifactKind: "run_note",
      storageBackend: "r2",
      bucket: "keystone-artifacts-dev",
      objectKey: `runs/run-123/artifacts/${artifactId}.md`,
      objectVersion: null,
      etag: "etag-run-note",
      contentType: "text/markdown; charset=utf-8",
      sha256: "abc123",
      sizeBytes: 128,
      createdAt: new Date("2026-04-14T00:12:00.000Z")
    })),
    getArtifactBytes: vi.fn(async () => ({
      body: new TextEncoder().encode("# planning document\n"),
      contentType: "text/markdown; charset=utf-8"
    })),
    createDocument: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      projectId: input.projectId,
      documentId: input.path === "notes/compile-issues" ? "doc-run-notes" : "doc-run-generated",
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
    getProject: vi.fn(async (_client, input) => {
      if (input.projectId !== "project-fixture") {
        return undefined;
      }

      return {
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
              ref: "main"
            }
          }
        ],
        envVars: [
          {
            name: "KEYSTONE_FIXTURE_PROJECT",
            value: "1"
          }
        ],
        createdAt: new Date("2026-04-14T00:00:00.000Z"),
        updatedAt: new Date("2026-04-14T00:00:00.000Z")
      };
    }),
    runWorkflowCreate: vi.fn(async () => ({
      id: "run-workflow-instance"
    })),
    runWorkflowGet: vi.fn(async () => ({
      status: vi.fn(async () => ({
        status: "unknown"
      }))
    }))
  };
});

vi.mock("../../src/lib/db/client", () => ({
  createWorkerDatabaseClient: mocked.createWorkerDatabaseClient
}));

vi.mock("../../src/lib/db/runs", () => ({
  createRunRecord: mocked.createRunRecord,
  getRunRecord: mocked.getRunRecord,
  listRunTaskDependencies: mocked.listRunTaskDependencies,
  listRunTasks: mocked.listRunTasks
}));

vi.mock("../../src/lib/db/projects", () => ({
  getProject: mocked.getProject
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
    createDocumentRevision: mocked.createDocumentRevision
  };
});

vi.mock("../../src/lib/artifacts/r2", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/artifacts/r2")>(
    "../../src/lib/artifacts/r2"
  );

  return {
    ...actual,
    getArtifactText: mocked.getArtifactText,
    getArtifactBytes: mocked.getArtifactBytes
  };
});

vi.mock("../../src/http/handlers/dev-compile", () => ({
  runCompileSmokeHandler: vi.fn()
}));

vi.mock("../../src/http/handlers/dev-smoke", () => ({
  runSandboxSmokeHandler: vi.fn()
}));

vi.mock("../../src/http/handlers/dev-think", () => ({
  runThinkSmokeHandler: vi.fn()
}));

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
  SANDBOX: {} as DurableObjectNamespace,
  TASK_SESSION: {} as DurableObjectNamespace,
  KEYSTONE_THINK_AGENT: {} as DurableObjectNamespace
} as const;

describe("app", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.createWorkerDatabaseClient.mockImplementation(() =>
      createDocumentRepositoryClient(buildRunDocumentRepositoryFixture(false), mocked.close)
    );
    mocked.getArtifactText.mockResolvedValue(JSON.stringify(compiledRunPlanFixture));
    mocked.getRunRecord.mockImplementation(async (_client, input) => {
      if (input.runId !== "run-123") {
        return undefined;
      }

      return {
        tenantId: input.tenantId,
        runId: input.runId,
        projectId: "project-fixture",
        workflowInstanceId: "run-workflow-instance",
        executionEngine: "think_mock",
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
    });
    mocked.listRunTasks.mockResolvedValue([activeTaskFixture] as never);
    mocked.listRunTaskDependencies.mockResolvedValue([] as never);
    mocked.listRunArtifacts.mockResolvedValue([] as never);
    mocked.runWorkflowCreate.mockResolvedValue({
      id: "run-workflow-instance"
    });
    mocked.runWorkflowGet.mockResolvedValue({
      status: vi.fn(async () => ({
        status: "unknown"
      }))
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

  it("requires auth for project-scoped run creation", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-fixture/runs",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      },
      env
    );

    expect(response.status).toBe(401);
  });

  it("creates a configured run for a project without launching workflow", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-fixture/runs",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          executionEngine: "think_live"
        })
      },
      env
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        projectId: "project-fixture",
        executionEngine: "think_live",
        status: "configured",
        compiledFrom: null
      },
      meta: {
        resourceType: "run"
      }
    });
    expect(mocked.createRunRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture",
        projectId: "project-fixture",
        executionEngine: "think_live",
        sandboxId: expect.any(String),
        status: "configured"
      })
    );
    expect(mocked.runWorkflowCreate).not.toHaveBeenCalled();
  });

  it("returns project_not_found when the requested project is missing", async () => {
    mocked.getProject.mockResolvedValueOnce(undefined as never);

    const response = await app.request(
      "http://example.com/v1/projects/project-missing/runs",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({})
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
  });

  it("rejects invalid run payloads", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-fixture/runs",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          executionEngine: "bad-engine"
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

  it("rejects malformed JSON when creating a run", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-fixture/runs",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: "{"
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "Request body must be valid JSON."
      }
    });
  });

  it("requires run specification, architecture, and execution plan before compile", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/compile",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({})
      },
      env
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "run_documents_incomplete"
      }
    });
    expect(mocked.runWorkflowCreate).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON when compiling a run", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/compile",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: "{"
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "Request body must be valid JSON."
      }
    });
  });

  it("starts compile only when the required planning documents exist", async () => {
    mocked.createWorkerDatabaseClient.mockImplementationOnce(() =>
      createDocumentRepositoryClient(buildRunDocumentRepositoryFixture(true), mocked.close)
    );
    mocked.runWorkflowGet.mockResolvedValueOnce({
      status: vi.fn(async () => ({
        status: "unknown"
      }))
    } as never);

    const response = await app.request(
      "http://example.com/v1/runs/run-123/compile",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({})
      },
      env
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        status: "accepted",
        workflowInstanceId: "run-workflow-instance",
        run: {
          runId: "run-123",
          executionEngine: "think_mock"
        }
      },
      meta: {
        resourceType: "run"
      }
    });
    expect(mocked.runWorkflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "run-workflow-instance",
        params: expect.objectContaining({
          tenantId: "tenant-fixture",
          runId: "run-123",
          projectId: "project-fixture",
          executionEngine: "think_mock"
        })
      })
    );
  });

  it("creates the workflow when local workflow lookup reports instance.not_found", async () => {
    mocked.createWorkerDatabaseClient.mockImplementationOnce(() =>
      createDocumentRepositoryClient(buildRunDocumentRepositoryFixture(true), mocked.close)
    );
    mocked.runWorkflowGet.mockRejectedValueOnce(new Error("instance.not_found"));

    const response = await app.request(
      "http://example.com/v1/runs/run-123/compile",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({})
      },
      env
    );

    expect(response.status).toBe(202);
    expect(mocked.runWorkflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "run-workflow-instance"
      })
    );
  });

  it("returns an authoritative run detail from runs, run tasks, and artifacts", async () => {
    mocked.listRunArtifacts.mockResolvedValueOnce([runArtifactFixture] as never);

    const response = await app.request(
      "http://example.com/v1/runs/run-123",
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
        runId: "run-123",
        projectId: "project-fixture",
        executionEngine: "think_mock",
        status: "configured"
      },
      meta: {
        resourceType: "run"
      }
    });
  });

  it("projects artifact resources with a public API contentUrl", async () => {
    const response = await app.request(
      "http://example.com/v1/artifacts/artifact-implementer-note",
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
        artifactId: "artifact-implementer-note",
        kind: "run_note",
        contentUrl: "/v1/artifacts/artifact-implementer-note/content"
      },
      meta: {
        resourceType: "artifact"
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
            documentId: "doc-run-plan",
            scopeType: "run",
            kind: "execution_plan",
            path: "execution-plan",
            currentRevisionId: "revision-run-plan-v1"
          }
        ]
      },
      meta: {
        resourceType: "document"
      }
    });
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
        currentRevisionId: "revision-run-plan-v1"
      }
    });
  });

  it("returns a run document revision detail with a public contentUrl", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/documents/doc-run-plan/revisions/revision-run-plan-v1",
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
        documentRevisionId: "revision-run-plan-v1",
        revisionNumber: 1,
        title: "Execution Plan v1",
        artifactId: "artifact-run-plan-v1",
        contentUrl: "/v1/artifacts/artifact-run-plan-v1/content"
      },
      meta: {
        resourceType: "document_revision"
      }
    });
  });

  it("returns document_revision_not_found when the requested run document revision is missing", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/documents/doc-run-plan/revisions/revision-missing",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        }
      },
      env
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "document_revision_not_found",
        message: "Document revision revision-missing was not found for run run-123 document doc-run-plan."
      }
    });
  });

  it("returns run_not_found for nested run-document routes when the run is missing", async () => {
    mocked.getRunRecord.mockResolvedValueOnce(undefined as never);

    const response = await app.request(
      "http://example.com/v1/runs/run-missing/documents/doc-run-plan",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        }
      },
      env
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "run_not_found",
        message: "Run run-missing was not found."
      }
    });
  });

  it("returns document_not_found for nested run-document revision routes when the document is missing", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/documents/doc-missing/revisions",
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

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "document_not_found",
        message: "Document doc-missing was not found for run run-123."
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
        documentRevisionId: expect.any(String),
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
        artifactKind: "document_revision"
      })
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
  });

  it("projects workflow graph and task resources from authoritative rows", async () => {
    mocked.listRunTasks.mockResolvedValue(
      [readyTaskFixture, { ...activeTaskFixture, status: "pending" }] as never
    );
    mocked.listRunTaskDependencies.mockResolvedValue([dependencyFixture] as never);

    const [graphResponse, tasksResponse, taskResponse, conversationResponse] =
      await Promise.all([
        app.request(
          "http://example.com/v1/runs/run-123/workflow",
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
          `http://example.com/v1/runs/run-123/tasks/${RUN_TASK_IMPLEMENTATION_ID}`,
          {
            headers: {
              Authorization: "Bearer secret-dev-token",
              "X-Keystone-Tenant-Id": "tenant-fixture"
            }
          },
          env
        ),
        app.request(
          `http://example.com/v1/runs/run-123/tasks/${RUN_TASK_IMPLEMENTATION_ID}/conversation`,
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
        nodes: [
          {
            taskId: RUN_TASK_PREPARE_ID,
            status: "ready"
          },
          {
            taskId: RUN_TASK_IMPLEMENTATION_ID,
            status: "pending",
            dependsOn: [RUN_TASK_PREPARE_ID]
          }
        ],
        edges: [
          {
            fromTaskId: RUN_TASK_PREPARE_ID,
            toTaskId: RUN_TASK_IMPLEMENTATION_ID
          }
        ],
        summary: {
          totalTasks: 2,
          activeTasks: 0,
          pendingTasks: 1,
          completedTasks: 0,
          readyTasks: 1,
          failedTasks: 0,
          cancelledTasks: 0
        }
      }
    });

    expect(tasksResponse.status).toBe(200);
    await expect(tasksResponse.json()).resolves.toMatchObject({
      data: {
        total: 2,
        items: [
          {
            taskId: RUN_TASK_PREPARE_ID,
            logicalTaskId: "TASK-001",
            status: "ready",
            updatedAt: "2026-04-14T00:08:00.000Z"
          },
          {
            taskId: RUN_TASK_IMPLEMENTATION_ID,
            logicalTaskId: "TASK-002",
            status: "pending",
            dependsOn: [RUN_TASK_PREPARE_ID],
            updatedAt: "2026-04-14T00:11:00.000Z",
            conversation: {
              agentClass: "KeystoneThinkAgent",
              agentName: `tenant:tenant-fixture:run:run-123:task:${RUN_TASK_IMPLEMENTATION_ID}`
            }
          }
        ]
      }
    });

    expect(taskResponse.status).toBe(200);
    await expect(taskResponse.json()).resolves.toMatchObject({
      data: {
        taskId: RUN_TASK_IMPLEMENTATION_ID,
        logicalTaskId: "TASK-002",
        name: "Implement execution plan",
        updatedAt: "2026-04-14T00:11:00.000Z",
        conversation: {
          agentClass: "KeystoneThinkAgent",
          agentName: `tenant:tenant-fixture:run:run-123:task:${RUN_TASK_IMPLEMENTATION_ID}`
        }
      }
    });

    expect(conversationResponse.status).toBe(404);
  });

  it("fails open when run plan lookup rejects for run task routes", async () => {
    mocked.getArtifactText.mockRejectedValueOnce(new Error("r2 unavailable"));
    mocked.getArtifactText.mockRejectedValueOnce(new Error("r2 unavailable"));

    const [listResponse, detailResponse] = await Promise.all([
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
        `http://example.com/v1/runs/run-123/tasks/${RUN_TASK_IMPLEMENTATION_ID}`,
        {
          headers: {
            Authorization: "Bearer secret-dev-token",
            "X-Keystone-Tenant-Id": "tenant-fixture"
          }
        },
        env
      )
    ]);

    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      data: {
        total: 1,
        items: [
          {
            taskId: RUN_TASK_IMPLEMENTATION_ID,
            logicalTaskId: RUN_TASK_IMPLEMENTATION_ID
          }
        ]
      }
    });

    expect(detailResponse.status).toBe(200);
    await expect(detailResponse.json()).resolves.toMatchObject({
      data: {
        taskId: RUN_TASK_IMPLEMENTATION_ID,
        logicalTaskId: RUN_TASK_IMPLEMENTATION_ID
      }
    });
  });

  it("lists task-scoped artifact resources for a run task", async () => {
    mocked.listRunArtifacts.mockResolvedValueOnce(
      [
        runArtifactFixture,
        {
          ...runArtifactFixture,
          artifactRefId: "artifact-run-summary",
          runTaskId: null,
          artifactKind: "run_summary"
        }
      ] as never
    );

    const response = await app.request(
      `http://example.com/v1/runs/run-123/tasks/${RUN_TASK_IMPLEMENTATION_ID}/artifacts`,
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
            artifactId: "artifact-implementer-note",
            kind: "run_note",
            contentUrl: "/v1/artifacts/artifact-implementer-note/content"
          }
        ]
      },
      meta: {
        resourceType: "artifact"
      }
    });
  });

  it("returns task_not_found when requesting artifacts for a missing run task", async () => {
    const response = await app.request(
      "http://example.com/v1/runs/run-123/tasks/run-task-missing/artifacts",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        }
      },
      env
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "task_not_found",
        message: "Task run-task-missing was not found for run run-123."
      }
    });
  });
  it("returns 404 for removed approval, event, coordinator, and decision-package surfaces", async () => {
    const responses = await Promise.all([
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
        "http://example.com/v1/runs/run-123/events",
        {
          headers: {
            Authorization: "Bearer secret-dev-token",
            "X-Keystone-Tenant-Id": "tenant-fixture"
          }
        },
        env
      ),
      app.request(
        "http://example.com/v1/runs/run-123/stream",
        {
          headers: {
            Authorization: "Bearer secret-dev-token",
            "X-Keystone-Tenant-Id": "tenant-fixture"
          }
        },
        env
      ),
      app.request(
        "http://example.com/v1/decision-packages",
        {
          headers: {
            Authorization: "Bearer secret-dev-token",
            "X-Keystone-Tenant-Id": "tenant-fixture"
          }
        },
        env
      )
    ]);

    expect(responses.map((response) => response.status)).toEqual([404, 404, 404, 404, 404]);
  });
});
