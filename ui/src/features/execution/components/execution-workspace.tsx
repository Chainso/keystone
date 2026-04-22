import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";

import { cn } from "../../../lib/utils";
import { DocumentFrameSummary } from "../../../components/workspace/document-frame";
import {
  ReviewSection,
  ReviewSectionLabel
} from "../../../components/workspace/review-frame";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateActions,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
import {
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspacePanelHeading,
  WorkspacePanelSummary,
  WorkspacePanelTitle
} from "../../../components/workspace/workspace-panel";
import { StatusPill } from "../../../shared/layout/status-pill";
import type {
  ExecutionEdgeViewModel,
  ExecutionNodeViewModel,
  ExecutionSummaryGroupViewModel,
  RunExecutionViewModel,
  TaskDependencyViewModel
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

function ExecutionTaskPicker({
  items,
  label,
  onSelectTask,
  selectedTaskId
}: {
  items: TaskDependencyViewModel[];
  label: string;
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
}) {
  return (
    <ReviewSection aria-label={label}>
      <ReviewSectionLabel>{label}</ReviewSectionLabel>
      {items.length === 0 ? (
        <DocumentFrameSummary>None.</DocumentFrameSummary>
      ) : (
        <div className="execution-task-reference-list">
          {items.map((task) => (
            <button
              key={task.taskId}
              type="button"
              className={cn(
                "execution-task-reference",
                selectedTaskId === task.taskId && "is-selected"
              )}
              onClick={() => {
                onSelectTask(task.taskId);
              }}
            >
              <span className="execution-task-reference-title">{task.title}</span>
              <span className="document-name">
                {task.taskId} · {task.statusLabel}
              </span>
            </button>
          ))}
        </div>
      )}
    </ReviewSection>
  );
}

function ExecutionSummaryGroupCard({
  group,
  onSelectTask,
  selectedTaskId
}: {
  group: ExecutionSummaryGroupViewModel;
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
}) {
  return (
    <ReviewSection className={cn("execution-summary-group", `is-${group.tone}`)}>
      <div className="execution-summary-group-header">
        <div className="execution-summary-group-heading">
          <ReviewSectionLabel>{group.label}</ReviewSectionLabel>
          <DocumentFrameSummary>{group.description}</DocumentFrameSummary>
        </div>
        <StatusPill
          label={`${group.count} task${group.count === 1 ? "" : "s"}`}
          tone={group.tone}
        />
      </div>

      {group.tasks.length > 0 ? (
        <div className="execution-summary-task-list">
          {group.tasks.map((task) => (
            <button
              key={task.taskId}
              type="button"
              className={cn(
                "execution-summary-task",
                selectedTaskId === task.taskId && "is-selected"
              )}
              onClick={() => {
                onSelectTask(task.taskId);
              }}
            >
              <span className="execution-summary-task-title">{task.title}</span>
              <span className="document-name">
                {task.taskId} · {task.statusLabel}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </ReviewSection>
  );
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
        Select a task node to inspect its current handoff, then open task detail when the live task record is ready.
      </p>
      <p className="execution-board-note">
        Columns track dependency steps, and parallel tasks remain grouped in the same step.
      </p>
    </div>
  );
}

export function ExecutionWorkspace({ model }: { model: RunExecutionViewModel }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
  const resolvedSelectedTaskId =
    (selectedTaskId && nodesById.has(selectedTaskId) ? selectedTaskId : null) ??
    model.defaultSelectedTaskId ??
    model.nodes[0]?.taskId ??
    null;
  const selectedTask =
    (resolvedSelectedTaskId ? nodesById.get(resolvedSelectedTaskId) : null) ?? null;

  return (
    <div className="execution-grid">
      <WorkspacePanel className="execution-panel">
        <WorkspacePanelHeader>
          <WorkspacePanelHeading>
            <WorkspacePanelTitle>Task workflow DAG</WorkspacePanelTitle>
          </WorkspacePanelHeading>
          <WorkspacePanelSummary>
            Select a task to inspect its current handoff before moving into task detail.
          </WorkspacePanelSummary>
        </WorkspacePanelHeader>

        <ExecutionGraphBoard
          model={model}
          onSelectTask={setSelectedTaskId}
          selectedTaskId={resolvedSelectedTaskId}
        />
      </WorkspacePanel>

      <div className="execution-sidebar">
        <WorkspacePanel>
          <WorkspacePanelHeader>
            <WorkspacePanelHeading>
              <WorkspacePanelTitle>Workflow status</WorkspacePanelTitle>
            </WorkspacePanelHeading>
          </WorkspacePanelHeader>

          <div className="execution-summary-grid">
            {model.summaryGroups.map((group) => (
              <ExecutionSummaryGroupCard
                key={group.id}
                group={group}
                onSelectTask={setSelectedTaskId}
                selectedTaskId={resolvedSelectedTaskId}
              />
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel className="execution-selected-panel">
          <WorkspacePanelHeader>
            <WorkspacePanelHeading>
              <WorkspacePanelTitle>Selected task</WorkspacePanelTitle>
            </WorkspacePanelHeading>
          </WorkspacePanelHeader>

          {selectedTask ? (
            <>
              <section className="execution-selection-card">
                <div className="execution-selection-header">
                  <div className="execution-selection-heading">
                    <p className="message-card-speaker">{selectedTask.logicalTaskId}</p>
                    <p className="execution-selection-title">{selectedTask.title}</p>
                  </div>
                  <StatusPill
                    label={selectedTask.statusLabel}
                    tone={selectedTask.statusTone}
                  />
                </div>

                <DocumentFrameSummary>{selectedTask.description}</DocumentFrameSummary>

                <div className="execution-selection-metrics">
                  <p className="execution-selection-metric">
                    Depends on {selectedTask.dependencyCount} task{selectedTask.dependencyCount === 1 ? "" : "s"}
                  </p>
                  <p className="execution-selection-metric">
                    Unblocks {selectedTask.downstreamTasks.length} task{selectedTask.downstreamTasks.length === 1 ? "" : "s"}
                  </p>
                  <p className="execution-selection-metric">{selectedTask.activityLabel}</p>
                  <p className="execution-selection-metric">
                    {selectedTask.taskRecordReady
                      ? selectedTask.conversationAttached
                        ? "Conversation locator attached"
                        : "Conversation locator not attached"
                      : "Task record is still materializing"}
                  </p>
                </div>

                <DocumentFrameSummary>{selectedTask.handoffSummary}</DocumentFrameSummary>

                <div className="shell-state-actions">
                  {selectedTask.detailPath ? (
                    <Link to={selectedTask.detailPath} className="ghost-button">
                      Open task detail
                    </Link>
                  ) : (
                    <button type="button" className="ghost-button" disabled>
                      Task detail is loading
                    </button>
                  )}
                </div>
              </section>

              <ExecutionTaskPicker
                items={selectedTask.dependsOn}
                label="Depends on"
                onSelectTask={setSelectedTaskId}
                selectedTaskId={resolvedSelectedTaskId}
              />
              <ExecutionTaskPicker
                items={selectedTask.downstreamTasks}
                label="Unlocks"
                onSelectTask={setSelectedTaskId}
                selectedTaskId={resolvedSelectedTaskId}
              />
            </>
          ) : (
            <WorkspaceEmptyState>
              <WorkspaceEmptyStateTitle as="h3">No task selected</WorkspaceEmptyStateTitle>
              <WorkspaceEmptyStateDescription>
                Select a node in the workflow graph to inspect its current execution handoff.
              </WorkspaceEmptyStateDescription>
            </WorkspaceEmptyState>
          )}
        </WorkspacePanel>
      </div>
    </div>
  );
}
