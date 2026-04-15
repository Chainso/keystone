import { describe, expect, it } from "vitest";

import { resolveDatabaseConnectionString } from "../../src/lib/db/client";

describe("resolveDatabaseConnectionString", () => {
  it("prefers an explicit connection string", () => {
    const connectionString = resolveDatabaseConnectionString({
      connectionString: "postgres://explicit"
    });

    expect(connectionString).toBe("postgres://explicit");
  });

  it("falls back to Hyperdrive when present", () => {
    const connectionString = resolveDatabaseConnectionString({
      HYPERDRIVE: {
        connectionString: "postgres://hyperdrive"
      }
    });

    expect(connectionString).toBe("postgres://hyperdrive");
  });

  it("uses the local Hyperdrive env var before DATABASE_URL", () => {
    const connectionString = resolveDatabaseConnectionString({
      CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: "postgres://local-hyperdrive",
      DATABASE_URL: "postgres://fallback"
    });

    expect(connectionString).toBe("postgres://local-hyperdrive");
  });

  it("throws when no connection source is available", () => {
    expect(() => resolveDatabaseConnectionString({})).toThrow(/Database connection string is missing/);
  });
});
