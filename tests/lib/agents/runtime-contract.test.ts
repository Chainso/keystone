import { describe, expect, it } from "vitest";

import {
  DEFAULT_AGENT_FILESYSTEM_LAYOUT,
  createAgentTurnContext,
  createKeystoneThinkAgentDescriptor
} from "../../../src/maestro/agent-runtime";

describe("agent runtime contract", () => {
  it("uses the standardized filesystem projection by default", () => {
    const context = createAgentTurnContext({
      runtime: "think",
      role: "implementer",
      tenantId: "tenant-a",
      runId: "run-1",
      sessionId: "session-1"
    });

    expect(context.filesystem).toEqual(DEFAULT_AGENT_FILESYSTEM_LAYOUT);
    expect(context.capabilities).toEqual([]);
    expect(context.metadata).toEqual({});
  });

  it("describes the Think scaffold against the shared contract", () => {
    expect(createKeystoneThinkAgentDescriptor()).toEqual({
      runtime: "think",
      role: "implementer",
      filesystem: DEFAULT_AGENT_FILESYSTEM_LAYOUT
    });
  });
});
