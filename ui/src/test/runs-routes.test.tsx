// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";

import type { RunManagementApi, StaticRunDetailRecord } from "../features/runs/run-management-api";
import { createStaticRunManagementApi } from "../features/runs/run-management-api";
import { renderRoute } from "./render-route";

afterEach(() => {
  cleanup();
});

function createDeferred<T>() {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve(value: T) {
      resolvePromise?.(value);
    }
  };
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
          }
        ]
      },
      tasks: [
        {
          conversation: null,
          dependsOn: [],
          description: "Draft the run specification.",
          endedAt: "2026-04-20T12:35:00.000Z",
          name: "Specification outline",
          runId: "run-104",
          startedAt: "2026-04-20T12:31:00.000Z",
          status: "completed",
          taskId: "task-030"
        },
        {
          conversation: null,
          dependsOn: ["task-030"],
          description: "Translate the specification into architecture decisions.",
          endedAt: "2026-04-20T12:42:00.000Z",
          name: "Architecture decisions",
          runId: "run-104",
          startedAt: "2026-04-20T12:36:00.000Z",
          status: "completed",
          taskId: "task-031"
        },
        {
          conversation: {
            agentClass: "KeystoneThinkAgent",
            agentName: "tenant:tenant-dev-local:run:run-104:task:task-032"
          },
          dependsOn: ["task-031"],
          description: "Implement the live run-detail provider.",
          endedAt: null,
          name: "Live run provider cutover",
          runId: "run-104",
          startedAt: "2026-04-20T12:43:00.000Z",
          status: "active",
          taskId: "task-032"
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
  }
};

const staticRunApi = createStaticRunManagementApi(runFixtures);

function renderRunRoute(initialEntry: string, runApi: RunManagementApi = staticRunApi) {
  return renderRoute(initialEntry, { runApi });
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

function createBrowserRunFetch(
  overrides: Record<string, (() => Promise<Response> | Response) | undefined> = {}
) {
  const fetchMock = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof request === "string" ? request : request.toString();
    const method = request instanceof Request ? request.method : init?.method ?? "GET";

    expect(method).toBe("GET");
    expectDevAuthHeaders(request, init);

    const override = overrides[url];

    if (override) {
      return await override();
    }

    const runMatch = url.match(/^\/v1\/runs\/([^/]+)$/);

    if (runMatch) {
      const runId = decodeURIComponent(runMatch[1]!);
      const run = runFixtures[runId];

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

    const runDocumentsMatch = url.match(/^\/v1\/runs\/([^/]+)\/documents$/);

    if (runDocumentsMatch) {
      const runId = decodeURIComponent(runDocumentsMatch[1]!);
      const run = runFixtures[runId];

      return run
        ? createJsonResponse({
            data: {
              items: run.documents ?? [],
              total: run.documents?.length ?? 0
            },
            meta: {
              apiVersion: "v1" as const,
              envelope: "collection" as const,
              resourceType: "document" as const
            }
          })
        : createErrorResponse({
            code: "run_not_found",
            message: `Run ${runId} was not found.`,
            status: 404
          });
    }

    const runDocumentRevisionMatch = url.match(
      /^\/v1\/runs\/([^/]+)\/documents\/([^/]+)\/revisions\/([^/]+)$/
    );

    if (runDocumentRevisionMatch) {
      const runId = decodeURIComponent(runDocumentRevisionMatch[1]!);
      const documentId = decodeURIComponent(runDocumentRevisionMatch[2]!);
      const documentRevisionId = decodeURIComponent(runDocumentRevisionMatch[3]!);
      const run = runFixtures[runId];
      const revision = run?.revisions?.find(
        (candidate) =>
          candidate.revision.documentRevisionId === documentRevisionId &&
          run.documents?.some((document) => document.documentId === documentId)
      );

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

    const runWorkflowMatch = url.match(/^\/v1\/runs\/([^/]+)\/workflow$/);

    if (runWorkflowMatch) {
      const runId = decodeURIComponent(runWorkflowMatch[1]!);
      const run = runFixtures[runId];

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
      const run = runFixtures[runId];

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
      const run = runFixtures[runId];

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

    for (const run of Object.values(runFixtures)) {
      const revisionRecord = run.revisions?.find(
        (candidate) => candidate.revision.contentUrl === url
      );

      if (revisionRecord) {
        return createTextResponse(revisionRecord.content);
      }

      const artifactContent = run.artifactContents?.[url];

      if (artifactContent) {
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

  it("redirects a run without compile provenance to the first incomplete planning step", async () => {
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

  it("renders the loading state before the live run provider resolves", async () => {
    const deferredRun = createDeferred<StaticRunDetailRecord["run"]>();
    const runApi = createRunApi({
      getRun: vi.fn(async () => deferredRun.promise)
    });

    renderRunRoute("/runs/run-104/specification", runApi);

    expect(await screen.findByRole("heading", { name: "Loading run" })).toBeInTheDocument();

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

    expect(screen.getByRole("heading", { name: "Loading run" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "run-101" })).not.toBeInTheDocument();

    deferredRun.resolve(runFixtures["run-104"]!.run);

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
  });

  it("renders truthful planning document content from the live run API", async () => {
    renderRunRoute("/runs/run-104/specification");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Specification conversation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Run Specification" })).toBeInTheDocument();
    expect(screen.getByText("specification")).toBeInTheDocument();
    expect(screen.getByLabelText("Conversation status")).toHaveTextContent(
      "Conversation attached to this document."
    );
    expect(screen.getByText("- Replace scaffold run detail with live data.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Message composer" })).not.toBeInTheDocument();
  });

  it("renders live architecture and execution-plan pages through the browser run provider", async () => {
    const { fetchMock } = createBrowserRunFetch();

    renderRoute("/runs/run-104/architecture");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Run Architecture" })).toBeInTheDocument();
    expect(screen.getByText("- Keep route files thin.")).toBeInTheDocument();

    cleanup();

    renderRoute("/runs/run-104/execution-plan");

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Execution Plan" })).toBeInTheDocument();
    expect(screen.getByText("- Cut over the live provider seam.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("renders a read-only empty state when a planning document has no current revision", async () => {
    renderRunRoute("/runs/run-105/architecture");

    expect(await screen.findByRole("heading", { name: "run-105" })).toBeInTheDocument();
    expect(screen.getByText("No current architecture revision")).toBeInTheDocument();
    expect(
      screen.getByText(/Editing is not available on the live run path yet\./i)
    ).toBeInTheDocument();
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
    expect(screen.getByText("Content type: text/plain; charset=utf-8")).toBeInTheDocument();
    expect(screen.getByText(/Artifact content in this view loads through the authenticated run API/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open artifact content" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Load content preview" }));

    expect(
      await screen.findByText((content) =>
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
