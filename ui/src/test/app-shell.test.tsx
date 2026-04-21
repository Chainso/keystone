// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

import { currentProjectStorageKey, type CurrentProject } from "../features/projects/project-context";
import { renderRoute } from "./render-route";
import { serializeProjectListItem } from "../../../src/http/api/v1/projects/contracts";

const defaultTimestamp = new Date("2026-04-20T12:00:00.000Z");

interface LiveRunFixture {
  compiledFrom: {
    specificationRevisionId: string;
    architectureRevisionId: string;
    executionPlanRevisionId: string;
    compiledAt: string;
  } | null;
  endedAt: string | null;
  executionEngine: "scripted" | "think_mock" | "think_live";
  projectId: string;
  runId: string;
  startedAt: string | null;
  status: string;
  workflowInstanceId: string;
}

type ResponseFactory = () => Promise<Response> | Response;

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

function buildRunsResponse(runs: LiveRunFixture[]) {
  return {
    data: {
      items: runs,
      total: runs.length
    },
    meta: {
      apiVersion: "v1" as const,
      envelope: "collection" as const,
      resourceType: "run" as const
    }
  };
}

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

function stubProjectManagementFetch(options: {
  projectResponses: ResponseFactory[];
  projectRunsByProjectId?: Record<string, ResponseFactory[]>;
}) {
  let callIndex = 0;
  const runCallIndexes = new Map<string, number>();

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url === "/v1/projects") {
      const responseFactory =
        options.projectResponses[Math.min(callIndex, options.projectResponses.length - 1)];
      callIndex += 1;

      return await responseFactory!();
    }

    const runMatch = url.match(/^\/v1\/projects\/([^/]+)\/runs$/);

    if (runMatch) {
      const projectId = decodeURIComponent(runMatch[1]!);
      const responseFactories = options.projectRunsByProjectId?.[projectId] ?? [
        () => createJsonResponse(buildRunsResponse([]))
      ];
      const runCallIndex = runCallIndexes.get(projectId) ?? 0;
      const responseFactory =
        responseFactories[Math.min(runCallIndex, responseFactories.length - 1)];

      runCallIndexes.set(projectId, runCallIndex + 1);

      return await responseFactory!();
    }

    throw new Error(`Unexpected fetch request: ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function stubProjectListFetch(
  projects: CurrentProject[],
  projectRunsByProjectId: Record<string, LiveRunFixture[]> = {}
) {
  return stubProjectManagementFetch({
    projectResponses: [() => createJsonResponse(buildProjectsResponse(projects))],
    projectRunsByProjectId: Object.fromEntries(
      Object.entries(projectRunsByProjectId).map(([projectId, runs]) => [
        projectId,
        [() => createJsonResponse(buildRunsResponse(runs))]
      ])
    )
  });
}

function stubProjectListFetchSequence(
  responses: ResponseFactory[],
  projectRunsByProjectId: Record<string, LiveRunFixture[]> = {}
) {
  return stubProjectManagementFetch({
    projectResponses: responses,
    projectRunsByProjectId: Object.fromEntries(
      Object.entries(projectRunsByProjectId).map(([projectId, runs]) => [
        projectId,
        [() => createJsonResponse(buildRunsResponse(runs))]
      ])
    )
  });
}

function createDeferredProjectsResponse(projects: CurrentProject[]) {
  let resolveResponse: ((response: Response) => void) | null = null;
  const promise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });

  return {
    promise,
    resolve() {
      resolveResponse?.(createJsonResponse(buildProjectsResponse(projects)));
    }
  };
}

function createLiveRunFixture(
  projectId: string,
  overrides: Partial<LiveRunFixture> = {}
): LiveRunFixture {
  return {
    compiledFrom: null,
    endedAt: null,
    executionEngine: "scripted",
    projectId,
    runId: `${projectId}-run-001`,
    startedAt: "2026-04-20T12:00:00.000Z",
    status: "running",
    workflowInstanceId: `${projectId}-workflow-001`,
    ...overrides
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
    const liveRuns = [
      createLiveRunFixture(scaffoldProject.projectId, {
        runId: "run-104",
        workflowInstanceId: "wf-run-104"
      })
    ];

    stubProjectListFetch([scaffoldProject], {
      [scaffoldProject.projectId]: liveRuns
    });

    const { router } = renderRoute("/", { useBrowserProjectApi: true });

    await screen.findByRole("heading", { name: "Runs" });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs");
    });

    expect(screen.getByRole("navigation", { name: "Global navigation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Keystone Cloudflare/i })).toBeInTheDocument();
    expect(screen.getByText("run-104")).toBeInTheDocument();
    expect(screen.getByText("wf-run-104")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "run-104" })).not.toBeInTheDocument();
    expectShellLinkTarget("Runs", "/runs");
    expectShellLinkTarget("Documentation", "/documentation");
    expectShellLinkTarget("Workstreams", "/workstreams");
    expectShellLinkTarget("New project", "/projects/new");
    expectShellLinkTarget("Project settings", "/settings");
    expect(screen.getByRole("button", { name: /\+ New run/i })).toBeDisabled();
    expect(
      screen.getByText(/Live runs are listed without deep links until the run-detail route can render API-backed run data truthfully\./i)
    ).toBeInTheDocument();
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

    stubProjectListFetchSequence(
      [() => deferredResponse.promise],
      {
        [scaffoldProject.projectId]: [createLiveRunFixture(scaffoldProject.projectId, { runId: "run-104" })]
      }
    );

    renderRoute("/runs", { useBrowserProjectApi: true });

    expect(screen.getByRole("heading", { name: "Loading projects" })).toBeInTheDocument();

    deferredResponse.resolve();

    expect(await screen.findByRole("heading", { name: "Runs" })).toBeInTheDocument();
    expect(await screen.findByText("run-104")).toBeInTheDocument();
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
      () => createJsonResponse(buildProjectsResponse([scaffoldProject]))
    ], {
      [scaffoldProject.projectId]: [createLiveRunFixture(scaffoldProject.projectId, { runId: "run-104" })]
    });

    renderRoute("/runs", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "Unable to load projects" })).toBeInTheDocument();
    expect(screen.getByText("Project list failed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("run-104")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("renders the run error state and recovers after retry", async () => {
    const scaffoldProject: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };
    const fetchMock = stubProjectManagementFetch({
      projectResponses: [() => createJsonResponse(buildProjectsResponse([scaffoldProject]))],
      projectRunsByProjectId: {
        [scaffoldProject.projectId]: [
          async () => {
            throw new Error("Run list failed.");
          },
          () =>
            createJsonResponse(
              buildRunsResponse([
                createLiveRunFixture(scaffoldProject.projectId, {
                  runId: "run-104",
                  workflowInstanceId: "wf-run-104"
                })
              ])
            )
        ]
      }
    });

    renderRoute("/runs", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "Unable to load runs" })).toBeInTheDocument();
    expect(screen.getByText("Run list failed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("run-104")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("renders honest latest activity labels for ended, compiled, and idle live runs", async () => {
    const scaffoldProject: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };

    stubProjectListFetch([scaffoldProject], {
      [scaffoldProject.projectId]: [
        createLiveRunFixture(scaffoldProject.projectId, {
          runId: "run-ended",
          endedAt: "2026-04-20T14:05:00.000Z",
          workflowInstanceId: "wf-ended"
        }),
        createLiveRunFixture(scaffoldProject.projectId, {
          compiledFrom: {
            specificationRevisionId: "spec-rev-1",
            architectureRevisionId: "arch-rev-1",
            executionPlanRevisionId: "plan-rev-1",
            compiledAt: "2026-04-20T13:40:00.000Z"
          },
          runId: "run-compiled",
          startedAt: null,
          workflowInstanceId: "wf-compiled"
        }),
        createLiveRunFixture(scaffoldProject.projectId, {
          runId: "run-idle",
          startedAt: null,
          workflowInstanceId: "wf-idle"
        })
      ]
    });

    renderRoute("/runs", { useBrowserProjectApi: true });

    expect(await screen.findByText("run-ended")).toBeInTheDocument();
    expect(screen.getByText("Ended 2026-04-20 14:05 UTC")).toBeInTheDocument();
    expect(screen.getByText("Compiled 2026-04-20 13:40 UTC")).toBeInTheDocument();
    expect(screen.getByText("No recorded activity yet")).toBeInTheDocument();
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
    stubProjectListFetch(projects, {
      "project-keystone-cloudflare": [
        createLiveRunFixture("project-keystone-cloudflare", { runId: "run-104" })
      ],
      "project-alt": []
    });

    renderRoute("/runs", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "No runs yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Alt Project/i })).toBeInTheDocument();
    expect(screen.getByText("Alt Project does not have any recorded runs yet.")).toBeInTheDocument();
    expect(window.localStorage.getItem(currentProjectStorageKey)).toBe("project-alt");
  });

  it("keeps the zero-project recovery path reachable at /projects/new", async () => {
    stubProjectListFetch([]);

    renderRoute("/projects/new", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No projects yet" })).not.toBeInTheDocument();
  });

  it("switches the current project from the live sidebar selector and reloads runs", async () => {
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
    const primaryRuns = [
      createLiveRunFixture("project-keystone-cloudflare", {
        runId: "run-104",
        workflowInstanceId: "wf-run-104"
      })
    ];
    const alternateRuns = [
      createLiveRunFixture("project-alt", {
        executionEngine: "think_live",
        runId: "run-alt-301",
        workflowInstanceId: "wf-run-alt-301"
      })
    ];

    stubProjectListFetch(projects, {
      "project-keystone-cloudflare": primaryRuns,
      "project-alt": alternateRuns
    });
    renderRoute("/runs", { useBrowserProjectApi: true });

    await screen.findByText("run-104");

    fireEvent.click(screen.getByRole("button", { name: /Keystone Cloudflare/i }));
    fireEvent.click(screen.getByRole("option", { name: /Alt Project/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Alt Project/i })).toBeInTheDocument();
    });
    expect(await screen.findByText("run-alt-301")).toBeInTheDocument();
    expect(screen.queryByText("run-104")).not.toBeInTheDocument();
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
