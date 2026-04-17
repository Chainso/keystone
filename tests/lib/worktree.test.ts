import { describe, expect, it } from "vitest";

import {
  buildComponentPathSegment,
  buildComponentRepositoryPath,
  buildComponentWorktreePath,
  buildSandboxId,
  buildTaskBranchName,
  buildWorkspaceId,
  buildWorkspaceCodeRoot,
  buildWorkspaceRoot
} from "../../src/lib/workspace/worktree";

describe("workspace path helpers", () => {
  it("builds deterministic workspace identifiers and paths", () => {
    const runId = "Run/With Spaces";
    const sessionId = "de305d54-75b4-431b-adb2-eb6b9e546014";
    const workspaceRoot = buildWorkspaceRoot(runId, sessionId);

    expect(buildWorkspaceId(runId, sessionId)).toBe("workspace-run-with-spaces-de305d54");
    expect(workspaceRoot).toBe("/workspace/runs/run-with-spaces-de305d54");
    expect(buildWorkspaceCodeRoot(workspaceRoot)).toBe(
      "/workspace/runs/run-with-spaces-de305d54/code"
    );
    expect(buildComponentRepositoryPath(workspaceRoot, "API Server")).toBe(
      "/workspace/runs/run-with-spaces-de305d54/repositories/API%20Server"
    );
    expect(buildComponentWorktreePath(workspaceRoot, "API Server")).toBe(
      "/workspace/runs/run-with-spaces-de305d54/code/API%20Server"
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
