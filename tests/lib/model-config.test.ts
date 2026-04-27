import { describe, expect, it } from "vitest";

import { resolveChatCompletionsModel } from "../../src/lib/llm/model-config";

const baseEnv = {
  KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
  KEYSTONE_CHAT_COMPLETIONS_MODEL: "gpt-5.4"
};

describe("chat completions model config", () => {
  it("uses the global model when no role override is configured", () => {
    expect(resolveChatCompletionsModel(baseEnv, { role: "planning" })).toBe("gpt-5.4");
    expect(resolveChatCompletionsModel(baseEnv, { role: "implementer" })).toBe("gpt-5.4");
    expect(resolveChatCompletionsModel(baseEnv, { role: "compile" })).toBe("gpt-5.4");
  });

  it("lets all planning document agents share a planning model override", () => {
    const env = {
      ...baseEnv,
      KEYSTONE_PLANNING_CHAT_COMPLETIONS_MODEL: "gpt-5.5"
    };

    expect(
      resolveChatCompletionsModel(env, {
        role: "planning",
        planningDocumentPath: "specification"
      })
    ).toBe("gpt-5.5");
    expect(
      resolveChatCompletionsModel(env, {
        role: "planning",
        planningDocumentPath: "architecture"
      })
    ).toBe("gpt-5.5");
    expect(
      resolveChatCompletionsModel(env, {
        role: "planning",
        planningDocumentPath: "execution-plan"
      })
    ).toBe("gpt-5.5");
  });

  it("lets individual planning documents override the shared planning model", () => {
    const env = {
      ...baseEnv,
      KEYSTONE_PLANNING_CHAT_COMPLETIONS_MODEL: "gpt-5.5",
      KEYSTONE_ARCHITECTURE_CHAT_COMPLETIONS_MODEL: "gpt-5.4"
    };

    expect(
      resolveChatCompletionsModel(env, {
        role: "planning",
        planningDocumentPath: "specification"
      })
    ).toBe("gpt-5.5");
    expect(
      resolveChatCompletionsModel(env, {
        role: "planning",
        planningDocumentPath: "architecture"
      })
    ).toBe("gpt-5.4");
  });

  it("keeps compile and implementer overrides separate from planning overrides", () => {
    const env = {
      ...baseEnv,
      KEYSTONE_COMPILE_CHAT_COMPLETIONS_MODEL: "gpt-5.4-mini",
      KEYSTONE_IMPLEMENTER_CHAT_COMPLETIONS_MODEL: "gpt-5.3-codex",
      KEYSTONE_PLANNING_CHAT_COMPLETIONS_MODEL: "gpt-5.5"
    };

    expect(resolveChatCompletionsModel(env, { role: "compile" })).toBe("gpt-5.4-mini");
    expect(resolveChatCompletionsModel(env, { role: "implementer" })).toBe("gpt-5.3-codex");
  });

  it("lets an explicit per-turn model beat configured defaults", () => {
    const env = {
      ...baseEnv,
      KEYSTONE_IMPLEMENTER_CHAT_COMPLETIONS_MODEL: "gpt-5.3-codex"
    };

    expect(
      resolveChatCompletionsModel(env, {
        role: "implementer",
        explicitModelId: "gpt-5.5"
      })
    ).toBe("gpt-5.5");
  });
});
