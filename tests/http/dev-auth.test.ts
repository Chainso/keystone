import { describe, expect, it } from "vitest";

import { parseDevAuth } from "../../src/http/contracts/dev-auth";

const baseEnv = {
  KEYSTONE_DEV_TENANT_ID: "tenant-local",
  KEYSTONE_DEV_TOKEN: "secret-dev-token"
} as const;

describe("parseDevAuth", () => {
  it("accepts the configured dev token and header tenant", () => {
    const headers = new Headers({
      Authorization: "Bearer secret-dev-token",
      "X-Keystone-Tenant-Id": "tenant-from-header"
    });

    const result = parseDevAuth(headers, baseEnv);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.auth.tenantId).toBe("tenant-from-header");
      expect(result.auth.tokenFingerprint).toBe("****oken");
    }
  });

  it("falls back to the configured tenant id when the header is missing", () => {
    const headers = new Headers({
      Authorization: "Bearer secret-dev-token"
    });

    const result = parseDevAuth(headers, baseEnv);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.auth.tenantId).toBe("tenant-local");
    }
  });

  it("rejects an invalid token", () => {
    const headers = new Headers({
      Authorization: "Bearer wrong-token"
    });

    const result = parseDevAuth(headers, baseEnv);

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid_token"
    });
  });
});
