import { describe, expect, it } from "vitest";

import { parseRunInput } from "../../src/http/contracts/run-input";

describe("runInputSchema", () => {
  it("accepts an explicit execution engine", () => {
    const parsed = parseRunInput({
      executionEngine: "think_live"
    });

    expect(parsed.executionEngine).toBe("think_live");
  });

  it("defaults execution_engine to scripted", () => {
    const parsed = parseRunInput({});

    expect(parsed.executionEngine).toBe("scripted");
  });

  it("rejects invalid execution_engine values", () => {
    expect(() =>
      parseRunInput({
        executionEngine: "invalid"
      })
    ).toThrow(/Invalid option/);
  });

  it("rejects legacy runtime and thinkMode fields", () => {
    expect(() =>
      parseRunInput({
        runtime: "think",
        thinkMode: "live"
      })
    ).toThrow(/Unrecognized key/);
  });
});
