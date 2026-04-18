import { z } from "zod";

import { runCreateRequestSchema, type RunAcceptedAction } from "../api/v1/runs/contracts";

export const runInputSchema = runCreateRequestSchema;
export type RunInput = z.infer<typeof runInputSchema>;
export type RunCreateResponse = RunAcceptedAction;

export function parseRunInput(value: unknown) {
  return runInputSchema.parse(value);
}
