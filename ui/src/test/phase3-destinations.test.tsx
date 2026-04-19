// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";

import { renderRoute } from "./render-route";

afterEach(() => {
  cleanup();
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

describe("Phase 3 destination scaffolds", () => {
  it("renders the documentation tree shape and switches selection without the removed scaffold chrome", async () => {
    renderRoute("/documentation");

    expect(await screen.findByRole("heading", { name: "Project documentation" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "current living product specification" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Doc tree" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Document viewer" })).toBeInTheDocument();
    expect(screen.queryByText("Phase 3 scaffold")).not.toBeInTheDocument();
    expect(screen.queryByText("Placeholder honesty")).not.toBeInTheDocument();
    expect(screen.queryByText("Deferred work")).not.toBeInTheDocument();

    const documentationTree = screen.getByLabelText("Documentation tree");
    expect(within(documentationTree).getByText("▾ Product Specifications")).toBeInTheDocument();
    expect(within(documentationTree).getByText("▾ Technical Architecture")).toBeInTheDocument();
    expect(within(documentationTree).getByText("▾ Miscellaneous Notes")).toBeInTheDocument();
    expect(within(documentationTree).getAllByText("└─")).toHaveLength(3);
    expect(within(documentationTree).getAllByText("├─")).toHaveLength(1);
    expect(within(documentationTree).getAllByRole("button")).toHaveLength(4);
    expect(within(documentationTree).getAllByRole("button", { name: "Current" })).toHaveLength(2);

    const productGroup = screen.getByText("▾ Product Specifications").closest("section");
    const notesGroup = screen.getByText("▾ Miscellaneous Notes").closest("section");

    expect(productGroup).not.toBeNull();
    expect(notesGroup).not.toBeNull();

    const currentSpecButton = within(productGroup as HTMLElement).getByRole("button", {
      name: "Current"
    });
    const openQuestionsButton = within(notesGroup as HTMLElement).getByRole("button", {
      name: "Open questions"
    });

    expect(currentSpecButton).toHaveAttribute("aria-pressed", "true");
    expect(openQuestionsButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(openQuestionsButton);

    expect(await screen.findByRole("heading", { name: "open questions" })).toBeInTheDocument();
    expect(
      screen.getByText(/How should current project documents evolve once editing and persistence are added\?/i)
    ).toBeInTheDocument();
    expect(currentSpecButton).toHaveAttribute("aria-pressed", "false");
    expect(openQuestionsButton).toHaveAttribute("aria-pressed", "true");
    expect(
      within(documentationTree)
        .getAllByRole("button")
        .filter((button) => button.getAttribute("aria-pressed") === "true")
    ).toHaveLength(1);
  });

  it("renders the canonical workstreams rows and filters them without the removed right rail", async () => {
    renderRoute("/workstreams");

    expect(
      await screen.findByRole("heading", { name: "Active and queued project work" })
    ).toBeInTheDocument();
    expect(screen.getByText("Filters:")).toBeInTheDocument();
    expect(screen.queryByText("Route handoff")).not.toBeInTheDocument();
    expect(screen.queryByText("Still intentionally stubbed")).not.toBeInTheDocument();
    expectWorkstreamRows([
      ["TASK-032", "Build shell", "Run-104", "Running", "2m ago"],
      ["TASK-033", "DAG wiring", "Run-104", "Queued", "4m ago"],
      ["TASK-021", "Docs refresh", "Run-103", "Running", "9m ago"],
      ["TASK-019", "Review fix", "Run-101", "Blocked", "1h ago"]
    ]);
    expectWorkstreamLink("TASK-032", "/runs/run-104/execution/tasks/task-032");
    expectWorkstreamLink("TASK-033", "/runs/run-104/execution/tasks/task-033");
    expectWorkstreamLink("TASK-021", "/runs/run-103/execution/tasks/task-021");
    expectWorkstreamLink("TASK-019", "/runs/run-101/execution/tasks/task-019");

    fireEvent.click(screen.getByRole("button", { name: "Running" }));
    expectWorkstreamRows([
      ["TASK-032", "Build shell", "Run-104", "Running", "2m ago"],
      ["TASK-021", "Docs refresh", "Run-103", "Running", "9m ago"]
    ]);
    expectWorkstreamLink("TASK-021", "/runs/run-103/execution/tasks/task-021");

    fireEvent.click(screen.getByRole("button", { name: "Queued" }));
    expectWorkstreamRows([["TASK-033", "DAG wiring", "Run-104", "Queued", "4m ago"]]);

    fireEvent.click(screen.getByRole("button", { name: "Blocked" }));
    expectWorkstreamRows([["TASK-019", "Review fix", "Run-101", "Blocked", "1h ago"]]);
    expectWorkstreamLink("TASK-019", "/runs/run-101/execution/tasks/task-019");

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expectWorkstreamRows([
      ["TASK-032", "Build shell", "Run-104", "Running", "2m ago"],
      ["TASK-033", "DAG wiring", "Run-104", "Queued", "4m ago"],
      ["TASK-021", "Docs refresh", "Run-103", "Running", "9m ago"],
      ["TASK-019", "Review fix", "Run-101", "Blocked", "1h ago"]
    ]);
  });

  it("opens a workstream task when the user clicks the row body", async () => {
    const { router } = renderRoute("/workstreams");

    expect(
      await screen.findByRole("heading", { name: "Active and queued project work" })
    ).toBeInTheDocument();

    const blockedRow = screen.getByRole("link", { name: "TASK-019" }).closest("tr");

    expect(blockedRow).not.toBeNull();

    fireEvent.click(within(blockedRow as HTMLElement).getByText("Review fix"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-101/execution/tasks/task-019");
    });
  });

  it("opens canonical workstream task routes without falling back to placeholder task ids", async () => {
    renderRoute("/runs/run-103/execution/tasks/task-021");

    expect(await screen.findByRole("heading", { name: "Run-103 / TASK-021" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("heading", { name: "Task conversation" }).closest("section")!).getByText(
        "Docs refresh"
      )
    ).toBeInTheDocument();

    cleanup();

    renderRoute("/runs/run-101/execution/tasks/task-019");

    expect(await screen.findByRole("heading", { name: "Run-101 / TASK-019" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("heading", { name: "Task conversation" }).closest("section")!).getByText(
        "Review fix"
      )
    ).toBeInTheDocument();
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

    expect(screen.getByRole("textbox", { name: "Project name" })).toHaveValue("Keystone Cloudflare");
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
    expect(screen.getByText("No components added yet.")).toBeInTheDocument();

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
      "Run the component test plan"
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
      "Background worker 2"
    );
    expect(newComponentCard.queries.getByRole("textbox", { name: "Key" })).toHaveValue(
      "background-worker-2"
    );
    expect(newComponentCard.queries.getByRole("radio", { name: "Local path" })).not.toBeChecked();
    expect(newComponentCard.queries.getByRole("radio", { name: "Git URL" })).toBeChecked();
    expect(newComponentCard.queries.getByRole("textbox", { name: "Local path" })).toHaveValue("");
    expect(newComponentCard.queries.getByRole("textbox", { name: "Git URL" })).toHaveValue(
      "https://github.com/keystone/background-worker-2.git"
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
});
