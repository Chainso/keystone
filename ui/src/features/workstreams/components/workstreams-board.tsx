import { Link } from "react-router-dom";

import { ToggleGroup, ToggleGroupItem } from "../../../components/ui/toggle-group";
import { EntityTable, type EntityTableColumn } from "../../../components/workspace/entity-table";
import {
  WorkspacePage,
  WorkspacePageActions,
  WorkspacePageHeader,
  WorkspacePageHeading,
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
      cell: (row) => <StatusPill label={row.status} />,
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

        <WorkspacePageActions className="workstreams-pagination-actions">
          <span className="meta-chip">{model.pageSizeLabel}</span>
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
        </WorkspacePageActions>
      </div>
    );

  return (
    <WorkspacePage>
      <WorkspacePageSection className="entity-table-panel">
        <WorkspacePageHeader>
          <WorkspacePageHeading>
            <p className="page-eyebrow">Workstreams</p>
            <h1 className="page-title runs-page-title">{model.title}</h1>
            <p className="page-summary">{model.summary}</p>
          </WorkspacePageHeading>
          <WorkspacePageActions className="workstreams-header-meta" aria-label="Workstreams summary">
            <span className="meta-chip">{model.currentProjectLabel}</span>
            <span className="meta-chip">{model.recordSummaryLabel}</span>
            <span className="meta-chip">{model.pageSizeLabel}</span>
          </WorkspacePageActions>
        </WorkspacePageHeader>

        <div className="workstreams-toolbar">
          <section className="workstreams-filter-stack" aria-label="Workstream filter summary">
            <div className="workstreams-toolbar-copy">
              <p className="workstreams-filter-label">Filters:</p>
              <p className="page-section-copy">{model.activeFilterDescription}</p>
            </div>

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
          </section>

          <section className="workstreams-handoff-note" aria-label="Task detail handoff">
            <p className="workstreams-filter-label">Task detail handoff</p>
            <p className="page-section-copy">{model.routeGuidance}</p>
          </section>
        </div>

        <EntityTable
          ariaLabel="Project work across runs"
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
