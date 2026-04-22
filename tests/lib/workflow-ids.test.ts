import { describe, expect, it } from "vitest";

import {
  buildRunWorkflowInstanceId,
  buildStableRunTaskId,
  buildStableSessionId,
  buildTaskWorkflowInstanceId
} from "../../src/lib/workflows/ids";
import {
  parseExecutionEngine,
  resolveRunExecutionEngine
} from "../../src/lib/runs/options";

describe("workflow ids", () => {
  it("builds deterministic stable session ids", async () => {
    const first = await buildStableSessionId("run", "tenant-a", "run-1");
    const second = await buildStableSessionId("run", "tenant-a", "run-1");

    expect(first).toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("builds deterministic stable run task ids", async () => {
    const first = await buildStableRunTaskId("tenant-a", "run-1", "task-greeting-tone");
    const second = await buildStableRunTaskId("tenant-a", "run-1", "task-greeting-tone");

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

  it("parses supported execution engine values", () => {
    expect(parseExecutionEngine("think_live")).toBe("think_live");
    expect(parseExecutionEngine("think_mock")).toBe("think_mock");
    expect(parseExecutionEngine("scripted")).toBe("scripted");
    expect(parseExecutionEngine("invalid")).toBeNull();
  });

  it("prefers persisted execution engine values and defaults to think_live", () => {
    expect(resolveRunExecutionEngine("think_live")).toBe("think_live");
    expect(resolveRunExecutionEngine("scripted")).toBe("scripted");
    expect(resolveRunExecutionEngine("think_mock")).toBe("think_mock");
    expect(resolveRunExecutionEngine(undefined, "think_mock")).toBe("think_mock");
    expect(resolveRunExecutionEngine("think_live", "scripted")).toBe("scripted");
    expect(resolveRunExecutionEngine(undefined)).toBe("think_live");
  });
});
