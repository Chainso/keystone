import { z } from "zod";

import type { AuthContext } from "../../env";

export interface DevAuthBindings {
  KEYSTONE_DEV_TENANT_ID?: string | undefined;
  KEYSTONE_DEV_TOKEN?: string | undefined;
}

const bearerSchema = z
  .string()
  .trim()
  .regex(/^Bearer\s+.+$/i, "Expected a Bearer token.");

export type DevAuthFailureReason =
  | "missing_token"
  | "invalid_token"
  | "missing_tenant";

export type DevAuthSuccess = {
  ok: true;
  auth: AuthContext;
};

export type DevAuthFailure = {
  ok: false;
  reason: DevAuthFailureReason;
  message: string;
};

export type DevAuthResult = DevAuthFailure | DevAuthSuccess;

export const devAuthQueryTokenParam = "keystoneToken";
export const devAuthQueryTenantParam = "keystoneTenantId";

function constantTimeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);

  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < leftBytes.length; index += 1) {
    const leftByte = leftBytes[index];
    const rightByte = rightBytes[index];

    if (leftByte === undefined || rightByte === undefined) {
      return false;
    }

    diff |= leftByte ^ rightByte;
  }

  return diff === 0;
}

function fingerprintToken(token: string) {
  return token.slice(-4).padStart(8, "*");
}

export function parseDevAuth(
  headers: Headers,
  env: DevAuthBindings
): DevAuthResult {
  const authorization = headers.get("authorization");
  const tenantHeader = headers.get("x-keystone-tenant-id")?.trim();
  const tenantId = tenantHeader || env.KEYSTONE_DEV_TENANT_ID?.trim();

  if (!authorization || !env.KEYSTONE_DEV_TOKEN) {
    return {
      ok: false,
      reason: "missing_token",
      message: "Expected Authorization: Bearer <KEYSTONE_DEV_TOKEN>."
    };
  }

  const parsedAuthorization = bearerSchema.safeParse(authorization);

  if (!parsedAuthorization.success) {
    return {
      ok: false,
      reason: "invalid_token",
      message: parsedAuthorization.error.issues[0]?.message ?? "Invalid bearer token."
    };
  }

  const providedToken = parsedAuthorization.data.replace(/^Bearer\s+/i, "").trim();

  if (!constantTimeEqual(providedToken, env.KEYSTONE_DEV_TOKEN)) {
    return {
      ok: false,
      reason: "invalid_token",
      message: "Bearer token did not match KEYSTONE_DEV_TOKEN."
    };
  }

  if (!tenantId) {
    return {
      ok: false,
      reason: "missing_tenant",
      message:
        "Provide X-Keystone-Tenant-Id or set KEYSTONE_DEV_TENANT_ID for local development."
    };
  }

  return {
    ok: true,
    auth: {
      authMode: "dev",
      tenantId,
      tokenFingerprint: fingerprintToken(providedToken)
    }
  };
}

export function parseDevAuthRequest(
  request: Request,
  env: DevAuthBindings
): DevAuthResult {
  const headers = new Headers(request.headers);
  const url = new URL(request.url);
  const queryToken = url.searchParams.get(devAuthQueryTokenParam)?.trim();
  const queryTenantId = url.searchParams.get(devAuthQueryTenantParam)?.trim();
  const allowQueryFallback = url.pathname === "/agents" || url.pathname.startsWith("/agents/");

  if (allowQueryFallback && !headers.get("authorization") && queryToken) {
    headers.set("authorization", `Bearer ${queryToken}`);
  }

  if (allowQueryFallback && !headers.get("x-keystone-tenant-id") && queryTenantId) {
    headers.set("x-keystone-tenant-id", queryTenantId);
  }

  return parseDevAuth(headers, env);
}
