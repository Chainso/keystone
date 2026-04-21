import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  class FakeExecutionSession {
    readonly files = new Map<string, { content: string; encoding: string }>();
    readonly directories = new Set<string>(["/", "/workspace", "/artifacts", "/artifacts/out", "/keystone"]);

    async writeFile(
      filePath: string,
      content: string,
      options?: {
        encoding?: string | undefined;
      }
    ) {
      this.files.set(filePath, {
        content,
        encoding: options?.encoding ?? "utf-8"
      });

      return {
        success: true,
        path: filePath,
        timestamp: new Date().toISOString()
      };
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
      this.directories.add(dirPath);

      return {
        success: true,
        path: dirPath,
        timestamp: new Date().toISOString()
      };
    }

    async exists(targetPath: string) {
      return {
        success: true,
        path: targetPath,
        exists: this.files.has(targetPath) || this.directories.has(targetPath),
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
  }

  const state = {
    session: null as InstanceType<typeof FakeExecutionSession> | null,
    close: vi.fn(async () => undefined),
    ensureThinkRpcInitialization: vi.fn(async () => undefined),
    ensureSandboxSession: vi.fn(async () => ({
      session: state.session
    })),
    getSessionRecord: vi.fn(async () => ({
      status: "ready",
      metadata: {}
    })),
    updateSessionStatus: vi.fn(async () => undefined)
  };

  return {
    FakeExecutionSession,
    state
  };
});

vi.mock("@cloudflare/think", () => ({
  Think: class Think<Env = unknown> {
    env: Env;

    constructor(_state: unknown, env: Env) {
      this.env = env;
    }

    async chat() {
      return undefined;
    }
  }
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn()
  }))
}));

vi.mock("ai", () => ({
  generateText: vi.fn()
}));

vi.mock("../../../src/keystone/agents/base/think-rpc", () => ({
  ensureThinkRpcInitialization: mocked.state.ensureThinkRpcInitialization
}));

vi.mock("../../../src/lib/sandbox/client", () => ({
  ensureSandboxSession: mocked.state.ensureSandboxSession
}));

vi.mock("../../../src/lib/db/runs", () => ({
  getSessionRecord: mocked.state.getSessionRecord,
  updateSessionStatus: mocked.state.updateSessionStatus
}));

const { KeystoneThinkAgent } = await import("../../../src/keystone/agents/base/KeystoneThinkAgent");
const { createAgentTurnContext } = await import("../../../src/maestro/agent-runtime");

function createBridge() {
  return {
    layout: {
      workspaceRoot: "/workspace",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    targets: {
      workspaceRoot: "/workspace/task",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    readOnlyRoots: ["/artifacts/in", "/keystone"],
    writableRoots: ["/workspace", "/artifacts/out"],
    controlFiles: {
      session: "/keystone/session.json",
      filesystem: "/keystone/filesystem.json",
      artifacts: "/keystone/artifacts.json"
    },
    projectedArtifacts: []
  };
}

function createEnv() {
  return {
    KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
    KEYSTONE_CHAT_COMPLETIONS_MODEL: "gpt-5.4"
  };
}

describe("KeystoneThinkAgent live boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.state.session = new mocked.FakeExecutionSession();
  });

  it("synthesizes a run_note when a live turn finishes with empty assistant text and no staged files", async () => {
    const agent = new KeystoneThinkAgent({} as never, createEnv() as never);
    const chatSpy = vi.spyOn(agent as { chat: (...args: unknown[]) => Promise<void> }, "chat");

    chatSpy.mockImplementation(async () => {
      await agent.onChatResponse({
        message: {
          parts: [
            {
              type: "text",
              text: ""
            }
          ]
        },
        requestId: "live-empty",
        continuation: false,
        status: "completed"
      });
    });

    const result = await agent.executeTurn(
      createAgentTurnContext({
        runtime: "think",
        role: "implementer",
        tenantId: "tenant-a",
        runId: "run-123",
        sessionId: "session-123",
        taskId: "task-1",
        capabilities: ["read_file", "list_files", "write_file", "run_bash"],
        metadata: {
          prompt: "Do the work.",
          sandboxId: "sandbox-123",
          agentBridge: createBridge()
        }
      })
    );

    expect(result.outcome).toBe("completed");
    expect(result.summary).toBe("Implementer turn completed without assistant text.");
    expect(result.stagedArtifacts).toEqual([
      expect.objectContaining({
        path: "/artifacts/out/keystone-think-run-note.md",
        kind: "run_note"
      })
    ]);
    expect(
      mocked.state.session?.files.get("/artifacts/out/keystone-think-run-note.md")?.content
    ).toContain("Implementer turn completed without assistant text.");
    expect(result.events).toContainEqual(
      expect.objectContaining({
        eventType: "agent.turn.completed",
        payload: expect.objectContaining({
          summary: "Implementer turn completed without assistant text."
        })
      })
    );
  });
});
