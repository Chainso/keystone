import { writeDemoState } from "./demo-state";
import { ensureFixtureProject } from "./ensure-demo-project";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const POLL_INTERVAL_MS = 2_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 30;
const THINK_LIVE_MAX_POLL_ATTEMPTS = 90;

const runDocumentSeeds = [
  {
    kind: "specification",
    path: "specification",
    title: "Run Specification",
    fileName: "specification.md"
  },
  {
    kind: "architecture",
    path: "architecture",
    title: "Run Architecture",
    fileName: "architecture.md"
  },
  {
    kind: "execution_plan",
    path: "execution-plan",
    title: "Execution Plan",
    fileName: "execution-plan.md"
  }
] as const;

type ExecutionEngine = "scripted" | "think_mock" | "think_live";

export type DemoContract = {
  contractId: string;
  proofScope: string;
  modelExecution: string;
  workflowStatus: string;
};

export type DemoTaskSummary = {
  total: number;
  completed: number;
  active: number;
  pending: number;
  ready: number;
  failed: number;
  cancelled: number;
};

function getArg(name: string) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : undefined;
}

function sleep(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
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

async function readJsonResponse(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

export function resolveBaseUrl() {
  return getArg("base-url") ?? process.env.KEYSTONE_BASE_URL ?? "http://127.0.0.1:8787";
}

export function resolveExecutionEngine(): ExecutionEngine {
  const value = getArg("execution-engine") ?? process.env.KEYSTONE_EXECUTION_ENGINE ?? "think_live";

  if (value === "scripted" || value === "think_mock" || value === "think_live") {
    return value;
  }

  throw new Error(
    `Unsupported execution engine ${value}. Use one of: scripted, think_mock, think_live.`
  );
}

export function resolveMaxPollAttempts(executionEngine: ExecutionEngine) {
  return executionEngine === "think_live" ? THINK_LIVE_MAX_POLL_ATTEMPTS : DEFAULT_MAX_POLL_ATTEMPTS;
}

export function describeDemoContract(executionEngine: ExecutionEngine): DemoContract {
  if (executionEngine === "think_live") {
    return {
      contractId: "think-live-document-run",
      proofScope: "Project-backed run with document-driven compile and live Think DAG execution",
      modelExecution: "Live local chat-completions backend",
      workflowStatus:
        "Proves the document-driven run contract through archived completion with multiple tasks, dependency edges, and independent roots."
    };
  }

  if (executionEngine === "think_mock") {
    return {
      contractId: "think-mock-document-run",
      proofScope: "Project-backed run with document-driven compile and mock Think execution",
      modelExecution: "Deterministic mock Think model",
      workflowStatus:
        "Stable validation path for the current document-driven compile and Think task workflow."
    };
  }

  return {
    contractId: "scripted-document-run",
    proofScope: "Project-backed run with document-driven compile and scripted task execution",
    modelExecution: "Scripted task runner",
    workflowStatus: "Explicit scripted document-driven demo path."
  };
}

export function summarizeTasks(tasks: Array<Record<string, unknown>>): DemoTaskSummary {
  const counts: DemoTaskSummary = {
    total: tasks.length,
    completed: 0,
    active: 0,
    pending: 0,
    ready: 0,
    failed: 0,
    cancelled: 0
  };

  for (const task of tasks) {
    const status = typeof task.status === "string" ? task.status : "unknown";

    if (status in counts && status !== "total") {
      counts[status as keyof Omit<DemoTaskSummary, "total">] += 1;
    }
  }

  return counts;
}

async function loadFixturePlanningDocuments() {
  const fixtureRoot = resolve(
    fileURLToPath(new URL(".", import.meta.url)),
    "../fixtures/demo-run-documents"
  );

  return Promise.all(
    runDocumentSeeds.map(async (document) => ({
      ...document,
      body: await readFile(resolve(fixtureRoot, document.fileName), "utf8")
    }))
  );
}

function buildHeaders() {
  return {
    Authorization: `Bearer ${process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token"}`,
    "Content-Type": "application/json",
    "X-Keystone-Tenant-Id": process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local"
  };
}

async function createFixtureRun(executionEngine: ExecutionEngine) {
  const baseUrl = resolveBaseUrl();
  const ensuredProject = await ensureFixtureProject();
  const project = asObject(ensuredProject.project);
  const projectId = typeof project?.projectId === "string" ? project.projectId : null;

  if (!projectId) {
    throw new Error("Fixture project bootstrap did not return a projectId.");
  }

  const response = await fetch(
    `${baseUrl}/v1/projects/${encodeURIComponent(projectId)}/runs`,
    {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        executionEngine
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Demo run creation failed with ${response.status}: ${await response.text()}`);
  }

  const created = await readJsonResponse(response);
  const detail = requireDataObject(created, "Run creation");
  const runId = typeof detail.runId === "string" ? detail.runId : null;

  if (!runId) {
    throw new Error("Run creation did not return a runId.");
  }

  return {
    baseUrl,
    projectId,
    runId
  };
}

async function seedRunDocuments(baseUrl: string, runId: string) {
  const documents = await loadFixturePlanningDocuments();

  for (const document of documents) {
    const createResponse = await fetch(`${baseUrl}/v1/runs/${encodeURIComponent(runId)}/documents`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        kind: document.kind,
        path: document.path
      })
    });

    if (!createResponse.ok) {
      throw new Error(
        `Run document creation failed with ${createResponse.status}: ${await createResponse.text()}`
      );
    }

    const created = await readJsonResponse(createResponse);
    const createdDocument = requireDataObject(created, `Run ${document.kind} document creation`);
    const documentId = typeof createdDocument.documentId === "string" ? createdDocument.documentId : null;

    if (!documentId) {
      throw new Error(`Run document creation for ${document.kind} returned no documentId.`);
    }

    const revisionResponse = await fetch(
      `${baseUrl}/v1/runs/${encodeURIComponent(runId)}/documents/${encodeURIComponent(documentId)}/revisions`,
      {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({
          title: document.title,
          body: document.body,
          contentType: "text/markdown; charset=utf-8"
        })
      }
    );

    if (!revisionResponse.ok) {
      throw new Error(
        `Run document revision creation failed with ${revisionResponse.status}: ${await revisionResponse.text()}`
      );
    }
  }
}

async function compileRun(baseUrl: string, runId: string) {
  const response = await fetch(`${baseUrl}/v1/runs/${encodeURIComponent(runId)}/compile`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({})
  });

  if (!response.ok) {
    throw new Error(`Run compile failed with ${response.status}: ${await response.text()}`);
  }

  const payload = await readJsonResponse(response);
  requireDataObject(payload, "Run compile");
  return payload;
}

async function fetchRunDetail(baseUrl: string, runId: string) {
  const response = await fetch(`${baseUrl}/v1/runs/${encodeURIComponent(runId)}`, {
    headers: buildHeaders()
  });

  if (!response.ok) {
    throw new Error(`Run detail fetch failed with ${response.status}: ${await response.text()}`);
  }

  return readJsonResponse(response);
}

async function fetchRunTasks(baseUrl: string, runId: string) {
  const response = await fetch(`${baseUrl}/v1/runs/${encodeURIComponent(runId)}/tasks`, {
    headers: buildHeaders()
  });

  if (!response.ok) {
    throw new Error(`Run tasks fetch failed with ${response.status}: ${await response.text()}`);
  }

  return readJsonResponse(response);
}

function isTerminalStatus(status: string) {
  return status === "archived" || status === "failed" || status === "cancelled";
}

async function waitForTerminalRun(baseUrl: string, runId: string, executionEngine: ExecutionEngine) {
  const maxPollAttempts = resolveMaxPollAttempts(executionEngine);

  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    const runDetail = await fetchRunDetail(baseUrl, runId);
    const run = requireDataObject(runDetail, "Run detail");
    const status = typeof run.status === "string" ? run.status : "unknown";

    if (isTerminalStatus(status)) {
      return runDetail;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Run ${runId} did not reach a terminal state after polling.`);
}

async function main() {
  const executionEngine = resolveExecutionEngine();
  const demoContract = describeDemoContract(executionEngine);
  const createdRun = await createFixtureRun(executionEngine);

  await seedRunDocuments(createdRun.baseUrl, createdRun.runId);
  await compileRun(createdRun.baseUrl, createdRun.runId);

  const runDetailResponse = await waitForTerminalRun(
    createdRun.baseUrl,
    createdRun.runId,
    executionEngine
  );
  const tasksResponse = await fetchRunTasks(createdRun.baseUrl, createdRun.runId);
  const run = requireDataObject(runDetailResponse, "Run detail");
  const tasksData = requireDataObject(tasksResponse, "Run task list");
  const taskItems = asArray(tasksData.items).map((task) =>
    asObject(task) ?? {}
  );
  const status = typeof run.status === "string" ? run.status : "unknown";
  const taskSummary = summarizeTasks(taskItems);

  if (status !== "archived") {
    throw new Error(`Expected archived run, received ${status}.`);
  }

  await writeDemoState({
    baseUrl: createdRun.baseUrl,
    runId: createdRun.runId,
    executionEngine,
    savedAt: new Date().toISOString()
  });

  console.log(
    JSON.stringify(
      {
        baseUrl: createdRun.baseUrl,
        projectId: createdRun.projectId,
        runId: createdRun.runId,
        executionEngine,
        status,
        compiledFrom: run.compiledFrom ?? null,
        tasks: taskSummary,
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
