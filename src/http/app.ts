import { Hono } from "hono";
import type { HTTPResponseError } from "hono/types";

import type { AppEnv } from "../env";
import { router } from "./router";

export const app = new Hono<AppEnv>();

app.route("/", router);

app.notFound((context) => {
  return context.json(
    {
      error: {
        code: "not_found",
        message: `No route matches ${context.req.method} ${context.req.path}.`
      }
    },
    404
  );
});

app.onError((error: Error | HTTPResponseError, context) => {
  if ("getResponse" in error) {
    return error.getResponse();
  }

  console.error("Unhandled application error", error);

  return context.json(
    {
      error: {
        code: "internal_error",
        message: "Unexpected application error."
      }
    },
    500
  );
});
