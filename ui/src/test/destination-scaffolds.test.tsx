// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { currentProjectStorageKey, type CurrentProject } from "../features/projects/project-context";
import { WorkstreamsBoard } from "../features/workstreams/components/workstreams-board";
import { renderRoute } from "./render-route";
import { serializeProjectListItem } from "../../../src/http/api/v1/projects/contracts";

const defaultTimestamp = new Date("2026-04-20T12:00:00.000Z");

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

function stubProjectListFetch(projects: CurrentProject[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url !== "/v1/projects") {
      throw new Error(`Unexpected fetch request: ${url}`);
    }

    return new Response(JSON.stringify(buildProjectsResponse(projects)), {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    });
  });

  vi.stubGlobal("fetch", fetchMock);
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
    const { router } = renderRoute("/workstreams");

    expect(
      await screen.findByRole("heading", { name: "Active and queued project work" })
    ).toBeInTheDocument();

    const blockedRow = screen.getByRole("link", { name: "TASK-019" }).closest("tr");

    expect(blockedRow).not.toBeNull();

    fireEvent.click(within(blockedRow as HTMLElement).getByText("Blocked task visibility"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-101/execution/tasks/task-019");
    });
  });

  it("opens canonical workstream task routes without falling back to placeholder task ids", async () => {
    renderRoute("/runs/run-103/execution/tasks/task-021");

    expect(await screen.findByRole("heading", { name: "Run-103 / TASK-021" })).toBeInTheDocument();
    expect(screen.getByLabelText("Conversation status")).toHaveTextContent(
      "Conversation attached to this task."
    );
    expect(screen.getByText("No artifacts recorded for this task yet.")).toBeInTheDocument();

    cleanup();

    renderRoute("/runs/run-101/execution/tasks/task-019");

    expect(await screen.findByRole("heading", { name: "Run-101 / TASK-019" })).toBeInTheDocument();
    expect(screen.getByLabelText("Conversation status")).toHaveTextContent(
      "Conversation attached to this task."
    );
    expect(screen.getByText("No artifacts recorded for this task yet.")).toBeInTheDocument();
  });

  it("renders recorded artifact cards for execution tasks that include review output", async () => {
    renderRoute("/runs/run-104/execution/tasks/task-033");

    expect(await screen.findByRole("heading", { name: "Run-104 / TASK-033" })).toBeInTheDocument();
    expect(screen.getByLabelText("Conversation status")).toHaveTextContent(
      "Conversation attached to this task."
    );
    const artifactCard = screen
      .getByText("ui/src/features/execution/components/task-detail-workspace.tsx")
      .closest("details");

    expect(artifactCard).not.toBeNull();
    expect(artifactCard).toHaveTextContent("Task detail split layout.");
    expect(artifactCard).toHaveTextContent("+ render task updates beside the review sidebar");
    expect(screen.queryByText("No artifacts recorded for this task yet.")).not.toBeInTheDocument();
  });

  it("redirects /projects/new to overview and keeps the project-configuration tab routes concrete", async () => {
    const { container, router } = renderRoute("/projects/new");

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();
    expect(screen.queryByText("Placeholder honesty")).not.toBeInTheDocument();
    expect(screen.queryByText("Current contract")).not.toBeInTheDocument();
    expectProjectConfigurationChromeRemoved(container);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/projects/new/overview");
    });

    const projectTabs = screen.getByRole("navigation", { name: "Project configuration tabs" });

    expect(await screen.findByRole("textbox", { name: "Project name" })).toHaveValue("Keystone Cloudflare");
    expect(screen.getByRole("textbox", { name: "Project key" })).toHaveValue("keystone-cloudflare");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Internal operator workspace for the Keystone Cloudflare project."
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save Draft" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    const rulesTab = getLinkByHref(projectTabs, "/projects/new/rules");
    expect(rulesTab).toHaveAttribute("href", "/projects/new/rules");

    fireEvent.click(rulesTab);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/projects/new/rules");
    });

    expect(screen.getByRole("heading", { name: "Rules" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Project review instructions 1" })).toHaveValue(
      "Keep route ownership explicit."
    );

    const environmentTab = getLinkByHref(projectTabs, "/projects/new/environment");
    expect(environmentTab).toHaveAttribute("href", "/projects/new/environment");

    fireEvent.click(environmentTab);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/projects/new/environment");
    });

    expect(screen.getByRole("heading", { name: "Environment" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "KEYSTONE_AGENT_RUNTIME" })).toHaveValue("scripted");
  });

  it("renders the new-project components board with the add-component control in the body", async () => {
    const { container } = renderRoute("/projects/new/components");

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Components" })).toBeInTheDocument();
    expectProjectConfigurationChromeRemoved(container);

    const componentsSection = screen.getByRole("heading", { name: "Components" }).closest("section");
    expect(componentsSection).not.toBeNull();

    const addComponentButton = screen.getByRole("button", { name: "+ Add component" });
    expect(addComponentButton).toHaveTextContent("+ Add component ▾");
    expect(addComponentButton).toHaveAttribute("aria-expanded", "false");
    expect(
      within(componentsSection as HTMLElement)
        .getByText("Components")
        .closest(".project-config-section-header")
        ?.querySelector("button")
    ).toBeNull();
    expect(
      screen.getByText("Add repository components before saving the project.")
    ).toBeInTheDocument();

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
    expect(newComponentCard.queries.getByRole("radio", { name: "Local path" })).not.toBeChecked();
    expect(newComponentCard.queries.getByRole("radio", { name: "Git URL" })).toBeChecked();
    expect(newComponentCard.queries.getByRole("textbox", { name: "Local path" })).toHaveValue("");
    expect(newComponentCard.queries.getByRole("textbox", { name: "Git URL" })).toHaveValue(
      "https://github.com/keystone/repository-1.git"
    );
    expect(newComponentCard.queries.getByRole("textbox", { name: "Default ref" })).toHaveValue(
      "main"
    );
    expect(newComponentCard.queries.getByText("Optional rule override")).toBeInTheDocument();
    expect(newComponentCard.queries.getByRole("textbox", { name: "Review" })).toHaveValue(
      "Focus on repository boundaries"
    );
    expect(newComponentCard.queries.getByRole("textbox", { name: "Test" })).toHaveValue(
      "Run targeted component tests"
    );
    expect(newComponentCard.queries.getByRole("button", { name: "Remove" })).toBeDisabled();
  });

  it("redirects /settings to components, supports tab navigation, and models both git_repository source modes", async () => {
    const { container, router } = renderRoute("/settings");

    expect(
      await screen.findByRole("heading", { name: "Project settings: Keystone Cloudflare" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Current contract")).not.toBeInTheDocument();
    expect(screen.queryByText("Still intentionally placeholder-only")).not.toBeInTheDocument();
    expectProjectConfigurationChromeRemoved(container);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/settings/components");
    });

    const projectTabs = screen.getByRole("navigation", { name: "Project configuration tabs" });
    const environmentTab = getLinkByHref(projectTabs, "/settings/environment");
    expect(environmentTab).toHaveAttribute("href", "/settings/environment");

    fireEvent.click(environmentTab);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/settings/environment");
    });

    expect(screen.getByRole("heading", { name: "Environment" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "KEYSTONE_AGENT_RUNTIME" })).toHaveValue("scripted");

    fireEvent.click(getLinkByHref(projectTabs, "/settings/components"));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/settings/components");
    });

    const currentComponentCard = getComponentCard("Component 1");
    expect(currentComponentCard.queries.getByRole("combobox", { name: "Type" })).toHaveValue(
      "Git repository"
    );
    expect(currentComponentCard.queries.getByRole("textbox", { name: "Name" })).toHaveValue("API");
    expect(currentComponentCard.queries.getByRole("textbox", { name: "Key" })).toHaveValue("api");
    expect(currentComponentCard.queries.getByRole("radio", { name: "Local path" })).toBeChecked();
    expect(currentComponentCard.queries.getByRole("radio", { name: "Git URL" })).not.toBeChecked();
    expect(currentComponentCard.queries.getByRole("textbox", { name: "Local path" })).toHaveValue(
      "./services/api"
    );
    expect(currentComponentCard.queries.getByRole("textbox", { name: "Git URL" })).toHaveValue("");
    expect(currentComponentCard.queries.getByRole("textbox", { name: "Default ref" })).toHaveValue(
      "main"
    );
    expect(currentComponentCard.queries.getByText("Optional rule override")).toBeInTheDocument();
    expect(currentComponentCard.queries.getByRole("textbox", { name: "Review" })).toHaveValue(
      "Focus on API changes"
    );
    expect(currentComponentCard.queries.getByRole("textbox", { name: "Test" })).toHaveValue(
      "Run targeted API tests"
    );
    expect(currentComponentCard.queries.getByRole("button", { name: "Remove" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "+ Add component" }));
    expect(screen.getByRole("heading", { name: "Add component menu" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Git repository/i }));

    const newComponentCard = getComponentCard("Component 2");
    expect(newComponentCard.queries.getByRole("textbox", { name: "Name" })).toHaveValue(
      "Service 2"
    );
    expect(newComponentCard.queries.getByRole("textbox", { name: "Key" })).toHaveValue(
      "service-2"
    );
    expect(newComponentCard.queries.getByRole("radio", { name: "Local path" })).not.toBeChecked();
    expect(newComponentCard.queries.getByRole("radio", { name: "Git URL" })).toBeChecked();
    expect(newComponentCard.queries.getByRole("textbox", { name: "Local path" })).toHaveValue("");
    expect(newComponentCard.queries.getByRole("textbox", { name: "Git URL" })).toHaveValue(
      "https://github.com/keystone/service-2.git"
    );
  });

  it("renders the settings overview board explicitly instead of relying on the components redirect", async () => {
    const { container } = renderRoute("/settings/overview");

    expect(
      await screen.findByRole("heading", { name: "Project settings: Keystone Cloudflare" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expectProjectConfigurationChromeRemoved(container);
    expect(screen.getByRole("textbox", { name: "Project name" })).toHaveValue(
      "Keystone Cloudflare"
    );
    expect(screen.getByRole("textbox", { name: "Project key" })).toHaveValue("keystone-cloudflare");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Internal operator workspace for runs, documentation, and workstreams."
    );
    expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("reflects a non-default current project across the settings shell and configuration tabs", async () => {
    const customProject = {
      projectId: "project-custom",
      projectKey: "custom-project",
      displayName: "Custom Project",
      description: "Custom project settings scaffold."
    };

    renderRoute("/settings/overview", { project: customProject });

    expect(
      await screen.findByRole("heading", { name: "Project settings: Custom Project" })
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Project name" })).toHaveValue("Custom Project");
    expect(screen.getByRole("textbox", { name: "Project key" })).toHaveValue("custom-project");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue(
      "Custom project settings scaffold."
    );

    fireEvent.click(screen.getByRole("link", { name: "Components" }));

    const currentComponentCard = await screen.findByRole("heading", { name: "Component 1" });
    const componentCard = currentComponentCard.closest("article");

    expect(componentCard).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Project settings: Custom Project" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Description" })).not.toBeInTheDocument();
    expect(within(componentCard as HTMLElement).getByRole("textbox", { name: "Name" })).toHaveValue(
      "API"
    );
  });
});
