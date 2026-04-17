type DemoContract = {
  contractId: string;
  proofScope: string;
  modelExecution: string;
  workflowStatus: string;
};

type RunSummary = {
  status?: string;
  inputs?: {
    runtime?: unknown;
    options?: {
      thinkMode?: unknown;
    };
  };
  artifacts?: {
    total?: number;
    byKind?: Record<string, number>;
  };
  sessions?: {
    total?: number;
  };
};

function getArg(name: string) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : undefined;
}

function resolveBaseUrl() {
  return getArg("base-url") ?? process.env.KEYSTONE_BASE_URL ?? "http://127.0.0.1:8787";
}

function resolveRuntime() {
  return getArg("runtime") ?? process.env.KEYSTONE_AGENT_RUNTIME ?? "scripted";
}

function resolveThinkMode() {
  return getArg("think-mode") ?? process.env.KEYSTONE_THINK_DEMO_MODE ?? "mock";
}

function describeDemoContract(runtime: string, thinkMode: string): DemoContract {
  if (runtime === "think" && thinkMode === "live") {
    return {
      contractId: "think-live-fixture-demo",
      proofScope: "Fixture-backed Think task path",
      modelExecution: "Live local chat-completions backend",
      workflowStatus:
        "Phase 1 validation still checks the fixture-backed run contract. It does not yet prove live compile or compiled task handoffs."
    };
  }

  if (runtime === "think") {
    return {
      contractId: "think-mock-validation",
      proofScope: "Fixture-backed Think task path",
      modelExecution: "Deterministic mock Think model",
      workflowStatus:
        "Stable validation path for the current fixture-backed compile and task handoff behavior."
    };
  }

  return {
    contractId: "scripted-fixture-demo",
    proofScope: "Fixture-backed scripted path",
    modelExecution: "Scripted task runner",
    workflowStatus: "Default non-Think demo path."
  };
}

function resolveActualRuntime(summary: RunSummary, fallback: string) {
  return summary.inputs?.runtime === "think" || summary.inputs?.runtime === "scripted"
    ? summary.inputs.runtime
    : fallback;
}

function resolveActualThinkMode(summary: RunSummary, fallback: string) {
  const actualThinkMode = summary.inputs?.options?.thinkMode;

  return actualThinkMode === "live" || actualThinkMode === "mock" ? actualThinkMode : fallback;
}

async function main() {
  const runId = getArg("run-id") ?? process.env.KEYSTONE_RUN_ID;
  const baseUrl = resolveBaseUrl();
  const requestedRuntime = resolveRuntime();
  const requestedThinkMode = resolveThinkMode();

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

  const summary = (await response.json()) as RunSummary;
  const runtime = resolveActualRuntime(summary, requestedRuntime);
  const thinkMode = resolveActualThinkMode(summary, requestedThinkMode);
  const demoContract = describeDemoContract(runtime, thinkMode);

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

  if (runtime === "think" && (summary.artifacts?.byKind?.run_note ?? 0) < 1) {
    throw new Error("Expected at least one promoted run_note artifact for the Think runtime.");
  }

  if (runtime === "scripted" && (summary.artifacts?.byKind?.task_log ?? 0) < 1) {
    throw new Error("Expected at least one task_log artifact for the scripted runtime.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        runId,
        runtime,
        thinkMode,
        demoContract,
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
