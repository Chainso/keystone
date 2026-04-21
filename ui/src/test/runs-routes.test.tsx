// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";

import { serializeProjectListItem } from "../../../src/http/api/v1/projects/contracts";
import type { RunExecutionApi } from "../features/execution/execution-api";
import { renderRoute } from "./render-route";

const defaultTimestamp = new Date("2026-04-20T12:00:00.000Z");
const liveProject = {
  projectId: "project-keystone-cloudflare",
  projectKey: "keystone-cloudflare",
  displayName: "Keystone Cloudflare",
  description: "Internal operator workspace for the Keystone Cloudflare project."
};

interface LiveRunFixture {
  compiledFrom: {
    specificationRevisionId: string;
    architectureRevisionId: string;
    executionPlanRevisionId: string;
    compiledAt: string;
  } | null;
  endedAt: string | null;
  executionEngine: "scripted" | "think_mock" | "think_live";
  projectId: string;
  runId: string;
  startedAt: string | null;
  status: string;
  workflowInstanceId: string;
}

interface LiveTaskFixture {
  conversation: {
    agentClass: string;
    agentName: string;
  } | null;
  dependsOn: string[];
  description: string;
  endedAt: string | null;
  logicalTaskId: string;
  name: string;
  startedAt: string | null;
  status: string;
  taskId: string;
  updatedAt: string;
}

interface LiveArtifactFixture {
  artifactId: string;
  contentType: string;
  contentUrl: string;
  kind: string;
  sha256: string | null;
  sizeBytes: number | null;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json"
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

function buildProjectsResponse() {
  return {
    data: {
      items: [
        serializeProjectListItem({
          projectId: liveProject.projectId,
          projectKey: liveProject.projectKey,
          displayName: liveProject.displayName,
          description: liveProject.description,
          createdAt: defaultTimestamp,
          updatedAt: defaultTimestamp
        })
      ],
      total: 1
    },
    meta: {
      apiVersion: "v1" as const,
      envelope: "collection" as const,
      resourceType: "project" as const
    }
  };
}

function createLiveRunFixture(overrides: Partial<LiveRunFixture> = {}): LiveRunFixture {
  return {
    compiledFrom: null,
    endedAt: null,
    executionEngine: "scripted",
    projectId: liveProject.projectId,
    runId: "run-live-201",
    startedAt: "2026-04-20T12:00:00.000Z",
    status: "running",
    workflowInstanceId: "wf-live-201",
    ...overrides
  };
}

function createLiveTaskFixture(overrides: Partial<LiveTaskFixture> = {}): LiveTaskFixture {
  return {
    conversation: null,
    dependsOn: [],
    description: "Live task detail for execution cutover tests.",
    endedAt: null,
    logicalTaskId: "TASK-LIVE-001",
    name: "Compile execution context",
    startedAt: null,
    status: "ready",
    taskId: "task-live-001",
    updatedAt: "2026-04-20T12:00:00.000Z",
    ...overrides
  };
}

function createLiveArtifactFixture(overrides: Partial<LiveArtifactFixture> = {}): LiveArtifactFixture {
  return {
    artifactId: "artifact-task-log-1",
    contentType: "text/plain",
    contentUrl: "/v1/artifacts/artifact-task-log-1/content",
    kind: "task_log",
    sha256: "sha256-task-log-1",
    sizeBytes: 128,
    ...overrides
  };
}

function buildRunResource(run: LiveRunFixture) {
  return {
    resourceType: "run" as const,
    scaffold: {
      implementation: "reused" as const,
      note: null
    },
    runId: run.runId,
    projectId: run.projectId,
    workflowInstanceId: run.workflowInstanceId,
    executionEngine: run.executionEngine,
    status: run.status,
    compiledFrom: run.compiledFrom,
    startedAt: run.startedAt,
    endedAt: run.endedAt
  };
}

function buildTaskResource(runId: string, task: LiveTaskFixture) {
  return {
    resourceType: "task" as const,
    scaffold: {
      implementation: "reused" as const,
      note: null
    },
    runId,
    taskId: task.taskId,
    logicalTaskId: task.logicalTaskId,
    name: task.name,
    description: task.description,
    status: task.status,
    dependsOn: task.dependsOn,
    conversation: task.conversation,
    updatedAt: task.updatedAt,
    startedAt: task.startedAt,
    endedAt: task.endedAt
  };
}

function buildWorkflowResource(runId: string, tasks: LiveTaskFixture[]) {
  return {
    resourceType: "workflow_graph" as const,
    scaffold: {
      implementation: "projected" as const,
      note: "Projected from run_tasks and run_task_dependencies."
    },
    nodes: tasks.map((task) => ({
      taskId: task.taskId,
      name: task.name,
      status: task.status,
      dependsOn: task.dependsOn
    })),
    edges: tasks.flatMap((task) =>
      task.dependsOn.map((dependencyId) => ({
        fromTaskId: dependencyId,
        toTaskId: task.taskId
      }))
    ),
    summary: {
      totalTasks: tasks.length,
      activeTasks: tasks.filter((task) => task.status === "active").length,
      pendingTasks: tasks.filter((task) => task.status === "pending").length,
      completedTasks: tasks.filter((task) => task.status === "completed").length,
      readyTasks: tasks.filter((task) => task.status === "ready").length,
      failedTasks: tasks.filter((task) => task.status === "failed").length,
      cancelledTasks: tasks.filter((task) => task.status === "cancelled").length
    }
  };
}

function buildArtifactResource(artifact: LiveArtifactFixture) {
  return {
    resourceType: "artifact" as const,
    scaffold: {
      implementation: "reused" as const,
      note: null
    },
    artifactId: artifact.artifactId,
    kind: artifact.kind,
    contentType: artifact.contentType,
    sizeBytes: artifact.sizeBytes,
    sha256: artifact.sha256,
    contentUrl: artifact.contentUrl
  };
}

function stubLiveRunRouteFetch(input: {
  artifactsByTaskId?: Record<string, LiveArtifactFixture[]>;
  run?: LiveRunFixture;
  taskDetailsByTaskId?: Record<string, LiveTaskFixture>;
  tasks: LiveTaskFixture[];
}) {
  const run = input.run ?? createLiveRunFixture();
  const taskDetailsByTaskId = input.taskDetailsByTaskId ?? {};
  const artifactsByTaskId = input.artifactsByTaskId ?? {};
  const taskCollection = input.tasks.map((task) => buildTaskResource(run.runId, task));
  const workflow = buildWorkflowResource(run.runId, input.tasks);

  const fetchMock = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof request === "string" ? request : request.toString();
    const method = request instanceof Request ? request.method : init?.method ?? "GET";

    expectDevAuthHeaders(request, init);

    if (url === "/v1/projects" && method === "GET") {
      return createJsonResponse(buildProjectsResponse());
    }

    if (url === `/v1/runs/${run.runId}` && method === "GET") {
      return createJsonResponse({
        data: buildRunResource(run),
        meta: {
          apiVersion: "v1" as const,
          envelope: "detail" as const,
          resourceType: "run" as const
        }
      });
    }

    if (url === `/v1/runs/${run.runId}/workflow` && method === "GET") {
      return createJsonResponse({
        data: workflow,
        meta: {
          apiVersion: "v1" as const,
          envelope: "detail" as const,
          resourceType: "workflow_graph" as const
        }
      });
    }

    if (url === `/v1/runs/${run.runId}/tasks` && method === "GET") {
      return createJsonResponse({
        data: {
          items: taskCollection,
          total: taskCollection.length
        },
        meta: {
          apiVersion: "v1" as const,
          envelope: "collection" as const,
          resourceType: "task" as const
        }
      });
    }

    const taskArtifactMatch = url.match(/^\/v1\/runs\/([^/]+)\/tasks\/([^/]+)\/artifacts$/);

    if (taskArtifactMatch && method === "GET") {
      const requestedRunId = decodeURIComponent(taskArtifactMatch[1]!);
      const taskId = decodeURIComponent(taskArtifactMatch[2]!);

      if (requestedRunId !== run.runId) {
        throw new Error(`Unexpected fetch request: ${method} ${url}`);
      }

      return createJsonResponse({
        data: {
          items: (artifactsByTaskId[taskId] ?? []).map(buildArtifactResource),
          total: (artifactsByTaskId[taskId] ?? []).length
        },
        meta: {
          apiVersion: "v1" as const,
          envelope: "collection" as const,
          resourceType: "artifact" as const
        }
      });
    }

    const taskMatch = url.match(/^\/v1\/runs\/([^/]+)\/tasks\/([^/]+)$/);

    if (taskMatch && method === "GET") {
      const requestedRunId = decodeURIComponent(taskMatch[1]!);
      const taskId = decodeURIComponent(taskMatch[2]!);

      if (requestedRunId !== run.runId) {
        throw new Error(`Unexpected fetch request: ${method} ${url}`);
      }

      const task =
        taskDetailsByTaskId[taskId] ?? input.tasks.find((candidate) => candidate.taskId === taskId);

      if (!task) {
        return createJsonResponse(
          {
            error: {
              code: "task_not_found",
              message: `Task ${taskId} was not found for run ${run.runId}.`
            }
          },
          404
        );
      }

      return createJsonResponse({
        data: buildTaskResource(run.runId, task),
        meta: {
          apiVersion: "v1" as const,
          envelope: "detail" as const,
          resourceType: "task" as const
        }
      });
    }

    throw new Error(`Unexpected fetch request: ${method} ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function createExecutionApiStub(input: {
  artifactsByTaskId?: Record<string, Error | LiveArtifactFixture[]>;
  run?: Error | ReturnType<typeof buildRunResource>;
  taskDetailsByTaskId?: Record<string, Error | unknown>;
  tasks?: Error | unknown[];
  workflow?: Error | ReturnType<typeof buildWorkflowResource>;
}): RunExecutionApi {
  const run =
    input.run ??
    buildRunResource(createLiveRunFixture());
  const tasks = input.tasks ?? [];
  const workflow =
    input.workflow ??
    buildWorkflowResource(
      run instanceof Error ? "run-live-201" : run.runId,
      []
    );

  return {
    async getRun() {
      if (run instanceof Error) {
        throw run;
      }

      return run;
    },
    async getRunTask(_runId, taskId) {
      const value =
        input.taskDetailsByTaskId?.[taskId] ??
        (Array.isArray(tasks)
          ? tasks.find(
              (candidate): candidate is { taskId: string } =>
                typeof candidate === "object" &&
                candidate !== null &&
                "taskId" in candidate &&
                candidate.taskId === taskId
            )
          : undefined);

      if (value instanceof Error) {
        throw value;
      }

      if (!value) {
        throw new Error(`Task ${taskId} was not found.`);
      }

      return value as never;
    },
    async getRunWorkflow() {
      if (workflow instanceof Error) {
        throw workflow;
      }

      return workflow;
    },
    async listRunTaskArtifacts(_runId, taskId) {
      const value = input.artifactsByTaskId?.[taskId] ?? [];

      if (value instanceof Error) {
        throw value;
      }

      return value.map(buildArtifactResource);
    },
    async listRunTasks() {
      if (tasks instanceof Error) {
        throw tasks;
      }

      return tasks as never;
    }
  };
}

describe("Run routes", () => {
  it("redirects /runs/:runId to the derived default phase", async () => {
    const { router } = renderRoute("/runs/run-104");

    expect(await screen.findByRole("heading", { name: "Run-104" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/execution");
    });
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        name: "Execution"
      })
    ).toHaveAttribute("href", "/runs/run-104/execution");
    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(screen.getByText("Project workspace navigation")).toBeInTheDocument();
  });

  it("redirects run-102 to execution-plan when no compiled tasks exist", async () => {
    const { router } = renderRoute("/runs/run-102");

    expect(await screen.findByRole("heading", { name: "Run-102" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-102/execution-plan");
    });
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        name: "Execution Plan"
      })
    ).toHaveAttribute("href", "/runs/run-102/execution-plan");
    const navigation = screen.getByRole("navigation", { name: "Run phases" });
    expect(within(navigation).queryByRole("link", { name: "Execution" })).not.toBeInTheDocument();
    expect(within(navigation).getByText("Execution").closest(".run-step-link")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(
      await screen.findByRole("heading", { name: "Execution Plan conversation" })
    ).toBeInTheDocument();
  });

  it("redirects run-103 to architecture when execution-plan is unavailable", async () => {
    const { router } = renderRoute("/runs/run-103");

    expect(await screen.findByRole("heading", { name: "Run-103" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-103/architecture");
    });
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        name: "Architecture"
      })
    ).toHaveAttribute("href", "/runs/run-103/architecture");
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        name: "Execution"
      })
    ).toHaveAttribute("href", "/runs/run-103/execution");
    expect(
      await screen.findByRole("heading", { name: "Architecture conversation" })
    ).toBeInTheDocument();
  });

  it("redirects run-101 to specification when only the specification doc exists", async () => {
    const { router } = renderRoute("/runs/run-101");

    expect(await screen.findByRole("heading", { name: "Run-101" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-101/specification");
    });
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        name: "Specification"
      })
    ).toHaveAttribute("href", "/runs/run-101/specification");
    expect(
      await screen.findByRole("heading", { name: "Specification conversation" })
    ).toBeInTheDocument();
  });

  it("renders run index rows with run-detail navigation targets", async () => {
    const { router } = renderRoute("/runs");

    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Run-104" })).toHaveAttribute(
      "href",
      "/runs/run-104"
    );
    expect(screen.getByRole("link", { name: "Run-103" })).toHaveAttribute("href", "/runs/run-103");
    expect(screen.getByText("Execution Plan")).toBeInTheDocument();

    const row = screen.getByRole("link", { name: "Run-104" }).closest("tr");

    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByText("Project workspace navigation"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/execution");
    });
  });

  it.each([
    {
      path: "/runs/run-104/specification",
      title: "Specification conversation",
      document: "Living product spec",
      documentPath: "runs/run-104/specification/product-spec.md"
    },
    {
      path: "/runs/run-104/architecture",
      title: "Architecture conversation",
      document: "Living architecture doc",
      documentPath: "runs/run-104/architecture/architecture.md"
    },
    {
      path: "/runs/run-104/execution-plan",
      title: "Execution Plan conversation",
      document: "Execution plan doc",
      documentPath: "runs/run-104/execution-plan/execution-plan.md"
    }
  ])(
    "renders the planning workspace from document and conversation locator data for $path",
    async ({ path, title, document, documentPath }) => {
      renderRoute(path);

      expect(await screen.findByRole("heading", { name: "Run-104" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: document })).toBeInTheDocument();
      expect(screen.getByLabelText("Conversation status")).toHaveTextContent(
        "Conversation attached to this document."
      );
      expect(screen.getByLabelText("Conversation status")).not.toHaveTextContent(
        "document-conversation"
      );
      expect(screen.getByText(documentPath)).toBeInTheDocument();
      expect(screen.queryByRole("textbox", { name: "Message composer" })).not.toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "Run phases" })).toBeInTheDocument();
    }
  );

  it("renders the execution DAG shell", async () => {
    const { container } = renderRoute("/runs/run-104/execution");

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Run shell navigation/i })).toHaveAttribute(
      "href",
      "/runs/run-104/execution/tasks/task-032"
    );
    expect(screen.getByRole("link", { name: /Task detail routing/i })).toHaveAttribute(
      "href",
      "/runs/run-104/execution/tasks/task-033"
    );
    expect(
      screen.getByText("Workflow rows are grouped by dependency depth in the current workflow graph.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Depth 4: sibling tasks share dependency depth; left-to-right position is not ordered."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Click a task node to open that task inside Execution.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Execution summary")).not.toBeInTheDocument();

    const branchRow = container.querySelector(".execution-dag-row-branch");
    const rows = [...container.querySelectorAll(".execution-dag-row")];

    expect(rows).toHaveLength(5);
    expect(within(rows[0] as HTMLElement).getByText("Specification outline")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("Architecture decisions")).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText("Execution plan")).toBeInTheDocument();
    expect(branchRow).not.toBeNull();
    expect(within(branchRow as HTMLElement).getByText("Run shell navigation")).toBeInTheDocument();
    expect(within(branchRow as HTMLElement).getByText("Documentation grouping")).toBeInTheDocument();
    expect(within(rows[4] as HTMLElement).getByText("Task detail routing")).toBeInTheDocument();
    expect(branchRow?.querySelectorAll(".execution-node .execution-dag-arrow")).toHaveLength(0);
  });

  it("renders the task detail split inside execution", async () => {
    renderRoute("/runs/run-104/execution/tasks/task-032");

    expect(await screen.findByRole("heading", { name: "Run-104 / TASK-032" })).toBeInTheDocument();
    expect(screen.getByLabelText("Conversation status")).toHaveTextContent(
      "Conversation attached to this task."
    );
    expect(screen.getByLabelText("Conversation status")).not.toHaveTextContent("task-conversation");
    expect(screen.getByRole("heading", { name: "Artifacts and review" })).toBeInTheDocument();
    expect(screen.getByText("Changed files")).toBeInTheDocument();
    expect(screen.getByText("TASK-031")).toBeInTheDocument();
    const routeArtifactCard = screen
      .getByText("ui/src/routes/runs/task-detail-route.tsx")
      .closest("details");
    const workspaceArtifactCard = screen
      .getByText("ui/src/features/execution/components/execution-workspace.tsx")
      .closest("details");

    expect(routeArtifactCard).not.toBeNull();
    expect(routeArtifactCard).toHaveTextContent("Task detail route behavior.");
    expect(routeArtifactCard).toHaveTextContent("+ keep task detail scoped to the selected run");
    expect(workspaceArtifactCard).not.toBeNull();
    expect(workspaceArtifactCard).toHaveTextContent("Workflow DAG surface.");
    expect(screen.queryByText("No artifacts recorded for this task yet.")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Steer this task" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to DAG" })).toHaveAttribute(
      "href",
      "/runs/run-104/execution"
    );
  });

  it("surfaces an invalid task route through the route error boundary", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      renderRoute("/runs/run-104/execution/tasks/task-999");

      expect(await screen.findByText("Unexpected Application Error!")).toBeInTheDocument();
      expect(
        screen.getByText(
          'Task route "/runs/run-104/execution/tasks/task-999" does not match any known execution task.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Artifacts and review" })).not.toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("cuts live runs over to execution and disables planning phases", async () => {
    const liveRun = createLiveRunFixture();
    const liveTasks = [
      createLiveTaskFixture({
        logicalTaskId: "TASK-LIVE-001",
        name: "Compile execution context",
        status: "completed",
        taskId: "task-live-001"
      }),
      createLiveTaskFixture({
        conversation: {
          agentClass: "task_session",
          agentName: "task-session-live-002"
        },
        dependsOn: ["task-live-001"],
        logicalTaskId: "TASK-LIVE-002",
        name: "Run execution shell",
        startedAt: "2026-04-20T12:10:00.000Z",
        status: "active",
        taskId: "task-live-002",
        updatedAt: "2026-04-20T12:14:00.000Z"
      }),
      createLiveTaskFixture({
        dependsOn: ["task-live-002"],
        logicalTaskId: "task-live-003",
        name: "Task detail drill-in",
        status: "blocked",
        taskId: "task-live-003",
        updatedAt: "2026-04-20T12:16:00.000Z"
      }),
      createLiveTaskFixture({
        dependsOn: ["task-live-003"],
        logicalTaskId: "TASK-LIVE-004",
        name: "Workstreams follow-on",
        status: "pending",
        taskId: "task-live-004",
        updatedAt: "2026-04-20T12:18:00.000Z"
      })
    ];

    stubLiveRunRouteFetch({
      run: liveRun,
      tasks: liveTasks
    });

    const { router } = renderRoute(`/runs/${liveRun.runId}`, { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: liveRun.runId })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/runs/${liveRun.runId}/execution`);
    });
    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(screen.queryByText("Project workspace navigation")).not.toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "Run phases" });

    expect(within(navigation).getByRole("link", { name: "Execution" })).toHaveAttribute(
      "href",
      `/runs/${liveRun.runId}/execution`
    );
    expect(within(navigation).getByText("Specification").closest(".run-step-link")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(within(navigation).getByText("Architecture").closest(".run-step-link")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(within(navigation).getByText("Execution Plan").closest(".run-step-link")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(await screen.findByRole("link", { name: /Run execution shell/i })).toHaveAttribute(
      "href",
      `/runs/${liveRun.runId}/execution/tasks/task-live-002`
    );
    expect(await screen.findByRole("link", { name: /Task detail drill-in/i })).toHaveAttribute(
      "href",
      `/runs/${liveRun.runId}/execution/tasks/task-live-003`
    );
  });

  it("renders live task detail with dependency resolution and raw artifact links", async () => {
    const liveRun = createLiveRunFixture();
    const liveTasks = [
      createLiveTaskFixture({
        logicalTaskId: "TASK-LIVE-001",
        name: "Compile execution context",
        status: "completed",
        taskId: "task-live-001"
      }),
      createLiveTaskFixture({
        conversation: {
          agentClass: "task_session",
          agentName: "task-session-live-002"
        },
        dependsOn: ["task-live-001"],
        logicalTaskId: "TASK-LIVE-002",
        name: "Run execution shell",
        startedAt: "2026-04-20T12:10:00.000Z",
        status: "active",
        taskId: "task-live-002",
        updatedAt: "2026-04-20T12:14:00.000Z"
      }),
      createLiveTaskFixture({
        dependsOn: ["task-live-002"],
        logicalTaskId: "task-live-003",
        name: "Task detail drill-in",
        status: "blocked",
        taskId: "task-live-003",
        updatedAt: "2026-04-20T12:16:00.000Z"
      }),
      createLiveTaskFixture({
        dependsOn: ["task-live-003"],
        logicalTaskId: "TASK-LIVE-004",
        name: "Workstreams follow-on",
        status: "pending",
        taskId: "task-live-004",
        updatedAt: "2026-04-20T12:18:00.000Z"
      })
    ];

    stubLiveRunRouteFetch({
      artifactsByTaskId: {
        "task-live-003": [createLiveArtifactFixture()]
      },
      run: liveRun,
      tasks: liveTasks
    });

    renderRoute(`/runs/${liveRun.runId}/execution/tasks/task-live-003`, {
      useBrowserProjectApi: true
    });

    expect(
      await screen.findByRole("heading", { name: `${liveRun.runId} / task-live-003` })
    ).toBeInTheDocument();
    expect(await screen.findByLabelText("Conversation status")).toHaveTextContent(
      "No conversation is attached to this task yet."
    );
    expect(await screen.findByText("Execution artifacts")).toBeInTheDocument();
    expect(
      screen.getByText(
        "File-level review metadata is not part of the live artifact contract yet. Raw artifact links are shown instead."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("TASK-LIVE-002")).toBeInTheDocument();
    expect(screen.getByText("TASK-LIVE-004")).toBeInTheDocument();
    expect(screen.getByText("artifact-task-log-1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to DAG" })).toHaveAttribute(
      "href",
      `/runs/${liveRun.runId}/execution`
    );
    expect(screen.getByRole("link", { name: "Open raw artifact" })).toHaveAttribute(
      "href",
      "/v1/artifacts/artifact-task-log-1/content"
    );
  });

  it("falls back to taskId in live task detail headings and dependency rows", async () => {
    const liveRun = createLiveRunFixture();
    const dependencyTask = {
      ...buildTaskResource(
        liveRun.runId,
        createLiveTaskFixture({
          logicalTaskId: "TASK-LIVE-001",
          name: "Compile execution context",
          status: "completed",
          taskId: "task-live-001"
        })
      ),
      logicalTaskId: undefined
    };
    const currentTask = {
      ...buildTaskResource(
        liveRun.runId,
        createLiveTaskFixture({
          dependsOn: ["task-live-001"],
          logicalTaskId: "TASK-LIVE-002",
          name: "Run execution shell",
          status: "active",
          taskId: "task-live-002"
        })
      ),
      logicalTaskId: undefined
    };
    const blockedTask = {
      ...buildTaskResource(
        liveRun.runId,
        createLiveTaskFixture({
          dependsOn: ["task-live-002"],
          logicalTaskId: "TASK-LIVE-003",
          name: "Task detail drill-in",
          status: "blocked",
          taskId: "task-live-003"
        })
      ),
      logicalTaskId: undefined
    };

    renderRoute(`/runs/${liveRun.runId}/execution/tasks/task-live-002`, {
      executionApi: createExecutionApiStub({
        run: buildRunResource(liveRun),
        taskDetailsByTaskId: {
          "task-live-002": currentTask
        },
        tasks: [dependencyTask, currentTask, blockedTask]
      }),
      project: liveProject
    });

    expect(
      await screen.findByRole("heading", { name: `${liveRun.runId} / task-live-002` })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Depends on")).toHaveTextContent("task-live-001");
    expect(screen.getByLabelText("Blocked by")).toHaveTextContent("task-live-003");
  });

  it("renders an empty live execution state when the workflow has no tasks", async () => {
    const liveRun = createLiveRunFixture();

    renderRoute(`/runs/${liveRun.runId}/execution`, {
      executionApi: createExecutionApiStub({
        run: buildRunResource(liveRun),
        tasks: [],
        workflow: buildWorkflowResource(liveRun.runId, [])
      }),
      project: liveProject
    });

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(await screen.findByText("No execution tasks yet")).toBeInTheDocument();
    expect(
      screen.getByText(`${liveRun.runId} does not have any execution tasks to render yet.`)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Execution workflow graph")).not.toBeInTheDocument();
  });

  it("surfaces live run-task loading failures in the execution compatibility state", async () => {
    const liveRun = createLiveRunFixture();

    renderRoute(`/runs/${liveRun.runId}/execution`, {
      executionApi: createExecutionApiStub({
        run: buildRunResource(liveRun),
        tasks: new Error("Unable to load run tasks."),
        workflow: buildWorkflowResource(liveRun.runId, [])
      }),
      project: liveProject
    });

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(await screen.findByText("Unable to load execution")).toBeInTheDocument();
    expect(screen.getByText("Unable to load run tasks.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("surfaces inconsistent live workflow dependencies instead of flattening them into the graph", async () => {
    const liveRun = createLiveRunFixture();
    const task = buildTaskResource(
      liveRun.runId,
      createLiveTaskFixture({
        dependsOn: ["task-live-missing"],
        logicalTaskId: "TASK-LIVE-002",
        name: "Run execution shell",
        status: "active",
        taskId: "task-live-002"
      })
    );

    renderRoute(`/runs/${liveRun.runId}/execution`, {
      executionApi: createExecutionApiStub({
        run: buildRunResource(liveRun),
        tasks: [task],
        workflow: {
          resourceType: "workflow_graph",
          scaffold: {
            implementation: "projected",
            note: "Projected from run_tasks and run_task_dependencies."
          },
          nodes: [
            {
              dependsOn: ["task-live-missing"],
              name: "Run execution shell",
              status: "active",
              taskId: "task-live-002"
            }
          ],
          edges: [
            {
              fromTaskId: "task-live-missing",
              toTaskId: "task-live-002"
            }
          ],
          summary: {
            activeTasks: 1,
            cancelledTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            pendingTasks: 0,
            readyTasks: 0,
            totalTasks: 1
          }
        }
      }),
      project: liveProject
    });

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(await screen.findByText("Unable to load execution")).toBeInTheDocument();
    expect(
      screen.getByText(
        `Workflow graph for run "${liveRun.runId}" references missing dependency task "task-live-missing".`
      )
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Execution workflow graph")).not.toBeInTheDocument();
  });

  it("renders a distinct empty-artifacts state for live task detail", async () => {
    const liveRun = createLiveRunFixture();
    const liveTasks = [
      buildTaskResource(
        liveRun.runId,
        createLiveTaskFixture({
          logicalTaskId: "TASK-LIVE-001",
          name: "Compile execution context",
          status: "completed",
          taskId: "task-live-001"
        })
      ),
      buildTaskResource(
        liveRun.runId,
        createLiveTaskFixture({
          dependsOn: ["task-live-001"],
          logicalTaskId: "TASK-LIVE-002",
          name: "Run execution shell",
          status: "active",
          taskId: "task-live-002"
        })
      )
    ];

    renderRoute(`/runs/${liveRun.runId}/execution/tasks/task-live-002`, {
      executionApi: createExecutionApiStub({
        artifactsByTaskId: {
          "task-live-002": []
        },
        run: buildRunResource(liveRun),
        taskDetailsByTaskId: {
          "task-live-002": liveTasks[1]
        },
        tasks: liveTasks
      }),
      project: liveProject
    });

    expect(
      await screen.findByRole("heading", { name: `${liveRun.runId} / TASK-LIVE-002` })
    ).toBeInTheDocument();
    expect(screen.getByText("No artifacts recorded for this task yet.")).toBeInTheDocument();
    expect(screen.queryByText("Unable to load task artifacts.")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "File-level review metadata is not part of the live artifact contract yet. Raw artifact links are shown instead."
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open raw artifact" })).not.toBeInTheDocument();
  });

  it("renders a distinct artifact error state for live task detail", async () => {
    const liveRun = createLiveRunFixture();
    const liveTasks = [
      buildTaskResource(
        liveRun.runId,
        createLiveTaskFixture({
          logicalTaskId: "TASK-LIVE-001",
          name: "Compile execution context",
          status: "completed",
          taskId: "task-live-001"
        })
      ),
      buildTaskResource(
        liveRun.runId,
        createLiveTaskFixture({
          dependsOn: ["task-live-001"],
          logicalTaskId: "TASK-LIVE-002",
          name: "Run execution shell",
          status: "active",
          taskId: "task-live-002"
        })
      )
    ];

    renderRoute(`/runs/${liveRun.runId}/execution/tasks/task-live-002`, {
      executionApi: createExecutionApiStub({
        artifactsByTaskId: {
          "task-live-002": new Error("artifact fetch failed")
        },
        run: buildRunResource(liveRun),
        taskDetailsByTaskId: {
          "task-live-002": liveTasks[1]
        },
        tasks: liveTasks
      }),
      project: liveProject
    });

    expect(
      await screen.findByRole("heading", { name: `${liveRun.runId} / TASK-LIVE-002` })
    ).toBeInTheDocument();
    expect(screen.getByText("Unable to load task artifacts.")).toBeInTheDocument();
    expect(screen.queryByText("No artifacts recorded for this task yet.")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "File-level review metadata is not part of the live artifact contract yet. Raw artifact links are shown instead."
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open raw artifact" })).not.toBeInTheDocument();
  });
});
