import { describe, expect, it } from "vitest";

import { evaluateOutboundHttpPolicy, evaluateRepoSourcePolicy } from "../../src/lib/security/policy";

describe("security policy", () => {
  it("allows local path repo inputs without approval", () => {
    expect(
      evaluateRepoSourcePolicy({
        source: "localPath",
        localPath: "./fixtures/demo-target"
      })
    ).toMatchObject({
      result: "allow"
    });
  });

  it("requires approval for git url repo inputs", () => {
    expect(
      evaluateRepoSourcePolicy({
        source: "gitUrl",
        gitUrl: "https://github.com/octocat/Hello-World.git"
      })
    ).toMatchObject({
      result: "require_approval",
      approvalType: "outbound_network"
    });
  });

  it("allows the configured chat completions origin", () => {
    expect(
      evaluateOutboundHttpPolicy({
        requestedUrl: "http://localhost:10531/v1/chat/completions",
        allowedBaseUrl: "http://localhost:10531"
      })
    ).toMatchObject({
      result: "allow"
    });
  });

  it("denies non-allowlisted outbound origins", () => {
    expect(
      evaluateOutboundHttpPolicy({
        requestedUrl: "https://example.com/v1/chat/completions",
        allowedBaseUrl: "http://localhost:10531"
      })
    ).toMatchObject({
      result: "deny"
    });
  });
});
