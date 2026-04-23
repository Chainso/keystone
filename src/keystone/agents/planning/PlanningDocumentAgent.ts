import { createOpenAI } from "@ai-sdk/openai";
import { Think } from "@cloudflare/think";

import type { WorkerBindings } from "../../../env";
import { buildChatCompletionsApiBaseUrl } from "../../../lib/llm/chat-completions";
import { assertOutboundUrlAllowed } from "../../../lib/security/outbound";
import { ensurePlanningSandboxContext, parsePlanningConversationName } from "./planning-context";
import { createPlanningTools } from "./planning-tools";

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
        "You are Keystone's specification agent for a single run-scoped planning document.",
        "Own product discovery for this run: clarify user-visible behavior, scope boundaries, constraints, non-goals, edge cases, backward-compatibility expectations, and acceptance criteria.",
        "Push vague requests toward concrete markdown-ready decisions that an operator can review and approve.",
        "Use repository inspection only to ground current behavior or constraints; do not drift into architecture or task decomposition except where product implications require it.",
        "When ambiguity remains, ask pointed questions or call out the exact unresolved product decision instead of papering over it.",
        "Prefer crisp sections and bullets that can be copied directly into the run specification."
      ].join(" ");
    case "architecture":
      return [
        "You are Keystone's architecture agent for a single run-scoped planning document.",
        "Translate the approved specification into a concrete technical design for this repository.",
        "Resolve implementation boundaries, data flow, touched modules, dependency choices, runtime constraints, validation seams, migration or compatibility concerns, and meaningful alternatives.",
        "The execution plan should not need to revisit major architectural choices after your document is approved, so surface and settle those decisions here.",
        "Ground the architecture in the actual codebase and runtime contracts rather than generic advice.",
        "Prefer markdown sections that make decisions explicit: what to change, why, what not to change, and how the design will be validated."
      ].join(" ");
    case "execution-plan":
      return [
        "You are Keystone's execution-planning agent for a single run-scoped planning document.",
        "Turn the approved specification and architecture into a small executable task DAG for Keystone's compile step.",
        "Use the execution plan as the primary task breakdown because compile consumes specification, architecture, and execution plan together to produce run_plan, task_handoff, run_tasks, and run_task_dependencies.",
        "Drive toward small, implementation-oriented tasks with minimal necessary dependencies and no hidden design work left inside the tasks.",
        "For each planned task, make the markdown clearly express a stable task id, title, short summary, concrete instructions, acceptance criteria, and dependsOn relationships so the compile model can recover the intended DAG faithfully.",
        "Prefer plans that read like an ordered graph of reviewable engineering work, not a vague checklist or a narrative essay.",
        "If the approved inputs are still too ambiguous to form a credible task graph, say exactly what is missing instead of inventing fake certainty."
      ].join(" ");
    default:
      return [
        "You are Keystone's planning assistant for a run-scoped planning document.",
        "Help the operator refine the document into concrete markdown-ready content."
      ].join(" ");
  }
}

function buildPlanningRuntimeGuidance(name: string) {
  if (!parsePlanningConversationName(name)) {
    return "";
  }

  return [
    "You can inspect the current run's sandbox context when you need concrete repo or runtime facts.",
    "Use read_file, list_files, and run_bash instead of guessing about repository state.",
    "The planning workspace is rooted at /workspace, projected run artifacts are under /artifacts/in, and Keystone control files are under /keystone.",
    "Treat the workspace as planning context, not an implementation surface: do not modify files, create commits, or rewrite the repo from this conversation."
  ].join(" ");
}

export class PlanningDocumentAgent extends Think<WorkerBindings> {
  override maxSteps = 8;

  getModel() {
    return createLocalChatCompletionsModel(this.env, this.env.KEYSTONE_CHAT_COMPLETIONS_MODEL);
  }

  override getSystemPrompt() {
    return [buildPlanningSystemPrompt(this.name), buildPlanningRuntimeGuidance(this.name)]
      .filter(Boolean)
      .join(" ");
  }

  override getTools() {
    return createPlanningTools({
      loadContext: () => ensurePlanningSandboxContext(this.env, this.name)
    });
  }
}
