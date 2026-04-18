import type { PlanningMessageScaffold } from "../../features/runs/run-scaffold";

interface PlanningWorkspaceProps {
  phaseLabel: string;
  chatTitle: string;
  documentTitle: string;
  documentName: string;
  documentSummary: string;
  composerPlaceholder: string;
  messages: PlanningMessageScaffold[];
  currentState: string[];
  backendCoverage: string[];
  deferredWork: string[];
}

export function PlanningWorkspace({
  phaseLabel,
  chatTitle,
  documentTitle,
  documentName,
  documentSummary,
  composerPlaceholder,
  messages,
  currentState,
  backendCoverage,
  deferredWork
}: PlanningWorkspaceProps) {
  return (
    <div className="workspace-split">
      <section className="workspace-panel">
        <header className="workspace-panel-header">
          <div>
            <p className="workspace-panel-eyebrow">{phaseLabel}</p>
            <h2 className="workspace-panel-title">{chatTitle}</h2>
          </div>
          <p className="workspace-panel-summary">
            Fixed route ownership first. Real thread loading and message writes come later.
          </p>
        </header>

        <div className="message-stack">
          {messages.map((message) => (
            <article key={`${message.speaker}-${message.body}`} className="message-card">
              <p className="message-card-speaker">{message.speaker}</p>
              <p className="message-card-body">{message.body}</p>
            </article>
          ))}
        </div>

        <div className="composer-placeholder">
          <p className="composer-placeholder-label">Operator composer</p>
          <p className="composer-placeholder-copy">{composerPlaceholder}</p>
        </div>
      </section>

      <section className="workspace-panel workspace-panel-document">
        <header className="workspace-panel-header">
          <div>
            <p className="workspace-panel-eyebrow">Living document</p>
            <h2 className="workspace-panel-title">{documentTitle}</h2>
          </div>
          <p className="workspace-panel-summary">{documentName}</p>
        </header>

        <div className="document-card">
          <p className="document-card-summary">{documentSummary}</p>

          <div className="document-section">
            <p className="document-section-label">Current state</p>
            <ul className="page-list compact-list">
              {currentState.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="document-section">
            <p className="document-section-label">Backend coverage</p>
            <ul className="page-list compact-list">
              {backendCoverage.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="document-section">
            <p className="document-section-label">Deferred work</p>
            <ul className="page-list compact-list">
              {deferredWork.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
