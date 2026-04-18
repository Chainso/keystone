import type { Context } from "hono";

import type { AppEnv } from "../../../../env";
import { decisionPackageDetailEnvelopeSchema, decisionPackageResourceSchema } from "./contracts";

export async function getDecisionPackageHandler(context: Context<AppEnv>) {
  const decisionPackageId = context.req.param("decisionPackageId");
  const auth = context.get("auth");

  return context.json(
    decisionPackageDetailEnvelopeSchema.parse({
      data: decisionPackageResourceSchema.parse({
        resourceType: "decision_package",
        scaffold: {
          implementation: "stub",
          note:
            "Decision packages are not yet persisted as first-class resources outside run artifacts."
        },
        tenantId: auth.tenantId,
        decisionPackageId,
        projectId: null,
        summary: null,
        objectives: [],
        tasks: [],
        source: "unknown",
        status: "stub",
        createdAt: null,
        updatedAt: null
      }),
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "decision_package"
      }
    })
  );
}
