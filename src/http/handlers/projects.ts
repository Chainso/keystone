import type { Context } from "hono";

import type { AppEnv } from "../../env";
import { createWorkerDatabaseClient } from "../../lib/db/client";
import {
  createProject,
  getProject,
  getProjectByKey,
  listProjects,
  updateProject
} from "../../lib/db/projects";
import { jsonErrorResponse, throwJsonHttpError } from "../../lib/http/errors";
import {
  parseProjectListQuery,
  parseProjectWriteInput,
  serializeProjectResponse,
  serializeProjectSummaryResponse
} from "../contracts/project-input";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function createProjectHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const input = parseProjectWriteInput(await context.req.json());
  const client = createWorkerDatabaseClient(context.env);

  try {
    const created = await createProject(client, {
      tenantId: auth.tenantId,
      config: input
    });

    return context.json(
      {
        project: serializeProjectResponse(created)
      },
      201
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonErrorResponse(
        "project_key_conflict",
        `Project key ${input.projectKey} already exists for tenant ${auth.tenantId}.`,
        409
      );
    }

    throw error;
  } finally {
    await client.close();
  }
}

export async function listProjectsHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const query = parseProjectListQuery(context.req.query());
  const client = createWorkerDatabaseClient(context.env);

  try {
    const projects = query.projectKey
      ? await getProjectByKey(client, {
          tenantId: auth.tenantId,
          projectKey: query.projectKey
        })
      : undefined;
    const summaries =
      query.projectKey && projects
        ? [
            serializeProjectSummaryResponse({
              tenantId: projects.tenantId,
              projectId: projects.projectId,
              projectKey: projects.projectKey,
              displayName: projects.displayName,
              description: projects.description,
              createdAt: projects.createdAt,
              updatedAt: projects.updatedAt
            })
          ]
        : query.projectKey
          ? []
          : (await listProjects(client, {
              tenantId: auth.tenantId
            })).map(serializeProjectSummaryResponse);

    return context.json({
      tenantId: auth.tenantId,
      total: summaries.length,
      projects: summaries
    });
  } finally {
    await client.close();
  }
}

export async function getProjectHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const projectId = context.req.param("projectId");

  if (!projectId) {
    throwJsonHttpError(400, "invalid_path", "Project ID is required.");
  }

  const client = createWorkerDatabaseClient(context.env);

  try {
    const project = await getProject(client, {
      tenantId: auth.tenantId,
      projectId
    });

    if (!project) {
      return jsonErrorResponse(
        "project_not_found",
        `Project ${projectId} was not found.`,
        404
      );
    }

    return context.json({
      project: serializeProjectResponse(project)
    });
  } finally {
    await client.close();
  }
}

export async function updateProjectHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const projectId = context.req.param("projectId");

  if (!projectId) {
    throwJsonHttpError(400, "invalid_path", "Project ID is required.");
  }

  const input = parseProjectWriteInput(await context.req.json());
  const client = createWorkerDatabaseClient(context.env);

  try {
    const project = await getProject(client, {
      tenantId: auth.tenantId,
      projectId
    });

    if (!project) {
      return jsonErrorResponse(
        "project_not_found",
        `Project ${projectId} was not found.`,
        404
      );
    }

    const updated = await updateProject(client, {
      tenantId: auth.tenantId,
      projectId,
      config: input
    });

    return context.json({
      project: serializeProjectResponse(updated)
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return jsonErrorResponse(
        "project_key_conflict",
        `Project key ${input.projectKey} already exists for tenant ${auth.tenantId}.`,
        409
      );
    }

    throw error;
  } finally {
    await client.close();
  }
}
