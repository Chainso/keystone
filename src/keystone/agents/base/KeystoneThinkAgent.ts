import { Think } from "@cloudflare/think";
import type { LanguageModel } from "ai";

import type { WorkerBindings } from "../../../env";
import {
  type AgentFilesystemLayout,
  createAgentTurnContext,
  createKeystoneThinkAgentDescriptor,
  type AgentRuntimeAdapter,
  type AgentTurnContext,
  type AgentTurnResult
} from "../../../maestro/agent-runtime";

export class KeystoneThinkAgent<Config = Record<string, unknown>>
  extends Think<WorkerBindings, Config>
  implements AgentRuntimeAdapter
{
  readonly runtime = "think" as const;
  readonly role = "implementer" as const;
  override maxSteps = 12;

  getModel(): LanguageModel {
    throw new Error(
      "KeystoneThinkAgent is Phase 1 scaffolding only. Add a concrete role model before routing live turns."
    );
  }

  override getSystemPrompt() {
    return [
      "You are Keystone's Think runtime scaffold.",
      "Expect the filesystem contract rooted at /workspace, /artifacts/in, /artifacts/out, and /keystone.",
      "Concrete role behavior must be added before this agent handles live task turns."
    ].join(" ");
  }

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

  async executeTurn(_input: AgentTurnContext, _signal?: AbortSignal): Promise<AgentTurnResult> {
    void _input;
    void _signal;

    throw new Error(
      "KeystoneThinkAgent.executeTurn is not wired in Phase 1. Later phases will connect Think to the sandbox runtime."
    );
  }

  describeRuntime() {
    return createKeystoneThinkAgentDescriptor(this.role);
  }
}
