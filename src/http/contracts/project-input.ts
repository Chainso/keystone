import { z } from "zod";

import { projectConfigSchema, type ProjectConfig } from "../../keystone/projects/contracts";
import { throwJsonHttpError } from "../../lib/http/errors";
import {
  projectListItemSchema,
  projectResourceSchema,
  serializeProjectListItem,
  serializeProjectResource,
  type ProjectListItem,
  type ProjectResource
} from "../api/v1/projects/contracts";

export const projectListQuerySchema = z.object({
  projectKey: z.string().trim().min(1).optional()
});

export const projectSummaryResponseSchema = projectListItemSchema;
export const projectResponseSchema = projectResourceSchema;

export type ProjectWriteInput = ProjectConfig;
export type ProjectResponse = ProjectResource;
export type ProjectSummaryResponse = ProjectListItem;
export const serializeProjectResponse = serializeProjectResource;

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
export function serializeProjectSummaryResponse(project: {
  tenantId: string;
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProjectSummaryResponse {
  return serializeProjectListItem(project);
}
