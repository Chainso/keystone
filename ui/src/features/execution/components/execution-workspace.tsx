import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import { cn } from "../../../lib/utils";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateActions,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
import {
  WorkspacePanel,
  WorkspacePanelActions,
  WorkspacePanelHeader,
  WorkspacePanelHeading,
  WorkspacePanelTitle
} from "../../../components/workspace/workspace-panel";
import type {
  ExecutionEdgeViewModel,
  ExecutionNodeViewModel,
  RunExecutionViewModel
} from "../use-execution-view-model";

const executionGraphLayout = {
  columnGap: 56,
  headerHeight: 72,
  nodeHeight: 158,
  nodeWidth: 252,
  paddingX: 20,
  paddingY: 20,
  rowGap: 28
} as const;

function getExecutionCanvasMetrics(model: Extract<RunExecutionViewModel, { state: "ready" }>) {
  const columnCount = Math.max(model.columns.length, 1);
  const maxRows = Math.max(...model.columns.map((column) => column.taskIds.length), 1);
  const width =
    executionGraphLayout.paddingX * 2 +
    columnCount * executionGraphLayout.nodeWidth +
    Math.max(columnCount - 1, 0) * executionGraphLayout.columnGap;
  const height =
    executionGraphLayout.headerHeight +
    executionGraphLayout.paddingY * 2 +
    maxRows * executionGraphLayout.nodeHeight +
    Math.max(maxRows - 1, 0) * executionGraphLayout.rowGap;

  return {
    height,
    maxRows,
    width
  };
}

function getExecutionNodePosition(node: ExecutionNodeViewModel) {
  return getExecutionGridPosition(node.graphColumn, node.graphRow);
}

function getExecutionGridPosition(graphColumn: number, graphRow: number) {
  return {
    left:
      executionGraphLayout.paddingX +
      graphColumn * (executionGraphLayout.nodeWidth + executionGraphLayout.columnGap),
    top:
      executionGraphLayout.headerHeight +
      executionGraphLayout.paddingY +
      graphRow * (executionGraphLayout.nodeHeight + executionGraphLayout.rowGap)
  };
}

function getExecutionColumnPosition(depth: number) {
  return executionGraphLayout.paddingX + depth * (executionGraphLayout.nodeWidth + executionGraphLayout.columnGap);
}

function buildExecutionEdgePath(edge: ExecutionEdgeViewModel) {
  const fromPosition = getExecutionGridPosition(edge.fromColumn, edge.fromRow);
  const toPosition = getExecutionGridPosition(edge.toColumn, edge.toRow);
  const startX = fromPosition.left + executionGraphLayout.nodeWidth;
  const startY = fromPosition.top + executionGraphLayout.nodeHeight / 2;
  const endX = toPosition.left;
  const endY = toPosition.top + executionGraphLayout.nodeHeight / 2;
  const midX = startX + (endX - startX) / 2;

  return `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
}

function ExecutionGraphBoard({
  model
}: {
  model: Extract<RunExecutionViewModel, { state: "ready" }>;
}) {
  const canvasMetrics = getExecutionCanvasMetrics(model);
  const canvasStyle: CSSProperties = {
    height: `${canvasMetrics.height}px`,
    width: `${canvasMetrics.width}px`
  };

  return (
    <div className="execution-graph-stage" aria-label="Execution workflow graph">
      <div className="execution-graph-scroll">
        <div className="execution-graph-canvas" style={canvasStyle}>
          {model.columns.map((column) => {
            const columnStyle: CSSProperties = {
              left: `${getExecutionColumnPosition(column.depth)}px`,
              width: `${executionGraphLayout.nodeWidth}px`
            };

            return (
              <div
                key={column.depth}
                className="execution-graph-column"
                style={columnStyle}
              >
                <p className="execution-graph-column-label">{column.label}</p>
                <p className="execution-graph-column-summary">{column.summary}</p>
              </div>
            );
          })}

          <svg
            aria-hidden="true"
            className="execution-graph-edges"
            viewBox={`0 0 ${canvasMetrics.width} ${canvasMetrics.height}`}
          >
            {model.edges.map((edge) => {
              const path = buildExecutionEdgePath(edge);

              return path ? <path key={edge.edgeId} className="execution-graph-edge" d={path} /> : null;
            })}
          </svg>

          {model.nodes.map((node) => {
            const nodePosition = getExecutionNodePosition(node);
            const nodeStyle: CSSProperties = {
              height: `${executionGraphLayout.nodeHeight}px`,
              left: `${nodePosition.left}px`,
              top: `${nodePosition.top}px`,
              width: `${executionGraphLayout.nodeWidth}px`
            };

            return (
              <Link
                key={node.taskId}
                className={cn(
                  "execution-graph-node",
                  `is-${node.statusTone}`
                )}
                style={nodeStyle}
                to={node.detailPath}
              >
                <span className="execution-graph-node-label">{node.taskId}</span>
                <span className="execution-graph-node-title">{node.title}</span>
                <span className="execution-graph-node-status">{node.statusLabel}</span>
                <span className="execution-graph-node-meta">{node.blockerLabel}</span>
                <span className="execution-graph-node-meta">{node.ownerLabel}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ExecutionWorkspace({ model }: { model: RunExecutionViewModel }) {
  if (model.state === "empty" || model.state === "pending") {
    return (
      <WorkspacePanel className="execution-panel">
        <WorkspacePanelHeader>
          <WorkspacePanelHeading>
            <WorkspacePanelTitle>Task workflow DAG</WorkspacePanelTitle>
          </WorkspacePanelHeading>
        </WorkspacePanelHeader>

        <WorkspaceEmptyState>
          <WorkspaceEmptyStateTitle as="h3">
            {model.state === "pending" ? "Execution is materializing" : "Execution graph not ready"}
          </WorkspaceEmptyStateTitle>
          <WorkspaceEmptyStateDescription>{model.message}</WorkspaceEmptyStateDescription>
          <WorkspaceEmptyStateActions>
            {model.state === "pending" ? (
              <button
                type="button"
                className="ghost-button"
                onClick={model.refresh}
              >
                {model.refreshLabel}
              </button>
            ) : (
              <Link to={model.actionHref} className="ghost-button">
                {model.actionLabel}
              </Link>
            )}
          </WorkspaceEmptyStateActions>
        </WorkspaceEmptyState>
      </WorkspacePanel>
    );
  }

  return (
    <WorkspacePanel className="execution-panel">
      <WorkspacePanelHeader>
        <WorkspacePanelHeading>
          <WorkspacePanelTitle>Task workflow DAG</WorkspacePanelTitle>
        </WorkspacePanelHeading>
        <WorkspacePanelActions className="execution-summary-inline" aria-label="Execution summary">
          <div className="execution-status-strip" aria-label="Execution status counts">
            {model.statusMetrics.map((metric) => (
              <span key={metric.label} className={`status-pill status-pill-${metric.tone}`}>
                {metric.label}: {metric.value}
              </span>
            ))}
          </div>
          <p className="document-name">{model.summary}</p>
        </WorkspacePanelActions>
      </WorkspacePanelHeader>

      <ExecutionGraphBoard model={model} />
    </WorkspacePanel>
  );
}
