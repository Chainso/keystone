function getArg(name: string) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : undefined;
}

function resolveBaseUrl() {
  return getArg("base-url") ?? process.env.KEYSTONE_BASE_URL ?? "http://127.0.0.1:8787";
}

async function main() {
  const runId = getArg("run-id") ?? process.env.KEYSTONE_RUN_ID;
  const baseUrl = resolveBaseUrl();

  if (!runId) {
    throw new Error("Provide --run-id=<id> or set KEYSTONE_RUN_ID.");
  }

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

  const summary = (await response.json()) as {
    status?: string;
    artifacts?: {
      total?: number;
      byKind?: Record<string, number>;
    };
    sessions?: {
      total?: number;
    };
  };

  if (summary.status !== "archived") {
    throw new Error(`Expected archived run, received ${summary.status ?? "unknown"}.`);
  }

  if ((summary.sessions?.total ?? 0) < 3) {
    throw new Error(`Expected at least 3 sessions, received ${summary.sessions?.total ?? 0}.`);
  }

  if ((summary.artifacts?.total ?? 0) < 5) {
    throw new Error(`Expected at least 5 artifacts, received ${summary.artifacts?.total ?? 0}.`);
  }

  if ((summary.artifacts?.byKind?.run_summary ?? 0) < 1) {
    throw new Error("Expected a run_summary artifact.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        runId,
        status: summary.status,
        sessions: summary.sessions?.total ?? 0,
        artifacts: summary.artifacts ?? {}
      },
      null,
      2
    )
  );
}

await main();
