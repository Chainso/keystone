import type { Context, Hono } from "hono";

import type { AppEnv } from "../../../../env";
import { resolveApprovalHandler } from "../../../handlers/approvals";
import { createRunHandler, getRunEventsHandler, getRunHandler } from "../../../handlers/runs";
import { runWebSocketHandler } from "../../../handlers/ws";
import { requireDevAuth } from "../../../middleware/auth";
import type { ApiRouteDefinition } from "../common/contracts";
import { jsonNotImplementedResponse } from "../common/not-implemented";
import { taskConversationMessageWriteInputSchema } from "./contracts";

export const runRouteMatrix = [
  {
    method: "POST",
    path: "/v1/runs",
    family: "runs",
    resourceType: "run",
    responseKind: "action",
    implementation: "projected",
    availability: "scaffolded",
    note: "Create-run behavior still uses the pre-freeze M1 launcher response until Phase 2."
  },
  {
    method: "GET",
    path: "/v1/runs/:runId",
    family: "runs",
    resourceType: "run",
    responseKind: "detail",
    implementation: "projected",
    availability: "scaffolded",
    note: "Run detail still uses the pre-freeze aggregate summary until Phase 2."
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/graph",
    family: "runs",
    resourceType: "workflow_graph",
    responseKind: "detail",
    implementation: "projected",
    availability: "contract_frozen"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/tasks",
    family: "runs",
    resourceType: "task",
    responseKind: "collection",
    implementation: "projected",
    availability: "contract_frozen"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/tasks/:taskId",
    family: "runs",
    resourceType: "task",
    responseKind: "detail",
    implementation: "projected",
    availability: "contract_frozen"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/tasks/:taskId/conversation",
    family: "runs",
    resourceType: "task_conversation",
    responseKind: "detail",
    implementation: "projected",
    availability: "contract_frozen"
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
    availability: "contract_frozen"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/approvals",
    family: "runs",
    resourceType: "approval",
    responseKind: "collection",
    implementation: "reused",
    availability: "contract_frozen"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/approvals/:approvalId",
    family: "runs",
    resourceType: "approval",
    responseKind: "detail",
    implementation: "reused",
    availability: "contract_frozen"
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
    availability: "contract_frozen"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/integration",
    family: "runs",
    resourceType: "integration_record",
    responseKind: "detail",
    implementation: "stub",
    availability: "contract_frozen"
  },
  {
    method: "GET",
    path: "/v1/runs/:runId/release",
    family: "runs",
    resourceType: "release",
    responseKind: "detail",
    implementation: "stub",
    availability: "contract_frozen"
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

async function postTaskConversationMessageHandler(context: Context<AppEnv>) {
  taskConversationMessageWriteInputSchema.parse(await context.req.json());

  return jsonNotImplementedResponse({
    resourceType: "task_conversation_message",
    implementation: "projected",
    operation: "POST",
    route: "/v1/runs/:runId/tasks/:taskId/conversation/messages",
    reason:
      "Phase 1 freezes the canonical operator-steering contract without adding the backend message persistence or delivery path yet."
  });
}

export function registerRunRoutes(router: Hono<AppEnv>) {
  router.post("/v1/runs", requireDevAuth, createRunHandler);
  router.get("/v1/runs/:runId", requireDevAuth, getRunHandler);
  router.get("/v1/runs/:runId/stream", requireDevAuth, runWebSocketHandler);
  router.post(
    "/v1/runs/:runId/tasks/:taskId/conversation/messages",
    requireDevAuth,
    postTaskConversationMessageHandler
  );
  router.get("/v1/runs/:runId/events", requireDevAuth, getRunEventsHandler);
  router.post(
    "/v1/runs/:runId/approvals/:approvalId/resolve",
    requireDevAuth,
    resolveApprovalHandler
  );
  router.get("/v1/runs/:runId/ws", requireDevAuth, runWebSocketHandler);
}
