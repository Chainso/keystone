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
      }
    });

    expect(parsed.repo.source).toBe("localPath");
    expect(parsed.decisionPackage.source).toBe("payload");
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
});
