import { createOpenAI } from "@ai-sdk/openai";
import { Think } from "@cloudflare/think";

import type { WorkerBindings } from "../../../env";
import { buildChatCompletionsApiBaseUrl } from "../../../lib/llm/chat-completions";
import { assertOutboundUrlAllowed } from "../../../lib/security/outbound";

function createLocalChatCompletionsModel(
  env: Pick<WorkerBindings, "KEYSTONE_CHAT_COMPLETIONS_BASE_URL" | "KEYSTONE_CHAT_COMPLETIONS_MODEL">,
  modelId: string
) {
  assertOutboundUrlAllowed(env, env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL, "planning chat completions");

  return createOpenAI({
    apiKey: "keystone-local",
    name: "keystone-chat-completions",
    baseURL: buildChatCompletionsApiBaseUrl(env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL)
  }).chat(modelId);
}

function getPlanningDocumentKind(name: string) {
  if (name.endsWith(":document:specification")) {
    return "specification";
  }

  if (name.endsWith(":document:architecture")) {
    return "architecture";
  }

  if (name.endsWith(":document:execution-plan")) {
    return "execution-plan";
  }

  return "planning";
}

function buildPlanningSystemPrompt(name: string) {
  switch (getPlanningDocumentKind(name)) {
    case "specification":
      return [
        "You are Keystone's planning assistant for a run specification.",
        "Help the operator clarify scope, user-visible behavior, constraints, and acceptance criteria.",
        "Prefer concrete structure that can be copied into a markdown planning document."
      ].join(" ");
    case "architecture":
      return [
        "You are Keystone's planning assistant for a run architecture document.",
        "Help the operator reason about technical design, boundaries, tradeoffs, and implementation seams.",
        "Prefer concrete markdown-friendly bullets and sections over vague advice."
      ].join(" ");
    case "execution-plan":
      return [
        "You are Keystone's planning assistant for a run execution plan.",
        "Help the operator turn approved requirements into ordered implementation work with validation and rollback awareness.",
        "Keep the plan specific, reviewable, and markdown-friendly."
      ].join(" ");
    default:
      return [
        "You are Keystone's planning assistant for a run-scoped planning document.",
        "Help the operator refine the document into concrete markdown-ready content."
      ].join(" ");
  }
}

export class PlanningDocumentAgent extends Think<WorkerBindings> {
  override maxSteps = 6;

  getModel() {
    return createLocalChatCompletionsModel(this.env, this.env.KEYSTONE_CHAT_COMPLETIONS_MODEL);
  }

  override getSystemPrompt() {
    return buildPlanningSystemPrompt(this.name);
  }
}
