import type { Hono } from "hono";

import type { AppEnv } from "../../../env";
import { registerArtifactRoutes } from "./artifacts/router";
import { registerDecisionPackageRoutes } from "./decision-packages/router";
import { registerProjectRoutes } from "./projects/router";
import { registerRunRoutes } from "./runs/router";

export { v1RouteMatrix } from "./route-matrix";
export * from "./artifacts/contracts";
export * from "./common/contracts";
export * from "./decision-packages/contracts";
export * from "./documents/contracts";
export * from "./projects/contracts";
export * from "./runs/contracts";

export function registerV1Routes(router: Hono<AppEnv>) {
  registerProjectRoutes(router);
  registerDecisionPackageRoutes(router);
  registerRunRoutes(router);
  registerArtifactRoutes(router);
}
