import { execFile } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { resolveFixtureProjectConfig } from "../../scripts/ensure-demo-project";

const execFileAsync = promisify(execFile);
const demoEnvKeys = [
  "KEYSTONE_BASE_URL",
  "KEYSTONE_DEMO_STATE_PATH",
  "KEYSTONE_DEMO_TENANT_ID",
  "KEYSTONE_DEV_TOKEN",
  "KEYSTONE_EXECUTION_ENGINE",
  "KEYSTONE_RUN_ID"
] as const;
const originalArgv = [...process.argv];
const originalEnv = new Map(demoEnvKeys.map((key) => [key, process.env[key]]));
const tempPaths = new Set<string>();

type ScriptName =
  | "run:local"
  | "demo:ensure-project"
  | "demo:run"
  | "demo:run:think-live"
  | "demo:validate";

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

async function createTempStatePath() {
  const directory = await mkdtemp(join(tmpdir(), "keystone-demo-state-"));
  tempPaths.add(directory);
  return join(directory, "demo-last-run.json");
}

async function runDemoScript(
  scriptName: ScriptName,
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

afterEach(async () => {
  process.argv = [...originalArgv];

  for (const [key, value] of originalEnv) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  for (const path of tempPaths) {
    await rm(path, {
      recursive: true,
      force: true
    });
  }

  tempPaths.clear();
});

describe("demo scripts", () => {
  it("exposes the fixture project config contract without legacy bindings or metadata", () => {
    const fixtureConfig = resolveFixtureProjectConfig();

    expect(fixtureConfig).toMatchObject({
      projectKey: "fixture-demo-project",
      ruleSet: {
        reviewInstructions: expect.any(Array),
        testInstructions: expect.any(Array)
      },
      components: [
        expect.objectContaining({
          componentKey: "demo-target",
          config: {
            localPath: "./fixtures/demo-target",
            ref: "main"
          }
        })
      ],
      envVars: [
        {
          name: "KEYSTONE_FIXTURE_PROJECT",
          value: "1"
        }
      ]
    });
    expect("integrationBindings" in fixtureConfig).toBe(false);
    expect("metadata" in fixtureConfig).toBe(false);
  });

  it("run:local creates project-scoped runs and reports the next document-driven steps", async () => {
    const server = await startStubServer((request) => {
      if (request.method === "POST" && request.path === "/v1/projects/project-fixture/runs") {
        return {
          status: 201,
          body: {
            data: {
              runId: "run-local-123",
              status: "configured"
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      const { stdout } = await runDemoScript(
        "run:local",
        [`--base-url=${server.baseUrl}`, "--project-id=project-fixture"],
        {
          KEYSTONE_DEMO_TENANT_ID: "tenant-local"
        }
      );
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        baseUrl: server.baseUrl,
        tenantId: "tenant-local",
        projectId: "project-fixture",
        runId: "run-local-123",
        executionEngine: "think_live",
        status: "configured",
        nextSteps: {
          createDocuments: "/v1/runs/run-local-123/documents",
          compile: "/v1/runs/run-local-123/compile"
        }
      });
      expect(server.requests).toEqual([
        expect.objectContaining({
          method: "POST",
          path: "/v1/projects/project-fixture/runs",
          body: {
            executionEngine: "think_live"
          }
        })
      ]);
    } finally {
      await server.close();
    }
  });

  it("demo:ensure-project creates the fixture project when none exists yet", async () => {
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/projects") {
        return {
          body: {
            data: {
              items: [],
              total: 0
            }
          }
        };
      }

      if (request.method === "POST" && request.path === "/v1/projects") {
        return {
          status: 201,
          body: {
            data: {
              projectId: "project-created",
              projectKey: "fixture-demo-project"
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      const { stdout } = await runDemoScript("demo:ensure-project", [`--base-url=${server.baseUrl}`]);
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        action: "created",
        baseUrl: server.baseUrl,
        project: {
          projectId: "project-created",
          projectKey: "fixture-demo-project"
        }
      });
      expect(server.requests).toEqual([
        expect.objectContaining({
          method: "GET",
          path: "/v1/projects"
        }),
        expect.objectContaining({
          method: "POST",
          path: "/v1/projects",
          body: expect.objectContaining({
            projectKey: "fixture-demo-project",
            components: [
              expect.objectContaining({
                componentKey: "demo-target"
              })
            ]
          })
        })
      ]);
    } finally {
      await server.close();
    }
  });

  it("demo:run seeds the three planning documents, compiles, and persists archived run state", async () => {
    const statePath = await createTempStatePath();
    const createdDocuments: Array<Record<string, unknown>> = [];
    const createdRevisions: Array<Record<string, unknown>> = [];
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/projects") {
        return {
          body: {
            data: {
              items: [
                {
                  projectId: "project-123",
                  projectKey: "fixture-demo-project"
                }
              ],
              total: 1
            }
          }
        };
      }

      if (request.method === "PATCH" && request.path === "/v1/projects/project-123") {
        return {
          body: {
            data: {
              projectId: "project-123",
              projectKey: "fixture-demo-project"
            }
          }
        };
      }

      if (request.method === "POST" && request.path === "/v1/projects/project-123/runs") {
        return {
          status: 201,
          body: {
            data: {
              runId: "run-123",
              status: "configured"
            }
          }
        };
      }

      if (request.method === "POST" && request.path === "/v1/runs/run-123/documents") {
        const body = request.body as Record<string, unknown>;
        createdDocuments.push(body);

        return {
          status: 201,
          body: {
            data: {
              documentId: `doc-${body.kind}`
            }
          }
        };
      }

      if (request.method === "POST" && request.path.startsWith("/v1/runs/run-123/documents/doc-")) {
        createdRevisions.push((request.body as Record<string, unknown>) ?? {});

        return {
          status: 201,
          body: {
            data: {
              documentRevisionId: crypto.randomUUID()
            }
          }
        };
      }

      if (request.method === "POST" && request.path === "/v1/runs/run-123/compile") {
        return {
          body: {
            data: {
              runId: "run-123"
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-123") {
        return {
          body: {
            data: {
              runId: "run-123",
              status: "archived",
              compiledFrom: {
                specificationRevisionId: "spec-rev-1",
                architectureRevisionId: "arch-rev-1",
                executionPlanRevisionId: "plan-rev-1"
              }
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-123/tasks") {
        return {
          body: {
            data: {
              items: [
                {
                  taskId: "task-prepare-code",
                  status: "completed"
                },
                {
                  taskId: "task-prepare-tests",
                  status: "completed"
                },
                {
                  taskId: "task-implement",
                  status: "completed"
                }
              ]
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      const { stdout } = await runDemoScript("demo:run", [`--base-url=${server.baseUrl}`], {
        KEYSTONE_DEMO_STATE_PATH: statePath
      });
      const payload = parseCommandJson(stdout);
      const persisted = JSON.parse(await readFile(statePath, "utf8")) as Record<string, unknown>;

      expect(payload).toMatchObject({
        baseUrl: server.baseUrl,
        projectId: "project-123",
        runId: "run-123",
        executionEngine: "think_live",
        status: "archived",
        compiledFrom: {
          specificationRevisionId: "spec-rev-1",
          architectureRevisionId: "arch-rev-1",
          executionPlanRevisionId: "plan-rev-1"
        },
        tasks: {
          total: 3,
          completed: 3,
          ready: 0,
          active: 0,
          pending: 0,
          failed: 0,
          cancelled: 0
        },
        demoContract: {
          contractId: "think-live-document-run"
        }
      });
      expect(persisted).toMatchObject({
        baseUrl: server.baseUrl,
        runId: "run-123",
        executionEngine: "think_live"
      });
      expect(createdDocuments).toEqual([
        {
          kind: "specification",
          path: "specification"
        },
        {
          kind: "architecture",
          path: "architecture"
        },
        {
          kind: "execution_plan",
          path: "execution-plan"
        }
      ]);
      expect(createdRevisions).toEqual([
        expect.objectContaining({
          title: "Run Specification",
          contentType: "text/markdown; charset=utf-8",
          body: expect.any(String)
        }),
        expect.objectContaining({
          title: "Run Architecture",
          contentType: "text/markdown; charset=utf-8",
          body: expect.any(String)
        }),
        expect.objectContaining({
          title: "Execution Plan",
          contentType: "text/markdown; charset=utf-8",
          body: expect.any(String)
        })
      ]);
      expect(createdRevisions[0]?.body).toContain("at least two root tasks");
      expect(createdRevisions[1]?.body).toContain("Root task A");
      expect(createdRevisions[2]?.body).toContain("depends on tasks 1 and 2");
    } finally {
      await server.close();
    }
  });

  it("demo:run:think-live resolves the live execution engine contract", async () => {
    const statePath = await createTempStatePath();
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/projects") {
        return {
          body: {
            data: {
              items: [
                {
                  projectId: "project-123",
                  projectKey: "fixture-demo-project"
                }
              ],
              total: 1
            }
          }
        };
      }

      if (request.method === "PATCH" && request.path === "/v1/projects/project-123") {
        return {
          body: {
            data: {
              projectId: "project-123",
              projectKey: "fixture-demo-project"
            }
          }
        };
      }

      if (request.method === "POST" && request.path === "/v1/projects/project-123/runs") {
        return {
          status: 201,
          body: {
            data: {
              runId: "run-live-123",
              status: "configured"
            }
          }
        };
      }

      if (request.method === "POST" && request.path === "/v1/runs/run-live-123/documents") {
        const body = request.body as Record<string, unknown>;

        return {
          status: 201,
          body: {
            data: {
              documentId: `doc-${body.kind}`
            }
          }
        };
      }

      if (
        request.method === "POST" &&
        request.path.startsWith("/v1/runs/run-live-123/documents/doc-")
      ) {
        return {
          status: 201,
          body: {
            data: {
              documentRevisionId: crypto.randomUUID()
            }
          }
        };
      }

      if (request.method === "POST" && request.path === "/v1/runs/run-live-123/compile") {
        return {
          body: {
            data: {
              runId: "run-live-123"
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-live-123") {
        return {
          body: {
            data: {
              runId: "run-live-123",
              status: "archived",
              compiledFrom: {
                specificationRevisionId: "spec-rev-live",
                architectureRevisionId: "arch-rev-live",
                executionPlanRevisionId: "plan-rev-live"
              }
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-live-123/tasks") {
        return {
          body: {
            data: {
              items: [
                {
                  taskId: "task-live",
                  status: "completed"
                }
              ]
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      const { stdout } = await runDemoScript("demo:run:think-live", [`--base-url=${server.baseUrl}`], {
        KEYSTONE_DEMO_STATE_PATH: statePath
      });
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        executionEngine: "think_live",
        demoContract: {
          contractId: "think-live-document-run"
        }
      });
    } finally {
      await server.close();
    }
  });

  it("demo:validate reads persisted run state and verifies the non-trivial DAG proof for think_live", async () => {
    const statePath = await createTempStatePath();
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/runs/run-validate-123") {
        return {
          body: {
            data: {
              runId: "run-validate-123",
              status: "archived",
              executionEngine: "think_live",
              compiledFrom: {
                specificationRevisionId: "spec-rev-validate",
                architectureRevisionId: "arch-rev-validate",
                executionPlanRevisionId: "plan-rev-validate"
              }
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-validate-123/tasks") {
        return {
          body: {
            data: {
              items: [
                {
                  taskId: "task-prepare-code",
                  status: "completed"
                },
                {
                  taskId: "task-prepare-tests",
                  status: "completed"
                },
                {
                  taskId: "task-implement",
                  status: "completed",
                  conversation: {
                    agentClass: "KeystoneThinkAgent",
                    agentName: "tenant:tenant-dev-local:run:run-validate-123:task:task-implement"
                  }
                }
              ]
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-validate-123/workflow") {
        return {
          body: {
            data: {
              nodes: [
                {
                  taskId: "task-prepare-code",
                  name: "Inspect greeting implementation",
                  status: "completed",
                  dependsOn: []
                },
                {
                  taskId: "task-prepare-tests",
                  name: "Inspect greeting tests",
                  status: "completed",
                  dependsOn: []
                },
                {
                  taskId: "task-implement",
                  name: "Implement greeting update",
                  status: "completed",
                  dependsOn: ["task-prepare-code", "task-prepare-tests"]
                }
              ],
              edges: [
                {
                  fromTaskId: "task-prepare-code",
                  toTaskId: "task-implement"
                },
                {
                  fromTaskId: "task-prepare-tests",
                  toTaskId: "task-implement"
                }
              ],
              summary: {
                totalTasks: 3,
                activeTasks: 0,
                pendingTasks: 0,
                completedTasks: 3,
                readyTasks: 0,
                failedTasks: 0,
                cancelledTasks: 0
              }
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      await writeFile(
        statePath,
        JSON.stringify(
          {
            baseUrl: server.baseUrl,
            runId: "run-validate-123",
            executionEngine: "think_live"
          },
          null,
          2
        )
      );

      const { stdout } = await runDemoScript("demo:validate", [], {
        KEYSTONE_DEMO_STATE_PATH: statePath
      });
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        ok: true,
        baseUrl: server.baseUrl,
        runId: "run-validate-123",
        executionEngine: "think_live",
        status: "archived",
        compiledFrom: {
          specificationRevisionId: "spec-rev-validate",
          architectureRevisionId: "arch-rev-validate",
          executionPlanRevisionId: "plan-rev-validate"
        },
        tasks: {
          total: 3,
          completed: 3
        },
        workflow: {
          totalTasks: 3,
          rootTasks: 2,
          dependentTasks: 1,
          edges: 2
        },
        demoContract: {
          contractId: "think-live-document-run"
        }
      });
    } finally {
      await server.close();
    }
  });

  it("demo:validate keeps the narrow think_mock proof path available", async () => {
    const statePath = await createTempStatePath();
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/runs/run-validate-mock") {
        return {
          body: {
            data: {
              runId: "run-validate-mock",
              status: "archived",
              executionEngine: "think_mock",
              compiledFrom: {
                specificationRevisionId: "spec-rev-validate",
                architectureRevisionId: "arch-rev-validate",
                executionPlanRevisionId: "plan-rev-validate"
              }
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-validate-mock/tasks") {
        return {
          body: {
            data: {
              items: [
                {
                  taskId: "task-validate",
                  status: "completed",
                  conversation: {
                    agentClass: "KeystoneThinkAgent",
                    agentName: "tenant:tenant-dev-local:run:run-validate-mock:task:task-validate"
                  }
                }
              ]
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-validate-mock/workflow") {
        return {
          body: {
            data: {
              nodes: [
                {
                  taskId: "task-validate",
                  name: "Implement execution plan",
                  status: "completed",
                  dependsOn: []
                }
              ],
              edges: [],
              summary: {
                totalTasks: 1,
                activeTasks: 0,
                pendingTasks: 0,
                completedTasks: 1,
                readyTasks: 0,
                failedTasks: 0,
                cancelledTasks: 0
              }
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      await writeFile(
        statePath,
        JSON.stringify(
          {
            baseUrl: server.baseUrl,
            runId: "run-validate-mock",
            executionEngine: "think_mock"
          },
          null,
          2
        )
      );

      const { stdout } = await runDemoScript("demo:validate", [], {
        KEYSTONE_DEMO_STATE_PATH: statePath
      });
      const payload = parseCommandJson(stdout);

      expect(payload).toMatchObject({
        ok: true,
        baseUrl: server.baseUrl,
        runId: "run-validate-mock",
        executionEngine: "think_mock",
        workflow: {
          totalTasks: 1,
          rootTasks: 1,
          dependentTasks: 0,
          edges: 0
        },
        demoContract: {
          contractId: "think-mock-document-run"
        }
      });
    } finally {
      await server.close();
    }
  });

  it("demo:validate rejects a think_live run that lacks an independent root", async () => {
    const statePath = await createTempStatePath();
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/runs/run-validate-linear") {
        return {
          body: {
            data: {
              runId: "run-validate-linear",
              status: "archived",
              executionEngine: "think_live",
              compiledFrom: {
                specificationRevisionId: "spec-rev-linear",
                architectureRevisionId: "arch-rev-linear",
                executionPlanRevisionId: "plan-rev-linear"
              }
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-validate-linear/tasks") {
        return {
          body: {
            data: {
              items: [
                {
                  taskId: "task-a",
                  status: "completed"
                },
                {
                  taskId: "task-b",
                  status: "completed"
                },
                {
                  taskId: "task-c",
                  status: "completed",
                  conversation: {
                    agentClass: "KeystoneThinkAgent",
                    agentName: "tenant:tenant-dev-local:run:run-validate-linear:task:task-c"
                  }
                }
              ]
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-validate-linear/workflow") {
        return {
          body: {
            data: {
              nodes: [
                {
                  taskId: "task-a",
                  name: "Inspect greeting implementation",
                  status: "completed",
                  dependsOn: []
                },
                {
                  taskId: "task-b",
                  name: "Inspect greeting tests",
                  status: "completed",
                  dependsOn: ["task-a"]
                },
                {
                  taskId: "task-c",
                  name: "Implement greeting update",
                  status: "completed",
                  dependsOn: ["task-b"]
                }
              ],
              edges: [
                {
                  fromTaskId: "task-a",
                  toTaskId: "task-b"
                },
                {
                  fromTaskId: "task-b",
                  toTaskId: "task-c"
                }
              ],
              summary: {
                totalTasks: 3,
                activeTasks: 0,
                pendingTasks: 0,
                completedTasks: 3,
                readyTasks: 0,
                failedTasks: 0,
                cancelledTasks: 0
              }
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      await writeFile(
        statePath,
        JSON.stringify(
          {
            baseUrl: server.baseUrl,
            runId: "run-validate-linear",
            executionEngine: "think_live"
          },
          null,
          2
        )
      );

      await expect(async () => {
        try {
          await runDemoScript("demo:validate", [], {
            KEYSTONE_DEMO_STATE_PATH: statePath
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          expect(message).toMatch(/at least two root tasks/);
          return;
        }

        throw new Error("Expected demo:validate to fail when the DAG proof has only one root.");
      }).not.toThrow();
    } finally {
      await server.close();
    }
  });

  it("demo:validate fails closed when run detail omits a valid execution engine", async () => {
    const statePath = await createTempStatePath();
    const server = await startStubServer((request) => {
      if (request.method === "GET" && request.path === "/v1/runs/run-validate-123") {
        return {
          body: {
            data: {
              runId: "run-validate-123",
              status: "archived",
              compiledFrom: {
                specificationRevisionId: "spec-rev-validate",
                architectureRevisionId: "arch-rev-validate",
                executionPlanRevisionId: "plan-rev-validate"
              }
            }
          }
        };
      }

      if (request.method === "GET" && request.path === "/v1/runs/run-validate-123/tasks") {
        return {
          body: {
            data: {
              items: []
            }
          }
        };
      }

      throw new Error(`Unexpected request: ${request.method} ${request.path}`);
    });

    try {
      await writeFile(
        statePath,
        JSON.stringify(
          {
            baseUrl: server.baseUrl,
            runId: "run-validate-123",
            executionEngine: "think_mock"
          },
          null,
          2
        )
      );

      await expect(async () => {
        try {
          await runDemoScript("demo:validate", [], {
            KEYSTONE_DEMO_STATE_PATH: statePath
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);

          expect(message).toMatch(/did not return a valid executionEngine/);
          return;
        }

        throw new Error("Expected demo:validate to fail when executionEngine is missing.");
      }).not.toThrow();
    } finally {
      await server.close();
    }
  });
});
