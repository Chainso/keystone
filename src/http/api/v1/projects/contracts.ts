import { z } from "zod";

import {
  buildCollectionEnvelopeSchema,
  buildDetailEnvelopeSchema,
  buildResourceSchema,
  isoTimestampSchema,
  metadataSchema,
  resourceIdSchema
} from "../common/contracts";
import { projectConfigSchema, type StoredProject } from "../../../../keystone/projects/contracts";

export const projectListItemSchema = buildResourceSchema("project", {
  tenantId: resourceIdSchema,
  projectId: resourceIdSchema,
  projectKey: resourceIdSchema,
  displayName: z.string().trim().min(1),
  description: z.string().nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema
});

export const projectResourceSchema = buildResourceSchema("project", {
  tenantId: resourceIdSchema,
  projectId: resourceIdSchema,
  projectKey: resourceIdSchema,
  displayName: z.string().trim().min(1),
  description: z.string().nullable(),
  ruleSet: projectConfigSchema.shape.ruleSet,
  components: projectConfigSchema.shape.components,
  envVars: projectConfigSchema.shape.envVars,
  integrationBindings: projectConfigSchema.shape.integrationBindings,
  metadata: metadataSchema.default({}),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema
});

export const projectDocumentKindValues = [
  "product_spec",
  "adr",
  "task_contract",
  "review_note",
  "test_summary",
  "release_note",
  "other"
] as const;

export const projectDocumentResourceSchema = buildResourceSchema("project_document", {
  tenantId: resourceIdSchema,
  projectId: resourceIdSchema,
  documentId: resourceIdSchema,
  documentKind: z.enum(projectDocumentKindValues),
  title: z.string().trim().min(1).nullable(),
  path: z.string().trim().min(1).nullable(),
  summary: z.string().trim().min(1).nullable(),
  updatedAt: isoTimestampSchema.nullable()
});

export const projectDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "project",
  projectResourceSchema
);
export const projectCollectionEnvelopeSchema = buildCollectionEnvelopeSchema(
  "project",
  projectListItemSchema
);
export const projectDocumentCollectionEnvelopeSchema = buildCollectionEnvelopeSchema(
  "project_document",
  projectDocumentResourceSchema
);

export type ProjectListItem = z.infer<typeof projectListItemSchema>;
export type ProjectResource = z.infer<typeof projectResourceSchema>;
export type ProjectDocumentResource = z.infer<typeof projectDocumentResourceSchema>;

export function serializeProjectListItem(project: {
  tenantId: string;
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProjectListItem {
  return projectListItemSchema.parse({
    resourceType: "project",
    scaffold: {
      implementation: "reused",
      note: null
    },
    tenantId: project.tenantId,
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  });
}

export function serializeProjectResource(project: StoredProject): ProjectResource {
  return projectResourceSchema.parse({
    resourceType: "project",
    scaffold: {
      implementation: "reused",
      note: null
    },
    tenantId: project.tenantId,
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: project.description,
    ruleSet: project.ruleSet,
    components: project.components,
    envVars: project.envVars,
    integrationBindings: project.integrationBindings,
    metadata: project.metadata ?? metadataSchema.parse({}),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  });
}
