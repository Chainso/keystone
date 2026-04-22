// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EntityTable, type EntityTableColumn } from "../components/workspace/entity-table";
import { currentProjectStorageKey, type CurrentProject } from "../features/projects/project-context";
import { createStaticProjectManagementApi } from "../features/projects/project-management-api";
import {
  createStaticRunManagementApi,
  type StaticRunDetailRecord
} from "../features/runs/run-management-api";
import { WorkstreamsBoard } from "../features/workstreams/components/workstreams-board";
import {
  buildEmptyState,
  resolveTaskDisplayId
} from "../features/workstreams/use-workstreams-view-model";
import { renderRoute } from "./render-route";
import {
  type ProjectTaskFilter,
  serializeProjectListItem,
  serializeProjectResource
} from "../../../src/http/api/v1/projects/contracts";

const defaultTimestamp = new Date("2026-04-20T12:00:00.000Z");
const scaffoldProject: CurrentProject = {
  projectId: "project-keystone-cloudflare",
  projectKey: "keystone-cloudflare",
  displayName: "Keystone Cloudflare",
  description: "Internal operator workspace for the Keystone Cloudflare project."
};
const workstreamRunFixtures: StaticRunDetailRecord[] = [
  {
    run: {
      compiledFrom: {
        architectureRevisionId: "run-101-architecture-v1",
        compiledAt: "2026-04-20T12:12:00.000Z",
        executionPlanRevisionId: "run-101-execution-plan-v1",
        specificationRevisionId: "run-101-specification-v1"
      },
      endedAt: null,
      executionEngine: "scripted",
      projectId: scaffoldProject.projectId,
      runId: "run-101",
      startedAt: "2026-04-20T12:00:00.000Z",
      status: "active",
      workflowInstanceId: "wf-run-101"
    },
    taskArtifacts: {},
    tasks: [
      {
        conversation: {
          agentClass: "KeystoneThinkAgent",
          agentName: "tenant:tenant-dev-local:run:run-101:task:task-019"
        },
        dependsOn: [],
        description: "Preserve canonical task links from Workstreams into Runs.",
        endedAt: null,
        logicalTaskId: "TASK-019",
        name: "Blocked task visibility",
        runId: "run-101",
        startedAt: "2026-04-20T12:01:00.000Z",
        status: "blocked",
        taskId: "task-019",
        updatedAt: "2026-04-20T12:01:00.000Z"
      }
    ],
    workflow: {
      edges: [],
      nodes: [
        {
          dependsOn: [],
          name: "Blocked task visibility",
          status: "blocked",
          taskId: "task-019"
        }
      ],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 0,
        totalTasks: 1
      }
    }
  }
];
const workstreamRunApi = createStaticRunManagementApi(workstreamRunFixtures);
type ResponseFactory = () => Promise<Response> | Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
});

function getComponentCard(name: string) {
  const card = screen.getByRole("heading", { name }).closest("article");

  expect(card).not.toBeNull();

  return {
    card: card as HTMLElement,
    queries: within(card as HTMLElement)
  };
}

function getLinkByHref(container: HTMLElement, href: string) {
  const link = within(container)
    .getAllByRole("link")
    .find((candidate) => candidate.getAttribute("href") === href);

  expect(link).toBeDefined();

  return link as HTMLAnchorElement;
}

function expectProjectConfigurationChromeRemoved(container: HTMLElement) {
  const pageStage = container.querySelector(".page-stage");

  expect(pageStage).not.toBeNull();
  expect(pageStage?.querySelectorAll(".project-config-panel")).toHaveLength(1);
  expect(pageStage?.querySelectorAll(".project-config-sidebar")).toHaveLength(0);
  expect(pageStage?.querySelectorAll(".page-hero")).toHaveLength(0);
  expect(pageStage?.querySelectorAll("aside")).toHaveLength(0);
}

function getTableBodyRows() {
  return within(screen.getByRole("table")).getAllByRole("row").slice(1);
}

interface EntityTableHarnessRow {
  rowId: string;
  summary: string;
}

function renderEntityTableHarness(input: {
  onNestedAction: () => void;
  onRowActivate: (row: EntityTableHarnessRow) => void;
}) {
  const row: EntityTableHarnessRow = {
    rowId: "row-1",
    summary: "Open run detail"
  };
  const columns: EntityTableColumn<EntityTableHarnessRow>[] = [
    {
      cell: (currentRow) => currentRow.rowId,
      header: "Row",
      id: "row"
    },
    {
      cell: (currentRow) => currentRow.summary,
      header: "Summary",
      id: "summary"
    },
    {
      cell: () => (
        <button type="button" onClick={input.onNestedAction}>
          Inspect row
        </button>
      ),
      header: "Actions",
      id: "actions"
    }
  ];

  render(
    <EntityTable
      ariaLabel="Entity table harness"
      columns={columns}
      getRowId={(currentRow) => currentRow.rowId}
      onRowActivate={input.onRowActivate}
      rows={[row]}
    />
  );

  const bodyRow = within(screen.getByRole("table", { name: "Entity table harness" })).getAllByRole(
    "row"
  )[1];

  expect(bodyRow).toBeDefined();

  return {
    row,
    rowElement: bodyRow as HTMLElement
  };
}

function expectWorkstreamRows(expectedRows: string[][]) {
  const rows = getTableBodyRows();

  expect(rows).toHaveLength(expectedRows.length);

  expectedRows.forEach((expectedCells, index) => {
    expect(
      within(rows[index]!)
        .getAllByRole("cell")
        .map((cell) => cell.textContent?.trim() ?? "")
    ).toEqual(expectedCells);

    expect(rows[index]).not.toHaveAttribute("tabindex");
    expect(within(rows[index]!).getAllByRole("link")).toHaveLength(1);
  });
}

function expectWorkstreamLink(taskDisplayId: string, href: string) {
  expect(screen.getByRole("link", { name: taskDisplayId })).toHaveAttribute("href", href);
}

function getProjectSelector() {
  return screen.getByRole("combobox", { name: "Project" });
}

function buildProjectsResponse(projects: CurrentProject[]) {
  return {
    data: {
      items: projects.map((project) =>
        serializeProjectListItem({
          projectId: project.projectId,
          projectKey: project.projectKey,
          displayName: project.displayName,
          description: project.description || null,
          createdAt: defaultTimestamp,
          updatedAt: defaultTimestamp
        })
      ),
      total: projects.length
    },
    meta: {
      apiVersion: "v1" as const,
      envelope: "collection" as const,
      resourceType: "project" as const
    }
  };
}

function buildProjectDetailResponse(project: {
  components: Array<{
    componentKey: string;
    config:
      | {
          localPath: string;
          ref?: string;
        }
      | {
          gitUrl: string;
          ref?: string;
        };
    displayName: string;
    kind: "git_repository";
    ruleOverride?: {
      reviewInstructions?: string[];
      testInstructions?: string[];
    };
  }>;
  description: string | null;
  displayName: string;
  envVars: Array<{
    name: string;
    value: string;
  }>;
  projectId: string;
  projectKey: string;
  ruleSet: {
    reviewInstructions: string[];
    testInstructions: string[];
  };
}) {
  return {
    data: serializeProjectResource({
      tenantId: "tenant-test",
      projectId: project.projectId,
      projectKey: project.projectKey,
      displayName: project.displayName,
      description: project.description,
      ruleSet: project.ruleSet,
      components: project.components,
      envVars: project.envVars,
      createdAt: defaultTimestamp,
      updatedAt: defaultTimestamp
    }),
    meta: {
      apiVersion: "v1" as const,
      envelope: "detail" as const,
      resourceType: "project" as const
    }
  };
}

type ProjectDetailFixture = Parameters<typeof buildProjectDetailResponse>[0];

interface LiveProjectTaskFixture {
  description: string;
  logicalTaskId: string;
  name: string;
  runId: string;
  status: string;
  taskId: string;
  updatedAt: string;
}

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

function stubProjectListFetch(projects: CurrentProject[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    expectDevAuthHeaders(input, init);

    if (url !== "/v1/projects") {
      throw new Error(`Unexpected fetch request: ${url}`);
    }

    return createJsonResponse(buildProjectsResponse(projects));
  });

  vi.stubGlobal("fetch", fetchMock);
}

function createLiveProjectTaskFixture(overrides: Partial<LiveProjectTaskFixture> = {}): LiveProjectTaskFixture {
  return {
    description: "Live project task row for Workstreams tests.",
    logicalTaskId: "TASK-LIVE-001",
    name: "Compile execution context",
    runId: "run-live-201",
    status: "running",
    taskId: "task-live-001",
    updatedAt: "2026-04-20T12:00:00.000Z",
    ...overrides
  };
}

function buildProjectTaskResource(task: LiveProjectTaskFixture) {
  return {
    resourceType: "task" as const,
    scaffold: {
      implementation: "reused" as const,
      note: null
    },
    runId: task.runId,
    taskId: task.taskId,
    logicalTaskId: task.logicalTaskId,
    name: task.name,
    description: task.description,
    status: task.status,
    dependsOn: [],
    conversation: null,
    updatedAt: task.updatedAt,
    startedAt: null,
    endedAt: null
  };
}

function buildProjectTasksResponse(input: {
  filter: ProjectTaskFilter;
  items: LiveProjectTaskFixture[];
  page?: number;
  pageCount?: number;
  pageSize?: number;
  total?: number;
}) {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 25;
  const total = input.total ?? input.items.length;

  return {
    data: {
      items: input.items.map(buildProjectTaskResource),
      total,
      page,
      pageSize,
      pageCount: input.pageCount ?? Math.max(1, Math.ceil(total / pageSize)),
      filter: input.filter
    },
    meta: {
      apiVersion: "v1" as const,
      envelope: "collection" as const,
      resourceType: "task" as const
    }
  };
}

function createProjectTaskQueryKey(
  projectId: string,
  filter: ProjectTaskFilter,
  page: number,
  pageSize = 25
) {
  return `${projectId}|${filter}|${page}|${pageSize}`;
}

function createDeferredJsonResponse(payload: unknown, status = 200) {
  let resolveResponse: ((response: Response) => void) | null = null;
  const promise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });

  return {
    promise,
    resolve() {
      resolveResponse?.(createJsonResponse(payload, status));
    }
  };
}

function stubLiveWorkstreamsFetch(input: {
  projects?: CurrentProject[];
  projectResponses?: ResponseFactory[];
  taskResponsesByKey: Record<string, ResponseFactory[]>;
}) {
  const projects = input.projects ?? [scaffoldProject];
  const projectResponses = input.projectResponses ?? [
    () => createJsonResponse(buildProjectsResponse(projects))
  ];
  let projectCallIndex = 0;
  const taskCallIndexes = new Map<string, number>();

  const fetchMock = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof request === "string" ? request : request.toString();
    const method = request instanceof Request ? request.method : init?.method ?? "GET";

    expectDevAuthHeaders(request, init);

    if (url === "/v1/projects" && method === "GET") {
      const responseFactory =
        projectResponses[Math.min(projectCallIndex, projectResponses.length - 1)];
      projectCallIndex += 1;

      return await responseFactory!();
    }

    const parsedUrl = new URL(url, "http://localhost");
    const projectTaskMatch = parsedUrl.pathname.match(/^\/v1\/projects\/([^/]+)\/tasks$/);

    if (projectTaskMatch && method === "GET") {
      const projectId = decodeURIComponent(projectTaskMatch[1]!);
      const filter = (parsedUrl.searchParams.get("filter") ?? "active") as ProjectTaskFilter;
      const page = Number(parsedUrl.searchParams.get("page") ?? "1");
      const pageSize = Number(parsedUrl.searchParams.get("pageSize") ?? "25");
      const key = createProjectTaskQueryKey(projectId, filter, page, pageSize);
      const responseFactories = input.taskResponsesByKey[key];

      if (!responseFactories) {
        throw new Error(`Unexpected fetch request: ${method} ${url}`);
      }

      const callIndex = taskCallIndexes.get(key) ?? 0;
      const responseFactory =
        responseFactories[Math.min(callIndex, responseFactories.length - 1)];

      taskCallIndexes.set(key, callIndex + 1);

      return await responseFactory!();
    }

    throw new Error(`Unexpected fetch request: ${method} ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function stubProjectCreateFlowFetch(input: {
  createdProject: ProjectDetailFixture;
  initialProjects?: CurrentProject[];
  refreshedProjects?: CurrentProject[];
  refreshedProjectsResponse?: ResponseFactory;
}) {
  const postedBodies: unknown[] = [];
  let projectListCallIndex = 0;
  const initialProjects = input.initialProjects ?? [scaffoldProject];
  const refreshedProjects = input.refreshedProjects ?? [
    ...initialProjects,
    {
      projectId: input.createdProject.projectId,
      projectKey: input.createdProject.projectKey,
      displayName: input.createdProject.displayName,
      description: input.createdProject.description ?? ""
    }
  ];

  const fetchMock = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof request === "string" ? request : request.toString();
    const method = request instanceof Request ? request.method : init?.method ?? "GET";

    expectDevAuthHeaders(request, init);

    if (url === "/v1/projects" && method === "GET") {
      const responseFactory =
        projectListCallIndex === 0
          ? () => createJsonResponse(buildProjectsResponse(initialProjects))
          : input.refreshedProjectsResponse ??
            (() => createJsonResponse(buildProjectsResponse(refreshedProjects)));
      projectListCallIndex += 1;

      return await responseFactory();
    }

    if (url === "/v1/projects" && method === "POST") {
      const bodyText =
        request instanceof Request ? await request.text() : String(init?.body ?? "");

      postedBodies.push(JSON.parse(bodyText));

      return createJsonResponse(buildProjectDetailResponse(input.createdProject), 201);
    }

    if (url === `/v1/projects/${input.createdProject.projectId}/runs` && method === "GET") {
      return createJsonResponse({
        data: {
          items: [],
          total: 0
        },
        meta: {
          apiVersion: "v1" as const,
          envelope: "collection" as const,
          resourceType: "run" as const
        }
      });
    }

    throw new Error(`Unexpected fetch request: ${method} ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock,
    postedBodies
  };
}

function stubProjectSettingsFlowFetch(input: {
  detailResponses: ResponseFactory[];
  initialProjects?: CurrentProject[];
  patchResponses?: ResponseFactory[];
  project: ProjectDetailFixture;
}) {
  const initialProjects = input.initialProjects ?? [
    {
      projectId: input.project.projectId,
      projectKey: input.project.projectKey,
      displayName: input.project.displayName,
      description: input.project.description ?? ""
    }
  ];
  const postedBodies: unknown[] = [];
  let detailCallIndex = 0;
  let patchCallIndex = 0;

  const fetchMock = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof request === "string" ? request : request.toString();
    const method = request instanceof Request ? request.method : init?.method ?? "GET";

    expectDevAuthHeaders(request, init);

    if (url === "/v1/projects" && method === "GET") {
      return createJsonResponse(buildProjectsResponse(initialProjects));
    }

    if (url === `/v1/projects/${input.project.projectId}` && method === "GET") {
      const responseFactory =
        input.detailResponses[Math.min(detailCallIndex, input.detailResponses.length - 1)];
      detailCallIndex += 1;

      return await responseFactory!();
    }

    if (url === `/v1/projects/${input.project.projectId}` && method === "PATCH") {
      const bodyText =
        request instanceof Request ? await request.text() : String(init?.body ?? "");

      postedBodies.push(JSON.parse(bodyText));

      const responseFactory =
        input.patchResponses?.[Math.min(patchCallIndex, input.patchResponses.length - 1)] ??
        (() => createJsonResponse(buildProjectDetailResponse(input.project)));
      patchCallIndex += 1;

      return await responseFactory();
    }

    throw new Error(`Unexpected fetch request: ${method} ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    fetchMock,
    postedBodies
  };
}

describe("Destination scaffolds", () => {
  it("renders derived documentation groups and switches selection structurally", async () => {
    const { router } = renderRoute("/documentation");

    expect(await screen.findByRole("heading", { name: "Project documentation" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "current living product specification" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Doc tree" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Document viewer" })).toBeInTheDocument();
    expect(screen.queryByText("Placeholder honesty")).not.toBeInTheDocument();
    expect(screen.queryByText("Deferred work")).not.toBeInTheDocument();

    const documentationTree = screen.getByLabelText("Documentation tree");
    expect(within(documentationTree).getByRole("heading", { name: "Product Specifications" })).toBeInTheDocument();
    expect(within(documentationTree).getByRole("heading", { name: "Technical Architecture" })).toBeInTheDocument();
    expect(within(documentationTree).getByRole("heading", { name: "Miscellaneous Notes" })).toBeInTheDocument();
    expect(within(documentationTree).getAllByRole("button")).toHaveLength(4);
    expect(
      within(documentationTree).getByRole("button", { name: "Current docs/product/current.md" })
    ).toBeInTheDocument();
    expect(
      within(documentationTree).getByRole("button", {
        name: "Current docs/architecture/current.md"
      })
    ).toBeInTheDocument();

    const currentSpecButton = within(documentationTree).getByRole("button", {
      name: "Current docs/product/current.md"
    });
    const currentArchitectureButton = within(documentationTree).getByRole("button", {
      name: "Current docs/architecture/current.md"
    });
    const openQuestionsButton = within(documentationTree).getByRole("button", {
      name: "Open questions docs/notes/open-questions.md"
    });
    const documentViewer = screen.getByRole("heading", { name: "Document viewer" }).closest("section");

    expect(documentViewer).not.toBeNull();

    expect(currentSpecButton).toHaveAttribute("aria-pressed", "true");
    expect(currentArchitectureButton).toHaveAttribute("aria-pressed", "false");
    expect(openQuestionsButton).toHaveAttribute("aria-pressed", "false");
    expect(within(documentViewer as HTMLElement).getByText("docs/product/current.md")).toBeInTheDocument();

    fireEvent.click(currentArchitectureButton);

    expect(
      await screen.findByRole("heading", { name: "current living architecture + decisions" })
    ).toBeInTheDocument();
    const architectureDocumentId = new URLSearchParams(router.state.location.search).get("document");

    expect(architectureDocumentId).toBeTruthy();
    expect(
      within(documentViewer as HTMLElement).getByText("docs/architecture/current.md")
    ).toBeInTheDocument();
    expect(
      within(documentViewer as HTMLElement).getByText(
        "The product runs as a Cloudflare-served SPA with route-owned destinations and feature-owned rendering surfaces."
      )
    ).toBeInTheDocument();
    expect(currentSpecButton).toHaveAttribute("aria-pressed", "false");
    expect(currentArchitectureButton).toHaveAttribute("aria-pressed", "true");
    expect(openQuestionsButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(openQuestionsButton);

    expect(await screen.findByRole("heading", { name: "open questions" })).toBeInTheDocument();
    const openQuestionsDocumentId = new URLSearchParams(router.state.location.search).get("document");

    expect(openQuestionsDocumentId).toBeTruthy();
    expect(openQuestionsDocumentId).not.toBe(architectureDocumentId);
    expect(
      within(documentViewer as HTMLElement).getByText("docs/notes/open-questions.md")
    ).toBeInTheDocument();
    expect(currentSpecButton).toHaveAttribute("aria-pressed", "false");
    expect(currentArchitectureButton).toHaveAttribute("aria-pressed", "false");
    expect(openQuestionsButton).toHaveAttribute("aria-pressed", "true");
    expect(
      within(documentationTree)
        .getAllByRole("button")
        .filter((button) => button.getAttribute("aria-pressed") === "true")
    ).toHaveLength(1);

    await act(async () => {
      await router.navigate(-1);
    });

    expect(
      await screen.findByRole("heading", { name: "current living architecture + decisions" })
    ).toBeInTheDocument();

    await act(async () => {
      await router.navigate(-1);
    });

    expect(
      await screen.findByRole("heading", { name: "current living product specification" })
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe("");
  });

  it("hydrates a documentation deep link and keeps the mounted route stable across project switches", async () => {
    const alternateProject: CurrentProject = {
      projectId: "project-alt",
      projectKey: "alt-project",
      displayName: "Alt Project",
      description: "Alternate operator workspace."
    };

    stubProjectListFetch([scaffoldProject, alternateProject]);

    const { router } = renderRoute("/documentation?document=project-open-questions", {
      useBrowserProjectApi: true
    });

    expect(await screen.findByRole("heading", { name: "Project documentation" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "open questions" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open questions docs/notes/open-questions.md" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(router.state.location.search).toBe("?document=project-open-questions");

    fireEvent.change(getProjectSelector(), {
      target: {
        value: alternateProject.projectId
      }
    });

    expect(
      await screen.findByRole("heading", {
        name: "Documentation is not available for this project yet"
      })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Documentation tree")).not.toBeInTheDocument();

    fireEvent.change(getProjectSelector(), {
      target: {
        value: scaffoldProject.projectId
      }
    });

    expect(await screen.findByRole("heading", { name: "open questions" })).toBeInTheDocument();
    expect(router.state.location.search).toBe("?document=project-open-questions");
  });

  it("canonicalizes an unknown documentation deep link to the default document", async () => {
    const { router } = renderRoute("/documentation?document=missing-document");

    expect(await screen.findByRole("heading", { name: "Project documentation" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "current living product specification" })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(router.state.location.search).toBe("?document=project-spec-current");
    });
    expect(
      screen.getByRole("button", { name: "Current docs/product/current.md" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("renders a compatibility state for documentation on a non-scaffold live project", async () => {
    const projects: CurrentProject[] = [
      {
        projectId: "project-keystone-cloudflare",
        projectKey: "keystone-cloudflare",
        displayName: "Keystone Cloudflare",
        description: "Internal operator workspace for the Keystone Cloudflare project."
      },
      {
        projectId: "project-alt",
        projectKey: "alt-project",
        displayName: "Alt Project",
        description: "Alternate operator workspace."
      }
    ];

    window.localStorage.setItem(currentProjectStorageKey, "project-alt");
    stubProjectListFetch(projects);

    renderRoute("/documentation", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "Project documentation" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Documentation is not available for this project yet" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Project documentation still depends on scaffold-backed data\./i)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Documentation tree")).not.toBeInTheDocument();
  });

  it("renders the canonical workstreams rows with the default Active filter and runId column", async () => {
    renderRoute("/workstreams");

    expect(
      await screen.findByRole("heading", { name: "Project work across runs" })
    ).toBeInTheDocument();
    await screen.findByRole("link", { name: "TASK-032" });
    expect(screen.getByRole("link", { name: "TASK-032" })).toBeInTheDocument();
    expect(screen.getByText("Filters:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Active" })).toHaveClass("is-active");
    expect(screen.queryByText("Still intentionally stubbed")).not.toBeInTheDocument();
    expectWorkstreamRows([
      ["TASK-032", "Run shell navigation", "run-104", "Running", "2m ago"],
      ["TASK-033", "Task detail routing", "run-104", "Queued", "4m ago"],
      ["TASK-034", "Documentation grouping", "run-104", "Queued", "8m ago"],
      ["TASK-021", "Documentation curation", "run-103", "Running", "9m ago"],
      ["TASK-019", "Blocked task visibility", "run-101", "Blocked", "1h ago"]
    ]);
    expectWorkstreamLink("TASK-032", "/runs/run-104/execution/tasks/task-032");
    expectWorkstreamLink("TASK-033", "/runs/run-104/execution/tasks/task-033");
    expectWorkstreamLink("TASK-034", "/runs/run-104/execution/tasks/task-034");
    expectWorkstreamLink("TASK-021", "/runs/run-103/execution/tasks/task-021");
    expectWorkstreamLink("TASK-019", "/runs/run-101/execution/tasks/task-019");
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 1-5 of 5 tasks · Page 1 of 1"
    );

    fireEvent.click(screen.getByRole("button", { name: "Running" }));
    await screen.findByRole("link", { name: "TASK-032" });
    expect(screen.getByRole("link", { name: "TASK-032" })).toBeInTheDocument();
    expectWorkstreamRows([
      ["TASK-032", "Run shell navigation", "run-104", "Running", "2m ago"],
      ["TASK-021", "Documentation curation", "run-103", "Running", "9m ago"]
    ]);
    expectWorkstreamLink("TASK-021", "/runs/run-103/execution/tasks/task-021");

    fireEvent.click(screen.getByRole("button", { name: "Queued" }));
    await screen.findByRole("link", { name: "TASK-033" });
    expect(screen.getByRole("link", { name: "TASK-033" })).toBeInTheDocument();
    expectWorkstreamRows([
      ["TASK-033", "Task detail routing", "run-104", "Queued", "4m ago"],
      ["TASK-034", "Documentation grouping", "run-104", "Queued", "8m ago"]
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Blocked" }));
    await screen.findByRole("link", { name: "TASK-019" });
    expect(screen.getByRole("link", { name: "TASK-019" })).toBeInTheDocument();
    expectWorkstreamRows([["TASK-019", "Blocked task visibility", "run-101", "Blocked", "1h ago"]]);
    expectWorkstreamLink("TASK-019", "/runs/run-101/execution/tasks/task-019");

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    await screen.findByRole("link", { name: "TASK-029" });
    expect(screen.getByRole("link", { name: "TASK-029" })).toBeInTheDocument();
    expectWorkstreamRows([
      ["TASK-029", "Specification outline", "run-104", "Complete", "16m ago"],
      ["TASK-030", "Architecture decisions", "run-104", "Complete", "14m ago"],
      ["TASK-031", "Execution plan", "run-104", "Complete", "12m ago"],
      ["TASK-032", "Run shell navigation", "run-104", "Running", "2m ago"],
      ["TASK-033", "Task detail routing", "run-104", "Queued", "4m ago"],
      ["TASK-034", "Documentation grouping", "run-104", "Queued", "8m ago"],
      ["TASK-021", "Documentation curation", "run-103", "Running", "9m ago"],
      ["TASK-019", "Blocked task visibility", "run-101", "Blocked", "1h ago"]
    ]);
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 1-8 of 8 tasks · Page 1 of 1"
    );
  });

  it("renders live workstreams from the project task collection and expands from Active to All", async () => {
    const activeTasks = [
      createLiveProjectTaskFixture({
        logicalTaskId: "TASK-LIVE-001",
        name: "Compile execution context",
        runId: "run-live-201",
        status: "running",
        taskId: "task-live-001",
        updatedAt: "2026-04-20T12:00:00.000Z"
      }),
      createLiveProjectTaskFixture({
        logicalTaskId: "task-live-002",
        name: "Blocked task visibility",
        runId: "run-live-202",
        status: "blocked",
        taskId: "task-live-002",
        updatedAt: "2026-04-20T12:05:00.000Z"
      }),
      createLiveProjectTaskFixture({
        logicalTaskId: "TASK-LIVE-004",
        name: "Queue follow-on work",
        runId: "run-live-204",
        status: "ready",
        taskId: "task-live-004",
        updatedAt: "2026-04-20T12:08:00.000Z"
      })
    ];
    const allTasks = [
      ...activeTasks,
      createLiveProjectTaskFixture({
        logicalTaskId: "TASK-LIVE-003",
        name: "Documentation curation",
        runId: "run-live-203",
        status: "completed",
        taskId: "task-live-003",
        updatedAt: "2026-04-20T12:06:00.000Z"
      })
    ];

    stubLiveWorkstreamsFetch({
      taskResponsesByKey: {
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 1)]: [
          () => createJsonResponse(buildProjectTasksResponse({ filter: "active", items: activeTasks }))
        ],
        [createProjectTaskQueryKey(scaffoldProject.projectId, "all", 1)]: [
          () => createJsonResponse(buildProjectTasksResponse({ filter: "all", items: allTasks }))
        ]
      }
    });

    renderRoute("/workstreams", { useBrowserProjectApi: true });

    expect(
      await screen.findByRole("heading", { name: "Project work across runs" })
    ).toBeInTheDocument();
    await screen.findByRole("link", { name: "TASK-LIVE-001" });
    expect(screen.getByRole("link", { name: "TASK-LIVE-001" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Active" })).toHaveClass("is-active");
    expectWorkstreamRows([
      ["TASK-LIVE-001", "Compile execution context", "run-live-201", "Running", "2026-04-20 12:00 UTC"],
      ["task-live-002", "Blocked task visibility", "run-live-202", "Blocked", "2026-04-20 12:05 UTC"],
      ["TASK-LIVE-004", "Queue follow-on work", "run-live-204", "Queued", "2026-04-20 12:08 UTC"]
    ]);
    expectWorkstreamLink("task-live-002", "/runs/run-live-202/execution/tasks/task-live-002");
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 1-3 of 3 tasks · Page 1 of 1"
    );

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    await screen.findByRole("link", { name: "TASK-LIVE-003" });
    expect(screen.getByRole("link", { name: "TASK-LIVE-003" })).toBeInTheDocument();

    expectWorkstreamRows([
      ["TASK-LIVE-001", "Compile execution context", "run-live-201", "Running", "2026-04-20 12:00 UTC"],
      ["task-live-002", "Blocked task visibility", "run-live-202", "Blocked", "2026-04-20 12:05 UTC"],
      ["TASK-LIVE-004", "Queue follow-on work", "run-live-204", "Queued", "2026-04-20 12:08 UTC"],
      ["TASK-LIVE-003", "Documentation curation", "run-live-203", "Complete", "2026-04-20 12:06 UTC"]
    ]);
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 1-4 of 4 tasks · Page 1 of 1"
    );
  });

  it("restores workstream filter and page state from the URL history", async () => {
    const activePageOne = Array.from({ length: 25 }, (_, index) =>
      createLiveProjectTaskFixture({
        logicalTaskId: `TASK-HISTORY-${String(index + 1).padStart(3, "0")}`,
        name: `History task ${index + 1}`,
        runId: `run-history-${String(index + 1).padStart(3, "0")}`,
        taskId: `task-history-${String(index + 1).padStart(3, "0")}`,
        updatedAt: `2026-04-20T12:${String(index).padStart(2, "0")}:00.000Z`
      })
    );
    const activePageTwo = [
      createLiveProjectTaskFixture({
        logicalTaskId: "TASK-HISTORY-026",
        name: "History task 26",
        runId: "run-history-026",
        taskId: "task-history-026",
        updatedAt: "2026-04-20T12:26:00.000Z"
      })
    ];
    const allTasks = [
      createLiveProjectTaskFixture({
        logicalTaskId: "TASK-ALL-001",
        name: "Completed planning notes",
        runId: "run-all-001",
        status: "completed",
        taskId: "task-all-001"
      }),
      createLiveProjectTaskFixture({
        logicalTaskId: "task-all-002",
        name: "Fallback display id",
        runId: "run-all-002",
        status: "queued",
        taskId: "task-all-002"
      })
    ];

    stubLiveWorkstreamsFetch({
      taskResponsesByKey: {
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 1)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: activePageOne,
                total: 26
              })
            )
        ],
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 2)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: activePageTwo,
                page: 2,
                total: 26
              })
            )
        ],
        [createProjectTaskQueryKey(scaffoldProject.projectId, "all", 1)]: [
          () => createJsonResponse(buildProjectTasksResponse({ filter: "all", items: allTasks }))
        ]
      }
    });

    const { router } = renderRoute("/workstreams", { useBrowserProjectApi: true });

    await screen.findByRole("link", { name: "TASK-HISTORY-001" });
    expect(screen.getByRole("link", { name: "TASK-HISTORY-001" })).toBeInTheDocument();
    expect(router.state.location.search).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await screen.findByRole("link", { name: "TASK-HISTORY-026" });
    expect(screen.getByRole("link", { name: "TASK-HISTORY-026" })).toBeInTheDocument();
    expect(router.state.location.search).toBe("?page=2");

    fireEvent.click(screen.getByRole("button", { name: "All" }));

    await screen.findByRole("link", { name: "TASK-ALL-001" });
    expect(screen.getByRole("link", { name: "TASK-ALL-001" })).toBeInTheDocument();
    expect(router.state.location.search).toBe("?filter=all");

    await act(async () => {
      await router.navigate(-1);
    });

    await screen.findByRole("link", { name: "TASK-HISTORY-026" });
    expect(screen.getByRole("link", { name: "TASK-HISTORY-026" })).toBeInTheDocument();
    expect(router.state.location.search).toBe("?page=2");

    await act(async () => {
      await router.navigate(-1);
    });

    await screen.findByRole("link", { name: "TASK-HISTORY-001" });
    expect(screen.getByRole("link", { name: "TASK-HISTORY-001" })).toBeInTheDocument();
    expect(router.state.location.search).toBe("");
  });

  it("waits for the resolved live project before requesting workstreams", async () => {
    const alternateProject: CurrentProject = {
      projectId: "project-alt",
      projectKey: "alt-project",
      displayName: "Alt Project",
      description: "Alternate operator workspace."
    };
    const deferredProjects = createDeferredJsonResponse(
      buildProjectsResponse([scaffoldProject, alternateProject])
    );
    const fetchMock = stubLiveWorkstreamsFetch({
      projects: [scaffoldProject, alternateProject],
      projectResponses: [() => deferredProjects.promise],
      taskResponsesByKey: {
        [createProjectTaskQueryKey(alternateProject.projectId, "active", 1)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: [
                  createLiveProjectTaskFixture({
                    logicalTaskId: "TASK-ALT-001",
                    name: "Alt project workstream",
                    runId: "run-alt-201",
                    taskId: "task-alt-001"
                  })
                ]
              })
            )
        ]
      }
    });

    window.localStorage.setItem(currentProjectStorageKey, alternateProject.projectId);
    renderRoute("/workstreams", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "Loading projects" })).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([request]) => {
        const url = typeof request === "string" ? request : request.toString();

        return url.includes("/v1/projects/") && url.includes("/tasks");
      })
    ).toBe(false);

    deferredProjects.resolve();

    await screen.findByRole("link", { name: "TASK-ALT-001" });
    expect(screen.getByRole("link", { name: "TASK-ALT-001" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/projects/project-alt/tasks?filter=active&page=1&pageSize=25"),
      expect.anything()
    );
  });

  it("keeps workstream filters visible when the active filter yields zero rows", () => {
    const setActiveFilter = vi.fn();

    render(
      <WorkstreamsBoard
        model={{
          title: "Project work across runs",
          filters: [
            {
              filterId: "all",
              label: "All",
              isActive: false
            },
            {
              filterId: "active",
              label: "Active",
              isActive: false
            },
            {
              filterId: "running",
              label: "Running",
              isActive: false
            },
            {
              filterId: "queued",
              label: "Queued",
              isActive: true
            },
            {
              filterId: "blocked",
              label: "Blocked",
              isActive: false
            }
          ],
          contentState: {
            heading: "No workstreams match this filter",
            kind: "empty",
            message: "No workstreams match the queued filter right now."
          },
          goToNextPage() {},
          goToPreviousPage() {},
          rows: [],
          pagination: {
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            pageCount: 1,
            rangeLabel: "Showing 0 of 0 tasks"
          },
          retry() {},
          setActiveFilter
        }}
      />
    );

    expect(screen.getByText("Filters:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Queued" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No workstreams match this filter" })).toBeInTheDocument();
    expect(screen.getByText("No workstreams match the queued filter right now.")).toBeInTheDocument();
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 0 of 0 tasks · Page 1 of 1"
    );

    fireEvent.click(screen.getByRole("button", { name: "All" }));

    expect(setActiveFilter).toHaveBeenCalledWith("all");
  });

  it("renders a live workstreams loading state before the task collection resolves", async () => {
    const deferredTasks = createDeferredJsonResponse(
      buildProjectTasksResponse({
        filter: "active",
        items: [
          createLiveProjectTaskFixture({
            logicalTaskId: "TASK-LIVE-001",
            name: "Compile execution context",
            runId: "run-live-201",
            taskId: "task-live-001"
          })
        ]
      })
    );

    stubLiveWorkstreamsFetch({
      taskResponsesByKey: {
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 1)]: [
          () => deferredTasks.promise
        ]
      }
    });

    renderRoute("/workstreams", { useBrowserProjectApi: true });

    expect(
      await screen.findByRole("heading", { name: "Project work across runs" })
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Loading workstreams" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    deferredTasks.resolve();

    await screen.findByRole("link", { name: "TASK-LIVE-001" });
    expect(screen.getByRole("link", { name: "TASK-LIVE-001" })).toBeInTheDocument();
  });

  it("renders a live workstreams empty state when the selected filter has no tasks", async () => {
    stubLiveWorkstreamsFetch({
      taskResponsesByKey: {
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 1)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: [],
                total: 0
              })
            )
        ]
      }
    });

    renderRoute("/workstreams", { useBrowserProjectApi: true });

    expect(
      await screen.findByRole("heading", { name: "Project work across runs" })
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "No active workstreams" })).toBeInTheDocument();
    expect(
      screen.getByText("Keystone Cloudflare does not have any running, queued, or blocked tasks right now.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 0 of 0 tasks · Page 1 of 1"
    );
  });

  it("renders a live workstreams error state and recovers after retry", async () => {
    const fetchMock = stubLiveWorkstreamsFetch({
      taskResponsesByKey: {
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 1)]: [
          async () => {
            throw new Error("Workstreams failed.");
          },
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: [
                  createLiveProjectTaskFixture({
                    logicalTaskId: "TASK-LIVE-001",
                    name: "Compile execution context",
                    runId: "run-live-201",
                    taskId: "task-live-001"
                  })
                ]
              })
            )
        ]
      }
    });

    renderRoute("/workstreams", { useBrowserProjectApi: true });

    expect(
      await screen.findByRole("heading", { name: "Project work across runs" })
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Unable to load workstreams" })).toBeInTheDocument();
    expect(screen.getByText("Workstreams failed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await screen.findByRole("link", { name: "TASK-LIVE-001" });
    expect(screen.getByRole("link", { name: "TASK-LIVE-001" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("renders live workstreams pagination controls and switches pages", async () => {
    const firstPageTasks = Array.from({ length: 25 }, (_, index) =>
      createLiveProjectTaskFixture({
        logicalTaskId: `TASK-LIVE-${String(index + 1).padStart(3, "0")}`,
        name: `Active task ${index + 1}`,
        runId: `run-live-${String(index + 1).padStart(3, "0")}`,
        taskId: `task-live-${String(index + 1).padStart(3, "0")}`,
        updatedAt: `2026-04-20T12:${String(index).padStart(2, "0")}:00.000Z`
      })
    );
    const secondPageTask = createLiveProjectTaskFixture({
      logicalTaskId: "TASK-LIVE-026",
      name: "Active task 26",
      runId: "run-live-026",
      taskId: "task-live-026",
      updatedAt: "2026-04-20T12:26:00.000Z"
    });

    stubLiveWorkstreamsFetch({
      taskResponsesByKey: {
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 1)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: firstPageTasks,
                page: 1,
                pageCount: 2,
                total: 26
              })
            )
        ],
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 2)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: [secondPageTask],
                page: 2,
                pageCount: 2,
                total: 26
              })
            )
        ]
      }
    });

    renderRoute("/workstreams", { useBrowserProjectApi: true });

    await screen.findByRole("link", { name: "TASK-LIVE-001" });
    expect(screen.getByRole("link", { name: "TASK-LIVE-001" })).toBeInTheDocument();
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 1-25 of 26 tasks · Page 1 of 2"
    );
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await screen.findByRole("link", { name: "TASK-LIVE-026" });
    expect(screen.getByRole("link", { name: "TASK-LIVE-026" })).toBeInTheDocument();
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 26-26 of 26 tasks · Page 2 of 2"
    );
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("resets to the last valid page when a paged live workstreams response shrinks out of range", async () => {
    const firstPageTasks = Array.from({ length: 25 }, (_, index) =>
      createLiveProjectTaskFixture({
        logicalTaskId: `TASK-LIVE-${String(index + 1).padStart(3, "0")}`,
        name: `Active task ${index + 1}`,
        runId: `run-live-${String(index + 1).padStart(3, "0")}`,
        taskId: `task-live-${String(index + 1).padStart(3, "0")}`,
        updatedAt: `2026-04-20T12:${String(index).padStart(2, "0")}:00.000Z`
      })
    );
    const resetPageTasks = Array.from({ length: 4 }, (_, index) =>
      createLiveProjectTaskFixture({
        logicalTaskId: `TASK-LIVE-RESET-${String(index + 1).padStart(3, "0")}`,
        name: `Reset task ${index + 1}`,
        runId: `run-live-reset-${String(index + 1).padStart(3, "0")}`,
        taskId: `task-live-reset-${String(index + 1).padStart(3, "0")}`,
        updatedAt: `2026-04-20T13:${String(index).padStart(2, "0")}:00.000Z`
      })
    );
    const fetchMock = stubLiveWorkstreamsFetch({
      taskResponsesByKey: {
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 1)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: firstPageTasks,
                page: 1,
                pageCount: 2,
                total: 26
              })
            ),
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: resetPageTasks,
                page: 1,
                pageCount: 1,
                total: 4
              })
            )
        ],
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 2)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: [],
                page: 2,
                pageCount: 1,
                total: 4
              })
            )
        ]
      }
    });

    renderRoute("/workstreams", { useBrowserProjectApi: true });

    await screen.findByRole("link", { name: "TASK-LIVE-001" });
    expect(screen.getByRole("link", { name: "TASK-LIVE-001" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await screen.findByRole("link", { name: "TASK-LIVE-RESET-001" });
    expect(screen.getByRole("link", { name: "TASK-LIVE-RESET-001" })).toBeInTheDocument();
    expectWorkstreamRows([
      [
        "TASK-LIVE-RESET-001",
        "Reset task 1",
        "run-live-reset-001",
        "Running",
        "2026-04-20 13:00 UTC"
      ],
      [
        "TASK-LIVE-RESET-002",
        "Reset task 2",
        "run-live-reset-002",
        "Running",
        "2026-04-20 13:01 UTC"
      ],
      [
        "TASK-LIVE-RESET-003",
        "Reset task 3",
        "run-live-reset-003",
        "Running",
        "2026-04-20 13:02 UTC"
      ],
      [
        "TASK-LIVE-RESET-004",
        "Reset task 4",
        "run-live-reset-004",
        "Running",
        "2026-04-20 13:03 UTC"
      ]
    ]);
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 1-4 of 4 tasks · Page 1 of 1"
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/projects/project-keystone-cloudflare/tasks?filter=active&page=2&pageSize=25"),
      expect.anything()
    );
    expect(
      fetchMock.mock.calls.filter(([request]) => {
        const url = typeof request === "string" ? request : request.toString();

        return url.includes(
          "/v1/projects/project-keystone-cloudflare/tasks?filter=active&page=1&pageSize=25"
        );
      })
    ).toHaveLength(2);
  });

  it("hydrates live workstreams from direct search params and canonicalizes an out-of-range page", async () => {
    const secondPageTask = createLiveProjectTaskFixture({
      logicalTaskId: "TASK-LIVE-026",
      name: "Second page workstream",
      runId: "run-live-026",
      taskId: "task-live-026",
      updatedAt: "2026-04-20T12:26:00.000Z"
    });
    const fetchMock = stubLiveWorkstreamsFetch({
      taskResponsesByKey: {
        [createProjectTaskQueryKey(scaffoldProject.projectId, "all", 3)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "all",
                items: [],
                page: 3,
                pageCount: 2,
                total: 26
              })
            )
        ],
        [createProjectTaskQueryKey(scaffoldProject.projectId, "all", 2)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "all",
                items: [secondPageTask],
                page: 2,
                pageCount: 2,
                total: 26
              })
            )
        ]
      }
    });

    const { router } = renderRoute("/workstreams?filter=all&page=3", {
      useBrowserProjectApi: true
    });

    expect(
      await screen.findByRole("heading", { name: "Project work across runs" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toHaveClass("is-active");
    expect(
      fetchMock.mock.calls.some(([request]) => {
        const url = typeof request === "string" ? request : request.toString();

        return url.includes("/v1/projects/project-keystone-cloudflare/tasks?filter=all&page=3");
      })
    ).toBe(true);

    await screen.findByRole("link", { name: "TASK-LIVE-026" });
    expect(screen.getByRole("link", { name: "TASK-LIVE-026" })).toBeInTheDocument();

    await waitFor(() => {
      expect(router.state.location.search).toBe("?filter=all&page=2");
    });
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 26-26 of 26 tasks · Page 2 of 2"
    );
    expect(
      fetchMock.mock.calls.some(([request]) => {
        const url = typeof request === "string" ? request : request.toString();

        return url.includes("/v1/projects/project-keystone-cloudflare/tasks?filter=all&page=2");
      })
    ).toBe(true);
  });

  it("resets to page 1 when the filter changes after paging", async () => {
    const activePageOne = Array.from({ length: 25 }, (_, index) =>
      createLiveProjectTaskFixture({
        logicalTaskId: `TASK-ACTIVE-${String(index + 1).padStart(3, "0")}`,
        name: `Active task ${index + 1}`,
        runId: `run-active-${String(index + 1).padStart(3, "0")}`,
        taskId: `task-active-${String(index + 1).padStart(3, "0")}`,
        updatedAt: `2026-04-20T12:${String(index).padStart(2, "0")}:00.000Z`
      })
    );
    const activePageTwo = [
      createLiveProjectTaskFixture({
        logicalTaskId: "TASK-ACTIVE-026",
        name: "Active task 26",
        runId: "run-active-026",
        taskId: "task-active-026",
        updatedAt: "2026-04-20T12:26:00.000Z"
      })
    ];
    const allTasks = [
      createLiveProjectTaskFixture({
        logicalTaskId: "TASK-ALL-001",
        name: "Completed planning notes",
        runId: "run-all-001",
        status: "completed",
        taskId: "task-all-001"
      }),
      createLiveProjectTaskFixture({
        logicalTaskId: "task-all-002",
        name: "Fallback display id",
        runId: "run-all-002",
        status: "queued",
        taskId: "task-all-002"
      }),
      createLiveProjectTaskFixture({
        logicalTaskId: "TASK-ALL-003",
        name: "Live running task",
        runId: "run-all-003",
        status: "running",
        taskId: "task-all-003"
      })
    ];
    const fetchMock = stubLiveWorkstreamsFetch({
      taskResponsesByKey: {
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 1)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: activePageOne,
                total: 26
              })
            )
        ],
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 2)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: activePageTwo,
                page: 2,
                total: 26
              })
            )
        ],
        [createProjectTaskQueryKey(scaffoldProject.projectId, "all", 1)]: [
          () => createJsonResponse(buildProjectTasksResponse({ filter: "all", items: allTasks }))
        ]
      }
    });

    renderRoute("/workstreams", { useBrowserProjectApi: true });

    await screen.findByRole("link", { name: "TASK-ACTIVE-001" });
    expect(screen.getByRole("link", { name: "TASK-ACTIVE-001" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await screen.findByRole("link", { name: "TASK-ACTIVE-026" });
    expect(screen.getByRole("link", { name: "TASK-ACTIVE-026" })).toBeInTheDocument();
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 26-26 of 26 tasks · Page 2 of 2"
    );

    fireEvent.click(screen.getByRole("button", { name: "All" }));

    await screen.findByRole("link", { name: "TASK-ALL-001" });
    expect(screen.getByRole("link", { name: "TASK-ALL-001" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "task-all-002" })).toHaveAttribute(
      "href",
      "/runs/run-all-002/execution/tasks/task-all-002"
    );
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 1-3 of 3 tasks · Page 1 of 1"
    );
    expect(
      fetchMock.mock.calls.some(([request]) => {
        const url = typeof request === "string" ? request : request.toString();

        return url.includes("/v1/projects/project-keystone-cloudflare/tasks?filter=all&page=2");
      })
    ).toBe(false);
  });

  it("resets to page 1 when the selected project changes after paging", async () => {
    const alternateProject: CurrentProject = {
      projectId: "project-alt",
      projectKey: "alt-project",
      displayName: "Alt Project",
      description: "Alternate operator workspace."
    };
    const primaryPageOne = Array.from({ length: 25 }, (_, index) =>
      createLiveProjectTaskFixture({
        logicalTaskId: `TASK-PRIMARY-${String(index + 1).padStart(3, "0")}`,
        name: `Primary task ${index + 1}`,
        runId: `run-primary-${String(index + 1).padStart(3, "0")}`,
        taskId: `task-primary-${String(index + 1).padStart(3, "0")}`,
        updatedAt: `2026-04-20T12:${String(index).padStart(2, "0")}:00.000Z`
      })
    );
    const primaryPageTwo = [
      createLiveProjectTaskFixture({
        logicalTaskId: "TASK-PRIMARY-026",
        name: "Primary task 26",
        runId: "run-primary-026",
        taskId: "task-primary-026",
        updatedAt: "2026-04-20T12:26:00.000Z"
      })
    ];
    const alternateTasks = [
      createLiveProjectTaskFixture({
        logicalTaskId: "TASK-ALT-001",
        name: "Alternate project task",
        runId: "run-alt-001",
        taskId: "task-alt-001"
      })
    ];
    const fetchMock = stubLiveWorkstreamsFetch({
      projects: [scaffoldProject, alternateProject],
      taskResponsesByKey: {
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 1)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: primaryPageOne,
                total: 26
              })
            )
        ],
        [createProjectTaskQueryKey(scaffoldProject.projectId, "active", 2)]: [
          () =>
            createJsonResponse(
              buildProjectTasksResponse({
                filter: "active",
                items: primaryPageTwo,
                page: 2,
                total: 26
              })
            )
        ],
        [createProjectTaskQueryKey(alternateProject.projectId, "active", 1)]: [
          () => createJsonResponse(buildProjectTasksResponse({ filter: "active", items: alternateTasks }))
        ]
      }
    });

    renderRoute("/workstreams", { useBrowserProjectApi: true });

    await screen.findByRole("link", { name: "TASK-PRIMARY-001" });
    expect(screen.getByRole("link", { name: "TASK-PRIMARY-001" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await screen.findByRole("link", { name: "TASK-PRIMARY-026" });
    expect(screen.getByRole("link", { name: "TASK-PRIMARY-026" })).toBeInTheDocument();

    fireEvent.change(getProjectSelector(), {
      target: {
        value: alternateProject.projectId
      }
    });

    await screen.findByRole("link", { name: "TASK-ALT-001" });
    expect(screen.getByRole("link", { name: "TASK-ALT-001" })).toBeInTheDocument();
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 1-1 of 1 tasks · Page 1 of 1"
    );
    expect(
      fetchMock.mock.calls.some(([request]) => {
        const url = typeof request === "string" ? request : request.toString();

        return url.includes("/v1/projects/project-alt/tasks?filter=active&page=2");
      })
    ).toBe(false);
  });

  it("keeps scaffold compatibility pagination truthful when slicing static workstreams", async () => {
    const api = createStaticProjectManagementApi([scaffoldProject]);

    const firstPage = await api.listProjectTasks(scaffoldProject.projectId, {
      filter: "all",
      page: 1,
      pageSize: 3
    });
    const secondPage = await api.listProjectTasks(scaffoldProject.projectId, {
      filter: "all",
      page: 2,
      pageSize: 3
    });

    expect(firstPage.total).toBe(8);
    expect(firstPage.pageCount).toBe(3);
    expect(firstPage.items).toHaveLength(3);
    expect(firstPage.items.map((task) => task.logicalTaskId)).toEqual([
      "TASK-029",
      "TASK-030",
      "TASK-031"
    ]);
    expect(secondPage.items).toHaveLength(3);
    expect(secondPage.items.map((task) => task.logicalTaskId)).toEqual([
      "TASK-032",
      "TASK-033",
      "TASK-034"
    ]);
  });

  it("covers the workstreams fallback and empty-state helpers", () => {
    expect(resolveTaskDisplayId("   ", "task-live-002")).toBe("task-live-002");
    expect(resolveTaskDisplayId("TASK-LIVE-002", "task-live-002")).toBe("TASK-LIVE-002");
    expect(buildEmptyState("all", "Keystone Cloudflare")).toMatchObject({
      heading: "No workstreams yet",
      kind: "empty",
      message: "Keystone Cloudflare does not have any recorded tasks yet."
    });
    expect(buildEmptyState("active", "Keystone Cloudflare")).toMatchObject({
      heading: "No active workstreams",
      kind: "empty",
      message:
        "Keystone Cloudflare does not have any running, queued, or blocked tasks right now."
    });
    expect(buildEmptyState("blocked", "Keystone Cloudflare")).toMatchObject({
      heading: "No workstreams match this filter",
      kind: "empty",
      message: "No workstreams match the blocked filter right now."
    });
  });

  it("opens a workstream task when the user clicks the row body", async () => {
    const { router } = renderRoute("/workstreams", { runApi: workstreamRunApi });

    expect(
      await screen.findByRole("heading", { name: "Project work across runs" })
    ).toBeInTheDocument();
    await screen.findByRole("link", { name: "TASK-019" });
    expect(screen.getByRole("link", { name: "TASK-019" })).toBeInTheDocument();

    const blockedRow = screen.getByRole("link", { name: "TASK-019" }).closest("tr");

    expect(blockedRow).not.toBeNull();

    fireEvent.click(within(blockedRow as HTMLElement).getByText("Blocked task visibility"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-101/execution/tasks/task-019");
    });
    expect(await screen.findByRole("heading", { name: "run-101 / task-019" })).toBeInTheDocument();
    expect(screen.getByLabelText("Conversation status")).toHaveTextContent(
      "Conversation attached to this task."
    );
    expect(await screen.findByText("No artifacts are recorded for this task yet.")).toBeInTheDocument();
  });

  it("suppresses row activation when the user holds a modifier key", () => {
    const onNestedAction = vi.fn();
    const onRowActivate = vi.fn();
    const { row, rowElement } = renderEntityTableHarness({
      onNestedAction,
      onRowActivate
    });

    fireEvent.click(within(rowElement).getByText(row.summary), { metaKey: true });

    expect(onNestedAction).not.toHaveBeenCalled();
    expect(onRowActivate).not.toHaveBeenCalled();
  });

  it("suppresses row activation when the click starts on a nested interactive control", () => {
    const onNestedAction = vi.fn();
    const onRowActivate = vi.fn();
    const { rowElement } = renderEntityTableHarness({
      onNestedAction,
      onRowActivate
    });

    fireEvent.click(within(rowElement).getByRole("button", { name: "Inspect row" }));

    expect(onNestedAction).toHaveBeenCalledTimes(1);
    expect(onRowActivate).not.toHaveBeenCalled();
  });

  it("redirects /projects/new to overview and keeps the tabbed create form live", async () => {
    const { container, router } = renderRoute("/projects/new");

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();
    expect(screen.queryByText("Placeholder honesty")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expectProjectConfigurationChromeRemoved(container);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/projects/new/overview");
    });

    const projectTabs = screen.getByRole("navigation", { name: "Project configuration tabs" });
    const projectNameField = await screen.findByRole("textbox", { name: "Project name" });

    expect(projectNameField).toHaveValue("Keystone Cloudflare");
    expect(screen.getByRole("textbox", { name: "Project key" })).toHaveValue("keystone-cloudflare");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Internal operator workspace for the Keystone Cloudflare project."
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Create project" })).toBeEnabled();

    fireEvent.change(projectNameField, {
      target: {
        value: "Edge Control"
      }
    });

    fireEvent.click(getLinkByHref(projectTabs, "/projects/new/rules"));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/projects/new/rules");
    });

    expect(screen.getByRole("heading", { name: "Rules" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Project review instructions 1" })).toHaveValue(
      "Keep route ownership explicit."
    );

    fireEvent.click(getLinkByHref(projectTabs, "/projects/new/overview"));
    expect(await screen.findByRole("textbox", { name: "Project name" })).toHaveValue(
      "Edge Control"
    );

    fireEvent.click(getLinkByHref(projectTabs, "/projects/new/environment"));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/projects/new/environment");
    });

    expect(screen.getByRole("heading", { name: "Environment" })).toBeInTheDocument();
    const environmentNameFields = screen.getAllByRole("textbox", { name: "Name" });
    const environmentValueFields = screen.getAllByRole("textbox", { name: "Value" });

    expect(environmentNameFields[0]).toHaveValue("KEYSTONE_AGENT_RUNTIME");
    expect(environmentValueFields[0]).toHaveValue("scripted");
  });

  it("runs the new-project secondary action from a shared tab footer by leaving for runs", async () => {
    const { router } = renderRoute("/projects/new/overview");

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: {
        value: "Edge Control"
      }
    });

    fireEvent.click(screen.getByRole("link", { name: "Rules" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/projects/new/rules");
    });
    expect(screen.getByRole("heading", { name: "Rules" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs");
    });
    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "New project" })).not.toBeInTheDocument();
  });

  it("shows component validation feedback and keeps the add-component form editable", async () => {
    const { container } = renderRoute("/projects/new/components");

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Components" })).toBeInTheDocument();
    expectProjectConfigurationChromeRemoved(container);

    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(
      await screen.findByText("Add at least one component before creating the project.")
    ).toBeInTheDocument();

    const addComponentButton = screen.getByRole("button", { name: "+ Add component" });
    fireEvent.click(addComponentButton);
    expect(addComponentButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("heading", { name: "Add component menu" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Git repository" }));

    const newComponentCard = getComponentCard("Component 1");
    expect(newComponentCard.queries.getByRole("combobox", { name: "Type" })).toHaveValue(
      "Git repository"
    );
    expect(newComponentCard.queries.getByRole("textbox", { name: "Name" })).toHaveValue(
      "Repository 1"
    );
    expect(newComponentCard.queries.getByRole("textbox", { name: "Key" })).toHaveValue(
      "repository-1"
    );
    expect(newComponentCard.queries.getByRole("radio", { name: "Git URL" })).toBeChecked();
    expect(newComponentCard.queries.getByRole("textbox", { name: "Local path" })).toBeDisabled();
    expect(newComponentCard.queries.getByRole("textbox", { name: "Git URL" })).toHaveValue(
      "https://github.com/keystone/repository-1.git"
    );
    const componentActions = newComponentCard.card.querySelector(".project-form-actions");
    expect(componentActions).not.toBeNull();
    expect(
      within(componentActions as HTMLElement).getByRole("button", { name: "Remove" })
    ).toBeEnabled();

    fireEvent.click(newComponentCard.queries.getByRole("radio", { name: "Local path" }));
    expect(newComponentCard.queries.getByRole("textbox", { name: "Local path" })).toBeEnabled();
    expect(newComponentCard.queries.getByRole("textbox", { name: "Git URL" })).toBeDisabled();

    fireEvent.click(
      within(componentActions as HTMLElement).getByRole("button", { name: "Remove" })
    );

    expect(
      await screen.findByText("Add repository components before creating the project.")
    ).toBeInTheDocument();
  });

  it("keeps the project rule add/remove list controls usable", async () => {
    renderRoute("/projects/new/rules");

    expect(await screen.findByRole("heading", { name: "Rules" })).toBeInTheDocument();

    const reviewFieldset = screen.getByRole("group", {
      name: "Project review instructions"
    });
    const testFieldset = screen.getByRole("group", {
      name: "Project test instructions"
    });

    fireEvent.click(within(reviewFieldset).getByRole("button", { name: "Add review instruction" }));
    fireEvent.click(within(testFieldset).getByRole("button", { name: "Add test instruction" }));

    const newReviewInstruction = within(reviewFieldset).getByRole("textbox", {
      name: "Project review instructions 3"
    });
    const newTestInstruction = within(testFieldset).getByRole("textbox", {
      name: "Project test instructions 3"
    });

    fireEvent.change(newReviewInstruction, {
      target: {
        value: "Review the newly added instruction."
      }
    });
    fireEvent.change(newTestInstruction, {
      target: {
        value: "Run the newly added test instruction."
      }
    });

    expect(newReviewInstruction).toHaveValue("Review the newly added instruction.");
    expect(newTestInstruction).toHaveValue("Run the newly added test instruction.");

    fireEvent.click(within(reviewFieldset).getAllByRole("button", { name: "Remove" }).at(-1)!);
    fireEvent.click(within(testFieldset).getAllByRole("button", { name: "Remove" }).at(-1)!);

    expect(
      within(reviewFieldset).queryByRole("textbox", {
        name: "Project review instructions 3"
      })
    ).not.toBeInTheDocument();
    expect(
      within(testFieldset).queryByRole("textbox", {
        name: "Project test instructions 3"
      })
    ).not.toBeInTheDocument();
  });

  it("shows overview validation errors before posting the new project", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url !== "/v1/projects") {
        throw new Error(`Unexpected fetch request: ${url}`);
      }

      return createJsonResponse(buildProjectsResponse([scaffoldProject]));
    });

    vi.stubGlobal("fetch", fetchMock);

    const { router } = renderRoute("/projects/new/overview", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: {
        value: ""
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Project key" }), {
      target: {
        value: ""
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: {
        value: ""
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByText("Fix the validation errors before creating the project.")).toBeInTheDocument();
    expect(screen.getByText("Project name is required.")).toBeInTheDocument();
    expect(screen.getByText("Project key is required.")).toBeInTheDocument();
    expect(screen.getByText("Description is required.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe("/projects/new/overview");
  });

  it("creates a real project, refreshes the live list, and lands on the new project's runs", async () => {
    const createdProject = {
      components: [
        {
          componentKey: "control-plane",
          config: {
            localPath: "./apps/control-plane",
            ref: "main"
          },
          displayName: "Control Plane",
          kind: "git_repository" as const,
          ruleOverride: {
            reviewInstructions: ["Focus on control plane changes"],
            testInstructions: ["Run control plane tests"]
          }
        }
      ],
      description: "Live operator workspace for the Control Plane.",
      displayName: "Operator Hub",
      envVars: [
        {
          name: "KEYSTONE_AGENT_RUNTIME",
          value: "scripted"
        },
        {
          name: "KEYSTONE_CHAT_COMPLETIONS_BASE_URL",
          value: "http://localhost:10531"
        },
        {
          name: "KEYSTONE_CHAT_COMPLETIONS_MODEL",
          value: "gpt-5.4-mini"
        },
        {
          name: "KEYSTONE_FEATURE_FLAG",
          value: "live"
        }
      ],
      projectId: "project-operator-hub",
      projectKey: "operator-hub",
      ruleSet: {
        reviewInstructions: [
          "Review the orchestration boundaries.",
          "Capture component-specific review focus when needed."
        ],
        testInstructions: [
          "Run the operator smoke test.",
          "Verify the project configuration tabs."
        ]
      }
    };
    const { fetchMock, postedBodies } = stubProjectCreateFlowFetch({
      createdProject
    });
    const { router } = renderRoute("/projects/new/overview", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: {
        value: createdProject.displayName
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Project key" }), {
      target: {
        value: createdProject.projectKey
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: {
        value: createdProject.description
      }
    });

    fireEvent.click(screen.getByRole("link", { name: "Rules" }));
    expect(await screen.findByRole("heading", { name: "Rules" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Project review instructions 1" }), {
      target: {
        value: createdProject.ruleSet.reviewInstructions[0]
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Project test instructions 1" }), {
      target: {
        value: createdProject.ruleSet.testInstructions[0]
      }
    });

    fireEvent.click(screen.getByRole("link", { name: "Components" }));
    expect(await screen.findByRole("heading", { name: "Components" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Add component" }));
    fireEvent.click(screen.getByRole("button", { name: "Git repository" }));

    const newComponentCard = getComponentCard("Component 1");
    fireEvent.change(newComponentCard.queries.getByRole("textbox", { name: "Name" }), {
      target: {
        value: createdProject.components[0]!.displayName
      }
    });
    fireEvent.change(newComponentCard.queries.getByRole("textbox", { name: "Key" }), {
      target: {
        value: createdProject.components[0]!.componentKey
      }
    });
    fireEvent.click(newComponentCard.queries.getByRole("radio", { name: "Local path" }));
    fireEvent.change(newComponentCard.queries.getByRole("textbox", { name: "Local path" }), {
      target: {
        value: createdProject.components[0]!.config.localPath
      }
    });
    fireEvent.change(newComponentCard.queries.getByRole("textbox", { name: "Default ref" }), {
      target: {
        value: createdProject.components[0]!.config.ref
      }
    });
    fireEvent.change(newComponentCard.queries.getByRole("textbox", { name: "Review 1" }), {
      target: {
        value: createdProject.components[0]!.ruleOverride?.reviewInstructions?.[0]
      }
    });
    fireEvent.change(newComponentCard.queries.getByRole("textbox", { name: "Test 1" }), {
      target: {
        value: createdProject.components[0]!.ruleOverride?.testInstructions?.[0]
      }
    });

    fireEvent.click(screen.getByRole("link", { name: "Environment" }));
    expect(await screen.findByRole("heading", { name: "Environment" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Add environment variable" }));
    const environmentNameFields = screen.getAllByRole("textbox", { name: "Name" });
    const environmentValueFields = screen.getAllByRole("textbox", { name: "Value" });
    fireEvent.change(environmentNameFields.at(-1) as HTMLElement, {
      target: {
        value: createdProject.envVars[3]!.name
      }
    });
    fireEvent.change(environmentValueFields.at(-1) as HTMLElement, {
      target: {
        value: createdProject.envVars[3]!.value
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByRole("heading", { name: "No runs yet" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs");
    });
    expect(getProjectSelector()).toHaveDisplayValue("Operator Hub");
    expect(postedBodies).toEqual([
      {
        projectKey: createdProject.projectKey,
        displayName: createdProject.displayName,
        description: createdProject.description,
        ruleSet: createdProject.ruleSet,
        components: createdProject.components,
        envVars: createdProject.envVars
      }
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("keeps the created project selected when the list refresh after POST fails", async () => {
    const createdProject = {
      components: [
        {
          componentKey: "operator-console",
          config: {
            gitUrl: "https://github.com/keystone/operator-console.git",
            ref: "main"
          },
          displayName: "Operator Console",
          kind: "git_repository" as const
        }
      ],
      description: "Live operator workspace for the Operator Console.",
      displayName: "Operator Console",
      envVars: [
        {
          name: "KEYSTONE_AGENT_RUNTIME",
          value: "scripted"
        },
        {
          name: "KEYSTONE_CHAT_COMPLETIONS_BASE_URL",
          value: "http://localhost:10531"
        },
        {
          name: "KEYSTONE_CHAT_COMPLETIONS_MODEL",
          value: "gpt-5.4-mini"
        }
      ],
      projectId: "project-operator-console",
      projectKey: "operator-console",
      ruleSet: {
        reviewInstructions: ["Review the operator console boundaries."],
        testInstructions: ["Run the operator console smoke test."]
      }
    };
    const { fetchMock, postedBodies } = stubProjectCreateFlowFetch({
      createdProject,
      refreshedProjectsResponse: () =>
        createJsonResponse(
          {
            error: {
              code: "request_failed",
              message: "Unable to load projects (503).",
              details: null
            }
          },
          503
        )
    });
    const { router } = renderRoute("/projects/new/overview", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: {
        value: createdProject.displayName
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Project key" }), {
      target: {
        value: createdProject.projectKey
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: {
        value: createdProject.description
      }
    });

    fireEvent.click(screen.getByRole("link", { name: "Components" }));
    expect(await screen.findByRole("heading", { name: "Components" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Add component" }));
    fireEvent.click(screen.getByRole("button", { name: "Git repository" }));

    const newComponentCard = getComponentCard("Component 1");
    fireEvent.change(newComponentCard.queries.getByRole("textbox", { name: "Name" }), {
      target: {
        value: createdProject.components[0]!.displayName
      }
    });
    fireEvent.change(newComponentCard.queries.getByRole("textbox", { name: "Key" }), {
      target: {
        value: createdProject.components[0]!.componentKey
      }
    });
    fireEvent.change(newComponentCard.queries.getByRole("textbox", { name: "Git URL" }), {
      target: {
        value: createdProject.components[0]!.config.gitUrl
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByRole("heading", { name: "No runs yet" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs");
    });
    expect(getProjectSelector()).toHaveDisplayValue("Operator Console");
    expect(screen.queryByRole("heading", { name: "Unable to load projects" })).not.toBeInTheDocument();
    expect(postedBodies).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("loads live project settings, redirects to components, and keeps the tabs editable", async () => {
    const liveProjectDetail: ProjectDetailFixture = {
      projectId: scaffoldProject.projectId,
      projectKey: scaffoldProject.projectKey,
      displayName: scaffoldProject.displayName,
      description: "Internal operator workspace for runs, documentation, and workstreams.",
      ruleSet: {
        reviewInstructions: ["Keep route ownership explicit."],
        testInstructions: ["Run the focused shell tests."]
      },
      components: [
        {
          componentKey: "api",
          displayName: "API",
          kind: "git_repository",
          config: {
            localPath: "./services/api",
            ref: "main"
          },
          ruleOverride: {
            reviewInstructions: ["Focus on API changes"],
            testInstructions: ["Run targeted API tests"]
          }
        }
      ],
      envVars: [
        {
          name: "KEYSTONE_AGENT_RUNTIME",
          value: "scripted"
        }
      ]
    };

    stubProjectSettingsFlowFetch({
      project: liveProjectDetail,
      detailResponses: [() => createJsonResponse(buildProjectDetailResponse(liveProjectDetail))]
    });

    const { container, router } = renderRoute("/settings", { useBrowserProjectApi: true });

    expect(
      await screen.findByRole("heading", { name: "Project settings: Keystone Cloudflare" })
    ).toBeInTheDocument();
    expectProjectConfigurationChromeRemoved(container);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/settings/components");
    });

    const projectTabs = screen.getByRole("navigation", { name: "Project configuration tabs" });
    const currentComponentCard = getComponentCard("Component 1");

    expect(currentComponentCard.queries.getByRole("combobox", { name: "Type" })).toHaveValue(
      "Git repository"
    );
    expect(currentComponentCard.queries.getByRole("textbox", { name: "Name" })).toHaveValue("API");
    expect(currentComponentCard.queries.getByRole("textbox", { name: "Key" })).toHaveValue("api");
    expect(currentComponentCard.queries.getByRole("radio", { name: "Local path" })).toBeChecked();
    expect(currentComponentCard.queries.getByRole("textbox", { name: "Local path" })).toHaveValue(
      "./services/api"
    );
    expect(
      currentComponentCard.queries.getAllByRole("button", { name: "Remove" }).at(-1)
    ).toBeEnabled();

    fireEvent.click(getLinkByHref(projectTabs, "/settings/environment"));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/settings/environment");
    });

    expect(screen.getByRole("heading", { name: "Environment" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("KEYSTONE_AGENT_RUNTIME");
    expect(screen.getByRole("textbox", { name: "Value" })).toHaveValue("scripted");

    fireEvent.click(getLinkByHref(projectTabs, "/settings/overview"));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/settings/overview");
    });

    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Project name" })).toHaveValue(
      "Keystone Cloudflare"
    );
    expect(screen.getByRole("textbox", { name: "Project key" })).toHaveValue("keystone-cloudflare");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Internal operator workspace for runs, documentation, and workstreams."
    );
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("discards project settings edits from the shared footer and restores the loaded draft", async () => {
    const initialProjectDetail: ProjectDetailFixture = {
      projectId: scaffoldProject.projectId,
      projectKey: scaffoldProject.projectKey,
      displayName: scaffoldProject.displayName,
      description: "Internal operator workspace for runs, documentation, and workstreams.",
      ruleSet: {
        reviewInstructions: ["Keep route ownership explicit."],
        testInstructions: ["Run the focused shell tests."]
      },
      components: [
        {
          componentKey: "api",
          displayName: "API",
          kind: "git_repository",
          config: {
            localPath: "./services/api",
            ref: "main"
          },
          ruleOverride: {
            reviewInstructions: ["Focus on API changes"],
            testInstructions: ["Run targeted API tests"]
          }
        }
      ],
      envVars: [
        {
          name: "KEYSTONE_AGENT_RUNTIME",
          value: "scripted"
        }
      ]
    };

    const { postedBodies } = stubProjectSettingsFlowFetch({
      project: initialProjectDetail,
      detailResponses: [() => createJsonResponse(buildProjectDetailResponse(initialProjectDetail))]
    });

    const { router } = renderRoute("/settings/overview", { useBrowserProjectApi: true });

    expect(
      await screen.findByRole("heading", { name: "Project settings: Keystone Cloudflare" })
    ).toBeInTheDocument();
    expect(await screen.findByRole("textbox", { name: "Project name" })).toHaveValue(
      "Keystone Cloudflare"
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: {
        value: "Keystone Edge Control"
      }
    });

    expect(screen.getByRole("button", { name: "Discard changes" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();

    fireEvent.click(screen.getByRole("link", { name: "Components" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/settings/components");
    });
    expect(screen.getByRole("heading", { name: "Components" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole("link", { name: "Overview" }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/settings/overview");
    });

    expect(await screen.findByRole("textbox", { name: "Project name" })).toHaveValue(
      "Keystone Cloudflare"
    );
    expect(postedBodies).toEqual([]);
  });

  it("saves live project settings, shows save progress, and refreshes the shell summary", async () => {
    const initialProjectDetail: ProjectDetailFixture = {
      projectId: scaffoldProject.projectId,
      projectKey: scaffoldProject.projectKey,
      displayName: scaffoldProject.displayName,
      description: "Internal operator workspace for runs, documentation, and workstreams.",
      ruleSet: {
        reviewInstructions: ["Keep route ownership explicit."],
        testInstructions: ["Run the focused shell tests."]
      },
      components: [
        {
          componentKey: "api",
          displayName: "API",
          kind: "git_repository",
          config: {
            localPath: "./services/api",
            ref: "main"
          },
          ruleOverride: {
            reviewInstructions: ["Focus on API changes"],
            testInstructions: ["Run targeted API tests"]
          }
        }
      ],
      envVars: [
        {
          name: "KEYSTONE_AGENT_RUNTIME",
          value: "scripted"
        }
      ]
    };
    const updatedProjectDetail: ProjectDetailFixture = {
      ...initialProjectDetail,
      projectKey: "keystone-edge-control",
      displayName: "Keystone Edge Control",
      description: "Updated operator workspace for live project settings.",
      ruleSet: {
        reviewInstructions: [
          "Keep route ownership explicit.",
          "Audit the new edge control flow."
        ],
        testInstructions: ["Run the focused shell tests."]
      },
      components: [
        {
          ...initialProjectDetail.components[0]!,
          componentKey: "edge-api",
          displayName: "Edge API"
        }
      ],
      envVars: [
        ...initialProjectDetail.envVars,
        {
          name: "EDGE_MODE",
          value: "enabled"
        }
      ]
    };
    let resolvePatchResponse: ((response: Response) => void) | null = null;
    const patchResponse = new Promise<Response>((resolve) => {
      resolvePatchResponse = resolve;
    });

    const { fetchMock, postedBodies } = stubProjectSettingsFlowFetch({
      project: initialProjectDetail,
      detailResponses: [() => createJsonResponse(buildProjectDetailResponse(initialProjectDetail))],
      patchResponses: [() => patchResponse]
    });

    const { router } = renderRoute("/settings/overview", { useBrowserProjectApi: true });

    expect(
      await screen.findByRole("heading", { name: "Project settings: Keystone Cloudflare" })
    ).toBeInTheDocument();
    expect(await screen.findByRole("textbox", { name: "Project name" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: {
        value: updatedProjectDetail.displayName
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Project key" }), {
      target: {
        value: updatedProjectDetail.projectKey
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: {
        value: updatedProjectDetail.description
      }
    });

    fireEvent.click(screen.getByRole("link", { name: "Rules" }));
    expect(await screen.findByRole("heading", { name: "Rules" })).toBeInTheDocument();

    const reviewFieldset = screen.getByRole("group", {
      name: "Project review instructions"
    });
    fireEvent.click(within(reviewFieldset).getByRole("button", { name: "Add review instruction" }));
    fireEvent.change(
      within(reviewFieldset).getByRole("textbox", {
        name: "Project review instructions 2"
      }),
      {
        target: {
          value: "Audit the new edge control flow."
        }
      }
    );

    fireEvent.click(screen.getByRole("link", { name: "Components" }));
    expect(await screen.findByRole("heading", { name: "Components" })).toBeInTheDocument();
    fireEvent.change(getComponentCard("Component 1").queries.getByRole("textbox", { name: "Name" }), {
      target: {
        value: "Edge API"
      }
    });
    fireEvent.change(getComponentCard("Component 1").queries.getByRole("textbox", { name: "Key" }), {
      target: {
        value: "edge-api"
      }
    });

    fireEvent.click(screen.getByRole("link", { name: "Environment" }));
    expect(await screen.findByRole("heading", { name: "Environment" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Add environment variable" }));
    const environmentNameFields = screen.getAllByRole("textbox", { name: "Name" });
    const environmentValueFields = screen.getAllByRole("textbox", { name: "Value" });

    fireEvent.change(environmentNameFields[1]!, {
      target: {
        value: "EDGE_MODE"
      }
    });
    fireEvent.change(environmentValueFields[1]!, {
      target: {
        value: "enabled"
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("button", { name: "Saving changes..." })).toBeDisabled();

    expect(resolvePatchResponse).not.toBeNull();
    resolvePatchResponse!(createJsonResponse(buildProjectDetailResponse(updatedProjectDetail)));

    expect(
      await screen.findByRole("heading", { name: "Project settings: Keystone Edge Control" })
    ).toBeInTheDocument();
    expect(getProjectSelector()).toHaveDisplayValue("Keystone Edge Control");
    expect(
      screen
        .getAllByRole("textbox", { name: "Name" })
        .map((input) => (input as HTMLInputElement).value)
    ).toEqual(["KEYSTONE_AGENT_RUNTIME", "EDGE_MODE"]);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();
    expect(postedBodies).toEqual([
      {
        projectKey: "keystone-edge-control",
        displayName: "Keystone Edge Control",
        description: "Updated operator workspace for live project settings.",
        ruleSet: {
          reviewInstructions: [
            "Keep route ownership explicit.",
            "Audit the new edge control flow."
          ],
          testInstructions: ["Run the focused shell tests."]
        },
        components: [
          {
            componentKey: "edge-api",
            displayName: "Edge API",
            kind: "git_repository",
            config: {
              localPath: "./services/api",
              ref: "main"
            },
            ruleOverride: {
              reviewInstructions: ["Focus on API changes"],
              testInstructions: ["Run targeted API tests"]
            }
          }
        ],
        envVars: [
          {
            name: "KEYSTONE_AGENT_RUNTIME",
            value: "scripted"
          },
          {
            name: "EDGE_MODE",
            value: "enabled"
          }
        ]
      }
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(router.state.location.pathname).toBe("/settings/environment");
  });

  it("keeps switched settings safe during save, preserves null descriptions, and refreshes sidebar project options", async () => {
    const alternateProject: CurrentProject = {
      projectId: "project-alt",
      projectKey: "alt-project",
      displayName: "Alt Project",
      description: "Secondary workspace"
    };
    const initialProjectDetail: ProjectDetailFixture = {
      projectId: scaffoldProject.projectId,
      projectKey: scaffoldProject.projectKey,
      displayName: scaffoldProject.displayName,
      description: null,
      ruleSet: {
        reviewInstructions: ["Keep route ownership explicit."],
        testInstructions: ["Run the focused shell tests."]
      },
      components: [
        {
          componentKey: "api",
          displayName: "API",
          kind: "git_repository",
          config: {
            localPath: "./services/api",
            ref: "main"
          }
        }
      ],
      envVars: [
        {
          name: "KEYSTONE_AGENT_RUNTIME",
          value: "scripted"
        }
      ]
    };
    const savedProjectDetail: ProjectDetailFixture = {
      ...initialProjectDetail,
      projectKey: "keystone-edge-control",
      displayName: "Keystone Edge Control"
    };
    const alternateProjectDetail: ProjectDetailFixture = {
      projectId: alternateProject.projectId,
      projectKey: alternateProject.projectKey,
      displayName: alternateProject.displayName,
      description: "Secondary workspace",
      ruleSet: {
        reviewInstructions: ["Audit the alternate tenant flow."],
        testInstructions: ["Run the focused alt shell tests."]
      },
      components: [
        {
          componentKey: "alt-api",
          displayName: "Alt API",
          kind: "git_repository",
          config: {
            gitUrl: "https://github.com/keystone/alt-api.git",
            ref: "main"
          }
        }
      ],
      envVars: [
        {
          name: "ALT_RUNTIME",
          value: "workers"
        }
      ]
    };
    const postedBodies: unknown[] = [];
    let resolvePatchResponse: ((response: Response) => void) | null = null;
    let resolveAltDetailResponse: ((response: Response) => void) | null = null;
    const patchResponse = new Promise<Response>((resolve) => {
      resolvePatchResponse = resolve;
    });
    const altDetailResponse = new Promise<Response>((resolve) => {
      resolveAltDetailResponse = resolve;
    });
    const fetchMock = vi.fn(async (request: RequestInfo | URL, init?: RequestInit) => {
      expectDevAuthHeaders(request, init);

      const url = typeof request === "string" ? request : request.toString();
      const method = request instanceof Request ? request.method : init?.method ?? "GET";

      if (url === "/v1/projects" && method === "GET") {
        return createJsonResponse(buildProjectsResponse([scaffoldProject, alternateProject]));
      }

      if (url === `/v1/projects/${scaffoldProject.projectId}` && method === "GET") {
        return createJsonResponse(buildProjectDetailResponse(initialProjectDetail));
      }

      if (url === `/v1/projects/${alternateProject.projectId}` && method === "GET") {
        return await altDetailResponse;
      }

      if (url === `/v1/projects/${scaffoldProject.projectId}` && method === "PATCH") {
        const bodyText =
          request instanceof Request ? await request.text() : String(init?.body ?? "");

        postedBodies.push(JSON.parse(bodyText));

        return await patchResponse;
      }

      throw new Error(`Unexpected fetch request: ${method} ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    renderRoute("/settings/overview", { useBrowserProjectApi: true });

    expect(
      await screen.findByRole("heading", { name: "Project settings: Keystone Cloudflare" })
    ).toBeInTheDocument();
    expect(await screen.findByRole("textbox", { name: "Project name" })).toHaveValue(
      "Keystone Cloudflare"
    );
    expect(screen.getByRole("textbox", { name: "Project key" })).toHaveValue(
      "keystone-cloudflare"
    );
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("");

    fireEvent.change(screen.getByRole("textbox", { name: "Project name" }), {
      target: {
        value: savedProjectDetail.displayName
      }
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Project key" }), {
      target: {
        value: savedProjectDetail.projectKey
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("button", { name: "Saving changes..." })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Project name" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Project key" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Description" })).toBeDisabled();

    fireEvent.change(getProjectSelector(), {
      target: {
        value: alternateProject.projectId
      }
    });

    expect(
      await screen.findByRole("heading", { name: "Project settings: Alt Project" })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Loading project settings" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Project name" })).not.toBeInTheDocument();

    expect(resolveAltDetailResponse).not.toBeNull();
    resolveAltDetailResponse!(createJsonResponse(buildProjectDetailResponse(alternateProjectDetail)));

    expect(await screen.findByRole("textbox", { name: "Project name" })).toHaveValue("Alt Project");
    expect(screen.getByRole("textbox", { name: "Project key" })).toHaveValue("alt-project");

    expect(resolvePatchResponse).not.toBeNull();
    resolvePatchResponse!(createJsonResponse(buildProjectDetailResponse(savedProjectDetail)));

    await waitFor(() => {
      expect(getProjectSelector()).toHaveDisplayValue("Alt Project");
    });
    expect(screen.getByRole("textbox", { name: "Project name" })).toHaveValue("Alt Project");

    const updatedPrimaryOption = screen.getByRole("option", {
      name: /Keystone Edge Control/i
    }) as HTMLOptionElement;

    expect(updatedPrimaryOption.selected).toBe(false);
    expect(updatedPrimaryOption).toHaveTextContent("Keystone Edge Control");
    expect(
      (screen.getByRole("option", { name: /Alt Project/i }) as HTMLOptionElement).selected
    ).toBe(true);
    expect(postedBodies).toEqual([
      {
        projectKey: "keystone-edge-control",
        displayName: "Keystone Edge Control",
        description: null,
        ruleSet: {
          reviewInstructions: ["Keep route ownership explicit."],
          testInstructions: ["Run the focused shell tests."]
        },
        components: [
          {
            componentKey: "api",
            displayName: "API",
            kind: "git_repository",
            config: {
              localPath: "./services/api",
              ref: "main"
            }
          }
        ],
        envVars: [
          {
            name: "KEYSTONE_AGENT_RUNTIME",
            value: "scripted"
          }
        ]
      }
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
