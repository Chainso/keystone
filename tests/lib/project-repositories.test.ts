import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DatabaseClient } from "../../src/lib/db/client";
import {
  createDatabaseClientFromSource,
  resolveDatabaseConnectionString
} from "../../src/lib/db/client";
import { applyMigrations } from "../../src/lib/db/migrations";
import {
  createProject,
  getProject,
  getProjectByKey,
  listProjectComponents,
  listProjectEnvVars,
  listProjectIntegrationBindings,
  listProjects,
  updateProject
} from "../../src/lib/db/projects";

const connectionString =
  process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??
  process.env.DATABASE_URL;

const describeIfDatabase =
  connectionString && process.env.KEYSTONE_RUN_DB_TESTS === "1" ? describe : describe.skip;

describeIfDatabase("project repositories", () => {
  let client: DatabaseClient;

  const tenantId = `tenant-project-${crypto.randomUUID()}`;
  const otherTenantId = `tenant-project-${crypto.randomUUID()}`;

  beforeAll(async () => {
    const resolvedConnectionString = resolveDatabaseConnectionString({
      connectionString
    });

    await applyMigrations({
      connectionString: resolvedConnectionString
    });

    client = createDatabaseClientFromSource({
      connectionString: resolvedConnectionString
    });
  });

  afterAll(async () => {
    if (!client) {
      return;
    }

    await client.sql`DELETE FROM projects WHERE tenant_id = ${tenantId}`;
    await client.sql`DELETE FROM projects WHERE tenant_id = ${otherTenantId}`;
    await client.close();
  });

  function buildProjectConfig(projectKey: string) {
    return {
      projectKey,
      displayName: "Demo Project",
      description: "Fixture project for repository tests.",
      ruleSet: {
        reviewInstructions: ["Require a code review summary."],
        testInstructions: ["Run unit tests before handoff."]
      },
      components: [
        {
          componentKey: "api",
          displayName: "API",
          kind: "git_repository" as const,
          config: {
            localPath: "./fixtures/demo-target",
            defaultRef: "main"
          },
          ruleOverride: {
            testInstructions: ["Run targeted API integration tests."],
            metadata: {
              owner: "platform"
            }
          },
          metadata: {
            purpose: "service"
          }
        },
        {
          componentKey: "docs",
          displayName: "Docs",
          kind: "git_repository" as const,
          config: {
            gitUrl: "https://github.com/example/docs.git",
            defaultRef: "main"
          },
          metadata: {
            purpose: "documentation"
          }
        }
      ],
      envVars: [
        {
          name: "NODE_ENV",
          value: "test",
          metadata: {
            scope: "project"
          }
        }
      ],
      integrationBindings: [
        {
          bindingKey: "github-primary",
          tenantIntegrationId: "tenant-int-github-primary",
          overrides: {
            repoOwner: "example"
          },
          metadata: {
            channel: "default"
          }
        }
      ],
      metadata: {
        source: "test"
      }
    };
  }

  it("creates and loads a project with components, rules, env vars, and integration bindings", async () => {
    const created = await createProject(client, {
      tenantId,
      config: buildProjectConfig("demo-project")
    });

    expect(created.projectKey).toBe("demo-project");
    expect(created.ruleSet.reviewInstructions).toEqual(["Require a code review summary."]);
    expect(created.components).toHaveLength(2);
    expect(created.envVars[0]?.name).toBe("NODE_ENV");
    expect(created.integrationBindings[0]?.bindingKey).toBe("github-primary");

    const byId = await getProject(client, {
      tenantId,
      projectId: created.projectId
    });
    const byKey = await getProjectByKey(client, {
      tenantId,
      projectKey: "demo-project"
    });

    expect(byId?.projectId).toBe(created.projectId);
    expect(byKey?.displayName).toBe("Demo Project");
    expect(
      byId?.components.find((component) => component.componentKey === "api")?.ruleOverride
        ?.testInstructions
    ).toEqual(["Run targeted API integration tests."]);

    const components = await listProjectComponents(client, {
      tenantId,
      projectId: created.projectId
    });
    const envVars = await listProjectEnvVars(client, {
      tenantId,
      projectId: created.projectId
    });
    const integrationBindings = await listProjectIntegrationBindings(client, {
      tenantId,
      projectId: created.projectId
    });

    expect(components.map((component) => component.componentKey)).toEqual(["api", "docs"]);
    expect(envVars.map((envVar) => envVar.name)).toEqual(["NODE_ENV"]);
    expect(integrationBindings.map((binding) => binding.bindingKey)).toEqual(["github-primary"]);
  });

  it("replaces nested project configuration during update", async () => {
    const existing = await createProject(client, {
      tenantId,
      config: buildProjectConfig("update-project")
    });

    const updated = await updateProject(client, {
      tenantId,
      projectId: existing.projectId,
      config: {
        projectKey: "update-project",
        displayName: "Demo Project v2",
        description: "Updated fixture project.",
        ruleSet: {
          reviewInstructions: ["Require review note + rollout notes."],
          testInstructions: ["Run the full repository test suite."]
        },
        components: [
          {
            componentKey: "frontend",
            displayName: "Frontend",
            kind: "git_repository",
            config: {
              localPath: "./fixtures/demo-target",
              defaultRef: "feature/project-model"
            },
            ruleOverride: {
              reviewInstructions: ["Attach UI screenshots in review."],
              metadata: {
                area: "ui"
              }
            },
            metadata: {
              purpose: "web"
            }
          }
        ],
        envVars: [
          {
            name: "FEATURE_FLAG_PROJECTS",
            value: "1",
            metadata: {}
          }
        ],
        integrationBindings: [
          {
            bindingKey: "slack-alerts",
            tenantIntegrationId: "tenant-int-slack-alerts",
            overrides: {
              channel: "#shiproom"
            },
            metadata: {}
          }
        ],
        metadata: {
          source: "updated-test"
        }
      }
    });

    expect(updated.displayName).toBe("Demo Project v2");
    expect(updated.components).toHaveLength(1);
    expect(updated.components[0]?.componentKey).toBe("frontend");
    expect(updated.envVars.map((envVar) => envVar.name)).toEqual(["FEATURE_FLAG_PROJECTS"]);
    expect(updated.integrationBindings.map((binding) => binding.bindingKey)).toEqual([
      "slack-alerts"
    ]);

    const projectList = await listProjects(client, {
      tenantId
    });

    expect(projectList.some((project) => project.projectId === existing.projectId)).toBe(true);
    expect(projectList.find((project) => project.projectId === existing.projectId)?.displayName).toBe(
      "Demo Project v2"
    );
  });

  it("keeps project lookups tenant isolated", async () => {
    const created = await createProject(client, {
      tenantId,
      config: buildProjectConfig("tenant-isolated-project")
    });

    const byWrongTenantId = await getProject(client, {
      tenantId: otherTenantId,
      projectId: created.projectId
    });
    const byWrongTenantKey = await getProjectByKey(client, {
      tenantId: otherTenantId,
      projectKey: created.projectKey
    });
    const otherTenantProjects = await listProjects(client, {
      tenantId: otherTenantId
    });

    expect(byWrongTenantId).toBeUndefined();
    expect(byWrongTenantKey).toBeUndefined();
    expect(otherTenantProjects).toEqual([]);
  });

  it("rejects duplicate project keys within a tenant while allowing reuse across tenants", async () => {
    const config = buildProjectConfig("duplicate-project");

    await createProject(client, {
      tenantId,
      config
    });

    await expect(
      createProject(client, {
        tenantId,
        config
      })
    ).rejects.toThrow(/duplicate key value|uq_projects_tenant_key/i);

    const otherTenantProject = await createProject(client, {
      tenantId: otherTenantId,
      config
    });

    expect(otherTenantProject.projectKey).toBe("duplicate-project");
  });

  it("loads component rule overrides through their component rows", async () => {
    const created = await createProject(client, {
      tenantId,
      config: buildProjectConfig("override-storage-project")
    });

    const loaded = await getProject(client, {
      tenantId,
      projectId: created.projectId
    });

    expect(
      loaded?.components.find((component) => component.componentKey === "api")?.ruleOverride
        ?.testInstructions
    ).toEqual(["Run targeted API integration tests."]);
  });
});
