import type { ApiRouteDefinition } from "./common/contracts";
import { artifactRouteMatrix } from "./artifacts/router";
import { projectRouteMatrix } from "./projects/router";
import { runRouteMatrix } from "./runs/router";

export const v1RouteMatrix = [
  ...projectRouteMatrix,
  ...runRouteMatrix,
  ...artifactRouteMatrix
] as const satisfies ApiRouteDefinition[];
