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

describe("Phase 3 destination scaffolds", () => {
  it("switches the documentation viewer between placeholder project documents", async () => {
    renderRoute("/documentation");

    expect(await screen.findByRole("heading", { name: "Project documentation" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Current living product specification" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Open questions/i }));

    expect(await screen.findByRole("heading", { name: "Open questions" })).toBeInTheDocument();
    expect(screen.getByText(/local placeholder viewer/i)).toBeInTheDocument();
  });

  it("filters placeholder workstreams while keeping execution task route targets intact", async () => {
    renderRoute("/workstreams");

    expect(
      await screen.findByRole("heading", { name: "Active and queued project work" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Blocked/i }));

    expect(screen.getByRole("link", { name: "Open TASK-033 in Run-102" })).toHaveAttribute(
      "href",
      "/runs/run-102/execution/tasks/task-033"
    );
    expect(
      screen.queryByRole("link", { name: "Open TASK-034 in Run-104" })
    ).not.toBeInTheDocument();
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
