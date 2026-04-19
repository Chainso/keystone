import { z } from "zod";

import {
  buildCollectionEnvelopeSchema,
  buildDetailEnvelopeSchema,
  buildResourceSchema,
  isoTimestampSchema,
  metadataSchema,
  resourceIdSchema
} from "../common/contracts";

export const artifactResourceSchema = buildResourceSchema("artifact", {
  tenantId: resourceIdSchema,
  artifactId: resourceIdSchema,
  projectId: resourceIdSchema.nullable(),
  runId: resourceIdSchema.nullable(),
  taskId: resourceIdSchema.nullable(),
  kind: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative().nullable(),
  sha256: z.string().trim().min(1).nullable(),
  contentUrl: z.string().trim().min(1),
  createdAt: isoTimestampSchema,
  metadata: metadataSchema.default({})
});

export const artifactDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "artifact",
  artifactResourceSchema
);
export const artifactCollectionEnvelopeSchema = buildCollectionEnvelopeSchema(
  "artifact",
  artifactResourceSchema
);

export type ArtifactResource = z.infer<typeof artifactResourceSchema>;
