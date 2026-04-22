import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useRunsIndexViewModel } from "../../features/runs/use-runs-index-view-model";
import { buildRunPhasePath } from "../../shared/navigation/run-phases";
import { StatusPill } from "../../shared/layout/status-pill";

export function RunsIndexRoute() {
  const model = useRunsIndexViewModel();
  const navigate = useNavigate();

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>, detailPath: string) {
    const target = event.target;

    if (
      event.button !== 0 ||
      event.defaultPrevented ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      (target instanceof Element && target.closest("a, button, input, textarea, select, summary"))
    ) {
      return;
    }

    navigate(detailPath);
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
    <div className="page-stage">
      <section className="page-section runs-table-panel">
        <div className="runs-table-header">
          <h1 className="page-title runs-page-title">{model.title}</h1>
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
        {model.createRunErrorMessage ? (
          <p className="document-card-summary" role="alert">
            {model.createRunErrorMessage}
          </p>
        ) : null}

        {model.compatibilityState ? (
          <section className="empty-state-card">
            <h2 className="document-card-title">{model.compatibilityState.heading}</h2>
            <p className="document-card-summary">{model.compatibilityState.message}</p>
            {model.compatibilityState.heading === "Unable to load runs" ? (
              <div className="shell-state-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    model.retry();
                  }}
                >
                  Retry
                </button>
              </div>
            ) : null}
          </section>
        ) : model.scaffoldRuns.length > 0 ? (
          <div className="table-scroll">
            <table className="runs-table">
              <thead>
                <tr>
                  <th scope="col">Run ID</th>
                  <th scope="col">Summary</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {model.scaffoldRuns.map((run) => (
                  <tr
                    key={run.runId}
                    className="table-clickable-row"
                    onClick={(event) => handleRowClick(event, run.detailPath)}
                  >
                    <td>
                      <Link to={run.detailPath} className="table-primary-link">
                        {run.displayId}
                      </Link>
                    </td>
                    <td>{run.summary}</td>
                    <td>{run.stageLabel}</td>
                    <td>
                      <StatusPill label={run.status} />
                    </td>
                    <td>{run.updatedLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="runs-table">
                <thead>
                  <tr>
                    <th scope="col">Run ID</th>
                    <th scope="col">Workflow instance</th>
                    <th scope="col">Engine</th>
                    <th scope="col">Status</th>
                    <th scope="col">Latest activity</th>
                  </tr>
                </thead>
                <tbody>
                  {model.liveRuns.map((run) => (
                    <tr
                      key={run.runId}
                      className="table-clickable-row"
                      onClick={(event) => handleRowClick(event, run.detailPath)}
                    >
                      <td>
                        <Link to={run.detailPath} className="table-primary-link">
                          {run.runId}
                        </Link>
                      </td>
                      <td>{run.workflowInstanceId}</td>
                      <td>{run.executionEngine}</td>
                      <td>
                        <StatusPill label={run.status} />
                      </td>
                      <td>{run.latestActivityLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </>
        )}
      </section>
    </div>
  );
}
