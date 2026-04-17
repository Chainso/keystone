import { posix as path } from "node:path";

import type {
  ExecOptions,
  ExecResult,
  ExecutionSession,
  ListFilesOptions
} from "@cloudflare/sandbox";
import { describe, expect, it } from "vitest";

import { execSandboxAgentBash } from "../../src/keystone/agents/tools/bash";
import {
  listSandboxAgentFiles,
  listSandboxAgentStagedOutputs,
  resolveSandboxAgentPath,
  writeSandboxAgentFile
} from "../../src/keystone/agents/tools/filesystem";
import { createAgentFilesystemLayout } from "../../src/maestro/agent-runtime";
import {
  materializeSandboxAgentBridge,
  type MaterializedWorkspace
} from "../../src/lib/workspace/init";

class FakeExecutionSession {
  readonly id = "session-fake";
  readonly files = new Map<string, { content: string; encoding: string }>();
  readonly directories = new Set<string>(["/", "/workspace", "/artifacts", "/keystone"]);
  readonly execCalls: Array<{
    command: string;
    options?: ExecOptions | undefined;
  }> = [];

  async exec(command: string, options?: ExecOptions): Promise<ExecResult> {
    this.applyCleanupCommand(command);
    this.execCalls.push({
      command,
      options
    });

    return {
      success: true,
      exitCode: 0,
      stdout: command,
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
      isBinary: file.encoding === "base64",
      mimeType: file.encoding === "base64" ? "application/octet-stream" : "text/plain",
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
      const parts = dirPath.split("/").filter(Boolean);
      let current = "";

      for (const part of parts) {
        current += `/${part}`;
        this.directories.add(current);
      }
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

  private applyCleanupCommand(command: string) {
    const deleteTargets = Array.from(command.matchAll(/find '([^']+)' -mindepth 1 -delete/g))
      .map((match) => match[1])
      .filter((targetPath): targetPath is string => Boolean(targetPath));

    for (const deleteTarget of deleteTargets) {
      this.deleteTree(deleteTarget);
    }
  }

  private deleteTree(rootPath: string) {
    for (const filePath of Array.from(this.files.keys())) {
      if (filePath.startsWith(`${rootPath}/`)) {
        this.files.delete(filePath);
      }
    }

    for (const directoryPath of Array.from(this.directories)) {
      if (directoryPath.startsWith(`${rootPath}/`)) {
        this.directories.delete(directoryPath);
      }
    }
  }

  private ensureParentDirectory(filePath: string) {
    const parentPath = filePath.slice(0, filePath.lastIndexOf("/"));

    if (parentPath) {
      const parts = parentPath.split("/").filter(Boolean);
      let current = "";

      for (const part of parts) {
        current += `/${part}`;
        this.directories.add(current);
      }
    }
  }
}

function createWorkspace(): MaterializedWorkspace {
  const layout = createAgentFilesystemLayout();
  const worktreePath = "/workspace/runs/run-123/tasks/task-1";

  return {
    workspaceId: "workspace-run-123",
    strategy: "worktree",
    repoUrl: "fixture://demo-target",
    repoRef: "main",
    baseRef: "main",
    workspaceRoot: "/workspace/runs/run-123",
    repositoryPath: "/workspace/runs/run-123/repo",
    worktreePath,
    branchName: "keystone/task-1",
    headSha: "abc123",
    agentBridge: {
      layout,
      targets: {
        ...layout,
        workspaceRoot: worktreePath
      },
      readOnlyRoots: [layout.artifactsInRoot, layout.keystoneRoot],
      writableRoots: [layout.workspaceRoot, layout.artifactsOutRoot],
      controlFiles: {
        session: `${layout.keystoneRoot}/session.json`,
        filesystem: `${layout.keystoneRoot}/filesystem.json`,
        artifacts: `${layout.keystoneRoot}/artifacts.json`
      },
      projectedArtifacts: []
    }
  };
}

async function createMaterializedBridge() {
  const session = new FakeExecutionSession();
  const workspace = createWorkspace();
  const bridge = await materializeSandboxAgentBridge(
    session as unknown as ExecutionSession,
    {
      workspace,
      tenantId: "tenant-a",
      runId: "run-123",
      sessionId: "session-123",
      taskId: "task-1",
      sandboxId: "sandbox-123",
      artifacts: [
        {
          artifactRefId: "artifact-1",
          kind: "task_handoff",
          contentType: "application/json",
          storageUri: "r2://keystone-artifacts-dev/tenants/tenant-a/runs/run-123/task-handoff.json",
          body: "{\"summary\":\"bridge smoke\"}",
          metadata: {
            key: "tenants/tenant-a/runs/run-123/task-handoff.json"
          }
        }
      ]
    }
  );

  return {
    session,
    bridge
  };
}

describe("sandbox agent bridge", () => {
  it("materializes control files and projected artifacts", async () => {
    const { session, bridge } = await createMaterializedBridge();

    const sessionJson = await session.readFile(bridge.controlFiles.session);
    const artifactManifest = await session.readFile(bridge.controlFiles.artifacts);

    expect(JSON.parse(sessionJson.content)).toMatchObject({
      tenantId: "tenant-a",
      runId: "run-123",
      taskId: "task-1"
    });
    expect(JSON.parse(artifactManifest.content)).toMatchObject({
      count: 1
    });
    expect(bridge.projectedArtifacts[0]?.projectedPath).toMatch(/^\/artifacts\/in\//);
    expect(session.files.has(bridge.projectedArtifacts[0]!.projectedPath)).toBe(true);
  });

  it("maps workspace writes onto the real task worktree and lists staged outputs", async () => {
    const { session, bridge } = await createMaterializedBridge();

    await writeSandboxAgentFile(
      {
        session: session as unknown as ExecutionSession,
        bridge
      },
      "/workspace/src/index.ts",
      "export const value = 1;\n"
    );
    await writeSandboxAgentFile(
      {
        session: session as unknown as ExecutionSession,
        bridge
      },
      "/artifacts/out/report.md",
      "# done\n"
    );

    expect(
      session.files.get("/workspace/runs/run-123/tasks/task-1/src/index.ts")?.content
    ).toContain("value = 1");

    const stagedOutputs = await listSandboxAgentStagedOutputs({
      session: session as unknown as ExecutionSession,
      bridge
    });

    expect(stagedOutputs).toHaveLength(1);
    expect(stagedOutputs[0]?.absolutePath).toBe("/artifacts/out/report.md");

    const listedWorkspaceFiles = await listSandboxAgentFiles(
      {
        session: session as unknown as ExecutionSession,
        bridge
      },
      "/workspace/src",
      {
        recursive: true
      }
    );

    expect(listedWorkspaceFiles.files[0]?.absolutePath).toBe("/workspace/src/index.ts");
  });

  it("rejects writes to read-only roots and resolves workspace paths through the bridge", async () => {
    const { session, bridge } = await createMaterializedBridge();
    const resolvedPath = resolveSandboxAgentPath(bridge, "/workspace/package.json");

    expect(resolvedPath.sandboxPath).toBe("/workspace/runs/run-123/tasks/task-1/package.json");
    await expect(
      writeSandboxAgentFile(
        {
          session: session as unknown as ExecutionSession,
          bridge
        },
        "/artifacts/in/locked.txt",
        "nope"
      )
    ).rejects.toThrow(/Writes are not allowed/);
    await expect(
      writeSandboxAgentFile(
        {
          session: session as unknown as ExecutionSession,
          bridge
        },
        "/keystone/state.txt",
        "nope"
      )
    ).rejects.toThrow(/Writes are not allowed/);
  });

  it("rewrites bash commands and cwd onto the real sandbox targets", async () => {
    const { session, bridge } = await createMaterializedBridge();
    const result = await execSandboxAgentBash(
      {
        session: session as unknown as ExecutionSession,
        bridge
      },
      {
        command: "cat /workspace/src/index.ts && ls /artifacts/in",
        cwd: "/workspace/src",
        timeout: 5000
      }
    );

    expect(result.cwd).toBe("/workspace/runs/run-123/tasks/task-1/src");
    expect(result.resolvedCommand).toContain(
      "/workspace/runs/run-123/tasks/task-1/src/index.ts"
    );
    expect(result.resolvedCommand).toContain("/artifacts/in");
    expect(session.execCalls.at(-1)?.options?.timeout).toBe(5000);
  });

  it("clears stale staged outputs when the bridge is materialized again", async () => {
    const session = new FakeExecutionSession();
    const workspace = createWorkspace();
    const firstBridge = await materializeSandboxAgentBridge(
      session as unknown as ExecutionSession,
      {
        workspace,
        tenantId: "tenant-a",
        runId: "run-123",
        sessionId: "session-123",
        taskId: "task-1",
        sandboxId: "sandbox-123",
        artifacts: []
      }
    );

    await writeSandboxAgentFile(
      {
        session: session as unknown as ExecutionSession,
        bridge: firstBridge
      },
      "/artifacts/out/stale-output.md",
      "stale\n"
    );

    await materializeSandboxAgentBridge(session as unknown as ExecutionSession, {
      workspace,
      tenantId: "tenant-a",
      runId: "run-123",
      sessionId: "session-123",
      taskId: "task-1",
      sandboxId: "sandbox-123",
      artifacts: []
    });

    const stagedOutputs = await listSandboxAgentStagedOutputs({
      session: session as unknown as ExecutionSession,
      bridge: firstBridge
    });

    expect(stagedOutputs).toHaveLength(0);
    expect(session.files.has("/artifacts/out/stale-output.md")).toBe(false);
  });
});
