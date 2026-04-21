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
  return stubProjectListFetchSequence([
    () =>
      new Response(JSON.stringify(buildProjectsResponse(projects)), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
  ]);
}

function stubProjectListFetchSequence(
  responses: Array<() => Promise<Response> | Response>
) {
  let callIndex = 0;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url === "/v1/projects") {
      const responseFactory =
        responses[Math.min(callIndex, responses.length - 1)];
      callIndex += 1;

      return await responseFactory!();
    }

    throw new Error(`Unexpected fetch request: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function createDeferredProjectsResponse(projects: CurrentProject[]) {
  let resolveResponse: ((response: Response) => void) | null = null;
  const promise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });

  return {
    promise,
    resolve() {
      resolveResponse?.(
        new Response(JSON.stringify(buildProjectsResponse(projects)), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        })
      );
    }
  };
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

  it("renders the loading state before the project list resolves", async () => {
    const scaffoldProject: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };
    const deferredResponse = createDeferredProjectsResponse([scaffoldProject]);

    stubProjectListFetchSequence([() => deferredResponse.promise]);

    renderRoute("/runs", { useBrowserProjectApi: true });

    expect(screen.getByRole("heading", { name: "Loading projects" })).toBeInTheDocument();

    deferredResponse.resolve();

    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
  });

  it("renders the error state and recovers after retry", async () => {
    const scaffoldProject: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };
    const fetchMock = stubProjectListFetchSequence([
      async () => {
        throw new Error("Project list failed.");
      },
      () =>
        new Response(JSON.stringify(buildProjectsResponse([scaffoldProject])), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        })
    ]);

    renderRoute("/runs", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "Unable to load projects" })).toBeInTheDocument();
    expect(screen.getByText("Project list failed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rehydrates a valid stored project id on startup", async () => {
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

    renderRoute("/runs", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alt Project/i })).toBeInTheDocument();
    expect(window.localStorage.getItem(currentProjectStorageKey)).toBe("project-alt");
  });

  it("keeps the zero-project recovery path reachable at /projects/new", async () => {
    stubProjectListFetch([]);

    renderRoute("/projects/new", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No projects yet" })).not.toBeInTheDocument();
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

  it("renders a safe compatibility state for settings on a non-scaffold project", async () => {
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

    renderRoute("/settings", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "Project settings: Alt Project" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Settings are not available for this project yet" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Project settings currently depend on scaffold-backed configuration data\./i)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Project configuration tabs")).not.toBeInTheDocument();
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
