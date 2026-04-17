import type { ExecutionSession } from "@cloudflare/sandbox";
import { describe, expect, it, vi } from "vitest";

import { ensureWorkspaceMaterialized } from "../../src/lib/workspace/init";
import {
  buildComponentRepositoryPath,
  buildComponentWorktreePath,
  buildWorkspaceCodeRoot
} from "../../src/lib/workspace/worktree";

describe("project workspace materialization", () => {
  it("materializes component repositories and worktrees under the shared workspace root", async () => {
    const session = {
      exists: vi.fn(async () => ({
        exists: false
      })),
      mkdir: vi.fn(async () => undefined),
      writeFile: vi.fn(async () => undefined),
      gitCheckout: vi.fn(async () => undefined),
      exec: vi.fn(async (command: string) => {
        if (command === "git rev-parse HEAD") {
          return {
            success: true,
            exitCode: 0,
            stdout: "abc123\n",
            stderr: ""
          };
        }

        return {
          success: true,
          exitCode: 0,
          stdout: "",
          stderr: ""
        };
      })
    } as unknown as ExecutionSession;

    const workspace = await ensureWorkspaceMaterialized(session, {
      runId: "run-456",
      sessionId: "de305d54-75b4-431b-adb2-eb6b9e546014",
      taskId: "task-2",
      components: [
        {
          type: "inline",
          componentKey: "web-app",
          repoUrl: "fixture://web-app",
          repoRef: "main",
          baseRef: "main",
          files: [
            {
              path: "package.json",
              content: "{\"name\":\"web-app\"}\n"
            },
            {
              path: "src/index.ts",
              content: "export const ready = true;\n"
            }
          ]
        },
        {
          type: "git",
          componentKey: "api",
          repoUrl: "https://github.com/octocat/Hello-World.git"
        }
      ]
    });

    const workspaceRoot = "/workspace/runs/run-456-de305d54";
    const codeRoot = buildWorkspaceCodeRoot(workspaceRoot);
    const webRepositoryPath = buildComponentRepositoryPath(workspaceRoot, "web-app");
    const webWorktreePath = buildComponentWorktreePath(workspaceRoot, "web-app");
    const apiRepositoryPath = buildComponentRepositoryPath(workspaceRoot, "api");
    const apiWorktreePath = buildComponentWorktreePath(workspaceRoot, "api");

    expect(workspace.workspaceRoot).toBe(workspaceRoot);
    expect(workspace.codeRoot).toBe(codeRoot);
    expect(workspace.defaultCwd).toBe(workspaceRoot);
    expect(workspace.components).toEqual([
      expect.objectContaining({
        componentKey: "web-app",
        repositoryPath: webRepositoryPath,
        worktreePath: webWorktreePath,
        branchName: "keystone/task-2"
      }),
      expect.objectContaining({
        componentKey: "api",
        repositoryPath: apiRepositoryPath,
        worktreePath: apiWorktreePath,
        repoRef: "HEAD",
        baseRef: "HEAD",
        branchName: "keystone/task-2"
      })
    ]);
    expect(session.mkdir).toHaveBeenCalledWith(codeRoot, {
      recursive: true
    });
    expect(session.mkdir).toHaveBeenCalledWith(webRepositoryPath, {
      recursive: true
    });
    expect(session.mkdir).toHaveBeenCalledWith(`${webRepositoryPath}/src`, {
      recursive: true
    });
    expect(session.writeFile).toHaveBeenCalledWith(
      `${webRepositoryPath}/package.json`,
      "{\"name\":\"web-app\"}\n"
    );
    expect(session.writeFile).toHaveBeenCalledWith(
      `${webRepositoryPath}/src/index.ts`,
      "export const ready = true;\n"
    );
    expect(session.gitCheckout).toHaveBeenCalledWith(
      "https://github.com/octocat/Hello-World.git",
      {
        targetDir: apiRepositoryPath
      }
    );
    expect(session.exec).toHaveBeenCalledWith(
      expect.stringContaining(`git worktree add --force -B 'keystone/task-2' '${webWorktreePath}' 'main'`),
      {
        cwd: webRepositoryPath
      }
    );
    expect(session.exec).toHaveBeenCalledWith(
      expect.stringContaining(`git worktree add --force -B 'keystone/task-2' '${apiWorktreePath}' 'HEAD'`),
      {
        cwd: apiRepositoryPath
      }
    );
  });
});
