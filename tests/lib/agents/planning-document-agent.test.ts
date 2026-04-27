import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  class FakeExecutionSession {
    readonly files = new Map<string, { content: string; encoding: string }>();
    readonly directories = new Set<string>([
      "/",
      "/workspace",
      "/documents",
      "/artifacts",
      "/artifacts/in",
      "/artifacts/out",
      "/keystone"
    ]);
    readonly execCalls: Array<{
      command: string;
      options?: {
        cwd?: string;
        env?: Record<string, string | undefined>;
        timeout?: number;
      };
    }> = [];

    async writeFile(
      filePath: string,
      content: string,
      options?: {
        encoding?: string | undefined;
      }
    ) {
      this.ensureParentDirectory(filePath);
      this.files.set(filePath, {
        content,
        encoding: options?.encoding ?? "utf-8"
      });
    }

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

    async mkdir(dirPath: string) {
      const parts = dirPath.split("/").filter(Boolean);
      let current = "";

      for (const part of parts) {
        current += `/${part}`;
        this.directories.add(current);
      }
    }

    async exists(filePath: string) {
      return {
        success: true,
        path: filePath,
        exists: this.files.has(filePath) || this.directories.has(filePath),
        timestamp: new Date().toISOString()
      };
    }

    async deleteFile(filePath: string) {
      this.files.delete(filePath);

      return {
        success: true,
        path: filePath,
        timestamp: new Date().toISOString()
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
      this.applyRemoveCommand(command);
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

    private applyRemoveCommand(command: string) {
      const match = /^rm -r?f '([^']+)'$/.exec(command);

      if (!match?.[1]) {
        return;
      }

      this.deleteTree(match[1]);
    }

    private deleteTree(rootPath: string) {
      for (const filePath of Array.from(this.files.keys())) {
        if (filePath === rootPath || filePath.startsWith(`${rootPath}/`)) {
          this.files.delete(filePath);
        }
      }

      for (const directoryPath of Array.from(this.directories)) {
        if (directoryPath !== rootPath && directoryPath.startsWith(`${rootPath}/`)) {
          this.directories.delete(directoryPath);
        }
      }
    }

    private ensureParentDirectory(filePath: string) {
      const parentPath = filePath.slice(0, filePath.lastIndexOf("/"));

      if (parentPath) {
        return this.mkdir(parentPath);
      }

      return undefined;
    }
  }

  class FakeWorkspace {
    readonly files = new Map<string, string>();

    async stat(filePath: string) {
      const content = this.files.get(filePath);

      if (content === undefined) {
        return null;
      }

      return {
        path: filePath,
        name: filePath.split("/").at(-1) ?? filePath,
        type: "file" as const,
        mimeType: "text/plain",
        size: content.length,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }

    async readFile(filePath: string) {
      return this.files.get(filePath) ?? null;
    }

    async writeFile(filePath: string, content: string) {
      this.files.set(filePath, content);
    }

    async mkdir(_path: string) {
      return undefined;
    }
  }

  const state = {
    session: null as InstanceType<typeof FakeExecutionSession> | null,
    workspace: null as InstanceType<typeof FakeWorkspace> | null,
    ensurePlanningSandboxContext: vi.fn<() => Promise<unknown>>(async () => null),
    loadRunDocumentCurrentText: vi.fn(async () => null),
    saveRunDocumentTextRevision: vi.fn(async () => ({
      document: {
        documentId: "document-specification",
        path: "specification"
      },
      revision: {
        documentRevisionId: "revision-specification",
        revisionNumber: 2,
        title: "Agent save for specification"
      },
      artifact: {
        sizeBytes: 42
      }
    }))
  };

  return {
    FakeExecutionSession,
    FakeWorkspace,
    state
  };
});

function createBridge() {
  return {
    layout: {
      workspaceRoot: "/workspace",
      documentsRoot: "/documents",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    targets: {
      workspaceRoot: "/workspace/runs/run-123/tasks/planning-specification",
      documentsRoot: "/documents",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    readOnlyRoots: ["/artifacts/in", "/keystone"],
    writableRoots: ["/workspace", "/documents", "/artifacts/out"],
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
    workspace: InstanceType<typeof mocked.FakeWorkspace>;

    constructor(_state: unknown, env: Env) {
      this.env = env;
      this.workspace = new mocked.FakeWorkspace();
      mocked.state.workspace = this.workspace;
    }
  }
}));

vi.mock("@cloudflare/think/tools/workspace", async () => {
  const actual =
    await vi.importActual<typeof import("@cloudflare/think/tools/workspace")>(
      "@cloudflare/think/tools/workspace"
    );

  return actual;
});

vi.mock("@cloudflare/think/tools/execute", () => ({
  createExecuteTool: vi.fn(() => ({
    description: "execute code against workspace tools",
    execute: vi.fn()
  }))
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

vi.mock("../../../src/lib/documents/revision-persistence", () => ({
  loadRunDocumentCurrentText: mocked.state.loadRunDocumentCurrentText,
  saveRunDocumentTextRevision: mocked.state.saveRunDocumentTextRevision
}));

const { PlanningDocumentAgent } = await import(
  "../../../src/keystone/agents/planning/PlanningDocumentAgent"
);

function createEnv() {
  return {
    KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
    KEYSTONE_CHAT_COMPLETIONS_MODEL: "gpt-5.5",
    LOADER: {
      get: vi.fn(),
      load: vi.fn()
    }
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
    mocked.state.workspace = null;
    mocked.state.session.files.set(
      "/workspace/runs/run-123/tasks/planning-specification/code/repo/src/index.ts",
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
    expect(specificationAgent.getSystemPrompt()).toContain(
      "The editable draft for this document lives in the sandbox at /documents/specification.md"
    );
    expect(specificationAgent.getSystemPrompt()).toContain(
      "Use run_bash only when shell commands are the right inspection tool"
    );
  });

  it("composes shared execute, save, and sandbox bash tools", async () => {
    const agent = new PlanningDocumentAgent({} as never, createEnv() as never);
    setAgentName(agent, "tenant:tenant-fixture:run:run-123:document:specification");

    const tools = agent.getTools();
    const bashTool = tools.run_bash;
    const executeTool = tools.execute;
    const saveTool = tools.save_specification;
    const readTool = tools.read;
    const listTool = tools.list;
    const writeTool = tools.write;

    if (!bashTool?.execute || !executeTool || !saveTool || !readTool?.execute || !listTool?.execute || !writeTool?.execute) {
      throw new Error("Expected planning toolset to expose shared and specification tools.");
    }

    const listResult = await listTool.execute(
      {
        path: "/workspace/code/repo/src"
      },
      {} as never
    );
    const readResult = await readTool.execute(
      {
        path: "/workspace/code/repo/src/index.ts"
      },
      {} as never
    );
    const writeResult = await writeTool.execute(
      {
        path: "/documents/specification.md",
        content: "# Sandbox draft\n"
      },
      {} as never
    );

    expect(listResult).toEqual(
      expect.objectContaining({
        path: "/workspace/code/repo/src",
        entries: expect.arrayContaining([expect.stringMatching(/^index\.ts /)])
      })
    );
    expect(readResult).toEqual(
      expect.objectContaining({
        path: "/workspace/code/repo/src/index.ts",
        content: expect.stringContaining('export const greeting = "hello";')
      })
    );
    expect(writeResult).toEqual(
      expect.objectContaining({
        path: "/documents/specification.md",
        bytesWritten: 16
      })
    );
    expect(mocked.state.session?.files.get("/documents/specification.md")?.content).toBe(
      "# Sandbox draft\n"
    );

    const bashResult = await bashTool.execute(
      {
        command: "git status --short",
        cwd: "/workspace",
        timeoutMs: 5_000
      },
      {} as never
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
        cwd: "/workspace/runs/run-123/tasks/planning-specification",
        env: {
          KEYSTONE_FIXTURE_PROJECT: "1"
        },
        timeout: 5_000
      })
    );
  });

  it("adds only the matching save tool for each planning document type", () => {
    const specificationAgent = new PlanningDocumentAgent({} as never, createEnv() as never);
    setAgentName(specificationAgent, "tenant:tenant-fixture:run:run-123:document:specification");

    const architectureAgent = new PlanningDocumentAgent({} as never, createEnv() as never);
    setAgentName(architectureAgent, "tenant:tenant-fixture:run:run-123:document:architecture");

    const executionPlanAgent = new PlanningDocumentAgent({} as never, createEnv() as never);
    setAgentName(executionPlanAgent, "tenant:tenant-fixture:run:run-123:document:execution-plan");

    expect(Object.keys(specificationAgent.getTools()).sort()).toEqual([
      "delete",
      "edit",
      "execute",
      "find",
      "grep",
      "list",
      "read",
      "run_bash",
      "save_specification",
      "write"
    ]);
    expect(Object.keys(architectureAgent.getTools()).sort()).toEqual([
      "delete",
      "edit",
      "execute",
      "find",
      "grep",
      "list",
      "read",
      "run_bash",
      "save_architecture",
      "write"
    ]);
    expect(Object.keys(executionPlanAgent.getTools()).sort()).toEqual([
      "delete",
      "edit",
      "execute",
      "find",
      "grep",
      "list",
      "read",
      "run_bash",
      "save_execution_plan",
      "write"
    ]);
  });

  it("seeds the matching draft document into the sandbox before a turn", async () => {
    mocked.state.loadRunDocumentCurrentText.mockResolvedValueOnce({
      document: {
        documentId: "document-specification"
      },
      content: "# Draft specification\n"
    } as never);

    const agent = new PlanningDocumentAgent({} as never, createEnv() as never);
    setAgentName(agent, "tenant:tenant-fixture:run:run-123:document:specification");

    await agent.beforeTurn({} as never);

    expect(mocked.state.session?.files.get("/documents/specification.md")?.content).toBe(
      "# Draft specification\n"
    );
    expect(mocked.state.loadRunDocumentCurrentText).toHaveBeenCalledWith({
      env: expect.objectContaining({
        KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
        KEYSTONE_CHAT_COMPLETIONS_MODEL: "gpt-5.5"
      }),
      tenantId: "tenant-fixture",
      runId: "run-123",
      path: "specification"
    });
  });

  it("saves the matching draft document through the document-specific save tool", async () => {
    const agent = new PlanningDocumentAgent({} as never, createEnv() as never);
    setAgentName(agent, "tenant:tenant-fixture:run:run-123:document:specification");
    await mocked.state.session?.writeFile(
      "/documents/specification.md",
      "# Updated specification\n"
    );

    const saveTool = agent.getTools().save_specification;

    if (!saveTool?.execute) {
      throw new Error("Expected specification save tool.");
    }

    const result = await saveTool.execute(
      {
        title: "Updated specification"
      },
      {} as never
    );

    expect(mocked.state.saveRunDocumentTextRevision).toHaveBeenCalledWith({
      env: expect.objectContaining({
        KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
        KEYSTONE_CHAT_COMPLETIONS_MODEL: "gpt-5.5"
      }),
      tenantId: "tenant-fixture",
      runId: "run-123",
      path: "specification",
      kind: "specification",
      content: "# Updated specification\n",
      title: "Updated specification"
    });
    expect(result).toEqual(
      expect.objectContaining({
        documentId: "document-specification",
        documentRevisionId: "revision-specification",
        revisionNumber: 2,
        path: "specification"
      })
    );
  });
});
