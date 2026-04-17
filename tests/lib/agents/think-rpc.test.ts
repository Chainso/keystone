import { describe, expect, it, vi } from "vitest";

import { ensureThinkRpcInitialization } from "../../../src/keystone/agents/base/think-rpc";

describe("ensureThinkRpcInitialization", () => {
  it("forces PartyServer initialization when the hook is present", async () => {
    const ensureInitialized = vi.fn(async () => undefined);

    await ensureThinkRpcInitialization({
      __unsafe_ensureInitialized: ensureInitialized
    });

    expect(ensureInitialized).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the runtime does not expose the hook", async () => {
    await expect(ensureThinkRpcInitialization({})).resolves.toBeUndefined();
  });
});
