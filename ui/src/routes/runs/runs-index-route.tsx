import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useRunsIndexViewModel } from "../../features/runs/use-runs-index-view-model";
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

  return (
    <div className="page-stage">
      <section className="page-section runs-table-panel">
        <div className="runs-table-header">
          <h1 className="page-title runs-page-title">{model.title}</h1>
          <button type="button" className="ghost-button" disabled>
            + New run
          </button>
        </div>

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
              {model.runs.map((run) => (
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
      </section>
    </div>
  );
}
