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

function asObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function requireDataObject(value: Record<string, unknown>, label: string) {
  const detail = asObject(value.data);

  if (!detail) {
    throw new Error(`${label} did not return the canonical data envelope.`);
  }

  return detail;
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
          ref: "main"
        }
      }
    ],
    envVars: [
      {
        name: "KEYSTONE_FIXTURE_PROJECT",
        value: "1"
      }
    ]
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
  const listedData = requireDataObject(listed, "Project list");
  const existingProjects = Array.isArray(listedData.items) ? listedData.items : [];
  const existingProject = existingProjects[0] as Record<string, unknown> | undefined;

  if (existingProject?.projectId) {
    const updateResponse = await fetch(
      `${baseUrl}/v1/projects/${existingProject.projectId}`,
      {
        method: "PATCH",
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
    const updatedProject = requireDataObject(updated, "Project update");

    return {
      action: "updated" as const,
      tenantId,
      baseUrl,
      project: updatedProject
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
  const createdProject = requireDataObject(created, "Project creation");

  return {
    action: "created" as const,
    tenantId,
    baseUrl,
    project: createdProject
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
