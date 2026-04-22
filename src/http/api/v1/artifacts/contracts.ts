import { z } from "zod";

import { artifactKindSchema } from "../../../../lib/artifacts/model";
import {
  buildCollectionEnvelopeSchema,
  buildDetailEnvelopeSchema,
  buildResourceSchema,
  resourceIdSchema
} from "../common/contracts";

export const artifactResourceSchema = buildResourceSchema("artifact", {
  artifactId: resourceIdSchema,
  kind: artifactKindSchema,
  contentType: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative().nullable(),
  sha256: z.string().trim().min(1).nullable(),
  contentUrl: z.string().trim().min(1)
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
