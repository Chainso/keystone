import { z } from "zod";

import {
  buildCollectionEnvelopeSchema,
  buildDetailEnvelopeSchema,
  buildResourceSchema,
  collectionEnvelopeMetaSchema,
  isoTimestampSchema,
  resourceIdSchema
} from "../common/contracts";
import { projectConfigSchema, type StoredProject } from "../../../../keystone/projects/contracts";
import { taskResourceSchema } from "../runs/contracts";

export const projectListItemSchema = buildResourceSchema("project", {
  projectId: resourceIdSchema,
  projectKey: resourceIdSchema,
  displayName: z.string().trim().min(1),
  description: z.string().nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema
});

export const projectResourceSchema = buildResourceSchema("project", {
  projectId: resourceIdSchema,
  projectKey: resourceIdSchema,
  displayName: z.string().trim().min(1),
  description: z.string().nullable(),
  ruleSet: projectConfigSchema.shape.ruleSet,
  components: projectConfigSchema.shape.components,
  envVars: projectConfigSchema.shape.envVars,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema
});

export const projectDetailEnvelopeSchema = buildDetailEnvelopeSchema(
  "project",
  projectResourceSchema
);
export const projectCollectionEnvelopeSchema = buildCollectionEnvelopeSchema(
  "project",
  projectListItemSchema
);
export const projectTaskFilterValues = [
  "all",
  "active",
  "running",
  "queued",
  "blocked"
] as const;
export const projectTaskFilterSchema = z.enum(projectTaskFilterValues);
export const projectTaskListQuerySchema = z.object({
  filter: projectTaskFilterSchema.default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(25)
});
export const projectTaskCollectionEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(taskResourceSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    pageCount: z.number().int().min(1),
    filter: projectTaskFilterSchema
  }),
  meta: collectionEnvelopeMetaSchema.extend({
    resourceType: z.literal("task")
  })
});

export type ProjectListItem = z.infer<typeof projectListItemSchema>;
export type ProjectResource = z.infer<typeof projectResourceSchema>;
export type ProjectTaskFilter = z.infer<typeof projectTaskFilterSchema>;
export type ProjectTaskListQuery = z.infer<typeof projectTaskListQuerySchema>;

export function serializeProjectListItem(project: {
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
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: project.description,
    ruleSet: project.ruleSet,
    components: project.components,
    envVars: project.envVars,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  });
}
