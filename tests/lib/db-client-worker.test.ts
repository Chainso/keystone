import { beforeEach, describe, expect, it, vi } from "vitest";

describe("createWorkerDatabaseClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("does not end Hyperdrive-backed clients on close", async () => {
    const end = vi.fn(async () => undefined);
    const postgresMock = vi.fn(() => ({
      end
    }));
    const drizzleMock = vi.fn(() => ({}));

    vi.doMock("postgres", () => ({
      default: postgresMock
    }));
    vi.doMock("drizzle-orm/postgres-js", () => ({
      drizzle: drizzleMock
    }));

    const { createWorkerDatabaseClient } = await import("../../src/lib/db/client");
    const client = createWorkerDatabaseClient({
      HYPERDRIVE: {
        connectionString: "postgres://hyperdrive-worker"
      } as Hyperdrive
    });

    await client.close();

    expect(postgresMock).toHaveBeenCalledWith(
      "postgres://hyperdrive-worker",
      expect.objectContaining({
        max: 1,
        prepare: true
      })
    );
    expect(end).not.toHaveBeenCalled();
  });
});
