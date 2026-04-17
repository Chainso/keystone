import type { AgentRuntimeKind } from "./contracts";

export const agentRoleValues = ["implementer"] as const;

export type AgentRole = (typeof agentRoleValues)[number];

export const agentTurnOutcomeValues = ["completed", "failed", "cancelled"] as const;

export type AgentTurnOutcome = (typeof agentTurnOutcomeValues)[number];

export interface AgentFilesystemLayout {
  workspaceRoot: string;
  artifactsInRoot: string;
  artifactsOutRoot: string;
  keystoneRoot: string;
}

export const DEFAULT_AGENT_FILESYSTEM_LAYOUT: AgentFilesystemLayout = {
  workspaceRoot: "/workspace",
  artifactsInRoot: "/artifacts/in",
  artifactsOutRoot: "/artifacts/out",
  keystoneRoot: "/keystone"
};

export interface AgentRuntimeArtifact {
  path: string;
  kind: string;
  contentType?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface AgentRuntimeEvent {
  eventType: string;
  payload: Record<string, unknown>;
}

export interface AgentTurnContext {
  runtime: AgentRuntimeKind;
  role: AgentRole;
  tenantId: string;
  runId: string;
  sessionId: string;
  taskId?: string | undefined;
  filesystem: AgentFilesystemLayout;
  capabilities: string[];
  metadata: Record<string, unknown>;
}

export interface AgentTurnResult {
  outcome: AgentTurnOutcome;
  stagedArtifacts: AgentRuntimeArtifact[];
  events: AgentRuntimeEvent[];
  summary?: string | undefined;
  metadata: Record<string, unknown>;
}

export interface KeystoneThinkAgentDescriptor {
  runtime: "think";
  role: AgentRole;
  filesystem: AgentFilesystemLayout;
}

export interface AgentRuntimeAdapter {
  readonly runtime: AgentRuntimeKind;
  readonly role: AgentRole;
  createTurnContext(
    input: Omit<AgentTurnContext, "runtime" | "role" | "filesystem" | "capabilities" | "metadata"> & {
      filesystem?: Partial<AgentFilesystemLayout> | undefined;
      capabilities?: string[] | undefined;
      metadata?: Record<string, unknown> | undefined;
    }
  ): AgentTurnContext;
  executeTurn(input: AgentTurnContext, signal?: AbortSignal): Promise<AgentTurnResult>;
}

export function createAgentFilesystemLayout(
  overrides?: Partial<AgentFilesystemLayout> | undefined
): AgentFilesystemLayout {
  return {
    ...DEFAULT_AGENT_FILESYSTEM_LAYOUT,
    ...overrides
  };
}

export function createAgentTurnContext(
  input: Omit<AgentTurnContext, "filesystem" | "capabilities" | "metadata"> & {
    filesystem?: Partial<AgentFilesystemLayout> | undefined;
    capabilities?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
  }
): AgentTurnContext {
  return {
    ...input,
    filesystem: createAgentFilesystemLayout(input.filesystem),
    capabilities: input.capabilities ?? [],
    metadata: input.metadata ?? {}
  };
}

export function createKeystoneThinkAgentDescriptor(
  role: AgentRole = "implementer"
): KeystoneThinkAgentDescriptor {
  return {
    runtime: "think",
    role,
    filesystem: DEFAULT_AGENT_FILESYSTEM_LAYOUT
  };
}
