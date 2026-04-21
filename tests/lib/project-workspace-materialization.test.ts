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
      taskId: "task-2",
      runTaskId: "run-task-456",
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

    const workspaceRoot = "/workspace/runs/run-456";
    const codeRoot = "/workspace/runs/run-456/tasks/task-2-run-task/code";
    const webRepositoryPath = buildComponentRepositoryPath(workspaceRoot, "web-app");
    const webWorktreePath = buildComponentWorktreePath(
      workspaceRoot,
      "task-2",
      "run-task-456",
      "web-app"
    );
    const apiRepositoryPath = buildComponentRepositoryPath(workspaceRoot, "api");
    const apiWorktreePath = buildComponentWorktreePath(
      workspaceRoot,
      "task-2",
      "run-task-456",
      "api"
    );

    expect(workspace.workspaceRoot).toBe(workspaceRoot);
    expect(workspace.workspaceTargetPath).toBe("/workspace/runs/run-456/tasks/task-2-run-task");
    expect(workspace.codeRoot).toBe(codeRoot);
    expect(workspace.defaultCwd).toBe("/workspace/runs/run-456/tasks/task-2-run-task");
    expect(workspace.components).toEqual([
      expect.objectContaining({
        componentKey: "web-app",
        repositoryPath: webRepositoryPath,
        worktreePath: webWorktreePath,
        branchName: "keystone/task-2-run-task"
      }),
      expect.objectContaining({
        componentKey: "api",
        repositoryPath: apiRepositoryPath,
        worktreePath: apiWorktreePath,
        repoRef: "HEAD",
        baseRef: "HEAD",
        branchName: "keystone/task-2-run-task"
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
      expect.stringContaining(
        `git worktree add --force -B 'keystone/task-2-run-task' '${webWorktreePath}' 'main'`
      ),
      {
        cwd: webRepositoryPath
      }
    );
    expect(session.exec).toHaveBeenCalledWith(
      expect.stringContaining(
        `git worktree add --force -B 'keystone/task-2-run-task' '${apiWorktreePath}' 'HEAD'`
      ),
      {
        cwd: apiRepositoryPath
      }
    );
  });
});
