import type { Context } from "hono";

import type { AppEnv } from "../../../../env";
import { createWorkerDatabaseClient } from "../../../../lib/db/client";
import {
  createProject,
  getProject,
  getProjectByKey,
  listProjects,
  updateProject
} from "../../../../lib/db/projects";
import { listProjectRuns, listRunSessions } from "../../../../lib/db/runs";
import { jsonErrorResponse, throwJsonHttpError } from "../../../../lib/http/errors";
import { parseProjectListQuery, parseProjectWriteInput } from "../../../contracts/project-input";
import { decisionPackageCollectionEnvelopeSchema } from "../decision-packages/contracts";
import {
  projectCollectionEnvelopeSchema,
  projectDetailEnvelopeSchema,
  serializeProjectListItem,
  serializeProjectResource
} from "./contracts";
import { runCollectionEnvelopeSchema } from "../runs/contracts";
import { projectRunResource } from "../runs/projections";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function buildEmptyDecisionPackagesResponse() {
  return decisionPackageCollectionEnvelopeSchema.parse({
    data: {
      items: [],
      total: 0
    },
    meta: {
      apiVersion: "v1",
      envelope: "collection",
      resourceType: "decision_package"
    }
  });
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

export async function listProjectDecisionPackagesHandler(context: Context<AppEnv>) {
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

    return context.json(buildEmptyDecisionPackagesResponse());
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
    const runSessions = await Promise.all(
      runs.map((run) => listRunSessions(client, auth.tenantId, run.runId))
    );
    const items = runs.map((run, index) =>
      projectRunResource({
        tenantId: auth.tenantId,
        runId: run.runId,
        runRecord: run,
        sessions: runSessions[index] ?? [],
        events: [],
        artifacts: [],
        liveSnapshot: null,
        runPlanSummary: null
      })
    );

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
