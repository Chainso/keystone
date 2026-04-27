import { Think, type TurnConfig, type TurnContext } from "@cloudflare/think";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

import type { WorkerBindings } from "../../../env";
import { appendAssistantUiModelContext } from "./assistant-ui-model-context";
import { ensureThinkRpcInitialization } from "./think-rpc";
import {
  type AgentFilesystemLayout,
  createAgentTurnContext,
  createKeystoneThinkAgentDescriptor,
  type AgentRuntimeAdapter,
  type AgentTurnContext,
  type AgentTurnResult
} from "../../../maestro/agent-runtime";
import { ensureSandboxSession } from "../../../lib/sandbox/client";
import { buildChatCompletionsApiBaseUrl } from "../../../lib/llm/chat-completions";
import { type ChatCompletionsModelEnv, resolveChatCompletionsModel } from "../../../lib/llm/model-config";
import { assertOutboundUrlAllowed } from "../../../lib/security/outbound";
import {
  buildImplementerSystemPrompt,
  ensureStagedRunNoteArtifact,
  createImplementerTools,
  createMockImplementerModel,
  extractAssistantText,
  parseImplementerTurnMetadata,
  resolveImplementerTurnSummary,
  type ImplementerToolEvent,
  type ImplementerTurnMetadata
} from "../implementer/ImplementerAgent";

type ActiveTurnState = {
  context: AgentTurnContext;
  metadata: ImplementerTurnMetadata;
  events: AgentTurnResult["events"];
  lastAssistantText?: string | undefined;
};

const thinkActor = "keystone-think-implementer";

function logAgentEvent(
  severity: "info" | "warning" | "error",
  entry: {
    actor: string;
    runtime: AgentTurnContext["runtime"];
    role: AgentTurnContext["role"];
    tenantId: string;
    runId: string;
    sessionId: string;
    taskId?: string | undefined;
    sandboxId?: string | undefined;
    eventType: string;
    payload: Record<string, unknown>;
  }
) {
  const logger =
    severity === "error" ? console.error : severity === "warning" ? console.warn : console.info;

  logger("[keystone-agent]", entry);
}

function createLocalChatCompletionsModel(
  env: ChatCompletionsModelEnv,
  modelId: string
) {
  assertOutboundUrlAllowed(env, env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL, "think chat completions");

  return createOpenAI({
    apiKey: "keystone-local",
    name: "keystone-chat-completions",
    baseURL: buildChatCompletionsApiBaseUrl(env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL)
  }).chat(modelId);
}

export class KeystoneThinkAgent<Config = Record<string, unknown>>
  extends Think<WorkerBindings, Config>
  implements AgentRuntimeAdapter
{
  readonly runtime = "think" as const;
  readonly role = "implementer" as const;
  override maxSteps = 8;

  private activeTurn: ActiveTurnState | null = null;

  getModel() {
    if (this.activeTurn?.metadata.mockModelPlan) {
      return createMockImplementerModel(this.activeTurn.metadata.mockModelPlan);
    }

    return createLocalChatCompletionsModel(
      this.env,
      resolveChatCompletionsModel(this.env, {
        role: "implementer",
        explicitModelId: this.activeTurn?.metadata.modelId
      })
    );
  }

  override getSystemPrompt() {
    if (!this.activeTurn) {
      return [
        "You are Keystone's Think-backed implementer agent.",
        "Expect the filesystem contract rooted at /workspace, /artifacts/in, /artifacts/out, and /keystone."
      ].join(" ");
    }

    return buildImplementerSystemPrompt(this.activeTurn.context);
  }

  override getTools() {
    if (!this.activeTurn) {
      return {};
    }

    return createImplementerTools({
      session: this.currentSandboxSession,
      bridge: this.activeTurn.metadata.agentBridge,
      recordEvent: async (event) => {
        await this.recordToolEvent(event);
      }
    });
  }

  override beforeTurn(ctx: TurnContext): TurnConfig | void {
    const system = appendAssistantUiModelContext(ctx.system, ctx.body);

    if (system === ctx.system) {
      return undefined;
    }

    return { system };
  }

  private currentSandboxSession!: Awaited<ReturnType<typeof ensureSandboxSession>>["session"];

  createTurnContext(
    input: Omit<AgentTurnContext, "runtime" | "role" | "filesystem" | "capabilities" | "metadata"> & {
      filesystem?: Partial<AgentFilesystemLayout> | undefined;
      capabilities?: string[] | undefined;
      metadata?: Record<string, unknown> | undefined;
    }
  ) {
    return createAgentTurnContext({
      ...input,
      runtime: this.runtime,
      role: this.role,
      filesystem: input.filesystem,
      capabilities: input.capabilities,
      metadata: input.metadata
    });
  }

  async runImplementerTurn(input: {
    tenantId: string;
    runId: string;
    sessionId: string;
    taskId: string;
    prompt: string;
    sandboxId: string;
    agentBridge: ImplementerTurnMetadata["agentBridge"];
    modelId?: string | undefined;
    mockModelPlan?: ImplementerTurnMetadata["mockModelPlan"];
  }) {
    await ensureThinkRpcInitialization(this);

    const context = this.createTurnContext({
      tenantId: input.tenantId,
      runId: input.runId,
      sessionId: input.sessionId,
      taskId: input.taskId,
      capabilities: ["read_file", "list_files", "write_file", "run_bash"],
      metadata: {
        prompt: input.prompt,
        sandboxId: input.sandboxId,
        agentBridge: input.agentBridge,
        ...(input.modelId ? { modelId: input.modelId } : {}),
        ...(input.mockModelPlan ? { mockModelPlan: input.mockModelPlan } : {})
      }
    });

    return this.executeTurn(context);
  }

  async executeTurn(input: AgentTurnContext, signal?: AbortSignal): Promise<AgentTurnResult> {
    const metadata = parseImplementerTurnMetadata(input);
    const modelId = resolveChatCompletionsModel(this.env, {
      role: "implementer",
      explicitModelId: metadata.modelId
    });

    try {
      const { session } = await ensureSandboxSession({
        env: this.env,
        sandboxId: metadata.sandboxId,
        sessionId: input.sessionId
      });
      this.currentSandboxSession = session;
      this.activeTurn = {
        context: input,
        metadata,
        events: []
      };

      await this.recordTurnEvent("agent.turn.started", {
        role: this.role,
        runtime: this.runtime,
        capabilities: input.capabilities,
        prompt: metadata.prompt,
        sandboxId: metadata.sandboxId
      });

      const callback = {
        onEvent() {
          return undefined;
        },
        onDone() {
          return undefined;
        }
      };

      if (metadata.mockModelPlan) {
        const result = await generateText({
          model: createMockImplementerModel(metadata.mockModelPlan),
          system: buildImplementerSystemPrompt(input),
          prompt: metadata.prompt,
          tools: this.getTools()
        });

        this.activeTurn.lastAssistantText = result.text;

        await this.recordTurnEvent("agent.message", {
          role: this.role,
          requestId: "mock-implementer-turn",
          continuation: false,
          status: "complete",
          text: result.text
        });
      } else {
        await this.chat(
          metadata.prompt,
          callback,
          signal
            ? {
                signal
              }
            : undefined
        );
      }

      const summary = resolveImplementerTurnSummary(this.activeTurn.lastAssistantText);
      const stagedArtifacts = await ensureStagedRunNoteArtifact(
        session,
        metadata.agentBridge,
        summary
      );

      for (const artifact of stagedArtifacts) {
        await this.recordTurnEvent("artifact.staged", {
          path: artifact.path,
          kind: artifact.kind,
          contentType: artifact.contentType,
          metadata: artifact.metadata ?? {}
        });
      }

      await this.recordTurnEvent("agent.turn.completed", {
        role: this.role,
        runtime: this.runtime,
        stagedArtifactCount: stagedArtifacts.length,
        summary
      });

      return {
        outcome: "completed",
        stagedArtifacts,
        events: this.activeTurn.events,
        summary,
        metadata: {
          modelId: metadata.mockModelPlan ? "mock-implementer" : modelId,
          stagedArtifactCount: stagedArtifacts.length
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown implementer turn failure.";

      await this.recordTurnEvent(
        "agent.turn.failed",
        {
          role: this.role,
          runtime: this.runtime,
          error: message
        },
        "error",
        "failed"
      );

      throw error;
    } finally {
      this.activeTurn = null;
    }
  }

  override async onChatResponse(result: {
    message: unknown;
    requestId: string;
    continuation: boolean;
    status: string;
    error?: string | undefined;
  }) {
    if (!this.activeTurn) {
      return;
    }

    const text = extractAssistantText(result.message);
    this.activeTurn.lastAssistantText = text;

    await this.recordTurnEvent("agent.message", {
      role: this.role,
      requestId: result.requestId,
      continuation: result.continuation,
      status: result.status,
      text
    });
  }

  override onChatError(error: unknown) {
    void this.recordTurnEvent(
      "agent.turn.failed",
      {
        role: this.role,
        runtime: this.runtime,
        error: error instanceof Error ? error.message : String(error)
      },
      "error",
      "failed"
    );

    return error;
  }

  describeRuntime() {
    return createKeystoneThinkAgentDescriptor(this.role);
  }

  private async recordToolEvent(event: ImplementerToolEvent) {
    await this.recordTurnEvent(
      event.eventType,
      event.payload,
      event.severity
    );
  }

  private async recordTurnEvent(
    eventType: string,
    payload: Record<string, unknown>,
    severity: "info" | "warning" | "error" = "info",
    status = this.activeTurn ? "active" : undefined
  ) {
    if (!this.activeTurn) {
      return;
    }

    const eventPayload = {
      ...payload,
      ...(status ? { status } : {})
    };

    logAgentEvent(severity, {
      actor: thinkActor,
      runtime: this.activeTurn.context.runtime,
      role: this.activeTurn.context.role,
      tenantId: this.activeTurn.context.tenantId,
      runId: this.activeTurn.context.runId,
      sessionId: this.activeTurn.context.sessionId,
      taskId: this.activeTurn.context.taskId,
      sandboxId: this.activeTurn.metadata.sandboxId,
      eventType,
      payload: eventPayload
    });

    this.activeTurn.events.push({
      eventType,
      payload: eventPayload
    });
  }
}
