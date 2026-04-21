import type { Context } from "hono";

import type { AppEnv } from "../../env";

export async function runWebSocketHandler(_context: Context<AppEnv>) {
  return Response.json(
    {
      error: {
        code: "not_supported",
        message: "Real-time run websocket streaming is not supported."
      }
    },
    { status: 410 }
  );
}
