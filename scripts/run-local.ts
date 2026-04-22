import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function getArg(name: string) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : undefined;
}

function resolveBaseUrl() {
  return getArg("base-url") ?? process.env.KEYSTONE_BASE_URL ?? "http://127.0.0.1:8787";
}

function resolveExecutionEngine() {
  return getArg("execution-engine") ?? process.env.KEYSTONE_EXECUTION_ENGINE ?? "think_live";
}

async function readJsonResponse(response: Response) {
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

async function main() {
  const baseUrl = resolveBaseUrl();
  const token = process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token";
  const tenantId = process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local";
  const projectId = getArg("project-id") ?? "project-fixture";
  const executionEngine = resolveExecutionEngine();

  const response = await fetch(`${baseUrl}/v1/projects/${encodeURIComponent(projectId)}/runs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Keystone-Tenant-Id": tenantId
    },
    body: JSON.stringify({
      executionEngine
    })
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Run creation failed with ${response.status}: ${body}`);
  }

  const parsed = JSON.parse(body) as Record<string, unknown>;
  const detail = requireDataObject(parsed, "Run creation");
  const runId = typeof detail.runId === "string" ? detail.runId : null;
  const status = typeof detail.status === "string" ? detail.status : null;

  if (!runId) {
    throw new Error("Run creation did not return a runId.");
  }

  if (!status) {
    throw new Error("Run creation did not return a status.");
  }

  console.log(
    JSON.stringify(
      {
        baseUrl,
        tenantId,
        projectId,
        runId,
        executionEngine,
        status,
        nextSteps: {
          createDocuments: `/v1/runs/${runId}/documents`,
          compile: `/v1/runs/${runId}/compile`
        }
      },
      null,
      2
    )
  );
}

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  await main();
}
