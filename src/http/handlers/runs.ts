import type { Context } from "hono";

import type { AppEnv } from "../../env";
import { parseRunInput } from "../contracts/run-input";

export async function createRunHandler(context: Context<AppEnv>) {
  const body = await context.req.json();
  const auth = context.get("auth");
  const input = parseRunInput(body);

  return context.json(
    {
      runId: crypto.randomUUID(),
      status: "accepted",
      tenantId: auth.tenantId,
      authMode: auth.authMode,
      inputMode: {
        repo: input.repo.source,
        decisionPackage: input.decisionPackage.source
      },
      message:
        "Phase 1 scaffold accepted the request. Durable execution is not implemented yet."
    },
    202
  );
}
