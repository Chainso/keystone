import { Link } from "react-router-dom";

import { useWorkstreamsViewModel } from "../../features/workstreams/use-workstreams-view-model";
import { PageSection } from "../../shared/layout/page-section";
import { StatusPill } from "../../shared/layout/status-pill";

export function WorkstreamsRoute() {
  const model = useWorkstreamsViewModel();

  return (
    <div className="page-stage">
      <header className="page-hero">
        <div>
          <span className="page-badge">Phase 3 scaffold</span>
          <p className="page-eyebrow">Workstreams destination</p>
          <h1 className="page-title">{model.title}</h1>
          <p className="page-summary">{model.summary}</p>
        </div>
        <aside className="hero-aside">
          <p className="hero-aside-title">Placeholder honesty</p>
          <p className="hero-aside-copy">
            Rows already route into the execution task detail shell, but the list and filters are
            still fixed placeholder data in Phase 3.
          </p>
        </aside>
      </header>

      <div className="runs-index-grid">
        <section className="page-section runs-table-panel">
          <div className="runs-table-header">
            <div>
              <p className="page-section-eyebrow">Workstream list</p>
              <h2 className="page-section-title">Current project work</h2>
            </div>
            <div className="filter-chip-row" aria-label="Workstream filters">
              {model.filters.map((filter) => (
                <button
                  key={filter.filterId}
                  type="button"
                  className={filter.isActive ? "filter-chip is-active" : "filter-chip"}
                  onClick={() => model.setActiveFilter(filter.filterId)}
                >
                  {filter.label}
                  <span className="filter-chip-count">{filter.count}</span>
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
                  <tr key={row.rowId}>
                    <td>
                      <Link
                        to={row.detailPath}
                        className="table-primary-link"
                        aria-label={`Open ${row.taskDisplayId} in ${row.runDisplayId}`}
                      >
                        {row.taskDisplayId}
                      </Link>
                    </td>
                    <td>
                      <div className="table-detail-stack">
                        <span>{row.title}</span>
                        <span className="table-row-note">{row.note}</span>
                      </div>
                    </td>
                    <td>{row.runDisplayId}</td>
                    <td>
                      <StatusPill label={row.status} />
                    </td>
                    <td>{row.updatedLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="runs-index-sidebar">
          <PageSection eyebrow="Locked now" title="Route handoff">
            <ul className="page-list compact-list">
              {model.coverageNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </PageSection>

          <PageSection eyebrow="Deferred" title="Still intentionally stubbed">
            <ul className="page-list compact-list">
              {model.deferredWork.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </PageSection>
        </div>
      </div>
    </div>
  );
}
