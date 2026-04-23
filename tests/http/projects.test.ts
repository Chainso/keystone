import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DatabaseClient } from "../../src/lib/db/client";
import { createDocumentRepositoryClient } from "./document-db-fixture";

const projectDocumentFixture = {
  tenantId: "tenant-read",
  projectId: "project-123",
  documentId: "doc-project-spec",
  runId: null,
  scopeType: "project" as const,
  kind: "specification" as const,
  path: "product/specification",
  currentRevisionId: "revision-project-spec-v1",
  conversationAgentClass: "PlanningDocumentAgent",
  conversationAgentName: "project-specification",
  createdAt: new Date("2026-04-17T10:45:00.000Z"),
  updatedAt: new Date("2026-04-17T11:15:00.000Z")
};

const projectDocumentRevisionFixture = {
  documentRevisionId: "revision-project-spec-v1",
  documentId: "doc-project-spec",
  artifactRefId: "artifact-project-spec-v1",
  revisionNumber: 1,
  title: "Project Specification v1",
  createdAt: new Date("2026-04-17T11:15:00.000Z")
};

const projectDocumentRepositoryFixture = {
  projects: [
    {
      tenantId: "tenant-read",
      projectId: "project-123"
    }
  ],
  runs: [],
  documents: [projectDocumentFixture],
  documentRevisions: [projectDocumentRevisionFixture]
};

const RUN_TASK_PREPARE_ID = "11111111-1111-4111-8111-111111111111";
const RUN_TASK_IMPLEMENTATION_ID = "22222222-2222-4222-8222-222222222222";
const RUN_TASK_REVIEW_ID = "33333333-3333-4333-8333-333333333333";
const RUN_TASK_ARCHIVE_ID = "44444444-4444-4444-8444-444444444444";
const RUN_TASK_PENDING_ID = "55555555-5555-4555-8555-555555555555";

const projectRunTaskFixture = {
  runTaskId: RUN_TASK_IMPLEMENTATION_ID,
  runId: "run-123",
  name: "Implement execution plan",
  description: "Apply the approved change in a reviewable way.",
  status: "active",
  conversationAgentClass: "KeystoneThinkAgent",
  conversationAgentName: `tenant:tenant-read:run:run-123:task:${RUN_TASK_IMPLEMENTATION_ID}`,
  startedAt: new Date("2026-04-17T10:45:00.000Z"),
  endedAt: null,
  createdAt: new Date("2026-04-17T10:40:00.000Z"),
  updatedAt: new Date("2026-04-17T10:45:00.000Z")
};

const projectQueuedTaskFixture = {
  runTaskId: RUN_TASK_PREPARE_ID,
  runId: "run-123",
  name: "Prepare implementation context",
  description: "Review the planning inputs before starting implementation.",
  status: "ready",
  conversationAgentClass: null,
  conversationAgentName: null,
  startedAt: null,
  endedAt: null,
  createdAt: new Date("2026-04-17T10:35:00.000Z"),
  updatedAt: new Date("2026-04-17T10:36:00.000Z")
};

const projectBlockedTaskFixture = {
  runTaskId: RUN_TASK_REVIEW_ID,
  runId: "run-456",
  name: "Blocked task visibility",
  description: "Confirm blocked work remains visible in the project list.",
  status: "blocked",
  conversationAgentClass: null,
  conversationAgentName: null,
  startedAt: null,
  endedAt: null,
  createdAt: new Date("2026-04-17T11:30:00.000Z"),
  updatedAt: new Date("2026-04-17T12:05:00.000Z")
};

const projectCompletedTaskFixture = {
  runTaskId: RUN_TASK_ARCHIVE_ID,
  runId: "run-456",
  name: "Archive completed summary",
  description: "Finalize the already completed run summary artifact.",
  status: "completed",
  conversationAgentClass: null,
  conversationAgentName: null,
  startedAt: new Date("2026-04-17T11:40:00.000Z"),
  endedAt: new Date("2026-04-17T11:50:00.000Z"),
  createdAt: new Date("2026-04-17T11:35:00.000Z"),
  updatedAt: new Date("2026-04-17T11:50:00.000Z")
};

const projectTaskFixtures = [
  projectQueuedTaskFixture,
  projectRunTaskFixture,
  projectBlockedTaskFixture,
  projectCompletedTaskFixture
];

const projectTaskDependencyFixtures = [
  {
    runTaskDependencyId: "run-task-dependency-prepare",
    runId: "run-123",
    parentRunTaskId: RUN_TASK_PREPARE_ID,
    childRunTaskId: RUN_TASK_IMPLEMENTATION_ID,
    createdAt: new Date("2026-04-17T10:37:00.000Z")
  },
  {
    runTaskDependencyId: "run-task-dependency-archive",
    runId: "run-456",
    parentRunTaskId: RUN_TASK_ARCHIVE_ID,
    childRunTaskId: RUN_TASK_REVIEW_ID,
    createdAt: new Date("2026-04-17T11:45:00.000Z")
  }
];

const compiledRunPlansByRunId = {
  "run-123": {
    summary: "Fixture compiled plan for run 123.",
    sourceRevisionIds: {
      specification: "revision-project-spec-v1",
      architecture: "revision-project-arch-v1",
      executionPlan: "revision-project-plan-v1"
    },
    tasks: [
      {
        taskId: "TASK-001",
        runTaskId: RUN_TASK_PREPARE_ID,
        title: "Prepare implementation context",
        summary: "Review planning inputs before execution.",
        instructions: ["Read the planning documents."],
        acceptanceCriteria: ["Context is ready for implementation."],
        dependsOn: []
      },
      {
        taskId: "TASK-002",
        runTaskId: RUN_TASK_IMPLEMENTATION_ID,
        title: "Implement execution plan",
        summary: "Apply the approved change in a reviewable way.",
        instructions: ["Implement the requested change."],
        acceptanceCriteria: ["The requested change is implemented."],
        dependsOn: ["TASK-001"]
      }
    ]
  },
  "run-456": {
    summary: "Fixture compiled plan for run 456.",
    sourceRevisionIds: {
      specification: "revision-project-spec-v2",
      architecture: "revision-project-arch-v2",
      executionPlan: "revision-project-plan-v2"
    },
    tasks: [
      {
        taskId: "TASK-019",
        runTaskId: RUN_TASK_REVIEW_ID,
        title: "Blocked task visibility",
        summary: "Confirm blocked work remains visible in Workstreams.",
        instructions: ["Inspect the blocked task state."],
        acceptanceCriteria: ["Blocked work is visible."],
        dependsOn: ["TASK-021"]
      },
      {
        taskId: "TASK-021",
        runTaskId: RUN_TASK_ARCHIVE_ID,
        title: "Archive completed summary",
        summary: "Finalize the completed run summary.",
        instructions: ["Archive the final summary."],
        acceptanceCriteria: ["The run summary is archived."],
        dependsOn: []
      }
    ]
  }
} as const;

type RepositoryFixtureRow = Record<string, unknown>;

interface ProjectTaskRepositoryFixture {
  projects: RepositoryFixtureRow[];
  runs: RepositoryFixtureRow[];
  runTasks: RepositoryFixtureRow[];
  runTaskDependencies: RepositoryFixtureRow[];
}

function columnNameToPropertyName(columnName: string) {
  return columnName.replace(/_([a-z])/g, (_match, character: string) => character.toUpperCase());
}

function extractWhereFilters(
  expression: unknown,
  filters = {
    equals: new Map<string, unknown>(),
    includes: new Map<string, unknown[]>()
  }
) {
  if (!expression || typeof expression !== "object") {
    return filters;
  }

  if (!("queryChunks" in expression) || !Array.isArray(expression.queryChunks)) {
    return filters;
  }

  const queryChunks = expression.queryChunks as unknown[];

  for (let index = 0; index < queryChunks.length - 2; index += 1) {
    const column = queryChunks[index];
    const operator = queryChunks[index + 1];
    const param = queryChunks[index + 2];

    if (
      column &&
      typeof column === "object" &&
      "name" in column &&
      typeof column.name === "string" &&
      operator &&
      typeof operator === "object" &&
      "value" in operator &&
      Array.isArray(operator.value)
    ) {
      if (
        operator.value[0] === " = " &&
        param &&
        typeof param === "object" &&
        "value" in param
      ) {
        filters.equals.set(column.name, param.value);
      }

      if (operator.value[0] === " in " && Array.isArray(param)) {
        filters.includes.set(
          column.name,
          param
            .filter(
              (entry): entry is {
                value: unknown;
              } => typeof entry === "object" && entry !== null && "value" in entry
            )
            .map((entry) => entry.value)
        );
      }
    }
  }

  for (const chunk of queryChunks) {
    extractWhereFilters(chunk, filters);
  }

  return filters;
}

function matchesWhere(row: RepositoryFixtureRow, where: unknown) {
  const filters = extractWhereFilters(where);

  for (const [columnName, expectedValue] of filters.equals) {
    const propertyName = columnNameToPropertyName(columnName);

    if (row[propertyName] !== expectedValue) {
      return false;
    }
  }

  for (const [columnName, expectedValues] of filters.includes) {
    const propertyName = columnNameToPropertyName(columnName);

    if (!expectedValues.includes(row[propertyName])) {
      return false;
    }
  }

  return true;
}

function extractOrderColumns(orderBy: unknown[] = []) {
  return orderBy.flatMap((expression) => {
    if (!expression || typeof expression !== "object") {
      return [];
    }

    if (!("queryChunks" in expression) || !Array.isArray(expression.queryChunks)) {
      return [];
    }

    return expression.queryChunks.flatMap((chunk) => {
      if (chunk && typeof chunk === "object" && "name" in chunk && typeof chunk.name === "string") {
        return [columnNameToPropertyName(chunk.name)];
      }

      return [];
    });
  });
}

function compareSortValues(left: unknown, right: unknown) {
  const leftValue = left instanceof Date ? left.getTime() : left;
  const rightValue = right instanceof Date ? right.getTime() : right;
  const comparableLeft =
    typeof leftValue === "number" || typeof leftValue === "string"
      ? leftValue
      : typeof leftValue === "boolean"
        ? Number(leftValue)
        : String(leftValue);
  const comparableRight =
    typeof rightValue === "number" || typeof rightValue === "string"
      ? rightValue
      : typeof rightValue === "boolean"
        ? Number(rightValue)
        : String(rightValue);

  if (comparableLeft === comparableRight) {
    return 0;
  }

  return comparableLeft < comparableRight ? -1 : 1;
}

function sortRows(rows: RepositoryFixtureRow[], orderBy: unknown[] = []) {
  const orderColumns = extractOrderColumns(orderBy);

  return [...rows].sort((left, right) => {
    for (const column of orderColumns) {
      const comparison = compareSortValues(left[column], right[column]);

      if (comparison !== 0) {
        return comparison;
      }
    }

    return 0;
  });
}

function createProjectTaskRepositoryClient(
  fixture: ProjectTaskRepositoryFixture
): DatabaseClient {
  const buildJoinedTaskRows = () =>
    fixture.runTasks.flatMap((task) => {
      const run = fixture.runs.find((candidate) => candidate.runId === task.runId);

      return run ? [{ ...run, ...task }] : [];
    });

  return {
    connectionString: "postgres://test",
    sql: {} as DatabaseClient["sql"],
    db: ({
      query: {
        projects: {
          findFirst: async ({ where }: { where?: unknown } = {}) =>
            fixture.projects.find((row) => matchesWhere(row, where))
        },
        runTaskDependencies: {
          findMany: async ({
            where,
            orderBy
          }: {
            where?: unknown;
            orderBy?: unknown[];
          } = {}) =>
            sortRows(
              fixture.runTaskDependencies.filter((row) => matchesWhere(row, where)),
              orderBy
            )
        }
      },
      select: (selection: Record<string, unknown>) => ({
        from: () => ({
          innerJoin: () => {
            const joinedTaskRows = buildJoinedTaskRows();

            if ("total" in selection) {
              return {
                where: async (where: unknown) => [
                  {
                    total: joinedTaskRows.filter((row) => matchesWhere(row, where)).length
                  }
                ]
              };
            }

            const state: {
              where?: unknown;
              orderBy: unknown[];
              limit?: number;
            } = {
              orderBy: []
            };

            const builder = {
              where(where: unknown) {
                state.where = where;
                return builder;
              },
              orderBy(...orderBy: unknown[]) {
                state.orderBy = orderBy;
                return builder;
              },
              limit(limit: number) {
                state.limit = limit;
                return builder;
              },
              async offset(offset: number) {
                let rows = joinedTaskRows.filter((row) => matchesWhere(row, state.where));

                rows = sortRows(rows, state.orderBy);
                rows = rows.slice(offset);

                if (state.limit !== undefined) {
                  rows = rows.slice(0, state.limit);
                }

                return rows.map((task) => ({ task }));
              }
            };

            return builder;
          }
        })
      })
    }) as unknown as DatabaseClient["db"],
    close: async () => undefined
  };
}

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);

  return {
    close,
    bucketGet: vi.fn(async () => null),
    bucketDelete: vi.fn(async () => undefined),
    bucketPut: vi.fn(async () => ({
      httpEtag: "etag-project-spec-v2",
      size: 27
    })),
    createWorkerDatabaseClient: vi.fn(() =>
      createDocumentRepositoryClient(projectDocumentRepositoryFixture, close)
    ),
    deleteArtifactRef: vi.fn(async () => null),
    getArtifactText: vi.fn(
      async (_bucket: R2Bucket, _key: string): Promise<string | null> => null
    ),
    routeAgentRequest: vi.fn(async (): Promise<Response | null> => null),
    createArtifactRef: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      artifactRefId: "artifact-project-spec-v2",
      projectId: input.projectId ?? null,
      runId: input.runId ?? `project:${input.projectId}`,
      runTaskId: null,
      artifactKind: input.artifactKind,
      storageBackend: input.storageBackend,
      bucket: input.bucket ?? "keystone-artifacts-dev",
      objectKey: input.objectKey ?? "documents/project/project-123/doc-project-spec/revision-project-spec-v2",
      objectVersion: null,
      etag: input.etag ?? null,
      contentType: input.contentType,
      sha256: null,
      sizeBytes: input.sizeBytes ?? null,
      createdAt: new Date("2026-04-17T11:45:00.000Z")
    })),
    createProject: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      projectId: "project-created",
      projectKey: input.config.projectKey,
      displayName: input.config.displayName,
      description: input.config.description,
      ruleSet: input.config.ruleSet,
      components: input.config.components,
      envVars: input.config.envVars,
      createdAt: new Date("2026-04-17T10:00:00.000Z"),
      updatedAt: new Date("2026-04-17T10:00:00.000Z")
    })),
    getProject: vi.fn(async (_client, input) => {
      if (input.projectId !== "project-123") {
        return undefined;
      }

      return {
        tenantId: input.tenantId,
        projectId: "project-123",
        projectKey: "fixture-demo-project",
        displayName: "Fixture Demo Project",
        description: "Fixture project for tests.",
        ruleSet: {
          reviewInstructions: ["Review the result."],
          testInstructions: ["Run tests."]
        },
        components: [
          {
            componentKey: "demo-target",
            displayName: "Demo Target",
            kind: "git_repository" as const,
            config: {
              localPath: "./fixtures/demo-target",
              ref: "main"
            }
          }
        ],
        envVars: [
          {
            name: "KEYSTONE_FIXTURE_PROJECT",
            value: "1"
          }
        ],
        createdAt: new Date("2026-04-17T10:00:00.000Z"),
        updatedAt: new Date("2026-04-17T11:00:00.000Z")
      };
    }),
    getProjectByKey: vi.fn(async (_client, input) => {
      if (input.projectKey !== "fixture-demo-project") {
        return undefined;
      }

      return {
        tenantId: input.tenantId,
        projectId: "project-123",
        projectKey: "fixture-demo-project",
        displayName: "Fixture Demo Project",
        description: "Fixture project for tests.",
        ruleSet: {
          reviewInstructions: ["Review the result."],
          testInstructions: ["Run tests."]
        },
        components: [
          {
            componentKey: "demo-target",
            displayName: "Demo Target",
            kind: "git_repository" as const,
            config: {
              localPath: "./fixtures/demo-target",
              ref: "main"
            }
          }
        ],
        envVars: [],
        createdAt: new Date("2026-04-17T10:00:00.000Z"),
        updatedAt: new Date("2026-04-17T11:00:00.000Z")
      };
    }),
    listProjects: vi.fn(async (_client, input) => [
      {
        tenantId: input.tenantId,
        projectId: "project-123",
        projectKey: "fixture-demo-project",
        displayName: "Fixture Demo Project",
        description: "Fixture project for tests.",
        createdAt: new Date("2026-04-17T10:00:00.000Z"),
        updatedAt: new Date("2026-04-17T11:00:00.000Z")
      },
      {
        tenantId: input.tenantId,
        projectId: "project-456",
        projectKey: "secondary-project",
        displayName: "Secondary Project",
        description: null,
        createdAt: new Date("2026-04-17T09:00:00.000Z"),
        updatedAt: new Date("2026-04-17T09:30:00.000Z")
      }
    ]),
    listProjectRuns: vi.fn(async (_client, input) => [
      {
        tenantId: input.tenantId,
        runId: "run-123",
        projectId: input.projectId,
        workflowInstanceId: "workflow-run-123",
        executionEngine: "think_mock",
        sandboxId: null,
        status: "archived",
        compiledSpecRevisionId: null,
        compiledArchitectureRevisionId: null,
        compiledExecutionPlanRevisionId: null,
        compiledAt: null,
        startedAt: new Date("2026-04-17T10:35:00.000Z"),
        endedAt: new Date("2026-04-17T11:30:00.000Z"),
        createdAt: new Date("2026-04-17T10:30:00.000Z"),
        updatedAt: new Date("2026-04-17T11:30:00.000Z")
      }
    ]),
    listProjectTasks: vi.fn(async (_client, input) => {
      const filteredTasks = projectTaskFixtures.filter((task) => {
        switch (input.filter) {
          case "active":
            return (
              task.status === "active" ||
              task.status === "ready" ||
              task.status === "pending" ||
              task.status === "blocked"
            );
          case "running":
            return task.status === "active";
          case "queued":
            return task.status === "ready" || task.status === "pending";
          case "blocked":
            return task.status === "blocked";
          case "all":
          default:
            return true;
        }
      });
      const start = (input.page - 1) * input.pageSize;
      const items = filteredTasks.slice(start, start + input.pageSize);

      return {
        items,
        dependencies: projectTaskDependencyFixtures.filter((dependency) =>
          items.some((task) => task.runTaskId === dependency.childRunTaskId)
        ),
        total: filteredTasks.length,
        page: input.page,
        pageSize: input.pageSize
      };
    }),
    listRunTasks: vi.fn(async () => [projectRunTaskFixture]),
    listRunTaskDependencies: vi.fn(async () => []),
    listRunArtifacts: vi.fn(async () => []),
    createDocument: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      projectId: input.projectId,
      documentId: "doc-project-architecture",
      runId: input.runId ?? null,
      scopeType: input.scopeType,
      kind: input.kind,
      path: input.path,
      currentRevisionId: null,
      conversationAgentClass: input.conversationAgentClass ?? null,
      conversationAgentName: input.conversationAgentName ?? null,
      createdAt: new Date("2026-04-17T11:30:00.000Z"),
      updatedAt: new Date("2026-04-17T11:30:00.000Z")
    })),
    createDocumentRevision: vi.fn(async (_client, input) => ({
      documentRevisionId: input.documentRevisionId ?? "revision-project-spec-v2",
      documentId: input.documentId,
      artifactRefId: input.artifactRefId,
      revisionNumber: 2,
      title: input.title,
      createdAt: new Date("2026-04-17T11:45:00.000Z")
    })),
    getRunRecord: vi.fn(async () => ({
      tenantId: "tenant-read",
      runId: "run-123",
      projectId: "project-123",
      workflowInstanceId: "workflow-run-123",
      executionEngine: "think_mock",
      sandboxId: null,
      status: "configured",
      compiledSpecRevisionId: null,
      compiledArchitectureRevisionId: null,
      compiledExecutionPlanRevisionId: null,
      compiledAt: null,
      startedAt: null,
      endedAt: null,
      createdAt: new Date("2026-04-17T10:30:00.000Z"),
      updatedAt: new Date("2026-04-17T10:30:00.000Z")
    })),
    updateProject: vi.fn(async (_client, input) => ({
      tenantId: input.tenantId,
      projectId: input.projectId,
      projectKey: input.config.projectKey,
      displayName: input.config.displayName,
      description: input.config.description,
      ruleSet: input.config.ruleSet,
      components: input.config.components,
      envVars: input.config.envVars,
      createdAt: new Date("2026-04-17T10:00:00.000Z"),
      updatedAt: new Date("2026-04-17T12:00:00.000Z")
    }))
  };
});

vi.mock("../../src/lib/db/client", () => ({
  createWorkerDatabaseClient: mocked.createWorkerDatabaseClient
}));

vi.mock("../../src/lib/db/projects", () => ({
  createProject: mocked.createProject,
  getProject: mocked.getProject,
  getProjectByKey: mocked.getProjectByKey,
  listProjects: mocked.listProjects,
  updateProject: mocked.updateProject
}));

vi.mock("../../src/lib/db/runs", () => ({
  getRunRecord: mocked.getRunRecord,
  listProjectRuns: mocked.listProjectRuns,
  listProjectTasks: mocked.listProjectTasks,
  listRunTaskDependencies: mocked.listRunTaskDependencies,
  listRunTasks: mocked.listRunTasks
}));

vi.mock("../../src/lib/db/artifacts", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/db/artifacts")>(
    "../../src/lib/db/artifacts"
  );

  return {
    ...actual,
    createArtifactRef: mocked.createArtifactRef,
    deleteArtifactRef: mocked.deleteArtifactRef,
    listRunArtifacts: mocked.listRunArtifacts
  };
});

vi.mock("../../src/lib/db/documents", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/db/documents")>(
    "../../src/lib/db/documents"
  );

  return {
    ...actual,
    createDocument: mocked.createDocument,
    createDocumentRevision: mocked.createDocumentRevision,
    getProjectDocument: vi.fn(actual.getProjectDocument),
    getRunDocument: vi.fn(actual.getRunDocument),
    getDocumentWithCurrentRevision: vi.fn(actual.getDocumentWithCurrentRevision),
    listProjectDocumentsWithCurrentRevision: vi.fn(actual.listProjectDocumentsWithCurrentRevision),
    listRunDocumentsWithCurrentRevision: vi.fn(actual.listRunDocumentsWithCurrentRevision)
  };
});

vi.mock("../../src/lib/artifacts/r2", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/artifacts/r2")>(
    "../../src/lib/artifacts/r2"
  );

  return {
    ...actual,
    getArtifactText: mocked.getArtifactText
  };
});

vi.mock("../../src/http/handlers/dev-compile", () => ({
  runCompileSmokeHandler: vi.fn()
}));

vi.mock("../../src/http/handlers/dev-smoke", () => ({
  runSandboxSmokeHandler: vi.fn()
}));

vi.mock("../../src/http/handlers/dev-think", () => ({
  runThinkSmokeHandler: vi.fn()
}));

vi.mock("agents", () => ({
  routeAgentRequest: mocked.routeAgentRequest
}));

const documentsDb = await import("../../src/lib/db/documents");
const actualRunRepositories = await vi.importActual<typeof import("../../src/lib/db/runs")>(
  "../../src/lib/db/runs"
);
const { app } = await import("../../src/http/app");

const env = {
  ARTIFACTS_BUCKET: {
    get: mocked.bucketGet,
    delete: mocked.bucketDelete,
    put: mocked.bucketPut
  } as unknown as R2Bucket,
  HYPERDRIVE: {
    connectionString: "postgres://test"
  },
  KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
  KEYSTONE_DEV_TOKEN: "secret-dev-token"
} as const;

function buildProjectPayload() {
  return {
    projectKey: "fixture-demo-project",
    displayName: "Fixture Demo Project",
    description: "Fixture project for tests.",
    ruleSet: {
      reviewInstructions: ["Review the result.", "Check cross-component changes."],
      testInstructions: ["Run tests.", "Record fixture output."]
    },
    components: [
      {
        componentKey: "demo-target",
        displayName: "Demo Target",
        kind: "git_repository" as const,
        config: {
          localPath: "./fixtures/demo-target",
          ref: "main"
        },
        ruleOverride: {
          reviewInstructions: ["Focus on app code paths."],
          testInstructions: ["Run demo-target tests first."]
        }
      },
      {
        componentKey: "demo-support",
        displayName: "Demo Support",
        kind: "git_repository" as const,
        config: {
          gitUrl: "https://example.com/demo-support.git",
          ref: "develop"
        }
      }
    ],
    envVars: [
      {
        name: "KEYSTONE_FIXTURE_PROJECT",
        value: "1"
      },
      {
        name: "LOG_LEVEL",
        value: "debug"
      }
    ]
  };
}

describe("project API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.createWorkerDatabaseClient.mockImplementation(() =>
      createDocumentRepositoryClient(projectDocumentRepositoryFixture, mocked.close)
    );
    mocked.getArtifactText.mockImplementation(async (_bucket: R2Bucket, key: string) => {
      const runId = Object.keys(compiledRunPlansByRunId).find((candidate) => key.includes(candidate));

      return runId ? JSON.stringify(compiledRunPlansByRunId[runId as keyof typeof compiledRunPlansByRunId]) : null;
    });
    mocked.listRunTasks.mockResolvedValue([projectRunTaskFixture] as never);
    mocked.listRunTaskDependencies.mockResolvedValue([] as never);
    mocked.listRunArtifacts.mockResolvedValue([] as never);
  });

  it("lists tenant-scoped projects", async () => {
    const response = await app.request(
      "http://example.com/v1/projects",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-fixture"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        total: 2,
        items: [
          {
            projectId: "project-123",
            projectKey: "fixture-demo-project"
          },
          {
            projectId: "project-456",
            projectKey: "secondary-project"
          }
        ]
      },
      meta: {
        apiVersion: "v1",
        envelope: "collection",
        resourceType: "project"
      }
    });
    expect(mocked.listProjects).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-fixture"
      })
    );
  });

  it("filters projects by projectKey", async () => {
    const response = await app.request(
      "http://example.com/v1/projects?projectKey=fixture-demo-project",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-filtered"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        total: 1,
        items: [
          {
            projectId: "project-123",
            projectKey: "fixture-demo-project"
          }
        ]
      },
      meta: {
        apiVersion: "v1",
        envelope: "collection",
        resourceType: "project"
      }
    });
    expect(mocked.getProjectByKey).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-filtered",
        projectKey: "fixture-demo-project"
      })
    );
    expect(mocked.listProjects).not.toHaveBeenCalled();
  });

  it("creates a validated tenant-scoped project", async () => {
    const payload = buildProjectPayload();
    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify(payload)
      },
      env
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        projectId: "project-created",
        projectKey: "fixture-demo-project",
        ruleSet: payload.ruleSet,
        components: expect.arrayContaining([
          expect.objectContaining({
            componentKey: "demo-target",
            ruleOverride: payload.components[0]?.ruleOverride
          }),
          expect.objectContaining({
            componentKey: "demo-support",
            config: payload.components[1]?.config
          })
        ]),
        envVars: payload.envVars
      },
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "project"
      }
    });
    expect(mocked.createProject).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-create",
        config: payload
      })
    );
  });

  it("returns validation failures as 400 responses", async () => {
    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify({
          projectKey: "",
          displayName: "Broken Project",
          components: []
        })
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "Project request validation failed."
      }
    });
    expect(mocked.createProject).not.toHaveBeenCalled();
  });

  it("rejects duplicate component keys at the request-contract layer", async () => {
    const payload = buildProjectPayload();
    const duplicateComponent = payload.components[1]!;
    payload.components[1] = {
      ...duplicateComponent,
      componentKey: "demo-target"
    };

    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify(payload)
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "Project request validation failed.",
        details: {
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ["components", 1, "componentKey"]
            })
          ])
        }
      }
    });
    expect(mocked.createProject).not.toHaveBeenCalled();
  });

  it("rejects duplicate env var names at the request-contract layer", async () => {
    const payload = buildProjectPayload();
    mocked.createProject.mockRejectedValueOnce({
      code: "23505"
    });

    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify(payload)
      },
      env
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "project_key_conflict",
        message: "Project key fixture-demo-project already exists for tenant tenant-create."
      }
    });
    expect(mocked.createProject).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate project keys at the request-contract layer only through stored uniqueness, not payload shape", async () => {
    const payload = buildProjectPayload();
    const duplicateEnvVar = payload.envVars[1]!;
    payload.envVars[1] = {
      ...duplicateEnvVar,
      name: "KEYSTONE_FIXTURE_PROJECT"
    };

    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify(payload)
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message: "Project request validation failed.",
        details: {
          issues: expect.arrayContaining([
            expect.objectContaining({
              path: ["envVars", 1, "name"]
            })
          ])
        }
      }
    });
    expect(mocked.createProject).not.toHaveBeenCalled();
  });

  it("returns a project by id", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        projectId: "project-123",
        projectKey: "fixture-demo-project"
      },
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "project"
      }
    });
  });

  it("updates an existing project", async () => {
    const payload = {
      ...buildProjectPayload(),
      displayName: "Fixture Demo Project v2"
    };
    const response = await app.request(
      "http://example.com/v1/projects/project-123",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-update"
        },
        body: JSON.stringify(payload)
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        projectId: "project-123",
        displayName: "Fixture Demo Project v2",
        ruleSet: payload.ruleSet,
        components: expect.arrayContaining([
          expect.objectContaining({
            componentKey: "demo-target",
            ruleOverride: payload.components[0]?.ruleOverride
          })
        ]),
        envVars: payload.envVars
      },
      meta: {
        apiVersion: "v1",
        envelope: "detail",
        resourceType: "project"
      }
    });
    expect(mocked.updateProject).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-update",
        projectId: "project-123",
        config: payload
      })
    );
  });

  it("returns 404 when a project is missing", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-missing",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "project_not_found"
      }
    });
  });

  it("returns 409 for duplicate project keys", async () => {
    mocked.createProject.mockRejectedValueOnce({
      code: "23505"
    });

    const response = await app.request(
      "http://example.com/v1/projects",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-create"
        },
        body: JSON.stringify(buildProjectPayload())
      },
      env
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "project_key_conflict"
      }
    });
  });

  it("lists persisted project documents", async () => {
    const documentsResponse = await app.request(
      "http://example.com/v1/projects/project-123/documents",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(documentsResponse.status).toBe(200);
    await expect(documentsResponse.json()).resolves.toMatchObject({
      data: {
        total: 1,
        items: [
          {
            documentId: "doc-project-spec",
            scopeType: "project",
            kind: "specification",
            path: "product/specification",
            currentRevisionId: "revision-project-spec-v1",
            conversation: {
              agentClass: "PlanningDocumentAgent",
              agentName: "project-specification"
            }
          }
        ]
      },
      meta: {
        resourceType: "document"
      }
    });
    expect(documentsDb.listProjectDocumentsWithCurrentRevision).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-read",
        projectId: "project-123"
      })
    );

  });

  it("creates a project document identity", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-write"
        },
        body: JSON.stringify({
          kind: "architecture",
          path: "technical/architecture",
          conversation: {
            agentClass: "PlanningDocumentAgent",
            agentName: "project-architecture"
          }
        })
      },
      env
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        documentId: "doc-project-architecture",
        scopeType: "project",
        kind: "architecture",
        path: "technical/architecture",
        currentRevisionId: null,
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: "project-architecture"
        }
      },
      meta: {
        resourceType: "document"
      }
    });
    expect(mocked.createDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-write",
        projectId: "project-123",
        scopeType: "project",
        kind: "architecture",
        path: "technical/architecture"
      })
    );
  });

  it("maps unexpected document creation failures to internal_error responses", async () => {
    mocked.createDocument.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-write"
        },
        body: JSON.stringify({
          kind: "architecture",
          path: "technical/architecture"
        })
      },
      env
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "internal_error",
        message: "Document persistence failed."
      }
    });
  });

  it("returns a project document detail", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents/doc-project-spec",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        documentId: "doc-project-spec",
        kind: "specification",
        path: "product/specification",
        currentRevisionId: "revision-project-spec-v1"
      },
      meta: {
        resourceType: "document"
      }
    });
  });

  it("creates a project document revision backed by an artifact", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents/doc-project-spec/revisions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-read"
        },
        body: JSON.stringify({
          title: "Project Specification v2",
          body: "# Revised specification\n",
          contentType: "text/markdown; charset=utf-8"
        })
      },
      env
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        documentRevisionId: expect.any(String),
        revisionNumber: 2,
        title: "Project Specification v2",
        artifactId: "artifact-project-spec-v2",
        contentUrl: "/v1/artifacts/artifact-project-spec-v2/content"
      },
      meta: {
        resourceType: "document_revision"
      }
    });
    expect(mocked.bucketPut).toHaveBeenCalled();
    expect(mocked.createArtifactRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-read",
        projectId: "project-123",
        runId: null,
        artifactKind: "document_revision"
      })
    );
    expect(mocked.createDocumentRevision).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-read",
        documentId: "doc-project-spec",
        title: "Project Specification v2"
      })
    );
  });

  it("deletes uploaded project revision artifacts when persistence fails downstream", async () => {
    mocked.createDocumentRevision.mockRejectedValueOnce(new Error("document revision insert failed"));

    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents/doc-project-spec/revisions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-read"
        },
        body: JSON.stringify({
          title: "Project Specification v2",
          body: "# Revised specification\n",
          contentType: "text/markdown; charset=utf-8"
        })
      },
      env
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "internal_error",
        message: "Document persistence failed."
      }
    });
    expect(mocked.deleteArtifactRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-read",
        artifactRefId: "artifact-project-spec-v2"
      })
    );
    expect(mocked.bucketDelete).toHaveBeenCalledWith(
      expect.stringMatching(/^documents\/project\/project-123\/doc-project-spec\//)
    );
  });

  it("rejects invalid canonical project document paths", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123/documents",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer secret-dev-token",
          "Content-Type": "application/json",
          "X-Keystone-Tenant-Id": "tenant-write"
        },
        body: JSON.stringify({
          kind: "specification",
          path: "notes/specification"
        })
      },
      env
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
        message:
          "project-scoped specification documents must use the canonical path product/specification."
      }
    });
    expect(mocked.createDocument).not.toHaveBeenCalled();
  });

  it("lists project runs from authoritative run rows only", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123/runs",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        total: 1,
        items: [
          {
            runId: "run-123",
            projectId: "project-123",
            executionEngine: "think_mock",
            status: "archived"
          }
        ]
      },
      meta: {
        resourceType: "run"
      }
    });
    expect(mocked.listProjectRuns).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-read",
        projectId: "project-123"
      })
    );
    expect(mocked.listRunArtifacts).not.toHaveBeenCalled();
    expect(mocked.listRunTasks).not.toHaveBeenCalled();
  });

  it("lists project tasks with default pagination and enriched task resources", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123/tasks",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: {
        filter: string;
        items: Array<Record<string, unknown>>;
        page: number;
        pageCount: number;
        pageSize: number;
        total: number;
      };
      meta: {
        apiVersion: string;
        envelope: string;
        resourceType: string;
      };
    };

    expect(payload).toMatchObject({
      meta: {
        apiVersion: "v1",
        envelope: "collection",
        resourceType: "task"
      }
    });
    expect(payload.data).toMatchObject({
      total: 4,
      page: 1,
      pageSize: 25,
      pageCount: 1,
      filter: "all"
    });
    expect(payload.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          runId: "run-123",
          taskId: RUN_TASK_PREPARE_ID,
          logicalTaskId: "TASK-001",
          name: "Prepare implementation context",
          updatedAt: "2026-04-17T10:36:00.000Z"
        }),
        expect.objectContaining({
          runId: "run-123",
          taskId: RUN_TASK_IMPLEMENTATION_ID,
          logicalTaskId: "TASK-002",
          dependsOn: [RUN_TASK_PREPARE_ID],
          updatedAt: "2026-04-17T10:45:00.000Z"
        })
      ])
    );
    expect(payload.data.items).toHaveLength(4);
    expect(mocked.listProjectTasks).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-read",
        projectId: "project-123",
        filter: "all",
        page: 1,
        pageSize: 25
      })
    );
  });

  it("fails open when one project run plan payload is malformed", async () => {
    mocked.getArtifactText.mockImplementation(async (_bucket: R2Bucket, key: string) => {
      if (key.includes("run-123")) {
        return "{not-valid-json";
      }

      const runId = Object.keys(compiledRunPlansByRunId).find((candidate) => key.includes(candidate));

      return runId ? JSON.stringify(compiledRunPlansByRunId[runId as keyof typeof compiledRunPlansByRunId]) : null;
    });

    const response = await app.request(
      "http://example.com/v1/projects/project-123/tasks",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: {
        items: Array<Record<string, unknown>>;
      };
    };

    expect(payload.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          runId: "run-123",
          taskId: RUN_TASK_PREPARE_ID,
          logicalTaskId: RUN_TASK_PREPARE_ID
        }),
        expect.objectContaining({
          runId: "run-456",
          taskId: RUN_TASK_REVIEW_ID,
          logicalTaskId: "TASK-019"
        })
      ])
    );
  });

  it("applies server-side project task filters and pagination params", async () => {
    const response = await app.request(
      "http://example.com/v1/projects/project-123/tasks?filter=active&page=2&pageSize=2",
      {
        headers: {
          Authorization: "Bearer secret-dev-token",
          "X-Keystone-Tenant-Id": "tenant-read"
        }
      },
      env
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: {
        filter: string;
        items: Array<Record<string, unknown>>;
        page: number;
        pageCount: number;
        pageSize: number;
        total: number;
      };
    };

    expect(payload).toMatchObject({
      data: {
        total: 3,
        page: 2,
        pageSize: 2,
        pageCount: 2,
        filter: "active",
        items: [
          {
            runId: "run-456",
            taskId: RUN_TASK_REVIEW_ID,
            logicalTaskId: "TASK-019",
            status: "blocked",
            dependsOn: [RUN_TASK_ARCHIVE_ID]
          }
        ]
      }
    });
    expect(payload.data.items).toHaveLength(1);
    expect(mocked.listProjectTasks).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-read",
        projectId: "project-123",
        filter: "active",
        page: 2,
        pageSize: 2
      })
    );
  });
});

describe("listProjectTasks repository logic", () => {
  it("filters operator buckets and paginates deterministically", async () => {
    const client = createProjectTaskRepositoryClient({
      projects: [
        {
          tenantId: "tenant-repo",
          projectId: "project-repo"
        }
      ],
      runs: [
        {
          tenantId: "tenant-repo",
          projectId: "project-repo",
          runId: "run-a",
          createdAt: new Date("2026-04-17T10:00:00.000Z")
        },
        {
          tenantId: "tenant-repo",
          projectId: "project-repo",
          runId: "run-b",
          createdAt: new Date("2026-04-17T11:00:00.000Z")
        },
        {
          tenantId: "tenant-other",
          projectId: "project-other",
          runId: "run-other",
          createdAt: new Date("2026-04-17T12:00:00.000Z")
        }
      ],
      runTasks: [
        {
          runTaskId: RUN_TASK_IMPLEMENTATION_ID,
          runId: "run-a",
          status: "active",
          createdAt: new Date("2026-04-17T10:05:00.000Z")
        },
        {
          runTaskId: RUN_TASK_PREPARE_ID,
          runId: "run-a",
          status: "ready",
          createdAt: new Date("2026-04-17T10:05:00.000Z")
        },
        {
          runTaskId: RUN_TASK_PENDING_ID,
          runId: "run-a",
          status: "pending",
          createdAt: new Date("2026-04-17T10:06:00.000Z")
        },
        {
          runTaskId: RUN_TASK_REVIEW_ID,
          runId: "run-b",
          status: "blocked",
          createdAt: new Date("2026-04-17T10:07:00.000Z")
        },
        {
          runTaskId: RUN_TASK_ARCHIVE_ID,
          runId: "run-b",
          status: "completed",
          createdAt: new Date("2026-04-17T10:08:00.000Z")
        },
        {
          runTaskId: "66666666-6666-4666-8666-666666666666",
          runId: "run-other",
          status: "active",
          createdAt: new Date("2026-04-17T10:09:00.000Z")
        }
      ],
      runTaskDependencies: []
    });

    const firstPage = await actualRunRepositories.listProjectTasks(client, {
      tenantId: "tenant-repo",
      projectId: "project-repo",
      filter: "all",
      page: 1,
      pageSize: 2
    });
    const secondPage = await actualRunRepositories.listProjectTasks(client, {
      tenantId: "tenant-repo",
      projectId: "project-repo",
      filter: "all",
      page: 2,
      pageSize: 2
    });
    const running = await actualRunRepositories.listProjectTasks(client, {
      tenantId: "tenant-repo",
      projectId: "project-repo",
      filter: "running",
      page: 1,
      pageSize: 25
    });
    const queued = await actualRunRepositories.listProjectTasks(client, {
      tenantId: "tenant-repo",
      projectId: "project-repo",
      filter: "queued",
      page: 1,
      pageSize: 25
    });
    const blocked = await actualRunRepositories.listProjectTasks(client, {
      tenantId: "tenant-repo",
      projectId: "project-repo",
      filter: "blocked",
      page: 1,
      pageSize: 25
    });

    expect(firstPage.total).toBe(5);
    expect(firstPage.items.map((task) => task.runTaskId)).toEqual([
      RUN_TASK_PREPARE_ID,
      RUN_TASK_IMPLEMENTATION_ID
    ]);
    expect(secondPage.total).toBe(5);
    expect(secondPage.items.map((task) => task.runTaskId)).toEqual([
      RUN_TASK_PENDING_ID,
      RUN_TASK_REVIEW_ID
    ]);
    expect(running.total).toBe(1);
    expect(running.items.map((task) => task.runTaskId)).toEqual([RUN_TASK_IMPLEMENTATION_ID]);
    expect(queued.total).toBe(2);
    expect(queued.items.map((task) => task.runTaskId)).toEqual([
      RUN_TASK_PREPARE_ID,
      RUN_TASK_PENDING_ID
    ]);
    expect(blocked.total).toBe(1);
    expect(blocked.items.map((task) => task.runTaskId)).toEqual([RUN_TASK_REVIEW_ID]);
  });
});
