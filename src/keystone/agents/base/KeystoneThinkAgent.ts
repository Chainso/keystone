import { Think } from "@cloudflare/think";
import { createWorkersAI } from "workers-ai-provider";

import type { WorkerBindings } from "../../../env";
import type { EventSeverity } from "../../../lib/events/types";
import {
  type AgentFilesystemLayout,
  createAgentTurnContext,
  createKeystoneThinkAgentDescriptor,
  type AgentRuntimeAdapter,
  type AgentTurnContext,
  type AgentTurnResult
} from "../../../maestro/agent-runtime";
import { ensureSandboxSession } from "../../../lib/sandbox/client";
import { createWorkerDatabaseClient, type DatabaseClient } from "../../../lib/db/client";
import { appendAndPublishRunEvent } from "../../../lib/events/publish";
import { getSessionRecord, updateSessionStatus } from "../../../lib/db/runs";
import {
  buildImplementerSystemPrompt,
  collectStagedArtifacts,
  createImplementerTools,
  createMockImplementerModel,
  extractAssistantText,
  parseImplementerTurnMetadata,
  type ImplementerToolEvent,
  type ImplementerTurnMetadata
} from "../implementer/ImplementerAgent";
import { deriveSessionStatusForAgentTurnOutcome } from "../../../maestro/session";

type ActiveTurnState = {
  context: AgentTurnContext;
  metadata: ImplementerTurnMetadata;
  client: DatabaseClient;
  events: AgentTurnResult["events"];
  lastAssistantText?: string | undefined;
};

const thinkActor = "keystone-think-implementer";

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

    const modelId = this.activeTurn?.metadata.modelId;

    if (!modelId) {
      throw new Error("ImplementerAgent requires metadata.modelId or metadata.mockModelPlan.");
    }

    return createWorkersAI({
      binding: this.env.AI
    })(modelId);
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
    const client = createWorkerDatabaseClient(this.env);

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
        client,
        events: []
      };

      const existingSession = await getSessionRecord(client, input.tenantId, input.sessionId);

      if (existingSession?.status === "ready") {
        await updateSessionStatus(client, {
          tenantId: input.tenantId,
          sessionId: input.sessionId,
          status: "active",
          metadata: {
            ...(existingSession.metadata ?? {}),
            runtime: this.runtime,
            role: this.role
          }
        });
      }

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

      await this.chat(
        metadata.prompt,
        callback,
        signal
          ? {
              signal
            }
          : undefined
      );

      const stagedArtifacts = await collectStagedArtifacts(session, metadata.agentBridge);

      for (const artifact of stagedArtifacts) {
        await this.recordTurnEvent("artifact.staged", {
          path: artifact.path,
          kind: artifact.kind,
          contentType: artifact.contentType,
          metadata: artifact.metadata ?? {}
        });
      }

      const summary =
        this.activeTurn.lastAssistantText ?? "Implementer turn completed without assistant text.";

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
          modelId: metadata.mockModelPlan ? "mock-implementer" : metadata.modelId ?? null,
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

      const existingSession = await getSessionRecord(client, input.tenantId, input.sessionId);

      if (existingSession && existingSession.status !== "failed") {
        await updateSessionStatus(client, {
          tenantId: input.tenantId,
          sessionId: input.sessionId,
          status: "failed",
          metadata: {
            ...(existingSession.metadata ?? {}),
            runtime: this.runtime,
            role: this.role,
            lastError: message
          }
        });
      }

      throw error;
    } finally {
      this.activeTurn = null;
      await client.close();
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
    severity: EventSeverity = "info",
    status = this.activeTurn ? "active" : undefined
  ) {
    if (!this.activeTurn) {
      return;
    }

    const published = await appendAndPublishRunEvent(this.activeTurn.client, this.env, {
      tenantId: this.activeTurn.context.tenantId,
      runId: this.activeTurn.context.runId,
      sessionId: this.activeTurn.context.sessionId,
      taskId: this.activeTurn.context.taskId,
      eventType,
      actor: thinkActor,
      severity,
      payload,
      status: status
        ? deriveSessionStatusForAgentTurnOutcome(
            status === "failed" ? "failed" : "completed"
          )
        : undefined
    });

    this.activeTurn.events.push({
      eventType: published.eventType,
      payload: published.payload as Record<string, unknown>
    });
  }
}
