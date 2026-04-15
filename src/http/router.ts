import { Hono } from "hono";

import type { AppEnv } from "../env";
import { createRunHandler } from "./handlers/runs";
import { requireDevAuth } from "./middleware/auth";

export const router = new Hono<AppEnv>();

router.get("/", (context) => {
  return context.json({
    service: "keystone-cloudflare",
    status: "ok",
    phase: "m1-scaffold"
  });
});

router.get("/healthz", (context) => {
  return context.json({
    ok: true,
    worker: "keystone-cloudflare",
    llmBaseUrl: context.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL
  });
});

router.post("/v1/runs", requireDevAuth, createRunHandler);
