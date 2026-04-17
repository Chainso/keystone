import { describe, expect, it } from "vitest";

import {
  buildRunWorkflowInstanceId,
  buildStableSessionId,
  buildTaskWorkflowInstanceId
} from "../../src/lib/workflows/ids";

describe("workflow ids", () => {
  it("builds deterministic stable session ids", async () => {
    const first = await buildStableSessionId("run", "tenant-a", "run-1");
    const second = await buildStableSessionId("run", "tenant-a", "run-1");

    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("builds bounded workflow instance ids", () => {
    expect(buildRunWorkflowInstanceId("tenant-dev-local", "demo-run")).toMatch(/^run-/);
    expect(buildRunWorkflowInstanceId("tenant-dev-local", "demo-run").length).toBeLessThanOrEqual(63);
    expect(
      buildTaskWorkflowInstanceId("tenant-dev-local", "demo-run", "task-greeting-tone").length
    ).toBeLessThanOrEqual(63);
  });
});
