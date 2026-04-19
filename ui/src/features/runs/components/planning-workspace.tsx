import type { PlanningMessageScaffold } from "../run-scaffold";

interface PlanningWorkspaceProps {
  chatTitle: string;
  documentTitle: string;
  documentName: string;
  documentLines: string[];
  composerText: string;
  messages: PlanningMessageScaffold[];
}

function PlanningMessageList({ messages }: { messages: PlanningMessageScaffold[] }) {
  return (
    <div className="message-stack">
      {messages.map((message) => (
        <article key={`${message.speaker}-${message.body}`} className="message-card">
          <p className="message-card-speaker">{message.speaker}</p>
          <p className="message-card-body">{message.body}</p>
        </article>
      ))}
    </div>
  );
}

function PlanningDocumentPanel({
  documentTitle,
  documentName,
  documentLines
}: Pick<PlanningWorkspaceProps, "documentTitle" | "documentName" | "documentLines">) {
  return (
    <section className="workspace-panel workspace-panel-document">
      <header className="workspace-panel-header">
        <div>
          <h2 className="workspace-panel-title">{documentTitle}</h2>
        </div>
      </header>

      <div className="document-card">
        <p className="document-name">{documentName}</p>
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

export function PlanningWorkspace({
  chatTitle,
  documentTitle,
  documentName,
  documentLines,
  composerText,
  messages
}: PlanningWorkspaceProps) {
  return (
    <div className="workspace-split">
      <section className="workspace-panel">
        <header className="workspace-panel-header">
          <div>
            <h2 className="workspace-panel-title">{chatTitle}</h2>
          </div>
        </header>

        <PlanningMessageList messages={messages} />

        <textarea
          aria-label="Message composer"
          className="composer-field"
          readOnly
          value={composerText}
        />
      </section>

      <PlanningDocumentPanel
        documentTitle={documentTitle}
        documentName={documentName}
        documentLines={documentLines}
      />
    </div>
  );
}
