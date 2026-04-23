// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { AppProviders } from "../app/app-providers";
import { useTheme } from "../app/theme-provider";
import { themePreferenceStorageKey } from "../app/theme";
import { Button } from "../components/ui/button";
import { currentProjectStorageKey, type CurrentProject } from "../features/projects/project-context";
import { selectCurrentProjectSummary } from "../features/resource-model/selectors";
import { resolveRunsSnapshotForProject } from "../features/runs/use-runs-index-view-model";
import { renderRoute } from "./render-route";
import {
  serializeProjectListItem,
  serializeProjectResource
} from "../../../src/http/api/v1/projects/contracts";

const defaultTimestamp = new Date("2026-04-20T12:00:00.000Z");
const themeBootstrapScriptMatch = readFileSync(
  resolve(process.cwd(), "ui/index.html"),
  "utf8"
).match(/<script id="keystone-theme-bootstrap">([\s\S]*?)<\/script>/);
const windowLocalStorageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
const globalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

if (!themeBootstrapScriptMatch) {
  throw new Error("Missing the head-level Keystone theme bootstrap script in ui/index.html.");
}

const themeBootstrapScript = themeBootstrapScriptMatch[1];

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

function createMatchMediaController(initialMatches = false) {
  let matches = initialMatches;
  const listeners = new Set<
    EventListenerOrEventListenerObject | ((event: MediaQueryListEvent) => void)
  >();
  const mediaQueryList: MediaQueryList = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
      if (listener) {
        listeners.add(listener);
      }
    },
    removeEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
      if (listener) {
        listeners.delete(listener);
      }
    },
    addListener(listener: ((event: MediaQueryListEvent) => void) | null) {
      if (listener) {
        listeners.add(listener);
      }
    },
    removeListener(listener: ((event: MediaQueryListEvent) => void) | null) {
      if (listener) {
        listeners.delete(listener);
      }
    },
    dispatchEvent() {
      return true;
    }
  };

  return {
    matchMedia: vi.fn().mockImplementation(() => mediaQueryList),
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      const event = {
        matches: nextMatches,
        media: mediaQueryList.media
      } as MediaQueryListEvent;

      listeners.forEach((listener) => {
        if (typeof listener === "function") {
          listener(event);
          return;
        }

        listener.handleEvent(event);
      });
    }
  };
}

function ThemeHarness() {
  const { actions, meta, state } = useTheme();

  return (
    <div>
      <p data-testid="theme-preference">{state.preference}</p>
      <p data-testid="resolved-theme">{state.resolvedTheme}</p>
      <p data-testid="system-theme">{meta.systemTheme}</p>
      <button
        type="button"
        onClick={() => {
          actions.setThemePreference("dark");
        }}
      >
        Dark theme
      </button>
      <button
        type="button"
        onClick={() => {
          actions.setThemePreference("system");
        }}
      >
        System theme
      </button>
    </div>
  );
}

function renderThemeHarness() {
  return render(
    <AppProviders project={selectCurrentProjectSummary()}>
      <ThemeHarness />
    </AppProviders>
  );
}

function runThemeBootstrapScript() {
  new Function("window", "document", themeBootstrapScript)(window, document);
}

async function withUnavailableLocalStorage<T>(run: () => T | Promise<T>) {
  const error = new DOMException("Blocked by the browser.", "SecurityError");
  const throwingDescriptor = {
    configurable: true,
    get() {
      throw error;
    }
  };

  Object.defineProperty(window, "localStorage", throwingDescriptor);
  Object.defineProperty(globalThis, "localStorage", throwingDescriptor);

  try {
    return await run();
  } finally {
    if (windowLocalStorageDescriptor) {
      Object.defineProperty(window, "localStorage", windowLocalStorageDescriptor);
    }

    if (globalLocalStorageDescriptor) {
      Object.defineProperty(globalThis, "localStorage", globalLocalStorageDescriptor);
    }
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("theme provider", () => {
  it("runs the real head bootstrap before app mount and honors a stored dark preference", () => {
    const controller = createMatchMediaController(false);

    window.localStorage.setItem(themePreferenceStorageKey, "dark");
    vi.stubGlobal("matchMedia", controller.matchMedia);

    runThemeBootstrapScript();

    expect(controller.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).not.toHaveClass("light");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("defaults to the system theme on first load", () => {
    const controller = createMatchMediaController(true);

    vi.stubGlobal("matchMedia", controller.matchMedia);
    renderThemeHarness();

    expect(screen.getByTestId("theme-preference")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("system-theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem(themePreferenceStorageKey)).toBeNull();
  });

  it("prefers an explicit stored theme over the system theme", () => {
    const controller = createMatchMediaController(true);

    window.localStorage.setItem(themePreferenceStorageKey, "light");
    vi.stubGlobal("matchMedia", controller.matchMedia);
    renderThemeHarness();

    expect(screen.getByTestId("theme-preference")).toHaveTextContent("light");
    expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("stays usable when browser storage access throws", async () => {
    const controller = createMatchMediaController(false);

    vi.stubGlobal("matchMedia", controller.matchMedia);

    await withUnavailableLocalStorage(async () => {
      runThemeBootstrapScript();
      renderThemeHarness();

      expect(screen.getByTestId("theme-preference")).toHaveTextContent("system");
      expect(screen.getByTestId("resolved-theme")).toHaveTextContent("light");
      expect(document.documentElement).toHaveAttribute("data-theme", "light");

      fireEvent.click(screen.getByRole("button", { name: "Dark theme" }));

      expect(screen.getByTestId("theme-preference")).toHaveTextContent("dark");
      expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    });
  });

  it("persists explicit theme changes and can return to system tracking", async () => {
    const controller = createMatchMediaController(false);

    vi.stubGlobal("matchMedia", controller.matchMedia);
    renderThemeHarness();

    fireEvent.click(screen.getByRole("button", { name: "Dark theme" }));
    expect(window.localStorage.getItem(themePreferenceStorageKey)).toBe("dark");
    expect(screen.getByTestId("theme-preference")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    fireEvent.click(screen.getByRole("button", { name: "System theme" }));
    expect(window.localStorage.getItem(themePreferenceStorageKey)).toBeNull();
    expect(screen.getByTestId("theme-preference")).toHaveTextContent("system");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    controller.setMatches(true);

    await waitFor(() => {
      expect(screen.getByTestId("resolved-theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("system-theme")).toHaveTextContent("dark");
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    });
  });

  it("keeps seeded shadcn consumers on semantic theme tokens", () => {
    const controller = createMatchMediaController(true);

    window.localStorage.setItem(themePreferenceStorageKey, "dark");
    vi.stubGlobal("matchMedia", controller.matchMedia);
    render(
      <AppProviders project={selectCurrentProjectSummary()}>
        <Button>Launch run</Button>
      </AppProviders>
    );

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: "Launch run" })).toHaveClass(
      "bg-primary",
      "text-primary-foreground"
    );
  });
});

function expectShellLinkTarget(name: string, href: string) {
  expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
}

function expectWorkspaceLocation(projectName: string, destinationName: string) {
  expect(screen.queryByLabelText("Workspace location")).not.toBeInTheDocument();
  expect(getProjectSelector()).toHaveDisplayValue(projectName);
  expect(screen.getByRole("link", { name: destinationName })).toHaveAttribute("aria-current", "page");
}

function getProjectSelector() {
  return screen.getByRole("combobox", { name: "Project" });
}

function getThemePreferencePanel() {
  return screen.getByRole("group", { name: "Theme preference" }).closest(".shell-theme-panel");
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

function buildRunDetailResponse(run: LiveRunFixture) {
  return {
    data: run,
    meta: {
      apiVersion: "v1" as const,
      envelope: "detail" as const,
      resourceType: "run" as const
    }
  };
}

function buildEmptyRunDocumentsResponse() {
  return {
    data: {
      items: [],
      total: 0
    },
    meta: {
      apiVersion: "v1" as const,
      envelope: "collection" as const,
      resourceType: "document" as const
    }
  };
}

function buildEmptyRunWorkflowResponse() {
  return {
    data: {
      edges: [],
      nodes: [],
      summary: {
        activeTasks: 0,
        cancelledTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        pendingTasks: 0,
        readyTasks: 0,
        totalTasks: 0
      }
    },
    meta: {
      apiVersion: "v1" as const,
      envelope: "detail" as const,
      resourceType: "workflow_graph" as const
    }
  };
}

function buildEmptyRunTasksResponse() {
  return {
    data: {
      items: [],
      total: 0
    },
    meta: {
      apiVersion: "v1" as const,
      envelope: "collection" as const,
      resourceType: "task" as const
    }
  };
}

function buildProjectDetailResponse(project: {
  components: Array<{
    componentKey: string;
    config:
      | {
          localPath: string;
          ref?: string;
        }
      | {
          gitUrl: string;
          ref?: string;
        };
    displayName: string;
    kind: "git_repository";
    ruleOverride?: {
      reviewInstructions?: string[];
      testInstructions?: string[];
    };
  }>;
  description: string | null;
  displayName: string;
  envVars: Array<{
    name: string;
    value: string;
  }>;
  projectId: string;
  projectKey: string;
  ruleSet: {
    reviewInstructions: string[];
    testInstructions: string[];
  };
}) {
  return {
    data: serializeProjectResource({
      tenantId: "tenant-test",
      projectId: project.projectId,
      projectKey: project.projectKey,
      displayName: project.displayName,
      description: project.description,
      ruleSet: project.ruleSet,
      components: project.components,
      envVars: project.envVars,
      createdAt: defaultTimestamp,
      updatedAt: defaultTimestamp
    }),
    meta: {
      apiVersion: "v1" as const,
      envelope: "detail" as const,
      resourceType: "project" as const
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

function createErrorResponse(input: { code: string; message: string; status: number }) {
  return createJsonResponse(
    {
      error: {
        code: input.code,
        message: input.message,
        details: null
      }
    },
    input.status
  );
}

function createDeferredResponse() {
  let resolveResponse: ((response: Response) => void) | null = null;
  const promise = new Promise<Response>((resolve) => {
    resolveResponse = resolve;
  });

  return {
    promise,
    resolve(response: Response) {
      resolveResponse?.(response);
    }
  };
}

function getRequestHeaders(request: RequestInfo | URL, init?: RequestInit) {
  return request instanceof Request ? request.headers : new Headers(init?.headers);
}

async function parseRequestJson(request: RequestInfo | URL, init?: RequestInit) {
  if (request instanceof Request) {
    return request.json();
  }

  if (typeof init?.body !== "string") {
    throw new Error("Expected JSON request body.");
  }

  return JSON.parse(init.body);
}

function expectDevAuthHeaders(request: RequestInfo | URL, init?: RequestInit) {
  const headers = getRequestHeaders(request, init);

  expect(headers.get("authorization")).toBe("Bearer change-me-local-token");
  expect(headers.get("x-keystone-tenant-id")).toBe("tenant-dev-local");
}

function stubProjectManagementFetch(options: {
  projectResponses: ResponseFactory[];
  projectDetailsByProjectId?: Record<string, ResponseFactory[]>;
  projectRunsByProjectId?: Record<string, ResponseFactory[]>;
  projectUpdatesByProjectId?: Record<string, ResponseFactory[]>;
}) {
  let callIndex = 0;
  const detailCallIndexes = new Map<string, number>();
  const runCallIndexes = new Map<string, number>();
  const updateCallIndexes = new Map<string, number>();

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = input instanceof Request ? input.method : init?.method ?? "GET";

    expectDevAuthHeaders(input, init);

    if (url === "/v1/projects" && method === "GET") {
      const responseFactory =
        options.projectResponses[Math.min(callIndex, options.projectResponses.length - 1)];
      callIndex += 1;

      return await responseFactory!();
    }

    const projectMatch = url.match(/^\/v1\/projects\/([^/]+)$/);

    if (projectMatch && method === "GET") {
      const projectId = decodeURIComponent(projectMatch[1]!);
      const responseFactories = options.projectDetailsByProjectId?.[projectId];

      if (!responseFactories) {
        throw new Error(`Unexpected fetch request: ${method} ${url}`);
      }

      const detailCallIndex = detailCallIndexes.get(projectId) ?? 0;
      const responseFactory =
        responseFactories[Math.min(detailCallIndex, responseFactories.length - 1)];

      detailCallIndexes.set(projectId, detailCallIndex + 1);

      return await responseFactory!();
    }

    const runMatch = url.match(/^\/v1\/projects\/([^/]+)\/runs$/);

    if (runMatch && method === "GET") {
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

    if (projectMatch && method === "PATCH") {
      const projectId = decodeURIComponent(projectMatch[1]!);
      const responseFactories = options.projectUpdatesByProjectId?.[projectId];

      if (!responseFactories) {
        throw new Error(`Unexpected fetch request: ${method} ${url}`);
      }

      const updateCallIndex = updateCallIndexes.get(projectId) ?? 0;
      const responseFactory =
        responseFactories[Math.min(updateCallIndex, responseFactories.length - 1)];

      updateCallIndexes.set(projectId, updateCallIndex + 1);

      return await responseFactory!();
    }

    throw new Error(`Unexpected fetch request: ${method} ${url}`);
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

function stubRunCreationFetch(options: {
  createRunResponses: ResponseFactory[];
  initialRuns?: LiveRunFixture[];
  knownRunsById?: Record<string, LiveRunFixture>;
  project: CurrentProject;
}) {
  let createRunCallIndex = 0;
  const createRunBodies: unknown[] = [];
  const knownRuns = new Map<string, LiveRunFixture>(
    [...(options.initialRuns ?? []), ...Object.values(options.knownRunsById ?? {})].map((run) => [
      run.runId,
      run
    ])
  );

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = input instanceof Request ? input.method : init?.method ?? "GET";

    expectDevAuthHeaders(input, init);

    if (url === "/v1/projects" && method === "GET") {
      return createJsonResponse(buildProjectsResponse([options.project]));
    }

    if (url === `/v1/projects/${options.project.projectId}/runs` && method === "GET") {
      return createJsonResponse(buildRunsResponse(options.initialRuns ?? []));
    }

    if (url === `/v1/projects/${options.project.projectId}/runs` && method === "POST") {
      createRunBodies.push(await parseRequestJson(input, init));
      const responseFactory =
        options.createRunResponses[
          Math.min(createRunCallIndex, options.createRunResponses.length - 1)
        ];

      createRunCallIndex += 1;

      return await responseFactory!();
    }

    const runDetailMatch = url.match(/^\/v1\/runs\/([^/]+)$/);

    if (runDetailMatch && method === "GET") {
      const runId = decodeURIComponent(runDetailMatch[1]!);
      const run = knownRuns.get(runId);

      return run
        ? createJsonResponse(buildRunDetailResponse(run))
        : createErrorResponse({
            code: "run_not_found",
            message: `Run ${runId} was not found.`,
            status: 404
          });
    }

    const runDocumentsMatch = url.match(/^\/v1\/runs\/([^/]+)\/documents$/);

    if (runDocumentsMatch && method === "GET") {
      return createJsonResponse(buildEmptyRunDocumentsResponse());
    }

    const runWorkflowMatch = url.match(/^\/v1\/runs\/([^/]+)\/workflow$/);

    if (runWorkflowMatch && method === "GET") {
      return createJsonResponse(buildEmptyRunWorkflowResponse());
    }

    const runTasksMatch = url.match(/^\/v1\/runs\/([^/]+)\/tasks$/);

    if (runTasksMatch && method === "GET") {
      return createJsonResponse(buildEmptyRunTasksResponse());
    }

    throw new Error(`Unexpected fetch request: ${method} ${url}`);
  });

  vi.stubGlobal("fetch", fetchMock);

  return {
    createRunBodies,
    fetchMock
  };
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
  it("resolves a stale runs snapshot into a loading placeholder for the newly selected project", () => {
    const staleSnapshot = {
      errorMessage: null,
      presentation: "live" as const,
      projectId: "project-keystone-cloudflare",
      runs: [
        {
          source: "api" as const,
          ...createLiveRunFixture("project-keystone-cloudflare", {
            runId: "run-104",
            workflowInstanceId: "wf-run-104"
          })
        }
      ],
      status: "ready" as const
    };

    expect(resolveRunsSnapshotForProject(staleSnapshot, "project-alt")).toEqual({
      errorMessage: null,
      presentation: "live",
      projectId: "project-alt",
      runs: [],
      status: "loading"
    });
  });

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
    expect(await screen.findByRole("link", { name: "run-104" })).toHaveAttribute(
      "href",
      "/runs/run-104"
    );

    expect(screen.getByRole("navigation", { name: "Global navigation" })).toBeInTheDocument();
    expect(getProjectSelector()).toHaveDisplayValue("Keystone Cloudflare");
    expectWorkspaceLocation("Keystone Cloudflare", "Runs");
    expect(screen.getByText("Planning is in progress.")).toBeInTheDocument();
    expect(screen.getByText("Specification")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Open a row to step into the run workspace and move across the four stages."
      )
    ).toBeInTheDocument();
    expectShellLinkTarget("Runs", "/runs");
    expectShellLinkTarget("Documentation", "/documentation");
    expectShellLinkTarget("Workstreams", "/workstreams");
    expectShellLinkTarget("New project", "/projects/new");
    expectShellLinkTarget("Project settings", "/settings");
    expect(screen.getByRole("button", { name: /\+ New run/i })).toBeEnabled();
    expect(screen.queryByText("UI structure scaffold placeholder")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/destination content is intentionally scaffold-only/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Open the run index, nested stepper phases, and execution scaffold./i)
    ).not.toBeInTheDocument();
  });

  it("falls back to the project key in the sidebar when the current project description is blank", async () => {
    const projectWithBlankDescription: CurrentProject = {
      projectId: "project-fallback",
      projectKey: "fallback-project-key",
      displayName: "Fallback Project",
      description: ""
    };

    stubProjectListFetch([projectWithBlankDescription]);

    renderRoute("/runs", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "No runs yet" })).toBeInTheDocument();

    const projectPanel = getProjectSelector().closest("section");

    expect(projectPanel).not.toBeNull();
    expect(
      within(projectPanel as HTMLElement).getAllByText(projectWithBlankDescription.projectKey, {
        selector: "p"
      })
    ).toHaveLength(2);
  });

  it("renders a coherent no-project shell state when the API returns no projects", async () => {
    stubProjectListFetch([]);

    renderRoute("/documentation", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "No projects yet" })).toBeInTheDocument();
    expect(getProjectSelector()).toBeDisabled();
    expect(getProjectSelector()).toHaveDisplayValue("No projects yet");
    expect(
      screen
        .getAllByRole("link", { name: "New project" })
        .some((link) => link.getAttribute("href") === "/projects/new")
    ).toBe(true);
    expect(screen.queryByRole("heading", { name: "Documentation" })).not.toBeInTheDocument();
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

  it("creates a real run from the index and routes straight into its specification page", async () => {
    const project: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };
    const createdRun = createLiveRunFixture(project.projectId, {
      runId: "run-201",
      startedAt: null,
      status: "configured",
      workflowInstanceId: "wf-run-201"
    });
    const deferredCreateResponse = createDeferredResponse();
    const { createRunBodies, fetchMock } = stubRunCreationFetch({
      createRunResponses: [() => deferredCreateResponse.promise],
      knownRunsById: {
        [createdRun.runId]: createdRun
      },
      project
    });
    const { router } = renderRoute("/runs", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "No runs yet" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ New run" }));

    expect(screen.getByRole("button", { name: "Creating run..." })).toBeDisabled();

    deferredCreateResponse.resolve(createJsonResponse(buildRunDetailResponse(createdRun), 201));

    expect(await screen.findByRole("heading", { name: "run-201" })).toBeInTheDocument();
    expect(await screen.findByText("No specification document yet")).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-201/specification");
    });
    expect(createRunBodies).toEqual([{ executionEngine: "think_live" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      `/v1/projects/${project.projectId}/runs`,
      expect.objectContaining({
        body: JSON.stringify({ executionEngine: "think_live" }),
        method: "POST"
      })
    );
  });

  it("reuses the in-flight create-run request when + New run is activated again before completion", async () => {
    const project: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };
    const createdRun = createLiveRunFixture(project.projectId, {
      runId: "run-202",
      startedAt: null,
      status: "configured",
      workflowInstanceId: "wf-run-202"
    });
    const deferredCreateResponse = createDeferredResponse();
    const { createRunBodies, fetchMock } = stubRunCreationFetch({
      createRunResponses: [() => deferredCreateResponse.promise],
      knownRunsById: {
        [createdRun.runId]: createdRun
      },
      project
    });
    const { router } = renderRoute("/runs", { useBrowserProjectApi: true });

    const createButton = await screen.findByRole("button", { name: "+ New run" });

    fireEvent.click(createButton);
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(createRunBodies).toEqual([{ executionEngine: "think_live" }]);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/v1/projects/${project.projectId}/runs`,
      expect.objectContaining({
        body: JSON.stringify({ executionEngine: "think_live" }),
        method: "POST"
      })
    );
    expect(
      fetchMock.mock.calls.filter(([url, init]) => {
        const requestUrl = typeof url === "string" ? url : url.toString();
        const method = url instanceof Request ? url.method : init?.method ?? "GET";

        return requestUrl === `/v1/projects/${project.projectId}/runs` && method === "POST";
      })
    ).toHaveLength(1);

    deferredCreateResponse.resolve(createJsonResponse(buildRunDetailResponse(createdRun), 201));

    expect(await screen.findByRole("heading", { name: "run-202" })).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs/run-202/specification");
    });
  });

  it("keeps the workspace-location chrome visible on nested run detail routes", async () => {
    const project: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };
    const run = createLiveRunFixture(project.projectId, {
      runId: "run-104",
      workflowInstanceId: "wf-run-104"
    });

    stubRunCreationFetch({
      createRunResponses: [
        () =>
          createErrorResponse({
            code: "unexpected_create",
            message: "Create run should not be called for this test.",
            status: 500
          })
      ],
      initialRuns: [run],
      knownRunsById: {
        [run.runId]: run
      },
      project
    });

    renderRoute("/runs/run-104/specification", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "run-104" })).toBeInTheDocument();
    expect(await screen.findByText("No specification document yet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Workspace location")).not.toBeInTheDocument();
  });

  it("does not navigate into a stale run when the current project changes before + New run resolves", async () => {
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
    const createdRun = createLiveRunFixture("project-keystone-cloudflare", {
      runId: "run-203",
      startedAt: null,
      status: "configured",
      workflowInstanceId: "wf-run-203"
    });
    const deferredCreateResponse = createDeferredResponse();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = input instanceof Request ? input.method : init?.method ?? "GET";

      expectDevAuthHeaders(input, init);

      if (url === "/v1/projects" && method === "GET") {
        return createJsonResponse(buildProjectsResponse(projects));
      }

      if (url === "/v1/projects/project-keystone-cloudflare/runs" && method === "GET") {
        return createJsonResponse(buildRunsResponse([]));
      }

      if (url === "/v1/projects/project-alt/runs" && method === "GET") {
        return createJsonResponse(
          buildRunsResponse([
            createLiveRunFixture("project-alt", {
              runId: "run-alt-401",
              workflowInstanceId: "wf-run-alt-401"
            })
          ])
        );
      }

      if (url === "/v1/projects/project-keystone-cloudflare/runs" && method === "POST") {
        return deferredCreateResponse.promise;
      }

      if (url === `/v1/runs/${createdRun.runId}` && method === "GET") {
        return createJsonResponse(buildRunDetailResponse(createdRun));
      }

      if (url === `/v1/runs/${createdRun.runId}/documents` && method === "GET") {
        return createJsonResponse(buildEmptyRunDocumentsResponse());
      }

      if (url === `/v1/runs/${createdRun.runId}/workflow` && method === "GET") {
        return createJsonResponse(buildEmptyRunWorkflowResponse());
      }

      if (url === `/v1/runs/${createdRun.runId}/tasks` && method === "GET") {
        return createJsonResponse(buildEmptyRunTasksResponse());
      }

      throw new Error(`Unexpected fetch request: ${method} ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const { router } = renderRoute("/runs", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "No runs yet" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ New run" }));
    expect(await screen.findByRole("button", { name: "Creating run..." })).toBeDisabled();

    fireEvent.change(getProjectSelector(), {
      target: {
        value: "project-alt"
      }
    });

    await waitFor(() => {
      expect(getProjectSelector()).toHaveDisplayValue("Alt Project");
    });
    expect(await screen.findByText("run-alt-401")).toBeInTheDocument();

    deferredCreateResponse.resolve(createJsonResponse(buildRunDetailResponse(createdRun), 201));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/runs");
    });
    expect(getProjectSelector()).toHaveDisplayValue("Alt Project");
    expect(screen.getByText("run-alt-401")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "run-203" })).not.toBeInTheDocument();
  });

  it("surfaces create-run failures on the index and restores the button state", async () => {
    const project: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };
    stubRunCreationFetch({
      createRunResponses: [
        () =>
          createErrorResponse({
            code: "request_failed",
            message: "Run creation failed.",
            status: 503
          })
      ],
      project
    });

    const { router } = renderRoute("/runs", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "No runs yet" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ New run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Run creation failed.");
    expect(screen.getByRole("button", { name: "+ New run" })).toBeEnabled();
    expect(router.state.location.pathname).toBe("/runs");
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
    expect(getProjectSelector()).toHaveDisplayValue("Alt Project");
    expectWorkspaceLocation("Alt Project", "Runs");
    expect(
      screen.getByText(
        "Create the first run to work through specification, architecture, execution plan, and execution."
      )
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(currentProjectStorageKey)).toBe("project-alt");
  });

  it("keeps the zero-project recovery path reachable at /projects/new", async () => {
    stubProjectListFetch([]);

    renderRoute("/projects/new", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "New project" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No projects yet" })).not.toBeInTheDocument();
  });

  it("switches the current project from the live sidebar selector without leaving stale rows actionable", async () => {
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
    const deferredAlternateRunsResponse = createDeferredResponse();

    stubProjectManagementFetch({
      projectResponses: [() => createJsonResponse(buildProjectsResponse(projects))],
      projectRunsByProjectId: {
        "project-keystone-cloudflare": [
          () => createJsonResponse(buildRunsResponse(primaryRuns))
        ],
        "project-alt": [() => deferredAlternateRunsResponse.promise]
      }
    });
    renderRoute("/runs", { useBrowserProjectApi: true });

    await screen.findByText("run-104");

    fireEvent.change(getProjectSelector(), {
      target: {
        value: "project-alt"
      }
    });

    expect(getProjectSelector()).toHaveDisplayValue("Alt Project");
    expectWorkspaceLocation("Alt Project", "Runs");
    expect(await screen.findByRole("heading", { name: "Loading runs" })).toBeInTheDocument();
    expect(screen.getByText("Keystone is loading runs for this workspace.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "run-104" })).not.toBeInTheDocument();

    deferredAlternateRunsResponse.resolve(
      createJsonResponse(buildRunsResponse(alternateRuns))
    );

    await screen.findByRole("link", { name: "run-alt-301" });
    expect(screen.getByRole("link", { name: "run-alt-301" })).toBeInTheDocument();
    expect(screen.queryByText("run-104")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(currentProjectStorageKey)).toBe("project-alt");
  });

  it("keeps the theme preference toggle in the sidebar and applies the selected theme", async () => {
    const scaffoldProject: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };

    stubProjectListFetch([scaffoldProject]);

    renderRoute("/documentation", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "Documentation" })).toBeInTheDocument();
    expectWorkspaceLocation("Keystone Cloudflare", "Documentation");

    const themePreferencePanel = getThemePreferencePanel();

    expect(themePreferencePanel).not.toBeNull();
    expect(themePreferencePanel?.closest("aside")?.lastElementChild).toBe(themePreferencePanel);

    const themePreference = within(themePreferencePanel as HTMLElement).getByRole("group", {
      name: "Theme preference"
    });

    fireEvent.click(within(themePreference).getByRole("radio", { name: "Dark" }));

    expect(window.localStorage.getItem(themePreferenceStorageKey)).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("renders the settings load error state and recovers after retry", async () => {
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
    const alternateProjectDetail = {
      projectId: "project-alt",
      projectKey: "alt-project",
      displayName: "Alt Project",
      description: "Alternate operator workspace.",
      ruleSet: {
        reviewInstructions: ["Review the alternate project carefully."],
        testInstructions: ["Run the alternate smoke test suite."]
      },
      components: [
        {
          componentKey: "alt-api",
          displayName: "Alt API",
          kind: "git_repository" as const,
          config: {
            gitUrl: "https://github.com/keystone/alt-api.git",
            ref: "main"
          }
        }
      ],
      envVars: [
        {
          name: "ALT_RUNTIME",
          value: "workers"
        }
      ]
    };

    window.localStorage.setItem(currentProjectStorageKey, "project-alt");
    const fetchMock = stubProjectManagementFetch({
      projectResponses: [() => createJsonResponse(buildProjectsResponse(projects))],
      projectDetailsByProjectId: {
        "project-alt": [
          async () => {
            throw new Error("Project settings failed.");
          },
          () => createJsonResponse(buildProjectDetailResponse(alternateProjectDetail))
        ]
      }
    });

    renderRoute("/settings", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "Project settings" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Unable to load project settings" })
    ).toBeInTheDocument();
    expect(screen.getByText("Project settings failed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Project name" })).toHaveValue("Alt Project");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("waits for the real project selection before loading live project settings", async () => {
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
    const alternateProjectDetail = {
      projectId: "project-alt",
      projectKey: "alt-project",
      displayName: "Alt Project",
      description: "Alternate operator workspace.",
      ruleSet: {
        reviewInstructions: ["Review the alternate project carefully."],
        testInstructions: ["Run the alternate smoke test suite."]
      },
      components: [
        {
          componentKey: "alt-api",
          displayName: "Alt API",
          kind: "git_repository" as const,
          config: {
            gitUrl: "https://github.com/keystone/alt-api.git",
            ref: "main"
          }
        }
      ],
      envVars: [
        {
          name: "ALT_RUNTIME",
          value: "workers"
        }
      ]
    };
    const deferredProjectsResponse = createDeferredResponse();
    const deferredDetailResponse = createDeferredResponse();

    window.localStorage.setItem(currentProjectStorageKey, "project-alt");
    const fetchMock = stubProjectManagementFetch({
      projectResponses: [() => deferredProjectsResponse.promise],
      projectDetailsByProjectId: {
        "project-alt": [() => deferredDetailResponse.promise]
      }
    });

    renderRoute("/settings", { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: "Loading projects" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Loading project settings" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([request]) =>
      typeof request === "string" ? request : request.toString()
    )).toEqual(["/v1/projects"]);

    deferredProjectsResponse.resolve(createJsonResponse(buildProjectsResponse(projects)));

    expect(
      await screen.findByRole("heading", { name: "Loading project settings" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Project settings" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Project name" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([request]) =>
      typeof request === "string" ? request : request.toString()
    )).toEqual(["/v1/projects", "/v1/projects/project-alt"]);

    deferredDetailResponse.resolve(createJsonResponse(buildProjectDetailResponse(alternateProjectDetail)));

    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Project name" })).toHaveValue("Alt Project");
  });

  it("keeps the settings route safe when a switched project detail is missing", async () => {
    const scaffoldProject: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };
    const alternateProject: CurrentProject = {
      projectId: "project-alt",
      projectKey: "alt-project",
      displayName: "Alt Project",
      description: "Secondary workspace"
    };
    const settingsProjectDetail = {
      projectId: scaffoldProject.projectId,
      projectKey: scaffoldProject.projectKey,
      displayName: scaffoldProject.displayName,
      description: scaffoldProject.description,
      ruleSet: {
        reviewInstructions: ["Keep route ownership explicit."],
        testInstructions: ["Run the focused shell tests."]
      },
      components: [
        {
          componentKey: "api",
          displayName: "API",
          kind: "git_repository" as const,
          config: {
            localPath: "./services/api",
            ref: "main"
          }
        }
      ],
      envVars: [
        {
          name: "KEYSTONE_AGENT_RUNTIME",
          value: "scripted"
        }
      ]
    };

    stubProjectManagementFetch({
      projectResponses: [
        () => createJsonResponse(buildProjectsResponse([scaffoldProject, alternateProject]))
      ],
      projectDetailsByProjectId: {
        [scaffoldProject.projectId]: [
          () => createJsonResponse(buildProjectDetailResponse(settingsProjectDetail))
        ],
        [alternateProject.projectId]: [
          () =>
            createJsonResponse(
              {
                error: {
                  code: "project_not_found",
                  message: "Project settings are no longer available."
                }
              },
              404
            )
        ]
      }
    });

    renderRoute("/settings/overview", { useBrowserProjectApi: true });

    expect(await screen.findByRole("textbox", { name: "Project name" })).toHaveValue(
      "Keystone Cloudflare"
    );

    fireEvent.change(getProjectSelector(), {
      target: {
        value: "project-alt"
      }
    });

    await waitFor(() => {
      expect(getProjectSelector()).toHaveDisplayValue("Alt Project");
    });
    expect(
      await screen.findByRole("heading", { name: "Unable to load project settings" })
    ).toBeInTheDocument();
    expect(screen.getByText("Project settings are no longer available.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Project name" })).not.toBeInTheDocument();
  });

  it.each([
    {
      destination: "Documentation",
      path: "/documentation",
      heading: "Documentation"
    },
    {
      destination: "Workstreams",
      path: "/workstreams",
      heading: "Workstreams"
    },
    {
      destination: "New project",
      path: "/projects/new",
      heading: "New project"
    },
    {
      destination: "Project settings",
      path: "/settings",
      heading: "Project settings"
    }
  ])("mounts the $heading scaffold route inside the shared shell", async ({ path, heading, destination }) => {
    const scaffoldProject: CurrentProject = {
      projectId: "project-keystone-cloudflare",
      projectKey: "keystone-cloudflare",
      displayName: "Keystone Cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    };
    const settingsProjectDetail = {
      projectId: scaffoldProject.projectId,
      projectKey: scaffoldProject.projectKey,
      displayName: scaffoldProject.displayName,
      description: scaffoldProject.description,
      ruleSet: {
        reviewInstructions: ["Keep route ownership explicit."],
        testInstructions: ["Run the focused shell tests."]
      },
      components: [
        {
          componentKey: "api",
          displayName: "API",
          kind: "git_repository" as const,
          config: {
            localPath: "./services/api",
            ref: "main"
          }
        }
      ],
      envVars: [
        {
          name: "KEYSTONE_AGENT_RUNTIME",
          value: "scripted"
        }
      ]
    };

    if (path === "/settings") {
      stubProjectManagementFetch({
        projectResponses: [() => createJsonResponse(buildProjectsResponse([scaffoldProject]))],
        projectDetailsByProjectId: {
          [scaffoldProject.projectId]: [
            () => createJsonResponse(buildProjectDetailResponse(settingsProjectDetail))
          ]
        }
      });
    } else {
      stubProjectListFetch([scaffoldProject]);
    }

    renderRoute(path, { useBrowserProjectApi: true });

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(getProjectSelector()).toHaveDisplayValue("Keystone Cloudflare");
    expect(screen.getByRole("navigation", { name: "Global navigation" })).toBeInTheDocument();
    expectWorkspaceLocation("Keystone Cloudflare", destination);
    expectShellLinkTarget("Runs", "/runs");
    expectShellLinkTarget("Documentation", "/documentation");
    expectShellLinkTarget("Workstreams", "/workstreams");
    expectShellLinkTarget("New project", "/projects/new");
    expectShellLinkTarget("Project settings", "/settings");
  });
});
