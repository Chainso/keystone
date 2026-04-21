import { FormTextAreaField, FormTextField } from "../../../shared/forms/form-field";
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
          <h2 className="workspace-panel-title">{props.panelTitle}</h2>
        </div>
      </header>

      <div className="document-card">
        <p className="document-name">{props.documentPath}</p>
        <div className="document-rule" aria-hidden="true" />

        {props.state === "ready" ? (
          <>
            <div className="document-copy">
              {props.documentLines.map((line, index) => (
                <p key={`${index}:${line}`} className="document-line">
                  {line}
                </p>
              ))}
            </div>
            <div className="shell-state-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  props.editDocument();
                }}
              >
                Edit document
              </button>
            </div>
          </>
        ) : props.state === "editing" ? (
          <>
            <p className="document-card-summary">{props.helperMessage}</p>
            {props.submitErrorMessage ? (
              <p className="form-field-error">{props.submitErrorMessage}</p>
            ) : null}
            <FormTextField
              label={props.titleField.label}
              value={props.titleField.value}
              onChange={(event) => props.titleField.onChange(event.currentTarget.value)}
              disabled={props.isSubmitting}
            />
            <FormTextAreaField
              label={props.bodyField.label}
              value={props.bodyField.value}
              onChange={(event) => props.bodyField.onChange(event.currentTarget.value)}
              disabled={props.isSubmitting}
            />
            <div className="shell-state-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  props.discardChanges();
                }}
                disabled={props.isSubmitting}
              >
                Discard changes
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  props.saveChanges();
                }}
                disabled={!props.canSave}
              >
                {props.saveLabel}
              </button>
            </div>
          </>
        ) : props.state === "empty" ? (
          <section className="empty-state-card">
            <h3 className="document-card-title">{props.emptyTitle}</h3>
            <p className="document-card-summary">{props.emptyMessage}</p>
            {props.actionErrorMessage ? (
              <p className="form-field-error">{props.actionErrorMessage}</p>
            ) : null}
            <div className="shell-state-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  props.startEditing();
                }}
                disabled={props.isCreating}
              >
                {props.actionLabel}
              </button>
            </div>
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
