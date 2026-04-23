import { Link } from "react-router-dom";

import {
  DocumentFrameSummary
} from "../../../components/workspace/document-frame";
import type { ExecutionPlanWorkspaceViewModel } from "../use-run-view-model";
import { PlanningWorkspaceFrame } from "./planning-workspace";

function ExecutionPlanCompileSection({
  model
}: {
  model: ExecutionPlanWorkspaceViewModel["compile"];
}) {
  return (
    <section className="planning-document-followup">
      <div className="planning-document-followup-copy">
        <p className="document-name">{model.title}</p>
        <DocumentFrameSummary>{model.helperMessage}</DocumentFrameSummary>
      </div>

      {model.state === "ready" ? (
        <>
          {model.submitErrorMessage ? (
            <p className="form-field-error">{model.submitErrorMessage}</p>
          ) : null}
          <div className="shell-state-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={model.compileRun}
              disabled={model.isSubmitting}
            >
              {model.actionLabel}
            </button>
            {model.secondaryActionHref && model.secondaryActionLabel ? (
              <Link to={model.secondaryActionHref} className="ghost-button">
                {model.secondaryActionLabel}
              </Link>
            ) : null}
          </div>
        </>
      ) : model.state === "compiled" ? (
        <div className="shell-state-actions">
          <Link to={model.actionHref} className="ghost-button">
            {model.actionLabel}
          </Link>
        </div>
      ) : model.actionHref && model.actionLabel ? (
        <div className="shell-state-actions">
          <Link to={model.actionHref} className="ghost-button">
            {model.actionLabel}
          </Link>
        </div>
      ) : model.refresh && model.refreshLabel ? (
        <div className="shell-state-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={model.refresh}
          >
            {model.refreshLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function ExecutionPlanWorkspace({ model }: { model: ExecutionPlanWorkspaceViewModel }) {
  return (
    <PlanningWorkspaceFrame
      {...model.planning}
      documentAccessory={<ExecutionPlanCompileSection model={model.compile} />}
    />
  );
}
