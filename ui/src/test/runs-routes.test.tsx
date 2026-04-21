// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";

import { renderRoute } from "./render-route";

afterEach(() => {
  cleanup();
});

describe("run routes", () => {
  it("redirects /runs/:runId to the run's current phase", async () => {
    const { router } = renderRoute("/runs/run-104");

    expect(await screen.findByRole("heading", { name: "Run-104" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/execution");
    });
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        current: "page"
      })
    ).toHaveAttribute("href", "/runs/run-104/execution");
    expect(screen.getByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(screen.queryByText("Current backend coverage")).not.toBeInTheDocument();
  });

  it("redirects run-102 to execution from the run shell", async () => {
    const { router } = renderRoute("/runs/run-102");

    expect(await screen.findByRole("heading", { name: "Run-102" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-102/execution");
    });
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        current: "page"
      })
    ).toHaveAttribute("href", "/runs/run-102/execution");
  });

  it("renders run index rows with run-detail navigation targets", async () => {
    const { router } = renderRoute("/runs");

    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Run-104" })).toHaveAttribute("href", "/runs/run-104");
    expect(screen.getByRole("link", { name: "Run-103" })).toHaveAttribute("href", "/runs/run-103");
    expect(screen.queryByText("Placeholder honesty")).not.toBeInTheDocument();

    const row = screen.getByRole("link", { name: "Run-104" }).closest("tr");

    expect(row).not.toBeNull();

    fireEvent.click(within(row as HTMLElement).getByText("UI workspace build"));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-104/execution");
    });
  });

  it.each([
    {
      path: "/runs/run-104/specification",
      title: "Specification agent chat",
      document: "Living product spec"
    },
    {
      path: "/runs/run-104/architecture",
      title: "Architecture agent chat",
      document: "Living architecture doc"
    },
    {
      path: "/runs/run-104/execution-plan",
      title: "Execution plan conversation",
      document: "Execution plan doc"
    }
  ])("renders the shared planning workspace for $path", async ({ path, title, document }) => {
    renderRoute(path);

    expect(await screen.findByRole("heading", { name: "Run-104" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: document })).toBeInTheDocument();
    if (path === "/runs/run-104/execution-plan") {
      expect(screen.getByText("include scaffold spike")).toBeInTheDocument();
    }
    expect(screen.getByRole("textbox", { name: "Message composer" })).toHaveValue(
      "message composer......................"
    );
    expect(screen.getByRole("navigation", { name: "Run phases" })).toBeInTheDocument();
  });

  it("renders the execution DAG shell", async () => {
    renderRoute("/runs/run-104/execution");

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Build execution drill-down/i })).toHaveAttribute(
      "href",
      "/runs/run-104/execution/tasks/task-032"
    );
    expect(screen.getByRole("link", { name: /DAG wiring/i })).toHaveAttribute(
      "href",
      "/runs/run-104/execution/tasks/task-033"
    );
    expect(
      screen.getByText(/running = highlighted\s+queued = dim\s+done = solid/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText("Click a task node to open that task inside Execution.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Execution summary")).not.toBeInTheDocument();
  });

  it("renders the task detail split inside execution", async () => {
    renderRoute("/runs/run-104/execution/tasks/task-032");

    expect(screen.getByRole("heading", { name: "Run-104 / TASK-032" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Code review sidebar" })).toBeInTheDocument();
    expect(screen.getByText("Changed files")).toBeInTheDocument();
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
      expect(screen.queryByRole("heading", { name: "Code review sidebar" })).not.toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });
});
