import { z } from "zod";

import {
  buildActionEnvelopeSchema,
  buildCollectionEnvelopeSchema,
  buildDetailEnvelopeSchema,
  buildResourceSchema,
  isoTimestampSchema,
  resourceIdSchema
} from "../common/contracts";
import { executionEngineValues } from "../../../../lib/runs/options";

const conversationLocatorSchema = z.object({
  agentClass: z.string().trim().min(1),
  agentName: z.string().trim().min(1)
});

const compiledFromSchema = z.object({
  specificationRevisionId: resourceIdSchema,
  architectureRevisionId: resourceIdSchema,
  executionPlanRevisionId: resourceIdSchema,
  compiledAt: isoTimestampSchema
});

export const runResourceSchema = buildResourceSchema("run", {
  runId: resourceIdSchema,
  projectId: resourceIdSchema,
  workflowInstanceId: z.string().trim().min(1),
  executionEngine: z.enum(executionEngineValues),
  status: z.string().trim().min(1),
  compiledFrom: compiledFromSchema.nullable(),
  startedAt: isoTimestampSchema.nullable(),
  endedAt: isoTimestampSchema.nullable()
});

export const taskResourceSchema = buildResourceSchema("task", {
  runId: resourceIdSchema,
  taskId: resourceIdSchema,
  logicalTaskId: resourceIdSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  status: z.string().trim().min(1),
  dependsOn: z.array(resourceIdSchema).default([]),
  conversation: conversationLocatorSchema.nullable(),
  updatedAt: isoTimestampSchema,
  startedAt: isoTimestampSchema.nullable(),
  endedAt: isoTimestampSchema.nullable()
});

export const workflowGraphNodeSchema = z.object({
  taskId: resourceIdSchema,
  name: z.string().trim().min(1),
  status: z.string().trim().min(1),
  dependsOn: z.array(resourceIdSchema).default([])
});

export const workflowGraphEdgeSchema = z.object({
  fromTaskId: resourceIdSchema,
  toTaskId: resourceIdSchema
});

export const workflowGraphResourceSchema = buildResourceSchema("workflow_graph", {
  nodes: z.array(workflowGraphNodeSchema),
  edges: z.array(workflowGraphEdgeSchema),
  summary: z.object({
    totalTasks: z.number().int().nonnegative(),
    activeTasks: z.number().int().nonnegative(),
    pendingTasks: z.number().int().nonnegative(),
    completedTasks: z.number().int().nonnegative(),
    readyTasks: z.number().int().nonnegative(),
    failedTasks: z.number().int().nonnegative(),
    cancelledTasks: z.number().int().nonnegative()
  })
});

export const runCreateRequestSchema = z.object({
  executionEngine: z.enum(executionEngineValues).default("think_live")
}).strict();

export const runCompileRequestSchema = z.object({}).strict().default({});

export const runCompileAcceptedSchema = z.object({
  status: z.literal("accepted"),
  workflowInstanceId: z.string().trim().min(1),
  run: runResourceSchema
});

export const runDetailEnvelopeSchema = buildDetailEnvelopeSchema("run", runResourceSchema);
export const runCollectionEnvelopeSchema = buildCollectionEnvelopeSchema("run", runResourceSchema);
export const runCompileActionEnvelopeSchema = buildActionEnvelopeSchema(
  "run",
  runCompileAcceptedSchema
);
export const taskDetailEnvelopeSchema = buildDetailEnvelopeSchema("task", taskResourceSchema);
export const taskCollectionEnvelopeSchema = buildCollectionEnvelopeSchema("task", taskResourceSchema);
export const workflowGraphDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "workflow_graph",
  workflowGraphResourceSchema
);

export type RunResource = z.infer<typeof runResourceSchema>;
export type TaskResource = z.infer<typeof taskResourceSchema>;
export type WorkflowGraphResource = z.infer<typeof workflowGraphResourceSchema>;
export type RunCreateRequest = z.infer<typeof runCreateRequestSchema>;
export type RunCompileAcceptedAction = z.infer<typeof runCompileAcceptedSchema>;
