import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDocumentRepositoryClient } from "./document-db-fixture";

const projectDocumentFixture = {
  tenantId: "tenant-read",
  projectId: "project-123",
  documentId: "doc-project-spec",
  runId: null,
  scopeType: "project" as const,
  kind: "specification" as const,
  path: "product/specification",
  currentRevisionId: "revision-project-spec-v1",
  conversationAgentClass: "PlanningDocumentAgent",
  conversationAgentName: "project-specification",
  createdAt: new Date("2026-04-17T10:45:00.000Z"),
  updatedAt: new Date("2026-04-17T11:15:00.000Z")
};

const projectDocumentRevisionFixture = {
  documentRevisionId: "revision-project-spec-v1",
  documentId: "doc-project-spec",
  artifactRefId: "artifact-project-spec-v1",
  revisionNumber: 1,
  title: "Project Specification v1",
  createdAt: new Date("2026-04-17T11:15:00.000Z")
};

const projectDocumentRepositoryFixture = {
  projects: [
    {
      tenantId: "tenant-read",
      projectId: "project-123"
    }
  ],
  runs: [],
  documents: [projectDocumentFixture],
  documentRevisions: [projectDocumentRevisionFixture]
};

const projectRunTaskFixture = {
  runTaskId: "run-task-implementation",
  runId: "run-123",
  name: "Implement execution plan",
  description: "Apply the approved change in a reviewable way.",
  status: "active",
  conversationAgentClass: "KeystoneThinkAgent",
  conversationAgentName: "tenant:tenant-read:run:run-123:task:run-task-implementation",
  startedAt: new Date("2026-04-17T10:45:00.000Z"),
  endedAt: null,
  createdAt: new Date("2026-04-17T10:40:00.000Z"),
  updatedAt: new Date("2026-04-17T10:45:00.000Z")
};

const projectRunArtifactFixture = {
  tenantId: "tenant-read",
  artifactRefId: "artifact-run-summary",
  projectId: "project-123",
  runId: "run-123",
  runTaskId: null,
  artifactKind: "run_summary",
  storageBackend: "r2",
  bucket: "keystone-artifacts-dev",
  objectKey: "tenants/tenant-read/runs/run-123/release/run-summary.json",
  objectVersion: null,
  etag: "etag-run-summary",
  contentType: "application/json; charset=utf-8",
  sha256: null,
  sizeBytes: 128,
  createdAt: new Date("2026-04-17T11:30:00.000Z")
};

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);

  return {
    close,
    bucketGet: vi.fn(async () => null),
    bucketDelete: vi.fn(async () => undefined),
    bucketPut: vi.fn(async () => ({
      httpEtag: "etag-project-spec-v2",
      size: 27
    })),
    createWorkerDatabaseClient: vi.fn(() =>
      createDocumentRepositoryClient(projectDocumentRepositoryFixture, close)
    ),
    deleteArtifactRef: vi.fn(async () => null),
    getArtifactText: vi.fn(async (): Promise<string | null> => null),
    createArtifactRef: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      artifactRefId: "artifact-project-spec-v2",
      projectId: input.projectId ?? null,
      runId: input.runId ?? `project:${input.projectId}`,
      runTaskId: null,
      artifactKind: input.artifactKind,
      storageBackend: input.storageBackend,
      bucket: input.bucket ?? "keystone-artifacts-dev",
      objectKey: input.objectKey ?? "documents/project/project-123/doc-project-spec/revision-project-spec-v2",
      objectVersion: null,
      etag: input.etag ?? null,
      contentType: input.contentType,
      sha256: null,
      sizeBytes: input.sizeBytes ?? null,
      createdAt: new Date("2026-04-17T11:45:00.000Z")
    })),
    createProject: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      projectId: "project-created",
      projectKey: input.config.projectKey,
      displayName: input.config.displayName,
      description: input.config.description,
      ruleSet: input.config.ruleSet,
      components: input.config.components,
      envVars: input.config.envVars,
      createdAt: new Date("2026-04-17T10:00:00.000Z"),
      updatedAt: new Date("2026-04-17T10:00:00.000Z")
    })),
    getProject: vi.fn(async (_client, input) => {
      if (input.projectId !== "project-123") {
        return undefined;
      }

      return {
        tenantId: input.tenantId,
        projectId: "project-123",
        projectKey: "fixture-demo-project",
        displayName: "Fixture Demo Project",
        description: "Fixture project for tests.",
        ruleSet: {
          reviewInstructions: ["Review the result."],
          testInstructions: ["Run tests."]
        },
        components: [
          {
            componentKey: "demo-target",
            displayName: "Demo Target",
            kind: "git_repository" as const,
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
        createdAt: new Date("2026-04-17T10:00:00.000Z"),
        updatedAt: new Date("2026-04-17T11:00:00.000Z")
      };
    }),
    getProjectByKey: vi.fn(async (_client, input) => {
      if (input.projectKey !== "fixture-demo-project") {
        return undefined;
      }

      return {
        tenantId: input.tenantId,
        projectId: "project-123",
        projectKey: "fixture-demo-project",
        displayName: "Fixture Demo Project",
        description: "Fixture project for tests.",
        ruleSet: {
          reviewInstructions: ["Review the result."],
          testInstructions: ["Run tests."]
        },
        components: [
          {
            componentKey: "demo-target",
            displayName: "Demo Target",
            kind: "git_repository" as const,
            config: {
              localPath: "./fixtures/demo-target",
              ref: "main"
            }
          }
        ],
        envVars: [],
        createdAt: new Date("2026-04-17T10:00:00.000Z"),
        updatedAt: new Date("2026-04-17T11:00:00.000Z")
      };
    }),
    listProjects: vi.fn(async (_client, input) => [
      {
        tenantId: input.tenantId,
        projectId: "project-123",
        projectKey: "fixture-demo-project",
        displayName: "Fixture Demo Project",
        description: "Fixture project for tests.",
        createdAt: new Date("2026-04-17T10:00:00.000Z"),
        updatedAt: new Date("2026-04-17T11:00:00.000Z")
      },
      {
        tenantId: input.tenantId,
        projectId: "project-456",
        projectKey: "secondary-project",
        displayName: "Secondary Project",
        description: null,
        createdAt: new Date("2026-04-17T09:00:00.000Z"),
        updatedAt: new Date("2026-04-17T09:30:00.000Z")
      }
    ]),
    listProjectRuns: vi.fn(async (_client, input) => [
      {
        tenantId: input.tenantId,
        runId: "run-123",
        projectId: input.projectId,
        workflowInstanceId: "workflow-run-123",
        executionEngine: "think_mock",
        sandboxId: null,
        status: "archived",
        compiledSpecRevisionId: null,
        compiledArchitectureRevisionId: null,
        compiledExecutionPlanRevisionId: null,
        compiledAt: null,
        startedAt: new Date("2026-04-17T10:35:00.000Z"),
        endedAt: new Date("2026-04-17T11:30:00.000Z"),
        createdAt: new Date("2026-04-17T10:30:00.000Z"),
        updatedAt: new Date("2026-04-17T11:30:00.000Z")
      }
    ]),
    listRunTasks: vi.fn(async () => [projectRunTaskFixture]),
    listRunTaskDependencies: vi.fn(async () => []),
    listRunArtifacts: vi.fn(async () => []),
    createDocument: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      projectId: input.projectId,
      documentId: "doc-project-architecture",
      runId: input.runId ?? null,
      scopeType: input.scopeType,
      kind: input.kind,
      path: input.path,
      currentRevisionId: null,
      conversationAgentClass: input.conversationAgentClass ?? null,
      conversationAgentName: input.conversationAgentName ?? null,
      createdAt: new Date("2026-04-17T11:30:00.000Z"),
      updatedAt: new Date("2026-04-17T11:30:00.000Z")
    })),
    createDocumentRevision: vi.fn(async (_client, input) => ({
      documentRevisionId: input.documentRevisionId ?? "revision-project-spec-v2",
      documentId: input.documentId,
      artifactRefId: input.artifactRefId,
      revisionNumber: 2,
      title: input.title,
      createdAt: new Date("2026-04-17T11:45:00.000Z")
    })),
    getRunRecord: vi.fn(async () => ({
      tenantId: "tenant-read",
      runId: "run-123",
      projectId: "project-123",
      workflowInstanceId: "workflow-run-123",
      executionEngine: "think_mock",
      sandboxId: null,
      status: "configured",
      compiledSpecRevisionId: null,
      compiledArchitectureRevisionId: null,
      compiledExecutionPlanRevisionId: null,
      compiledAt: null,
      startedAt: null,
      endedAt: null,
      createdAt: new Date("2026-04-17T10:30:00.000Z"),
      updatedAt: new Date("2026-04-17T10:30:00.000Z")
    })),
    updateProject: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      projectId: input.projectId,
      projectKey: input.config.projectKey,
      displayName: input.config.displayName,
      description: input.config.description,
      ruleSet: input.config.ruleSet,
      components: input.config.components,
      envVars: input.config.envVars,
      createdAt: new Date("2026-04-17T10:00:00.000Z"),
      updatedAt: new Date("2026-04-17T12:00:00.000Z")
    }))
  };
});

vi.mock("../../src/lib/db/client", () => ({
  createWorkerDatabaseClient: mocked.createWorkerDatabaseClient
}));

vi.mock("../../src/lib/db/projects", () => ({
  createProject: mocked.createProject,
  getProject: mocked.getProject,
  getProjectByKey: mocked.getProjectByKey,
  listProjects: mocked.listProjects,
  updateProject: mocked.updateProject
}));

vi.mock("../../src/lib/db/runs", () => ({
  getRunRecord: mocked.getRunRecord,
  listProjectRuns: mocked.listProjectRuns,
  listRunTaskDependencies: mocked.listRunTaskDependencies,
  listRunTasks: mocked.listRunTasks
}));

vi.mock("../../src/lib/db/artifacts", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/db/artifacts")>(
    "../../src/lib/db/artifacts"
  );

  return {
    ...actual,
    createArtifactRef: mocked.createArtifactRef,
    deleteArtifactRef: mocked.deleteArtifactRef,
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
    getProjectDocument: vi.fn(actual.getProjectDocument),
    getRunDocument: vi.fn(actual.getRunDocument),
    getDocumentWithCurrentRevision: vi.fn(actual.getDocumentWithCurrentRevision),
    listProjectDocumentsWithCurrentRevision: vi.fn(actual.listProjectDocumentsWithCurrentRevision),
    listRunDocumentsWithCurrentRevision: vi.fn(actual.listRunDocumentsWithCurrentRevision)
  };
});

vi.mock("../../src/lib/artifacts/r2", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/artifacts/r2")>(
    "../../src/lib/artifacts/r2"
  );

  return {
    ...actual,
    getArtifactText: mocked.getArtifactText
  };
});

vi.mock("../../src/http/handlers/ws", () => ({
  runWebSocketHandler: vi.fn()
}));

vi.mock("../../src/http/handlers/dev-compile", () => ({
  runCompileSmokeHandler: vi.fn()
}));

vi.mock("../../src/http/handlers/dev-smoke", () => ({
  runSandboxSmokeHandler: vi.fn()
}));

vi.mock("../../src/http/handlers/dev-think", () => ({
  runThinkSmokeHandler: vi.fn()
}));

const documentsDb = await import("../../src/lib/db/documents");
const { app } = await import("../../src/http/app");

const env = {
  ARTIFACTS_BUCKET: {
    get: mocked.bucketGet,
    delete: mocked.bucketDelete,
    put: mocked.bucketPut
  } as unknown as R2Bucket,
  HYPERDRIVE: {
    connectionString: "postgres://test"
  },
  KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
  KEYSTONE_DEV_TOKEN: "secret-dev-token"
} as const;

function buildProjectPayload() {
  return {
    projectKey: "fixture-demo-project",
    displayName: "Fixture Demo Project",
    description: "Fixture project for tests.",
    ruleSet: {
      reviewInstructions: ["Review the result.", "Check cross-component changes."],
      testInstructions: ["Run tests.", "Record fixture output."]
    },
    components: [
      {
        componentKey: "demo-target",
        displayName: "Demo Target",
        kind: "git_repository" as const,
        config: {
          localPath: "./fixtures/demo-target",
          ref: "main"
        },
        ruleOverride: {
          reviewInstructions: ["Focus on app code paths."],
          testInstructions: ["Run demo-target tests first."]
        }
      },
      {
        componentKey: "demo-support",
        displayName: "Demo Support",
        kind: "git_repository" as const,
        config: {
          gitUrl: "https://example.com/demo-support.git",
          ref: "develop"
        }
      }
    ],
    envVars: [
      {
        name: "KEYSTONE_FIXTURE_PROJECT",
        value: "1"
      },
      {
        name: "LOG_LEVEL",
        value: "debug"
      }
    ]
  };
}

describe("project API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.createWorkerDatabaseClient.mockImplementation(() =>
      createDocumentRepositoryClient(projectDocumentRepositoryFixture, mocked.close)
    );
    mocked.listRunTasks.mockResolvedValue([projectRunTaskFixture] as never);
    mocked.listRunTaskDependencies.mockResolvedValue([] as never);
    mocked.listRunArtifacts.mockResolvedValue([] as never);
  });

  it("lists tenant-scoped projects", async () => {
    const response = await app.request(
      "http://example.com/v1/projects",
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
        total: 2,
        items: [
          {
            projectId: "project-123",
            projectKey: "fixture-demo-project"
          },
          {
            projectId: "project-456",
            projectKey: "secondary-project"
          }
        ]
      },
      meta: {
        apiVersion: "v1",
        envelope: "collection",
        resourceType: "project"
      }
    });
    expect(mocked.listProjects).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture"
      })
    );
  });

  it("filters projects by projectKey", async () => {
    const response = await app.request(
      "http://example.com/v1/projects?projectKey=fixture-demo-project",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-filtered"
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
            projectId: "project-123",
            projectKey: "fixture-demo-project"
          }
        ]
      },
      meta: {
        apiVersion: "v1",
        envelope: "collection",
        resourceType: "project"
      }
    });
    expect(mocked.getProjectByKey).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-filtered",
        projectKey: "fixture-demo-project"
      })
    );
    expect(mocked.listProjects).not.toHaveBeenCalled();
  });

  it("creates a validated tenant-scoped project", async () => {
    const payload = buildProjectPayload();
    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify(payload)
      },
      env
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        projectId: "project-created",
        projectKey: "fixture-demo-project",
        ruleSet: payload.ruleSet,
        components: expect.arrayContaining([
          expect.objectContaining({
            componentKey: "demo-target",
            ruleOverride: payload.components[0]?.ruleOverride
          }),
          expect.objectContaining({
            componentKey: "demo-support",
            config: payload.components[1]?.config
          })
        ]),
        envVars: payload.envVars
      },
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "project"
      }
    });
    expect(mocked.createProject).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-create",
        config: payload
      })
    );
  });

  it("returns validation failures as 400 responses", async () => {
    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify({
          projectKey: "",
          displayName: "Broken Project",
          components: []
        })
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "Project request validation failed."
      }
    });
    expect(mocked.createProject).not.toHaveBeenCalled();
  });

  it("rejects duplicate component keys at the request-contract layer", async () => {
    const payload = buildProjectPayload();
    const duplicateComponent = payload.components[1]!;
    payload.components[1] = {
      ...duplicateComponent,
      componentKey: "demo-target"
    };

    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify(payload)
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "Project request validation failed.",
        details: {
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ["components", 1, "componentKey"]
            })
          ])
        }
      }
    });
    expect(mocked.createProject).not.toHaveBeenCalled();
  });

  it("rejects duplicate env var names at the request-contract layer", async () => {
    const payload = buildProjectPayload();
    mocked.createProject.mockRejectedValueOnce({
      code: "23505"
    });

    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify(payload)
      },
      env
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "project_key_conflict",
        message: "Project key fixture-demo-project already exists for tenant tenant-create."
      }
    });
    expect(mocked.createProject).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate project keys at the request-contract layer only through stored uniqueness, not payload shape", async () => {
    const payload = buildProjectPayload();
    const duplicateEnvVar = payload.envVars[1]!;
    payload.envVars[1] = {
      ...duplicateEnvVar,
      name: "KEYSTONE_FIXTURE_PROJECT"
    };

    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify(payload)
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "Project request validation failed.",
        details: {
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ["envVars", 1, "name"]
            })
          ])
        }
      }
    });
    expect(mocked.createProject).not.toHaveBeenCalled();
  });

  it("returns a project by id", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        projectId: "project-123",
        projectKey: "fixture-demo-project"
      },
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "project"
      }
    });
  });

  it("updates an existing project", async () => {
    const payload = {
      ...buildProjectPayload(),
      displayName: "Fixture Demo Project v2"
    };
    const response = await app.request(
      "http://example.com/v1/projects/project-123",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-update"
        },
        body: JSON.stringify(payload)
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        projectId: "project-123",
        displayName: "Fixture Demo Project v2",
        ruleSet: payload.ruleSet,
        components: expect.arrayContaining([
          expect.objectContaining({
            componentKey: "demo-target",
            ruleOverride: payload.components[0]?.ruleOverride
          })
        ]),
        envVars: payload.envVars
      },
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "project"
      }
    });
    expect(mocked.updateProject).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-update",
        projectId: "project-123",
        config: payload
      })
    );
  });

  it("returns 404 when a project is missing", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-missing",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "project_not_found"
      }
    });
  });

  it("returns 409 for duplicate project keys", async () => {
    mocked.createProject.mockRejectedValueOnce({
      code: "23505"
    });

    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify(buildProjectPayload())
      },
      env
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "project_key_conflict"
      }
    });
  });

  it("lists persisted project documents", async () => {
    const documentsResponse = await app.request(
      "http://example.com/v1/projects/project-123/documents",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(documentsResponse.status).toBe(200);
    await expect(documentsResponse.json()).resolves.toMatchObject({
      data: {
        total: 1,
        items: [
          {
            documentId: "doc-project-spec",
            scopeType: "project",
            kind: "specification",
            path: "product/specification",
            currentRevisionId: "revision-project-spec-v1",
            conversation: {
              agentClass: "PlanningDocumentAgent",
              agentName: "project-specification"
            }
          }
        ]
      },
      meta: {
        resourceType: "document"
      }
    });
    expect(documentsDb.listProjectDocumentsWithCurrentRevision).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-read",
        projectId: "project-123"
      })
    );

  });

  it("creates a project document identity", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-write"
        },
        body: JSON.stringify({
          kind: "architecture",
          path: "technical/architecture",
          conversation: {
            agentClass: "PlanningDocumentAgent",
            agentName: "project-architecture"
          }
        })
      },
      env
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        documentId: "doc-project-architecture",
        scopeType: "project",
        kind: "architecture",
        path: "technical/architecture",
        currentRevisionId: null,
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: "project-architecture"
        }
      },
      meta: {
        resourceType: "document"
      }
    });
    expect(mocked.createDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-write",
        projectId: "project-123",
        scopeType: "project",
        kind: "architecture",
        path: "technical/architecture"
      })
    );
  });

  it("maps unexpected document creation failures to internal_error responses", async () => {
    mocked.createDocument.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-write"
        },
        body: JSON.stringify({
          kind: "architecture",
          path: "technical/architecture"
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
  });

  it("returns a project document detail", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents/doc-project-spec",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        documentId: "doc-project-spec",
        kind: "specification",
        path: "product/specification",
        currentRevisionId: "revision-project-spec-v1"
      },
      meta: {
        resourceType: "document"
      }
    });
  });

  it("creates a project document revision backed by an artifact", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents/doc-project-spec/revisions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-read"
        },
        body: JSON.stringify({
          title: "Project Specification v2",
          body: "# Revised specification\n",
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
        title: "Project Specification v2",
        artifactId: "artifact-project-spec-v2"
      },
      meta: {
        resourceType: "document_revision"
      }
    });
    expect(mocked.bucketPut).toHaveBeenCalled();
    expect(mocked.createArtifactRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-read",
        projectId: "project-123",
        runId: null,
        artifactKind: "document_revision"
      })
    );
    expect(mocked.createDocumentRevision).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-read",
        documentId: "doc-project-spec",
        title: "Project Specification v2"
      })
    );
  });

  it("deletes uploaded project revision artifacts when persistence fails downstream", async () => {
    mocked.createDocumentRevision.mockRejectedValueOnce(new Error("document revision insert failed"));

    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents/doc-project-spec/revisions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-read"
        },
        body: JSON.stringify({
          title: "Project Specification v2",
          body: "# Revised specification\n",
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
        tenantId: "tenant-read",
        artifactRefId: "artifact-project-spec-v2"
      })
    );
    expect(mocked.bucketDelete).toHaveBeenCalledWith(
      expect.stringMatching(/^documents\/project\/project-123\/doc-project-spec\//)
    );
  });

  it("rejects invalid canonical project document paths", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-write"
        },
        body: JSON.stringify({
          kind: "specification",
          path: "notes/specification"
        })
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message:
          "project-scoped specification documents must use the canonical path product/specification."
      }
    });
    expect(mocked.createDocument).not.toHaveBeenCalled();
  });

  it("lists project runs from authoritative run, task, and artifact rows", async () => {
    mocked.listRunArtifacts.mockResolvedValueOnce([projectRunArtifactFixture] as never);

    const response = await app.request(
      "http://example.com/v1/projects/project-123/runs",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
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
            runId: "run-123",
            projectId: "project-123",
            executionEngine: "think_mock",
            status: "archived"
          }
        ]
      },
      meta: {
        resourceType: "run"
      }
    });
    expect(mocked.listProjectRuns).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-read",
        projectId: "project-123"
      })
    );
    expect(mocked.listRunTasks).not.toHaveBeenCalled();
  });
});
