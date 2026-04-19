import { agentRuntimeKindValues, type AgentRuntimeKind } from "../../maestro/contracts";
import { z } from "zod";

export const thinkDemoModeValues = ["mock", "live"] as const;
const executionEngineKinds = new Set<string>(agentRuntimeKindValues);

export const runExecutionOptionsSchema = z
  .object({
    thinkMode: z.enum(thinkDemoModeValues).optional(),
    preserveSandbox: z.boolean().optional()
  })
  .transform((value) => ({
    thinkMode: value.thinkMode ?? "mock",
    preserveSandbox: value.preserveSandbox ?? false
  }));

export type ThinkDemoMode = (typeof thinkDemoModeValues)[number];
export type RunExecutionOptions = z.output<typeof runExecutionOptionsSchema>;
export type ExecutionEngine = AgentRuntimeKind;

export function parseExecutionEngine(value: unknown): ExecutionEngine | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!executionEngineKinds.has(normalized)) {
    return null;
  }

  return normalized as ExecutionEngine;
}

export function resolveRunExecutionEngine(
  requestedExecutionEngine: unknown,
  existingMetadata?: Record<string, unknown> | null | undefined
): ExecutionEngine {
  return (
    parseExecutionEngine(existingMetadata?.executionEngine) ??
    parseExecutionEngine(existingMetadata?.runtime) ??
    parseExecutionEngine(requestedExecutionEngine) ??
    "scripted"
  );
}

export function parseRunExecutionOptions(value: unknown): RunExecutionOptions {
  return runExecutionOptionsSchema.parse(value ?? {});
}

export function resolveRunExecutionOptions(
  requestedOptions: unknown,
  existingMetadata?: Record<string, unknown> | null | undefined
): RunExecutionOptions {
  const existingResult = runExecutionOptionsSchema.safeParse(existingMetadata?.options);

  if (existingResult.success) {
    return existingResult.data;
  }

  return parseRunExecutionOptions(requestedOptions);
}

export function isLiveThinkExecution(
  runtime: ExecutionEngine,
  options: RunExecutionOptions
) {
  return runtime === "think" && options.thinkMode === "live";
}

export function isMockThinkExecution(
  runtime: ExecutionEngine,
  options: RunExecutionOptions
) {
  return runtime === "think" && options.thinkMode === "mock";
}
