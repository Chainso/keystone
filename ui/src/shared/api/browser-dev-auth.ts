import {
  devAuthQueryTenantParam,
  devAuthQueryTokenParam
} from "../../../../src/http/contracts/dev-auth";

const defaultBrowserDevAuth = {
  token: "change-me-local-token",
  tenantId: "tenant-dev-local"
} as const;

declare global {
  interface Window {
    __KESTONE_UI_DEV_AUTH__?:
      | {
          token?: string;
          tenantId?: string;
        }
      | undefined;
  }
}

export function resolveBrowserDevAuth() {
  const providedAuth =
    typeof window === "undefined" ? undefined : window.__KESTONE_UI_DEV_AUTH__;

  return {
    token: providedAuth?.token?.trim() || defaultBrowserDevAuth.token,
    tenantId: providedAuth?.tenantId?.trim() || defaultBrowserDevAuth.tenantId
  };
}

export function buildProtectedBrowserHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const auth = resolveBrowserDevAuth();

  nextHeaders.set("Authorization", `Bearer ${auth.token}`);
  nextHeaders.set("X-Keystone-Tenant-Id", auth.tenantId);

  return nextHeaders;
}

export function buildProtectedBrowserQuery() {
  const auth = resolveBrowserDevAuth();

  return {
    [devAuthQueryTokenParam]: auth.token,
    [devAuthQueryTenantParam]: auth.tenantId
  };
}
