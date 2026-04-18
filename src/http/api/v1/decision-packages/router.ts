import type { ApiRouteDefinition } from "../common/contracts";

export const decisionPackageRouteMatrix = [
  {
    method: "GET",
    path: "/v1/decision-packages/:decisionPackageId",
    family: "decision-packages",
    resourceType: "decision_package",
    responseKind: "detail",
    implementation: "stub",
    availability: "contract_frozen"
  }
] as const satisfies ApiRouteDefinition[];
