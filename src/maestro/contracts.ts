export const sessionTypeValues = [
  "run",
  "compile",
  "task",
  "integration",
  "global_verify",
  "finalize"
] as const;

export type SessionType = (typeof sessionTypeValues)[number];

export const sessionStatusValues = [
  "configured",
  "provisioning",
  "ready",
  "active",
  "paused_for_approval",
  "archived",
  "failed",
  "cancelled"
] as const;

export type SessionStatus = (typeof sessionStatusValues)[number];

export const workspaceStrategyValues = ["worktree", "clone_fetch"] as const;

export type WorkspaceStrategy = (typeof workspaceStrategyValues)[number];

export const artifactStorageBackendValues = ["r2", "external"] as const;

export type ArtifactStorageBackend = (typeof artifactStorageBackendValues)[number];

export interface AgentDefinition {
  id: string;
  version: string;
  name: string;
  model?: string | undefined;
  instructions?: string | undefined;
  capabilities?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface EnvironmentDefinition {
  id: string;
  version: string;
  image: string;
  packages?: string[] | undefined;
  networkPolicy?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface RuntimeProfile {
  id: string;
  runtime: string;
  cpuClass?: string | undefined;
  memoryMb?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface SessionSpec {
  tenantId: string;
  runId: string;
  sessionType: SessionType;
  parentSessionId?: string | null | undefined;
  agentDefinitionId?: string | undefined;
  environmentDefinitionId?: string | undefined;
  runtimeProfileId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface Session {
  tenantId: string;
  sessionId: string;
  runId: string;
  sessionType: SessionType;
  status: SessionStatus;
  parentSessionId?: string | null | undefined;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceInstance {
  tenantId: string;
  workspaceId: string;
  runId: string;
  sessionId: string;
  taskId?: string | undefined;
  strategy: WorkspaceStrategy;
  repoUrl: string;
  repoRef: string;
  baseRef: string;
  worktreePath: string;
  branchName: string;
  sandboxId: string;
  metadata: Record<string, unknown>;
}

export interface ArtifactRef {
  artifactRefId: string;
  tenantId: string;
  runId: string;
  sessionId?: string | null | undefined;
  taskId?: string | null | undefined;
  kind: string;
  storageBackend: ArtifactStorageBackend;
  storageUri: string;
  contentType: string;
  sha256?: string | null | undefined;
  sizeBytes?: number | null | undefined;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface SessionEvent {
  eventId: string;
  tenantId: string;
  runId: string;
  sessionId: string;
  taskId?: string | null | undefined;
  seq: number;
  eventType: string;
  actor: string;
  severity: string;
  timestamp: Date;
  idempotencyKey?: string | null | undefined;
  artifactRefId?: string | null | undefined;
  payload: Record<string, unknown>;
}

export interface Approval {
  approvalId: string;
  tenantId: string;
  runId: string;
  sessionId: string;
  approvalType: string;
  status: string;
  requestedBy?: string | null | undefined;
  requestedAt: Date;
  resolvedAt?: string | Date | null | undefined;
  resolution?: Record<string, unknown> | null | undefined;
  waitEventType?: string | null | undefined;
  waitEventKey?: string | null | undefined;
  metadata: Record<string, unknown>;
}

export interface Lease {
  leaseId: string;
  tenantId: string;
  leaseType: string;
  leaseKey: string;
  ownerSessionId: string;
  acquiredAt: Date;
  expiresAt: Date;
  heartbeatAt: Date;
  metadata: Record<string, unknown>;
}
