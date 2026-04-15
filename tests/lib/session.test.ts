import { describe, expect, it } from "vitest";

import {
  assertSessionStatusTransition,
  buildConfiguredSession,
  canTransitionSessionStatus
} from "../../src/maestro/session";

describe("maestro session helpers", () => {
  it("builds configured sessions by default", () => {
    const session = buildConfiguredSession({
      tenantId: "tenant-a",
      runId: "run-1",
      sessionType: "run"
    });

    expect(session.status).toBe("configured");
    expect(session.tenantId).toBe("tenant-a");
  });

  it("enforces lifecycle transitions", () => {
    expect(canTransitionSessionStatus("configured", "provisioning")).toBe(true);
    expect(() => assertSessionStatusTransition("configured", "archived")).not.toThrow();
    expect(() => assertSessionStatusTransition("configured", "active")).toThrow(
      /Invalid session status transition/
    );
  });
});
