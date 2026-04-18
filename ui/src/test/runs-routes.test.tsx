// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";

import { renderRoute } from "./render-route";

afterEach(() => {
  cleanup();
});

describe("Phase 2 runs routes", () => {
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
  });

  it("renders run index rows with run-detail navigation targets", async () => {
    renderRoute("/runs");

    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Run-104" })).toHaveAttribute("href", "/runs/run-104");
    expect(screen.getByRole("link", { name: "Run-103" })).toHaveAttribute("href", "/runs/run-103");
  });

  it.each([
    {
      path: "/runs/run-104/specification",
      title: "Specification agent chat",
      document: "Living product specification"
    },
    {
      path: "/runs/run-104/architecture",
      title: "Architecture agent chat",
      document: "Living architecture document"
    },
    {
      path: "/runs/run-104/execution-plan",
      title: "Execution plan agent chat",
      document: "Execution plan document"
    }
  ])("renders the shared planning workspace for $path", async ({ path, title, document }) => {
    renderRoute(path);

    expect(await screen.findByRole("heading", { name: "Run-104" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: document })).toBeInTheDocument();
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
    expect(screen.getByText(/graph-to-task route handoff/i)).toBeInTheDocument();
  });

  it("renders the task detail split inside execution", async () => {
    renderRoute("/runs/run-104/execution/tasks/task-032");

    expect(await screen.findByRole("heading", { name: "Changed files" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Run-104 / TASK-032" })).toBeInTheDocument();
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
          'Task route "/runs/run-104/execution/tasks/task-999" does not match any scaffolded execution task.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Changed files" })).not.toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });
});
