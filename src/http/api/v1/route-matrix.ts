import type { ApiRouteDefinition } from "./common/contracts";
import { artifactRouteMatrix } from "./artifacts/router";
import { decisionPackageRouteMatrix } from "./decision-packages/router";
import { projectRouteMatrix } from "./projects/router";
import { runRouteMatrix } from "./runs/router";

export const v1RouteMatrix = [
  ...projectRouteMatrix,
  ...decisionPackageRouteMatrix,
  ...runRouteMatrix,
  ...artifactRouteMatrix
] as const satisfies ApiRouteDefinition[];
