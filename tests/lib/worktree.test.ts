import { describe, expect, it } from "vitest";

import {
  buildRepositoryPath,
  buildSandboxId,
  buildTaskBranchName,
  buildTaskWorktreePath,
  buildWorkspaceId,
  buildWorkspaceRoot
} from "../../src/lib/workspace/worktree";

describe("workspace path helpers", () => {
  it("builds deterministic workspace identifiers and paths", () => {
    const runId = "Run/With Spaces";
    const sessionId = "de305d54-75b4-431b-adb2-eb6b9e546014";
    const workspaceRoot = buildWorkspaceRoot(runId, sessionId);

    expect(buildWorkspaceId(runId, sessionId)).toBe("workspace-run-with-spaces-de305d54");
    expect(workspaceRoot).toBe("/workspace/runs/run-with-spaces-de305d54");
    expect(buildRepositoryPath(workspaceRoot)).toBe("/workspace/runs/run-with-spaces-de305d54/repo");
    expect(buildTaskWorktreePath(workspaceRoot, "Task 42")).toBe(
      "/workspace/runs/run-with-spaces-de305d54/tasks/task-42"
    );
  });

  it("produces safe sandbox ids and branch names", () => {
    const sandboxId = buildSandboxId("tenant/example", "run/alpha", "de305d54-75b4");

    expect(sandboxId).toContain("tenant-example");
    expect(sandboxId.length).toBeLessThanOrEqual(63);
    expect(sandboxId.startsWith("-")).toBe(false);
    expect(sandboxId.endsWith("-")).toBe(false);
    expect(buildTaskBranchName("Task 42 / Demo")).toBe("keystone/task-42-demo");
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
