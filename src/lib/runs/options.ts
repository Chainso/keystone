export const executionEngineValues = ["scripted", "think_mock", "think_live"] as const;
const executionEngineKinds = new Set<string>(executionEngineValues);
export type ExecutionEngine = (typeof executionEngineValues)[number];

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
  existingExecutionEngine?: unknown
): ExecutionEngine {
  return (
    parseExecutionEngine(existingExecutionEngine) ??
    parseExecutionEngine(requestedExecutionEngine) ??
    "scripted"
  );
}

export function isLiveThinkExecution(executionEngine: ExecutionEngine) {
  return executionEngine === "think_live";
}

export function isMockThinkExecution(executionEngine: ExecutionEngine) {
  return executionEngine === "think_mock";
}
