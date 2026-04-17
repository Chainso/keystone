const POLL_INTERVAL_MS = 2_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 30;
const LIVE_THINK_MAX_POLL_ATTEMPTS = 90;

function getArg(name: string) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJsonResponse(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

function resolveBaseUrl() {
  return getArg("base-url") ?? process.env.KEYSTONE_BASE_URL ?? "http://127.0.0.1:8787";
}

function resolveRuntime() {
  return getArg("runtime") ?? process.env.KEYSTONE_AGENT_RUNTIME ?? "scripted";
}

function resolveThinkMode() {
  return getArg("think-mode") ?? process.env.KEYSTONE_THINK_DEMO_MODE ?? "mock";
}

function parseBooleanFlag(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return !["0", "false", "no"].includes(value.trim().toLowerCase());
}

function resolvePreserveSandbox(runtime: string, thinkMode: string) {
  return parseBooleanFlag(
    getArg("preserve-sandbox") ?? process.env.KEYSTONE_PRESERVE_SANDBOX,
    runtime === "think" && thinkMode === "live"
  );
}

function resolveStreamEvents(runtime: string, thinkMode: string) {
  return parseBooleanFlag(
    getArg("stream-events") ?? process.env.KEYSTONE_STREAM_EVENTS,
    runtime === "think" && thinkMode === "live"
  );
}

function resolveMaxPollAttempts(runtime: string, thinkMode: string) {
  if (runtime === "think" && thinkMode === "live") {
    return LIVE_THINK_MAX_POLL_ATTEMPTS;
  }

  return DEFAULT_MAX_POLL_ATTEMPTS;
}

function isRunComplete(summary: Record<string, unknown>) {
  const status = String(summary.status ?? "unknown");
  const artifacts = summary.artifacts as
    | {
        byKind?: Record<string, number>;
      }
    | undefined;

  if (status === "failed" || status === "cancelled") {
    return true;
  }

  return status === "archived" && (artifacts?.byKind?.run_summary ?? 0) >= 1;
}

async function createFixtureRun() {
  const baseUrl = resolveBaseUrl();
  const runtime = resolveRuntime();
  const thinkMode = resolveThinkMode();
  const preserveSandbox = resolvePreserveSandbox(runtime, thinkMode);
  const response = await fetch(`${baseUrl}/v1/runs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token"}`,
      "Content-Type": "application/json",
      "X-Keystone-Agent-Runtime": runtime,
      "X-Keystone-Tenant-Id": process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local"
    },
    body: JSON.stringify({
      repo: {
        localPath: "./fixtures/demo-target"
      },
      decisionPackage: {
        localPath: "./fixtures/demo-decision-package/decision-package.json"
      },
      options: {
        thinkMode,
        preserveSandbox
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Demo run creation failed with ${response.status}: ${await response.text()}`);
  }

  return readJsonResponse(response);
}

async function fetchRunSummary(runId: string) {
  const baseUrl = resolveBaseUrl();
  const response = await fetch(
    `${baseUrl}/v1/runs/${runId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token"}`,
        "X-Keystone-Tenant-Id": process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Run summary fetch failed with ${response.status}: ${await response.text()}`);
  }

  return readJsonResponse(response);
}

async function fetchRunEvents(runId: string) {
  const baseUrl = resolveBaseUrl();
  const response = await fetch(
    `${baseUrl}/v1/runs/${runId}/events`,
    {
      headers: {
        Authorization: `Bearer ${process.env.KEYSTONE_DEV_TOKEN ?? "change-me-local-token"}`,
        "X-Keystone-Tenant-Id": process.env.KEYSTONE_DEMO_TENANT_ID ?? "tenant-dev-local"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Run events fetch failed with ${response.status}: ${await response.text()}`);
  }

  return readJsonResponse(response);
}

function formatEventPayload(payload: Record<string, unknown> | undefined) {
  if (!payload || Object.keys(payload).length === 0) {
    return "";
  }

  const notableKeys = [
    "status",
    "summary",
    "taskId",
    "runtime",
    "toolName",
    "path",
    "command",
    "exitCode",
    "success",
    "sandboxId",
    "worktreePath",
    "workspaceTargetPath",
    "storageUri",
    "stagedPath",
    "error",
    "message",
    "text"
  ] as const;
  const notableEntries = notableKeys
    .filter((key) => payload[key] !== undefined && payload[key] !== null)
    .map((key) => `${key}=${JSON.stringify(payload[key])}`);

  if (notableEntries.length > 0) {
    return notableEntries.join(" ");
  }

  return JSON.stringify(payload);
}

function emitNewEvents(
  eventsResponse: Record<string, unknown>,
  seenEventIds: Set<string>
) {
  const events = Array.isArray(eventsResponse.events)
    ? (eventsResponse.events as Array<Record<string, unknown>>)
    : [];

  for (const event of events) {
    const eventId = typeof event.eventId === "string" ? event.eventId : "";

    if (!eventId || seenEventIds.has(eventId)) {
      continue;
    }

    seenEventIds.add(eventId);

    const timestamp = typeof event.timestamp === "string" ? event.timestamp : "unknown-ts";
    const eventType = typeof event.eventType === "string" ? event.eventType : "unknown-event";
    const actor = typeof event.actor === "string" ? event.actor : "unknown-actor";
    const severity = typeof event.severity === "string" ? event.severity : "info";
    const taskId = typeof event.taskId === "string" ? event.taskId : null;
    const payload =
      event.payload && typeof event.payload === "object"
        ? (event.payload as Record<string, unknown>)
        : undefined;
    const formattedPayload = formatEventPayload(payload);

    console.log(
      [
        `[event ${timestamp}]`,
        severity,
        eventType,
        `actor=${actor}`,
        ...(taskId ? [`task=${taskId}`] : []),
        ...(formattedPayload ? [formattedPayload] : [])
      ].join(" ")
    );
  }
}

async function main() {
  const createdRun = await createFixtureRun();
  const runId = String(createdRun.runId ?? "");
  const baseUrl = resolveBaseUrl();
  const runtime = resolveRuntime();
  const thinkMode = resolveThinkMode();
  const preserveSandbox = resolvePreserveSandbox(runtime, thinkMode);
  const streamEvents = resolveStreamEvents(runtime, thinkMode);
  const maxPollAttempts = resolveMaxPollAttempts(runtime, thinkMode);
  const seenEventIds = new Set<string>();

  if (!runId) {
    throw new Error("Run creation response did not include runId.");
  }

  if (streamEvents) {
    console.log(`[demo] streaming persisted run events for ${runId}`);
  }

  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    if (streamEvents) {
      const eventsResponse = await fetchRunEvents(runId);
      emitNewEvents(eventsResponse, seenEventIds);
    }

    const summary = await fetchRunSummary(runId);
    const status = String(summary.status ?? "unknown");

    if (isRunComplete(summary)) {
      console.log(
        JSON.stringify(
          {
            baseUrl,
            runId,
            runtime,
            thinkMode,
            preserveSandbox,
            status,
            summary,
            ...(preserveSandbox
              ? {
                  sandboxShellHint:
                    "Sandbox preserved for inspection. Run `npm run sandbox:shell` while the local Worker is still running."
                }
              : {})
          },
          null,
          2
        )
      );
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Demo run ${runId} did not finish within ${maxPollAttempts * POLL_INTERVAL_MS}ms.`);
}

await main();
