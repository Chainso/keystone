import { z } from "zod";

import {
  buildCollectionEnvelopeSchema,
  buildDetailEnvelopeSchema,
  buildResourceSchema,
  isoTimestampSchema,
  resourceIdSchema
} from "../common/contracts";
import {
  documentKindValues,
  documentScopeTypeValues,
  validateDocumentPath
} from "../../../../lib/documents/model";
import type { DocumentWithCurrentRevision } from "../../../../lib/db/documents";
import type { DocumentRevisionRow } from "../../../../lib/db/schema";

export const documentConversationSchema = z.object({
  agentClass: z.string().trim().min(1),
  agentName: z.string().trim().min(1)
});

export const documentRevisionResourceSchema = buildResourceSchema("document_revision", {
  documentRevisionId: resourceIdSchema,
  revisionNumber: z.number().int().positive(),
  title: z.string().trim().min(1),
  artifactId: resourceIdSchema,
  contentUrl: z.string().trim().min(1),
  createdAt: isoTimestampSchema
});

export const documentResourceSchema = buildResourceSchema("document", {
  documentId: resourceIdSchema,
  scopeType: z.enum(documentScopeTypeValues),
  kind: z.enum(documentKindValues),
  path: z
    .string()
    .trim()
    .min(1)
    .transform((value) => validateDocumentPath(value)),
  currentRevisionId: resourceIdSchema.nullable(),
  conversation: documentConversationSchema.nullable(),
});

export const documentCreateRequestSchema = z.object({
  kind: z.enum(documentKindValues),
  path: z
    .string()
    .trim()
    .min(1)
    .transform((value) => validateDocumentPath(value)),
  conversation: documentConversationSchema.nullable().optional()
});

export const documentRevisionCreateRequestSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().min(1),
  contentType: z.string().trim().min(1).default("text/markdown; charset=utf-8"),
  encoding: z.enum(["utf-8", "base64"]).optional()
});

export const documentDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "document",
  documentResourceSchema
);
export const documentCollectionEnvelopeSchema = buildCollectionEnvelopeSchema(
  "document",
  documentResourceSchema
);
export const documentRevisionDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "document_revision",
  documentRevisionResourceSchema
);

export type DocumentResource = z.infer<typeof documentResourceSchema>;
export type DocumentRevisionResource = z.infer<typeof documentRevisionResourceSchema>;
export type DocumentCreateRequest = z.infer<typeof documentCreateRequestSchema>;
export type DocumentRevisionCreateRequest = z.infer<typeof documentRevisionCreateRequestSchema>;

export function serializeDocumentRevisionResource(
  revision: DocumentRevisionRow
): DocumentRevisionResource {
  return documentRevisionResourceSchema.parse({
    resourceType: "document_revision",
    scaffold: {
      implementation: "reused",
      note: null
    },
    documentRevisionId: revision.documentRevisionId,
    revisionNumber: revision.revisionNumber,
    title: revision.title,
    artifactId: revision.artifactRefId,
    contentUrl: `/v1/artifacts/${revision.artifactRefId}/content`,
    createdAt: revision.createdAt.toISOString()
  });
}

export function serializeDocumentResource(document: DocumentWithCurrentRevision): DocumentResource {
  return documentResourceSchema.parse({
    resourceType: "document",
    scaffold: {
      implementation: "reused",
      note: null
    },
    tenantId: document.tenantId,
    projectId: document.projectId,
    runId: document.runId,
    documentId: document.documentId,
    scopeType: document.scopeType,
    kind: document.kind,
    path: document.path,
    currentRevisionId: document.currentRevisionId,
    conversation:
      document.conversationAgentClass && document.conversationAgentName
        ? {
            agentClass: document.conversationAgentClass,
            agentName: document.conversationAgentName
          }
        : null
  });
}
