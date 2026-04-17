import assert from "node:assert/strict";
import { posix as path } from "node:path";

import type {
  ExecOptions,
  ExecResult,
  ExecutionSession,
  ListFilesOptions
} from "@cloudflare/sandbox";

import { execSandboxAgentBash } from "../src/keystone/agents/tools/bash";
import {
  listSandboxAgentStagedOutputs,
  writeSandboxAgentFile
} from "../src/keystone/agents/tools/filesystem";
import { createAgentFilesystemLayout } from "../src/maestro/agent-runtime";
import {
  materializeSandboxAgentBridge,
  type MaterializedWorkspace
} from "../src/lib/workspace/init";

class FakeExecutionSession {
  readonly id = "sandbox-smoke";
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
  const worktreePath = "/workspace/runs/smoke/tasks/task-1";

  return {
    workspaceId: "workspace-smoke",
    strategy: "worktree",
    repoUrl: "fixture://demo-target",
    repoRef: "main",
    baseRef: "main",
    workspaceRoot: "/workspace/runs/smoke",
    repositoryPath: "/workspace/runs/smoke/repo",
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

async function main() {
  const session = new FakeExecutionSession();
  const workspace = createWorkspace();
  const bridge = await materializeSandboxAgentBridge(
    session as unknown as ExecutionSession,
    {
      workspace,
      tenantId: "tenant-smoke",
      runId: "run-smoke",
      sessionId: "session-smoke",
      taskId: "task-smoke",
      sandboxId: "sandbox-smoke",
      artifacts: [
        {
          artifactRefId: "artifact-smoke",
          kind: "task_handoff",
          contentType: "application/json",
          storageUri: "r2://keystone-artifacts-dev/tenants/tenant-smoke/runs/run-smoke/task-handoff.json",
          body: "{\"summary\":\"sandbox smoke\"}",
          metadata: {
            key: "tenants/tenant-smoke/runs/run-smoke/task-handoff.json"
          }
        }
      ]
    }
  );

  await writeSandboxAgentFile(
    {
      session: session as unknown as ExecutionSession,
      bridge
    },
    "/workspace/src/index.ts",
    "export const smoke = true;\n"
  );
  await writeSandboxAgentFile(
    {
      session: session as unknown as ExecutionSession,
      bridge
    },
    "/artifacts/out/summary.md",
    "# sandbox smoke\n"
  );

  const bashResult = await execSandboxAgentBash(
    {
      session: session as unknown as ExecutionSession,
      bridge
    },
    {
      command: "cat /workspace/src/index.ts && ls /artifacts/in",
      cwd: "/workspace/src"
    }
  );
  const stagedOutputs = await listSandboxAgentStagedOutputs({
    session: session as unknown as ExecutionSession,
    bridge
  });

  assert.equal(
    session.files.get("/workspace/runs/smoke/tasks/task-1/src/index.ts")?.content,
    "export const smoke = true;\n"
  );
  assert.equal(stagedOutputs.length, 1);
  assert.match(bashResult.resolvedCommand, /\/workspace\/runs\/smoke\/tasks\/task-1\/src\/index.ts/);
  assert.equal(
    JSON.parse(session.files.get("/keystone/artifacts.json")?.content ?? "{}").count,
    1
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        projectedArtifacts: bridge.projectedArtifacts.length,
        stagedOutputs: stagedOutputs.map((file) => file.absolutePath),
        resolvedCommand: bashResult.resolvedCommand
      },
      null,
      2
    )
  );
}

await main();
