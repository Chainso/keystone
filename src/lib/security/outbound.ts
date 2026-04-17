import type { WorkerBindings } from "../../env";
import { evaluateOutboundHttpPolicy } from "./policy";

export function assertOutboundUrlAllowed(
  env: Pick<WorkerBindings, "KEYSTONE_CHAT_COMPLETIONS_BASE_URL">,
  requestedUrl: string,
  purpose: string
) {
  const decision = evaluateOutboundHttpPolicy({
    requestedUrl,
    allowedBaseUrl: env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL
  });

  if (decision.result !== "allow") {
    throw new Error(`Outbound request denied for ${purpose}: ${decision.reason}`);
  }

  return decision;
}
