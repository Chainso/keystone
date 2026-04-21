import type { RunPlanningPhaseViewModel } from "../use-run-view-model";

function PlanningConversationPanel({
  phaseSummary,
  phaseTitle,
  conversationLocator
}: Pick<RunPlanningPhaseViewModel, "phaseSummary" | "phaseTitle" | "conversationLocator">) {
  return (
    <section className="workspace-panel">
      <header className="workspace-panel-header">
        <div>
          <h2 className="workspace-panel-title">{phaseTitle}</h2>
        </div>
        <p className="workspace-panel-summary">{phaseSummary}</p>
      </header>

      {conversationLocator ? (
        <article className="message-card" aria-label="Conversation status">
          <p className="message-card-speaker">Conversation status</p>
          <p className="message-card-body">Conversation attached to this document.</p>
          <p className="document-card-summary">
            Live message history will resolve through the attached conversation when chat transport is added.
          </p>
        </article>
      ) : (
        <article className="message-card" aria-label="Conversation status">
          <p className="message-card-speaker">Conversation status</p>
          <p className="message-card-body">No conversation is attached to this document yet.</p>
        </article>
      )}
    </section>
  );
}

function PlanningDocumentPanel(props: RunPlanningPhaseViewModel) {
  return (
    <section className="workspace-panel workspace-panel-document">
      <header className="workspace-panel-header">
        <div>
          <h2 className="workspace-panel-title">
            {props.state === "ready" ? props.documentTitle : "Document viewer"}
          </h2>
        </div>
      </header>

      <div className="document-card">
        <p className="document-name">{props.documentPath}</p>
        <div className="document-rule" aria-hidden="true" />

        {props.state === "ready" ? (
          <div className="document-copy">
            {props.documentLines.map((line, index) => (
              <p key={`${index}:${line}`} className="document-line">
                {line}
              </p>
            ))}
          </div>
        ) : props.state === "empty" ? (
          <section className="empty-state-card">
            <h3 className="document-card-title">{props.emptyTitle}</h3>
            <p className="document-card-summary">{props.emptyMessage}</p>
          </section>
        ) : (
          <section className="empty-state-card">
            <h3 className="document-card-title">{props.errorTitle}</h3>
            <p className="document-card-summary">{props.errorMessage}</p>
            <div className="shell-state-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  props.retry();
                }}
              >
                Retry
              </button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

export function PlanningWorkspaceFrame(props: RunPlanningPhaseViewModel) {
  return (
    <div className="workspace-split">
      <PlanningConversationPanel
        phaseTitle={props.phaseTitle}
        phaseSummary={props.phaseSummary}
        conversationLocator={props.conversationLocator}
      />

      <PlanningDocumentPanel {...props} />
    </div>
  );
}
