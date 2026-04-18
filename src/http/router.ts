import { Hono } from "hono";

import type { AppEnv } from "../env";
import { runCompileSmokeHandler } from "./handlers/dev-compile";
import { runSandboxSmokeHandler } from "./handlers/dev-smoke";
import { runThinkSmokeHandler } from "./handlers/dev-think";
import { registerV1Routes } from "./api/v1";
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

router.get("/v1/health", (context) => {
  return context.json({
    ok: true,
    worker: "keystone-cloudflare",
    phase: "m1-phase-6-compile",
    llmBaseUrl: context.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL
  });
});

registerV1Routes(router);
router.post("/internal/dev/compile-smoke", requireDevAuth, runCompileSmokeHandler);
router.post("/internal/dev/sandbox-smoke", requireDevAuth, runSandboxSmokeHandler);
router.post("/internal/dev/think-smoke", requireDevAuth, runThinkSmokeHandler);
