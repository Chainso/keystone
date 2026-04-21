import { describe, expect, it } from "vitest";

import {
  buildComponentPathSegment,
  buildComponentRepositoryPath,
  buildComponentWorktreePath,
  buildSandboxId,
  buildTaskBranchName,
  buildTaskWorkspaceTargetPathWithIdentity,
  buildWorkspaceId,
  buildWorkspaceCodeRootWithIdentity,
  buildWorkspaceRoot
} from "../../src/lib/workspace/worktree";

describe("workspace path helpers", () => {
  it("builds deterministic workspace identifiers and paths", () => {
    const runId = "Run/With Spaces";
    const taskId = "Task 42 / Demo";
    const runTaskId = "run-task-123";
    const workspaceRoot = buildWorkspaceRoot(runId);
    const taskWorkspaceRoot = buildTaskWorkspaceTargetPathWithIdentity(
      workspaceRoot,
      taskId,
      runTaskId
    );

    expect(buildWorkspaceId(runId)).toBe("workspace-run-with-spaces");
    expect(workspaceRoot).toBe("/workspace/runs/run-with-spaces");
    expect(taskWorkspaceRoot).toBe("/workspace/runs/run-with-spaces/tasks/task-42-demo-run-task");
    expect(buildWorkspaceCodeRootWithIdentity(workspaceRoot, taskId, runTaskId)).toBe(
      "/workspace/runs/run-with-spaces/tasks/task-42-demo-run-task/code"
    );
    expect(buildComponentRepositoryPath(workspaceRoot, "API Server")).toBe(
      "/workspace/runs/run-with-spaces/repositories/API%20Server"
    );
    expect(buildComponentWorktreePath(workspaceRoot, taskId, runTaskId, "API Server")).toBe(
      "/workspace/runs/run-with-spaces/tasks/task-42-demo-run-task/code/API%20Server"
    );
  });

  it("encodes component path segments without collapsing distinct keys", () => {
    expect(buildComponentPathSegment("api server")).toBe("api%20server");
    expect(buildComponentPathSegment("api/server")).toBe("api%2Fserver");
    expect(buildComponentPathSegment(".")).toBe("%2E");
    expect(buildComponentPathSegment("api server")).not.toBe(
      buildComponentPathSegment("api/server")
    );
  });

  it("produces safe sandbox ids and branch names", () => {
    const sandboxId = buildSandboxId("tenant/example", "run/alpha", "de305d54-75b4");

    expect(sandboxId).toContain("tenant-example");
    expect(sandboxId.length).toBeLessThanOrEqual(63);
    expect(sandboxId.startsWith("-")).toBe(false);
    expect(sandboxId.endsWith("-")).toBe(false);
    expect(buildTaskBranchName("Task 42 / Demo", "run-task-123")).toBe(
      "keystone/task-42-demo-run-task"
    );
  });

  it("trims sandbox ids safely when the slug hits the DNS length limit", () => {
    const sandboxId = buildSandboxId(
      "tenant-example",
      "run-alpha-with-a-name-that-is-long-enough-to-force-a-trailing-hyphen-cutoff",
      "de305d54-75b4-431b-adb2-eb6b9e546014"
    );

    expect(sandboxId.length).toBeLessThanOrEqual(63);
    expect(sandboxId.startsWith("-")).toBe(false);
    expect(sandboxId.endsWith("-")).toBe(false);
  });
});
