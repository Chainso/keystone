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

  function openRow() {
    navigate(row.detailPath);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRow();
    }
  }

  return (
    <tr className="workstreams-table-row" tabIndex={0} onClick={openRow} onKeyDown={handleKeyDown}>
      <td>
        <Link
          to={row.detailPath}
          className="table-primary-link"
          aria-label={`Open ${row.taskDisplayId} in ${row.runDisplayId}`}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
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
                className={filter.isActive ? "filter-chip is-active" : "filter-chip"}
                onClick={() => model.setActiveFilter(filter.filterId)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

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

        <p className="page-section-copy">Click a row to open that task inside Runs &gt; Execution.</p>
      </section>
    </div>
  );
}
