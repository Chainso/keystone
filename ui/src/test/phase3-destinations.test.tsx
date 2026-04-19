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

  it("opens canonical workstream task routes without falling back to placeholder task ids", async () => {
    renderRoute("/runs/run-103/execution/tasks/task-021");

    expect(await screen.findByRole("heading", { name: "Run-103 / TASK-021" })).toBeInTheDocument();
    expect(screen.getByText("Docs refresh")).toBeInTheDocument();

    cleanup();

    renderRoute("/runs/run-101/execution/tasks/task-019");

    expect(await screen.findByRole("heading", { name: "Run-101 / TASK-019" })).toBeInTheDocument();
    expect(screen.getByText("Review fix")).toBeInTheDocument();
  });

  it("redirects /projects/new to overview and keeps the project-configuration tab routes concrete", async () => {
    const { router } = renderRoute("/projects/new");

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/projects/new/overview");
    });

    const projectTabs = screen.getByRole("navigation", { name: "Project configuration tabs" });

    expect(screen.getByText("Checkout workflow")).toBeInTheDocument();

    const rulesTab = getLinkByHref(projectTabs, "/projects/new/rules");
    expect(rulesTab).toHaveAttribute("href", "/projects/new/rules");

    fireEvent.click(rulesTab);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/projects/new/rules");
    });

    expect(screen.getByRole("heading", { name: "Project-wide rules" })).toBeInTheDocument();

    const environmentTab = getLinkByHref(projectTabs, "/projects/new/environment");
    expect(environmentTab).toHaveAttribute("href", "/projects/new/environment");

    fireEvent.click(environmentTab);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/projects/new/environment");
    });

    expect(screen.getByRole("heading", { name: "Project environment" })).toBeInTheDocument();
    expect(screen.getByText("KEYSTONE_AGENT_RUNTIME")).toBeInTheDocument();
  });

  it("redirects /settings to components, supports tab navigation, and models both git_repository source modes", async () => {
    const { router } = renderRoute("/settings");

    expect(
      await screen.findByRole("heading", { name: "Project settings: Keystone Cloudflare" })
    ).toBeInTheDocument();
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

    expect(screen.getByRole("heading", { name: "Project environment" })).toBeInTheDocument();
    expect(screen.getByText("KEYSTONE_AGENT_RUNTIME")).toBeInTheDocument();

    fireEvent.click(getLinkByHref(projectTabs, "/settings/components"));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/settings/components");
    });

    const currentComponentCard = getComponentCard("Component 1");
    expect(currentComponentCard.queries.getByText("./")).toBeInTheDocument();
    expect(
      currentComponentCard.queries.getByText("Not used for local workspace source.")
    ).toBeInTheDocument();
    expect(currentComponentCard.card.querySelector(".source-mode-pill.is-active")).toHaveTextContent(
      "Local path"
    );

    fireEvent.click(screen.getByRole("button", { name: /\+ Add component/i }));
    expect(screen.getByRole("heading", { name: "Add component menu" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Git repository/i }));

    const newComponentCard = getComponentCard("Component 2");
    expect(newComponentCard.queries.getByText("background-worker-2")).toBeInTheDocument();
    expect(
      newComponentCard.queries.getByText("https://github.com/keystone/background-worker-2.git")
    ).toBeInTheDocument();
    expect(newComponentCard.queries.getByText("Not used for remote Git source.")).toBeInTheDocument();
    expect(newComponentCard.card.querySelector(".source-mode-pill.is-active")).toHaveTextContent(
      "Git URL"
    );
  });
});
