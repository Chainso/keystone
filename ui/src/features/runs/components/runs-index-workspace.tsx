import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

import { EntityTable, type EntityTableColumn } from "../../../components/workspace/entity-table";
import {
  WorkspacePage,
  WorkspacePageSection
} from "../../../components/workspace/workspace-page";
import { StatusPill } from "../../../shared/layout/status-pill";
import { buildRunPhasePath } from "../../../shared/navigation/run-phases";
import { getRunStatusTone } from "../run-status";
import { useRunsIndexViewModel } from "../use-runs-index-view-model";

export function RunsIndexWorkspace() {
  const model = useRunsIndexViewModel();
  const navigate = useNavigate();
  const totalRuns = model.scaffoldRuns.length + model.liveRuns.length;
  const runsSummary =
    "Open a run to move through specification, architecture, execution plan, and execution in one workspace.";
  const tableFooter = (
    <div className="entity-table-footer">
      <p className="table-row-note">
        Open a row to step into the run workspace and move across the four stages.
      </p>
      <div className="filter-chip-row">
        <span className="meta-chip">
          {`${totalRuns} recorded ${totalRuns === 1 ? "run" : "runs"}`}
        </span>
      </div>
    </div>
  );
  const createRunAttemptRef = useRef<Promise<void> | null>(null);

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
    const existingAttempt = createRunAttemptRef.current;

    if (existingAttempt) {
      return existingAttempt;
    }

    const createAttempt = (async () => {
      try {
        const runId = await model.createRun();

        if (!runId) {
          return;
        }

        navigate(buildRunPhasePath(runId, "specification"));
      } catch {
        // The view model owns the visible error state for create-run failures.
      } finally {
        if (createRunAttemptRef.current === createAttempt) {
          createRunAttemptRef.current = null;
        }
      }
    })();

    createRunAttemptRef.current = createAttempt;
    return createAttempt;
  }

  return (
    <WorkspacePage>
      <WorkspacePageSection className="entity-table-panel">
        <div className="workspace-surface-header">
          <div className="workspace-surface-heading">
            <h1 className="page-title runs-page-title">{model.title}</h1>
            <p className="workspace-surface-note">{runsSummary}</p>
          </div>
          <div className="workspace-surface-actions" aria-label="Runs actions" role="group">
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
          </div>
        </div>

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
    </WorkspacePage>
  );
}
