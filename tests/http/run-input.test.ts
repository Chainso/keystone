import { describe, expect, it } from "vitest";

import { parseRunInput } from "../../src/http/contracts/run-input";

describe("runInputSchema", () => {
  it("accepts a project-backed run with inline decision-package payload", () => {
    const parsed = parseRunInput({
      projectId: "project-fixture",
      decisionPackage: {
        payload: {
          summary: "Validate inline package support"
        }
      },
      options: {
        thinkMode: "live",
        preserveSandbox: true
      }
    });

    expect(parsed.projectId).toBe("project-fixture");
    expect(parsed.decisionPackage.source).toBe("payload");
    expect(parsed.options).toEqual({
      thinkMode: "live",
      preserveSandbox: true
    });
  });

  it("accepts a project-backed run with a decision-package file path", () => {
    const parsed = parseRunInput({
      projectId: "project-fixture",
      decisionPackage: {
        localPath: "./fixtures/demo-decision-package/decision-package.json"
      }
    });

    expect(parsed.projectId).toBe("project-fixture");
    expect(parsed.decisionPackage.source).toBe("localPath");
    expect(parsed.options).toEqual({
      thinkMode: "mock",
      preserveSandbox: false
    });
  });

  it("rejects missing project ids", () => {
    expect(() =>
      parseRunInput({
        projectId: "",
        decisionPackage: {
          payload: {
            summary: "bad input"
          }
        }
      })
    ).toThrow(/Too small: expected string to have >=1 characters/);
  });

  it("rejects invalid run options", () => {
    expect(() =>
      parseRunInput({
        projectId: "project-fixture",
        decisionPackage: {
          payload: {
            summary: "bad options"
          }
        },
        options: {
          thinkMode: "unknown"
        }
      })
    ).toThrow(/Invalid option: expected one of "mock"|"live"/);
  });
});
