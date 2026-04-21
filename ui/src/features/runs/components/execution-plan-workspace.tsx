import { Link } from "react-router-dom";

import type { ExecutionPlanWorkspaceViewModel } from "../use-run-view-model";
import { PlanningWorkspaceFrame } from "./planning-workspace";

export function ExecutionPlanWorkspace({ model }: { model: ExecutionPlanWorkspaceViewModel }) {
  return (
    <>
      <PlanningWorkspaceFrame {...model.planning} />

      <section className="workspace-panel">
        <header className="workspace-panel-header">
          <div>
            <h2 className="workspace-panel-title">{model.compile.title}</h2>
          </div>
        </header>

        <div className="document-card">
          <p className="document-card-summary">{model.compile.helperMessage}</p>

          {model.compile.state === "ready" ? (
            <>
              {model.compile.submitErrorMessage ? (
                <p className="form-field-error">{model.compile.submitErrorMessage}</p>
              ) : null}
              <div className="shell-state-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={model.compile.compileRun}
                  disabled={model.compile.isSubmitting}
                >
                  {model.compile.actionLabel}
                </button>
              </div>
            </>
          ) : model.compile.state === "compiled" ? (
            <div className="shell-state-actions">
              <Link to={model.compile.actionHref} className="ghost-button">
                {model.compile.actionLabel}
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
