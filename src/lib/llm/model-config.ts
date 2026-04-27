import type { PlanningDocumentPath } from "../../keystone/agents/planning/planning-agent-config";

export interface ChatCompletionsModelEnv {
  KEYSTONE_CHAT_COMPLETIONS_BASE_URL: string;
  KEYSTONE_CHAT_COMPLETIONS_MODEL: string;
  KEYSTONE_COMPILE_CHAT_COMPLETIONS_MODEL?: string | undefined;
  KEYSTONE_IMPLEMENTER_CHAT_COMPLETIONS_MODEL?: string | undefined;
  KEYSTONE_PLANNING_CHAT_COMPLETIONS_MODEL?: string | undefined;
  KEYSTONE_SPECIFICATION_CHAT_COMPLETIONS_MODEL?: string | undefined;
  KEYSTONE_ARCHITECTURE_CHAT_COMPLETIONS_MODEL?: string | undefined;
  KEYSTONE_EXECUTION_PLAN_CHAT_COMPLETIONS_MODEL?: string | undefined;
}

export type ChatCompletionsModelRole = "compile" | "implementer" | "planning";

export interface ResolveChatCompletionsModelInput {
  role: ChatCompletionsModelRole;
  planningDocumentPath?: PlanningDocumentPath | undefined;
  explicitModelId?: string | undefined;
}

function normalizeModelId(value: string | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function resolvePlanningDocumentModel(
  env: ChatCompletionsModelEnv,
  planningDocumentPath: PlanningDocumentPath | undefined
) {
  if (planningDocumentPath === "specification") {
    return normalizeModelId(env.KEYSTONE_SPECIFICATION_CHAT_COMPLETIONS_MODEL);
  }

  if (planningDocumentPath === "architecture") {
    return normalizeModelId(env.KEYSTONE_ARCHITECTURE_CHAT_COMPLETIONS_MODEL);
  }

  if (planningDocumentPath === "execution-plan") {
    return normalizeModelId(env.KEYSTONE_EXECUTION_PLAN_CHAT_COMPLETIONS_MODEL);
  }

  return undefined;
}

export function resolveChatCompletionsModel(
  env: ChatCompletionsModelEnv,
  input: ResolveChatCompletionsModelInput
) {
  const explicitModelId = normalizeModelId(input.explicitModelId);
  const fallbackModelId = normalizeModelId(env.KEYSTONE_CHAT_COMPLETIONS_MODEL);

  if (explicitModelId) {
    return explicitModelId;
  }

  if (!fallbackModelId) {
    throw new Error("KEYSTONE_CHAT_COMPLETIONS_MODEL must be configured.");
  }

  if (input.role === "compile") {
    return (
      normalizeModelId(env.KEYSTONE_COMPILE_CHAT_COMPLETIONS_MODEL) ??
      fallbackModelId
    );
  }

  if (input.role === "implementer") {
    return (
      normalizeModelId(env.KEYSTONE_IMPLEMENTER_CHAT_COMPLETIONS_MODEL) ??
      fallbackModelId
    );
  }

  return (
    resolvePlanningDocumentModel(env, input.planningDocumentPath) ??
    normalizeModelId(env.KEYSTONE_PLANNING_CHAT_COMPLETIONS_MODEL) ??
    fallbackModelId
  );
}
