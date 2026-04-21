import { posix as path } from "node:path";

import type {
  ExecOptions,
  ExecResult,
  ExecutionSession,
  ListFilesOptions
} from "@cloudflare/sandbox";
import { generateText } from "ai";
import { describe, expect, it } from "vitest";

import {
  buildSynthesizedRunNote,
  buildImplementerSystemPrompt,
  collectStagedArtifacts,
  createImplementerTools,
  createMockImplementerModel,
  ensureStagedRunNoteArtifact,
  resolveImplementerTurnSummary
} from "../../../src/keystone/agents/implementer/ImplementerAgent";
import { createAgentTurnContext } from "../../../src/maestro/agent-runtime";

class FakeExecutionSession {
  readonly id = "implementer-agent-test";
  readonly files = new Map<string, { content: string; encoding: string }>();
  readonly directories = new Set<string>(["/", "/workspace", "/artifacts", "/keystone"]);
  readonly execCalls: Array<{
    command: string;
    options?: ExecOptions | undefined;
  }> = [];

  async exec(command: string, options?: ExecOptions): Promise<ExecResult> {
    this.execCalls.push({
      command,
      options
    });

    return {
      success: true,
      exitCode: 0,
      stdout: "ok",
      stderr: "",
      command,
      duration: 0,
      timestamp: new Date().toISOString()
    };
  }

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

  async mkdir(
    dirPath: string,
    options?: {
      recursive?: boolean | undefined;
    }
  ) {
    if (options?.recursive) {
      this.ensureParentDirectory(`${dirPath}/placeholder`);
    }

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

  async listFiles(targetPath: string, options?: ListFilesOptions) {
    const normalizedRoot = targetPath === "/" ? "/" : targetPath.replace(/\/+$/, "");
    const files = Array.from(this.files.entries())
      .filter(([absolutePath]) => {
        if (absolutePath === normalizedRoot) {
          return true;
        }

        if (!absolutePath.startsWith(`${normalizedRoot}/`)) {
          return false;
        }

        if (options?.recursive) {
          return true;
        }

        return !absolutePath.slice(normalizedRoot.length + 1).includes("/");
      })
      .map(([absolutePath, file]) => ({
        name: absolutePath.split("/").at(-1) ?? absolutePath,
        absolutePath,
        relativePath: path.relative(normalizedRoot, absolutePath),
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

  private ensureParentDirectory(filePath: string) {
    const parentPath = filePath.slice(0, filePath.lastIndexOf("/"));

    if (!parentPath) {
      return;
    }

    const parts = parentPath.split("/").filter(Boolean);
    let current = "";

    for (const part of parts) {
      current += `/${part}`;
      this.directories.add(current);
    }
  }
}

function createBridge() {
  return {
    layout: {
      workspaceRoot: "/workspace",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    targets: {
      workspaceRoot: "/workspace/runs/run-123/tasks/task-1",
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

describe("implementer agent helpers", () => {
  it("builds a role prompt from the bridge control files and task prompt", () => {
    const context = createAgentTurnContext({
      runtime: "think",
      role: "implementer",
      tenantId: "tenant-a",
      runId: "run-123",
      sessionId: "session-123",
      taskId: "task-1",
      metadata: {
        prompt: "Update the greeting and stage a summary.",
        sandboxId: "sandbox-123",
        agentBridge: createBridge()
      }
    });

    expect(buildImplementerSystemPrompt(context)).toContain("/keystone/session.json");
    expect(buildImplementerSystemPrompt(context)).toContain("run planning documents");
    expect(buildImplementerSystemPrompt(context)).toContain("/artifacts/out");
    expect(buildImplementerSystemPrompt(context)).toContain("Update the greeting and stage a summary.");
  });

  it("wires write and bash tools through the sandbox bridge and records events", async () => {
    const session = new FakeExecutionSession();
    const events: Array<{ eventType: string; payload: Record<string, unknown> }> = [];
    const bridge = createBridge();
    const tools = createImplementerTools({
      session: session as unknown as ExecutionSession,
      bridge,
      recordEvent: async (event) => {
        events.push({
          eventType: event.eventType,
          payload: event.payload
        });
      }
    });
    const writeTool = tools.write_file;
    const bashTool = tools.run_bash;

    if (!writeTool?.execute || !bashTool?.execute) {
      throw new Error("Expected implementer toolset to expose write_file and run_bash.");
    }

    await writeTool.execute(
      {
        path: "/workspace/src/greeting.js",
        content: 'export const greeting = "hello";\n'
      },
      {} as never
    );
    await bashTool.execute(
      {
        command: "node --test",
        cwd: "/workspace"
      },
      {} as never
    );
    await writeTool.execute(
      {
        path: "/artifacts/out/summary.md",
        content: "# summary\n"
      },
      {} as never
    );

    const stagedArtifacts = await collectStagedArtifacts(
      session as unknown as ExecutionSession,
      bridge
    );

    expect(
      session.files.get("/workspace/runs/run-123/tasks/task-1/src/greeting.js")?.content
    ).toContain("greeting");
    expect(session.execCalls[0]?.options?.cwd).toBe("/workspace/runs/run-123/tasks/task-1");
    expect(stagedArtifacts).toEqual([
      expect.objectContaining({
        path: "/artifacts/out/summary.md",
        kind: "run_note"
      })
    ]);
    expect(events.map((event) => event.eventType)).toEqual([
      "agent.tool_call",
      "agent.tool_result",
      "agent.tool_call",
      "agent.tool_result",
      "agent.tool_call",
      "agent.tool_result"
    ]);
  });

  it("supports a deterministic multi-step tool plan", async () => {
    const session = new FakeExecutionSession();

    const result = await generateText({
      model: createMockImplementerModel([
        {
          type: "tool-calls",
          calls: [
            {
              toolName: "write_file",
              input: {
                path: "/artifacts/out/summary.md",
                content: "# done\n"
              }
            }
          ]
        },
        {
          type: "text",
          text: "done"
        }
      ]),
      system: "test",
      prompt: "Do the work.",
      tools: createImplementerTools({
        session: session as unknown as ExecutionSession,
        bridge: createBridge()
      })
    });

    expect(result.steps).toHaveLength(1);
    expect(session.files.get("/artifacts/out/summary.md")?.content).toBe("# done\n");
  });

  it("synthesizes a run_note when the turn staged no markdown artifact", async () => {
    const session = new FakeExecutionSession();
    const bridge = createBridge();
    const stagedArtifacts = await ensureStagedRunNoteArtifact(
      session as unknown as ExecutionSession,
      bridge,
      resolveImplementerTurnSummary("Completed the live task.")
    );

    expect(session.files.get("/artifacts/out/keystone-think-run-note.md")?.content).toBe(
      buildSynthesizedRunNote("Completed the live task.")
    );
    expect(stagedArtifacts).toEqual([
      expect.objectContaining({
        path: "/artifacts/out/keystone-think-run-note.md",
        kind: "run_note"
      })
    ]);
  });

  it("falls back to the default summary when assistant text is empty", () => {
    expect(resolveImplementerTurnSummary("   ")).toBe(
      "Implementer turn completed without assistant text."
    );
  });
});
