import { z } from "zod";

import { decisionPackageSchema } from "../../../../keystone/compile/contracts";
import {
  buildCollectionEnvelopeSchema,
  buildDetailEnvelopeSchema,
  buildResourceSchema,
  isoTimestampSchema,
  resourceIdSchema
} from "../common/contracts";

export const decisionPackageTaskSummarySchema = z.object({
  taskId: resourceIdSchema,
  title: z.string().trim().min(1),
  acceptanceCriteria: z.array(z.string().trim().min(1))
});

export const decisionPackageResourceSchema = buildResourceSchema("decision_package", {
  tenantId: resourceIdSchema,
  decisionPackageId: resourceIdSchema,
  projectId: resourceIdSchema.nullable(),
  summary: z.string().trim().min(1).nullable(),
  objectives: z.array(z.string().trim().min(1)).default([]),
  tasks: z.array(decisionPackageTaskSummarySchema).default([]),
  source: z.enum(["inline", "artifact", "project_collection", "unknown"]).default("unknown"),
  status: z.enum(["draft", "approved", "compiled", "stub"]).default("stub"),
  createdAt: isoTimestampSchema.nullable(),
  updatedAt: isoTimestampSchema.nullable()
});

export const decisionPackageCreateReferenceSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("inline"),
    payload: decisionPackageSchema
  }),
  z.object({
    source: z.literal("artifact"),
    artifactId: resourceIdSchema
  }),
  z.object({
    source: z.literal("project_collection"),
    decisionPackageId: resourceIdSchema
  })
]);

export const decisionPackageDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "decision_package",
  decisionPackageResourceSchema
);
export const decisionPackageCollectionEnvelopeSchema = buildCollectionEnvelopeSchema(
  "decision_package",
  decisionPackageResourceSchema
);

export type DecisionPackageResource = z.infer<typeof decisionPackageResourceSchema>;
export type DecisionPackageCreateReference = z.infer<typeof decisionPackageCreateReferenceSchema>;
