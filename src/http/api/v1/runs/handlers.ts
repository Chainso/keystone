import type { Context } from "hono";

import type { AppEnv } from "../../../../env";
import { listRunArtifacts } from "../../../../lib/db/artifacts";
import { createWorkerDatabaseClient } from "../../../../lib/db/client";
import { getDocumentRevision, getRunDocument } from "../../../../lib/db/documents";
import { loadRequiredRunPlanningDocuments } from "../../../../lib/documents/runtime";
import { getProject } from "../../../../lib/db/projects";
import { resolveRunExecutionEngine } from "../../../../lib/runs/options";
import { buildRunSandboxId } from "../../../../lib/workspace/worktree";
import {
  createRunRecord,
  getRunRecord,
  listRunTaskDependencies,
  listRunTasks
} from "../../../../lib/db/runs";
import { jsonErrorResponse, throwJsonHttpError } from "../../../../lib/http/errors";
import { buildRunWorkflowInstanceId } from "../../../../lib/workflows/ids";
import {
  documentRevisionDetailEnvelopeSchema,
  serializeDocumentRevisionResource
} from "../documents/contracts";
import {
  runCompileActionEnvelopeSchema,
  runCompileRequestSchema,
  runCreateRequestSchema,
  runDetailEnvelopeSchema,
  taskCollectionEnvelopeSchema,
  taskDetailEnvelopeSchema,
  workflowGraphDetailEnvelopeSchema
} from "./contracts";
import {
  loadLogicalTaskIdIndex,
  projectArtifactResource,
  projectRunResource,
  projectTaskResources,
  projectWorkflowGraphResource
} from "./projections";
import { artifactCollectionEnvelopeSchema } from "../artifacts/contracts";

function parseRunCreateInput(value: unknown) {
  const result = runCreateRequestSchema.safeParse(value ?? {});

  if (!result.success) {
    throwJsonHttpError(400, "invalid_request", "Run request validation failed.", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        code: issue.code
      }))
    });
  }

  return result.data;
}

function parseRunCompileInput(value: unknown) {
  const result = runCompileRequestSchema.safeParse(value ?? {});

  if (!result.success) {
    throwJsonHttpError(400, "invalid_request", "Run compile request validation failed.", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        code: issue.code
      }))
    });
  }

  return result.data;
}

async function readOptionalJsonBody(context: Context<AppEnv>) {
  const body = await context.req.text();

  if (!body.trim()) {
    return {};
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throwJsonHttpError(400, "invalid_request", "Request body must be valid JSON.");
  }
}

async function loadRunState(context: Context<AppEnv>, runId: string) {
  const auth = context.get("auth");
  const client = createWorkerDatabaseClient(context.env);

  try {
    const run = await getRunRecord(client, {
      tenantId: auth.tenantId,
      runId
    });

    if (!run) {
      await client.close();
      return null;
    }

    let cachedTasks: Awaited<ReturnType<typeof listRunTasks>> | null = null;
    let cachedDependencies: Awaited<ReturnType<typeof listRunTaskDependencies>> | null = null;
    let cachedArtifacts: Awaited<ReturnType<typeof listRunArtifacts>> | null = null;
    let cachedLogicalTaskIdByRunTaskId: Map<string, string> | null = null;

    return {
      auth,
      client,
      run,
      async loadTasks() {
        if (cachedTasks === null) {
          cachedTasks = await listRunTasks(client, {
            tenantId: auth.tenantId,
            runId
          });
        }

        return cachedTasks;
      },
      async loadDependencies() {
        if (cachedDependencies === null) {
          cachedDependencies = await listRunTaskDependencies(client, {
            tenantId: auth.tenantId,
            runId
          });
        }

        return cachedDependencies;
      },
      async loadArtifacts() {
        if (cachedArtifacts === null) {
          cachedArtifacts = await listRunArtifacts(client, auth.tenantId, runId);
        }

        return cachedArtifacts;
      },
      async loadLogicalTaskIds() {
        if (cachedLogicalTaskIdByRunTaskId === null) {
          cachedLogicalTaskIdByRunTaskId = await loadLogicalTaskIdIndex(
            context.env,
            auth.tenantId,
            runId
          );
        }

        return cachedLogicalTaskIdByRunTaskId;
      }
    };
  } catch (error) {
    await client.close();
    throw error;
  }
}

function requireProjectId(context: Context<AppEnv>) {
  const projectId = context.req.param("projectId");

  if (!projectId) {
    throwJsonHttpError(400, "invalid_path", "Project ID is required.");
  }

  return projectId;
}

function requireRunId(context: Context<AppEnv>) {
  const runId = context.req.param("runId");

  if (!runId) {
    throwJsonHttpError(400, "invalid_path", "Run ID is required.");
  }

  return runId;
}

function requireTaskId(context: Context<AppEnv>) {
  const taskId = context.req.param("taskId");

  if (!taskId) {
    throwJsonHttpError(400, "invalid_path", "Task ID is required.");
  }

  return taskId;
}

function requireDocumentId(context: Context<AppEnv>) {
  const documentId = context.req.param("documentId");

  if (!documentId) {
    throwJsonHttpError(400, "invalid_path", "Document ID is required.");
  }

  return documentId;
}

function requireDocumentRevisionId(context: Context<AppEnv>) {
  const documentRevisionId = context.req.param("documentRevisionId");

  if (!documentRevisionId) {
    throwJsonHttpError(400, "invalid_path", "Document revision ID is required.");
  }

  return documentRevisionId;
}

function isWorkflowInstanceNotFound(error: unknown) {
  return error instanceof Error && error.message === "instance.not_found";
}

export async function createProjectRunHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const projectId = requireProjectId(context);
  const input = parseRunCreateInput(await readOptionalJsonBody(context));
  const client = createWorkerDatabaseClient(context.env);

  try {
    const project = await getProject(client, {
      tenantId: auth.tenantId,
      projectId
    });

    if (!project) {
      return jsonErrorResponse("project_not_found", `Project ${projectId} was not found.`, 404);
    }

    const runId = crypto.randomUUID();
    const run = await createRunRecord(client, {
      tenantId: auth.tenantId,
      runId,
      projectId: project.projectId,
      workflowInstanceId: buildRunWorkflowInstanceId(auth.tenantId, runId),
      executionEngine: input.executionEngine,
      sandboxId: buildRunSandboxId(auth.tenantId, runId),
      status: "configured"
    });

    return context.json(
      runDetailEnvelopeSchema.parse({
        data: projectRunResource({ run }),
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "run"
        }
      }),
      201
    );
  } finally {
    await client.close();
  }
}

export async function compileRunHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const runId = requireRunId(context);
  parseRunCompileInput(await readOptionalJsonBody(context));
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    try {
      await loadRequiredRunPlanningDocuments(context.env, state.client, {
        tenantId: auth.tenantId,
        runId
      });
    } catch (error) {
      return jsonErrorResponse(
        "run_documents_incomplete",
        error instanceof Error
          ? error.message
          : "Run compilation requires specification, architecture, and execution-plan documents.",
        409
      );
    }

    if (state.run.status === "active") {
      return jsonErrorResponse(
        "run_already_active",
        `Run ${runId} is already executing.`,
        409
      );
    }

    if (
      state.run.status === "archived" ||
      state.run.status === "failed" ||
      state.run.status === "cancelled"
    ) {
      return jsonErrorResponse(
        "run_not_compilable",
        `Run ${runId} is already ${state.run.status} and cannot be compiled again.`,
        409
      );
    }

    let shouldCreateWorkflow = false;

    try {
      const existingInstance = await context.env.RUN_WORKFLOW.get(state.run.workflowInstanceId);
      const workflowStatus = await existingInstance.status();
      shouldCreateWorkflow = workflowStatus.status === "unknown";
    } catch (error) {
      if (!isWorkflowInstanceNotFound(error)) {
        throw error;
      }

      shouldCreateWorkflow = true;
    }

    if (shouldCreateWorkflow) {
      await context.env.RUN_WORKFLOW.create({
        id: state.run.workflowInstanceId,
        params: {
          tenantId: auth.tenantId,
          runId: state.run.runId,
          projectId: state.run.projectId,
          executionEngine: resolveRunExecutionEngine(state.run.executionEngine)
        }
      });
    }

    const run = projectRunResource({ run: state.run });

    return context.json(
      runCompileActionEnvelopeSchema.parse({
        data: {
          status: "accepted",
          workflowInstanceId: state.run.workflowInstanceId,
          run
        },
        meta: {
          apiVersion: "v1",
          envelope: "action",
          resourceType: "run"
        }
      }),
      202
    );
  } finally {
    await state.client.close();
  }
}

export async function getRunHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const run = projectRunResource({ run: state.run });

    return context.json(
      runDetailEnvelopeSchema.parse({
        data: run,
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "run"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function getRunWorkflowGraphHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const tasks = projectTaskResources({
      runTasks: await state.loadTasks(),
      dependencies: await state.loadDependencies(),
      logicalTaskIdByRunTaskId: await state.loadLogicalTaskIds()
    });
    const graph = projectWorkflowGraphResource({
      tenantId: state.auth.tenantId,
      runId,
      tasks
    });

    return context.json(
      workflowGraphDetailEnvelopeSchema.parse({
        data: graph,
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "workflow_graph"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function listRunTasksHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const tasks = projectTaskResources({
      runTasks: await state.loadTasks(),
      dependencies: await state.loadDependencies(),
      logicalTaskIdByRunTaskId: await state.loadLogicalTaskIds()
    });

    return context.json(
      taskCollectionEnvelopeSchema.parse({
        data: {
          items: tasks,
          total: tasks.length
        },
        meta: {
          apiVersion: "v1",
          envelope: "collection",
          resourceType: "task"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function getTaskHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const taskId = requireTaskId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const task = projectTaskResources({
      runTasks: await state.loadTasks(),
      dependencies: await state.loadDependencies(),
      logicalTaskIdByRunTaskId: await state.loadLogicalTaskIds()
    }).find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return jsonErrorResponse(
        "task_not_found",
        `Task ${taskId} was not found for run ${runId}.`,
        404
      );
    }

    return context.json(
      taskDetailEnvelopeSchema.parse({
        data: task,
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "task"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function getRunDocumentRevisionHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const documentId = requireDocumentId(context);
  const documentRevisionId = requireDocumentRevisionId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const document = await getRunDocument(state.client, {
      tenantId: state.auth.tenantId,
      runId,
      documentId
    });

    if (!document) {
      return jsonErrorResponse(
        "document_not_found",
        `Document ${documentId} was not found for run ${runId}.`,
        404
      );
    }

    const revision = await getDocumentRevision(state.client, {
      tenantId: state.auth.tenantId,
      documentId,
      documentRevisionId
    });

    if (!revision) {
      return jsonErrorResponse(
        "document_revision_not_found",
        `Document revision ${documentRevisionId} was not found for run ${runId} document ${documentId}.`,
        404
      );
    }

    return context.json(
      documentRevisionDetailEnvelopeSchema.parse({
        data: serializeDocumentRevisionResource(revision),
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "document_revision"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}

export async function listTaskArtifactsHandler(context: Context<AppEnv>) {
  const runId = requireRunId(context);
  const taskId = requireTaskId(context);
  const state = await loadRunState(context, runId);

  if (!state) {
    return jsonErrorResponse("run_not_found", `Run ${runId} was not found.`, 404);
  }

  try {
    const task = projectTaskResources({
      runTasks: await state.loadTasks(),
      dependencies: await state.loadDependencies(),
      logicalTaskIdByRunTaskId: await state.loadLogicalTaskIds()
    }).find((candidate) => candidate.taskId === taskId);

    if (!task) {
      return jsonErrorResponse(
        "task_not_found",
        `Task ${taskId} was not found for run ${runId}.`,
        404
      );
    }

    const items = (await state.loadArtifacts())
      .filter((artifact) => artifact.runTaskId === taskId)
      .map(projectArtifactResource);

    return context.json(
      artifactCollectionEnvelopeSchema.parse({
        data: {
          items,
          total: items.length
        },
        meta: {
          apiVersion: "v1",
          envelope: "collection",
          resourceType: "artifact"
        }
      })
    );
  } finally {
    await state.client.close();
  }
}
