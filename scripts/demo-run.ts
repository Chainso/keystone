const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_ATTEMPTS = 30;

function getArg(name: string) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJsonResponse(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

function resolveBaseUrl() {
  return getArg("base-url") ?? process.env.KEYSTONE_BASE_URL ?? "http://127.0.0.1:8787";
}

function resolveRuntime() {
  return getArg("runtime") ?? process.env.KEYSTONE_AGENT_RUNTIME ?? "scripted";
}

function isRunComplete(summary: Record<string, unknown>) {
  const status = String(summary.status ?? "unknown");
  const artifacts = summary.artifacts as
    | {
        byKind?: Record<string, number>;
      }
    | undefined;

  if (status === "failed" || status === "cancelled") {
    return true;
  }

  return status === "archived" && (artifacts?.byKind?.run_summary ?? 0) >= 1;
}

async function createFixtureRun() {
  const baseUrl = resolveBaseUrl();
  const runtime = resolveRuntime();
  const response = await fetch(`${baseUrl}/v1/runs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token"}`,
      "Content-Type": "application/json",
      "X-Keystone-Agent-Runtime": runtime,
      "X-Keystone-Tenant-Id": process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local"
    },
    body: JSON.stringify({
      repo: {
        localPath: "./fixtures/demo-target"
      },
      decisionPackage: {
        localPath: "./fixtures/demo-decision-package/decision-package.json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Demo run creation failed with ${response.status}: ${await response.text()}`);
  }

  return readJsonResponse(response);
}

async function fetchRunSummary(runId: string) {
  const baseUrl = resolveBaseUrl();
  const response = await fetch(
    `${baseUrl}/v1/runs/${runId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token"}`,
        "X-Keystone-Tenant-Id": process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Run summary fetch failed with ${response.status}: ${await response.text()}`);
  }

  return readJsonResponse(response);
}

async function main() {
  const createdRun = await createFixtureRun();
  const runId = String(createdRun.runId ?? "");
  const baseUrl = resolveBaseUrl();
  const runtime = resolveRuntime();

  if (!runId) {
    throw new Error("Run creation response did not include runId.");
  }

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const summary = await fetchRunSummary(runId);
    const status = String(summary.status ?? "unknown");

    if (isRunComplete(summary)) {
      console.log(
        JSON.stringify(
          {
            baseUrl,
            runId,
            runtime,
            status,
            summary
          },
          null,
          2
        )
      );
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Demo run ${runId} did not finish within ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS}ms.`);
}

await main();
