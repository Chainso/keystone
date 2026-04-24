import { createOpenAI } from "@ai-sdk/openai";
import { Think, type TurnConfig, type TurnContext } from "@cloudflare/think";

import type { WorkerBindings } from "../../../env";
import { buildChatCompletionsApiBaseUrl } from "../../../lib/llm/chat-completions";
import { assertOutboundUrlAllowed } from "../../../lib/security/outbound";
import { loadRunDocumentCurrentText } from "../../../lib/documents/revision-persistence";
import {
  mkdirSandboxAgentPath,
  sandboxAgentPathExists,
  writeSandboxAgentFile
} from "../tools/filesystem";
import {
  buildGenericPlanningSystemPrompt,
  getPlanningDocumentAgentConfig
} from "./planning-agent-config";
import { appendAssistantUiModelContext } from "../base/assistant-ui-model-context";
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

function buildPlanningSystemPrompt(name: string) {
  return getPlanningDocumentAgentConfig(name)?.systemPrompt ?? buildGenericPlanningSystemPrompt();
}

function buildPlanningRuntimeGuidance(name: string) {
  const identity = parsePlanningConversationName(name);

  if (!identity) {
    return "";
  }

  const config = getPlanningDocumentAgentConfig(name);
  const draftGuidance = config
    ? [
        `The editable draft for this document lives in the sandbox at ${config.draftSandboxPath}.`,
        "Use the native workspace tools read, write, edit, list, find, grep, delete against the sandbox filesystem.",
        `Call ${config.saveToolName} when the draft is ready to persist as the current Keystone document revision.`
      ].join(" ")
    : "Use the native workspace tools read, write, edit, list, find, grep, delete against the sandbox filesystem.";

  return [
    "You can inspect the current run's sandbox context when you need concrete repo or runtime facts.",
    "The sandbox workspace is rooted at /workspace, editable planning drafts are under /documents, projected run artifacts are under /artifacts/in, and Keystone control files are under /keystone.",
    "Use run_bash only when shell commands are the right inspection tool; prefer read, list, find, and grep for filesystem inspection.",
    "Treat the sandbox workspace as planning context, not an implementation surface: do not modify repo files, create commits, or rewrite the repo from this conversation.",
    draftGuidance
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

  override async beforeTurn(ctx: TurnContext): Promise<TurnConfig | void> {
    await this.ensureDraftDocumentLoaded();

    const system = appendAssistantUiModelContext(ctx.system, ctx.body);

    if (system === ctx.system) {
      return undefined;
    }

    return { system };
  }

  override getTools() {
    return createPlanningTools({
      env: this.env,
      loader: this.env.LOADER,
      documentConfig: getPlanningDocumentAgentConfig(this.name),
      loadContext: () => ensurePlanningSandboxContext(this.env, this.name)
    });
  }

  private async ensureDraftDocumentLoaded() {
    const config = getPlanningDocumentAgentConfig(this.name);
    const identity = parsePlanningConversationName(this.name);

    if (!config || !identity) {
      return;
    }

    const context = await ensurePlanningSandboxContext(this.env, this.name);

    if (!context) {
      return;
    }

    const existingDraft = await sandboxAgentPathExists(context, config.draftSandboxPath);

    if (existingDraft.exists) {
      return;
    }

    const loaded = await loadRunDocumentCurrentText({
      env: this.env,
      tenantId: identity.tenantId,
      runId: identity.runId,
      path: config.documentPath
    });

    if (!loaded) {
      return;
    }

    await mkdirSandboxAgentPath(context, "/documents", { recursive: true });
    await writeSandboxAgentFile(context, config.draftSandboxPath, loaded.content);
  }
}
