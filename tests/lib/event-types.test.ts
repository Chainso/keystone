import { describe, expect, it } from "vitest";

import { createSessionEventEnvelope } from "../../src/lib/events/types";

describe("createSessionEventEnvelope", () => {
  it("creates a valid event envelope with defaults", () => {
    const event = createSessionEventEnvelope({
      tenantId: "tenant-a",
      runId: "run-1",
      sessionId: "de305d54-75b4-431b-adb2-eb6b9e546014",
      seq: 1,
      eventType: "session.started",
      actor: "keystone",
      severity: "info",
      payload: {
        sessionType: "run"
      }
    });

    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(event.timestamp).toMatch(/T/);
    expect(event.payload).toEqual({
      sessionType: "run"
    });
  });
});
