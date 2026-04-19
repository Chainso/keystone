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
import { runWebSocketHandler } from "../../../handlers/ws";
import {
  createRunHandler,
  getApprovalHandler,
  getEvidenceHandler,
  getIntegrationHandler,
  getReleaseHandler,
  getRunEventsHandler,
  getRunHandler,
  getRunWorkflowGraphHandler,
  getTaskConversationHandler,
  getTaskHandler,
  listRunApprovalsHandler,
  listRunTasksHandler,
  listTaskArtifactsHandler,
  postTaskConversationMessageHandler,
  resolveApprovalHandler
} from "./handlers";

export const runRouteMatrix = [
  {
    method: "POST",
    path: "/v1/runs",
    family: "runs",
    resourceType: "run",
    responseKind: "action",
    implementation: "projected",
    availability: "implemented",
    note: "The canonical action envelope is live; only inline decision-package payloads are currently launchable."
  },
  {
    method: "GET",
    path: "/v1/runs/:runId",
    family: "runs",
    resourceType: "run",
    responseKind: "detail",
    implementation: "projected",
    availability: "implemented",
    note: "Projected from run sessions, events, artifacts, and the live coordinator snapshot."
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
    path: "/v1/runs/:runId/graph",
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
    implementation: "projected",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/tasks/:taskId",
    family: "runs",
    resourceType: "task",
    responseKind: "detail",
    implementation: "projected",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/tasks/:taskId/conversation",
    family: "runs",
    resourceType: "task_conversation",
    responseKind: "detail",
    implementation: "projected",
    availability: "implemented",
    note: "Projected from implementer message events plus task workflow notices."
  },
  {
    method: "POST",
    path: "/v1/runs/:runId/tasks/:taskId/conversation/messages",
    family: "runs",
    resourceType: "task_conversation_message",
    responseKind: "action",
    implementation: "projected",
    availability: "implemented",
    note: "Canonical operator-steering write path, currently wired to the shared not_implemented contract."
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
  {
    method: "GET",
    path: "/v1/runs/:runId/approvals",
    family: "runs",
    resourceType: "approval",
    responseKind: "collection",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/approvals/:approvalId",
    family: "runs",
    resourceType: "approval",
    responseKind: "detail",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "POST",
    path: "/v1/runs/:runId/approvals/:approvalId/resolve",
    family: "runs",
    resourceType: "approval",
    responseKind: "action",
    implementation: "reused",
    availability: "implemented"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/evidence",
    family: "runs",
    resourceType: "evidence_bundle",
    responseKind: "detail",
    implementation: "stub",
    availability: "implemented",
    note: "Returns a typed stub detail until evidence bundling is materialized."
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/integration",
    family: "runs",
    resourceType: "integration_record",
    responseKind: "detail",
    implementation: "stub",
    availability: "implemented",
    note: "Returns a typed stub detail until integration records are materialized."
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/release",
    family: "runs",
    resourceType: "release",
    responseKind: "detail",
    implementation: "stub",
    availability: "implemented",
    note: "Returns a typed stub detail until release records are materialized."
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/stream",
    family: "runs",
    resourceType: "run_stream",
    responseKind: "stream",
    implementation: "projected",
    availability: "implemented",
    note: "Canonical UI stream alias backed by the current RunCoordinatorDO websocket transport."
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/events",
    family: "debug",
    resourceType: "session_event",
    responseKind: "collection",
    implementation: "projected",
    availability: "legacy_debug",
    note: "Low-level debug surface retained during the transition."
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/ws",
    family: "debug",
    resourceType: "run_stream",
    responseKind: "stream",
    implementation: "projected",
    availability: "legacy_debug",
    note: "Legacy websocket transport retained during the transition."
  }
] as const satisfies ApiRouteDefinition[];

export function registerRunRoutes(router: Hono<AppEnv>) {
  router.post("/v1/runs", requireDevAuth, createRunHandler);
  router.get("/v1/runs/:runId", requireDevAuth, getRunHandler);
  router.get("/v1/runs/:runId/documents", requireDevAuth, listRunDocumentsHandler);
  router.post("/v1/runs/:runId/documents", requireDevAuth, createRunDocumentHandler);
  router.get("/v1/runs/:runId/documents/:documentId", requireDevAuth, getRunDocumentHandler);
  router.post(
    "/v1/runs/:runId/documents/:documentId/revisions",
    requireDevAuth,
    createRunDocumentRevisionHandler
  );
  router.get("/v1/runs/:runId/graph", requireDevAuth, getRunWorkflowGraphHandler);
  router.get("/v1/runs/:runId/tasks", requireDevAuth, listRunTasksHandler);
  router.get("/v1/runs/:runId/tasks/:taskId", requireDevAuth, getTaskHandler);
  router.get(
    "/v1/runs/:runId/tasks/:taskId/conversation",
    requireDevAuth,
    getTaskConversationHandler
  );
  router.get("/v1/runs/:runId/stream", requireDevAuth, runWebSocketHandler);
  router.post(
    "/v1/runs/:runId/tasks/:taskId/conversation/messages",
    requireDevAuth,
    postTaskConversationMessageHandler
  );
  router.get(
    "/v1/runs/:runId/tasks/:taskId/artifacts",
    requireDevAuth,
    listTaskArtifactsHandler
  );
  router.get("/v1/runs/:runId/approvals", requireDevAuth, listRunApprovalsHandler);
  router.get(
    "/v1/runs/:runId/approvals/:approvalId",
    requireDevAuth,
    getApprovalHandler
  );
  router.get("/v1/runs/:runId/events", requireDevAuth, getRunEventsHandler);
  router.post(
    "/v1/runs/:runId/approvals/:approvalId/resolve",
    requireDevAuth,
    resolveApprovalHandler
  );
  router.get("/v1/runs/:runId/evidence", requireDevAuth, getEvidenceHandler);
  router.get("/v1/runs/:runId/integration", requireDevAuth, getIntegrationHandler);
  router.get("/v1/runs/:runId/release", requireDevAuth, getReleaseHandler);
  router.get("/v1/runs/:runId/ws", requireDevAuth, runWebSocketHandler);
}
