import { describe, expect, it } from "vitest";

import { buildDemoFixtureCompiledPlan } from "../../src/keystone/compile/plan-run";

describe("buildDemoFixtureCompiledPlan", () => {
  it("produces the deterministic fixture handoff plan from run planning documents", () => {
    expect(
      buildDemoFixtureCompiledPlan({
        specification: {
          revisionId: "revision-specification",
          path: "specification",
          body: "# Specification\n\nUpdate the demo greeting."
        },
        architecture: {
          revisionId: "revision-architecture",
          path: "architecture",
          body: "# Architecture\n\nApply the change in the demo target fixture."
        },
        executionPlan: {
          revisionId: "revision-execution-plan",
          path: "execution-plan",
          body: "# Execution Plan\n\n- Update the greeting implementation.\n- Run the fixture verification."
        }
      })
    ).toEqual({
      summary: "Compile smoke produced a single implementation task.",
      sourceRevisionIds: {
        specification: "revision-specification",
        architecture: "revision-architecture",
        executionPlan: "revision-execution-plan"
      },
      tasks: [
        {
          taskId: "task-implementation",
          title: "Implement execution plan",
          summary: "Implement the approved execution plan in a reviewable way.",
          instructions: ["Implement the requested change.", "Run the relevant fixture verification."],
          acceptanceCriteria: ["The execution plan goals are satisfied."],
          dependsOn: []
        }
      ]
    });
  });
});
