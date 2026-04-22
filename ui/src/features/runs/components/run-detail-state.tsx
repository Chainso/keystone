import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateActions,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
import { WorkspacePage } from "../../../components/workspace/workspace-page";
import type { RunDetailStateViewModel } from "../use-run-view-model";

export function RunDetailState({ model }: { model: RunDetailStateViewModel }) {
  return (
    <WorkspacePage>
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
    </WorkspacePage>
  );
}
