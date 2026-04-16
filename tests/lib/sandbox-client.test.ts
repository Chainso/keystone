import { beforeEach, describe, expect, it, vi } from "vitest";

const getSandboxMock = vi.fn();

vi.mock("@cloudflare/sandbox", () => ({
  getSandbox: getSandboxMock
}));

describe("sandbox client helpers", () => {
  beforeEach(() => {
    getSandboxMock.mockReset();
  });

  it("reuses an existing execution session before attempting to create one", async () => {
    const existingSession = { id: "session-existing" };
    const sandbox = {
      getSession: vi.fn().mockResolvedValue(existingSession),
      createSession: vi.fn()
    };
    getSandboxMock.mockReturnValue(sandbox);

    const { ensureSandboxSession } = await import("../../src/lib/sandbox/client");
    const result = await ensureSandboxSession({
      env: { SANDBOX: {} as never },
      sandboxId: "kt-demo",
      sessionId: "session-existing"
    });

    expect(result.session).toBe(existingSession);
    expect(sandbox.getSession).toHaveBeenCalledWith("session-existing");
    expect(sandbox.createSession).not.toHaveBeenCalled();
  });

  it("creates the execution session when one does not exist yet", async () => {
    const createdSession = { id: "session-created" };
    const sandbox = {
      getSession: vi.fn().mockRejectedValueOnce(new Error("missing")),
      createSession: vi.fn().mockResolvedValue(createdSession)
    };
    getSandboxMock.mockReturnValue(sandbox);

    const { ensureSandboxSession } = await import("../../src/lib/sandbox/client");
    const result = await ensureSandboxSession({
      env: { SANDBOX: {} as never },
      sandboxId: "kt-demo",
      sessionId: "session-created",
      cwd: "/workspace/demo",
      envVars: {
        KEYSTONE_MODE: "test"
      }
    });

    expect(result.session).toBe(createdSession);
    expect(sandbox.createSession).toHaveBeenCalledWith({
      id: "session-created",
      cwd: "/workspace/demo",
      env: {
        KEYSTONE_MODE: "test"
      }
    });
  });
});
