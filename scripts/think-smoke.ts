import assert from "node:assert/strict";
import { posix as path } from "node:path";

import type {
  ExecOptions,
  ExecResult,
  ExecutionSession,
  ListFilesOptions
} from "@cloudflare/sandbox";
import { generateText } from "ai";

import {
  buildImplementerSystemPrompt,
  collectStagedArtifacts,
  createImplementerTools,
  createMockImplementerModel,
  createThinkSmokePlan
} from "../src/keystone/agents/implementer/ImplementerAgent";
import { createAgentTurnContext } from "../src/maestro/agent-runtime";

class FakeExecutionSession {
  readonly id = "think-smoke";
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
      stdout: "tests ok",
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

async function main() {
  const session = new FakeExecutionSession();
  const bridge = {
    layout: {
      workspaceRoot: "/workspace",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    targets: {
      workspaceRoot: "/workspace/runs/think-smoke/tasks/task-1",
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

  await session.writeFile(
    "/workspace/runs/think-smoke/tasks/task-1/code/repo/src/greeting.js",
    'export function makeGreeting(name = "Keystone") {\n  return `Hello, ${name}.`;\n}\n'
  );
  await session.writeFile(
    "/keystone/session.json",
    JSON.stringify(
      {
        tenantId: "tenant-smoke",
        runId: "run-smoke",
        taskId: "task-1",
        sandboxId: "sandbox-smoke"
      },
      null,
      2
    )
  );
  await session.writeFile(
    "/keystone/artifacts.json",
    JSON.stringify(
      {
        count: 0,
        artifacts: []
      },
      null,
      2
    )
  );

  const context = createAgentTurnContext({
    runtime: "think",
    role: "implementer",
    tenantId: "tenant-smoke",
    runId: "run-smoke",
    sessionId: "session-smoke",
    taskId: "task-1",
    capabilities: ["read_file", "list_files", "write_file", "run_bash"],
    metadata: {
      prompt:
        "Update the greeting implementation, verify the tests from the sandbox worktree, and stage a summary note.",
      sandboxId: "sandbox-smoke",
      agentBridge: bridge,
      mockModelPlan: createThinkSmokePlan()
    }
  });

  const result = await generateText({
    model: createMockImplementerModel(createThinkSmokePlan()),
    system: buildImplementerSystemPrompt(context),
    prompt: context.metadata.prompt as string,
    tools: createImplementerTools({
      session: session as unknown as ExecutionSession,
      bridge
    })
  });
  const stagedArtifacts = await collectStagedArtifacts(
    session as unknown as ExecutionSession,
    bridge
  );

  assert.equal(stagedArtifacts.length, 1);
  assert.match(
    session.files.get("/workspace/runs/think-smoke/tasks/task-1/code/repo/src/greeting.js")?.content ?? "",
    /Hello, \${subject}\./
  );
  assert.equal(
    session.files.get("/artifacts/out/implementer-summary.md")?.content,
    "# Think Smoke\n\nUpdated `src/greeting.js` and verified the fixture tests from the sandbox worktree.\n"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        text: result.text,
        stagedArtifacts,
        bashCommand: session.execCalls[0]?.command ?? null
      },
      null,
      2
    )
  );
}

await main();
