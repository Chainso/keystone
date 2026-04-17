import type { ExecutionSession } from "@cloudflare/sandbox";
import { describe, expect, it, vi } from "vitest";

import { ensureWorkspaceMaterialized } from "../../src/lib/workspace/init";

describe("project workspace materialization", () => {
  it("materializes multiple code components into the shared /workspace/code layout", async () => {
    const session = {
      exists: vi.fn(async (targetPath: string) => ({
        exists: targetPath.endsWith("/.git") ? false : false
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

    expect(workspace.workspaceRoot).toBe("/workspace/runs/run-456-de305d54");
    expect(workspace.codeRoot).toBe("/workspace/runs/run-456-de305d54/code");
    expect(workspace.defaultCwd).toBe("/workspace/runs/run-456-de305d54");
    expect(workspace.components.map((component) => component.componentKey)).toEqual([
      "web-app",
      "api"
    ]);
    expect(workspace.components[0]).toMatchObject({
      repositoryPath: "/workspace/runs/run-456-de305d54/repositories/web-app",
      worktreePath: "/workspace/runs/run-456-de305d54/code/web-app",
      branchName: "keystone/task-2"
    });
    expect(workspace.components[1]).toMatchObject({
      repositoryPath: "/workspace/runs/run-456-de305d54/repositories/api",
      worktreePath: "/workspace/runs/run-456-de305d54/code/api",
      repoRef: "HEAD",
      baseRef: "HEAD",
      branchName: "keystone/task-2"
    });
    expect(session.gitCheckout).toHaveBeenCalledWith(
      "https://github.com/octocat/Hello-World.git",
      {
        targetDir: "/workspace/runs/run-456-de305d54/repositories/api"
      }
    );
  });
});
