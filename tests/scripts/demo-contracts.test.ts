import { afterEach, describe, expect, it } from "vitest";

import {
  resolveCreatedRunExecutionContract,
  resolveRuntime as resolveDemoRunRuntime,
  resolveThinkMode as resolveDemoRunThinkMode
} from "../../scripts/demo-run";
import {
  resolveRuntime as resolveDemoValidateRuntime,
  resolveThinkMode as resolveDemoValidateThinkMode,
  resolveValidatedRunContract
} from "../../scripts/demo-validate";

const demoEnvKeys = [
  "KEYSTONE_AGENT_RUNTIME",
  "KEYSTONE_THINK_DEMO_MODE",
  "KEYSTONE_PRESERVE_SANDBOX",
  "KEYSTONE_STREAM_EVENTS"
] as const;
const originalArgv = [...process.argv];
const originalEnv = new Map(demoEnvKeys.map((key) => [key, process.env[key]]));

function clearDemoEnv() {
  for (const key of demoEnvKeys) {
    delete process.env[key];
  }
}

afterEach(() => {
  process.argv = [...originalArgv];

  for (const [key, value] of originalEnv) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
});

describe("demo scripts", () => {
  it("defaults demo-run to the scripted fixture contract", () => {
    process.argv = ["node", "scripts/demo-run.ts"];
    clearDemoEnv();

    const requestedRuntime = resolveDemoRunRuntime();
    const requestedThinkMode = resolveDemoRunThinkMode();
    const contract = resolveCreatedRunExecutionContract({}, requestedRuntime, requestedThinkMode);

    expect(requestedRuntime).toBe("scripted");
    expect(requestedThinkMode).toBe("mock");
    expect(contract).toMatchObject({
      runtime: "scripted",
      thinkMode: "mock",
      preserveSandbox: false,
      streamEvents: false,
      maxPollAttempts: 30,
      demoContract: {
        contractId: "scripted-fixture-demo",
        workflowStatus: "Default non-Think demo path."
      }
    });
  });

  it("treats an explicit live Think request as the Phase 1 fixture-backed demo contract", () => {
    process.argv = ["node", "scripts/demo-run.ts", "--runtime=think", "--think-mode=live"];
    clearDemoEnv();

    const requestedRuntime = resolveDemoRunRuntime();
    const requestedThinkMode = resolveDemoRunThinkMode();
    const contract = resolveCreatedRunExecutionContract(
      {
        runtime: "think",
        options: {}
      },
      requestedRuntime,
      requestedThinkMode
    );

    expect(contract).toMatchObject({
      runtime: "think",
      thinkMode: "live",
      preserveSandbox: true,
      streamEvents: true,
      maxPollAttempts: 90,
      demoContract: {
        contractId: "think-live-fixture-demo",
        proofScope: "Fixture-backed Think task path",
        modelExecution: "Live local chat-completions backend",
        workflowStatus:
          "Phase 1 contract only swaps in the live Think turn. It does not yet prove live compile or compiled task handoffs."
      }
    });
  });

  it("lets demo-validate prefer persisted live Think metadata over requested defaults", () => {
    const contract = resolveValidatedRunContract(
      {
        inputs: {
          runtime: "think",
          options: {
            thinkMode: "live"
          }
        }
      },
      "scripted",
      "mock"
    );

    expect(contract).toMatchObject({
      runtime: "think",
      thinkMode: "live",
      demoContract: {
        contractId: "think-live-fixture-demo",
        workflowStatus:
          "Phase 1 validation still checks the fixture-backed run contract. It does not yet prove live compile or compiled task handoffs."
      }
    });
  });

  it("falls back to the requested Think mock contract when persisted metadata is absent", () => {
    process.argv = ["node", "scripts/demo-validate.ts", "--runtime=think"];
    clearDemoEnv();

    const requestedRuntime = resolveDemoValidateRuntime();
    const requestedThinkMode = resolveDemoValidateThinkMode();
    const contract = resolveValidatedRunContract({}, requestedRuntime, requestedThinkMode);

    expect(requestedRuntime).toBe("think");
    expect(requestedThinkMode).toBe("mock");
    expect(contract).toMatchObject({
      runtime: "think",
      thinkMode: "mock",
      demoContract: {
        contractId: "think-mock-validation",
        workflowStatus:
          "Stable validation path for the current fixture-backed compile and task handoff behavior."
      }
    });
  });
});
