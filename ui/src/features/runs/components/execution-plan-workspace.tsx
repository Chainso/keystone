import { Link } from "react-router-dom";

import {
  DocumentFrame,
  DocumentFrameSummary
} from "../../../components/workspace/document-frame";
import {
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspacePanelHeading,
  WorkspacePanelTitle
} from "../../../components/workspace/workspace-panel";
import type { ExecutionPlanWorkspaceViewModel } from "../use-run-view-model";
import { PlanningWorkspaceFrame } from "./planning-workspace";

export function ExecutionPlanWorkspace({ model }: { model: ExecutionPlanWorkspaceViewModel }) {
  return (
    <>
      <PlanningWorkspaceFrame {...model.planning} />

      <WorkspacePanel>
        <WorkspacePanelHeader>
          <WorkspacePanelHeading>
            <WorkspacePanelTitle>{model.compile.title}</WorkspacePanelTitle>
          </WorkspacePanelHeading>
        </WorkspacePanelHeader>

        <DocumentFrame>
          <DocumentFrameSummary>{model.compile.helperMessage}</DocumentFrameSummary>

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
                {model.compile.secondaryActionHref && model.compile.secondaryActionLabel ? (
                  <Link to={model.compile.secondaryActionHref} className="ghost-button">
                    {model.compile.secondaryActionLabel}
                  </Link>
                ) : null}
              </div>
            </>
          ) : model.compile.state === "compiled" ? (
            <div className="shell-state-actions">
              <Link to={model.compile.actionHref} className="ghost-button">
                {model.compile.actionLabel}
              </Link>
            </div>
          ) : model.compile.actionHref && model.compile.actionLabel ? (
            <div className="shell-state-actions">
              <Link to={model.compile.actionHref} className="ghost-button">
                {model.compile.actionLabel}
              </Link>
            </div>
          ) : model.compile.refresh && model.compile.refreshLabel ? (
            <div className="shell-state-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={model.compile.refresh}
              >
                {model.compile.refreshLabel}
              </button>
            </div>
          ) : null}
        </DocumentFrame>
      </WorkspacePanel>
    </>
  );
}
