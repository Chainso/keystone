import type { Hono } from "hono";

import type { AppEnv } from "../../../../env";
import {
  createProjectHandler,
  getProjectHandler,
  listProjectsHandler,
  updateProjectHandler
} from "../../../handlers/projects";
import { requireDevAuth } from "../../../middleware/auth";
import type { ApiRouteDefinition } from "../common/contracts";

export const projectRouteMatrix = [
  {
    method: "GET",
    path: "/v1/projects",
    family: "projects",
    resourceType: "project",
    responseKind: "collection",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "POST",
    path: "/v1/projects",
    family: "projects",
    resourceType: "project",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/projects/:projectId",
    family: "projects",
    resourceType: "project",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "PUT",
    path: "/v1/projects/:projectId",
    family: "projects",
    resourceType: "project",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/projects/:projectId/documents",
    family: "projects",
    resourceType: "project_document",
    responseKind: "collection",
    implementation: "stub",
    availability: "contract_frozen"
  },
  {
    method: "GET",
    path: "/v1/projects/:projectId/decision-packages",
    family: "projects",
    resourceType: "decision_package",
    responseKind: "collection",
    implementation: "stub",
    availability: "contract_frozen"
  },
  {
    method: "GET",
    path: "/v1/projects/:projectId/runs",
    family: "projects",
    resourceType: "run",
    responseKind: "collection",
    implementation: "projected",
    availability: "contract_frozen"
  }
] as const satisfies ApiRouteDefinition[];

export function registerProjectRoutes(router: Hono<AppEnv>) {
  router.get("/v1/projects", requireDevAuth, listProjectsHandler);
  router.post("/v1/projects", requireDevAuth, createProjectHandler);
  router.get("/v1/projects/:projectId", requireDevAuth, getProjectHandler);
  router.put("/v1/projects/:projectId", requireDevAuth, updateProjectHandler);
}
