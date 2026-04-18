import { z } from "zod";

import { decisionPackageCreateReferenceSchema } from "../decision-packages/contracts";
import {
  buildActionEnvelopeSchema,
  buildCollectionEnvelopeSchema,
  buildDetailEnvelopeSchema,
  buildResourceSchema,
  isoTimestampSchema,
  metadataSchema,
  resourceIdSchema
} from "../common/contracts";
import { runExecutionOptionsSchema } from "../../../../lib/runs/options";

export const runResourceSchema = buildResourceSchema("run", {
  tenantId: resourceIdSchema,
  runId: resourceIdSchema,
  projectId: resourceIdSchema,
  decisionPackageId: resourceIdSchema.nullable(),
  summary: z.string().trim().min(1).nullable(),
  status: z.string().trim().min(1),
  currentTaskId: resourceIdSchema.nullable(),
  createdAt: isoTimestampSchema.nullable(),
  updatedAt: isoTimestampSchema.nullable(),
  sessions: z.object({
    total: z.number().int().nonnegative()
  }),
  artifacts: z.object({
    total: z.number().int().nonnegative(),
    byKind: z.record(z.string(), z.number().int().nonnegative()).default({})
  }),
  execution: z
    .object({
      runtime: z.string().trim().min(1).nullable(),
      thinkMode: z.string().trim().min(1).nullable(),
      preserveSandbox: z.boolean()
    })
    .nullable()
});

export const taskResourceSchema = buildResourceSchema("task", {
  tenantId: resourceIdSchema,
  runId: resourceIdSchema,
  taskId: resourceIdSchema,
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1).nullable(),
  instructions: z.array(z.string().trim().min(1)).default([]),
  acceptanceCriteria: z.array(z.string().trim().min(1)).default([]),
  dependsOn: z.array(resourceIdSchema).default([]),
  blockedBy: z.array(resourceIdSchema).default([]),
  status: z.string().trim().min(1),
  createdAt: isoTimestampSchema.nullable(),
  updatedAt: isoTimestampSchema.nullable()
});

export const workflowGraphNodeSchema = z.object({
  taskId: resourceIdSchema,
  title: z.string().trim().min(1),
  status: z.string().trim().min(1),
  dependsOn: z.array(resourceIdSchema).default([]),
  blockedBy: z.array(resourceIdSchema).default([])
});

export const workflowGraphEdgeSchema = z.object({
  fromTaskId: resourceIdSchema,
  toTaskId: resourceIdSchema
});

export const workflowGraphResourceSchema = buildResourceSchema("workflow_graph", {
  tenantId: resourceIdSchema,
  runId: resourceIdSchema,
  nodes: z.array(workflowGraphNodeSchema),
  edges: z.array(workflowGraphEdgeSchema),
  summary: z.object({
    totalTasks: z.number().int().nonnegative(),
    activeTasks: z.number().int().nonnegative(),
    blockedTasks: z.number().int().nonnegative(),
    completedTasks: z.number().int().nonnegative(),
    readyTasks: z.number().int().nonnegative()
  })
});

export const taskConversationAuthorSchema = z.object({
  role: z.enum(["operator", "implementer", "system"]),
  actorId: z.string().trim().min(1).nullable(),
  displayName: z.string().trim().min(1)
});

export const taskConversationMessageSchema = z.object({
  messageId: resourceIdSchema,
  runId: resourceIdSchema,
  taskId: resourceIdSchema,
  messageType: z.enum(["operator_message", "implementer_message", "workflow_notice"]),
  author: taskConversationAuthorSchema,
  body: z.string().trim().min(1),
  artifactIds: z.array(resourceIdSchema).default([]),
  sourceEventIds: z.array(resourceIdSchema).default([]),
  metadata: metadataSchema.default({}),
  createdAt: isoTimestampSchema
});

export const taskConversationResourceSchema = buildResourceSchema("task_conversation", {
  tenantId: resourceIdSchema,
  runId: resourceIdSchema,
  taskId: resourceIdSchema,
  messageCount: z.number().int().nonnegative(),
  latestMessageAt: isoTimestampSchema.nullable(),
  messages: z.array(taskConversationMessageSchema)
});

export const taskConversationMessageWriteInputSchema = z.object({
  messageType: z.literal("operator_message").default("operator_message"),
  body: z.string().trim().min(1),
  clientRequestId: z.string().trim().min(1).optional(),
  artifactIds: z.array(resourceIdSchema).default([]),
  metadata: metadataSchema.default({})
});

export const taskConversationMessageAcceptedSchema = z.object({
  status: z.enum(["accepted", "queued"]),
  runId: resourceIdSchema,
  taskId: resourceIdSchema,
  message: taskConversationMessageSchema.nullable()
});

export const runAcceptedActionSchema = z.object({
  status: z.enum(["accepted"]),
  workflowInstanceId: z.string().trim().min(1),
  run: runResourceSchema
});

export const approvalResourceSchema = buildResourceSchema("approval", {
  tenantId: resourceIdSchema,
  approvalId: resourceIdSchema,
  runId: resourceIdSchema,
  sessionId: resourceIdSchema.nullable(),
  taskId: resourceIdSchema.nullable(),
  approvalType: z.string().trim().min(1),
  status: z.string().trim().min(1),
  requestedBy: z.string().trim().min(1).nullable(),
  requestedAt: isoTimestampSchema,
  resolvedAt: isoTimestampSchema.nullable(),
  resolution: metadataSchema.nullable(),
  metadata: metadataSchema.default({})
});

export const evidenceBundleResourceSchema = buildResourceSchema("evidence_bundle", {
  tenantId: resourceIdSchema,
  runId: resourceIdSchema,
  evidenceBundleId: resourceIdSchema,
  status: z.string().trim().min(1),
  summary: z.string().trim().min(1).nullable(),
  artifactIds: z.array(resourceIdSchema).default([]),
  updatedAt: isoTimestampSchema.nullable()
});

export const integrationRecordResourceSchema = buildResourceSchema("integration_record", {
  tenantId: resourceIdSchema,
  runId: resourceIdSchema,
  integrationRecordId: resourceIdSchema,
  status: z.string().trim().min(1),
  summary: z.string().trim().min(1).nullable(),
  artifactIds: z.array(resourceIdSchema).default([]),
  updatedAt: isoTimestampSchema.nullable()
});

export const releaseResourceSchema = buildResourceSchema("release", {
  tenantId: resourceIdSchema,
  runId: resourceIdSchema,
  releaseId: resourceIdSchema,
  status: z.string().trim().min(1),
  summary: z.string().trim().min(1).nullable(),
  artifactIds: z.array(resourceIdSchema).default([]),
  updatedAt: isoTimestampSchema.nullable()
});

export const runCreateRequestSchema = z.object({
  projectId: resourceIdSchema,
  decisionPackage: decisionPackageCreateReferenceSchema,
  options: runExecutionOptionsSchema.default({
    thinkMode: "mock",
    preserveSandbox: false
  })
});

export const runDetailEnvelopeSchema = buildDetailEnvelopeSchema("run", runResourceSchema);
export const runCollectionEnvelopeSchema = buildCollectionEnvelopeSchema("run", runResourceSchema);
export const runActionEnvelopeSchema = buildActionEnvelopeSchema("run", runAcceptedActionSchema);
export const taskDetailEnvelopeSchema = buildDetailEnvelopeSchema("task", taskResourceSchema);
export const taskCollectionEnvelopeSchema = buildCollectionEnvelopeSchema("task", taskResourceSchema);
export const workflowGraphDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "workflow_graph",
  workflowGraphResourceSchema
);
export const taskConversationDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "task_conversation",
  taskConversationResourceSchema
);
export const approvalDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "approval",
  approvalResourceSchema
);
export const approvalActionEnvelopeSchema = buildActionEnvelopeSchema(
  "approval",
  approvalResourceSchema
);
export const approvalCollectionEnvelopeSchema = buildCollectionEnvelopeSchema(
  "approval",
  approvalResourceSchema
);
export const evidenceBundleDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "evidence_bundle",
  evidenceBundleResourceSchema
);
export const integrationRecordDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "integration_record",
  integrationRecordResourceSchema
);
export const releaseDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "release",
  releaseResourceSchema
);
export const taskConversationMessageActionEnvelopeSchema = buildActionEnvelopeSchema(
  "task_conversation_message",
  taskConversationMessageAcceptedSchema
);

export type RunResource = z.infer<typeof runResourceSchema>;
export type TaskResource = z.infer<typeof taskResourceSchema>;
export type WorkflowGraphResource = z.infer<typeof workflowGraphResourceSchema>;
export type TaskConversationResource = z.infer<typeof taskConversationResourceSchema>;
export type TaskConversationMessage = z.infer<typeof taskConversationMessageSchema>;
export type RunAcceptedAction = z.infer<typeof runAcceptedActionSchema>;
export type TaskConversationMessageWriteInput = z.infer<
  typeof taskConversationMessageWriteInputSchema
>;
export type ApprovalResource = z.infer<typeof approvalResourceSchema>;
export type EvidenceBundleResource = z.infer<typeof evidenceBundleResourceSchema>;
export type IntegrationRecordResource = z.infer<typeof integrationRecordResourceSchema>;
export type ReleaseResource = z.infer<typeof releaseResourceSchema>;
