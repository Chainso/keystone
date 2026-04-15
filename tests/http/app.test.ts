import { describe, expect, it } from "vitest";

import { app } from "../../src/http/app";

const env = {
  ARTIFACTS_BUCKET: {} as R2Bucket,
  HYPERDRIVE: {} as Hyperdrive,
  KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "https://localhost:4001",
  KEYSTONE_CHAT_COMPLETIONS_MODEL: "gemini-3-flash-preview",
  KEYSTONE_DEV_TENANT_ID: "tenant-local",
  KEYSTONE_DEV_TOKEN: "secret-dev-token"
} as const;

describe("app", () => {
  it("serves the health route without auth", async () => {
    const response = await app.request("http://example.com/healthz", {}, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      llmBaseUrl: "https://localhost:4001"
    });
  });

  it("requires auth for run creation", async () => {
    const response = await app.request(
      "http://example.com/v1/runs",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repo: {
            localPath: "./fixtures/demo-target"
          },
          decisionPackage: {
            localPath: "./fixtures/demo-decision-package/decision-package.json"
          }
        })
      },
      env
    );

    expect(response.status).toBe(401);
  });

  it("accepts a scaffold run request with dev auth", async () => {
    const response = await app.request(
      "http://example.com/v1/runs",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        },
        body: JSON.stringify({
          repo: {
            localPath: "./fixtures/demo-target"
          },
          decisionPackage: {
            localPath: "./fixtures/demo-decision-package/decision-package.json"
          }
        })
      },
      env
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      status: "accepted",
      tenantId: "tenant-fixture",
      inputMode: {
        repo: "localPath",
        decisionPackage: "localPath"
      }
    });
  });
});
