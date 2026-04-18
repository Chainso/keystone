import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface RunLocalConfig {
  baseUrl: string;
  token: string;
  tenantId: string;
  projectId: string;
  decisionPackage:
    | {
        source: "inline";
        payload: Record<string, unknown>;
      }
    | {
        source: "artifact";
        artifactId: string;
      }
    | {
        source: "project_collection";
        decisionPackageId: string;
      };
  options?: {
    thinkMode?: "mock" | "live";
    preserveSandbox?: boolean;
  };
}

function getArg(name: string) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : undefined;
}

async function resolveDecisionPackage() {
  const artifactId = getArg("decision-package-artifact-id");

  if (artifactId) {
    return {
      source: "artifact" as const,
      artifactId
    };
  }

  const projectCollectionId = getArg("decision-package-id");

  if (projectCollectionId) {
    return {
      source: "project_collection" as const,
      decisionPackageId: projectCollectionId
    };
  }

  const payloadArg = getArg("decision-package-payload");

  if (payloadArg) {
    return {
      source: "inline" as const,
      payload: JSON.parse(payloadArg) as Record<string, unknown>
    };
  }

  const fixturePath = resolve(
    fileURLToPath(new URL(".", import.meta.url)),
    "../fixtures/demo-decision-package/decision-package.json"
  );

  return {
    source: "inline" as const,
    payload: JSON.parse(await readFile(fixturePath, "utf8")) as Record<string, unknown>
  };
}

async function resolveConfig(): Promise<RunLocalConfig> {
  const thinkModeArg = getArg("think-mode");
  const preserveSandboxArg = getArg("preserve-sandbox");

  return {
    baseUrl: getArg("base-url") ?? process.env.KEYSTONE_BASE_URL ?? "http://127.0.0.1:8787",
    token: process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token",
    tenantId: process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local",
    projectId: getArg("project-id") ?? "project-fixture",
    decisionPackage: await resolveDecisionPackage(),
    options: {
      thinkMode:
        thinkModeArg === "live" || thinkModeArg === "mock" ? thinkModeArg : undefined,
      preserveSandbox:
        preserveSandboxArg === undefined
          ? undefined
          : !["0", "false", "no"].includes(preserveSandboxArg.trim().toLowerCase())
    }
  };
}

async function main() {
  const config = await resolveConfig();
  const response = await fetch(`${config.baseUrl}/v1/runs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "X-Keystone-Tenant-Id": config.tenantId
    },
    body: JSON.stringify({
      projectId: config.projectId,
      decisionPackage: config.decisionPackage,
      options: config.options
    })
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Run creation failed with ${response.status}: ${body}`);
  }

  console.log(body);
}

await main();
