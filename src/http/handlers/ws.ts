import type { Context } from "hono";

import type { AppEnv } from "../../env";
import { getRunCoordinatorStub } from "../../lib/auth/tenant";

export async function runWebSocketHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const runId = context.req.param("runId");

  if (!runId) {
    return Response.json(
      {
        error: {
          code: "invalid_path",
          message: "Run ID is required."
        }
      },
      { status: 400 }
    );
  }

  const coordinator = getRunCoordinatorStub(context.env, auth.tenantId, runId);

  return coordinator.fetch(context.req.raw);
}
