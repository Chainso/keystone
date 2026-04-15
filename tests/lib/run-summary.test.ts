import { describe, expect, it } from "vitest";

import { buildRunSummary } from "../../src/lib/runs/summary";

describe("buildRunSummary", () => {
  it("combines persisted state and live snapshot", () => {
    const summary = buildRunSummary({
      tenantId: "tenant-a",
      runId: "run-1",
      sessions: [
        {
          tenantId: "tenant-a",
          sessionId: "de305d54-75b4-431b-adb2-eb6b9e546014",
          runId: "run-1",
          sessionType: "run",
          status: "configured",
          parentSessionId: null,
          createdAt: new Date("2026-04-14T00:00:00.000Z"),
          updatedAt: new Date("2026-04-14T00:00:00.000Z"),
          metadata: {
            repo: {
              source: "localPath"
            }
          }
        }
      ],
      events: [
        {
          tenantId: "tenant-a",
          eventId: crypto.randomUUID(),
          sessionId: "de305d54-75b4-431b-adb2-eb6b9e546014",
          runId: "run-1",
          taskId: null,
          seq: 1,
          eventType: "session.started",
          actor: "keystone",
          severity: "info",
          ts: new Date("2026-04-14T00:00:01.000Z"),
          idempotencyKey: null,
          artifactRefId: null,
          payload: {}
        }
      ],
      artifacts: [],
      liveSnapshot: {
        tenantId: "tenant-a",
        runId: "run-1",
        status: "configured",
        updatedAt: "2026-04-14T00:00:01.000Z",
        websocketCount: 2,
        latestEvent: {
          eventType: "session.started",
          severity: "info",
          timestamp: "2026-04-14T00:00:01.000Z"
        },
        eventCount: 1
      }
    });

    expect(summary.status).toBe("configured");
    expect(summary.sessions.total).toBe(1);
    expect(summary.live?.websocketCount).toBe(2);
    expect(summary.latestEvent?.eventType).toBe("session.started");
  });
});
