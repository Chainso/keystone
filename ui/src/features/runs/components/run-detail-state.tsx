import type { RunDetailStateViewModel } from "../use-run-view-model";

export function RunDetailState({ model }: { model: RunDetailStateViewModel }) {
  return (
    <div className="page-stage">
      <section className="empty-state-card">
        <h1 className="document-card-title">{model.heading}</h1>
        <p className="document-card-summary">{model.message}</p>
        {model.retry ? (
          <div className="shell-state-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                model.retry?.();
              }}
            >
              Retry
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
