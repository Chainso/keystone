// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { currentProjectStorageKey, type CurrentProject } from "../features/projects/project-context";
import {
  createStaticRunManagementApi,
  type StaticRunDetailRecord
} from "../features/runs/run-management-api";
import { WorkstreamsBoard } from "../features/workstreams/components/workstreams-board";
import { renderRoute } from "./render-route";
import {
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
        name: "Blocked task visibility",
        runId: "run-101",
        startedAt: "2026-04-20T12:01:00.000Z",
        status: "blocked",
        taskId: "task-019"
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
    renderRoute("/documentation");

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

  it("renders the canonical workstreams rows and filters them without the removed right rail", async () => {
    renderRoute("/workstreams");

    expect(
      await screen.findByRole("heading", { name: "Active and queued project work" })
    ).toBeInTheDocument();
    expect(screen.getByText("Filters:")).toBeInTheDocument();
    expect(screen.queryByText("Still intentionally stubbed")).not.toBeInTheDocument();
    expectWorkstreamRows([
      ["TASK-032", "Run shell navigation", "Run-104", "Running", "2m ago"],
      ["TASK-033", "Task detail routing", "Run-104", "Queued", "4m ago"],
      ["TASK-021", "Documentation curation", "Run-103", "Running", "9m ago"],
      ["TASK-019", "Blocked task visibility", "Run-101", "Blocked", "1h ago"]
    ]);
    expectWorkstreamLink("TASK-032", "/runs/run-104/execution/tasks/task-032");
    expectWorkstreamLink("TASK-033", "/runs/run-104/execution/tasks/task-033");
    expectWorkstreamLink("TASK-021", "/runs/run-103/execution/tasks/task-021");
    expectWorkstreamLink("TASK-019", "/runs/run-101/execution/tasks/task-019");
    expect(screen.getByLabelText("Workstreams pagination")).toHaveTextContent(
      "Showing 1-4 of 4 tasks · Page 1 of 1"
    );

    fireEvent.click(screen.getByRole("button", { name: "Running" }));
    expectWorkstreamRows([
      ["TASK-032", "Run shell navigation", "Run-104", "Running", "2m ago"],
      ["TASK-021", "Documentation curation", "Run-103", "Running", "9m ago"]
    ]);
    expectWorkstreamLink("TASK-021", "/runs/run-103/execution/tasks/task-021");

    fireEvent.click(screen.getByRole("button", { name: "Queued" }));
    expectWorkstreamRows([["TASK-033", "Task detail routing", "Run-104", "Queued", "4m ago"]]);

    fireEvent.click(screen.getByRole("button", { name: "Blocked" }));
    expectWorkstreamRows([["TASK-019", "Blocked task visibility", "Run-101", "Blocked", "1h ago"]]);
    expectWorkstreamLink("TASK-019", "/runs/run-101/execution/tasks/task-019");

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expectWorkstreamRows([
      ["TASK-032", "Run shell navigation", "Run-104", "Running", "2m ago"],
      ["TASK-033", "Task detail routing", "Run-104", "Queued", "4m ago"],
      ["TASK-021", "Documentation curation", "Run-103", "Running", "9m ago"],
      ["TASK-019", "Blocked task visibility", "Run-101", "Blocked", "1h ago"]
    ]);
  });

  it("renders a compatibility state for workstreams on a non-scaffold live project", async () => {
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

    renderRoute("/workstreams", { useBrowserProjectApi: true });

    expect(
      await screen.findByRole("heading", { name: "Active and queued project work" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Workstreams are not available for this project yet" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Project workstreams still depend on scaffold-backed task data\./i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("keeps workstream filters visible when the active filter yields zero rows", () => {
    const setActiveFilter = vi.fn();

    render(
      <WorkstreamsBoard
        model={{
          title: "Active and queued project work",
          filters: [
            {
              filterId: "all",
              label: "All",
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
          rows: [],
          pagination: {
            currentPage: 1,
            pageCount: 1,
            rangeLabel: "Showing 0 of 0 tasks"
          },
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

  it("opens a workstream task when the user clicks the row body", async () => {
    const { router } = renderRoute("/workstreams", { runApi: workstreamRunApi });

    expect(
      await screen.findByRole("heading", { name: "Active and queued project work" })
    ).toBeInTheDocument();

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
    expect(screen.getByRole("button", { name: /Operator Hub/i })).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: /Operator Console/i })).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: /Keystone Edge Control/i })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: /Keystone Cloudflare/i }));
    fireEvent.click(screen.getByRole("option", { name: /Alt Project/i }));

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
      expect(screen.getByRole("button", { name: /Alt Project/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("textbox", { name: "Project name" })).toHaveValue("Alt Project");

    fireEvent.click(screen.getByRole("button", { name: /Alt Project/i }));

    const updatedPrimaryOption = screen.getByRole("option", { name: /Keystone Edge Control/i });

    expect(updatedPrimaryOption).toHaveAttribute("aria-selected", "false");
    expect(within(updatedPrimaryOption).getByText("keystone-edge-control")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Alt Project/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
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
