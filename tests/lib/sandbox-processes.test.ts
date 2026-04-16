import { describe, expect, it } from "vitest";

import {
  applyProcessLogDelta,
  createEmptyProcessLogCursor,
  isTerminalProcessStatus
} from "../../src/lib/sandbox/processes";

describe("sandbox process helpers", () => {
  it("extracts only new stdout and stderr chunks", () => {
    const firstDelta = applyProcessLogDelta(
      {
        stdout: "line one\nline two\n",
        stderr: "warn one\n"
      },
      createEmptyProcessLogCursor()
    );

    expect(firstDelta.stdout).toBe("line one\nline two\n");
    expect(firstDelta.stderr).toBe("warn one\n");

    const secondDelta = applyProcessLogDelta(
      {
        stdout: "line one\nline two\nline three\n",
        stderr: "warn one\nwarn two\n"
      },
      firstDelta.nextCursor
    );

    expect(secondDelta.stdout).toBe("line three\n");
    expect(secondDelta.stderr).toBe("warn two\n");
  });

  it("identifies terminal process states", () => {
    expect(isTerminalProcessStatus("completed")).toBe(true);
    expect(isTerminalProcessStatus("failed")).toBe(true);
    expect(isTerminalProcessStatus("running")).toBe(false);
  });
});
