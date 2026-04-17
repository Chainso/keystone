import { execFile } from "node:child_process";
import { once } from "node:events";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import {
  resolveCreatedRunExecutionContract,
  resolveRuntime as resolveDemoRunRuntime,
  resolveThinkMode as resolveDemoRunThinkMode
} from "../../scripts/demo-run";
import {
  resolveRuntime as resolveDemoValidateRuntime,
  resolveThinkMode as resolveDemoValidateThinkMode,
  resolveValidatedRunContract
} from "../../scripts/demo-validate";

const execFileAsync = promisify(execFile);
const demoEnvKeys = [
  "KEYSTONE_AGENT_RUNTIME",
  "KEYSTONE_THINK_DEMO_MODE",
  "KEYSTONE_PRESERVE_SANDBOX",
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
  scriptName: "demo:run" | "demo:validate",
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
          proofScope: "Live compile plus fixture-gated Think task path",
          modelExecution: "Live local chat-completions backend",
          workflowStatus:
            "Phase 2 proves the real compile path and persisted compiled handoffs. Phase 3 still owns the remaining task-execution seam."
        }
      });

      expect(server.requests.map((request) => `${request.method} ${request.path}`)).toEqual([
        "POST /v1/runs",
        "GET /v1/runs/run-live/events",
        "GET /v1/runs/run-live"
      ]);
      expect(server.requests[0]?.headers["x-keystone-agent-runtime"]).toBe("think");
    } finally {
      await server.close();
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
            "Phase 2 proves the real compile path and persisted compiled handoffs. Phase 3 still owns the remaining task-execution seam."
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

  it("treats an explicit live Think request as the Phase 2 live-compile demo contract", () => {
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
        proofScope: "Live compile plus fixture-gated Think task path",
        modelExecution: "Live local chat-completions backend",
        workflowStatus:
          "Phase 2 proves the real compile path and persisted compiled handoffs. Phase 3 still owns the remaining task-execution seam."
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
          "Phase 2 proves the real compile path and persisted compiled handoffs. Phase 3 still owns the remaining task-execution seam."
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
