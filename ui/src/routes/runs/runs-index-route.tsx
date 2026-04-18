import { Link } from "react-router-dom";

import { useRunsIndexViewModel } from "../../features/runs/use-runs-index-view-model";
import { PageSection } from "../../shared/layout/page-section";
import { StatusPill } from "../../shared/layout/status-pill";

export function RunsIndexRoute() {
  const model = useRunsIndexViewModel();

  return (
    <div className="page-stage">
      <header className="page-hero">
        <div>
          <span className="page-badge">Phase 2 scaffold</span>
          <p className="page-eyebrow">Runs destination</p>
          <h1 className="page-title">{model.title}</h1>
          <p className="page-summary">{model.summary}</p>
        </div>
        <aside className="hero-aside">
          <p className="hero-aside-title">Placeholder honesty</p>
          <p className="hero-aside-copy">
            The index now matches the workspace spec structurally, but it is still a fixed view
            model until real project-scoped run loading lands.
          </p>
        </aside>
      </header>

      <div className="runs-index-grid">
        <section className="page-section runs-table-panel">
          <div className="runs-table-header">
            <div>
              <p className="page-section-eyebrow">Run index</p>
              <h2 className="page-section-title">Current project runs</h2>
            </div>
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
                  <tr key={run.runId}>
                    <td>
                      <Link to={run.detailPath} className="table-primary-link">
                        {run.displayId}
                      </Link>
                    </td>
                    <td>{run.summary}</td>
                    <td>{run.currentPhaseLabel}</td>
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

        <div className="runs-index-sidebar">
          <PageSection eyebrow="Locked now" title="Index guarantees">
            <ul className="page-list compact-list">
              {model.contractNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </PageSection>

          <PageSection eyebrow="Deferred" title="Still out of scope">
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
