import { Hono } from "hono";

import type { AppEnv } from "../env";
import { registerV1Routes } from "./api/v1";

export const router = new Hono<AppEnv>();

router.get("/", (context) => {
  return context.json({
    service: "keystone-cloudflare",
    status: "ok"
  });
});

router.get("/healthz", (context) => {
  return context.json({
    ok: true,
    worker: "keystone-cloudflare",
    llmBaseUrl: context.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL
  });
});

router.get("/v1/health", (context) => {
  return context.json({
    ok: true,
    worker: "keystone-cloudflare",
    llmBaseUrl: context.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL
  });
});

registerV1Routes(router);
