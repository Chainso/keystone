import type { Hono } from "hono";

import type { AppEnv } from "../../../../env";
import {
  createProjectHandler,
  getProjectHandler,
  listProjectDecisionPackagesHandler,
  listProjectDocumentsHandler,
  listProjectRunsHandler,
  listProjectsHandler,
  updateProjectHandler
} from "./handlers";
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
    availability: "implemented",
    note: "Returns an empty typed stub collection until project-backed document persistence lands."
  },
  {
    method: "GET",
    path: "/v1/projects/:projectId/decision-packages",
    family: "projects",
    resourceType: "decision_package",
    responseKind: "collection",
    implementation: "stub",
    availability: "implemented",
    note: "Returns an empty typed stub collection until project-backed decision-package persistence lands."
  },
  {
    method: "GET",
    path: "/v1/projects/:projectId/runs",
    family: "projects",
    resourceType: "run",
    responseKind: "collection",
    implementation: "projected",
    availability: "implemented",
    note: "Projected from stored run sessions associated with the project."
  }
] as const satisfies ApiRouteDefinition[];

export function registerProjectRoutes(router: Hono<AppEnv>) {
  router.get("/v1/projects", requireDevAuth, listProjectsHandler);
  router.post("/v1/projects", requireDevAuth, createProjectHandler);
  router.get("/v1/projects/:projectId", requireDevAuth, getProjectHandler);
  router.put("/v1/projects/:projectId", requireDevAuth, updateProjectHandler);
  router.get("/v1/projects/:projectId/documents", requireDevAuth, listProjectDocumentsHandler);
  router.get(
    "/v1/projects/:projectId/decision-packages",
    requireDevAuth,
    listProjectDecisionPackagesHandler
  );
  router.get("/v1/projects/:projectId/runs", requireDevAuth, listProjectRunsHandler);
}
