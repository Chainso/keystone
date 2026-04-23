import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DatabaseClient } from "../../src/lib/db/client";
import {
  createDatabaseClientFromSource,
  resolveDatabaseConnectionString
} from "../../src/lib/db/client";
import {
  createArtifactRef,
  findArtifactRefByObjectKey,
  getArtifactRef,
  getArtifactStorageUri
} from "../../src/lib/db/artifacts";
import {
  createDocument,
  createDocumentRevision,
  getDocument,
  listDocumentRevisions,
  listProjectDocuments,
  listRunDocuments
} from "../../src/lib/db/documents";
import { applyMigrations } from "../../src/lib/db/migrations";
import { createProject } from "../../src/lib/db/projects";
import {
  createRunRecord,
  createRunTask,
  createRunTaskDependency,
  getRunRecord,
  getRunTask,
  listProjectRuns,
  listRunTaskDependencies,
  listRunTasks,
  persistCompiledRunGraph,
  updateRunRecord,
  updateRunTask
} from "../../src/lib/db/runs";

const connectionString =
  process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??
  process.env.DATABASE_URL;

const describeIfDatabase =
  connectionString && process.env.KEYSTONE_RUN_DB_TESTS === "1" ? describe : describe.skip;

describeIfDatabase("database repositories", () => {
  let client: DatabaseClient;

  const tenantId = `tenant-test-${crypto.randomUUID()}`;

  function buildProjectConfig(projectKey: string) {
    return {
      projectKey,
      displayName: "Persistence Repository Project",
      description: "Fixture project for repository persistence tests.",
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
            ref: "main"
          }
        }
      ],
      envVars: []
    };
  }

  function expectRow<T>(value: T | undefined | null, message: string) {
    if (!value) {
      throw new Error(message);
    }

    return value;
  }

  async function createRunFixture(projectId: string) {
    const runId = `run-${crypto.randomUUID()}`;
    const run = await createRunRecord(client, {
      tenantId,
      runId,
      projectId,
      workflowInstanceId: `workflow-${crypto.randomUUID()}`,
      executionEngine: "think_live",
      status: "pending"
    });

    return {
      run: expectRow(run, "Expected run insert to return a row."),
      runId
    };
  }

  async function createRunPlanningRevisionSet(projectId: string, runId: string) {
    const specificationDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId,
        runId,
        scopeType: "run",
        kind: "specification",
        path: "specification"
      }),
      "Expected specification document insert to return a row."
    );
    const architectureDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId,
        runId,
        scopeType: "run",
        kind: "architecture",
        path: "architecture"
      }),
      "Expected architecture document insert to return a row."
    );
    const executionPlanDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId,
        runId,
        scopeType: "run",
        kind: "execution_plan",
        path: "execution-plan"
      }),
      "Expected execution-plan document insert to return a row."
    );

    const specificationArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId,
        runId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${runId}/${specificationDocument.documentId}/v1.md`,
        contentType: "text/markdown"
      }),
      "Expected specification artifact insert to return a row."
    );
    const architectureArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId,
        runId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${runId}/${architectureDocument.documentId}/v1.md`,
        contentType: "text/markdown"
      }),
      "Expected architecture artifact insert to return a row."
    );
    const executionPlanArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId,
        runId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${runId}/${executionPlanDocument.documentId}/v1.md`,
        contentType: "text/markdown"
      }),
      "Expected execution-plan artifact insert to return a row."
    );

    const specificationRevision = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: specificationDocument.documentId,
        artifactRefId: specificationArtifact.artifactRefId,
        title: "Run Specification v1"
      }),
      "Expected specification revision insert to return a row."
    );
    const architectureRevision = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: architectureDocument.documentId,
        artifactRefId: architectureArtifact.artifactRefId,
        title: "Run Architecture v1"
      }),
      "Expected architecture revision insert to return a row."
    );
    const executionPlanRevision = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: executionPlanDocument.documentId,
        artifactRefId: executionPlanArtifact.artifactRefId,
        title: "Run Execution Plan v1"
      }),
      "Expected execution-plan revision insert to return a row."
    );

    return {
      specificationRevisionId: specificationRevision.documentRevisionId,
      architectureRevisionId: architectureRevision.documentRevisionId,
      executionPlanRevisionId: executionPlanRevision.documentRevisionId
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
    await client.close();
  });

  it("rejects invalid document scope combinations", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`document-scope-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);

    await expect(
      createDocument(client, {
        tenantId,
        projectId: project.projectId,
        scopeType: "run",
        kind: "specification",
        path: "specification"
      })
    ).rejects.toThrow(/require a run id/i);

    await expect(
      createDocument(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        scopeType: "project",
        kind: "specification",
        path: "product/specification"
      })
    ).rejects.toThrow(/cannot reference a run/i);
  });

  it("stores target-model runs, documents, revisions, artifact refs, and dependency edges", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`target-model-${crypto.randomUUID()}`)
    });
    const { run, runId } = await createRunFixture(project.projectId);

    const projectDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId: project.projectId,
        scopeType: "project",
        kind: "specification",
        path: "product/specification",
        conversationAgentClass: "PlanningDocumentAgent",
        conversationAgentName: "project-specification"
      }),
      "Expected project document insert to return a row."
    );
    const runDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        scopeType: "run",
        kind: "execution_plan",
        path: "execution-plan",
        conversationAgentClass: "PlanningDocumentAgent",
        conversationAgentName: "run-execution-plan"
      }),
      "Expected run document insert to return a row."
    );

    const projectArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId: null,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/project/${project.projectId}/${projectDocument.documentId}/v1.md`,
        contentType: "text/markdown",
        etag: "etag-project-spec-1",
        sizeBytes: 96
      }),
      "Expected project artifact insert to return a row."
    );
    const runArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${runId}/${runDocument.documentId}/v1.md`,
        contentType: "text/markdown",
        etag: "etag-plan-1",
        sizeBytes: 128
      }),
      "Expected run artifact insert to return a row."
    );

    const projectRevision = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: projectDocument.documentId,
        artifactRefId: projectArtifact.artifactRefId,
        title: "Project Specification v1"
      }),
      "Expected project revision insert to return a row."
    );
    const runRevision = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: runDocument.documentId,
        artifactRefId: runArtifact.artifactRefId,
        title: "Execution Plan v1"
      }),
      "Expected run revision insert to return a row."
    );

    const projectArtifactV2 = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId: null,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/project/${project.projectId}/${projectDocument.documentId}/v2.md`,
        contentType: "text/markdown",
        etag: "etag-project-spec-2",
        sizeBytes: 112
      }),
      "Expected project v2 artifact insert to return a row."
    );
    const runArtifactV2 = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${runId}/${runDocument.documentId}/v2.md`,
        contentType: "text/markdown",
        etag: "etag-plan-2",
        sizeBytes: 144
      }),
      "Expected run v2 artifact insert to return a row."
    );

    const projectRevisionV2 = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: projectDocument.documentId,
        artifactRefId: projectArtifactV2.artifactRefId,
        title: "Project Specification v2"
      }),
      "Expected project v2 revision insert to return a row."
    );
    const runRevisionV2 = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: runDocument.documentId,
        artifactRefId: runArtifactV2.artifactRefId,
        title: "Execution Plan v2"
      }),
      "Expected run v2 revision insert to return a row."
    );

    const compiledAt = new Date("2026-04-19T08:15:00.000Z");
    const updatedRun = await updateRunRecord(client, {
      tenantId,
      runId,
      status: "compiled",
      compiledExecutionPlanRevisionId: runRevisionV2.documentRevisionId,
      compiledAt
    });

    const taskA = expectRow(
      await createRunTask(client, {
        tenantId,
        runId,
        name: "Prepare schema",
        description: "Add the target-model persistence tables.",
        status: "ready"
      }),
      "Expected run task A insert to return a row."
    );
    const taskB = expectRow(
      await createRunTask(client, {
        tenantId,
        runId,
        name: "Validate repositories",
        description: "Exercise the new persistence layer in repository tests.",
        status: "pending",
        conversationAgentClass: "TaskAgent",
        conversationAgentName: "validate-repositories"
      }),
      "Expected run task B insert to return a row."
    );
    const dependency = expectRow(
      await createRunTaskDependency(client, {
        tenantId,
        runId,
        parentRunTaskId: taskA.runTaskId,
        childRunTaskId: taskB.runTaskId
      }),
      "Expected run task dependency insert to return a row."
    );
    const updatedTaskB = expectRow(
      await updateRunTask(client, {
        tenantId,
        runId,
        runTaskId: taskB.runTaskId,
        status: "blocked",
        startedAt: new Date("2026-04-19T08:30:00.000Z")
      }),
      "Expected run task update to return a row."
    );

    const fetchedRun = await getRunRecord(client, {
      tenantId,
      runId
    });
    const fetchedRunTask = await getRunTask(client, {
      tenantId,
      runId,
      runTaskId: taskB.runTaskId
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
    const projectDocumentRevisions = await listDocumentRevisions(client, {
      tenantId,
      documentId: projectDocument.documentId
    });
    const runDocumentRevisions = await listDocumentRevisions(client, {
      tenantId,
      documentId: runDocument.documentId
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
      documentId: runDocument.documentId
    });
    const refreshedProjectDocument = await getDocument(client, {
      tenantId,
      documentId: projectDocument.documentId
    });

    expect(run.projectId).toBe(project.projectId);
    expect(projectDocument.scopeType).toBe("project");
    expect(projectDocument.runId).toBeNull();
    expect(runDocument.scopeType).toBe("run");
    expect(runDocument.conversationAgentClass).toBe("PlanningDocumentAgent");
    expect(runDocument.conversationAgentName).toBe(
      `tenant:${tenantId}:run:${runId}:document:execution-plan`
    );
    expect(projectArtifact.runId).toBeNull();
    expect(getArtifactStorageUri(projectArtifact)).toContain(`/documents/project/${project.projectId}/`);
    expect(projectArtifact.etag).toBe("etag-project-spec-1");
    expect(projectRevision.revisionNumber).toBe(1);
    expect(projectRevisionV2.revisionNumber).toBe(2);
    expect(refreshedProjectDocument?.currentRevisionId).toBe(projectRevisionV2.documentRevisionId);
    expect(runArtifact.artifactKind).toBe("document_revision");
    expect(runArtifact.bucket).toBe("keystone-artifacts-dev");
    expect(getArtifactStorageUri(runArtifact)).toContain(`/documents/run/${runId}/`);
    expect(runArtifact.etag).toBe("etag-plan-1");
    expect(runRevision.revisionNumber).toBe(1);
    expect(runRevisionV2.revisionNumber).toBe(2);
    expect(refreshedRunDocument?.currentRevisionId).toBe(runRevisionV2.documentRevisionId);
    expect(updatedRun?.status).toBe("compiled");
    expect(updatedRun?.compiledExecutionPlanRevisionId).toBe(runRevisionV2.documentRevisionId);
    expect(updatedRun?.compiledAt?.toISOString()).toBe(compiledAt.toISOString());
    expect(fetchedRun?.runId).toBe(runId);
    expect(projectRuns).toHaveLength(1);
    expect(projectDocuments.map((document) => document.path)).toEqual(["product/specification"]);
    expect(runDocuments.map((document) => document.path)).toEqual(["execution-plan"]);
    expect(projectDocumentRevisions.map((entry) => entry.revisionNumber)).toEqual([1, 2]);
    expect(runDocumentRevisions.map((entry) => entry.revisionNumber)).toEqual([1, 2]);
    expect(runTasks.map((task) => task.name)).toEqual(["Prepare schema", "Validate repositories"]);
    expect(dependency.parentRunTaskId).toBe(taskA.runTaskId);
    expect(dependency.childRunTaskId).toBe(taskB.runTaskId);
    expect(runTaskDependencies).toHaveLength(1);
    expect(updatedTaskB.status).toBe("blocked");
    expect(fetchedRunTask?.conversationAgentName).toBe("validate-repositories");
  });

  it("rejects document revisions whose artifacts fall outside the document boundary", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`document-boundary-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);
    const { runId: otherRunId } = await createRunFixture(project.projectId);
    const runDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        scopeType: "run",
        kind: "execution_plan",
        path: "execution-plan"
      }),
      "Expected run document insert to return a row."
    );
    const projectDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId: project.projectId,
        scopeType: "project",
        kind: "specification",
        path: "product/specification"
      }),
      "Expected project document insert to return a row."
    );
    const wrongRunArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId: otherRunId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${otherRunId}/${crypto.randomUUID()}.md`,
        contentType: "text/markdown"
      }),
      "Expected wrong-run artifact insert to return a row."
    );
    const wrongKindArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        artifactKind: "run_plan",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${runId}/${crypto.randomUUID()}.json`,
        contentType: "application/json"
      }),
      "Expected wrong-kind artifact insert to return a row."
    );
    const projectDocumentWrongBoundaryArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${runId}/${crypto.randomUUID()}.md`,
        contentType: "text/markdown"
      }),
      "Expected project boundary artifact insert to return a row."
    );

    await expect(
      createDocumentRevision(client, {
        tenantId,
        documentId: runDocument.documentId,
        artifactRefId: wrongRunArtifact.artifactRefId,
        title: "Wrong run"
      })
    ).rejects.toThrow(new RegExp(`does not belong to run ${runId}`, "i"));

    await expect(
      createDocumentRevision(client, {
        tenantId,
        documentId: runDocument.documentId,
        artifactRefId: wrongKindArtifact.artifactRefId,
        title: "Wrong kind"
      })
    ).rejects.toThrow(/not a document_revision artifact/i);

    await expect(
      createDocumentRevision(client, {
        tenantId,
        documentId: projectDocument.documentId,
        artifactRefId: projectDocumentWrongBoundaryArtifact.artifactRefId,
        title: "Wrong project boundary"
      })
    ).rejects.toThrow(/project-scoped document boundary/i);
  });

  it("rejects duplicate artifact object keys with conflicting ownership", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`artifact-ownership-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);
    const task = expectRow(
      await createRunTask(client, {
        tenantId,
        runId,
        name: "Artifact owner",
        description: "Own the artifact object key.",
        status: "ready"
      }),
      "Expected run task insert to return a row."
    );
    const objectKey = `tenants/${tenantId}/runs/${runId}/tasks/${task.runTaskId}/artifacts/output.txt`;

    const initialArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        runTaskId: task.runTaskId,
        artifactKind: "run_note",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey,
        contentType: "text/plain"
      }),
      "Expected initial artifact insert to return a row."
    );

    await expect(
      createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        runTaskId: null,
        artifactKind: "run_summary",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey,
        contentType: "application/json"
      })
    ).rejects.toThrow(/conflicting ownership, blob identity, or contract data/i);

    expect(initialArtifact.runTaskId).toBe(task.runTaskId);
    expect(initialArtifact.artifactKind).toBe("run_note");
  });

  it("rejects duplicate artifact object keys with conflicting blob identity", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`artifact-blob-identity-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);
    const objectKey = `tenants/${tenantId}/runs/${runId}/artifacts/run-summary.json`;

    await createArtifactRef(client, {
      tenantId,
      projectId: project.projectId,
      runId,
      artifactKind: "run_summary",
      storageBackend: "r2",
      bucket: "keystone-artifacts-dev",
      objectKey,
      objectVersion: "v1",
      etag: "etag-v1",
      contentType: "application/json",
      sha256: "sha-v1",
      sizeBytes: 128
    });

    await expect(
      createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        artifactKind: "run_summary",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey,
        objectVersion: "v2",
        etag: "etag-v2",
        contentType: "application/json",
        sha256: "sha-v2",
        sizeBytes: 256
      })
    ).rejects.toThrow(/conflicting ownership, blob identity, or contract data/i);
  });

  it("rejects artifact refs whose run task does not belong to the selected run", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`artifact-run-task-ownership-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);
    const { runId: otherRunId } = await createRunFixture(project.projectId);
    const otherRunTask = expectRow(
      await createRunTask(client, {
        tenantId,
        runId: otherRunId,
        name: "Other run task",
        description: "Should not be attachable to a different run artifact.",
        status: "ready"
      }),
      "Expected other-run task insert to return a row."
    );

    await expect(
      createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        runTaskId: otherRunTask.runTaskId,
        artifactKind: "run_note",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `tenants/${tenantId}/runs/${runId}/tasks/${otherRunTask.runTaskId}/artifacts/note.md`,
        contentType: "text/markdown"
      })
    ).rejects.toThrow(new RegExp(`run task ${otherRunTask.runTaskId} does not belong to run ${runId}`, "i"));

    await expect(
      createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runTaskId: otherRunTask.runTaskId,
        artifactKind: "run_note",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `tenants/${tenantId}/artifacts/orphan-task-note.md`,
        contentType: "text/markdown"
      })
    ).rejects.toThrow(/runTaskId must also include a runId/i);
  });

  it("rejects artifact refs whose project does not belong to the tenant", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`artifact-tenant-ownership-${crypto.randomUUID()}`)
    });

    await expect(
      createArtifactRef(client, {
        tenantId: `other-${tenantId}`,
        projectId: project.projectId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/project/${project.projectId}/foreign.md`,
        contentType: "text/markdown"
      })
    ).rejects.toThrow(new RegExp(`project ${project.projectId} was not found for tenant`, "i"));
  });

  it("rejects stale artifact kinds before persisting artifact refs", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`artifact-kind-guard-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);
    const objectKey = `tenants/${tenantId}/runs/${runId}/artifacts/release-pack.json`;

    await expect(
      createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        artifactKind: "release_pack" as never,
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey,
        contentType: "application/json"
      })
    ).rejects.toThrow(/artifact kind release_pack is not supported by the current model/i);

    const persistedArtifact = await findArtifactRefByObjectKey(client, {
      tenantId,
      bucket: "keystone-artifacts-dev",
      objectKey,
      runId
    });

    expect(persistedArtifact).toBeUndefined();
  });

  it("rejects invalid compile provenance revisions", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`compile-provenance-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);
    const { runId: otherRunId } = await createRunFixture(project.projectId);
    const revisions = await createRunPlanningRevisionSet(project.projectId, runId);

    const noteDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        scopeType: "run",
        kind: "other",
        path: "notes/compile-issues"
      }),
      "Expected note document insert to return a row."
    );
    const otherRunDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId: project.projectId,
        runId: otherRunId,
        scopeType: "run",
        kind: "execution_plan",
        path: "execution-plan"
      }),
      "Expected other-run document insert to return a row."
    );

    const noteArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${runId}/compile-issues.md`,
        contentType: "text/markdown"
      }),
      "Expected note artifact insert to return a row."
    );
    const otherRunArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId: otherRunId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${otherRunId}/execution-plan.md`,
        contentType: "text/markdown"
      }),
      "Expected other-run artifact insert to return a row."
    );

    const noteRevision = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: noteDocument.documentId,
        artifactRefId: noteArtifact.artifactRefId,
        title: "Compile issues"
      }),
      "Expected note revision insert to return a row."
    );
    const otherRunRevision = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: otherRunDocument.documentId,
        artifactRefId: otherRunArtifact.artifactRefId,
        title: "Execution Plan v1"
      }),
      "Expected other-run revision insert to return a row."
    );

    await expect(
      createRunRecord(client, {
        tenantId,
        runId: `run-${crypto.randomUUID()}`,
        projectId: project.projectId,
        workflowInstanceId: `workflow-${crypto.randomUUID()}`,
        executionEngine: "think_live",
        status: "compiled",
        compiledSpecRevisionId: revisions.specificationRevisionId
      })
    ).rejects.toThrow(/requires specification, architecture, and execution-plan revision ids together/i);

    await expect(
      updateRunRecord(client, {
        tenantId,
        runId,
        compiledSpecRevisionId: revisions.specificationRevisionId,
        compiledArchitectureRevisionId: revisions.architectureRevisionId,
        compiledExecutionPlanRevisionId: noteRevision.documentRevisionId
      })
    ).rejects.toThrow(/must reference the run execution-plan planning document/i);

    await expect(
      updateRunRecord(client, {
        tenantId,
        runId,
        compiledSpecRevisionId: revisions.specificationRevisionId,
        compiledArchitectureRevisionId: revisions.architectureRevisionId,
        compiledExecutionPlanRevisionId: otherRunRevision.documentRevisionId
      })
    ).rejects.toThrow(new RegExp(`does not belong to run ${runId}`, "i"));
  });

  it("persists the compiled run graph transactionally and prunes stale tasks", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`persist-compiled-graph-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);

    const specificationDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        scopeType: "run",
        kind: "specification",
        path: "specification"
      }),
      "Expected specification document insert to return a row."
    );
    const architectureDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        scopeType: "run",
        kind: "architecture",
        path: "architecture"
      }),
      "Expected architecture document insert to return a row."
    );
    const executionPlanDocument = expectRow(
      await createDocument(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        scopeType: "run",
        kind: "execution_plan",
        path: "execution-plan"
      }),
      "Expected execution-plan document insert to return a row."
    );

    const specificationArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${runId}/${specificationDocument.documentId}/v1.md`,
        contentType: "text/markdown"
      }),
      "Expected specification artifact insert to return a row."
    );
    const architectureArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${runId}/${architectureDocument.documentId}/v1.md`,
        contentType: "text/markdown"
      }),
      "Expected architecture artifact insert to return a row."
    );
    const executionPlanArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        artifactKind: "document_revision",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `documents/run/${runId}/${executionPlanDocument.documentId}/v1.md`,
        contentType: "text/markdown"
      }),
      "Expected execution-plan artifact insert to return a row."
    );

    const specificationRevision = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: specificationDocument.documentId,
        artifactRefId: specificationArtifact.artifactRefId,
        title: "Run Specification v1"
      }),
      "Expected specification revision insert to return a row."
    );
    const architectureRevision = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: architectureDocument.documentId,
        artifactRefId: architectureArtifact.artifactRefId,
        title: "Run Architecture v1"
      }),
      "Expected architecture revision insert to return a row."
    );
    const executionPlanRevision = expectRow(
      await createDocumentRevision(client, {
        tenantId,
        documentId: executionPlanDocument.documentId,
        artifactRefId: executionPlanArtifact.artifactRefId,
        title: "Run Execution Plan v1"
      }),
      "Expected execution-plan revision insert to return a row."
    );

    const staleTask = expectRow(
      await createRunTask(client, {
        tenantId,
        runId,
        name: "Stale task",
        description: "Should be deleted by the compiled graph write.",
        status: "pending"
      }),
      "Expected stale run task insert to return a row."
    );
    const staleTaskArtifact = expectRow(
      await createArtifactRef(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        runTaskId: staleTask.runTaskId,
        artifactKind: "task_log",
        storageBackend: "r2",
        bucket: "keystone-artifacts-dev",
        objectKey: `tenants/${tenantId}/runs/${runId}/tasks/${staleTask.runTaskId}/logs/stale.jsonl`,
        contentType: "application/x-ndjson",
        etag: "stale-log-etag",
        sizeBytes: 64
      }),
      "Expected stale-task artifact insert to return a row."
    );

    const compiledAt = new Date("2026-04-19T12:00:00.000Z");
    const result = await persistCompiledRunGraph(client, {
      tenantId,
      runId,
      compiledSpecRevisionId: specificationRevision.documentRevisionId,
      compiledArchitectureRevisionId: architectureRevision.documentRevisionId,
      compiledExecutionPlanRevisionId: executionPlanRevision.documentRevisionId,
      compiledAt,
      tasks: [
        {
          taskId: "prepare-schema",
          name: "Prepare schema",
          description: "Create the target-model persistence tables."
        },
        {
          taskId: "wire-repositories",
          name: "Wire repositories",
          description: "Connect repositories to the new run graph.",
          dependsOn: ["prepare-schema"]
        }
      ]
    });

    const persistedRun = await getRunRecord(client, {
      tenantId,
      runId
    });
    const persistedTasks = await listRunTasks(client, {
      tenantId,
      runId
    });
    const persistedDependencies = await listRunTaskDependencies(client, {
      tenantId,
      runId
    });
    const staleTaskAfterPersist = await getRunTask(client, {
      tenantId,
      runId,
      runTaskId: staleTask.runTaskId
    });
    const staleTaskArtifactAfterPersist = await getArtifactRef(
      client,
      tenantId,
      staleTaskArtifact.artifactRefId
    );

    expect(result.run.compiledSpecRevisionId).toBe(specificationRevision.documentRevisionId);
    expect(result.run.compiledArchitectureRevisionId).toBe(architectureRevision.documentRevisionId);
    expect(result.run.compiledExecutionPlanRevisionId).toBe(executionPlanRevision.documentRevisionId);
    expect(result.run.compiledAt?.toISOString()).toBe(compiledAt.toISOString());
    expect(result.tasks.map((task) => task.taskId)).toEqual([
      "prepare-schema",
      "wire-repositories"
    ]);
    expect(result.tasks.map((task) => task.status)).toEqual(["ready", "pending"]);
    expect(result.dependencies).toEqual([
      expect.objectContaining({
        parentTaskId: "prepare-schema",
        childTaskId: "wire-repositories"
      })
    ]);
    expect(persistedRun?.compiledSpecRevisionId).toBe(specificationRevision.documentRevisionId);
    expect(persistedRun?.compiledArchitectureRevisionId).toBe(
      architectureRevision.documentRevisionId
    );
    expect(persistedRun?.compiledExecutionPlanRevisionId).toBe(
      executionPlanRevision.documentRevisionId
    );
    expect(persistedRun?.compiledAt?.toISOString()).toBe(compiledAt.toISOString());
    expect(persistedTasks.map((task) => task.name)).toEqual([
      "Prepare schema",
      "Wire repositories"
    ]);
    expect(persistedDependencies).toHaveLength(1);
    expect(staleTaskAfterPersist).toBeNull();
    expect(staleTaskArtifactAfterPersist?.runId).toBe(runId);
    expect(staleTaskArtifactAfterPersist?.runTaskId).toBeNull();
  });

  it("rejects invalid compiled run graph inputs before persistence", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`invalid-compiled-graph-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);
    const revisions = await createRunPlanningRevisionSet(project.projectId, runId);

    await expect(
      persistCompiledRunGraph(client, {
        tenantId,
        runId,
        compiledSpecRevisionId: revisions.specificationRevisionId,
        compiledArchitectureRevisionId: revisions.architectureRevisionId,
        compiledExecutionPlanRevisionId: revisions.executionPlanRevisionId,
        tasks: [
          {
            taskId: "duplicate-task",
            name: "One",
            description: "First duplicate."
          },
          {
            taskId: "duplicate-task",
            name: "Two",
            description: "Second duplicate."
          }
        ]
      })
    ).rejects.toThrow(/duplicate task id/i);

    await expect(
      persistCompiledRunGraph(client, {
        tenantId,
        runId,
        compiledSpecRevisionId: revisions.specificationRevisionId,
        compiledArchitectureRevisionId: revisions.architectureRevisionId,
        compiledExecutionPlanRevisionId: revisions.executionPlanRevisionId,
        tasks: [
          {
            taskId: "task-a",
            runTaskId: "11111111-1111-4111-8111-111111111111",
            name: "Task A",
            description: "First task."
          },
          {
            taskId: "task-b",
            runTaskId: "11111111-1111-4111-8111-111111111111",
            name: "Task B",
            description: "Second task."
          }
        ]
      })
    ).rejects.toThrow(/duplicate runTaskId/i);

    await expect(
      persistCompiledRunGraph(client, {
        tenantId,
        runId,
        compiledSpecRevisionId: revisions.specificationRevisionId,
        compiledArchitectureRevisionId: revisions.architectureRevisionId,
        compiledExecutionPlanRevisionId: revisions.executionPlanRevisionId,
        tasks: [
          {
            taskId: "task-a",
            name: "Task A",
            description: "First task.",
            dependsOn: ["missing-task"]
          }
        ]
      })
    ).rejects.toThrow(/unknown dependency missing-task/i);

    await expect(
      persistCompiledRunGraph(client, {
        tenantId,
        runId,
        compiledSpecRevisionId: revisions.specificationRevisionId,
        compiledArchitectureRevisionId: revisions.architectureRevisionId,
        compiledExecutionPlanRevisionId: revisions.executionPlanRevisionId,
        tasks: [
          {
            taskId: "task-a",
            name: "Task A",
            description: "First task.",
            dependsOn: ["task-b"]
          },
          {
            taskId: "task-b",
            name: "Task B",
            description: "Second task.",
            dependsOn: ["task-a"]
          }
        ]
      })
    ).rejects.toThrow(/must be acyclic/i);
  });

  it("recompiling existing run tasks resets their state and replaces dependencies", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`recompile-run-graph-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);
    const revisions = await createRunPlanningRevisionSet(project.projectId, runId);

    const initialGraph = await persistCompiledRunGraph(client, {
      tenantId,
      runId,
      compiledSpecRevisionId: revisions.specificationRevisionId,
      compiledArchitectureRevisionId: revisions.architectureRevisionId,
      compiledExecutionPlanRevisionId: revisions.executionPlanRevisionId,
      tasks: [
        {
          taskId: "prepare-schema",
          name: "Prepare schema",
          description: "Create the target-model persistence tables."
        },
        {
          taskId: "wire-repositories",
          name: "Wire repositories",
          description: "Connect repositories to the new run graph.",
          dependsOn: ["prepare-schema"]
        }
      ]
    });

    const wireRepositories = initialGraph.tasks.find((task) => task.taskId === "wire-repositories");

    if (!wireRepositories) {
      throw new Error("Expected wire-repositories task in the initial graph.");
    }

    await updateRunTask(client, {
      tenantId,
      runId,
      runTaskId: wireRepositories.runTaskId,
      status: "active",
      startedAt: new Date("2026-04-19T14:00:00.000Z"),
      endedAt: new Date("2026-04-19T14:05:00.000Z")
    });

    const recompilation = await persistCompiledRunGraph(client, {
      tenantId,
      runId,
      compiledSpecRevisionId: revisions.specificationRevisionId,
      compiledArchitectureRevisionId: revisions.architectureRevisionId,
      compiledExecutionPlanRevisionId: revisions.executionPlanRevisionId,
      tasks: [
        {
          taskId: "wire-repositories",
          runTaskId: wireRepositories.runTaskId,
          name: "Wire repositories",
          description: "Reconnect repositories after the graph rewrite."
        }
      ]
    });

    const persistedTasks = await listRunTasks(client, {
      tenantId,
      runId
    });
    const persistedDependencies = await listRunTaskDependencies(client, {
      tenantId,
      runId
    });

    expect(recompilation.tasks).toEqual([
      expect.objectContaining({
        taskId: "wire-repositories",
        runTaskId: wireRepositories.runTaskId,
        status: "ready",
        startedAt: null,
        endedAt: null
      })
    ]);
    expect(persistedTasks).toEqual([
      expect.objectContaining({
        runTaskId: wireRepositories.runTaskId,
        status: "ready",
        startedAt: null,
        endedAt: null,
        description: "Reconnect repositories after the graph rewrite."
      })
    ]);
    expect(persistedDependencies).toEqual([]);
  });

  it("allows dependency-failure cancellation only from pending when guarded by status", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`run-task-guard-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);

    const pendingTask = expectRow(
      await createRunTask(client, {
        tenantId,
        runId,
        name: "Pending dependent",
        description: "Should cancel when the dependency guard still sees pending.",
        status: "pending"
      }),
      "Expected pending run task insert to return a row."
    );
    const activeTask = expectRow(
      await createRunTask(client, {
        tenantId,
        runId,
        name: "Already active dependent",
        description: "Should ignore a pending-only cancellation guard once execution has started.",
        status: "active",
        startedAt: new Date("2026-04-19T15:00:00.000Z")
      }),
      "Expected active run task insert to return a row."
    );
    const cancelledPendingTask = expectRow(
      await updateRunTask(client, {
        tenantId,
        runId,
        runTaskId: pendingTask.runTaskId,
        status: "cancelled",
        ifStatusIn: ["pending"],
        endedAt: new Date("2026-04-19T15:05:00.000Z")
      }),
      "Expected guarded pending cancellation to return a row."
    );
    const guardedActiveTask = expectRow(
      await updateRunTask(client, {
        tenantId,
        runId,
        runTaskId: activeTask.runTaskId,
        status: "cancelled",
        ifStatusIn: ["pending"],
        endedAt: new Date("2026-04-19T15:10:00.000Z")
      }),
      "Expected guarded active cancellation attempt to return the current row."
    );
    const refreshedTasks = await listRunTasks(client, {
      tenantId,
      runId
    });

    expect(cancelledPendingTask.status).toBe("cancelled");
    expect(cancelledPendingTask.endedAt?.toISOString()).toBe("2026-04-19T15:05:00.000Z");
    expect(guardedActiveTask.status).toBe("active");
    expect(guardedActiveTask.startedAt?.toISOString()).toBe("2026-04-19T15:00:00.000Z");
    expect(guardedActiveTask.endedAt).toBeNull();
    expect(refreshedTasks).toEqual([
      expect.objectContaining({
        runTaskId: pendingTask.runTaskId,
        status: "cancelled",
        endedAt: expect.any(Date)
      }),
      expect.objectContaining({
        runTaskId: activeTask.runTaskId,
        status: "active",
        endedAt: null
      })
    ]);
  });

  it("allows readiness promotion only from pending when guarded by status", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`run-task-ready-guard-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);

    const pendingTask = expectRow(
      await createRunTask(client, {
        tenantId,
        runId,
        name: "Pending dependent",
        description: "Should promote when the pending-only readiness guard still matches.",
        status: "pending"
      }),
      "Expected pending run task insert to return a row."
    );
    const activeTask = expectRow(
      await createRunTask(client, {
        tenantId,
        runId,
        name: "Already active dependent",
        description: "Should ignore a pending-only readiness guard once execution has started.",
        status: "active",
        startedAt: new Date("2026-04-19T14:55:00.000Z")
      }),
      "Expected active run task insert to return a row."
    );
    const promotedPendingTask = expectRow(
      await updateRunTask(client, {
        tenantId,
        runId,
        runTaskId: pendingTask.runTaskId,
        status: "ready",
        ifStatusIn: ["pending"]
      }),
      "Expected guarded pending promotion to return a row."
    );
    const guardedActiveTask = expectRow(
      await updateRunTask(client, {
        tenantId,
        runId,
        runTaskId: activeTask.runTaskId,
        status: "ready",
        ifStatusIn: ["pending"]
      }),
      "Expected guarded active promotion attempt to return the current row."
    );
    const refreshedTasks = await listRunTasks(client, {
      tenantId,
      runId
    });

    expect(promotedPendingTask.status).toBe("ready");
    expect(promotedPendingTask.startedAt).toBeNull();
    expect(promotedPendingTask.endedAt).toBeNull();
    expect(guardedActiveTask.status).toBe("active");
    expect(guardedActiveTask.startedAt?.toISOString()).toBe("2026-04-19T14:55:00.000Z");
    expect(guardedActiveTask.endedAt).toBeNull();
    expect(refreshedTasks).toEqual([
      expect.objectContaining({
        runTaskId: pendingTask.runTaskId,
        status: "ready",
        startedAt: null,
        endedAt: null
      }),
      expect.objectContaining({
        runTaskId: activeTask.runTaskId,
        status: "active",
        startedAt: expect.any(Date),
        endedAt: null
      })
    ]);
  });

  it("enforces canonical document kind and path combinations", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`document-canonical-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);

    await expect(
      createDocument(client, {
        tenantId,
        projectId: project.projectId,
        scopeType: "project",
        kind: "specification",
        path: "notes/specification"
      })
    ).rejects.toThrow(/must use the canonical path product\/specification/i);

    await expect(
      createDocument(client, {
        tenantId,
        projectId: project.projectId,
        runId,
        scopeType: "run",
        kind: "execution_plan",
        path: "notes/execution-plan"
      })
    ).rejects.toThrow(/must use the canonical path execution-plan/i);

    await expect(
      createDocument(client, {
        tenantId,
        projectId: project.projectId,
        scopeType: "project",
        kind: "other",
        path: "product/specification"
      })
    ).rejects.toThrow(/cannot use reserved planning path product\/specification/i);
  });

  it("rejects self-dependencies in the run graph", async () => {
    const project = await createProject(client, {
      tenantId,
      config: buildProjectConfig(`run-self-dependency-${crypto.randomUUID()}`)
    });
    const { runId } = await createRunFixture(project.projectId);
    const task = expectRow(
      await createRunTask(client, {
        tenantId,
        runId,
        name: "Single task",
        description: "Should not depend on itself.",
        status: "pending"
      }),
      "Expected run task insert to return a row."
    );

    await expect(
      createRunTaskDependency(client, {
        tenantId,
        runId,
        parentRunTaskId: task.runTaskId,
        childRunTaskId: task.runTaskId
      })
    ).rejects.toThrow(/cannot reference the same task/i);

    await expect(
      client.sql`
        INSERT INTO run_task_dependencies (
          run_task_dependency_id,
          run_id,
          parent_run_task_id,
          child_run_task_id
        )
        VALUES (
          ${crypto.randomUUID()},
          ${runId},
          ${task.runTaskId},
          ${task.runTaskId}
        )
      `
    ).rejects.toThrow();
  });
});
