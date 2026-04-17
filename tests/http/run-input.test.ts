import { describe, expect, it } from "vitest";

import { parseRunInput } from "../../src/http/contracts/run-input";

describe("runInputSchema", () => {
  it("accepts a local repository with inline decision-package payload", () => {
    const parsed = parseRunInput({
      repo: {
        localPath: "./fixtures/demo-target"
      },
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

    expect(parsed.repo.source).toBe("localPath");
    expect(parsed.decisionPackage.source).toBe("payload");
    expect(parsed.options).toEqual({
      thinkMode: "live",
      preserveSandbox: true
    });
  });

  it("accepts a git repository with a decision-package file path", () => {
    const parsed = parseRunInput({
      repo: {
        gitUrl: "https://github.com/example/repo.git",
        ref: "main"
      },
      decisionPackage: {
        localPath: "./fixtures/demo-decision-package/decision-package.json"
      }
    });

    expect(parsed.repo.source).toBe("gitUrl");
    expect(parsed.decisionPackage.source).toBe("localPath");
    expect(parsed.options).toEqual({
      thinkMode: "mock",
      preserveSandbox: false
    });
  });

  it("rejects ambiguous repo inputs", () => {
    expect(() =>
      parseRunInput({
        repo: {
          localPath: "./fixtures/demo-target",
          gitUrl: "https://github.com/example/repo.git"
        },
        decisionPackage: {
          payload: {
            summary: "bad input"
          }
        }
      })
    ).toThrow(/Provide exactly one of repo.localPath or repo.gitUrl/);
  });

  it("rejects invalid run options", () => {
    expect(() =>
      parseRunInput({
        repo: {
          localPath: "./fixtures/demo-target"
        },
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
