import type { ConversationLocator } from "../../resource-model/types";

export interface PlanningWorkspaceFrameProps {
  phaseTitle: string;
  phaseSummary: string;
  conversationLocator: ConversationLocator | null;
  documentTitle: string;
  documentPath: string;
  documentLines: string[];
}

function PlanningConversationPanel({
  phaseTitle,
  phaseSummary,
  conversationLocator
}: Pick<PlanningWorkspaceFrameProps, "phaseTitle" | "phaseSummary" | "conversationLocator">) {
  return (
    <section className="workspace-panel">
      <header className="workspace-panel-header">
        <div>
          <h2 className="workspace-panel-title">{phaseTitle}</h2>
        </div>
        <p className="workspace-panel-summary">{phaseSummary}</p>
      </header>

      {conversationLocator ? (
        <article className="message-card" aria-label="Conversation locator">
          <p className="message-card-speaker">Agent class</p>
          <p className="message-card-body">{conversationLocator.agentClass}</p>
          <p className="message-card-speaker">Agent name</p>
          <p className="message-card-body">{conversationLocator.agentName}</p>
        </article>
      ) : (
        <article className="message-card" aria-label="Conversation locator unavailable">
          <p className="message-card-speaker">Conversation locator</p>
          <p className="message-card-body">
            No planner agent is attached to this document yet.
          </p>
        </article>
      )}
    </section>
  );
}

function PlanningDocumentPanel({
  documentTitle,
  documentPath,
  documentLines
}: Pick<PlanningWorkspaceFrameProps, "documentTitle" | "documentPath" | "documentLines">) {
  return (
    <section className="workspace-panel workspace-panel-document">
      <header className="workspace-panel-header">
        <div>
          <h2 className="workspace-panel-title">{documentTitle}</h2>
        </div>
      </header>

      <div className="document-card">
        <p className="document-name">{documentPath}</p>
        <div className="document-rule" aria-hidden="true" />
        <div className="document-copy">
          {documentLines.map((line) => (
            <p key={line} className="document-line">
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PlanningWorkspaceFrame({
  phaseTitle,
  phaseSummary,
  conversationLocator,
  documentTitle,
  documentPath,
  documentLines,
}: PlanningWorkspaceFrameProps) {
  return (
    <div className="workspace-split">
      <PlanningConversationPanel
        phaseTitle={phaseTitle}
        phaseSummary={phaseSummary}
        conversationLocator={conversationLocator}
      />

      <PlanningDocumentPanel
        documentTitle={documentTitle}
        documentPath={documentPath}
        documentLines={documentLines}
      />
    </div>
  );
}
