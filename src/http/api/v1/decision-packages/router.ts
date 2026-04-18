import type { ApiRouteDefinition } from "../common/contracts";
import type { Hono } from "hono";
import type { AppEnv } from "../../../../env";
import { requireDevAuth } from "../../../middleware/auth";
import { getDecisionPackageHandler } from "./handlers";

export const decisionPackageRouteMatrix = [
  {
    method: "GET",
    path: "/v1/decision-packages/:decisionPackageId",
    family: "decision-packages",
    resourceType: "decision_package",
    responseKind: "detail",
    implementation: "stub",
    availability: "implemented",
    note: "Returns a typed stub detail until decision packages are persisted independently from runs."
  }
] as const satisfies ApiRouteDefinition[];

export function registerDecisionPackageRoutes(router: Hono<AppEnv>) {
  router.get(
    "/v1/decision-packages/:decisionPackageId",
    requireDevAuth,
    getDecisionPackageHandler
  );
}
