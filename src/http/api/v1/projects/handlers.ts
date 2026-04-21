import type { Context } from "hono";
import { z } from "zod";

import type { AppEnv } from "../../../../env";
import { createWorkerDatabaseClient } from "../../../../lib/db/client";
import {
  createProject,
  getProject,
  getProjectByKey,
  listProjects,
  updateProject
} from "../../../../lib/db/projects";
import { listProjectRuns, listProjectTasks } from "../../../../lib/db/runs";
import { jsonErrorResponse, throwJsonHttpError } from "../../../../lib/http/errors";
import { parseProjectListQuery, parseProjectWriteInput } from "../../../contracts/project-input";
import {
  projectCollectionEnvelopeSchema,
  projectDetailEnvelopeSchema,
  projectTaskCollectionEnvelopeSchema,
  projectTaskListQuerySchema,
  serializeProjectListItem,
  serializeProjectResource
} from "./contracts";
import { runCollectionEnvelopeSchema } from "../runs/contracts";
import {
  buildLogicalTaskIdIndex,
  loadCompiledRunPlan,
  projectRunResource,
  projectTaskResources
} from "../runs/projections";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function buildValidationDetails(error: z.ZodError) {
  return {
    issues: error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
      code: issue.code
    }))
  };
}

function parseProjectTaskListQuery(value: unknown) {
  const result = projectTaskListQuerySchema.safeParse(value);

  if (!result.success) {
    throwJsonHttpError(
      400,
      "invalid_request",
      "Project task query validation failed.",
      buildValidationDetails(result.error)
    );
  }

  return result.data;
}

async function requireProject(
  context: Context<AppEnv>,
  client: ReturnType<typeof createWorkerDatabaseClient>,
  projectId: string
) {
  const auth = context.get("auth");
  const project = await getProject(client, {
    tenantId: auth.tenantId,
    projectId
  });

  if (!project) {
    return null;
  }

  return project;
}

async function loadLogicalTaskIdIndexForRuns(
  context: Context<AppEnv>,
  tenantId: string,
  runIds: string[]
) {
  const uniqueRunIds = [...new Set(runIds)];
  const indexes = await Promise.all(
    uniqueRunIds.map(async (runId) =>
      buildLogicalTaskIdIndex(await loadCompiledRunPlan(context.env, tenantId, runId))
    )
  );
  const logicalTaskIdByRunTaskId = new Map<string, string>();

  for (const index of indexes) {
    for (const [runTaskId, logicalTaskId] of index.entries()) {
      logicalTaskIdByRunTaskId.set(runTaskId, logicalTaskId);
    }
  }

  return logicalTaskIdByRunTaskId;
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
    const items =
      query.projectKey && projects
        ? [serializeProjectListItem(projects)]
        : query.projectKey
          ? []
          : (await listProjects(client, {
              tenantId: auth.tenantId
            })).map(serializeProjectListItem);

    return context.json(
      projectCollectionEnvelopeSchema.parse({
        data: {
          items,
          total: items.length
        },
        meta: {
          apiVersion: "v1",
          envelope: "collection",
          resourceType: "project"
        }
      })
    );
  } finally {
    await client.close();
  }
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
      projectDetailEnvelopeSchema.parse({
        data: serializeProjectResource(created),
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "project"
        }
      }),
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

export async function getProjectHandler(context: Context<AppEnv>) {
  const projectId = context.req.param("projectId");

  if (!projectId) {
    throwJsonHttpError(400, "invalid_path", "Project ID is required.");
  }

  const client = createWorkerDatabaseClient(context.env);

  try {
    const project = await requireProject(context, client, projectId);

    if (!project) {
      return jsonErrorResponse(
        "project_not_found",
        `Project ${projectId} was not found.`,
        404
      );
    }

    return context.json(
      projectDetailEnvelopeSchema.parse({
        data: serializeProjectResource(project),
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "project"
        }
      })
    );
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
    const project = await requireProject(context, client, projectId);

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

    return context.json(
      projectDetailEnvelopeSchema.parse({
        data: serializeProjectResource(updated),
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "project"
        }
      })
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

export async function listProjectRunsHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const projectId = context.req.param("projectId");

  if (!projectId) {
    throwJsonHttpError(400, "invalid_path", "Project ID is required.");
  }

  const client = createWorkerDatabaseClient(context.env);

  try {
    const project = await requireProject(context, client, projectId);

    if (!project) {
      return jsonErrorResponse(
        "project_not_found",
        `Project ${projectId} was not found.`,
        404
      );
    }

    const runs = await listProjectRuns(client, {
      tenantId: auth.tenantId,
      projectId
    });
    const items = runs.map((run) => projectRunResource({ run }));

    return context.json(
      runCollectionEnvelopeSchema.parse({
        data: {
          items,
          total: items.length
        },
        meta: {
          apiVersion: "v1",
          envelope: "collection",
          resourceType: "run"
        }
      })
    );
  } finally {
    await client.close();
  }
}

export async function listProjectTasksHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const projectId = context.req.param("projectId");

  if (!projectId) {
    throwJsonHttpError(400, "invalid_path", "Project ID is required.");
  }

  const query = parseProjectTaskListQuery(context.req.query());
  const client = createWorkerDatabaseClient(context.env);

  try {
    const project = await requireProject(context, client, projectId);

    if (!project) {
      return jsonErrorResponse(
        "project_not_found",
        `Project ${projectId} was not found.`,
        404
      );
    }

    const page = await listProjectTasks(client, {
      tenantId: auth.tenantId,
      projectId,
      filter: query.filter,
      page: query.page,
      pageSize: query.pageSize
    });
    const logicalTaskIdByRunTaskId = await loadLogicalTaskIdIndexForRuns(
      context,
      auth.tenantId,
      page.items.map((task) => task.runId)
    );
    const items = projectTaskResources({
      runTasks: page.items,
      dependencies: page.dependencies,
      logicalTaskIdByRunTaskId
    });
    const pageCount = Math.max(1, Math.ceil(page.total / page.pageSize));

    return context.json(
      projectTaskCollectionEnvelopeSchema.parse({
        data: {
          items,
          total: page.total,
          page: page.page,
          pageSize: page.pageSize,
          pageCount,
          filter: query.filter
        },
        meta: {
          apiVersion: "v1",
          envelope: "collection",
          resourceType: "task"
        }
      })
    );
  } finally {
    await client.close();
  }
}
