import type { Context } from "hono";
import { routeAgentRequest } from "agents";

import type { AppEnv } from "../../env";
import { jsonErrorResponse } from "../../lib/http/errors";

export async function handleAgentRequest(context: Context<AppEnv>) {
  const response = await routeAgentRequest(context.req.raw, context.env);

  if (!response) {
    return jsonErrorResponse("not_found", "No route matches the requested path.", 404);
  }

  return response;
}
