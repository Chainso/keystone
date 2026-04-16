import type { WorkerBindings } from "../../env";
import type { SessionStatus } from "../../maestro/contracts";
import { getRunCoordinatorStub } from "../auth/tenant";
import type { DatabaseClient } from "../db/client";
import { appendSessionEvent, type AppendSessionEventInput } from "../db/events";

export async function appendAndPublishRunEvent(
  client: DatabaseClient,
  env: Pick<WorkerBindings, "RUN_COORDINATOR">,
  input: AppendSessionEventInput & {
    status?: SessionStatus | undefined;
  }
) {
  const event = await appendSessionEvent(client, input);

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
