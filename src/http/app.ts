import { Hono } from "hono";
import type { HTTPResponseError } from "hono/types";

import type { AppEnv } from "../env";
import { jsonErrorResponse } from "../lib/http/errors";
import { router } from "./router";

export const app = new Hono<AppEnv>();

app.route("/", router);

app.notFound(() => {
  return jsonErrorResponse(
    "not_found",
    "No route matches the requested path.",
    404
  );
});

app.onError((error: Error | HTTPResponseError) => {
  if ("getResponse" in error) {
    return error.getResponse();
  }

  console.error("Unhandled application error", error);

  return jsonErrorResponse("internal_error", "Unexpected application error.", 500);
});
