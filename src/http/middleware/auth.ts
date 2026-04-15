import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import type { AppEnv } from "../../env";
import { parseDevAuth } from "../contracts/dev-auth";

export const requireDevAuth = createMiddleware<AppEnv>(async (context, next) => {
  const result = parseDevAuth(context.req.raw.headers, {
    KEYSTONE_DEV_TENANT_ID: context.env.KEYSTONE_DEV_TENANT_ID,
    KEYSTONE_DEV_TOKEN: context.env.KEYSTONE_DEV_TOKEN
  });

  if (!result.ok) {
    throw new HTTPException(401, {
      message: result.message
    });
  }

  context.set("auth", result.auth);

  await next();
});
