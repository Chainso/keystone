import { describe, expect, it } from "vitest";

import { demoDecisionPackageFixture } from "../../src/lib/fixtures/demo-decision-package";
import { buildDemoFixtureCompiledPlan } from "../../src/keystone/compile/plan-run";

describe("buildDemoFixtureCompiledPlan", () => {
  it("produces the deterministic fixture handoff plan for the live Think demo", () => {
    expect(buildDemoFixtureCompiledPlan(demoDecisionPackageFixture)).toEqual({
      decisionPackageId: "demo-greeting-update",
      summary: "Compile smoke produced a single implementation task.",
      tasks: [
        {
          taskId: "task-greeting-tone",
          title: "Adjust the greeting implementation",
          summary: "Change the greeting in a reviewable way.",
          instructions: [
            "Edit the greeting implementation.",
            "Run the fixture tests."
          ],
          acceptanceCriteria: [
            "Fixture tests stay green."
          ],
          dependsOn: []
        }
      ]
    });
  });
});
