import type { MouseEvent, ReactNode } from "react";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../ui/table";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateActions,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "./workspace-empty-state";

interface EntityTableColumnMeta {
  cellClassName?: string;
  headerClassName?: string;
}

export interface EntityTableColumn<RowData> {
  cell: (row: RowData) => ReactNode;
  cellClassName?: string | undefined;
  header: ReactNode;
  headerClassName?: string | undefined;
  id: string;
}

interface EntityTableEmptyState {
  action?: ReactNode | undefined;
  description: string;
  title: string;
}

interface EntityTableProps<RowData> {
  ariaLabel: string;
  className?: string | undefined;
  columns: EntityTableColumn<RowData>[];
  containerClassName?: string | undefined;
  emptyState?: EntityTableEmptyState | undefined;
  footer?: ReactNode | undefined;
  getRowId: (row: RowData) => string;
  onRowActivate?: ((row: RowData) => void) | undefined;
  rows: RowData[];
  tableClassName?: string | undefined;
}

function shouldIgnoreRowActivation(event: MouseEvent<HTMLTableRowElement>) {
  const target = event.target;

  return (
    event.button !== 0 ||
    event.defaultPrevented ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    (target instanceof Element && target.closest("a, button, input, textarea, select, summary"))
  );
}

function buildColumnDefs<RowData>(
  columns: EntityTableColumn<RowData>[]
): ColumnDef<RowData>[] {
  return columns.map((column) => ({
    cell: ({ row }) => column.cell(row.original),
    header: () => column.header,
    id: column.id,
    meta: {
      cellClassName: column.cellClassName,
      headerClassName: column.headerClassName
    } satisfies EntityTableColumnMeta
  }));
}

export function EntityTable<RowData>({
  ariaLabel,
  className,
  columns,
  containerClassName,
  emptyState,
  footer,
  getRowId,
  onRowActivate,
  rows,
  tableClassName
}: EntityTableProps<RowData>) {
  const table = useReactTable({
    columns: buildColumnDefs(columns),
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getRowId
  });

  if (rows.length === 0 && emptyState) {
    return (
      <div className={cn("entity-table-shell", className)}>
        <WorkspaceEmptyState>
          <WorkspaceEmptyStateTitle>{emptyState.title}</WorkspaceEmptyStateTitle>
          <WorkspaceEmptyStateDescription>{emptyState.description}</WorkspaceEmptyStateDescription>
          {emptyState.action ? (
            <WorkspaceEmptyStateActions>{emptyState.action}</WorkspaceEmptyStateActions>
          ) : null}
        </WorkspaceEmptyState>
        {footer ? <div className="entity-table-footer">{footer}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn("entity-table-shell", className)}>
      <Table
        aria-label={ariaLabel}
        className={cn("entity-table", tableClassName)}
        containerClassName={cn("table-scroll", containerClassName)}
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as EntityTableColumnMeta | undefined;

                return (
                  <TableHead key={header.id} className={meta?.headerClassName}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={onRowActivate ? "table-clickable-row" : undefined}
              onClick={
                onRowActivate
                  ? (event) => {
                      if (shouldIgnoreRowActivation(event)) {
                        return;
                      }

                      onRowActivate(row.original);
                    }
                  : undefined
              }
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as EntityTableColumnMeta | undefined;

                return (
                  <TableCell key={cell.id} className={meta?.cellClassName}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {footer ? <div className="entity-table-footer">{footer}</div> : null}
    </div>
  );
}
