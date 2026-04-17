import type { ExecutionSession } from "@cloudflare/sandbox";
import { describe, expect, it, vi } from "vitest";

import { ensureTaskWorktree } from "../../src/lib/workspace/git";

describe("ensureTaskWorktree", () => {
  it("reuses an existing worktree only when it still matches the repository and branch", async () => {
    const session = {
      exists: vi.fn(async () => ({
        exists: true
      })),
      exec: vi.fn(async (command: string) => {
        if (command === "git rev-parse --is-inside-work-tree") {
          return {
            success: true,
            exitCode: 0,
            stdout: "true\n",
            stderr: ""
          };
        }

        if (command === "git rev-parse --path-format=absolute --git-common-dir") {
          return {
            success: true,
            exitCode: 0,
            stdout: "/workspace/runs/demo/repositories/repo/.git\n",
            stderr: ""
          };
        }

        if (command === "git symbolic-ref --quiet --short HEAD") {
          return {
            success: true,
            exitCode: 0,
            stdout: "keystone/task-1\n",
            stderr: ""
          };
        }

        if (command === "git rev-parse --verify 'main'^{commit}") {
          return {
            success: true,
            exitCode: 0,
            stdout: "abc123\n",
            stderr: ""
          };
        }

        throw new Error(`Unexpected command: ${command}`);
      })
    } as unknown as ExecutionSession;

    await ensureTaskWorktree(session, {
      repositoryPath: "/workspace/runs/demo/repositories/repo",
      worktreePath: "/workspace/runs/demo/code/repo",
      branchName: "keystone/task-1",
      baseRef: "main"
    });

    expect(session.exec).not.toHaveBeenCalledWith(
      expect.stringContaining("git worktree add"),
      expect.anything()
    );
  });

  it("recreates a stale worktree when the existing .git points at the wrong checkout", async () => {
    const session = {
      exists: vi.fn(async () => ({
        exists: true
      })),
      exec: vi.fn(async (command: string) => {
        if (command === "git rev-parse --is-inside-work-tree") {
          return {
            success: true,
            exitCode: 0,
            stdout: "true\n",
            stderr: ""
          };
        }

        if (command === "git rev-parse --path-format=absolute --git-common-dir") {
          return {
            success: true,
            exitCode: 0,
            stdout: "/tmp/stale-repo/.git\n",
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

    await ensureTaskWorktree(session, {
      repositoryPath: "/workspace/runs/demo/repositories/repo",
      worktreePath: "/workspace/runs/demo/code/repo",
      branchName: "keystone/task-1",
      baseRef: "main"
    });

    expect(session.exec).toHaveBeenCalledWith(
      expect.stringContaining("rm -rf '/workspace/runs/demo/code/repo'"),
      {}
    );
    expect(session.exec).toHaveBeenCalledWith("git worktree prune", {
      cwd: "/workspace/runs/demo/repositories/repo"
    });
    expect(session.exec).toHaveBeenCalledWith(
      expect.stringContaining(
        "git worktree add --force -B 'keystone/task-1' '/workspace/runs/demo/code/repo' 'main'"
      ),
      {
        cwd: "/workspace/runs/demo/repositories/repo"
      }
    );
  });
});
