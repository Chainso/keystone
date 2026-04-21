import type { Hono } from "hono";

import type { AppEnv } from "../../../../env";
import {
  createProjectDocumentHandler,
  createProjectDocumentRevisionHandler,
  getProjectDocumentHandler,
  listProjectDocumentsHandler
} from "../documents/handlers";
import {
  createProjectHandler,
  getProjectHandler,
  listProjectRunsHandler,
  listProjectsHandler,
  updateProjectHandler
} from "./handlers";
import { createProjectRunHandler } from "../runs/handlers";
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
    method: "PATCH",
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
    resourceType: "document",
    responseKind: "collection",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "POST",
    path: "/v1/projects/:projectId/documents",
    family: "projects",
    resourceType: "document",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/projects/:projectId/documents/:documentId",
    family: "projects",
    resourceType: "document",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "POST",
    path: "/v1/projects/:projectId/documents/:documentId/revisions",
    family: "projects",
    resourceType: "document_revision",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/projects/:projectId/runs",
    family: "projects",
    resourceType: "run",
    responseKind: "collection",
    implementation: "projected",
    availability: "implemented",
    note: "Project-scoped run collection backed by authoritative run rows."
  },
  {
    method: "POST",
    path: "/v1/projects/:projectId/runs",
    family: "projects",
    resourceType: "run",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  }
] as const satisfies ApiRouteDefinition[];

export function registerProjectRoutes(router: Hono<AppEnv>) {
  router.get("/v1/projects", requireDevAuth, listProjectsHandler);
  router.post("/v1/projects", requireDevAuth, createProjectHandler);
  router.get("/v1/projects/:projectId", requireDevAuth, getProjectHandler);
  router.patch("/v1/projects/:projectId", requireDevAuth, updateProjectHandler);
  router.get("/v1/projects/:projectId/documents", requireDevAuth, listProjectDocumentsHandler);
  router.post("/v1/projects/:projectId/documents", requireDevAuth, createProjectDocumentHandler);
  router.get(
    "/v1/projects/:projectId/documents/:documentId",
    requireDevAuth,
    getProjectDocumentHandler
  );
  router.post(
    "/v1/projects/:projectId/documents/:documentId/revisions",
    requireDevAuth,
    createProjectDocumentRevisionHandler
  );
  router.get("/v1/projects/:projectId/runs", requireDevAuth, listProjectRunsHandler);
  router.post("/v1/projects/:projectId/runs", requireDevAuth, createProjectRunHandler);
}
