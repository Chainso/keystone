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
      sessionId: null,
      taskId: null,
      runTaskId: null,
      kind: input.kind,
      artifactKind: input.artifactKind ?? input.kind,
      storageBackend: input.storageBackend,
      storageUri: input.storageUri,
      bucket: input.bucket ?? "keystone-artifacts-dev",
      objectKey: input.objectKey ?? "documents/project/project-123/doc-project-spec/revision-project-spec-v2",
      objectVersion: null,
      etag: input.etag ?? null,
      contentType: input.contentType,
      sha256: null,
      sizeBytes: input.sizeBytes ?? null,
      createdAt: new Date("2026-04-17T11:45:00.000Z"),
      metadata: input.metadata ?? {}
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
      integrationBindings: input.config.integrationBindings,
      metadata: input.config.metadata,
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
              defaultRef: "main"
            },
            metadata: {
              source: "fixture"
            }
          }
        ],
        envVars: [
          {
            name: "KEYSTONE_FIXTURE_PROJECT",
            value: "1",
            metadata: {
              source: "test"
            }
          }
        ],
        integrationBindings: [
          {
            bindingKey: "github-primary",
            tenantIntegrationId: "tenant-int-123",
            overrides: {
              repoOwner: "example"
            },
            metadata: {}
          }
        ],
        metadata: {
          source: "tests"
        },
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
              defaultRef: "main"
            },
            metadata: {
              source: "fixture"
            }
          }
        ],
        envVars: [],
        integrationBindings: [],
        metadata: {},
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
        executionEngine: "think",
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
    listRunSessions: vi.fn(async (_client, tenantId, runId) => [
      {
        tenantId,
        sessionId: "run-session-123",
        runId,
        sessionType: "run" as const,
        status: "archived",
        parentSessionId: null,
        createdAt: new Date("2026-04-17T10:30:00.000Z"),
        updatedAt: new Date("2026-04-17T11:30:00.000Z"),
        metadata: {
          project: {
            projectId: "project-123",
            projectKey: "fixture-demo-project",
            displayName: "Fixture Demo Project"
          },
          decisionPackageId: "decision-package-ui-first-api",
          runtime: "think",
          options: {
            thinkMode: "mock",
            preserveSandbox: false
          }
        }
      }
    ]),
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
      executionEngine: "think",
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
      integrationBindings: input.config.integrationBindings,
      metadata: input.config.metadata,
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
  listRunSessions: mocked.listRunSessions
}));

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

vi.mock("../../src/lib/db/artifacts", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/db/artifacts")>(
    "../../src/lib/db/artifacts"
  );

  return {
    ...actual,
    createArtifactRef: mocked.createArtifactRef,
    deleteArtifactRef: mocked.deleteArtifactRef
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

vi.mock("../../src/http/handlers/runs", () => ({
  createRunHandler: vi.fn(),
  getRunEventsHandler: vi.fn(),
  getRunHandler: vi.fn()
}));

vi.mock("../../src/http/handlers/approvals", () => ({
  resolveApprovalHandler: vi.fn()
}));

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
          defaultRef: "main"
        },
        ruleOverride: {
          reviewInstructions: ["Focus on app code paths."],
          testInstructions: ["Run demo-target tests first."],
          metadata: {
            owner: "app-team"
          }
        },
        metadata: {
          source: "fixture"
        }
      },
      {
        componentKey: "demo-support",
        displayName: "Demo Support",
        kind: "git_repository" as const,
        config: {
          gitUrl: "https://example.com/demo-support.git",
          defaultRef: "develop"
        },
        metadata: {
          source: "supporting-fixture"
        }
      }
    ],
    envVars: [
      {
        name: "KEYSTONE_FIXTURE_PROJECT",
        value: "1",
        metadata: {
          source: "test"
        }
      },
      {
        name: "LOG_LEVEL",
        value: "debug",
        metadata: {
          scope: "demo"
        }
      }
    ],
    integrationBindings: [
      {
        bindingKey: "github-primary",
        tenantIntegrationId: "tenant-int-123",
        overrides: {
          repoOwner: "example"
        },
        metadata: {
          purpose: "source-control"
        }
      },
      {
        bindingKey: "slack-alerts",
        tenantIntegrationId: "tenant-int-456",
        overrides: {
          channel: "#keystone-demo"
        },
        metadata: {}
      }
    ],
    metadata: {
      source: "tests",
      tier: "fixture"
    }
  };
}

describe("project API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.createWorkerDatabaseClient.mockImplementation(() =>
      createDocumentRepositoryClient(projectDocumentRepositoryFixture, mocked.close)
    );
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
            tenantId: "tenant-fixture",
            projectId: "project-123",
            projectKey: "fixture-demo-project"
          },
          {
            tenantId: "tenant-fixture",
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
            tenantId: "tenant-filtered",
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
        tenantId: "tenant-create",
        projectId: "project-created",
        projectKey: "fixture-demo-project",
        ruleSet: payload.ruleSet,
        components: expect.arrayContaining([
          expect.objectContaining({
            componentKey: "demo-target",
            ruleOverride: payload.components[0]?.ruleOverride,
            metadata: payload.components[0]?.metadata
          }),
          expect.objectContaining({
            componentKey: "demo-support",
            config: payload.components[1]?.config
          })
        ]),
        envVars: payload.envVars,
        integrationBindings: payload.integrationBindings,
        metadata: payload.metadata
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

  it("rejects duplicate integration binding keys at the request-contract layer", async () => {
    const payload = buildProjectPayload();
    const duplicateBinding = payload.integrationBindings[1]!;
    payload.integrationBindings[1] = {
      ...duplicateBinding,
      bindingKey: "github-primary"
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
              path: ["integrationBindings", 1, "bindingKey"]
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
        tenantId: "tenant-read",
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
        method: "PUT",
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
        tenantId: "tenant-update",
        projectId: "project-123",
        displayName: "Fixture Demo Project v2",
        ruleSet: payload.ruleSet,
        components: expect.arrayContaining([
          expect.objectContaining({
            componentKey: "demo-target",
            ruleOverride: payload.components[0]?.ruleOverride
          })
        ]),
        envVars: payload.envVars,
        integrationBindings: payload.integrationBindings,
        metadata: payload.metadata
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

  it("lists persisted project documents and keeps decision packages stubbed", async () => {
    const [documentsResponse, decisionPackagesResponse] = await Promise.all([
      app.request(
        "http://example.com/v1/projects/project-123/documents",
        {
          headers: {
            Authorization: "Bearer secret-dev-token",
            "X-Keystone-Tenant-Id": "tenant-read"
          }
        },
        env
      ),
      app.request(
        "http://example.com/v1/projects/project-123/decision-packages",
        {
          headers: {
            Authorization: "Bearer secret-dev-token",
            "X-Keystone-Tenant-Id": "tenant-read"
          }
        },
        env
      )
    ]);

    expect(documentsResponse.status).toBe(200);
    await expect(documentsResponse.json()).resolves.toMatchObject({
      data: {
        total: 1,
        items: [
          {
            tenantId: "tenant-read",
            projectId: "project-123",
            documentId: "doc-project-spec",
            scopeType: "project",
            kind: "specification",
            path: "product/specification",
            currentRevisionId: "revision-project-spec-v1",
            currentRevision: {
              documentRevisionId: "revision-project-spec-v1",
              revisionNumber: 1,
              artifactId: "artifact-project-spec-v1"
            },
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

    expect(decisionPackagesResponse.status).toBe(200);
    await expect(decisionPackagesResponse.json()).resolves.toMatchObject({
      data: {
        total: 0,
        items: []
      },
      meta: {
        resourceType: "decision_package"
      }
    });
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
        tenantId: "tenant-write",
        projectId: "project-123",
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
        tenantId: "tenant-read",
        projectId: "project-123",
        documentId: "doc-project-spec",
        kind: "specification",
        path: "product/specification",
        currentRevision: {
          documentRevisionId: "revision-project-spec-v1",
          title: "Project Specification v1"
        }
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
        tenantId: "tenant-read",
        projectId: "project-123",
        runId: null,
        documentId: "doc-project-spec",
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
        kind: "document_revision"
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

  it("lists projected runs for a project", async () => {
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
            decisionPackageId: "decision-package-ui-first-api",
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
    expect(mocked.listRunSessions).toHaveBeenCalledWith(
      expect.anything(),
      "tenant-read",
      "run-123"
    );
  });

  it("loads run-plan summaries for project run listing when session metadata no longer carries them", async () => {
    mocked.listRunSessions.mockResolvedValueOnce([
      {
        tenantId: "tenant-read",
        sessionId: "run-session-123",
        runId: "run-123",
        sessionType: "run" as const,
        status: "archived",
        parentSessionId: null,
        createdAt: new Date("2026-04-17T10:30:00.000Z"),
        updatedAt: new Date("2026-04-17T11:30:00.000Z"),
        metadata: {
          project: {
            projectId: "project-123",
            projectKey: "fixture-demo-project",
            displayName: "Fixture Demo Project"
          },
          decisionPackageId: "decision-package-ui-first-api",
          runtime: "think",
          options: {
            thinkMode: "mock",
            preserveSandbox: false
          }
        }
      }
    ] as never);
    mocked.getArtifactText.mockResolvedValueOnce(
      JSON.stringify({
        decisionPackageId: "decision-package-ui-first-api",
        summary: "Compiled run-plan summary restored from the artifact.",
        tasks: [
          {
            taskId: "task-greeting-tone",
            title: "Adjust the greeting implementation",
            summary: "Use the compiled artifact summary.",
            instructions: ["Implement the approved change."],
            acceptanceCriteria: ["Relevant checks pass."],
            dependsOn: []
          }
        ]
      })
    );

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
        items: [
          {
            runId: "run-123",
            summary: "Compiled run-plan summary restored from the artifact."
          }
        ]
      }
    });
  });

  it("uses the run row as the authority when project-run listing sees legacy session drift", async () => {
    mocked.listProjectRuns.mockResolvedValueOnce([
      {
        tenantId: "tenant-read",
        runId: "run-123",
        projectId: "project-123",
        workflowInstanceId: "workflow-run-123",
        executionEngine: "think",
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
    ]);
    mocked.listRunSessions.mockResolvedValueOnce([
      {
        tenantId: "tenant-read",
        sessionId: "run-session-123",
        runId: "run-123",
        sessionType: "run" as const,
        status: "archived",
        parentSessionId: null,
        createdAt: new Date("2026-04-17T10:30:00.000Z"),
        updatedAt: new Date("2026-04-17T11:30:00.000Z"),
        metadata: {
          project: {
            projectId: "project-session-drift",
            projectKey: "legacy-project",
            displayName: "Legacy Session Project"
          },
          executionEngine: "scripted",
          runtime: "scripted",
          options: {
            thinkMode: "live",
            preserveSandbox: true
          }
        }
      }
    ] as never);

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
        items: [
          {
            runId: "run-123",
            projectId: "project-123",
            execution: {
              runtime: "think",
              thinkMode: "live",
              preserveSandbox: true
            }
          }
        ]
      }
    });
  });
});
