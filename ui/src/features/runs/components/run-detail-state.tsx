import { Link } from "react-router-dom";

import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateActions,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
import {
  WorkspacePage,
  WorkspacePageSection
} from "../../../components/workspace/workspace-page";
import type { RunDetailStateViewModel } from "../use-run-view-model";

export function RunDetailState({ model }: { model: RunDetailStateViewModel }) {
  return (
    <WorkspacePage>
      <WorkspacePageSection className="run-detail-state-panel">
        <Link to="/runs" className="back-link">
          Back to runs
        </Link>
        <p className="page-eyebrow">Run workspace</p>

        <WorkspaceEmptyState>
          <WorkspaceEmptyStateTitle>{model.heading}</WorkspaceEmptyStateTitle>
          <WorkspaceEmptyStateDescription>{model.message}</WorkspaceEmptyStateDescription>
          {model.retry ? (
            <WorkspaceEmptyStateActions>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  model.retry?.();
                }}
              >
                Retry
              </button>
            </WorkspaceEmptyStateActions>
          ) : null}
        </WorkspaceEmptyState>
      </WorkspacePageSection>
    </WorkspacePage>
  );
}
