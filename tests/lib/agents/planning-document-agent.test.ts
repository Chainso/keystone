import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  class FakeExecutionSession {
    readonly files = new Map<string, { content: string; encoding: string }>();
    readonly execCalls: Array<{
      command: string;
      options?: {
        cwd?: string;
        env?: Record<string, string | undefined>;
        timeout?: number;
      };
    }> = [];

    async readFile(filePath: string) {
      const file = this.files.get(filePath);

      if (!file) {
        throw new Error(`Missing file: ${filePath}`);
      }

      return {
        success: true,
        path: filePath,
        content: file.content,
        timestamp: new Date().toISOString(),
        encoding: file.encoding as "utf-8" | "base64",
        isBinary: false,
        mimeType: "text/plain",
        size: file.content.length
      };
    }

    async listFiles(targetPath: string) {
      const normalizedRoot = targetPath === "/" ? "/" : targetPath.replace(/\/+$/, "");
      const files = Array.from(this.files.entries())
        .filter(([absolutePath]) => absolutePath.startsWith(`${normalizedRoot}/`))
        .map(([absolutePath, file]) => ({
          name: absolutePath.split("/").at(-1) ?? absolutePath,
          absolutePath,
          relativePath: absolutePath.slice(normalizedRoot.length + 1),
          type: "file" as const,
          size: file.content.length,
          modifiedAt: new Date().toISOString(),
          mode: "0644",
          permissions: {
            readable: true,
            writable: true,
            executable: false
          }
        }));

      return {
        success: true,
        path: targetPath,
        files,
        count: files.length,
        timestamp: new Date().toISOString()
      };
    }

    async exec(
      command: string,
      options?: {
        cwd?: string;
        env?: Record<string, string | undefined>;
        timeout?: number;
      }
    ) {
      this.execCalls.push(options ? { command, options } : { command });

      return {
        success: true,
        exitCode: 0,
        stdout: "ok\n",
        stderr: "",
        command,
        duration: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  const state = {
    session: null as InstanceType<typeof FakeExecutionSession> | null,
    ensurePlanningSandboxContext: vi.fn<() => Promise<unknown>>(async () => null)
  };

  return {
    FakeExecutionSession,
    state
  };
});

function createBridge() {
  return {
    layout: {
      workspaceRoot: "/workspace",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    targets: {
      workspaceRoot: "/workspace/runs/run-123/tasks/planning-specification/code",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    readOnlyRoots: ["/artifacts/in", "/keystone"],
    writableRoots: ["/workspace", "/artifacts/out"],
    environment: {
      KEYSTONE_FIXTURE_PROJECT: "1"
    },
    controlFiles: {
      session: "/keystone/session.json",
      filesystem: "/keystone/filesystem.json",
      artifacts: "/keystone/artifacts.json"
    },
    projectedArtifacts: []
  };
}

vi.mock("@cloudflare/think", () => ({
  Think: class Think<Env = unknown> {
    env: Env;
    name = "default";

    constructor(_state: unknown, env: Env) {
      this.env = env;
    }
  }
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn()
  }))
}));

vi.mock("../../../src/keystone/agents/planning/planning-context", () => ({
  ensurePlanningSandboxContext: mocked.state.ensurePlanningSandboxContext,
  parsePlanningConversationName: vi.fn((name: string) => {
    const match = /^tenant:[^:]+:run:[^:]+:document:(.+)$/.exec(name);

    if (!match) {
      return null;
    }

    return {
      tenantId: "tenant-fixture",
      runId: "run-123",
      path: match[1]
    };
  })
}));

const { PlanningDocumentAgent } = await import(
  "../../../src/keystone/agents/planning/PlanningDocumentAgent"
);

function createEnv() {
  return {
    KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
    KEYSTONE_CHAT_COMPLETIONS_MODEL: "gpt-5.4"
  };
}

function setAgentName(agent: InstanceType<typeof PlanningDocumentAgent>, name: string) {
  Object.defineProperty(agent, "name", {
    value: name,
    configurable: true
  });
}

describe("PlanningDocumentAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.state.session = new mocked.FakeExecutionSession();
    mocked.state.session.files.set(
      "/workspace/runs/run-123/tasks/planning-specification/code/src/index.ts",
      {
        content: 'export const greeting = "hello";\n',
        encoding: "utf-8"
      }
    );
    mocked.state.ensurePlanningSandboxContext.mockResolvedValue({
      identity: {
        tenantId: "tenant-fixture",
        runId: "run-123",
        path: "specification"
      },
      sessionId: "planning-document-specification",
      taskId: "planning-specification",
      runTaskId: "planning-specification",
      sandboxId: "sandbox-run-123",
      session: mocked.state.session,
      bridge: createBridge(),
      projectExecution: {
        projectId: "project-fixture",
        projectKey: "fixture-project",
        displayName: "Fixture Project",
        components: [],
        environment: {
          KEYSTONE_FIXTURE_PROJECT: "1"
        },
        ruleSet: {
          reviewInstructions: [],
          testInstructions: []
        },
        componentRuleOverrides: []
      }
    });
  });

  it("uses distinct planning prompts for specification, architecture, and execution plan", () => {
    const specificationAgent = new PlanningDocumentAgent({} as never, createEnv() as never);
    setAgentName(specificationAgent, "tenant:tenant-fixture:run:run-123:document:specification");

    const architectureAgent = new PlanningDocumentAgent({} as never, createEnv() as never);
    setAgentName(architectureAgent, "tenant:tenant-fixture:run:run-123:document:architecture");

    const executionPlanAgent = new PlanningDocumentAgent({} as never, createEnv() as never);
    setAgentName(executionPlanAgent, "tenant:tenant-fixture:run:run-123:document:execution-plan");

    expect(specificationAgent.getSystemPrompt()).toContain("specification agent");
    expect(specificationAgent.getSystemPrompt()).toContain("user-visible behavior");
    expect(architectureAgent.getSystemPrompt()).toContain("architecture agent");
    expect(architectureAgent.getSystemPrompt()).toContain("technical design");
    expect(executionPlanAgent.getSystemPrompt()).toContain("task DAG");
    expect(executionPlanAgent.getSystemPrompt()).toContain("dependsOn");
  });

  it("exposes sandbox-backed planning tools", async () => {
    const agent = new PlanningDocumentAgent({} as never, createEnv() as never);
    setAgentName(agent, "tenant:tenant-fixture:run:run-123:document:specification");

    const tools = agent.getTools();
    const readTool = tools.read_file;
    const listTool = tools.list_files;
    const bashTool = tools.run_bash;

    if (!readTool?.execute || !listTool?.execute || !bashTool?.execute) {
      throw new Error("Expected planning toolset to expose read_file, list_files, and run_bash.");
    }

    const readResult = await readTool.execute(
      {
        path: "/workspace/src/index.ts"
      },
      {} as never
    );
    const listResult = await listTool.execute(
      {
        path: "/workspace/src",
        recursive: true
      },
      {} as never
    );
    const bashResult = await bashTool.execute(
      {
        command: "git status --short",
        cwd: "/workspace",
        timeoutMs: 5_000
      },
      {} as never
    );

    expect(readResult).toEqual(
      expect.objectContaining({
        path: "/workspace/src/index.ts",
        content: 'export const greeting = "hello";\n'
      })
    );
    expect(listResult).toEqual(
      expect.objectContaining({
        count: 1,
        files: [
          expect.objectContaining({
            path: "/workspace/src/index.ts"
          })
        ]
      })
    );
    expect(bashResult).toEqual(
      expect.objectContaining({
        command: "git status --short",
        cwd: "/workspace",
        success: true
      })
    );
    expect(mocked.state.session?.execCalls[0]?.options).toEqual(
      expect.objectContaining({
        cwd: "/workspace/runs/run-123/tasks/planning-specification/code",
        env: {
          KEYSTONE_FIXTURE_PROJECT: "1"
        },
        timeout: 5_000
      })
    );
  });
});
