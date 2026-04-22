// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";

import type { RunManagementApi, StaticRunDetailRecord } from "../features/runs/run-management-api";
import {
  createStaticRunManagementApi,
  RunManagementApiError
} from "../features/runs/run-management-api";
import { renderRoute } from "./render-route";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function createDeferred<T>() {
  let resolvePromise: ((value: T) => void) | null = null;
  let rejectPromise: ((reason?: unknown) => void) | null = null;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    reject(reason?: unknown) {
      rejectPromise?.(reason);
    },
    resolve(value: T) {
      resolvePromise?.(value);
    }
  };
}

function expectPlanningDocumentToContain(documentLabel: string, expectedText: string) {
  expect(screen.getByRole("region", { name: documentLabel })).toHaveTextContent(
    expectedText.replace(/^[-*]\s*/, "").trim()
  );
}

function createRunFixture(
  runId: string,
  overrides: Partial<StaticRunDetailRecord> = {}
): StaticRunDetailRecord {
  const specificationDocumentId = `${runId}-specification`;
  const architectureDocumentId = `${runId}-architecture`;
  const executionPlanDocumentId = `${runId}-execution-plan`;
  const specificationRevisionId = `${runId}-specification-v1`;
  const architectureRevisionId = `${runId}-architecture-v1`;
  const executionPlanRevisionId = `${runId}-execution-plan-v1`;

  return {
    documents: [
      {
        currentRevisionId: specificationRevisionId,
        documentId: specificationDocumentId,
        kind: "specification",
        path: "specification",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: `${runId}-specification-conversation`
        }
      },
      {
        currentRevisionId: architectureRevisionId,
        documentId: architectureDocumentId,
        kind: "architecture",
        path: "architecture",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: `${runId}-architecture-conversation`
        }
      },
      {
        currentRevisionId: executionPlanRevisionId,
        documentId: executionPlanDocumentId,
        kind: "execution_plan",
        path: "execution-plan",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: `${runId}-execution-plan-conversation`
        }
      }
    ],
    revisions: [
      {
        content: "# Specification\n- Replace scaffold run detail with live data.\n",
        documentId: specificationDocumentId,
        revision: {
          artifactId: `${runId}-specification-artifact`,
          contentUrl: `/v1/artifacts/${runId}-specification-artifact/content`,
          createdAt: "2026-04-20T12:00:00.000Z",
          documentRevisionId: specificationRevisionId,
          revisionNumber: 1,
          title: "Run Specification"
        }
      },
      {
        content: "# Architecture\n- Keep route files thin.\n",
        documentId: architectureDocumentId,
        revision: {
          artifactId: `${runId}-architecture-artifact`,
          contentUrl: `/v1/artifacts/${runId}-architecture-artifact/content`,
          createdAt: "2026-04-20T12:05:00.000Z",
          documentRevisionId: architectureRevisionId,
          revisionNumber: 1,
          title: "Run Architecture"
        }
      },
      {
        content: "# Execution Plan\n- Cut over the live provider seam.\n",
        documentId: executionPlanDocumentId,
        revision: {
          artifactId: `${runId}-execution-plan-artifact`,
          contentUrl: `/v1/artifacts/${runId}-execution-plan-artifact/content`,
          createdAt: "2026-04-20T12:10:00.000Z",
          documentRevisionId: executionPlanRevisionId,
          revisionNumber: 1,
          title: "Execution Plan"
        }
      }
    ],
    run: {
      compiledFrom: null,
      endedAt: null,
      executionEngine: "scripted",
      projectId: "project-keystone-cloudflare",
      runId,
      startedAt: "2026-04-20T12:00:00.000Z",
      status: "configured",
      workflowInstanceId: `wf-${runId}`
    },
    taskArtifacts: {},
    tasks: [],
    workflow: {
      edges: [],
      nodes: [],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 0,
        totalTasks: 0
      }
    },
    ...overrides
  };
}

const runFixtures: Record<string, StaticRunDetailRecord> = {
  "run-101": {
    ...createRunFixture("run-101"),
    documents: [
      {
        currentRevisionId: "run-101-specification-v1",
        documentId: "run-101-specification",
        kind: "specification",
        path: "specification",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: "run-101-specification-conversation"
        }
      }
    ],
    revisions: [
      {
        content: "# Specification\n- One planning document exists.\n",
        documentId: "run-101-specification",
        revision: {
          artifactId: "run-101-specification-artifact",
          contentUrl: "/v1/artifacts/run-101-specification-artifact/content",
          createdAt: "2026-04-20T12:00:00.000Z",
          documentRevisionId: "run-101-specification-v1",
          revisionNumber: 1,
          title: "Run Specification"
        }
      }
    ]
  },
  "run-102": createRunFixture("run-102"),
  "run-103": {
    ...createRunFixture("run-103"),
    documents: [
      {
        currentRevisionId: "run-103-specification-v1",
        documentId: "run-103-specification",
        kind: "specification",
        path: "specification",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: "run-103-specification-conversation"
        }
      },
      {
        currentRevisionId: "run-103-architecture-v1",
        documentId: "run-103-architecture",
        kind: "architecture",
        path: "architecture",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: "run-103-architecture-conversation"
        }
      }
    ],
    revisions: [
      {
        content: "# Specification\n- Architecture is the current focus.\n",
        documentId: "run-103-specification",
        revision: {
          artifactId: "run-103-specification-artifact",
          contentUrl: "/v1/artifacts/run-103-specification-artifact/content",
          createdAt: "2026-04-20T12:00:00.000Z",
          documentRevisionId: "run-103-specification-v1",
          revisionNumber: 1,
          title: "Run Specification"
        }
      },
      {
        content: "# Architecture\n- Execution plan is still missing.\n",
        documentId: "run-103-architecture",
        revision: {
          artifactId: "run-103-architecture-artifact",
          contentUrl: "/v1/artifacts/run-103-architecture-artifact/content",
          createdAt: "2026-04-20T12:05:00.000Z",
          documentRevisionId: "run-103-architecture-v1",
          revisionNumber: 1,
          title: "Run Architecture"
        }
      }
    ]
  },
  "run-104": {
    ...createRunFixture("run-104", {
      artifactContents: {
        "/v1/artifacts/artifact-task-032-diff/content":
          "--- a/ui/src/features/execution/components/task-detail-workspace.tsx\n+++ b/ui/src/features/execution/components/task-detail-workspace.tsx\n+ keep artifact access inside the authenticated run API seam\n"
      },
      run: {
        compiledFrom: {
          architectureRevisionId: "run-104-architecture-v1",
          compiledAt: "2026-04-20T12:20:00.000Z",
          executionPlanRevisionId: "run-104-execution-plan-v1",
          specificationRevisionId: "run-104-specification-v1"
        },
        endedAt: null,
        executionEngine: "think_live",
        projectId: "project-keystone-cloudflare",
        runId: "run-104",
        startedAt: "2026-04-20T12:30:00.000Z",
        status: "active",
        workflowInstanceId: "wf-run-104"
      },
      taskArtifacts: {
        "task-032": [
          {
            artifactId: "artifact-task-032-diff",
            contentType: "text/plain; charset=utf-8",
            contentUrl: "/v1/artifacts/artifact-task-032-diff/content",
            kind: "git_diff",
            sha256: "task-032-sha",
            sizeBytes: 4096
          },
          {
            artifactId: "artifact-task-032-preview",
            contentType: "image/png",
            contentUrl: "/v1/artifacts/artifact-task-032-preview/content",
            kind: "screenshot",
            sha256: "task-032-preview-sha",
            sizeBytes: 8192
          }
        ]
      },
      tasks: [
        {
          conversation: null,
          dependsOn: [],
          description: "Draft the run specification.",
          endedAt: "2026-04-20T12:35:00.000Z",
          logicalTaskId: "TASK-030",
          name: "Specification outline",
          runId: "run-104",
          startedAt: "2026-04-20T12:31:00.000Z",
          status: "completed",
          taskId: "task-030",
          updatedAt: "2026-04-20T12:35:00.000Z"
        },
        {
          conversation: null,
          dependsOn: ["task-030"],
          description: "Translate the specification into architecture decisions.",
          endedAt: "2026-04-20T12:42:00.000Z",
          logicalTaskId: "TASK-031",
          name: "Architecture decisions",
          runId: "run-104",
          startedAt: "2026-04-20T12:36:00.000Z",
          status: "completed",
          taskId: "task-031",
          updatedAt: "2026-04-20T12:42:00.000Z"
        },
        {
          conversation: {
            agentClass: "KeystoneThinkAgent",
            agentName: "tenant:tenant-dev-local:run:run-104:task:task-032"
          },
          dependsOn: ["task-031"],
          description: "Implement the live run-detail provider.",
          endedAt: null,
          logicalTaskId: "TASK-032",
          name: "Live run provider cutover",
          runId: "run-104",
          startedAt: "2026-04-20T12:43:00.000Z",
          status: "active",
          taskId: "task-032",
          updatedAt: "2026-04-20T12:43:00.000Z"
        }
      ],
      workflow: {
        edges: [
          { fromTaskId: "task-030", toTaskId: "task-031" },
          { fromTaskId: "task-031", toTaskId: "task-032" }
        ],
        nodes: [
          { dependsOn: [], name: "Specification outline", status: "completed", taskId: "task-030" },
          { dependsOn: ["task-030"], name: "Architecture decisions", status: "completed", taskId: "task-031" },
          { dependsOn: ["task-031"], name: "Live run provider cutover", status: "active", taskId: "task-032" }
        ],
        summary: {
          activeTasks: 1,
          cancelledTasks: 0,
          completedTasks: 2,
          failedTasks: 0,
          pendingTasks: 0,
          readyTasks: 0,
          totalTasks: 3
        }
      }
    })
  },
  "run-105": {
    ...createRunFixture("run-105"),
    documents: [
      {
        currentRevisionId: "run-105-specification-v1",
        documentId: "run-105-specification",
        kind: "specification",
        path: "specification",
        scopeType: "run",
        conversation: {
          agentClass: "PlanningDocumentAgent",
          agentName: "run-105-specification-conversation"
        }
      },
      {
        currentRevisionId: null,
        documentId: "run-105-architecture",
        kind: "architecture",
        path: "architecture",
        scopeType: "run",
        conversation: null
      }
    ],
    revisions: [
      {
        content: "# Specification\n- Architecture has not been written yet.\n",
        documentId: "run-105-specification",
        revision: {
          artifactId: "run-105-specification-artifact",
          contentUrl: "/v1/artifacts/run-105-specification-artifact/content",
          createdAt: "2026-04-20T12:00:00.000Z",
          documentRevisionId: "run-105-specification-v1",
          revisionNumber: 1,
          title: "Run Specification"
        }
      }
    ]
  },
  "run-106": {
    ...createRunFixture("run-106"),
    documents: [],
    revisions: []
  },
  "run-107": {
    ...createRunFixture("run-107", {
      run: {
        compiledFrom: {
          architectureRevisionId: "run-107-architecture-v1",
          compiledAt: "2026-04-20T12:50:00.000Z",
          executionPlanRevisionId: "run-107-execution-plan-v1",
          specificationRevisionId: "run-107-specification-v1"
        },
        endedAt: null,
        executionEngine: "scripted",
        projectId: "project-keystone-cloudflare",
        runId: "run-107",
        startedAt: null,
        status: "configured",
        workflowInstanceId: "wf-run-107"
      }
    })
  },
  "run-108": {
    ...createRunFixture("run-108", {
      artifactContents: {
        "/v1/artifacts/artifact-task-082-diff/content":
          "--- a/ui/src/features/runs/components/execution-plan-workspace.tsx\n+++ b/ui/src/features/runs/components/execution-plan-workspace.tsx\n+ add explicit compile routing into the DAG\n"
      },
      run: {
        compiledFrom: null,
        endedAt: null,
        executionEngine: "scripted",
        projectId: "project-keystone-cloudflare",
        runId: "run-108",
        startedAt: "2026-04-20T13:00:00.000Z",
        status: "configured",
        workflowInstanceId: "wf-run-108"
      },
      taskArtifacts: {
        "task-082": [
          {
            artifactId: "artifact-task-082-diff",
            contentType: "text/plain; charset=utf-8",
            contentUrl: "/v1/artifacts/artifact-task-082-diff/content",
            kind: "git_diff",
            sha256: "task-082-sha",
            sizeBytes: 2048
          }
        ]
      },
      tasks: [
        {
          conversation: null,
          dependsOn: [],
          description: "Compile the run plan into executable tasks.",
          endedAt: "2026-04-20T13:05:00.000Z",
          logicalTaskId: "TASK-080",
          name: "Compile run plan",
          runId: "run-108",
          startedAt: "2026-04-20T13:01:00.000Z",
          status: "completed",
          taskId: "task-080",
          updatedAt: "2026-04-20T13:05:00.000Z"
        },
        {
          conversation: null,
          dependsOn: ["task-080"],
          description: "Prepare the execution graph for review.",
          endedAt: "2026-04-20T13:07:00.000Z",
          logicalTaskId: "TASK-081",
          name: "Prepare execution graph",
          runId: "run-108",
          startedAt: "2026-04-20T13:05:00.000Z",
          status: "completed",
          taskId: "task-081",
          updatedAt: "2026-04-20T13:07:00.000Z"
        },
        {
          conversation: {
            agentClass: "KeystoneThinkAgent",
            agentName: "tenant:tenant-dev-local:run:run-108:task:task-082"
          },
          dependsOn: ["task-081"],
          description: "Review the compiled execution DAG.",
          endedAt: null,
          logicalTaskId: "TASK-082",
          name: "Review execution DAG",
          runId: "run-108",
          startedAt: "2026-04-20T13:08:00.000Z",
          status: "ready",
          taskId: "task-082",
          updatedAt: "2026-04-20T13:08:00.000Z"
        }
      ],
      workflow: {
        edges: [
          { fromTaskId: "task-080", toTaskId: "task-081" },
          { fromTaskId: "task-081", toTaskId: "task-082" }
        ],
        nodes: [
          { dependsOn: [], name: "Compile run plan", status: "completed", taskId: "task-080" },
          {
            dependsOn: ["task-080"],
            name: "Prepare execution graph",
            status: "completed",
            taskId: "task-081"
          },
          {
            dependsOn: ["task-081"],
            name: "Review execution DAG",
            status: "ready",
            taskId: "task-082"
          }
        ],
        summary: {
          activeTasks: 0,
          cancelledTasks: 0,
          completedTasks: 2,
          failedTasks: 0,
          pendingTasks: 0,
          readyTasks: 1,
          totalTasks: 3
        }
      }
    })
  },
  "run-109": {
    ...createRunFixture("run-109", {
      revisions: [
        {
          content: "# Specification\n- Keep the compiled workflow available while planning changes.\n",
          documentId: "run-109-specification",
          revision: {
            artifactId: "run-109-specification-artifact",
            contentUrl: "/v1/artifacts/run-109-specification-artifact/content",
            createdAt: "2026-04-20T13:10:00.000Z",
            documentRevisionId: "run-109-specification-v1",
            revisionNumber: 1,
            title: "Run Specification"
          }
        },
        {
          content: "# Architecture\n- Recompile when planning revisions drift.\n",
          documentId: "run-109-architecture",
          revision: {
            artifactId: "run-109-architecture-artifact",
            contentUrl: "/v1/artifacts/run-109-architecture-artifact/content",
            createdAt: "2026-04-20T13:12:00.000Z",
            documentRevisionId: "run-109-architecture-v1",
            revisionNumber: 1,
            title: "Run Architecture"
          }
        },
        {
          content: "# Execution Plan\n- Previous compiled revision.\n",
          documentId: "run-109-execution-plan",
          revision: {
            artifactId: "run-109-execution-plan-artifact-v1",
            contentUrl: "/v1/artifacts/run-109-execution-plan-artifact-v1/content",
            createdAt: "2026-04-20T13:14:00.000Z",
            documentRevisionId: "run-109-execution-plan-v1",
            revisionNumber: 1,
            title: "Execution Plan"
          }
        },
        {
          content: "# Execution Plan\n- Current planning revision is newer than the compiled graph.\n",
          documentId: "run-109-execution-plan",
          revision: {
            artifactId: "run-109-execution-plan-artifact-v2",
            contentUrl: "/v1/artifacts/run-109-execution-plan-artifact-v2/content",
            createdAt: "2026-04-20T13:16:00.000Z",
            documentRevisionId: "run-109-execution-plan-v2",
            revisionNumber: 2,
            title: "Execution Plan"
          }
        }
      ],
      documents: [
        {
          currentRevisionId: "run-109-specification-v1",
          documentId: "run-109-specification",
          kind: "specification",
          path: "specification",
          scopeType: "run",
          conversation: {
            agentClass: "PlanningDocumentAgent",
            agentName: "run-109-specification-conversation"
          }
        },
        {
          currentRevisionId: "run-109-architecture-v1",
          documentId: "run-109-architecture",
          kind: "architecture",
          path: "architecture",
          scopeType: "run",
          conversation: {
            agentClass: "PlanningDocumentAgent",
            agentName: "run-109-architecture-conversation"
          }
        },
        {
          currentRevisionId: "run-109-execution-plan-v2",
          documentId: "run-109-execution-plan",
          kind: "execution_plan",
          path: "execution-plan",
          scopeType: "run",
          conversation: {
            agentClass: "PlanningDocumentAgent",
            agentName: "run-109-execution-plan-conversation"
          }
        }
      ],
      run: {
        compiledFrom: {
          architectureRevisionId: "run-109-architecture-v1",
          compiledAt: "2026-04-20T13:15:00.000Z",
          executionPlanRevisionId: "run-109-execution-plan-v1",
          specificationRevisionId: "run-109-specification-v1"
        },
        endedAt: null,
        executionEngine: "scripted",
        projectId: "project-keystone-cloudflare",
        runId: "run-109",
        startedAt: "2026-04-20T13:18:00.000Z",
        status: "configured",
        workflowInstanceId: "wf-run-109"
      },
      tasks: [
        {
          conversation: null,
          dependsOn: [],
          description: "Inspect the currently compiled workflow.",
          endedAt: null,
          logicalTaskId: "TASK-090",
          name: "Inspect current execution graph",
          runId: "run-109",
          startedAt: "2026-04-20T13:18:30.000Z",
          status: "ready",
          taskId: "task-090",
          updatedAt: "2026-04-20T13:18:30.000Z"
        }
      ],
      workflow: {
        edges: [],
        nodes: [
          {
            dependsOn: [],
            name: "Inspect current execution graph",
            status: "ready",
            taskId: "task-090"
          }
        ],
        summary: {
          activeTasks: 0,
          cancelledTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          pendingTasks: 0,
          readyTasks: 1,
          totalTasks: 1
        }
      }
    })
  }
};

const staticRunApi = createStaticRunManagementApi(runFixtures);

function renderRunRoute(initialEntry: string, runApi: RunManagementApi = staticRunApi) {
  return renderRoute(initialEntry, { runApi });
}

function expectRunDetailStateChrome() {
  expect(screen.getByRole("link", { name: "Back to runs" })).toHaveAttribute("href", "/runs");
  expect(screen.getByText("Run workspace")).toBeInTheDocument();
}

function createRunApi(overrides: Partial<RunManagementApi> = {}): RunManagementApi {
  return {
    ...staticRunApi,
    ...overrides
  };
}

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

function createTextResponse(body: string, contentType = "text/plain; charset=utf-8") {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType
    }
  });
}

function createRunDetailResponse(run: StaticRunDetailRecord["run"]) {
  return createJsonResponse({
    data: run,
    meta: {
      apiVersion: "v1" as const,
      envelope: "detail" as const,
      resourceType: "run" as const
    }
  });
}

function createTaskCollectionResponse(tasks: NonNullable<StaticRunDetailRecord["tasks"]>) {
  return createJsonResponse({
    data: {
      items: tasks,
      total: tasks.length
    },
    meta: {
      apiVersion: "v1" as const,
      envelope: "collection" as const,
      resourceType: "task" as const
    }
  });
}

function createWorkflowDetailResponse(workflow: NonNullable<StaticRunDetailRecord["workflow"]>) {
  return createJsonResponse({
    data: workflow,
    meta: {
      apiVersion: "v1" as const,
      envelope: "detail" as const,
      resourceType: "workflow_graph" as const
    }
  });
}

function getRequestHeaders(request: RequestInfo | URL, init?: RequestInit) {
  return request instanceof Request ? request.headers : new Headers(init?.headers);
}

function expectDevAuthHeaders(request: RequestInfo | URL, init?: RequestInit) {
  const headers = getRequestHeaders(request, init);

  expect(headers.get("authorization")).toBe("Bearer change-me-local-token");
  expect(headers.get("x-keystone-tenant-id")).toBe("tenant-dev-local");
}

function createErrorResponse(input: { code: string; message: string; status: number }) {
  return createJsonResponse(
    {
      error: {
        code: input.code,
        message: input.message,
        details: null
      }
    },
    input.status
  );
}

function cloneRunFixtures() {
  return structuredClone(runFixtures);
}

function getRunRequestUrl(request: RequestInfo | URL) {
  return typeof request === "string" ? request : request.toString();
}

function getRunRequestMethod(request: RequestInfo | URL, init?: RequestInit) {
  return request instanceof Request ? request.method : init?.method ?? "GET";
}

async function parseRequestJson(request: RequestInfo | URL, init?: RequestInit) {
  if (request instanceof Request) {
    return request.json();
  }

  if (typeof init?.body !== "string") {
    throw new Error("Expected JSON request body.");
  }

  return JSON.parse(init.body);
}

function findRunDocument(run: StaticRunDetailRecord, documentId: string) {
  return run.documents?.find((document) => document.documentId === documentId) ?? null;
}

function findRunRevision(
  run: StaticRunDetailRecord,
  documentId: string,
  documentRevisionId: string
) {
  return (
    run.revisions?.find((candidate) => {
      if (candidate.documentId) {
        return (
          candidate.documentId === documentId &&
          candidate.revision.documentRevisionId === documentRevisionId
        );
      }

      return findRunDocument(run, documentId)?.currentRevisionId === candidate.revision.documentRevisionId;
    }) ?? null
  );
}

function buildCompiledFrom(run: StaticRunDetailRecord) {
  const specification = run.documents?.find((document) => document.path === "specification");
  const architecture = run.documents?.find((document) => document.path === "architecture");
  const executionPlan = run.documents?.find((document) => document.path === "execution-plan");

  if (
    !specification?.currentRevisionId ||
    !architecture?.currentRevisionId ||
    !executionPlan?.currentRevisionId
  ) {
    return null;
  }

  return {
    architectureRevisionId: architecture.currentRevisionId,
    compiledAt: new Date().toISOString(),
    executionPlanRevisionId: executionPlan.currentRevisionId,
    specificationRevisionId: specification.currentRevisionId
  };
}

function getFetchRequests(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(([request, init]) => ({
    method: getRunRequestMethod(request, init),
    url: getRunRequestUrl(request)
  }));
}

function countFetchRequests(
  fetchMock: ReturnType<typeof vi.fn>,
  input: {
    method: string;
    url: string;
  }
) {
  return getFetchRequests(fetchMock).filter(
    (request) => request.method === input.method && request.url === input.url
  ).length;
}

function createBrowserRunFetch(
  overrides: Record<string, (() => Promise<Response> | Response) | undefined> = {}
) {
  const browserRunFixtures = cloneRunFixtures();
  const fetchMock = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = getRunRequestUrl(request);
    const method = getRunRequestMethod(request, init);

    expectDevAuthHeaders(request, init);

    const override = overrides[`${method} ${url}`] ?? overrides[url];

    if (override) {
      return await override();
    }

    const runMatch = url.match(/^\/v1\/runs\/([^/]+)$/);

    if (runMatch) {
      const runId = decodeURIComponent(runMatch[1]!);
      const run = browserRunFixtures[runId];

      return run
        ? createJsonResponse({
            data: run.run,
            meta: {
              apiVersion: "v1" as const,
              envelope: "detail" as const,
              resourceType: "run" as const
            }
          })
        : createErrorResponse({
            code: "run_not_found",
            message: `Run ${runId} was not found.`,
            status: 404
          });
    }

    const runCompileMatch = url.match(/^\/v1\/runs\/([^/]+)\/compile$/);

    if (runCompileMatch) {
      const runId = decodeURIComponent(runCompileMatch[1]!);
      const run = browserRunFixtures[runId];

      if (!run) {
        return createErrorResponse({
          code: "run_not_found",
          message: `Run ${runId} was not found.`,
          status: 404
        });
      }

      if (method !== "POST") {
        throw new Error(`Unexpected method ${method} for ${url}`);
      }

      const compiledFrom = buildCompiledFrom(run);

      if (!compiledFrom) {
        return createErrorResponse({
          code: "run_documents_incomplete",
          message:
            "Run compilation requires specification, architecture, and execution-plan documents.",
          status: 409
        });
      }

      run.run = {
        ...run.run,
        compiledFrom,
        status: (run.tasks ?? []).some((task) => task.status === "ready" || task.status === "active")
          ? "active"
          : run.run.status
      };

      return createJsonResponse(
        {
          data: {
            run: run.run,
            status: "accepted",
            workflowInstanceId: run.run.workflowInstanceId
          },
          meta: {
            apiVersion: "v1" as const,
            envelope: "action" as const,
            resourceType: "run" as const
          }
        },
        202
      );
    }

    const runDocumentsMatch = url.match(/^\/v1\/runs\/([^/]+)\/documents$/);

    if (runDocumentsMatch) {
      const runId = decodeURIComponent(runDocumentsMatch[1]!);
      const run = browserRunFixtures[runId];

      if (!run) {
        return createErrorResponse({
          code: "run_not_found",
          message: `Run ${runId} was not found.`,
          status: 404
        });
      }

      if (method === "POST") {
        const input = (await parseRequestJson(request, init)) as {
          conversation?: NonNullable<StaticRunDetailRecord["documents"]>[number]["conversation"];
          kind: NonNullable<StaticRunDetailRecord["documents"]>[number]["kind"];
          path: string;
        };

        if (run.documents?.some((document) => document.path === input.path)) {
          return createErrorResponse({
            code: "document_path_conflict",
            message: "A document with that logical path already exists in this scope.",
            status: 409
          });
        }

        const documentId = `${runId}-${input.path.replace(/\//g, "-")}`;
        const createdDocument = {
          conversation: input.conversation ?? null,
          currentRevisionId: null,
          documentId,
          kind: input.kind,
          path: input.path,
          scopeType: "run" as const
        };

        run.documents = [...(run.documents ?? []), createdDocument];

        return createJsonResponse(
          {
            data: createdDocument,
            meta: {
              apiVersion: "v1" as const,
              envelope: "detail" as const,
              resourceType: "document" as const
            }
          },
          201
        );
      }

      return createJsonResponse({
        data: {
          items: run.documents ?? [],
          total: run.documents?.length ?? 0
        },
        meta: {
          apiVersion: "v1" as const,
          envelope: "collection" as const,
          resourceType: "document" as const
        }
      });
    }

    const runDocumentRevisionMatch = url.match(
      /^\/v1\/runs\/([^/]+)\/documents\/([^/]+)\/revisions\/([^/]+)$/
    );

    if (runDocumentRevisionMatch) {
      const runId = decodeURIComponent(runDocumentRevisionMatch[1]!);
      const documentId = decodeURIComponent(runDocumentRevisionMatch[2]!);
      const documentRevisionId = decodeURIComponent(runDocumentRevisionMatch[3]!);
      const run = browserRunFixtures[runId];
      const revision = run ? findRunRevision(run, documentId, documentRevisionId) : null;

      return revision
        ? createJsonResponse({
            data: revision.revision,
            meta: {
              apiVersion: "v1" as const,
              envelope: "detail" as const,
              resourceType: "document_revision" as const
            }
          })
        : createErrorResponse({
            code: "document_revision_not_found",
            message: `Document revision ${documentRevisionId} was not found for run ${runId}.`,
            status: 404
          });
    }

    const runDocumentRevisionsCollectionMatch = url.match(
      /^\/v1\/runs\/([^/]+)\/documents\/([^/]+)\/revisions$/
    );

    if (runDocumentRevisionsCollectionMatch) {
      const runId = decodeURIComponent(runDocumentRevisionsCollectionMatch[1]!);
      const documentId = decodeURIComponent(runDocumentRevisionsCollectionMatch[2]!);
      const run = browserRunFixtures[runId];

      if (!run) {
        return createErrorResponse({
          code: "run_not_found",
          message: `Run ${runId} was not found.`,
          status: 404
        });
      }

      if (method !== "POST") {
        throw new Error(`Unexpected method ${method} for ${url}`);
      }

      const document = findRunDocument(run, documentId);

      if (!document) {
        return createErrorResponse({
          code: "document_not_found",
          message: `Document ${documentId} was not found for run ${runId}.`,
          status: 404
        });
      }

      const input = (await parseRequestJson(request, init)) as {
        body: string;
        title: string;
      };
      const currentRevision = document.currentRevisionId
        ? run.revisions?.find(
            (candidate) => candidate.revision.documentRevisionId === document.currentRevisionId
          ) ?? null
        : null;
      const revisionNumber = (currentRevision?.revision.revisionNumber ?? 0) + 1;
      const createdRevision = {
        content: input.body,
        documentId: document.documentId,
        revision: {
          artifactId: `${document.documentId}-artifact-v${revisionNumber}`,
          contentUrl: `/v1/artifacts/${document.documentId}-artifact-v${revisionNumber}/content`,
          createdAt: new Date().toISOString(),
          documentRevisionId: `${document.documentId}-v${revisionNumber}`,
          revisionNumber,
          title: input.title
        }
      };

      run.revisions = [...(run.revisions ?? []), createdRevision];
      run.documents = (run.documents ?? []).map((candidate) =>
        candidate.documentId === document.documentId
          ? {
              ...candidate,
              currentRevisionId: createdRevision.revision.documentRevisionId
            }
          : candidate
      );

      return createJsonResponse(
        {
          data: createdRevision.revision,
          meta: {
            apiVersion: "v1" as const,
            envelope: "detail" as const,
            resourceType: "document_revision" as const
          }
        },
        201
      );
    }

    const runWorkflowMatch = url.match(/^\/v1\/runs\/([^/]+)\/workflow$/);

    if (runWorkflowMatch) {
      const runId = decodeURIComponent(runWorkflowMatch[1]!);
      const run = browserRunFixtures[runId];

      return run
        ? createJsonResponse({
            data: run.workflow ?? {
              edges: [],
              nodes: [],
              summary: {
                activeTasks: 0,
                cancelledTasks: 0,
                completedTasks: 0,
                failedTasks: 0,
                pendingTasks: 0,
                readyTasks: 0,
                totalTasks: 0
              }
            },
            meta: {
              apiVersion: "v1" as const,
              envelope: "detail" as const,
              resourceType: "workflow_graph" as const
            }
          })
        : createErrorResponse({
            code: "run_not_found",
            message: `Run ${runId} was not found.`,
            status: 404
          });
    }

    const runTasksMatch = url.match(/^\/v1\/runs\/([^/]+)\/tasks$/);

    if (runTasksMatch) {
      const runId = decodeURIComponent(runTasksMatch[1]!);
      const run = browserRunFixtures[runId];

      return run
        ? createJsonResponse({
            data: {
              items: run.tasks ?? [],
              total: run.tasks?.length ?? 0
            },
            meta: {
              apiVersion: "v1" as const,
              envelope: "collection" as const,
              resourceType: "task" as const
            }
          })
        : createErrorResponse({
            code: "run_not_found",
            message: `Run ${runId} was not found.`,
            status: 404
          });
    }

    const runTaskArtifactsMatch = url.match(/^\/v1\/runs\/([^/]+)\/tasks\/([^/]+)\/artifacts$/);

    if (runTaskArtifactsMatch) {
      const runId = decodeURIComponent(runTaskArtifactsMatch[1]!);
      const taskId = decodeURIComponent(runTaskArtifactsMatch[2]!);
      const run = browserRunFixtures[runId];

      return run
        ? createJsonResponse({
            data: {
              items: run.taskArtifacts?.[taskId] ?? [],
              total: run.taskArtifacts?.[taskId]?.length ?? 0
            },
            meta: {
              apiVersion: "v1" as const,
              envelope: "collection" as const,
              resourceType: "artifact" as const
            }
          })
        : createErrorResponse({
            code: "run_not_found",
            message: `Run ${runId} was not found.`,
            status: 404
          });
    }

    for (const run of Object.values(browserRunFixtures)) {
      const revisionRecord = run.revisions?.find(
        (candidate) => candidate.revision.contentUrl === url
      );

      if (revisionRecord) {
        return createTextResponse(revisionRecord.content);
      }

      const artifactContent = run.artifactContents?.[url];

      if (artifactContent !== undefined) {
        const artifact = Object.values(run.taskArtifacts ?? {})
          .flat()
          .find((candidate) => candidate.contentUrl === url);

        return createTextResponse(artifactContent, artifact?.contentType);
      }
    }

    throw new Error(`Unexpected fetch request: ${method} ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock
  };
}

describe("Run routes", () => {
  it("redirects /runs/:runId to execution when compiled workflow data exists", async () => {
    const { router } = renderRunRoute("/runs/run-104");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/execution");
    });
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        name: "Execution"
      })
    ).toHaveAttribute("href", "/runs/run-104/execution");
    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
  });

  it("redirects an uncompiled run to the first incomplete planning step", async () => {
    const { router: planRouter } = renderRunRoute("/runs/run-102");

    expect(await screen.findByRole("heading", { name: "run-102" })).toBeInTheDocument();
    await waitFor(() => {
      expect(planRouter.state.location.pathname).toBe("/runs/run-102/execution-plan");
    });

    const { router: architectureRouter } = renderRunRoute("/runs/run-103");

    expect(await screen.findByRole("heading", { name: "run-103" })).toBeInTheDocument();
    await waitFor(() => {
      expect(architectureRouter.state.location.pathname).toBe("/runs/run-103/execution-plan");
    });

    const { router: specificationRouter } = renderRunRoute("/runs/run-101");

    expect(await screen.findByRole("heading", { name: "run-101" })).toBeInTheDocument();
    await waitFor(() => {
      expect(specificationRouter.state.location.pathname).toBe("/runs/run-101/architecture");
    });
  });

  it("redirects a compiled run with a materializing workflow into execution", async () => {
    const { router } = renderRunRoute("/runs/run-107");

    expect(await screen.findByRole("heading", { name: "run-107" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-107/execution");
    });
    expect(await screen.findByText("Execution is materializing")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Compile was accepted for this run. Keystone is still materializing the live execution graph."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh execution" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        name: "Execution"
      })
    ).toHaveAttribute("href", "/runs/run-107/execution");
  });

  it("redirects a brand-new run with no planning documents to specification", async () => {
    const { router } = renderRunRoute("/runs/run-106");

    expect(await screen.findByRole("heading", { name: "run-106" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-106/specification");
    });

    expect(await screen.findByText("No specification document yet")).toBeInTheDocument();
  });

  it("renders the run workspace frame with back-link, metadata, and stage summaries", async () => {
    renderRunRoute("/runs/run-104/specification");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to runs" })).toHaveAttribute("href", "/runs");
    expect(screen.getByText("Workflow wf-run-104")).toBeInTheDocument();
    expect(screen.getByText("Engine Think Live")).toBeInTheDocument();
    const phaseNavigation = screen.getByRole("navigation", { name: "Run phases" });

    expect(within(phaseNavigation).getByText("Agent chat plus the living product spec.")).toBeInTheDocument();
    expect(within(phaseNavigation).getByText("Workflow DAG first, then task detail.")).toBeInTheDocument();
  });

  it("renders the loading state before the live run provider resolves", async () => {
    const deferredRun = createDeferred<StaticRunDetailRecord["run"]>();
    const runApi = createRunApi({
      getRun: vi.fn(async () => deferredRun.promise)
    });

    renderRunRoute("/runs/run-104/specification", runApi);

    expect(await screen.findByRole("heading", { name: "Loading run" })).toBeInTheDocument();
    expectRunDetailStateChrome();

    deferredRun.resolve(runFixtures["run-104"]!.run);

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
  });

  it("resets the run-detail provider immediately when navigation switches runs", async () => {
    const deferredRun = createDeferred<StaticRunDetailRecord["run"]>();
    const runApi = createRunApi({
      getRun: vi.fn(async (runId) => {
        if (runId === "run-104") {
          return deferredRun.promise;
        }

        return staticRunApi.getRun(runId);
      })
    });
    const { router } = renderRunRoute("/runs/run-101/specification", runApi);

    expect(await screen.findByRole("heading", { name: "run-101" })).toBeInTheDocument();

    void router.navigate("/runs/run-104/specification");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/specification");
    });

    expect(await screen.findByRole("heading", { name: "Loading run" })).toBeInTheDocument();
    expectRunDetailStateChrome();
    expect(screen.queryByRole("heading", { name: "run-101" })).not.toBeInTheDocument();

    deferredRun.resolve(runFixtures["run-104"]!.run);

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
  });

  it.each([
    {
      documentPath: "architecture",
      expectedLine: "- Keep route files thin.",
      path: "/runs/run-104/architecture",
      phaseHeading: "Architecture conversation",
      revisionTitle: "Run Architecture"
    },
    {
      documentPath: "execution-plan",
      expectedLine: "- Cut over the live provider seam.",
      path: "/runs/run-104/execution-plan",
      phaseHeading: "Execution Plan conversation",
      revisionTitle: "Execution Plan"
    }
  ])(
    "loads the current planning revision for $path through the live route seam",
    async ({ documentPath, expectedLine, path, phaseHeading, revisionTitle }) => {
      createBrowserRunFetch();

      renderRoute(path);

      expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: phaseHeading })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: `${revisionTitle} document` })).toBeInTheDocument();
      expect(screen.getByText(documentPath)).toBeInTheDocument();
      expect(screen.getByLabelText("Conversation status")).toHaveTextContent(
        "Conversation attached to this document."
      );
      expectPlanningDocumentToContain(`${revisionTitle} document`, expectedLine);
    }
  );

  it("loads the current specification revision and saves a new revision without route churn", async () => {
    const { fetchMock } = createBrowserRunFetch();
    const { router } = renderRoute("/runs/run-104/specification");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Specification conversation" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Run Specification document" })).toBeInTheDocument();
    expect(screen.getByText("specification")).toBeInTheDocument();
    expect(screen.getByLabelText("Conversation status")).toHaveTextContent(
      "Conversation attached to this document."
    );
    expectPlanningDocumentToContain(
      "Run Specification document",
      "- Replace scaffold run detail with live data."
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Document title" }), {
      target: {
        value: "Run Specification v2"
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Document body" }), {
      target: {
        value:
          "# Specification\n- Replace scaffold run detail with live data.\n- Save current revisions without route churn.\n"
      }
    });
    expectPlanningDocumentToContain("Document preview", "Save current revisions without route churn.");

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("heading", { name: "Run Specification v2" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain(
      "Run Specification v2 document",
      "- Save current revisions without route churn."
    );
    expect(router.state.location.pathname).toBe("/runs/run-104/specification");

    expect(getFetchRequests(fetchMock)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "POST",
          url: "/v1/runs/run-104/documents/run-104-specification/revisions"
        })
      ])
    );
  });

  it("keeps planning edits in place and allows retry after a revision save fails", async () => {
    const failedSave = createDeferred<
      Awaited<ReturnType<RunManagementApi["createRunDocumentRevision"]>>
    >();
    const baseRunApi = createStaticRunManagementApi(cloneRunFixtures());
    let shouldReject = true;
    const createRunDocumentRevision = vi.fn(
      async (...args: Parameters<RunManagementApi["createRunDocumentRevision"]>) => {
        if (shouldReject) {
          shouldReject = false;
          return await failedSave.promise;
        }

        return baseRunApi.createRunDocumentRevision(...args);
      }
    );
    const runApi: RunManagementApi = {
      ...baseRunApi,
      createRunDocumentRevision
    };
    const { router } = renderRunRoute("/runs/run-104/specification", runApi);

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Document title" }), {
      target: {
        value: "Run Specification v2"
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Document body" }), {
      target: {
        value: "# Specification\n- Retry the save after a transient failure.\n"
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("button", { name: "Saving changes..." })).toBeDisabled();

    failedSave.reject(new Error("Unable to save specification changes."));

    expect(await screen.findByText("Unable to save specification changes.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(screen.getByRole("textbox", { name: "Document title" })).toHaveValue(
      "Run Specification v2"
    );
    expect(screen.getByRole("textbox", { name: "Document body" })).toHaveValue(
      "# Specification\n- Retry the save after a transient failure.\n"
    );
    expect(router.state.location.pathname).toBe("/runs/run-104/specification");

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("heading", { name: "Run Specification v2" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain(
      "Run Specification v2 document",
      "- Retry the save after a transient failure."
    );
    expect(screen.queryByText("Unable to save specification changes.")).not.toBeInTheDocument();
    expect(createRunDocumentRevision).toHaveBeenCalledTimes(2);
  });

  it("deduplicates rapid create and save activations for a planning document", async () => {
    const { fetchMock } = createBrowserRunFetch();

    renderRoute("/runs/run-106/specification");

    expect(await screen.findByRole("heading", { name: "run-106" })).toBeInTheDocument();

    const createButton = screen.getByRole("button", {
      name: "Create specification document"
    });
    fireEvent.click(createButton);
    fireEvent.click(createButton);

    expect(await screen.findByRole("textbox", { name: "Document title" })).toHaveValue(
      "Run Specification"
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Document body" }), {
      target: {
        value: "# Specification\n- Single-flight planning mutations prevent duplicates.\n"
      }
    });

    const saveButton = screen.getByRole("button", { name: "Save changes" });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(await screen.findByRole("heading", { name: "Run Specification" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain(
      "Run Specification document",
      "- Single-flight planning mutations prevent duplicates."
    );
    expect(
      countFetchRequests(fetchMock, {
        method: "POST",
        url: "/v1/runs/run-106/documents"
      })
    ).toBe(1);
    expect(
      countFetchRequests(fetchMock, {
        method: "POST",
        url: "/v1/runs/run-106/documents/run-106-specification/revisions"
      })
    ).toBe(1);
  });

  it.each([
    {
      defaultTitle: "Run Specification",
      documentId: "run-106-specification",
      emptyTitle: "No specification document yet",
      expectedLine: "- Define the live planning specification.",
      path: "/runs/run-106/specification"
    },
    {
      defaultTitle: "Run Architecture",
      documentId: "run-106-architecture",
      emptyTitle: "No architecture document yet",
      expectedLine: "- Keep the shared planning layout stable.",
      path: "/runs/run-106/architecture"
    },
    {
      defaultTitle: "Execution Plan",
      documentId: "run-106-execution-plan",
      emptyTitle: "No execution plan document yet",
      expectedLine: "- Save the current execution plan without leaving the route.",
      path: "/runs/run-106/execution-plan"
    }
  ])(
    "creates and saves a missing planning document for $path without route churn",
    async ({ defaultTitle, documentId, emptyTitle, expectedLine, path }) => {
      const { fetchMock } = createBrowserRunFetch();
      const { router } = renderRoute(path);

      expect(await screen.findByRole("heading", { name: "run-106" })).toBeInTheDocument();
      expect(screen.getByText(emptyTitle)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Create`, "i") }));

      expect(await screen.findByRole("textbox", { name: "Document title" })).toHaveValue(
        defaultTitle
      );

      fireEvent.change(screen.getByRole("textbox", { name: "Document body" }), {
        target: {
          value: `${defaultTitle}\n${expectedLine}\n`
        }
      });

      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

      expect(await screen.findByRole("heading", { name: defaultTitle })).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
      });
      expectPlanningDocumentToContain(`${defaultTitle} document`, expectedLine);
      expect(router.state.location.pathname).toBe(path);

      expect(getFetchRequests(fetchMock)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: "POST",
            url: `/v1/runs/run-106/documents`
          }),
          expect.objectContaining({
            method: "POST",
            url: `/v1/runs/run-106/documents/${documentId}/revisions`
          })
        ])
      );
    }
  );

  it("reconciles document path conflicts by reloading the existing backend document state", async () => {
    const existingDocument = {
      conversation: {
        agentClass: "PlanningDocumentAgent",
        agentName: "run-106-architecture-conversation"
      },
      currentRevisionId: "run-106-architecture-v1",
      documentId: "run-106-architecture",
      kind: "architecture" as const,
      path: "architecture",
      scopeType: "run" as const
    };
    let listRunDocumentsCallCount = 0;
    const listRunDocuments = vi.fn(async () => {
      listRunDocumentsCallCount += 1;

      return listRunDocumentsCallCount === 1 ? [] : [existingDocument];
    });
    const createRunDocument = vi.fn(async () => {
      throw new RunManagementApiError({
        code: "document_path_conflict",
        message: "A document with that logical path already exists in this scope.",
        status: 409
      });
    });
    const getRunDocumentRevision = vi.fn(async () => ({
      artifactId: "run-106-architecture-artifact",
      contentUrl: "/v1/artifacts/run-106-architecture-artifact/content",
      createdAt: "2026-04-20T12:05:00.000Z",
      documentRevisionId: "run-106-architecture-v1",
      revisionNumber: 1,
      title: "Run Architecture"
    }));
    const getDocumentContent = vi.fn(
      async () => "# Architecture\n- Conflict recovery reflects backend truth.\n"
    );

    renderRunRoute(
      "/runs/run-106/architecture",
      createRunApi({
        createRunDocument,
        getDocumentContent,
        getRunDocumentRevision,
        listRunDocuments
      })
    );

    expect(await screen.findByRole("heading", { name: "run-106" })).toBeInTheDocument();
    expect(screen.getByText("No architecture document yet")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create architecture document" }));

    expect(await screen.findByRole("heading", { name: "Run Architecture" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain(
      "Run Architecture document",
      "- Conflict recovery reflects backend truth."
    );
    expect(screen.queryByText("No architecture document yet")).not.toBeInTheDocument();
    expect(createRunDocument).toHaveBeenCalledTimes(1);
    expect(listRunDocuments).toHaveBeenCalledTimes(2);
  });

  it("lets a planning page with no current revision enter the editor, discard changes, and save", async () => {
    const { router } = renderRunRoute(
      "/runs/run-105/architecture",
      createStaticRunManagementApi(cloneRunFixtures())
    );

    expect(await screen.findByRole("heading", { name: "run-105" })).toBeInTheDocument();
    expect(screen.getByText("No current architecture revision")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Write first revision" }));

    expect(await screen.findByRole("textbox", { name: "Document title" })).toHaveValue(
      "Run Architecture"
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Document body" }), {
      target: {
        value: "# Architecture\n- Discarded draft changes.\n"
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    expect(screen.getByText("No current architecture revision")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Document body" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Write first revision" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "Document body" }), {
      target: {
        value: "# Architecture\n- Save the first architecture revision.\n"
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("heading", { name: "Run Architecture" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain(
      "Run Architecture document",
      "- Save the first architecture revision."
    );
    expect(router.state.location.pathname).toBe("/runs/run-105/architecture");
  });

  it("blocks route changes away from dirty planning edits until the user confirms", async () => {
    const confirmMock = vi.fn(() => false);

    vi.stubGlobal("confirm", confirmMock);

    const { router } = renderRunRoute(
      "/runs/run-105/architecture",
      createStaticRunManagementApi(cloneRunFixtures())
    );

    expect(await screen.findByRole("heading", { name: "run-105" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Write first revision" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "Document body" }), {
      target: {
        value: "# Architecture\n- Guard this draft.\n"
      }
    });

    fireEvent.click(screen.getByRole("link", { name: "Documentation" }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(
        "You have unsaved changes in Architecture. Leave this document without saving?"
      );
    });
    expect(router.state.location.pathname).toBe("/runs/run-105/architecture");
    expect(screen.getByRole("textbox", { name: "Document body" })).toHaveValue(
      "# Architecture\n- Guard this draft.\n"
    );

    confirmMock.mockReturnValue(true);

    fireEvent.click(screen.getByRole("link", { name: "Documentation" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/documentation");
    });
    expect(await screen.findByRole("heading", { name: "Project documentation" })).toBeInTheDocument();
  });

  it("registers a beforeunload warning while a planning draft has unsaved changes", async () => {
    renderRunRoute("/runs/run-105/architecture", createStaticRunManagementApi(cloneRunFixtures()));

    expect(await screen.findByRole("heading", { name: "run-105" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Write first revision" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "Document body" }), {
      target: {
        value: "# Architecture\n- Warn before unload.\n"
      }
    });

    const beforeUnloadEvent = new Event("beforeunload", {
      cancelable: true
    }) as unknown as BeforeUnloadEvent;

    Object.defineProperty(beforeUnloadEvent, "returnValue", {
      configurable: true,
      value: "",
      writable: true
    });

    window.dispatchEvent(beforeUnloadEvent);

    expect(beforeUnloadEvent.defaultPrevented).toBe(true);
    expect(beforeUnloadEvent.returnValue).toBe(
      "You have unsaved changes in Architecture. Leave this document without saving?"
    );

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    const cleanBeforeUnloadEvent = new Event("beforeunload", {
      cancelable: true
    }) as unknown as BeforeUnloadEvent;

    Object.defineProperty(cleanBeforeUnloadEvent, "returnValue", {
      configurable: true,
      value: "",
      writable: true
    });

    window.dispatchEvent(cleanBeforeUnloadEvent);

    expect(cleanBeforeUnloadEvent.defaultPrevented).toBe(false);
    expect(cleanBeforeUnloadEvent.returnValue).toBe("");
  });

  it("keeps the navigation guard active while a planning save is still pending", async () => {
    const confirmMock = vi.fn(() => false);
    const pendingSave = createDeferred<void>();
    const baseRunApi = createStaticRunManagementApi(cloneRunFixtures());
    const createRunDocumentRevision = vi.fn(
      async (...args: Parameters<RunManagementApi["createRunDocumentRevision"]>) => {
        await pendingSave.promise;
        return baseRunApi.createRunDocumentRevision(...args);
      }
    );
    const runApi: RunManagementApi = {
      ...baseRunApi,
      createRunDocumentRevision
    };

    vi.stubGlobal("confirm", confirmMock);

    const { router } = renderRunRoute("/runs/run-105/architecture", runApi);

    expect(await screen.findByRole("heading", { name: "run-105" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Write first revision" }));
    await screen.findByRole("textbox", { name: "Document title" });
    fireEvent.change(screen.getByRole("textbox", { name: "Document body" }), {
      target: {
        value: "# Architecture\n- Save is still pending.\n"
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("button", { name: "Saving changes..." })).toBeDisabled();
    expect(createRunDocumentRevision).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("link", { name: "Documentation" }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(
        "You have unsaved changes in Architecture. Leave this document without saving?"
      );
    });
    expect(router.state.location.pathname).toBe("/runs/run-105/architecture");
    expect(screen.getByRole("textbox", { name: "Document body" })).toHaveValue(
      "# Architecture\n- Save is still pending.\n"
    );

    pendingSave.resolve(undefined);

    expect(await screen.findByRole("heading", { name: "Run Architecture" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit document" })).toBeInTheDocument();
    });
    expectPlanningDocumentToContain("Run Architecture document", "- Save is still pending.");
  });

  it("only exposes Compile run when the live planning documents are ready for compilation", async () => {
    renderRunRoute("/runs/run-108/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-108" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compile run" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Compile persists the execution graph from the current specification, architecture, and execution plan."
      )
    ).toBeInTheDocument();

    cleanup();

    renderRunRoute("/runs/run-103/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-103" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compile run" })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Compile becomes available once current revisions exist for: Execution Plan."
      )
    ).toBeInTheDocument();

    cleanup();

    renderRunRoute("/runs/run-104/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compile run" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open execution" })).toHaveAttribute(
      "href",
      "/runs/run-104/execution"
    );

    cleanup();

    renderRunRoute("/runs/run-109/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-109" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recompile run" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open current execution" })).toHaveAttribute(
      "href",
      "/runs/run-109/execution"
    );
    expect(
      screen.getByText(
        "Current planning revisions are newer than the execution graph. Recompile to refresh Execution with the latest live documents."
      )
    ).toBeInTheDocument();

    cleanup();

    renderRunRoute("/runs/run-107/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-107" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Compile was accepted for this run. Keystone is waiting for the live execution graph to become available."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh run" })).toBeInTheDocument();
  });

  it("refreshes a blocked compile state until execution becomes available", async () => {
    const emptyWorkflow: NonNullable<StaticRunDetailRecord["workflow"]> = {
      edges: [],
      nodes: [],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 0,
        totalTasks: 0
      }
    };
    const materializedWorkflow: NonNullable<StaticRunDetailRecord["workflow"]> = {
      edges: [],
      nodes: [
        {
          dependsOn: [],
          name: "Inspect materialized execution",
          status: "ready",
          taskId: "task-107-refresh"
        }
      ],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 1,
        totalTasks: 1
      }
    };
    const materializedTasks: NonNullable<StaticRunDetailRecord["tasks"]> = [
      {
        conversation: null,
        dependsOn: [],
        description: "Inspect the materialized execution graph.",
        endedAt: null,
        logicalTaskId: "TASK-107",
        name: "Inspect materialized execution",
        runId: "run-107",
        startedAt: null,
        status: "ready",
        taskId: "task-107-refresh",
        updatedAt: "2026-04-20T13:00:00.000Z"
      }
    ];
    const baseRunApi = createStaticRunManagementApi(cloneRunFixtures());
    let workflowCallCount = 0;
    const getRunWorkflow = vi.fn(async () => {
      workflowCallCount += 1;
      return workflowCallCount === 1 ? emptyWorkflow : materializedWorkflow;
    });
    const listRunTasks = vi.fn(async () =>
      workflowCallCount === 1 ? [] : materializedTasks
    );
    const runApi: RunManagementApi = {
      ...baseRunApi,
      getRunWorkflow,
      listRunTasks
    };

    renderRunRoute("/runs/run-107/execution-plan", runApi);

    expect(await screen.findByRole("heading", { name: "run-107" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh run" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh run" }));

    await waitFor(() => {
      expect(getRunWorkflow).toHaveBeenCalledTimes(2);
    });
    expect(listRunTasks).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("link", { name: "Open execution" })).toHaveAttribute(
      "href",
      "/runs/run-107/execution"
    );
    expect(
      screen.getByText(
        "Execution is enabled for this run. Open the DAG to inspect live task state."
      )
    ).toBeInTheDocument();
  });

  it("replaces stale ready detail with the shared error state when a refresh retry fails", async () => {
    const emptyWorkflow: NonNullable<StaticRunDetailRecord["workflow"]> = {
      edges: [],
      nodes: [],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 0,
        totalTasks: 0
      }
    };
    const baseRunApi = createStaticRunManagementApi(cloneRunFixtures());
    let workflowCallCount = 0;
    const getRunWorkflow = vi.fn(async () => {
      workflowCallCount += 1;

      if (workflowCallCount === 1) {
        return emptyWorkflow;
      }

      throw new Error("Run detail refresh failed.");
    });
    const listRunTasks = vi.fn(async () => []);
    const runApi: RunManagementApi = {
      ...baseRunApi,
      getRunWorkflow,
      listRunTasks
    };

    renderRunRoute("/runs/run-107/execution-plan", runApi);

    expect(await screen.findByRole("heading", { name: "run-107" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh run" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh run" }));

    expect(await screen.findByRole("heading", { name: "Unable to load run" })).toBeInTheDocument();
    expectRunDetailStateChrome();
    expect(screen.getByText("Run detail refresh failed.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh run" })).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Compile was accepted for this run. Keystone is waiting for the live execution graph to become available."
      )
    ).not.toBeInTheDocument();
  });

  it("keeps terminal run compile messaging aligned with the current run status", async () => {
    const baseRunApi = createStaticRunManagementApi(cloneRunFixtures());
    const getRun = vi.fn(async (runId: string) => {
      const run = await baseRunApi.getRun(runId);

      if (runId === "run-108") {
        return {
          ...run,
          endedAt: "2026-04-20T13:30:00.000Z",
          startedAt: "2026-04-20T13:00:00.000Z",
          status: "cancelled"
        };
      }

      if (runId === "run-109") {
        return {
          ...run,
          endedAt: "2026-04-20T13:30:00.000Z",
          status: "failed"
        };
      }

      return run;
    });
    const runApi: RunManagementApi = {
      ...baseRunApi,
      getRun
    };

    renderRunRoute("/runs/run-108/execution-plan", runApi);

    expect(await screen.findByRole("heading", { name: "run-108" })).toBeInTheDocument();
    expect(
      screen.getByText("Run status is Cancelled. This run cannot be compiled again.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compile run" })).not.toBeInTheDocument();

    cleanup();

    renderRunRoute("/runs/run-109/execution-plan", runApi);

    expect(await screen.findByRole("heading", { name: "run-109" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Run status is Failed. Execution still reflects older planning revisions and cannot be refreshed here."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open current execution" })).toHaveAttribute(
      "href",
      "/runs/run-109/execution"
    );
  });

  it("compiles a ready run, refreshes live state, and routes into execution", async () => {
    const { fetchMock } = createBrowserRunFetch();
    const { router } = renderRoute("/runs/run-108/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-108" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compile run" }));

    expect(await screen.findByRole("button", { name: "Compiling run..." })).toBeDisabled();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-108/execution");
    });

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        name: "Execution"
      })
    ).toHaveAttribute("href", "/runs/run-108/execution");
    expect(
      countFetchRequests(fetchMock, {
        method: "POST",
        url: "/v1/runs/run-108/compile"
      })
    ).toBe(1);
  });

  it("routes into execution and waits there while a delayed compile materializes the workflow", async () => {
    const emptyWorkflow: NonNullable<StaticRunDetailRecord["workflow"]> = {
      edges: [],
      nodes: [],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 0,
        totalTasks: 0
      }
    };
    const compiledRun = {
      ...runFixtures["run-108"]!.run,
      compiledFrom: buildCompiledFrom(runFixtures["run-108"]!)
    };
    const compiledTasks = runFixtures["run-108"]!.tasks ?? [];
    const compiledWorkflow = runFixtures["run-108"]!.workflow!;
    let workflowRequestCount = 0;
    let compileAccepted = false;

    createBrowserRunFetch({
      "/v1/runs/run-108": () =>
        createRunDetailResponse(compileAccepted ? compiledRun : runFixtures["run-108"]!.run),
      "/v1/runs/run-108/compile": () => {
        compileAccepted = true;

        return createJsonResponse(
          {
            data: {
              run: compiledRun,
              status: "accepted",
              workflowInstanceId: compiledRun.workflowInstanceId
            },
            meta: {
              apiVersion: "v1" as const,
              envelope: "action" as const,
              resourceType: "run" as const
            }
          },
          202
        );
      },
      "/v1/runs/run-108/workflow": () => {
        workflowRequestCount += 1;

        return createWorkflowDetailResponse(
          workflowRequestCount >= 3 ? compiledWorkflow : emptyWorkflow
        );
      },
      "/v1/runs/run-108/tasks": () =>
        createTaskCollectionResponse(workflowRequestCount >= 3 ? compiledTasks : [])
    });

    const { router } = renderRoute("/runs/run-108/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-108" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compile run" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-108/execution");
    });
    expect(await screen.findByText("Execution is materializing")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh execution" }));

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(workflowRequestCount).toBeGreaterThanOrEqual(3);
  });

  it("does not navigate back into an older run when compile acceptance resolves after switching routes", async () => {
    const compiledRun = {
      ...runFixtures["run-108"]!.run,
      compiledFrom: buildCompiledFrom(runFixtures["run-108"]!)
    };
    const deferredCompileResponse = createDeferred<Response>();
    let compileAccepted = false;

    createBrowserRunFetch({
      "/v1/runs/run-108": () =>
        createRunDetailResponse(compileAccepted ? compiledRun : runFixtures["run-108"]!.run),
      "/v1/runs/run-108/compile": () => {
        return deferredCompileResponse.promise;
      }
    });

    const { router } = renderRoute("/runs/run-108/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-108" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compile run" }));

    await router.navigate("/runs/run-104/specification");
    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/runs/run-104/specification");

    compileAccepted = true;
    deferredCompileResponse.resolve(
      createJsonResponse(
        {
          data: {
            run: compiledRun,
            status: "accepted",
            workflowInstanceId: compiledRun.workflowInstanceId
          },
          meta: {
            apiVersion: "v1" as const,
            envelope: "action" as const,
            resourceType: "run" as const
          }
        },
        202
      )
    );

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/specification");
    });
  });

  it("renders a planning-page error state when the current revision cannot be read", async () => {
    const runApi = createRunApi({
      getRunDocumentRevision: vi.fn(async (runId, documentId, documentRevisionId) => {
        if (documentRevisionId === "run-104-specification-v1") {
          throw new Error("Revision load failed.");
        }

        return staticRunApi.getRunDocumentRevision(runId, documentId, documentRevisionId);
      })
    });

    renderRunRoute("/runs/run-104/specification", runApi);

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.getByText("Unable to load specification")).toBeInTheDocument();
    expect(screen.getByText("Revision load failed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("surfaces browser-backed run not-found states without the static seam", async () => {
    createBrowserRunFetch();

    renderRoute("/runs/run-404/specification");

    expect(await screen.findByRole("heading", { name: "Run not found" })).toBeInTheDocument();
    expectRunDetailStateChrome();
    expect(screen.getByText("Run run-404 was not found.")).toBeInTheDocument();
  });

  it("surfaces browser-backed run load failures without falling through to stale content", async () => {
    createBrowserRunFetch({
      "/v1/runs/run-104": () =>
        createErrorResponse({
          code: "request_failed",
          message: "Run detail load exploded.",
          status: 503
        })
    });

    renderRoute("/runs/run-104/specification");

    expect(await screen.findByRole("heading", { name: "Unable to load run" })).toBeInTheDocument();
    expectRunDetailStateChrome();
    expect(screen.getByText("Run detail load exploded.")).toBeInTheDocument();
  });

  it("renders the execution DAG shell from live workflow data", async () => {
    renderRunRoute("/runs/run-104/execution");

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(screen.getByLabelText("Execution summary")).toHaveTextContent(
      "3 tasks · 0 ready · 0 pending · 1 active · 2 completed"
    );
    expect(screen.getByRole("link", { name: /task-030/i })).toHaveAttribute(
      "href",
      "/runs/run-104/execution/tasks/task-030"
    );
    expect(screen.getByRole("link", { name: /task-032/i })).toHaveAttribute(
      "href",
      "/runs/run-104/execution/tasks/task-032"
    );
    expect(screen.getByText("Live run provider cutover")).toBeInTheDocument();
    expect(
      screen.getByText("Workflow rows are grouped by dependency depth in the current workflow graph.")
    ).toBeInTheDocument();
  });

  it("renders an honest execution empty state when compile has not produced a workflow", async () => {
    renderRunRoute("/runs/run-102/execution");

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(
      screen.getByText("Execution becomes available after this run has been compiled.")
    ).toBeInTheDocument();
    const phaseNavigation = screen.getByRole("navigation", { name: "Run phases" });
    const executionStep = within(phaseNavigation)
      .getByText("Execution")
      .closest('[aria-disabled="true"]');

    expect(within(phaseNavigation).queryByRole("link", { name: "Execution" })).not.toBeInTheDocument();
    expect(executionStep).toHaveAttribute("aria-disabled", "true");
  });

  it("renders task artifacts and loads preview content through the authenticated run API seam", async () => {
    renderRunRoute("/runs/run-104/execution/tasks/task-032");

    expect(await screen.findByRole("heading", { name: "run-104 / task-032" })).toBeInTheDocument();
    expect(screen.getByLabelText("Conversation status")).toHaveTextContent(
      "Conversation attached to this task."
    );
    expect(screen.getByText("Depends on")).toBeInTheDocument();
    expect(screen.getByText("Downstream tasks")).toBeInTheDocument();
    expect(await screen.findByText("artifact-task-032-diff")).toBeInTheDocument();
    expect(screen.getByText("artifact-task-032-preview")).toBeInTheDocument();
    expect(screen.getByText("Content type: text/plain; charset=utf-8")).toBeInTheDocument();
    const textArtifactCard = screen.getByText("artifact-task-032-diff").closest("details");
    const unsupportedArtifactCard = screen.getByText("artifact-task-032-preview").closest("details");

    expect(textArtifactCard).not.toBeNull();
    expect(unsupportedArtifactCard).not.toBeNull();
    expect(
      within(textArtifactCard as HTMLElement).getByText(
        /Text preview is available for this artifact and loads on demand through the run API seam/i
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open artifact content" })).not.toBeInTheDocument();
    expect(
      within(unsupportedArtifactCard as HTMLElement).getByText(
        "Preview unavailable in this view because image/png is not text-compatible."
      )
    ).toBeInTheDocument();
    expect(
      within(unsupportedArtifactCard as HTMLElement).queryByRole("button", {
        name: "Load text preview"
      })
    ).not.toBeInTheDocument();
    expect(
      within(textArtifactCard as HTMLElement).getByRole("button", { name: "Load text preview" })
    ).toBeInTheDocument();

    fireEvent.click(
      within(textArtifactCard as HTMLElement).getByRole("button", { name: "Load text preview" })
    );

    expect(
      await within(textArtifactCard as HTMLElement).findByText((content) =>
        content.includes("keep artifact access inside the authenticated run API seam")
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Changed files")).not.toBeInTheDocument();
    expect(screen.queryByText("+ keep task detail scoped to the selected run")).not.toBeInTheDocument();
  });

  it("renders a task-detail error state when artifact metadata fails to load", async () => {
    const runApi = createRunApi({
      listTaskArtifacts: vi.fn(async (runId, taskId) => {
        if (taskId === "task-032") {
          throw new Error("Artifact load failed.");
        }

        return staticRunApi.listTaskArtifacts(runId, taskId);
      })
    });

    renderRunRoute("/runs/run-104/execution/tasks/task-032", runApi);

    expect(await screen.findByRole("heading", { name: "run-104 / task-032" })).toBeInTheDocument();
    expect(await screen.findByText("Unable to load task artifacts")).toBeInTheDocument();
    expect(screen.getByText("Artifact load failed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("surfaces an invalid task route as a truthful not-found state", async () => {
    renderRunRoute("/runs/run-104/execution/tasks/task-999");

    expect(await screen.findByRole("heading", { name: "run-104 / task-999" })).toBeInTheDocument();
    expect(screen.getByText("Task not found")).toBeInTheDocument();
    expect(screen.getByText("Task task-999 was not found for run run-104.")).toBeInTheDocument();
    expect(screen.queryByText("Unexpected Application Error!")).not.toBeInTheDocument();
  });

  it("opens the scaffold run index row into the live run-detail route", async () => {
    const { router } = renderRunRoute("/runs");

    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
    const row = (await screen.findByRole("link", { name: "Run-104" })).closest("tr");

    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByText("Project workspace navigation"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/execution");
    });
    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
  });
});
