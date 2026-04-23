import { Link } from "react-router-dom";

import { ToggleGroup, ToggleGroupItem } from "../../../components/ui/toggle-group";
import { EntityTable, type EntityTableColumn } from "../../../components/workspace/entity-table";
import {
  WorkspacePage,
  WorkspacePageSection
} from "../../../components/workspace/workspace-page";
import { StatusPill } from "../../../shared/layout/status-pill";
import type { WorkstreamRowViewModel, WorkstreamsViewModel } from "../use-workstreams-view-model";

interface WorkstreamsBoardProps {
  model: WorkstreamsViewModel;
  onRowActivate?: ((row: WorkstreamRowViewModel) => void) | undefined;
}

export function WorkstreamsBoard({ model, onRowActivate }: WorkstreamsBoardProps) {
  const columns: EntityTableColumn<WorkstreamRowViewModel>[] = [
    {
      cell: (row) => (
        <Link to={row.detailPath} className="table-primary-link workstreams-task-link">
          {row.taskDisplayId}
        </Link>
      ),
      header: "Task ID",
      id: "task-id"
    },
    {
      cell: (row) => row.title,
      header: "Title",
      id: "title"
    },
    {
      cell: (row) => <span className="workstreams-run-cell">{row.runDisplayId}</span>,
      header: "Run",
      id: "run"
    },
    {
      cell: (row) => <StatusPill label={row.status} tone={row.statusTone} />,
      header: "Status",
      id: "status"
    },
    {
      cell: (row) => row.updatedLabel,
      header: "Updated",
      id: "updated"
    }
  ];
  const paginationFooter =
    model.contentState?.kind === "loading" || model.contentState?.kind === "error" ? null : (
      <div className="workstreams-pagination-bar">
        <div className="workstreams-pagination-copy">
          <p className="document-card-summary" aria-label="Workstreams pagination">
            {model.pagination.rangeLabel} · Page {model.pagination.currentPage} of {model.pagination.pageCount}
          </p>
          {model.rows.length > 0 ? (
            <p className="page-section-copy">{model.routeGuidance}</p>
          ) : null}
        </div>

        <div className="workstreams-pagination-actions" aria-label="Workstreams pagination actions">
          {model.pagination.pageCount > 1 ? (
            <>
              <button
                type="button"
                className="ghost-button"
                disabled={!model.pagination.hasPreviousPage}
                onClick={model.goToPreviousPage}
              >
                Previous page
              </button>
              <button
                type="button"
                className="ghost-button"
                disabled={!model.pagination.hasNextPage}
                onClick={model.goToNextPage}
              >
                Next page
              </button>
            </>
          ) : null}
        </div>
      </div>
    );

  return (
    <WorkspacePage>
      <WorkspacePageSection className="entity-table-panel">
        <div className="workspace-surface-header">
          <div className="workspace-surface-heading">
            <h1 className="page-title runs-page-title">{model.title}</h1>
            <p className="workspace-surface-note">{model.summary}</p>
          </div>
          <div
            className="workspace-surface-actions workstreams-header-meta"
            aria-label="Workstreams summary"
            role="group"
          >
            <span className="meta-chip">{model.recordSummaryLabel}</span>
            <span className="meta-chip">{model.pageSizeLabel}</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              className="workstreams-filter-toggle"
              aria-label="Workstream filters"
              value={model.filters.find((filter) => filter.isActive)?.filterId}
              onValueChange={(value) => {
                const nextFilter = model.filters.find((filter) => filter.filterId === value);

                if (nextFilter) {
                  model.setActiveFilter(nextFilter.filterId);
                }
              }}
            >
              {model.filters.map((filter) => (
                <ToggleGroupItem key={filter.filterId} value={filter.filterId}>
                  {filter.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        <EntityTable
          ariaLabel="Workstreams"
          columns={columns}
          emptyState={
            model.contentState
              ? {
                  action: model.contentState.actionLabel ? (
                    <button type="button" className="ghost-button" onClick={model.retry}>
                      {model.contentState.actionLabel}
                    </button>
                  ) : undefined,
                  description: model.contentState.message,
                  title: model.contentState.heading
                }
              : undefined
          }
          footer={paginationFooter}
          getRowId={(row) => row.rowId}
          onRowActivate={onRowActivate}
          rows={model.rows}
        />
      </WorkspacePageSection>
    </WorkspacePage>
  );
}
