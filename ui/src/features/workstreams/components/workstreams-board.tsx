import { Link } from "react-router-dom";

import { EntityTable, type EntityTableColumn } from "../../../components/workspace/entity-table";
import {
  WorkspacePage,
  WorkspacePageActions,
  WorkspacePageHeader,
  WorkspacePageHeading,
  WorkspacePageSection
} from "../../../components/workspace/workspace-page";
import type { WorkstreamRowViewModel, WorkstreamsViewModel } from "../use-workstreams-view-model";

interface WorkstreamsBoardProps {
  model: WorkstreamsViewModel;
}

export function WorkstreamsBoard({ model }: WorkstreamsBoardProps) {
  const columns: EntityTableColumn<WorkstreamRowViewModel>[] = [
    {
      cell: (row) => (
        <Link to={row.detailPath} className="table-primary-link">
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
      cell: (row) => row.runDisplayId,
      header: "Run",
      id: "run"
    },
    {
      cell: (row) => row.status,
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
      <>
        <p className="document-card-summary" aria-label="Workstreams pagination">
          {model.pagination.rangeLabel} · Page {model.pagination.currentPage} of {model.pagination.pageCount}
        </p>
        {model.pagination.pageCount > 1 ? (
          <WorkspacePageActions>
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
          </WorkspacePageActions>
        ) : null}
        {model.rows.length > 0 ? (
          <p className="page-section-copy">Click row to open that task inside Runs &gt; Execution.</p>
        ) : null}
      </>
    );

  return (
    <WorkspacePage>
      <WorkspacePageSection className="runs-table-panel">
        <WorkspacePageHeader>
          <WorkspacePageHeading>
            <h1 className="page-title runs-page-title">{model.title}</h1>
          </WorkspacePageHeading>
        </WorkspacePageHeader>

        <div className="workstreams-filter-bar" aria-label="Workstream filters">
          <span className="workstreams-filter-label">Filters:</span>

          <div className="filter-chip-row">
            {model.filters.map((filter) => (
              <button
                key={filter.filterId}
                type="button"
                aria-pressed={filter.isActive}
                className={filter.isActive ? "filter-chip is-active" : "filter-chip"}
                onClick={() => model.setActiveFilter(filter.filterId)}
              >
                {filter.label}
              </button>
            ))}
          </div>
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
          onRowClick={(event) => {
            const primaryLink = event.currentTarget.querySelector<HTMLAnchorElement>("a[href]");

            primaryLink?.click();
          }}
          rows={model.rows}
        />
      </WorkspacePageSection>
    </WorkspacePage>
  );
}
