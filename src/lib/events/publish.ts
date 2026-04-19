import type { WorkerBindings } from "../../env";
import type { SessionStatus } from "../../maestro/contracts";
import { getRunCoordinatorStub } from "../auth/tenant";
import type { DatabaseClient } from "../db/client";
import {
  appendSessionEvent,
  getSessionEventByIdempotencyKey,
  type AppendSessionEventInput
} from "../db/events";

export async function appendAndPublishRunEvent(
  client: DatabaseClient,
  env: Pick<WorkerBindings, "RUN_COORDINATOR">,
  input: AppendSessionEventInput & {
    status?: SessionStatus | undefined;
  }
) {
  const event =
    input.idempotencyKey == null
      ? await appendSessionEvent(client, input)
      : ((await getSessionEventByIdempotencyKey(client, {
          tenantId: input.tenantId,
          sessionId: input.sessionId,
          idempotencyKey: input.idempotencyKey
        })) ??
        (await appendSessionEvent(client, input)));

  if (!event) {
    throw new Error(`Failed to append event ${input.eventType}.`);
  }

  const coordinator = getRunCoordinatorStub(env, input.tenantId, input.runId);

  await coordinator.publish({
    eventType: input.eventType,
    severity: input.severity,
    timestamp: event.ts.toISOString(),
    status: input.status
  });

  return event;
}

export async function appendAndPublishRunEvents(
  client: DatabaseClient,
  env: Pick<WorkerBindings, "RUN_COORDINATOR">,
  inputs: Array<
    AppendSessionEventInput & {
      status?: SessionStatus | undefined;
    }
  >
) {
  const events = [];

  for (const input of inputs) {
    events.push(await appendAndPublishRunEvent(client, env, input));
  }

  return events;
}
