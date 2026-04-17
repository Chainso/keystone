import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function getArg(name: string) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : undefined;
}

function readJsonResponse(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

export function resolveBaseUrl() {
  return getArg("base-url") ?? process.env.KEYSTONE_BASE_URL ?? "http://127.0.0.1:8787";
}

export function resolveDemoTenantId() {
  return getArg("tenant-id") ?? process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local";
}

export function resolveFixtureProjectConfig() {
  return {
    projectKey: "fixture-demo-project",
    displayName: "Fixture Demo Project",
    description: "Deterministic fixture project for local Keystone demo flows.",
    ruleSet: {
      reviewInstructions: ["Summarize the implementation result before handoff."],
      testInstructions: ["Run the fixture demo tests before completing the task."]
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
          source: "demo"
        }
      }
    ],
    integrationBindings: [],
    metadata: {
      source: "ensure-demo-project"
    }
  };
}

export async function ensureFixtureProject() {
  const baseUrl = resolveBaseUrl();
  const tenantId = resolveDemoTenantId();
  const fixtureConfig = resolveFixtureProjectConfig();
  const headers = {
    Authorization: `Bearer ${process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token"}`,
    "Content-Type": "application/json",
    "X-Keystone-Tenant-Id": tenantId
  };

  const listResponse = await fetch(
    `${baseUrl}/v1/projects?projectKey=${encodeURIComponent(fixtureConfig.projectKey)}`,
    {
      headers
    }
  );

  if (!listResponse.ok) {
    throw new Error(
      `Project lookup failed with ${listResponse.status}: ${await listResponse.text()}`
    );
  }

  const listed = await readJsonResponse(listResponse);
  const existingProjects = Array.isArray(listed.projects)
    ? listed.projects
    : [];
  const existingProject = existingProjects[0] as Record<string, unknown> | undefined;

  if (existingProject?.projectId) {
    const updateResponse = await fetch(
      `${baseUrl}/v1/projects/${existingProject.projectId}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(fixtureConfig)
      }
    );

    if (!updateResponse.ok) {
      throw new Error(
        `Project update failed with ${updateResponse.status}: ${await updateResponse.text()}`
      );
    }

    const updated = await readJsonResponse(updateResponse);

    return {
      action: "updated" as const,
      tenantId,
      baseUrl,
      project: updated.project
    };
  }

  const createResponse = await fetch(`${baseUrl}/v1/projects`, {
    method: "POST",
    headers,
    body: JSON.stringify(fixtureConfig)
  });

  if (!createResponse.ok) {
    throw new Error(
      `Project creation failed with ${createResponse.status}: ${await createResponse.text()}`
    );
  }

  const created = await readJsonResponse(createResponse);

  return {
    action: "created" as const,
    tenantId,
    baseUrl,
    project: created.project
  };
}

export async function main() {
  const ensured = await ensureFixtureProject();

  console.log(JSON.stringify(ensured, null, 2));
}

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  await main();
}
