import { describe, expect, it } from "vitest";

import { parseRunInput } from "../../src/http/contracts/run-input";

describe("runInputSchema", () => {
  it("accepts a project-backed run with inline decision-package payload", () => {
    const parsed = parseRunInput({
      projectId: "project-fixture",
      decisionPackage: {
        source: "inline",
        payload: {
          decisionPackageId: "decision-package-inline",
          summary: "Validate inline package support",
          objectives: ["Ship the UI-first API"],
          tasks: [
            {
              taskId: "task-inline",
              title: "Implement the contract",
              acceptanceCriteria: ["Contract is defined"]
            }
          ]
        }
      },
      options: {
        thinkMode: "live",
        preserveSandbox: true
      }
    });

    expect(parsed.projectId).toBe("project-fixture");
    expect(parsed.decisionPackage.source).toBe("inline");
    expect(parsed.options).toEqual({
      thinkMode: "live",
      preserveSandbox: true
    });
  });

  it("accepts a project-backed run with an artifact-backed decision package reference", () => {
    const parsed = parseRunInput({
      projectId: "project-fixture",
      decisionPackage: {
        source: "artifact",
        artifactId: "artifact-decision-package"
      }
    });

    expect(parsed.projectId).toBe("project-fixture");
    expect(parsed.decisionPackage.source).toBe("artifact");
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
          source: "artifact",
          artifactId: "artifact-bad-input"
        }
      })
    ).toThrow(/Too small: expected string to have >=1 characters/);
  });

  it("rejects invalid run options", () => {
    expect(() =>
      parseRunInput({
        projectId: "project-fixture",
        decisionPackage: {
          source: "project_collection",
          decisionPackageId: "decision-package-project-collection"
        },
        options: {
          thinkMode: "unknown"
        }
      })
    ).toThrow(/Invalid option: expected one of "mock"|"live"/);
  });
});
