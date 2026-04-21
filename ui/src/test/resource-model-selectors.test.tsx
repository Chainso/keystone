// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  CurrentProjectProvider,
  currentProjectStorageKey,
  useCurrentProject,
  useProjectManagement,
  type CurrentProject
} from "../features/projects/project-context";
import { buildProjectConfigurationComponentDraft } from "../features/projects/project-configuration-scaffold";
import { useProjectSettingsComponentsViewModel } from "../features/projects/use-project-configuration-view-model";
import {
  ResourceModelProvider,
  useResourceModel
} from "../features/resource-model/context";
import { uiScaffoldDataset } from "../features/resource-model/scaffold-dataset";
import {
  getNewProjectConfiguration,
  getProjectConfiguration,
  getProjectDocumentationSelection,
  getRunDefaultPhaseId,
  listRunSummaries,
  listProjectDocumentationGroups,
  listProjectWorkstreamTasks
} from "../features/resource-model/selectors";
import type { ResourceModelDataset } from "../features/resource-model/types";
import { serializeProjectListItem } from "../../../src/http/api/v1/projects/contracts";

const defaultTimestamp = new Date("2026-04-20T12:00:00.000Z");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
});

function CurrentProjectProbe() {
  const project = useCurrentProject();

  return <span>{project.displayName}</span>;
}

function CurrentProjectDetailsProbe() {
  const project = useCurrentProject();

  return (
    <>
      <span data-testid="current-project-name">{project.displayName}</span>
      <span data-testid="current-project-id">{project.projectId}</span>
    </>
  );
}

function ProjectManagementProbe() {
  const { actions, meta, state } = useProjectManagement();

  return (
    <>
      <span data-testid="project-management-status">{meta.status}</span>
      <span data-testid="project-management-name">{state.currentProject?.displayName ?? "none"}</span>
      <span data-testid="project-management-id">{state.currentProjectId ?? "none"}</span>
      <span data-testid="project-management-count">{String(state.projects.length)}</span>
      <button type="button" onClick={() => actions.selectProject("project-alt")}>
        Select alt project
      </button>
    </>
  );
}

function ResourceModelProbe() {
  const { state, actions, meta } = useResourceModel();
  const project = useCurrentProject();
  const alternateProjectId = state.dataset.projects.find(
    (candidate) => candidate.projectId !== state.currentProjectId
  )?.projectId;

  return (
    <>
      <span data-testid="project-name">{project.displayName}</span>
      <span data-testid="project-id">{state.currentProjectId}</span>
      <span data-testid="source">{meta.source}</span>
      <span data-testid="run-count">
        {listRunSummaries(state.currentProjectId, state.dataset).length}
      </span>
      <button
        type="button"
        onClick={() => {
          if (alternateProjectId) {
            actions.setCurrentProjectId(alternateProjectId);
          }
        }}
      >
        Switch project
      </button>
    </>
  );
}

function ProjectSettingsComponentsProbe() {
  const { actions } = useResourceModel();
  const viewModel = useProjectSettingsComponentsViewModel();

  return (
    <>
      <span data-testid="components-heading">
        {viewModel.components.map((component) => component.displayName).join(",")}
      </span>
      <button type="button" onClick={() => actions.setCurrentProjectId("project-alt")}>
        Switch settings project
      </button>
    </>
  );
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

describe("resource-model selectors", () => {
  it("derives default run phases from tasks and available planning documents", () => {
    const dataset: ResourceModelDataset = {
      ...uiScaffoldDataset,
      runs: [
        ...uiScaffoldDataset.runs,
        {
          runId: "run-phase-execution-plan",
          projectId: "project-keystone-cloudflare",
          displayId: "Run-200",
          summary: "Execution plan only",
          status: "Draft",
          updatedLabel: "now",
          hasCompiledTasks: false
        },
        {
          runId: "run-phase-architecture",
          projectId: "project-keystone-cloudflare",
          displayId: "Run-201",
          summary: "Architecture only",
          status: "Draft",
          updatedLabel: "now",
          hasCompiledTasks: false
        },
        {
          runId: "run-phase-specification",
          projectId: "project-keystone-cloudflare",
          displayId: "Run-202",
          summary: "Specification only",
          status: "Draft",
          updatedLabel: "now",
          hasCompiledTasks: false
        }
      ],
      documents: [
        ...uiScaffoldDataset.documents,
        {
          documentId: "run-phase-execution-plan-doc",
          projectId: "project-keystone-cloudflare",
          runId: "run-phase-execution-plan",
          scopeType: "run" as const,
          kind: "execution-plan" as const,
          label: "Execution plan",
          title: "Execution plan doc",
          path: "runs/run-phase-execution-plan/execution-plan.md",
          currentRevisionId: "run-phase-execution-plan-doc-rev-1"
        },
        {
          documentId: "run-phase-architecture-doc",
          projectId: "project-keystone-cloudflare",
          runId: "run-phase-architecture",
          scopeType: "run" as const,
          kind: "technical-architecture" as const,
          label: "Architecture",
          title: "Living architecture doc",
          path: "runs/run-phase-architecture/architecture.md",
          currentRevisionId: "run-phase-architecture-doc-rev-1"
        },
        {
          documentId: "run-phase-specification-doc",
          projectId: "project-keystone-cloudflare",
          runId: "run-phase-specification",
          scopeType: "run" as const,
          kind: "product-specification" as const,
          label: "Specification",
          title: "Living product spec",
          path: "runs/run-phase-specification/specification.md",
          currentRevisionId: "run-phase-specification-doc-rev-1"
        }
      ],
      documentRevisions: [
        ...uiScaffoldDataset.documentRevisions,
        {
          revisionId: "run-phase-execution-plan-doc-rev-1",
          documentId: "run-phase-execution-plan-doc",
          viewerTitle: "Execution plan doc",
          contentLines: ["plan"]
        },
        {
          revisionId: "run-phase-architecture-doc-rev-1",
          documentId: "run-phase-architecture-doc",
          viewerTitle: "Living architecture doc",
          contentLines: ["architecture"]
        },
        {
          revisionId: "run-phase-specification-doc-rev-1",
          documentId: "run-phase-specification-doc",
          viewerTitle: "Living product spec",
          contentLines: ["spec"]
        }
      ]
    };

    expect(getRunDefaultPhaseId("run-104", dataset)).toBe("execution");
    expect(getRunDefaultPhaseId("run-phase-execution-plan", dataset)).toBe("execution-plan");
    expect(getRunDefaultPhaseId("run-phase-architecture", dataset)).toBe("architecture");
    expect(getRunDefaultPhaseId("run-phase-specification", dataset)).toBe("specification");
  });

  it("groups project documentation and workstreams from the normalized dataset", () => {
    const documentationGroups = listProjectDocumentationGroups("project-keystone-cloudflare");
    const workstreamTasks = listProjectWorkstreamTasks("project-keystone-cloudflare");

    expect(documentationGroups.map((group) => group.label)).toEqual([
      "Product Specifications",
      "Technical Architecture",
      "Miscellaneous Notes"
    ]);
    expect(documentationGroups[0]?.documents[0]?.viewerTitle).toBe(
      "current living product specification"
    );
    expect(documentationGroups[0]?.documents[0]?.path).toBe("docs/product/current.md");
    expect(workstreamTasks.map((task) => task.taskDisplayId)).toEqual([
      "TASK-029",
      "TASK-030",
      "TASK-031",
      "TASK-032",
      "TASK-033",
      "TASK-034",
      "TASK-021",
      "TASK-019"
    ]);
    expect(workstreamTasks[3]?.detailPath).toBe("/runs/run-104/execution/tasks/task-032");
  });

  it("derives documentation groups from document path metadata instead of a fixed group table", () => {
    const dataset: ResourceModelDataset = {
      ...uiScaffoldDataset,
      documents: [
        ...uiScaffoldDataset.documents,
        {
          documentId: "project-decision-log",
          projectId: "project-keystone-cloudflare",
          scopeType: "project",
          kind: "miscellaneous-note",
          label: "Decision log",
          title: "Decision log",
          path: "docs/decision-log/current.md",
          currentRevisionId: "project-decision-log-rev-1"
        }
      ],
      documentRevisions: [
        ...uiScaffoldDataset.documentRevisions,
        {
          revisionId: "project-decision-log-rev-1",
          documentId: "project-decision-log",
          viewerTitle: "decision log",
          contentLines: ["Document-derived grouping should surface new buckets automatically."]
        }
      ]
    };

    expect(listProjectDocumentationGroups("project-keystone-cloudflare", dataset)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          groupId: "project:docs/decision-log",
          label: "Decision Log",
          documents: [
            expect.objectContaining({
              documentId: "project-decision-log",
              path: "docs/decision-log/current.md"
            })
          ]
        })
      ])
    );
  });

  it("falls back to the first project document when the current selection is missing", () => {
    const defaultSelection = getProjectDocumentationSelection(
      "project-keystone-cloudflare",
      null
    );
    const missingSelection = getProjectDocumentationSelection(
      "project-keystone-cloudflare",
      "missing-document-id"
    );
    const explicitSelection = getProjectDocumentationSelection(
      "project-keystone-cloudflare",
      "project-open-questions"
    );

    expect(defaultSelection?.selectedDocument.documentId).toBe("project-spec-current");
    expect(missingSelection?.selectedDocument.documentId).toBe("project-spec-current");
    expect(explicitSelection?.selectedDocument.documentId).toBe("project-open-questions");
    expect(explicitSelection?.selectedDocument.path).toBe("docs/notes/open-questions.md");
  });

  it("returns viewer payload from the selected document revision", () => {
    const selection = getProjectDocumentationSelection(
      "project-keystone-cloudflare",
      "project-architecture-current"
    );

    expect(selection?.selectedDocument.documentId).toBe("project-architecture-current");
    expect(selection?.selectedDocument.title).toBe("Current technical architecture");
    expect(selection?.selectedDocument.viewerTitle).toBe("current living architecture + decisions");
    expect(selection?.selectedDocument.contentLines).toEqual([
      "The product runs as a Cloudflare-served SPA with route-owned destinations and feature-owned rendering surfaces.",
      "Run detail owns planning and execution views, while Documentation and Workstreams stay project-level destinations.",
      "The shared shell provides navigation and layout primitives without turning every destination into one large route module."
    ]);
  });

  it("derives new-project and settings configuration from the shared resource model", () => {
    const newProjectConfiguration = getNewProjectConfiguration();
    const projectConfiguration = getProjectConfiguration("project-keystone-cloudflare");

    expect(newProjectConfiguration?.overview).toEqual({
      displayName: "Keystone Cloudflare",
      projectKey: "keystone-cloudflare",
      description: "Internal operator workspace for the Keystone Cloudflare project."
    });
    expect(newProjectConfiguration?.components).toEqual([]);
    expect(newProjectConfiguration?.rules.reviewInstructions).toEqual([
      "Keep route ownership explicit.",
      "Capture component-specific review focus when needed."
    ]);
    expect(newProjectConfiguration?.environmentVariables.map((envVar) => envVar.name)).toEqual([
      "KEYSTONE_AGENT_RUNTIME",
      "KEYSTONE_CHAT_COMPLETIONS_BASE_URL",
      "KEYSTONE_CHAT_COMPLETIONS_MODEL"
    ]);

    expect(projectConfiguration?.overview).toEqual({
      displayName: "Keystone Cloudflare",
      projectKey: "keystone-cloudflare",
      description: "Internal operator workspace for runs, documentation, and workstreams."
    });
    expect(projectConfiguration?.components).toEqual([
      expect.objectContaining({
        componentId: "component-worker-app",
        displayName: "API",
        componentKey: "api",
        sourceMode: "localPath",
        localPath: "./services/api"
      })
    ]);
  });

  it("builds project component drafts from the selected kind id", () => {
    expect(buildProjectConfigurationComponentDraft("new", 0, "git_repository")).toEqual(
      expect.objectContaining({
        componentId: "new-component-1",
        kind: "git_repository"
      })
    );
    expect(buildProjectConfigurationComponentDraft("settings", 0, "git_repository")).toEqual(
      expect.objectContaining({
        componentId: "component-worker-app",
        kind: "git_repository"
      })
    );
  });

  it("keeps project context available through the resource-model provider seam", () => {
    const project: CurrentProject = {
      projectId: "project-custom",
      projectKey: "custom-project",
      displayName: "Custom Project",
      description: "Custom project scaffold."
    };

    render(
      <CurrentProjectProvider project={project}>
        <CurrentProjectProbe />
      </CurrentProjectProvider>
    );

    expect(screen.getByText("Custom Project")).toBeInTheDocument();
  });

  it("resynchronizes the override current project when the provider project prop changes", () => {
    const alphaProject: CurrentProject = {
      projectId: "project-alpha",
      projectKey: "alpha-project",
      displayName: "Alpha Project",
      description: "Alpha scaffold."
    };
    const betaProject: CurrentProject = {
      projectId: "project-beta",
      projectKey: "beta-project",
      displayName: "Beta Project",
      description: "Beta scaffold."
    };

    const { rerender } = render(
      <CurrentProjectProvider project={alphaProject}>
        <CurrentProjectDetailsProbe />
      </CurrentProjectProvider>
    );

    expect(screen.getByTestId("current-project-name")).toHaveTextContent("Alpha Project");
    expect(screen.getByTestId("current-project-id")).toHaveTextContent("project-alpha");

    rerender(
      <CurrentProjectProvider project={betaProject}>
        <CurrentProjectDetailsProbe />
      </CurrentProjectProvider>
    );

    expect(screen.getByTestId("current-project-name")).toHaveTextContent("Beta Project");
    expect(screen.getByTestId("current-project-id")).toHaveTextContent("project-beta");
  });

  it("falls back to the first project when local storage points at a stale project id", async () => {
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
        description: "Alternate project."
      }
    ];

    window.localStorage.setItem(currentProjectStorageKey, "project-stale");
    stubProjectListFetch(projects);

    render(
      <CurrentProjectProvider>
        <ProjectManagementProbe />
      </CurrentProjectProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("project-management-status")).toHaveTextContent("ready");
    });

    expect(screen.getByTestId("project-management-name")).toHaveTextContent("Keystone Cloudflare");
    expect(screen.getByTestId("project-management-id")).toHaveTextContent(
      "project-keystone-cloudflare"
    );
    expect(screen.getByTestId("project-management-count")).toHaveTextContent("2");
    expect(window.localStorage.getItem(currentProjectStorageKey)).toBe(
      "project-keystone-cloudflare"
    );
  });

  it("exposes an empty provider state when the live project list is empty", async () => {
    stubProjectListFetch([]);

    render(
      <CurrentProjectProvider>
        <ProjectManagementProbe />
      </CurrentProjectProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("project-management-status")).toHaveTextContent("empty");
    });

    expect(screen.getByTestId("project-management-name")).toHaveTextContent("none");
    expect(screen.getByTestId("project-management-id")).toHaveTextContent("none");
    expect(screen.getByTestId("project-management-count")).toHaveTextContent("0");
    expect(window.localStorage.getItem(currentProjectStorageKey)).toBeNull();
  });

  it("switches the live current project and persists the selected id", async () => {
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
        description: "Alternate project."
      }
    ];

    stubProjectListFetch(projects);

    render(
      <CurrentProjectProvider>
        <ProjectManagementProbe />
      </CurrentProjectProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("project-management-status")).toHaveTextContent("ready");
    });

    fireEvent.click(screen.getByRole("button", { name: "Select alt project" }));

    expect(screen.getByTestId("project-management-name")).toHaveTextContent("Alt Project");
    expect(screen.getByTestId("project-management-id")).toHaveTextContent("project-alt");
    expect(window.localStorage.getItem(currentProjectStorageKey)).toBe("project-alt");
  });

  it("exposes mutable project selection and scaffold meta through the provider contract", () => {
    const dataset: ResourceModelDataset = {
      ...uiScaffoldDataset,
      projects: [
        ...uiScaffoldDataset.projects,
        {
          projectId: "project-alt",
          projectKey: "alt-project",
          displayName: "Alt Project",
          description: "Alternate project"
        }
      ],
      runs: [
        ...uiScaffoldDataset.runs,
        {
          runId: "run-alt-001",
          projectId: "project-alt",
          displayId: "Run-Alt-001",
          summary: "Alternate run",
          status: "Draft",
          updatedLabel: "now",
          hasCompiledTasks: false
        }
      ]
    };

    render(
      <ResourceModelProvider dataset={dataset}>
        <ResourceModelProbe />
      </ResourceModelProvider>
    );

    expect(screen.getByTestId("project-name")).toHaveTextContent("Keystone Cloudflare");
    expect(screen.getByTestId("project-id")).toHaveTextContent("project-keystone-cloudflare");
    expect(screen.getByTestId("source")).toHaveTextContent("scaffold");
    expect(screen.getByTestId("run-count")).toHaveTextContent(String(uiScaffoldDataset.runs.length));

    fireEvent.click(screen.getByRole("button", { name: "Switch project" }));

    expect(screen.getByTestId("project-name")).toHaveTextContent("Alt Project");
    expect(screen.getByTestId("project-id")).toHaveTextContent("project-alt");
    expect(screen.getByTestId("source")).toHaveTextContent("scaffold");
    expect(screen.getByTestId("run-count")).toHaveTextContent("1");
  });

  it("resynchronizes settings components when the current project changes", () => {
    const dataset: ResourceModelDataset = {
      ...uiScaffoldDataset,
      projects: [
        ...uiScaffoldDataset.projects,
        {
          projectId: "project-alt",
          projectKey: "alt-project",
          displayName: "Alt Project",
          description: "Alternate project"
        }
      ],
      projectConfigurations: [
        ...uiScaffoldDataset.projectConfigurations,
        {
          configurationId: "project-alt-settings",
          kind: "project",
          projectId: "project-alt",
          overview: {
            displayName: "Alt Project",
            projectKey: "alt-project",
            description: "Alternate project"
          },
          components: [
            {
              componentId: "component-alt-worker",
              heading: "Component 1",
              displayName: "Alt Service",
              componentKey: "alt-service",
              kind: "git_repository",
              sourceMode: "gitUrl",
              localPath: "",
              gitUrl: "https://github.com/keystone/alt-service.git",
              defaultRef: "main",
              reviewInstructions: ["Focus on service changes"],
              testInstructions: ["Run targeted service tests"]
            }
          ],
          rules: {
            reviewInstructions: ["Keep route ownership explicit."],
            testInstructions: ["Run lint, typecheck, and targeted tests."]
          },
          environmentVariables: []
        }
      ]
    };

    render(
      <ResourceModelProvider dataset={dataset}>
        <ProjectSettingsComponentsProbe />
      </ResourceModelProvider>
    );

    expect(screen.getByTestId("components-heading")).toHaveTextContent("API");

    fireEvent.click(screen.getByRole("button", { name: "Switch settings project" }));

    expect(screen.getByTestId("components-heading")).toHaveTextContent("Alt Service");
  });

  it("resynchronizes settings components when the backing configuration changes for the same project", () => {
    const initialDataset: ResourceModelDataset = uiScaffoldDataset;
    const updatedDataset: ResourceModelDataset = {
      ...uiScaffoldDataset,
      projectConfigurations: uiScaffoldDataset.projectConfigurations.map((configuration) => {
        if (configuration.projectId !== "project-keystone-cloudflare") {
          return configuration;
        }

        return {
          ...configuration,
          components: [
            {
              componentId: "component-worker-app",
              heading: "Component 1",
              displayName: "Gateway",
              componentKey: "gateway",
              kind: "git_repository",
              sourceMode: "localPath",
              localPath: "./services/gateway",
              gitUrl: "",
              defaultRef: "main",
              reviewInstructions: ["Focus on gateway changes"],
              testInstructions: ["Run targeted gateway tests"]
            }
          ]
        };
      })
    };

    const { rerender } = render(
      <ResourceModelProvider dataset={initialDataset}>
        <ProjectSettingsComponentsProbe />
      </ResourceModelProvider>
    );

    expect(screen.getByTestId("components-heading")).toHaveTextContent("API");

    rerender(
      <ResourceModelProvider dataset={updatedDataset}>
        <ProjectSettingsComponentsProbe />
      </ResourceModelProvider>
    );

    expect(screen.getByTestId("components-heading")).toHaveTextContent("Gateway");
  });
});
