import { z } from "zod";

import {
  projectConfigSchema,
  type ProjectConfig,
  type StoredProject
} from "../../keystone/projects/contracts";
import { throwJsonHttpError } from "../../lib/http/errors";

const isoTimestampSchema = z.string().datetime({ offset: true });
const metadataSchema = z.record(z.string(), z.unknown());

export const projectListQuerySchema = z.object({
  projectKey: z.string().trim().min(1).optional()
});

export const projectSummaryResponseSchema = z.object({
  tenantId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  projectKey: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  description: z.string().nullable(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema
});

export const projectResponseSchema = projectConfigSchema.extend({
  tenantId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema
});

export type ProjectWriteInput = ProjectConfig;
export type ProjectResponse = z.infer<typeof projectResponseSchema>;
export type ProjectSummaryResponse = z.infer<typeof projectSummaryResponseSchema>;

function buildValidationDetails(error: z.ZodError) {
  return {
    issues: error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
      code: issue.code
    }))
  };
}

export function parseProjectWriteInput(value: unknown) {
  const result = projectConfigSchema.safeParse(value);

  if (!result.success) {
    throwJsonHttpError(
      400,
      "invalid_request",
      "Project request validation failed.",
      buildValidationDetails(result.error)
    );
  }

  return result.data;
}

export function parseProjectListQuery(value: unknown) {
  const result = projectListQuerySchema.safeParse(value);

  if (!result.success) {
    throwJsonHttpError(
      400,
      "invalid_request",
      "Project request validation failed.",
      buildValidationDetails(result.error)
    );
  }

  return result.data;
}

export function serializeProjectResponse(project: StoredProject): ProjectResponse {
  return projectResponseSchema.parse({
    tenantId: project.tenantId,
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: project.description,
    ruleSet: project.ruleSet,
    components: project.components.map((component) => ({
      componentKey: component.componentKey,
      displayName: component.displayName,
      kind: component.kind,
      config: component.config,
      ruleOverride: component.ruleOverride,
      metadata: component.metadata ?? metadataSchema.parse({})
    })),
    envVars: project.envVars.map((envVar) => ({
      name: envVar.name,
      value: envVar.value,
      metadata: envVar.metadata ?? metadataSchema.parse({})
    })),
    integrationBindings: project.integrationBindings.map((binding) => ({
      bindingKey: binding.bindingKey,
      tenantIntegrationId: binding.tenantIntegrationId,
      overrides: binding.overrides ?? metadataSchema.parse({}),
      metadata: binding.metadata ?? metadataSchema.parse({})
    })),
    metadata: project.metadata ?? metadataSchema.parse({}),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  });
}

export function serializeProjectSummaryResponse(project: {
  tenantId: string;
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProjectSummaryResponse {
  return projectSummaryResponseSchema.parse({
    tenantId: project.tenantId,
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  });
}
