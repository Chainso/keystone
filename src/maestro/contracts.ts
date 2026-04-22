export const workspaceStrategyValues = ["worktree", "clone_fetch"] as const;

export type WorkspaceStrategy = (typeof workspaceStrategyValues)[number];

export const agentRuntimeKindValues = ["scripted", "think"] as const;

export type AgentRuntimeKind = (typeof agentRuntimeKindValues)[number];

export const artifactStorageBackendValues = ["r2", "external"] as const;

export type ArtifactStorageBackend = (typeof artifactStorageBackendValues)[number];
