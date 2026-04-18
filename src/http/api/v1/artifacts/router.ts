import type { ApiRouteDefinition } from "../common/contracts";

export const artifactRouteMatrix = [
  {
    method: "GET",
    path: "/v1/artifacts/:artifactId",
    family: "artifacts",
    resourceType: "artifact",
    responseKind: "detail",
    implementation: "reused",
    availability: "contract_frozen"
  },
  {
    method: "GET",
    path: "/v1/artifacts/:artifactId/content",
    family: "artifacts",
    resourceType: "artifact",
    responseKind: "detail",
    implementation: "reused",
    availability: "contract_frozen",
    note: "Binary artifact content remains a Phase 2 projection task."
  }
] as const satisfies ApiRouteDefinition[];
