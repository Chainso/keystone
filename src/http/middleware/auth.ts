import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { AppEnv } from "../../env";
import { jsonErrorResponse } from "../../lib/http/errors";
import { parseDevAuthRequest } from "../contracts/dev-auth";

export const requireDevAuth = createMiddleware<AppEnv>(async (context, next) => {
  const result = parseDevAuthRequest(context.req.raw, {
    KEYSTONE_DEV_TENANT_ID: context.env.KEYSTONE_DEV_TENANT_ID,
    KEYSTONE_DEV_TOKEN: context.env.KEYSTONE_DEV_TOKEN
  });

  if (!result.ok) {
    throw new HTTPException(401, {
      res: jsonErrorResponse("unauthorized", result.message, 401)
    });
  }

  context.set("auth", result.auth);

  await next();
});
