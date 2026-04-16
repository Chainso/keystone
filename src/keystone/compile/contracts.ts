import { z } from "zod";

export const decisionPackageTaskSchema = z.object({
  taskId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  acceptanceCriteria: z.array(z.string().trim().min(1)).min(1)
});

export const decisionPackageSchema = z.object({
  decisionPackageId: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  repo: z.record(z.string(), z.unknown()).optional(),
  objectives: z.array(z.string().trim().min(1)).min(1),
  tasks: z.array(decisionPackageTaskSchema).min(1)
});

export const compiledTaskSchema = z.object({
  taskId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  instructions: z.array(z.string().trim().min(1)).min(1),
  acceptanceCriteria: z.array(z.string().trim().min(1)).min(1),
  dependsOn: z.array(z.string().trim().min(1)).default([])
});

export const compiledRunPlanSchema = z.object({
  decisionPackageId: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  tasks: z.array(compiledTaskSchema).min(1)
});

export type DecisionPackage = z.infer<typeof decisionPackageSchema>;
export type CompiledTaskPlan = z.infer<typeof compiledTaskSchema>;
export type CompiledRunPlan = z.infer<typeof compiledRunPlanSchema>;
