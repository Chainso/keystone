import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DatabaseClient } from "../../src/lib/db/client";
import {
  createDatabaseClientFromSource,
  resolveDatabaseConnectionString
} from "../../src/lib/db/client";
import { createArtifactRef, listRunArtifacts } from "../../src/lib/db/artifacts";
import {
  createDocument,
  createDocumentRevision,
  getDocument,
  listDocumentRevisions,
  listProjectDocuments,
  listRunDocuments
} from "../../src/lib/db/documents";
import { appendSessionEvent, listRunEvents } from "../../src/lib/db/events";
import { applyMigrations } from "../../src/lib/db/migrations";
import { createProject } from "../../src/lib/db/projects";
import {
  createRunRecord,
  createRunTask,
  createRunTaskDependency,
  createSessionRecord,
  getRunRecord,
  getRunTask,
  listProjectRuns,
  listRunTaskDependencies,
  listRunTasks,
  getSessionRecord,
  updateRunRecord,
  updateRunTask,
  updateSessionStatus
} from "../../src/lib/db/runs";
import {
  createWorkspaceBinding,
  listRunWorkspaceBindings,
  listWorkspaceMaterializedComponents
} from "../../src/lib/db/workspaces";

const connectionString =
  process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??
  process.env.DATABASE_URL;

const describeIfDatabase =
  connectionString && process.env.KEYSTONE_RUN_DB_TESTS === "1" ? describe : describe.skip;

describeIfDatabase("database repositories", () => {
  let client: DatabaseClient;

  const tenantId = `tenant-test-${crypto.randomUUID()}`;
  const sessionId = crypto.randomUUID();
  const legacyRunId = `run-${crypto.randomUUID()}`;

  function buildProjectConfig(projectKey: string) {
    return {
      projectKey,
      displayName: "Persistence Foundation Project",
      description: "Fixture project for target-model persistence tests.",
      ruleSet: {
        reviewInstructions: ["Capture persistence changes in review."],
        testInstructions: ["Run the repository integration tests."]
      },
      components: [
        {
          componentKey: "app",
          displayName: "App",
          kind: "git_repository" as const,
          config: {
            localPath: "./fixtures/demo-target",
            defaultRef: "main"
          },
          metadata: {
            purpose: "service"
          }
        }
      ],
      envVars: [],
      integrationBindings: [],
      metadata: {
        source: "db-repositories-test"
      }
    };
  }

  beforeAll(async () => {
    const resolvedConnectionString = resolveDatabaseConnectionString({
      connectionString
    });

    await applyMigrations({
      connectionString: resolvedConnectionString
    });

    client = createDatabaseClientFromSource({
      connectionString: resolvedConnectionString
    });
  });

  afterAll(async () => {
    if (!client) {
      return;
    }

    await client.sql`DELETE FROM projects WHERE tenant_id = ${tenantId}`;
    await client.sql`DELETE FROM session_events WHERE tenant_id = ${tenantId}`;
    await client.sql`DELETE FROM artifact_refs WHERE tenant_id = ${tenantId}`;
    await client.sql`DELETE FROM workspace_materialized_components WHERE tenant_id = ${tenantId}`;
    await client.sql`DELETE FROM workspace_bindings WHERE tenant_id = ${tenantId}`;
    await client.sql`DELETE FROM sessions WHERE tenant_id = ${tenantId}`;
    await client.close();
  });

  it("creates and updates a session row", async () => {
    const inserted = await createSessionRecord(
      client,
      {
        tenantId,
        runId: legacyRunId,
        sessionType: "run",
        metadata: {
          source: "integration-test"
        }
      },
      {
        sessionId
      }
    );

    if (!inserted) {
      throw new Error("Expected session insert to return a row.");
    }
    expect(inserted.sessionId).toBe(sessionId);
    expect(inserted.status).toBe("configured");

    const updated = await updateSessionStatus(client, {
      tenantId,
      sessionId,
      status: "provisioning"
    });

    if (!updated) {
      throw new Error("Expected session update to return a row.");
    }
    expect(updated.status).toBe("provisioning");

    const fetched = await getSessionRecord(client, tenantId, sessionId);
    expect(fetched?.runId).toBe(legacyRunId);
  });

  it("appends events and links artifacts for the run", async () => {
    const artifact = await createArtifactRef(client, {
      tenantId,
      runId: legacyRunId,
      sessionId,
      kind: "plan",
      storageBackend: "r2",
      storageUri: "r2://keystone-artifacts-dev/test/plan.json",
      contentType: "application/json"
    });

    if (!artifact) {
      throw new Error("Expected artifact insert to return a row.");
    }
    const event = await appendSessionEvent(client, {
      tenantId,
      runId: legacyRunId,
      sessionId,
      eventType: "session.started",
      artifactRefId: artifact.artifactRefId,
      payload: {
        phase: "phase-2-test"
      }
    });

    if (!event) {
      throw new Error("Expected event insert to return a row.");
    }
    expect(event.seq).toBe(1);
    expect(event.artifactRefId).toBe(artifact.artifactRefId);

    const runEvents = await listRunEvents(client, {
      tenantId,
      runId: legacyRunId
    });
    const runArtifacts = await listRunArtifacts(client, tenantId, legacyRunId);

    expect(runEvents).toHaveLength(1);
    expect(runArtifacts).toHaveLength(1);
    expect(runArtifacts[0]?.storageUri).toContain("plan.json");
  });

  it("stores task workspace bindings for later cleanup", async () => {
    const workspaceId = `workspace-${crypto.randomUUID()}`;
    const binding = await createWorkspaceBinding(client, {
      tenantId,
      workspaceId,
      runId: legacyRunId,
      sessionId,
      taskId: "task-smoke",
      strategy: "worktree",
      sandboxId: "sandbox-smoke",
      workspaceRoot: "/workspace/runs/demo",
      workspaceTargetPath: "/workspace/runs/demo/code",
      defaultComponentKey: "docs",
      materializedComponents: [
        {
          componentKey: "repo",
          repoUrl: "fixture://demo-target",
          repoRef: "main",
          baseRef: "main",
          repositoryPath: "/workspace/runs/demo/repositories/repo",
          worktreePath: "/workspace/runs/demo/code/repo",
          branchName: "keystone/task-smoke",
          headSha: "abc123"
        },
        {
          componentKey: "docs",
          repoUrl: "fixture://demo-docs",
          repoRef: "release",
          baseRef: "release",
          repositoryPath: "/workspace/runs/demo/repositories/docs",
          worktreePath: "/workspace/runs/demo/code/docs",
          branchName: "keystone/task-smoke",
          headSha: "def456"
        }
      ],
      metadata: {
        defaultCwd: "/workspace/runs/demo",
        codeRoot: "/workspace/runs/demo/code"
      }
    });

    expect(binding?.repoUrl).toBe("fixture://demo-docs");
    expect(binding?.workspaceRoot).toBe("/workspace/runs/demo");
    expect(binding?.workspaceTargetPath).toBe("/workspace/runs/demo/code");
    expect(binding?.defaultComponentKey).toBe("docs");
    expect(binding?.worktreePath).toBe("/workspace/runs/demo/code/docs");

    const bindings = await listRunWorkspaceBindings(client, {
      tenantId,
      runId: legacyRunId
    });
    const components = await listWorkspaceMaterializedComponents(client, {
      tenantId,
      workspaceId
    });

    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.metadata).toMatchObject({
      defaultCwd: "/workspace/runs/demo",
      codeRoot: "/workspace/runs/demo/code"
    });
    expect(components).toHaveLength(2);
    expect(components.map((component) => component.componentKey)).toEqual(["docs", "repo"]);
    expect(components[0]).toMatchObject({
      componentKey: "docs",
      worktreePath: "/workspace/runs/demo/code/docs",
      headSha: "def456"
    });
    expect(components[1]).toMatchObject({
      componentKey: "repo",
      worktreePath: "/workspace/runs/demo/code/repo",
      headSha: "abc123"
    });
  });

  it("stores target-model runs, documents, revisions, and dependency edges", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`target-model-${crypto.randomUUID()}`)
    });
    const runId = `run-${crypto.randomUUID()}`;

    const run = await createRunRecord(client, {
      tenantId,
      runId,
      projectId: project.projectId,
      workflowInstanceId: `workflow-${crypto.randomUUID()}`,
      executionEngine: "think",
      status: "pending"
    });

    expect(run?.projectId).toBe(project.projectId);
    expect(run?.status).toBe("pending");

    const projectDocument = await createDocument(client, {
      tenantId,
      projectId: project.projectId,
      scopeType: "project",
      kind: "specification",
      path: "product/specification",
      conversationAgentClass: "PlanningDocumentAgent",
      conversationAgentName: "project-specification"
    });
    const runDocument = await createDocument(client, {
      tenantId,
      projectId: project.projectId,
      runId,
      scopeType: "run",
      kind: "execution_plan",
      path: "execution-plan",
      conversationAgentClass: "PlanningDocumentAgent",
      conversationAgentName: "run-execution-plan"
    });
    const artifact = await createArtifactRef(client, {
      tenantId,
      projectId: project.projectId,
      runId,
      kind: "document_revision",
      storageBackend: "r2",
      storageUri: `r2://keystone-artifacts-dev/documents/run/${runId}/${runDocument?.documentId}.md`,
      contentType: "text/markdown",
      etag: "etag-plan-1",
      sizeBytes: 128
    });

    const revision = await createDocumentRevision(client, {
      tenantId,
      documentId: runDocument?.documentId ?? "",
      artifactRefId: artifact?.artifactRefId ?? "",
      title: "Execution Plan v1"
    });
    const compiledAt = new Date("2026-04-19T08:15:00.000Z");
    const updatedRun = await updateRunRecord(client, {
      tenantId,
      runId,
      status: "compiled",
      compiledExecutionPlanRevisionId: revision?.documentRevisionId ?? null,
      compiledAt
    });

    const taskA = await createRunTask(client, {
      tenantId,
      runId,
      name: "Prepare schema",
      description: "Add the target-model persistence tables.",
      status: "ready"
    });
    const taskB = await createRunTask(client, {
      tenantId,
      runId,
      name: "Validate repositories",
      description: "Exercise the new persistence layer in repository tests.",
      status: "pending",
      conversationAgentClass: "TaskAgent",
      conversationAgentName: "validate-repositories"
    });
    const dependency = await createRunTaskDependency(client, {
      tenantId,
      runId,
      parentRunTaskId: taskA?.runTaskId ?? "",
      childRunTaskId: taskB?.runTaskId ?? ""
    });
    const updatedTaskB = await updateRunTask(client, {
      tenantId,
      runId,
      runTaskId: taskB?.runTaskId ?? "",
      status: "blocked",
      startedAt: new Date("2026-04-19T08:30:00.000Z")
    });

    const fetchedRun = await getRunRecord(client, {
      tenantId,
      runId
    });
    const fetchedRunTask = await getRunTask(client, {
      tenantId,
      runId,
      runTaskId: taskB?.runTaskId ?? ""
    });
    const projectRuns = await listProjectRuns(client, {
      tenantId,
      projectId: project.projectId
    });
    const projectDocuments = await listProjectDocuments(client, {
      tenantId,
      projectId: project.projectId
    });
    const runDocuments = await listRunDocuments(client, {
      tenantId,
      runId
    });
    const documentRevisions = await listDocumentRevisions(client, {
      tenantId,
      documentId: runDocument?.documentId ?? ""
    });
    const runTasks = await listRunTasks(client, {
      tenantId,
      runId
    });
    const runTaskDependencies = await listRunTaskDependencies(client, {
      tenantId,
      runId
    });
    const refreshedRunDocument = await getDocument(client, {
      tenantId,
      documentId: runDocument?.documentId ?? ""
    });

    expect(projectDocument?.scopeType).toBe("project");
    expect(projectDocument?.runId).toBeNull();
    expect(runDocument?.scopeType).toBe("run");
    expect(artifact?.artifactKind).toBe("document_revision");
    expect(artifact?.bucket).toBe("keystone-artifacts-dev");
    expect(artifact?.objectKey).toContain(`/documents/run/${runId}/`);
    expect(artifact?.etag).toBe("etag-plan-1");
    expect(revision?.revisionNumber).toBe(1);
    expect(refreshedRunDocument?.currentRevisionId).toBe(revision?.documentRevisionId);
    expect(updatedRun?.status).toBe("compiled");
    expect(updatedRun?.compiledExecutionPlanRevisionId).toBe(revision?.documentRevisionId);
    expect(updatedRun?.compiledAt?.toISOString()).toBe(compiledAt.toISOString());
    expect(fetchedRun?.runId).toBe(runId);
    expect(projectRuns).toHaveLength(1);
    expect(projectDocuments.map((document) => document.path)).toEqual(["product/specification"]);
    expect(runDocuments.map((document) => document.path)).toEqual(["execution-plan"]);
    expect(documentRevisions.map((entry) => entry.revisionNumber)).toEqual([1]);
    expect(runTasks.map((task) => task.name)).toEqual(["Prepare schema", "Validate repositories"]);
    expect(dependency?.parentRunTaskId).toBe(taskA?.runTaskId);
    expect(dependency?.childRunTaskId).toBe(taskB?.runTaskId);
    expect(runTaskDependencies).toHaveLength(1);
    expect(updatedTaskB?.status).toBe("blocked");
    expect(fetchedRunTask?.conversationAgentName).toBe("validate-repositories");
  });
});
