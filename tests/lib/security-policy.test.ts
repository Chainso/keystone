import { describe, expect, it } from "vitest";

import { evaluateOutboundHttpPolicy } from "../../src/lib/security/policy";

describe("security policy", () => {
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
