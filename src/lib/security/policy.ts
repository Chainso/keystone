export interface CapabilityPolicyDecision {
  result: "allow" | "deny";
  capability: string;
  reason: string;
  metadata?: Record<string, unknown> | undefined;
}

export function evaluateOutboundHttpPolicy(input: {
  requestedUrl: string;
  allowedBaseUrl: string;
}): CapabilityPolicyDecision {
  const requested = new URL(input.requestedUrl);
  const allowed = new URL(input.allowedBaseUrl);

  if (requested.origin === allowed.origin) {
    return {
      result: "allow",
      capability: "net.http",
      reason: "Requested outbound host is on the configured allow-list."
    };
  }

  return {
    result: "deny",
    capability: requested.protocol === "https:" ? "net.https" : "net.http",
    reason: `Outbound access to ${requested.origin} is denied by default.`
  };
}
