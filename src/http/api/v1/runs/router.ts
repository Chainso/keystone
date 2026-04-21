import type { Hono } from "hono";

import type { AppEnv } from "../../../../env";
import {
  createRunDocumentHandler,
  createRunDocumentRevisionHandler,
  getRunDocumentHandler,
  listRunDocumentsHandler
} from "../documents/handlers";
import { requireDevAuth } from "../../../middleware/auth";
import type { ApiRouteDefinition } from "../common/contracts";
import {
  compileRunHandler,
  getRunHandler,
  getRunWorkflowGraphHandler,
  getTaskHandler,
  listTaskArtifactsHandler,
  listRunTasksHandler,
} from "./handlers";

export const runRouteMatrix = [
  {
    method: "POST",
    path: "/v1/runs/:runId/compile",
    family: "runs",
    resourceType: "run",
    responseKind: "action",
    implementation: "reused",
    availability: "implemented",
    note: "Compile is explicit and requires run specification, architecture, and execution-plan documents."
  },
  {
    method: "GET",
    path: "/v1/runs/:runId",
    family: "runs",
    resourceType: "run",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/documents",
    family: "runs",
    resourceType: "document",
    responseKind: "collection",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "POST",
    path: "/v1/runs/:runId/documents",
    family: "runs",
    resourceType: "document",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/documents/:documentId",
    family: "runs",
    resourceType: "document",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "POST",
    path: "/v1/runs/:runId/documents/:documentId/revisions",
    family: "runs",
    resourceType: "document_revision",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/workflow",
    family: "runs",
    resourceType: "workflow_graph",
    responseKind: "detail",
    implementation: "projected",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/tasks",
    family: "runs",
    resourceType: "task",
    responseKind: "collection",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/tasks/:taskId",
    family: "runs",
    resourceType: "task",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/tasks/:taskId/artifacts",
    family: "runs",
    resourceType: "artifact",
    responseKind: "collection",
    implementation: "reused",
    availability: "implemented"
  },
] as const satisfies ApiRouteDefinition[];

export function registerRunRoutes(router: Hono<AppEnv>) {
  router.post("/v1/runs/:runId/compile", requireDevAuth, compileRunHandler);
  router.get("/v1/runs/:runId", requireDevAuth, getRunHandler);
  router.get("/v1/runs/:runId/documents", requireDevAuth, listRunDocumentsHandler);
  router.post("/v1/runs/:runId/documents", requireDevAuth, createRunDocumentHandler);
  router.get("/v1/runs/:runId/documents/:documentId", requireDevAuth, getRunDocumentHandler);
  router.post(
    "/v1/runs/:runId/documents/:documentId/revisions",
    requireDevAuth,
    createRunDocumentRevisionHandler
  );
  router.get("/v1/runs/:runId/workflow", requireDevAuth, getRunWorkflowGraphHandler);
  router.get("/v1/runs/:runId/tasks", requireDevAuth, listRunTasksHandler);
  router.get("/v1/runs/:runId/tasks/:taskId", requireDevAuth, getTaskHandler);
  router.get("/v1/runs/:runId/tasks/:taskId/artifacts", requireDevAuth, listTaskArtifactsHandler);
}
