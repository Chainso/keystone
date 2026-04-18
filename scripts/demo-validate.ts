import { readDemoState, type PersistedDemoState } from "./demo-state";

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type DemoContract = {
  contractId: string;
  proofScope: string;
  modelExecution: string;
  workflowStatus: string;
};

export type RunSummary = {
  data?: {
    status?: string;
    execution?: {
      runtime?: unknown;
      thinkMode?: unknown;
    };
    artifacts?: {
      total?: number;
      byKind?: Record<string, number>;
    };
    sessions?: {
      total?: number;
    };
  };
  status?: string;
  execution?: {
    runtime?: unknown;
    thinkMode?: unknown;
  };
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

export type DemoValidationContract = {
  runtime: string;
  thinkMode: string;
  demoContract: DemoContract;
};

function getArg(name: string) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : undefined;
}

function resolveExplicitRunId() {
  return getArg("run-id") ?? process.env.KEYSTONE_RUN_ID;
}

function resolveExplicitBaseUrl() {
  return getArg("base-url") ?? process.env.KEYSTONE_BASE_URL;
}

export function resolveBaseUrl(persistedState?: PersistedDemoState) {
  return (
    getArg("base-url") ??
    process.env.KEYSTONE_BASE_URL ??
    persistedState?.baseUrl ??
    "http://127.0.0.1:8787"
  );
}

export function resolveRuntime() {
  return getArg("runtime") ?? process.env.KEYSTONE_AGENT_RUNTIME ?? "scripted";
}

export function resolveThinkMode() {
  return getArg("think-mode") ?? process.env.KEYSTONE_THINK_DEMO_MODE ?? "mock";
}

export function describeDemoContract(runtime: string, thinkMode: string): DemoContract {
  if (runtime === "think" && thinkMode === "live") {
    return {
      contractId: "think-live-compile-demo",
      proofScope: "Fixture-scoped live compile plus compiled Think task execution",
      modelExecution: "Live local chat-completions backend",
      workflowStatus:
        "Proves the fixture-scoped happy path from live compile through compiled Think task execution, run_note promotion, and archived run summary."
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

export function resolveActualRuntime(summary: RunSummary, fallback: string) {
  const legacy = summary;

  return summary.data?.execution?.runtime === "think" || summary.data?.execution?.runtime === "scripted"
    ? summary.data.execution.runtime
    : legacy.inputs?.runtime === "think" || legacy.inputs?.runtime === "scripted"
      ? legacy.inputs.runtime
    : fallback;
}

export function resolveActualThinkMode(summary: RunSummary, fallback: string) {
  const actualThinkMode = summary.data?.execution?.thinkMode ?? summary.inputs?.options?.thinkMode;

  return actualThinkMode === "live" || actualThinkMode === "mock" ? actualThinkMode : fallback;
}

export function resolveValidatedRunContract(
  summary: RunSummary,
  requestedRuntime: string,
  requestedThinkMode: string
): DemoValidationContract {
  const runtime = resolveActualRuntime(summary, requestedRuntime);
  const thinkMode = resolveActualThinkMode(summary, requestedThinkMode);

  return {
    runtime,
    thinkMode,
    demoContract: describeDemoContract(runtime, thinkMode)
  };
}

export function summarizeRunDetail(summary: RunSummary) {
  const detail = summary.data ?? summary;

  return {
    sessions: {
      total: detail.sessions?.total ?? 0
    },
    artifacts: {
      total: detail.artifacts?.total ?? 0,
      byKind: detail.artifacts?.byKind ?? {}
    }
  };
}

export async function main() {
  const explicitRunId = resolveExplicitRunId();
  const explicitBaseUrl = resolveExplicitBaseUrl();
  const persistedState =
    explicitRunId !== undefined
      ? undefined
      : await readDemoState();
  const runId = explicitRunId ?? persistedState?.runId;
  const baseUrl =
    explicitBaseUrl ??
    (explicitRunId === undefined ? resolveBaseUrl(persistedState) : "http://127.0.0.1:8787");
  const requestedRuntime = resolveRuntime();
  const requestedThinkMode = resolveThinkMode();

  if (!runId) {
    throw new Error("Provide --run-id=<id>, set KEYSTONE_RUN_ID, or run demo:run first.");
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
  const detail = summary.data ?? summary;
  const derived = summarizeRunDetail(summary);
  const { runtime, thinkMode, demoContract } = resolveValidatedRunContract(
    summary,
    requestedRuntime,
    requestedThinkMode
  );

  if (detail.status !== "archived") {
    throw new Error(`Expected archived run, received ${detail.status ?? "unknown"}.`);
  }

  if ((derived.sessions.total ?? 0) < 3) {
    throw new Error(`Expected at least 3 sessions, received ${derived.sessions.total ?? 0}.`);
  }

  if ((derived.artifacts.total ?? 0) < 5) {
    throw new Error(`Expected at least 5 artifacts, received ${derived.artifacts.total ?? 0}.`);
  }

  if ((derived.artifacts.byKind.run_summary ?? 0) < 1) {
    throw new Error("Expected a run_summary artifact.");
  }

  if (runtime === "think" && (derived.artifacts.byKind.run_note ?? 0) < 1) {
    throw new Error("Expected at least one promoted run_note artifact for the Think runtime.");
  }

  if (runtime === "scripted" && (derived.artifacts.byKind.task_log ?? 0) < 1) {
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
        status: detail.status,
        sessions: derived.sessions.total,
        artifacts: derived.artifacts
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
