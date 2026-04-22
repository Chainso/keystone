import { Link, useNavigate } from "react-router-dom";

import { EntityTable, type EntityTableColumn } from "../../../components/workspace/entity-table";
import {
  WorkspacePage,
  WorkspacePageActions,
  WorkspacePageHeader,
  WorkspacePageHeading,
  WorkspacePageSection
} from "../../../components/workspace/workspace-page";
import {
  WorkspacePanel,
  WorkspacePanelEyebrow,
  WorkspacePanelHeader,
  WorkspacePanelHeading,
  WorkspacePanelSummary,
  WorkspacePanelTitle
} from "../../../components/workspace/workspace-panel";
import { useProjectManagement } from "../../projects/project-context";
import { StatusPill } from "../../../shared/layout/status-pill";
import { buildRunPhasePath, runPhaseDefinitions } from "../../../shared/navigation/run-phases";
import { formatMachineLabel, getRunStatusTone } from "../run-status";
import { useRunsIndexViewModel } from "../use-runs-index-view-model";

function getLiveRunStageLabel(run: {
  compiledFrom: {
    architectureRevisionId: string;
    compiledAt: string;
    executionPlanRevisionId: string;
    specificationRevisionId: string;
  } | null;
}) {
  return run.compiledFrom ? "Execution" : "Planning";
}

export function RunsIndexWorkspace() {
  const model = useRunsIndexViewModel();
  const navigate = useNavigate();
  const { state } = useProjectManagement();
  const currentProject = state.currentProject;
  const totalRuns = model.scaffoldRuns.length + model.liveRuns.length;
  const runSourceLabel =
    model.scaffoldRuns.length > 0
      ? "Compatibility seed"
      : currentProject
        ? "Live project data"
        : "Project selection required";
  const projectSummary =
    currentProject?.description || currentProject?.projectKey || "Choose a project before opening Runs.";
  const runsSummary = currentProject
    ? `Create a run, then move through the current workspace for ${currentProject.displayName}.`
    : "Choose a project, then create a run and step into its workspace.";
  const tableFooter = (
    <p className="table-row-note">
      Open a run to move between Specification, Architecture, Execution Plan, and Execution.
    </p>
  );

  const scaffoldColumns: EntityTableColumn<(typeof model.scaffoldRuns)[number]>[] = [
    {
      cell: (run) => (
        <Link to={run.detailPath} className="table-primary-link">
          {run.displayId}
        </Link>
      ),
      header: "Run ID",
      id: "run-id"
    },
    {
      cell: (run) => run.summary,
      header: "Summary",
      id: "summary"
    },
    {
      cell: (run) => run.stageLabel,
      header: "Stage",
      id: "stage"
    },
    {
      cell: (run) => <StatusPill label={run.status} tone={getRunStatusTone(run.status)} />,
      header: "Status",
      id: "status"
    },
    {
      cell: (run) => run.updatedLabel,
      header: "Updated",
      id: "updated"
    }
  ];
  const liveColumns: EntityTableColumn<(typeof model.liveRuns)[number]>[] = [
    {
      cell: (run) => (
        <Link to={run.detailPath} className="table-primary-link">
          {run.runId}
        </Link>
      ),
      header: "Run ID",
      id: "run-id"
    },
    {
      cell: (run) => (
        <div className="table-detail-stack">
          <span>{`Workflow ${run.workflowInstanceId}`}</span>
          <span className="table-row-note">{`Engine ${formatMachineLabel(run.executionEngine)}`}</span>
        </div>
      ),
      header: "Summary",
      id: "summary"
    },
    {
      cell: (run) => getLiveRunStageLabel(run),
      header: "Stage",
      id: "stage"
    },
    {
      cell: (run) => <StatusPill label={run.statusLabel} tone={run.statusTone} />,
      header: "Status",
      id: "status"
    },
    {
      cell: (run) => run.latestActivityLabel,
      header: "Updated",
      id: "updated"
    }
  ];

  async function handleCreateRun() {
    try {
      const runId = await model.createRun();

      if (!runId) {
        return;
      }

      navigate(buildRunPhasePath(runId, "specification"));
    } catch {
      // The view model owns the visible error state for create-run failures.
    }
  }

  return (
    <WorkspacePage>
      <div className="runs-index-grid">
        <WorkspacePageSection className="entity-table-panel">
          <WorkspacePageHeader>
            <WorkspacePageHeading>
              <p className="page-eyebrow">Run index</p>
              <h1 className="page-title runs-page-title">{model.title}</h1>
              <p className="page-summary">{runsSummary}</p>
            </WorkspacePageHeading>
            <WorkspacePageActions>
              <button
                type="button"
                className="ghost-button"
                aria-busy={model.isCreatingRun || undefined}
                disabled={!model.canCreateRun}
                onClick={() => {
                  void handleCreateRun();
                }}
              >
                {model.isCreatingRun ? "Creating run..." : "+ New run"}
              </button>
            </WorkspacePageActions>
          </WorkspacePageHeader>

          {model.createRunErrorMessage ? (
            <p className="document-card-summary" role="alert">
              {model.createRunErrorMessage}
            </p>
          ) : null}

          {model.compatibilityState ? (
            <EntityTable
              ariaLabel="Runs"
              columns={scaffoldColumns}
              emptyState={{
                action:
                  model.compatibilityState.heading === "Unable to load runs" ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        model.retry();
                      }}
                    >
                      Retry
                    </button>
                  ) : undefined,
                description: model.compatibilityState.message,
                title: model.compatibilityState.heading
              }}
              footer={tableFooter}
              getRowId={(run) => run.runId}
              rows={[]}
            />
          ) : model.scaffoldRuns.length > 0 ? (
            <EntityTable
              ariaLabel="Runs"
              columns={scaffoldColumns}
              footer={tableFooter}
              getRowId={(run) => run.runId}
              onRowActivate={(run) => navigate(run.detailPath)}
              rows={model.scaffoldRuns}
            />
          ) : (
            <EntityTable
              ariaLabel="Runs"
              columns={liveColumns}
              footer={tableFooter}
              getRowId={(run) => run.runId}
              onRowActivate={(run) => navigate(run.detailPath)}
              rows={model.liveRuns}
            />
          )}
        </WorkspacePageSection>

        <aside className="runs-index-sidebar" aria-label="Runs destination guide">
          <WorkspacePanel>
            <WorkspacePanelHeader>
              <WorkspacePanelHeading>
                <WorkspacePanelEyebrow>Selected project</WorkspacePanelEyebrow>
                <WorkspacePanelTitle>
                  {currentProject?.displayName ?? "No project selected"}
                </WorkspacePanelTitle>
              </WorkspacePanelHeading>
            </WorkspacePanelHeader>
            <WorkspacePanelSummary>{projectSummary}</WorkspacePanelSummary>
            <div className="filter-chip-row">
              <span className="meta-chip">
                {`${totalRuns} recorded ${totalRuns === 1 ? "run" : "runs"}`}
              </span>
              <span className="meta-chip">{runSourceLabel}</span>
            </div>
          </WorkspacePanel>

          <WorkspacePanel>
            <WorkspacePanelHeader>
              <WorkspacePanelHeading>
                <WorkspacePanelEyebrow>Inside a run</WorkspacePanelEyebrow>
                <WorkspacePanelTitle>Run workspace</WorkspacePanelTitle>
              </WorkspacePanelHeading>
            </WorkspacePanelHeader>
            <WorkspacePanelSummary>
              Open a row to move through the four-stage run workspace without leaving the selected
              project.
            </WorkspacePanelSummary>
            <ol className="run-phase-guide" aria-label="Run stage order">
              {runPhaseDefinitions.map((phase) => (
                <li key={phase.id} className="run-phase-guide-item">
                  <p className="run-phase-guide-label">{phase.label}</p>
                  <p className="run-phase-guide-summary">{phase.summary}</p>
                </li>
              ))}
            </ol>
          </WorkspacePanel>
        </aside>
      </div>
    </WorkspacePage>
  );
}
