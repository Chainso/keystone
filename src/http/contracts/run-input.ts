import { z } from "zod";

import { runCreateRequestSchema, type RunCreateRequest } from "../api/v1/runs/contracts";

export const runInputSchema = runCreateRequestSchema.strict();
export type RunInput = z.infer<typeof runInputSchema>;
export type RunCreateResponse = RunCreateRequest;

export function parseRunInput(value: unknown) {
  return runInputSchema.parse(value);
}
