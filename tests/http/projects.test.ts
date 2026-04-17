import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);

  return {
    close,
    createWorkerDatabaseClient: vi.fn(() => ({
      close,
      db: {},
      sql: {}
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

const { app } = await import("../../src/http/app");

const env = {
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
    }
  };
}

describe("project API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.createWorkerDatabaseClient.mockReturnValue({
      close: mocked.close,
      db: {},
      sql: {}
    });
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
      tenantId: "tenant-fixture",
      total: 2,
      projects: [
        {
          projectId: "project-123",
          projectKey: "fixture-demo-project"
        },
        {
          projectId: "project-456",
          projectKey: "secondary-project"
        }
      ]
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
      tenantId: "tenant-filtered",
      total: 1,
      projects: [
        {
          projectId: "project-123",
          projectKey: "fixture-demo-project"
        }
      ]
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

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      project: {
        tenantId: "tenant-create",
        projectId: "project-created",
        projectKey: "fixture-demo-project"
      }
    });
    expect(mocked.createProject).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-create",
        config: expect.objectContaining({
          projectKey: "fixture-demo-project"
        })
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
        message: "Request validation failed."
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
      project: {
        tenantId: "tenant-read",
        projectId: "project-123",
        projectKey: "fixture-demo-project"
      }
    });
  });

  it("updates an existing project", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-update"
        },
        body: JSON.stringify({
          ...buildProjectPayload(),
          displayName: "Fixture Demo Project v2"
        })
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      project: {
        tenantId: "tenant-update",
        projectId: "project-123",
        displayName: "Fixture Demo Project v2"
      }
    });
    expect(mocked.updateProject).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-update",
        projectId: "project-123",
        config: expect.objectContaining({
          displayName: "Fixture Demo Project v2"
        })
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
});
