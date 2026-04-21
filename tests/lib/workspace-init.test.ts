import type { ExecutionSession } from "@cloudflare/sandbox";
import { describe, expect, it, vi } from "vitest";

import { ensureWorkspaceMaterialized } from "../../src/lib/workspace/init";

describe("ensureWorkspaceMaterialized", () => {
  it("uses the remote default branch for git sources without an explicit ref", async () => {
    const session = {
      exists: vi.fn(async () => ({
        exists: false
      })),
      mkdir: vi.fn(async () => undefined),
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
      runId: "run-123",
      taskId: "task-1",
      runTaskId: "run-task-123",
      source: {
        type: "git",
        repoUrl: "https://github.com/octocat/Hello-World.git"
      }
    });

    expect(session.gitCheckout).toHaveBeenCalledWith(
      "https://github.com/octocat/Hello-World.git",
      {
        targetDir: "/workspace/runs/run-123/repositories/repo"
      }
    );
    expect(workspace.repoRef).toBe("HEAD");
    expect(workspace.baseRef).toBe("HEAD");
    expect(workspace.defaultComponentKey).toBe("repo");
    expect(workspace.workspaceRoot).toBe("/workspace/runs/run-123");
    expect(workspace.workspaceTargetPath).toBe("/workspace/runs/run-123/tasks/task-1-run-task");
    expect(workspace.worktreePath).toBe("/workspace/runs/run-123/tasks/task-1-run-task/code/repo");
    expect(workspace.defaultCwd).toBe("/workspace/runs/run-123/tasks/task-1-run-task/code/repo");
  });
});
