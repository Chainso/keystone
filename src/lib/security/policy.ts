import type { CompileRepoSource } from "../../keystone/compile/plan-run";

export interface CapabilityPolicyDecision {
  result: "allow" | "deny" | "require_approval";
  capability: string;
  reason: string;
  approvalType?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export function evaluateRepoSourcePolicy(repo: CompileRepoSource): CapabilityPolicyDecision {
  if (repo.source === "localPath") {
    return {
      result: "allow",
      capability: "fs.read",
      reason: "Local repo inputs stay on the deterministic local development path."
    };
  }

  return {
    result: "require_approval",
    capability: "net.http",
    approvalType: "outbound_network",
    reason: "Git URL inputs require outbound network access and must be explicitly approved in M1.",
    metadata: {
      gitUrl: repo.gitUrl,
      ref: repo.ref ?? null
    }
  };
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
    reason: `Outbound access to ${requested.origin} is denied by default in M1.`
  };
}
