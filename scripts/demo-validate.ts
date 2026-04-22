import { readDemoState, type PersistedDemoState } from "./demo-state";
import {
  describeDemoContract,
  summarizeTasks,
  type DemoContract
} from "./demo-run";

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

type ExecutionEngine = "scripted" | "think_mock" | "think_live";

type RunSummary = {
  data?: {
    status?: string;
    executionEngine?: unknown;
    compiledFrom?: unknown;
  };
};

type DemoValidationContract = {
  executionEngine: ExecutionEngine;
  demoContract: DemoContract;
};

type DemoDagProof = {
  totalTasks: number;
  rootTasks: number;
  dependentTasks: number;
  edges: number;
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

function asObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function requireDataObject(value: Record<string, unknown>, label: string) {
  const detail = asObject(value.data);

  if (!detail) {
    throw new Error(`${label} did not return the canonical data envelope.`);
  }

  return detail;
}

export function resolveBaseUrl(persistedState?: PersistedDemoState) {
  return (
    getArg("base-url") ??
    process.env.KEYSTONE_BASE_URL ??
    persistedState?.baseUrl ??
    "http://127.0.0.1:8787"
  );
}

export function resolveExecutionEngine() {
  return getArg("execution-engine") ?? process.env.KEYSTONE_EXECUTION_ENGINE ?? "think_live";
}

function resolveActualExecutionEngine(summary: RunSummary): ExecutionEngine {
  const detail = requireDataObject(summary as Record<string, unknown>, "Run detail");
  const executionEngine = detail.executionEngine;

  if (
    executionEngine === "scripted" ||
    executionEngine === "think_mock" ||
    executionEngine === "think_live"
  ) {
    return executionEngine;
  }

  throw new Error("Run detail did not return a valid executionEngine.");
}

export function resolveValidatedRunContract(
  summary: RunSummary,
  _requestedExecutionEngine: string
): DemoValidationContract {
  const executionEngine = resolveActualExecutionEngine(summary);

  return {
    executionEngine,
    demoContract: describeDemoContract(executionEngine)
  };
}

async function fetchRunDetail(baseUrl: string, runId: string) {
  const response = await fetch(`${baseUrl}/v1/runs/${encodeURIComponent(runId)}`, {
    headers: {
      Authorization: `Bearer ${process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token"}`,
      "X-Keystone-Tenant-Id": process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local"
    }
  });

  if (!response.ok) {
    throw new Error(`Run detail fetch failed with ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as RunSummary;
}

async function fetchRunTasks(baseUrl: string, runId: string) {
  const response = await fetch(`${baseUrl}/v1/runs/${encodeURIComponent(runId)}/tasks`, {
    headers: {
      Authorization: `Bearer ${process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token"}`,
      "X-Keystone-Tenant-Id": process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local"
    }
  });

  if (!response.ok) {
    throw new Error(`Run tasks fetch failed with ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

async function fetchRunWorkflowGraph(baseUrl: string, runId: string) {
  const response = await fetch(`${baseUrl}/v1/runs/${encodeURIComponent(runId)}/workflow`, {
    headers: {
      Authorization: `Bearer ${process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token"}`,
      "X-Keystone-Tenant-Id": process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Run workflow graph fetch failed with ${response.status}: ${await response.text()}`
    );
  }

  return response.json() as Promise<Record<string, unknown>>;
}

function summarizeDagProof(workflowGraph: Record<string, unknown>): DemoDagProof {
  const detail = requireDataObject(workflowGraph, "Run workflow graph");
  const nodes = asArray(detail.nodes).map((node) => asObject(node) ?? {});
  const edges = asArray(detail.edges);
  const rootTasks = nodes.filter((node) => asArray(node.dependsOn).length === 0).length;
  const dependentTasks = nodes.length - rootTasks;

  return {
    totalTasks: nodes.length,
    rootTasks,
    dependentTasks,
    edges: edges.length
  };
}

function requireNonTrivialDagProof(executionEngine: ExecutionEngine, dagProof: DemoDagProof) {
  if (executionEngine === "think_mock") {
    return;
  }

  if (dagProof.totalTasks < 3) {
    throw new Error(
      `Expected ${executionEngine} demo proof to expose at least three compiled tasks.`
    );
  }

  if (dagProof.rootTasks < 2) {
    throw new Error(
      `Expected ${executionEngine} demo proof to expose at least two root tasks.`
    );
  }

  if (dagProof.edges < 1 || dagProof.dependentTasks < 1) {
    throw new Error(
      `Expected ${executionEngine} demo proof to expose at least one dependency edge.`
    );
  }
}

export async function main() {
  const explicitRunId = resolveExplicitRunId();
  const explicitBaseUrl = resolveExplicitBaseUrl();
  const persistedState = await readDemoState();
  const runId = explicitRunId ?? persistedState?.runId;
  const baseUrl = explicitBaseUrl ?? resolveBaseUrl(persistedState);
  const requestedExecutionEngine = resolveExecutionEngine();

  if (!runId) {
    throw new Error("Provide --run-id=<id>, set KEYSTONE_RUN_ID, or run demo:run first.");
  }

  const summary = await fetchRunDetail(baseUrl, runId);
  const detail = requireDataObject(summary as Record<string, unknown>, "Run detail");
  const tasks = await fetchRunTasks(baseUrl, runId);
  const workflowGraph = await fetchRunWorkflowGraph(baseUrl, runId);
  const tasksData = requireDataObject(tasks, "Run task list");
  const taskItems = asArray(tasksData.items).map((task) => asObject(task) ?? {});
  const { executionEngine, demoContract } = resolveValidatedRunContract(
    summary,
    requestedExecutionEngine
  );
  const status = typeof detail.status === "string" ? detail.status : "unknown";
  const compiledFrom = asObject(detail.compiledFrom);
  const taskSummary = summarizeTasks(taskItems);
  const dagProof = summarizeDagProof(workflowGraph);

  if (status !== "archived") {
    throw new Error(`Expected archived run, received ${status}.`);
  }

  if (!compiledFrom) {
    throw new Error("Expected the run to record compile provenance.");
  }

  if (taskSummary.total < 1) {
    throw new Error("Expected at least one compiled run task.");
  }

  requireNonTrivialDagProof(executionEngine, dagProof);

  if (executionEngine !== "scripted") {
    const taskWithConversation = taskItems.find((task) => {
      const conversation = asObject(task.conversation);
      return (
        typeof conversation?.agentClass === "string" &&
        typeof conversation?.agentName === "string"
      );
    });

    if (!taskWithConversation) {
      throw new Error("Expected Think execution to expose at least one task conversation locator.");
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        runId,
        executionEngine,
        status,
        compiledFrom,
        tasks: taskSummary,
        workflow: dagProof,
        demoContract
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
