// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

import { renderRoute } from "./render-route";

afterEach(() => {
  cleanup();
});

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

  it("redirects /projects/new to the overview tab inside the shared project configuration shell", async () => {
    const { router } = renderRoute("/projects/new");

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/projects/new/overview");
    });

    expect(screen.getByRole("navigation", { name: "Project configuration tabs" })).toBeInTheDocument();
    expect(screen.getByText("Checkout workflow")).toBeInTheDocument();
  });

  it("redirects /settings to components and uses the type picker before showing a new component card", async () => {
    const { router } = renderRoute("/settings");

    expect(
      await screen.findByRole("heading", { name: "Project settings: Keystone Cloudflare" })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/settings/components");
    });

    fireEvent.click(screen.getByRole("button", { name: /\+ Add component/i }));
    expect(screen.getByRole("heading", { name: "Add component menu" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Git repository/i }));

    expect(screen.getByRole("heading", { name: "Component 2" })).toBeInTheDocument();
    expect(screen.getByText("background-worker-2")).toBeInTheDocument();
  });
});
