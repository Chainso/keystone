import { z } from "zod";

export const compilePlanningDocumentSchema = z.object({
  revisionId: z.string().trim().min(1),
  path: z.string().trim().min(1),
  body: z.string().min(1)
});

export const compilePlanningDocumentsSchema = z.object({
  specification: compilePlanningDocumentSchema,
  architecture: compilePlanningDocumentSchema,
  executionPlan: compilePlanningDocumentSchema
});

export const compiledTaskSchema = z.object({
  taskId: z.string().trim().min(1),
  runTaskId: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  instructions: z.array(z.string().trim().min(1)).min(1),
  acceptanceCriteria: z.array(z.string().trim().min(1)).min(1),
  dependsOn: z.array(z.string().trim().min(1)).default([])
});

export const compiledRunPlanSourceRevisionIdsSchema = z.object({
  specification: z.string().trim().min(1),
  architecture: z.string().trim().min(1),
  executionPlan: z.string().trim().min(1)
});

export const compiledRunPlanSchema = z.object({
  summary: z.string().trim().min(1),
  sourceRevisionIds: compiledRunPlanSourceRevisionIdsSchema,
  tasks: z.array(compiledTaskSchema).min(1)
});

export type CompilePlanningDocument = z.infer<typeof compilePlanningDocumentSchema>;
export type CompilePlanningDocuments = z.infer<typeof compilePlanningDocumentsSchema>;
export type CompiledTaskPlan = z.infer<typeof compiledTaskSchema>;
export type CompiledRunPlanSourceRevisionIds = z.infer<
  typeof compiledRunPlanSourceRevisionIdsSchema
>;
export type CompiledRunPlan = z.infer<typeof compiledRunPlanSchema>;
