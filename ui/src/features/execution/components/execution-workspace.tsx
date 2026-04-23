import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

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
  WorkspacePanelSummary,
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
  nodeHeight: 132,
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
  model,
  onSelectTask,
  selectedTaskId
}: {
  model: Extract<RunExecutionViewModel, { state: "ready" }>;
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
}) {
  const canvasMetrics = getExecutionCanvasMetrics(model);
  const canvasStyle: CSSProperties = {
    height: `${canvasMetrics.height}px`,
    width: `${canvasMetrics.width}px`
  };

  return (
    <div className="execution-graph-stage" aria-label="Execution workflow graph">
      <p className="document-card-summary" aria-label="Execution summary">
        {model.summary}
      </p>

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
              <button
                key={node.taskId}
                type="button"
                className={cn(
                  "execution-graph-node",
                  `is-${node.statusTone}`,
                  selectedTaskId === node.taskId && "is-selected"
                )}
                style={nodeStyle}
                aria-pressed={selectedTaskId === node.taskId}
                onClick={() => {
                  onSelectTask(node.taskId);
                }}
              >
                <span className="execution-graph-node-label">{node.taskId}</span>
                <span className="execution-graph-node-title">{node.title}</span>
                <span className="execution-graph-node-status">{node.statusLabel}</span>
                <span className="document-name execution-graph-node-footnote">{node.footnote}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="execution-board-note">
        Open a task node to move straight into its task conversation and review workspace.
      </p>
      <p className="execution-board-note">
        Columns track dependency steps, and parallel tasks remain grouped in the same step.
      </p>
    </div>
  );
}

export function ExecutionWorkspace({ model }: { model: RunExecutionViewModel }) {
  const navigate = useNavigate();

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
            {model.state === "pending" ? "Execution is materializing" : "Execution is read-only"}
          </WorkspaceEmptyStateTitle>
          <WorkspaceEmptyStateDescription>{model.message}</WorkspaceEmptyStateDescription>
          {model.state === "pending" ? (
            <WorkspaceEmptyStateActions>
              <button
                type="button"
                className="ghost-button"
                onClick={model.refresh}
              >
                {model.refreshLabel}
              </button>
            </WorkspaceEmptyStateActions>
          ) : null}
        </WorkspaceEmptyState>
      </WorkspacePanel>
    );
  }

  const nodesById = new Map(model.nodes.map((node) => [node.taskId, node]));
  const highlightedTaskId = model.defaultSelectedTaskId ?? model.nodes[0]?.taskId ?? null;
  const executionSummary = model.summaryGroups
    .filter((group) => group.count > 0)
    .map((group) => `${group.count} ${group.label.toLowerCase()}`)
    .join(" · ");
  const handleActivateTask = (_taskId: string, detailPath: string) => {
    navigate(detailPath);
  };

  return (
    <WorkspacePanel className="execution-panel">
      <WorkspacePanelHeader>
        <WorkspacePanelHeading>
          <WorkspacePanelTitle>Task workflow DAG</WorkspacePanelTitle>
          <WorkspacePanelSummary>
            The graph stays as the run-level overview. Opening a node switches into task detail for that task.
          </WorkspacePanelSummary>
        </WorkspacePanelHeading>
        {executionSummary ? (
          <WorkspacePanelActions className="execution-summary-inline" aria-label="Execution status">
            <p className="document-name">{executionSummary}</p>
          </WorkspacePanelActions>
        ) : null}
      </WorkspacePanelHeader>

      <ExecutionGraphBoard
        model={model}
        onSelectTask={(taskId) => {
          const nextTask = nodesById.get(taskId);
          if (nextTask) {
            handleActivateTask(taskId, nextTask.detailPath);
          }
        }}
        selectedTaskId={highlightedTaskId}
      />
    </WorkspacePanel>
  );
}
