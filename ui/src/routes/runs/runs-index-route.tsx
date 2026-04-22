import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { EntityTable, type EntityTableColumn } from "../../components/workspace/entity-table";
import {
  WorkspacePage,
  WorkspacePageActions,
  WorkspacePageHeader,
  WorkspacePageHeading,
  WorkspacePageSection
} from "../../components/workspace/workspace-page";
import { useRunsIndexViewModel } from "../../features/runs/use-runs-index-view-model";
import { buildRunPhasePath } from "../../shared/navigation/run-phases";
import { StatusPill } from "../../shared/layout/status-pill";

export function RunsIndexRoute() {
  const model = useRunsIndexViewModel();
  const navigate = useNavigate();

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
      cell: (run) => <StatusPill label={run.status} />,
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
      cell: (run) => run.workflowInstanceId,
      header: "Workflow instance",
      id: "workflow-instance"
    },
    {
      cell: (run) => run.executionEngine,
      header: "Engine",
      id: "execution-engine"
    },
    {
      cell: (run) => <StatusPill label={run.statusLabel} tone={run.statusTone} />,
      header: "Status",
      id: "status"
    },
    {
      cell: (run) => run.latestActivityLabel,
      header: "Latest activity",
      id: "latest-activity"
    }
  ];

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>) {
    const primaryLink = event.currentTarget.querySelector<HTMLAnchorElement>("a[href]");

    primaryLink?.click();
  }

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
      <WorkspacePageSection className="runs-table-panel">
        <WorkspacePageHeader>
          <WorkspacePageHeading>
            <h1 className="page-title runs-page-title">{model.title}</h1>
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
            getRowId={(run) => run.runId}
            rows={[]}
          />
        ) : model.scaffoldRuns.length > 0 ? (
          <EntityTable
            ariaLabel="Runs"
            columns={scaffoldColumns}
            getRowId={(run) => run.runId}
            onRowClick={handleRowClick}
            rows={model.scaffoldRuns}
          />
        ) : (
          <EntityTable
            ariaLabel="Runs"
            columns={liveColumns}
            getRowId={(run) => run.runId}
            onRowClick={handleRowClick}
            rows={model.liveRuns}
          />
        )}
      </WorkspacePageSection>
    </WorkspacePage>
  );
}
