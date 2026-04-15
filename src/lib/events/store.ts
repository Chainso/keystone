import type { DatabaseClient } from "../db/client";
import {
  appendSessionEvent,
  listRunEvents,
  listSessionEvents,
  type AppendSessionEventInput
} from "../db/events";

export interface EventStore {
  append: (input: AppendSessionEventInput) => Promise<Awaited<ReturnType<typeof appendSessionEvent>>>;
  listBySession: (input: {
    tenantId: string;
    sessionId: string;
  }) => Promise<Awaited<ReturnType<typeof listSessionEvents>>>;
  listByRun: (input: {
    tenantId: string;
    runId: string;
  }) => Promise<Awaited<ReturnType<typeof listRunEvents>>>;
}

export function createEventStore(client: DatabaseClient): EventStore {
  return {
    append: (input) => appendSessionEvent(client, input),
    listBySession: (input) => listSessionEvents(client, input),
    listByRun: (input) => listRunEvents(client, input)
  };
}
