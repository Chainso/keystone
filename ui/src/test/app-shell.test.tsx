// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

import { currentProjectStorageKey, type CurrentProject } from "../features/projects/project-context";
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

function expectShellLinkTarget(name: string, href: string) {
  expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
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

    if (url === "/v1/projects") {
      return new Response(JSON.stringify(buildProjectsResponse(projects)), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      });
    }

    throw new Error(`Unexpected fetch request: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("App shell", () => {
  it("redirects the default route to the Runs index inside the global shell", async () => {
    const scaffoldProject: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };

    stubProjectListFetch([scaffoldProject]);

    const { router } = renderRoute("/", { useBrowserProjectApi: true });

    await screen.findByRole("heading", { name: "Runs" });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs");
    });

    expect(screen.getByRole("navigation", { name: "Global navigation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Keystone Cloudflare/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Run-104" })).toHaveAttribute("href", "/runs/run-104");
    expectShellLinkTarget("Runs", "/runs");
    expectShellLinkTarget("Documentation", "/documentation");
    expectShellLinkTarget("Workstreams", "/workstreams");
    expectShellLinkTarget("New project", "/projects/new");
    expectShellLinkTarget("Project settings", "/settings");
    expect(screen.getByRole("button", { name: /\+ New run/i })).toBeDisabled();
    expect(screen.queryByText("UI structure scaffold placeholder")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/destination content is intentionally scaffold-only/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Open the run index, nested stepper phases, and execution scaffold./i)
    ).not.toBeInTheDocument();
  });

  it("renders a coherent no-project shell state when the API returns no projects", async () => {
    stubProjectListFetch([]);

    renderRoute("/documentation", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "No projects yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /No projects yet/i })).toBeDisabled();
    expect(
      screen
        .getAllByRole("link", { name: "New project" })
        .some((link) => link.getAttribute("href") === "/projects/new")
    ).toBe(true);
    expect(screen.queryByRole("heading", { name: "Project documentation" })).not.toBeInTheDocument();
  });

  it("switches the current project from the live sidebar selector", async () => {
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

    stubProjectListFetch(projects);
    renderRoute("/runs", { useBrowserProjectApi: true });

    await screen.findByRole("heading", { name: "Runs" });

    fireEvent.click(screen.getByRole("button", { name: /Keystone Cloudflare/i }));
    fireEvent.click(screen.getByRole("option", { name: /Alt Project/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Alt Project/i })).toBeInTheDocument();
    });
    expect(window.localStorage.getItem(currentProjectStorageKey)).toBe("project-alt");
  });

  it.each([
    {
      path: "/documentation",
      heading: "Project documentation"
    },
    {
      path: "/workstreams",
      heading: "Active and queued project work"
    },
    {
      path: "/projects/new",
      heading: "New project"
    },
    {
      path: "/settings",
      heading: "Project settings: Keystone Cloudflare"
    }
  ])("mounts the $heading scaffold route inside the shared shell", async ({ path, heading }) => {
    const scaffoldProject: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };

    stubProjectListFetch([scaffoldProject]);

    renderRoute(path, { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Keystone Cloudflare/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Global navigation" })).toBeInTheDocument();
    expectShellLinkTarget("Runs", "/runs");
    expectShellLinkTarget("Documentation", "/documentation");
    expectShellLinkTarget("Workstreams", "/workstreams");
    expectShellLinkTarget("New project", "/projects/new");
    expectShellLinkTarget("Project settings", "/settings");
  });
});
