import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { WorkstreamRowViewModel, WorkstreamsViewModel } from "../use-workstreams-view-model";

interface WorkstreamsBoardProps {
  model: WorkstreamsViewModel;
}

interface WorkstreamsRowProps {
  row: WorkstreamRowViewModel;
}

function WorkstreamsRow({ row }: WorkstreamsRowProps) {
  const navigate = useNavigate();

  function handleRowClick(event: MouseEvent<HTMLTableRowElement>) {
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

    navigate(row.detailPath);
  }

  return (
    <tr className="table-clickable-row" onClick={handleRowClick}>
      <td>
        <Link to={row.detailPath} className="table-primary-link">
          {row.taskDisplayId}
        </Link>
      </td>
      <td>{row.title}</td>
      <td>{row.runDisplayId}</td>
      <td>{row.status}</td>
      <td>{row.updatedLabel}</td>
    </tr>
  );
}

export function WorkstreamsBoard({ model }: WorkstreamsBoardProps) {
  return (
    <div className="page-stage">
      <section className="page-section runs-table-panel">
        <h1 className="page-title runs-page-title">{model.title}</h1>

        <div className="workstreams-filter-bar" aria-label="Workstream filters">
          <span className="workstreams-filter-label">Filters:</span>

          <div className="filter-chip-row">
            {model.filters.map((filter) => (
              <button
                key={filter.filterId}
                type="button"
                aria-pressed={filter.isActive}
                className={filter.isActive ? "filter-chip is-active" : "filter-chip"}
                onClick={() => model.setActiveFilter(filter.filterId)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {model.contentState ? (
          <section className="empty-state-card">
            <h2 className="document-card-title">{model.contentState.heading}</h2>
            <p className="document-card-summary">{model.contentState.message}</p>
            {model.contentState.actionLabel ? (
              <button type="button" className="secondary-button" onClick={model.retry}>
                {model.contentState.actionLabel}
              </button>
            ) : null}
          </section>
        ) : (
          <div className="table-scroll">
            <table className="runs-table">
              <thead>
                <tr>
                  <th scope="col">Task ID</th>
                  <th scope="col">Title</th>
                  <th scope="col">Run</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {model.rows.map((row) => (
                  <WorkstreamsRow key={row.rowId} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {model.contentState?.kind === "loading" || model.contentState?.kind === "error" ? null : (
          <>
            <p className="document-card-summary" aria-label="Workstreams pagination">
              {model.pagination.rangeLabel} · Page {model.pagination.currentPage} of {model.pagination.pageCount}
            </p>
            {model.pagination.pageCount > 1 ? (
              <div className="shell-state-actions">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={!model.pagination.hasPreviousPage}
                  onClick={model.goToPreviousPage}
                >
                  Previous page
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={!model.pagination.hasNextPage}
                  onClick={model.goToNextPage}
                >
                  Next page
                </button>
              </div>
            ) : null}
            {model.rows.length > 0 ? (
              <p className="page-section-copy">Click row to open that task inside Runs &gt; Execution.</p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
