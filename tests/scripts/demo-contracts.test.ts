import { execFile } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import {
  resolveCreatedRunExecutionContract,
  resolveRuntime as resolveDemoRunRuntime,
  resolveThinkMode as resolveDemoRunThinkMode
} from "../../scripts/demo-run";
import {
  resolveBaseUrl as resolveEnsureDemoProjectBaseUrl,
  resolveDemoTenantId,
  resolveFixtureProjectConfig as resolveEnsureProjectFixtureConfig
} from "../../scripts/ensure-demo-project";
import {
  resolveRuntime as resolveDemoValidateRuntime,
  resolveThinkMode as resolveDemoValidateThinkMode,
  resolveValidatedRunContract
} from "../../scripts/demo-validate";

const execFileAsync = promisify(execFile);
const demoEnvKeys = [
  "KEYSTONE_BASE_URL",
  "KEYSTONE_AGENT_RUNTIME",
  "KEYSTONE_DEMO_TENANT_ID",
  "KEYSTONE_DEMO_STATE_PATH",
  "KEYSTONE_THINK_DEMO_MODE",
  "KEYSTONE_PRESERVE_SANDBOX",
  "KEYSTONE_RUN_ID",
  "KEYSTONE_STREAM_EVENTS"
] as const;
const originalArgv = [...process.argv];
const originalEnv = new Map(demoEnvKeys.map((key) => [key, process.env[key]]));

type StubRequest = {
  method: string;
  path: string;
  headers: IncomingMessage["headers"];
  body?: unknown;
};

type StubResponse = {
  status?: number;
  body: unknown;
};

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody) {
    return undefined;
  }

  return JSON.parse(rawBody) as unknown;
}

async function startStubServer(
  handler: (request: StubRequest) => Promise<StubResponse> | StubResponse
) {
  const requests: StubRequest[] = [];
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const stubRequest = {
        method: request.method ?? "GET",
        path: url.pathname,
        headers: request.headers,
        body: await readRequestBody(request)
      };

      requests.push(stubRequest);

      const stubResponse = await handler(stubRequest);

      response.writeHead(stubResponse.status ?? 200, {
        "Content-Type": "application/json"
      });
      response.end(JSON.stringify(stubResponse.body));
    } catch (error) {
      response.writeHead(500, {
        "Content-Type": "application/json"
      });
      response.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error)
        })
      );
    }
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected stub server to expose a TCP address.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    close: async () => {
      server.close();
      await once(server, "close");
    }
  };
}

async function runDemoScript(
  scriptName: "demo:ensure-project" | "demo:run" | "demo:validate",
  args: string[],
  envOverrides: Record<string, string | undefined> = {}
) {
  return execFileAsync("npm", ["run", "--silent", scriptName, "--", ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...envOverrides
    },
    maxBuffer: 1024 * 1024
  });
}

function parseCommandJson(stdout: string) {
  const trimmedOutput = stdout.trim();
  const jsonStart = trimmedOutput.startsWith("{")
    ? 0
    : trimmedOutput.lastIndexOf("\n{") + 1;

  if (jsonStart < 0 || !trimmedOutput.slice(jsonStart).startsWith("{")) {
    throw new Error(`Expected JSON output, received:\n${stdout}`);
  }

  return JSON.parse(trimmedOutput.slice(jsonStart)) as Record<string, unknown>;
}

function clearDemoEnv() {
  for (const key of demoEnvKeys) {
    delete process.env[key];
  }
}

afterEach(() => {
  process.argv = [...originalArgv];

  for (const [key, value] of originalEnv) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
});

describe("demo scripts", () => {
  it("executes the demo:ensure-project entrypoint and creates the fixture project when missing", async () => {
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/projects") {
        return {
          body: {
            tenantId: "tenant-dev-local",
            total: 0,
            projects: []
          }
        };
      }

      if (request.method === "POST" && request.path === "/v1/projects") {
        return {
          status: 201,
          body: {
            project: {
              projectId: "project-created",
              projectKey: "fixture-demo-project"
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      const { stdout } = await runDemoScript("demo:ensure-project", [
        `--base-url=${server.baseUrl}`
      ]);
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        action: "created",
        baseUrl: server.baseUrl,
        tenantId: "tenant-dev-local",
        project: {
          projectId: "project-created",
          projectKey: "fixture-demo-project"
        }
      });

      expect(server.requests).toHaveLength(2);
      expect(server.requests[0]).toMatchObject({
        method: "GET",
        path: "/v1/projects"
      });
      expect(server.requests[1]).toMatchObject({
        method: "POST",
        path: "/v1/projects",
        body: {
          projectKey: "fixture-demo-project",
          displayName: "Fixture Demo Project",
          components: [
            {
              componentKey: "demo-target",
              config: {
                localPath: "./fixtures/demo-target",
                defaultRef: "main"
              }
            }
          ]
        }
      });
    } finally {
      await server.close();
    }
  }, 15_000);

  it("executes the demo:ensure-project entrypoint and updates the fixture project when it already exists", async () => {
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/projects") {
        return {
          body: {
            tenantId: "tenant-dev-local",
            total: 1,
            projects: [
              {
                projectId: "project-existing",
                projectKey: "fixture-demo-project"
              }
            ]
          }
        };
      }

      if (request.method === "PUT" && request.path === "/v1/projects/project-existing") {
        return {
          body: {
            project: {
              projectId: "project-existing",
              projectKey: "fixture-demo-project",
              displayName: "Fixture Demo Project"
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      const { stdout } = await runDemoScript("demo:ensure-project", [
        `--base-url=${server.baseUrl}`
      ]);
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        action: "updated",
        baseUrl: server.baseUrl,
        tenantId: "tenant-dev-local",
        project: {
          projectId: "project-existing",
          projectKey: "fixture-demo-project"
        }
      });

      expect(server.requests).toHaveLength(2);
      expect(server.requests[1]).toMatchObject({
        method: "PUT",
        path: "/v1/projects/project-existing"
      });
    } finally {
      await server.close();
    }
  }, 15_000);

  it("executes the demo:run entrypoint with the default scripted contract", async () => {
    const server = await startStubServer((request) => {
      if (request.method === "POST" && request.path === "/v1/runs") {
        return {
          body: {
            runId: "run-scripted"
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-scripted") {
        return {
          body: {
            status: "archived",
            artifacts: {
              total: 5,
              byKind: {
                run_summary: 1,
                task_log: 1
              }
            },
            sessions: {
              total: 3
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      const { stdout } = await runDemoScript("demo:run", [`--base-url=${server.baseUrl}`]);
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        baseUrl: server.baseUrl,
        runId: "run-scripted",
        runtime: "scripted",
        thinkMode: "mock",
        preserveSandbox: false,
        status: "archived",
        demoContract: {
          contractId: "scripted-fixture-demo",
          workflowStatus: "Default non-Think demo path."
        },
        summary: {
          artifacts: {
            byKind: {
              run_summary: 1,
              task_log: 1
            }
          }
        }
      });

      expect(server.requests).toHaveLength(2);
      expect(server.requests[0]).toMatchObject({
        method: "POST",
        path: "/v1/runs",
        body: {
          repo: {
            localPath: "./fixtures/demo-target"
          },
          decisionPackage: {
            localPath: "./fixtures/demo-decision-package/decision-package.json"
          },
          options: {
            thinkMode: "mock",
            preserveSandbox: false
          }
        }
      });
      expect(server.requests[0]?.headers["x-keystone-agent-runtime"]).toBe("scripted");
      expect(server.requests[1]).toMatchObject({
        method: "GET",
        path: "/v1/runs/run-scripted"
      });
    } finally {
      await server.close();
    }
  }, 15_000);

  it("executes the demo:run entrypoint for deterministic Think mock requests", async () => {
    const server = await startStubServer((request) => {
      if (request.method === "POST" && request.path === "/v1/runs") {
        return {
          body: {
            runId: "run-think-mock",
            runtime: "think",
            options: {
              thinkMode: "mock",
              preserveSandbox: false
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-think-mock") {
        return {
          body: {
            status: "archived",
            artifacts: {
              total: 5,
              byKind: {
                run_summary: 1,
                run_note: 1
              }
            },
            sessions: {
              total: 3
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      const { stdout } = await runDemoScript("demo:run", [
        `--base-url=${server.baseUrl}`,
        "--runtime=think",
        "--think-mode=mock"
      ]);
      const payload = parseCommandJson(stdout);

      expect(stdout).not.toContain("[demo] streaming persisted run events");
      expect(payload).toMatchObject({
        baseUrl: server.baseUrl,
        runId: "run-think-mock",
        runtime: "think",
        thinkMode: "mock",
        preserveSandbox: false,
        status: "archived",
        demoContract: {
          contractId: "think-mock-validation",
          proofScope: "Fixture-backed Think task path",
          modelExecution: "Deterministic mock Think model",
          workflowStatus:
            "Stable validation path for the current fixture-backed compile and task handoff behavior."
        },
        summary: {
          artifacts: {
            byKind: {
              run_summary: 1,
              run_note: 1
            }
          }
        }
      });

      expect(server.requests.map((request) => `${request.method} ${request.path}`)).toEqual([
        "POST /v1/runs",
        "GET /v1/runs/run-think-mock"
      ]);
      expect(server.requests[0]).toMatchObject({
        body: {
          options: {
            thinkMode: "mock",
            preserveSandbox: false
          }
        }
      });
      expect(server.requests[0]?.headers["x-keystone-agent-runtime"]).toBe("think");
    } finally {
      await server.close();
    }
  }, 15_000);

  it("executes the demo:run entrypoint for live Think requests, including event polling", async () => {
    const server = await startStubServer((request) => {
      if (request.method === "POST" && request.path === "/v1/runs") {
        return {
          body: {
            runId: "run-live",
            runtime: "think",
            options: {
              thinkMode: "live",
              preserveSandbox: true
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-live/events") {
        return {
          body: {
            events: [
              {
                eventId: "evt-1",
                timestamp: "2026-04-17T00:00:00.000Z",
                eventType: "task.updated",
                actor: "workflow",
                severity: "info",
                taskId: "task-1",
                payload: {
                  status: "running"
                }
              }
            ]
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-live") {
        return {
          body: {
            status: "archived",
            artifacts: {
              total: 6,
              byKind: {
                run_summary: 1,
                run_note: 1
              }
            },
            sessions: {
              total: 3
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      const { stdout } = await runDemoScript(
        "demo:run",
        [`--base-url=${server.baseUrl}`],
        {
          KEYSTONE_AGENT_RUNTIME: "think",
          KEYSTONE_THINK_DEMO_MODE: "live",
          KEYSTONE_PRESERVE_SANDBOX: "1"
        }
      );
      const payload = parseCommandJson(stdout);

      expect(stdout).toContain("[demo] streaming persisted run events for run-live");
      expect(stdout).toContain(
        '[event 2026-04-17T00:00:00.000Z] info task.updated actor=workflow task=task-1 status="running"'
      );
      expect(payload).toMatchObject({
        baseUrl: server.baseUrl,
        runId: "run-live",
        runtime: "think",
        thinkMode: "live",
        preserveSandbox: true,
        status: "archived",
        sandboxShellHint:
          "Sandbox preserved for inspection. Run `npm run sandbox:shell` while the local Worker is still running.",
        demoContract: {
          contractId: "think-live-compile-demo",
          proofScope: "Fixture-scoped live compile plus compiled Think task execution",
          modelExecution: "Live local chat-completions backend",
          workflowStatus:
            "Proves the fixture-scoped happy path from live compile through compiled Think task execution, run_note promotion, and archived run summary."
        }
      });

      expect(server.requests.map((request) => `${request.method} ${request.path}`)).toEqual([
        "POST /v1/runs",
        "GET /v1/runs/run-live/events",
        "GET /v1/runs/run-live"
      ]);
      expect(server.requests[0]).toMatchObject({
        body: {
          repo: {
            localPath: "./fixtures/demo-target"
          },
          decisionPackage: {
            localPath: "./fixtures/demo-decision-package/decision-package.json"
          },
          options: {
            thinkMode: "live",
            preserveSandbox: true
          }
        }
      });
      expect(server.requests[0]?.headers["x-keystone-agent-runtime"]).toBe("think");
    } finally {
      await server.close();
    }
  }, 15_000);

  it("lets demo:validate reuse the persisted live demo state from demo:run", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "keystone-demo-state-"));
    const statePath = join(tempDir, "demo-last-run.json");
    const server = await startStubServer((request) => {
      if (request.method === "POST" && request.path === "/v1/runs") {
        return {
          body: {
            runId: "run-live-state",
            runtime: "think",
            options: {
              thinkMode: "live",
              preserveSandbox: true
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-live-state/events") {
        return {
          body: {
            events: []
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-live-state") {
        return {
          body: {
            status: "archived",
            inputs: {
              runtime: "think",
              options: {
                thinkMode: "live"
              }
            },
            sessions: {
              total: 3
            },
            artifacts: {
              total: 5,
              byKind: {
                run_summary: 1,
                run_note: 1
              }
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      await runDemoScript(
        "demo:run",
        [`--base-url=${server.baseUrl}`],
        {
          KEYSTONE_AGENT_RUNTIME: "think",
          KEYSTONE_THINK_DEMO_MODE: "live",
          KEYSTONE_PRESERVE_SANDBOX: "1",
          KEYSTONE_DEMO_STATE_PATH: statePath
        }
      );

      const savedState = JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown>;

      expect(savedState).toMatchObject({
        baseUrl: server.baseUrl,
        runId: "run-live-state",
        runtime: "think",
        thinkMode: "live"
      });

      const { stdout } = await runDemoScript(
        "demo:validate",
        [],
        {
          KEYSTONE_AGENT_RUNTIME: "think",
          KEYSTONE_THINK_DEMO_MODE: "live",
          KEYSTONE_DEMO_STATE_PATH: statePath
        }
      );
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        ok: true,
        baseUrl: server.baseUrl,
        runId: "run-live-state",
        runtime: "think",
        thinkMode: "live",
        demoContract: {
          contractId: "think-live-compile-demo",
          workflowStatus:
            "Proves the fixture-scoped happy path from live compile through compiled Think task execution, run_note promotion, and archived run summary."
        }
      });

      expect(server.requests.map((request) => `${request.method} ${request.path}`)).toEqual([
        "POST /v1/runs",
        "GET /v1/runs/run-live-state/events",
        "GET /v1/runs/run-live-state",
        "GET /v1/runs/run-live-state"
      ]);
    } finally {
      await server.close();
      await rm(tempDir, {
        force: true,
        recursive: true
      });
    }
  }, 15_000);

  it("does not replace the last successful demo state when a later run fails", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "keystone-demo-state-failed-"));
    const statePath = join(tempDir, "demo-last-run.json");
    const previousState = {
      baseUrl: "http://127.0.0.1:12345",
      runId: "run-previous-success",
      runtime: "think",
      thinkMode: "live",
      savedAt: "2026-04-17T00:00:00.000Z"
    };
    const server = await startStubServer((request) => {
      if (request.method === "POST" && request.path === "/v1/runs") {
        return {
          body: {
            runId: "run-failed",
            runtime: "think",
            options: {
              thinkMode: "live",
              preserveSandbox: true
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-failed/events") {
        return {
          body: {
            events: []
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-failed") {
        return {
          body: {
            status: "failed",
            artifacts: {
              total: 0,
              byKind: {}
            },
            sessions: {
              total: 1
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      await writeFile(statePath, `${JSON.stringify(previousState, null, 2)}\n`, "utf8");

      const { stdout } = await runDemoScript(
        "demo:run",
        [`--base-url=${server.baseUrl}`],
        {
          KEYSTONE_AGENT_RUNTIME: "think",
          KEYSTONE_THINK_DEMO_MODE: "live",
          KEYSTONE_PRESERVE_SANDBOX: "1",
          KEYSTONE_DEMO_STATE_PATH: statePath
        }
      );
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        runId: "run-failed",
        status: "failed"
      });

      const savedState = JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown>;

      expect(savedState).toEqual(previousState);
    } finally {
      await server.close();
      await rm(tempDir, {
        force: true,
        recursive: true
      });
    }
  }, 15_000);

  it("executes the demo:validate entrypoint for deterministic Think mock requests", async () => {
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/runs/run-validate-mock") {
        return {
          body: {
            status: "archived",
            sessions: {
              total: 3
            },
            artifacts: {
              total: 5,
              byKind: {
                run_summary: 1,
                run_note: 1
              }
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      const { stdout } = await runDemoScript("demo:validate", [
        `--base-url=${server.baseUrl}`,
        "--run-id=run-validate-mock",
        "--runtime=think",
        "--think-mode=mock"
      ]);
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        ok: true,
        baseUrl: server.baseUrl,
        runId: "run-validate-mock",
        runtime: "think",
        thinkMode: "mock",
        status: "archived",
        sessions: 3,
        artifacts: {
          total: 5,
          byKind: {
            run_summary: 1,
            run_note: 1
          }
        },
        demoContract: {
          contractId: "think-mock-validation",
          workflowStatus:
            "Stable validation path for the current fixture-backed compile and task handoff behavior."
        }
      });

      expect(server.requests).toHaveLength(1);
      expect(server.requests[0]).toMatchObject({
        method: "GET",
        path: "/v1/runs/run-validate-mock"
      });
    } finally {
      await server.close();
    }
  }, 15_000);

  it("lets explicit validate inputs bypass a malformed persisted state file", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "keystone-demo-state-explicit-"));
    const statePath = join(tempDir, "demo-last-run.json");
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/runs/run-explicit") {
        return {
          body: {
            status: "archived",
            inputs: {
              runtime: "think",
              options: {
                thinkMode: "live"
              }
            },
            sessions: {
              total: 3
            },
            artifacts: {
              total: 5,
              byKind: {
                run_summary: 1,
                run_note: 1
              }
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      await writeFile(statePath, "{not-valid-json", "utf8");

      const { stdout } = await runDemoScript(
        "demo:validate",
        [
          `--base-url=${server.baseUrl}`,
          "--run-id=run-explicit"
        ],
        {
          KEYSTONE_DEMO_STATE_PATH: statePath
        }
      );
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        ok: true,
        baseUrl: server.baseUrl,
        runId: "run-explicit",
        runtime: "think",
        thinkMode: "live"
      });
    } finally {
      await server.close();
      await rm(tempDir, {
        force: true,
        recursive: true
      });
    }
  }, 15_000);

  it("executes the demo:validate entrypoint and prefers persisted runtime metadata", async () => {
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/runs/run-validate") {
        return {
          body: {
            status: "archived",
            inputs: {
              runtime: "think",
              options: {
                thinkMode: "live"
              }
            },
            sessions: {
              total: 3
            },
            artifacts: {
              total: 5,
              byKind: {
                run_summary: 1,
                run_note: 1
              }
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      const { stdout } = await runDemoScript("demo:validate", [
        `--base-url=${server.baseUrl}`,
        "--run-id=run-validate"
      ]);
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        ok: true,
        baseUrl: server.baseUrl,
        runId: "run-validate",
        runtime: "think",
        thinkMode: "live",
        status: "archived",
        sessions: 3,
        artifacts: {
          total: 5,
          byKind: {
            run_summary: 1,
            run_note: 1
          }
        },
        demoContract: {
          contractId: "think-live-compile-demo",
          workflowStatus:
            "Proves the fixture-scoped happy path from live compile through compiled Think task execution, run_note promotion, and archived run summary."
        }
      });

      expect(server.requests).toHaveLength(1);
      expect(server.requests[0]).toMatchObject({
        method: "GET",
        path: "/v1/runs/run-validate"
      });
    } finally {
      await server.close();
    }
  }, 15_000);

  it("defaults demo-run to the scripted fixture contract", () => {
    process.argv = ["node", "scripts/demo-run.ts"];
    clearDemoEnv();

    const requestedRuntime = resolveDemoRunRuntime();
    const requestedThinkMode = resolveDemoRunThinkMode();
    const contract = resolveCreatedRunExecutionContract({}, requestedRuntime, requestedThinkMode);

    expect(requestedRuntime).toBe("scripted");
    expect(requestedThinkMode).toBe("mock");
    expect(contract).toMatchObject({
      runtime: "scripted",
      thinkMode: "mock",
      preserveSandbox: false,
      streamEvents: false,
      maxPollAttempts: 30,
      demoContract: {
        contractId: "scripted-fixture-demo",
        workflowStatus: "Default non-Think demo path."
      }
    });
  });

  it("resolves the deterministic fixture-project bootstrap defaults", () => {
    clearDemoEnv();

    expect(resolveEnsureDemoProjectBaseUrl()).toBe("http://127.0.0.1:8787");
    expect(resolveDemoTenantId()).toBe("tenant-dev-local");
    expect(resolveEnsureProjectFixtureConfig()).toMatchObject({
      projectKey: "fixture-demo-project",
      displayName: "Fixture Demo Project",
      components: [
        {
          componentKey: "demo-target",
          config: {
            localPath: "./fixtures/demo-target",
            defaultRef: "main"
          }
        }
      ]
    });
  });

  it("treats an explicit live Think request as the current live-compile demo contract", () => {
    process.argv = ["node", "scripts/demo-run.ts", "--runtime=think", "--think-mode=live"];
    clearDemoEnv();

    const requestedRuntime = resolveDemoRunRuntime();
    const requestedThinkMode = resolveDemoRunThinkMode();
    const contract = resolveCreatedRunExecutionContract(
      {
        runtime: "think",
        options: {}
      },
      requestedRuntime,
      requestedThinkMode
    );

    expect(contract).toMatchObject({
      runtime: "think",
      thinkMode: "live",
      preserveSandbox: true,
      streamEvents: true,
      maxPollAttempts: 90,
      demoContract: {
        contractId: "think-live-compile-demo",
        proofScope: "Fixture-scoped live compile plus compiled Think task execution",
        modelExecution: "Live local chat-completions backend",
        workflowStatus:
          "Proves the fixture-scoped happy path from live compile through compiled Think task execution, run_note promotion, and archived run summary."
      }
    });
  });

  it("lets demo-validate prefer persisted live Think metadata over requested defaults", () => {
    const contract = resolveValidatedRunContract(
      {
        inputs: {
          runtime: "think",
          options: {
            thinkMode: "live"
          }
        }
      },
      "scripted",
      "mock"
    );

    expect(contract).toMatchObject({
      runtime: "think",
      thinkMode: "live",
      demoContract: {
        contractId: "think-live-compile-demo",
        workflowStatus:
          "Proves the fixture-scoped happy path from live compile through compiled Think task execution, run_note promotion, and archived run summary."
      }
    });
  });

  it("falls back to the requested Think mock contract when persisted metadata is absent", () => {
    process.argv = ["node", "scripts/demo-validate.ts", "--runtime=think"];
    clearDemoEnv();

    const requestedRuntime = resolveDemoValidateRuntime();
    const requestedThinkMode = resolveDemoValidateThinkMode();
    const contract = resolveValidatedRunContract({}, requestedRuntime, requestedThinkMode);

    expect(requestedRuntime).toBe("think");
    expect(requestedThinkMode).toBe("mock");
    expect(contract).toMatchObject({
      runtime: "think",
      thinkMode: "mock",
      demoContract: {
        contractId: "think-mock-validation",
        workflowStatus:
          "Stable validation path for the current fixture-backed compile and task handoff behavior."
      }
    });
  });
});
