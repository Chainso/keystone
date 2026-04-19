// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import {
  CurrentProjectProvider,
  useCurrentProject,
  type CurrentProject
} from "../features/projects/project-context";
import { uiScaffoldDataset } from "../features/resource-model/scaffold-dataset";
import {
  getRunDefaultPhaseId,
  listProjectDocumentationGroups,
  listProjectWorkstreamTasks
} from "../features/resource-model/selectors";
import type { ResourceModelDataset } from "../features/resource-model/types";

afterEach(() => {
  cleanup();
});

function CurrentProjectProbe() {
  const project = useCurrentProject();

  return <span>{project.displayName}</span>;
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
          updatedLabel: "now"
        },
        {
          runId: "run-phase-architecture",
          projectId: "project-keystone-cloudflare",
          displayId: "Run-201",
          summary: "Architecture only",
          status: "Draft",
          updatedLabel: "now"
        },
        {
          runId: "run-phase-specification",
          projectId: "project-keystone-cloudflare",
          displayId: "Run-202",
          summary: "Specification only",
          status: "Draft",
          updatedLabel: "now"
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
          contentLines: ["phase"]
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

  it("keeps project context available through the resource-model provider seam", () => {
    const project: CurrentProject = {
      projectId: "project-custom",
      projectKey: "custom-project",
      displayName: "Custom Project"
    };

    render(
      <CurrentProjectProvider>
        <CurrentProjectProbe />
      </CurrentProjectProvider>
    );

    expect(screen.getByText("Keystone Cloudflare")).toBeInTheDocument();

    cleanup();

    render(
      <CurrentProjectProvider project={project}>
        <CurrentProjectProbe />
      </CurrentProjectProvider>
    );

    expect(screen.getByText("Custom Project")).toBeInTheDocument();
  });
});
