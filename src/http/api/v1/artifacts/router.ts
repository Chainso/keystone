import type { ApiRouteDefinition } from "../common/contracts";
import type { Hono } from "hono";
import type { AppEnv } from "../../../../env";
import { requireDevAuth } from "../../../middleware/auth";
import { getArtifactContentHandler, getArtifactHandler } from "./handlers";

export const artifactRouteMatrix = [
  {
    method: "GET",
    path: "/v1/artifacts/:artifactId",
    family: "artifacts",
    resourceType: "artifact",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/artifacts/:artifactId/content",
    family: "artifacts",
    resourceType: "artifact",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented",
    note: "Content is streamed directly from the current R2-backed artifact storage."
  }
] as const satisfies ApiRouteDefinition[];

export function registerArtifactRoutes(router: Hono<AppEnv>) {
  router.get("/v1/artifacts/:artifactId", requireDevAuth, getArtifactHandler);
  router.get("/v1/artifacts/:artifactId/content", requireDevAuth, getArtifactContentHandler);
}
