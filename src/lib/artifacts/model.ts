import { z } from "zod";

export const artifactKindValues = [
  "document_revision",
  "run_plan",
  "task_handoff",
  "task_log",
  "run_note",
  "run_summary",
  "staged_output"
] as const;

export type ArtifactKind = (typeof artifactKindValues)[number];

export const artifactKindSchema = z.enum(artifactKindValues);

const artifactKindSet = new Set<string>(artifactKindValues);

export function isArtifactKind(value: string): value is ArtifactKind {
  return artifactKindSet.has(value);
}

export function parseArtifactKind(value: string): ArtifactKind {
  if (isArtifactKind(value)) {
    return value;
  }

  throw new Error(`Artifact kind ${value} is not supported by the current model.`);
}

export const agentRuntimeArtifactKindValues = ["run_note", "staged_output"] as const;

export type AgentRuntimeArtifactKind = (typeof agentRuntimeArtifactKindValues)[number];

export const agentRuntimeArtifactKindSchema = z.enum(agentRuntimeArtifactKindValues);

const agentRuntimeArtifactKindSet = new Set<string>(agentRuntimeArtifactKindValues);

export function isAgentRuntimeArtifactKind(value: string): value is AgentRuntimeArtifactKind {
  return agentRuntimeArtifactKindSet.has(value);
}

export function parseAgentRuntimeArtifactKind(value: string): AgentRuntimeArtifactKind {
  if (isAgentRuntimeArtifactKind(value)) {
    return value;
  }

  throw new Error(
    `Agent runtime artifact kind ${value} is not supported by the current model.`
  );
}
