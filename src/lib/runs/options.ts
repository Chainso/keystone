import { z } from "zod";

export const thinkDemoModeValues = ["mock", "live"] as const;

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
