// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";

import { renderRoute } from "./render-route";

afterEach(() => {
  cleanup();
});

describe("Phase 2 runs routes", () => {
  it("redirects /runs/:runId to the derived default phase", async () => {
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
    expect(screen.getByText("UI workspace build")).toBeInTheDocument();
  });

  it("redirects run-102 to execution-plan when no compiled tasks exist", async () => {
    const { router } = renderRoute("/runs/run-102");

    expect(await screen.findByRole("heading", { name: "Run-102" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-102/execution-plan");
    });
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        current: "page"
      })
    ).toHaveAttribute("href", "/runs/run-102/execution-plan");
    expect(screen.getByRole("heading", { name: "Execution Plan conversation" })).toBeInTheDocument();
  });

  it("redirects run-103 to architecture when execution-plan is unavailable", async () => {
    const { router } = renderRoute("/runs/run-103");

    expect(await screen.findByRole("heading", { name: "Run-103" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-103/architecture");
    });
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        current: "page"
      })
    ).toHaveAttribute("href", "/runs/run-103/architecture");
    expect(screen.getByRole("heading", { name: "Architecture conversation" })).toBeInTheDocument();
  });

  it("redirects run-101 to specification when only the specification doc exists", async () => {
    const { router } = renderRoute("/runs/run-101");

    expect(await screen.findByRole("heading", { name: "Run-101" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-101/specification");
    });
    expect(
      within(screen.getByRole("navigation", { name: "Run phases" })).getByRole("link", {
        current: "page"
      })
    ).toHaveAttribute("href", "/runs/run-101/specification");
    expect(screen.getByRole("heading", { name: "Specification conversation" })).toBeInTheDocument();
  });

  it("renders run index rows with run-detail navigation targets", async () => {
    const { router } = renderRoute("/runs");

    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Run-104" })).toHaveAttribute("href", "/runs/run-104");
    expect(screen.getByRole("link", { name: "Run-103" })).toHaveAttribute("href", "/runs/run-103");
    expect(screen.getByText("Execution Plan")).toBeInTheDocument();

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
      title: "Specification conversation",
      document: "Living product spec",
      agentName: "Specification agent",
      documentPath: "runs/run-104/specification/product-spec.md"
    },
    {
      path: "/runs/run-104/architecture",
      title: "Architecture conversation",
      document: "Living architecture doc",
      agentName: "Architecture agent",
      documentPath: "runs/run-104/architecture/architecture.md"
    },
    {
      path: "/runs/run-104/execution-plan",
      title: "Execution Plan conversation",
      document: "Execution plan doc",
      agentName: "Execution plan agent",
      documentPath: "runs/run-104/execution-plan/execution-plan.md"
    }
  ])(
    "renders the planning workspace from document and conversation locator data for $path",
    async ({ path, title, document, agentName, documentPath }) => {
      renderRoute(path);

      expect(await screen.findByRole("heading", { name: "Run-104" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: document })).toBeInTheDocument();
      expect(screen.getByLabelText("Conversation locator")).toHaveTextContent(agentName);
      expect(screen.getByText(documentPath)).toBeInTheDocument();
      expect(screen.queryByRole("textbox", { name: "Message composer" })).not.toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "Run phases" })).toBeInTheDocument();
    }
  );

  it("renders the execution DAG shell", async () => {
    renderRoute("/runs/run-104/execution");

    expect(await screen.findByRole("heading", { name: "Task workflow DAG" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Build shell/i })).toHaveAttribute(
      "href",
      "/runs/run-104/execution/tasks/task-032"
    );
    expect(screen.getByRole("link", { name: /DAG wiring/i })).toHaveAttribute(
      "href",
      "/runs/run-104/execution/tasks/task-033"
    );
    expect(
      screen.getByText("Workflow rows are derived from task dependencies in the scaffold graph.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Click a task node to open that task inside Execution.")
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Execution summary")).not.toBeInTheDocument();
  });

  it("renders the task detail split inside execution", async () => {
    renderRoute("/runs/run-104/execution/tasks/task-032");

    expect(screen.getByRole("heading", { name: "Run-104 / TASK-032" })).toBeInTheDocument();
    expect(screen.getByLabelText("Conversation locator")).toHaveTextContent("UI shell builder");
    expect(screen.getByRole("heading", { name: "Artifacts and review" })).toBeInTheDocument();
    expect(screen.getByText("Changed files")).toBeInTheDocument();
    expect(screen.getByText("TASK-031")).toBeInTheDocument();
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
});
