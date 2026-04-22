import { useEffect, useMemo, useRef, useState } from "react";
import { Diff, Hunk, parseDiff, type FileData, type HunkData } from "react-diff-view";

import { DocumentFrameSummary } from "../../../components/workspace/document-frame";
import {
  ReviewFileCard,
  ReviewFileStack,
  ReviewFileSummary,
  ReviewSection,
  ReviewSectionLabel
} from "../../../components/workspace/review-frame";
import {
  WorkspaceEmptyState,
  WorkspaceEmptyStateActions,
  WorkspaceEmptyStateDescription,
  WorkspaceEmptyStateTitle
} from "../../../components/workspace/workspace-empty-state";
import { useRunManagementApi } from "../../runs/run-detail-context";
import type {
  TaskArtifactViewModel,
  TaskArtifactsViewModel
} from "../use-execution-view-model";

type ReviewDiffGroupId = "add" | "copy" | "delete" | "modify" | "rename";

interface ReviewDiffFileViewModel {
  artifactId: string;
  diffType: ReviewDiffGroupId;
  fileKey: string;
  hunks: HunkData[];
  pathLabel: string;
  summaryLabel: string;
}

interface ReviewDiffGroupViewModel {
  files: ReviewDiffFileViewModel[];
  id: ReviewDiffGroupId;
  label: string;
  summary: string;
}

type ReviewDiffContentState =
  | { message: string; status: "idle" | "loading" }
  | { groups: ReviewDiffGroupViewModel[]; message: string | null; status: "ready" }
  | { message: string; status: "error" };

const reviewDiffGroupDefinitions: Record<
  ReviewDiffGroupId,
  {
    fileLabel: string;
    groupLabel: string;
    groupSummary: string;
  }
> = {
  add: {
    fileLabel: "Added",
    groupLabel: "Added files",
    groupSummary: "New files introduced by this task."
  },
  copy: {
    fileLabel: "Copied",
    groupLabel: "Copied files",
    groupSummary: "Copied files captured in the current review handoff."
  },
  delete: {
    fileLabel: "Deleted",
    groupLabel: "Deleted files",
    groupSummary: "Files removed by this task."
  },
  modify: {
    fileLabel: "Modified",
    groupLabel: "Modified files",
    groupSummary: "Files updated by this task."
  },
  rename: {
    fileLabel: "Renamed",
    groupLabel: "Renamed files",
    groupSummary: "Files moved or renamed in this task."
  }
};

const reviewDiffGroupOrder: ReviewDiffGroupId[] = ["modify", "add", "rename", "delete", "copy"];

function getReviewContentErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load changed files from the current diff artifacts.";
}

function buildReviewFilePathLabel(file: FileData) {
  if (
    file.type === "rename" &&
    file.oldPath &&
    file.newPath &&
    file.oldPath !== file.newPath
  ) {
    return `${file.oldPath} -> ${file.newPath}`;
  }

  if (file.type === "delete") {
    return file.oldPath ?? file.newPath ?? "Unknown file";
  }

  return file.newPath ?? file.oldPath ?? "Unknown file";
}

function buildReviewFileSummaryLabel(file: FileData) {
  const insertions = file.hunks.reduce(
    (count, hunk) =>
      count + hunk.changes.filter((change) => change.type === "insert").length,
    0
  );
  const deletions = file.hunks.reduce(
    (count, hunk) =>
      count + hunk.changes.filter((change) => change.type === "delete").length,
    0
  );
  const changeStats: string[] = [];

  if (insertions > 0) {
    changeStats.push(`+${insertions}`);
  }

  if (deletions > 0) {
    changeStats.push(`-${deletions}`);
  }

  const fileLabel = reviewDiffGroupDefinitions[file.type].fileLabel;

  return changeStats.length > 0 ? `${fileLabel} · ${changeStats.join(" ")}` : fileLabel;
}

function buildReviewDiffFiles(
  artifact: TaskArtifactViewModel,
  content: string
): ReviewDiffFileViewModel[] {
  return parseDiff(content, { nearbySequences: "zip" }).map((file, index) => ({
    artifactId: artifact.artifactId,
    diffType: file.type,
    fileKey: `${artifact.artifactId}:${file.newPath ?? file.oldPath ?? index}`,
    hunks: file.hunks,
    pathLabel: buildReviewFilePathLabel(file),
    summaryLabel: buildReviewFileSummaryLabel(file)
  }));
}

function buildReviewDiffGroups(files: ReviewDiffFileViewModel[]): ReviewDiffGroupViewModel[] {
  return reviewDiffGroupOrder
    .map((groupId) => {
      const groupFiles = files.filter((file) => file.diffType === groupId);

      if (groupFiles.length === 0) {
        return null;
      }

      return {
        files: groupFiles,
        id: groupId,
        label: reviewDiffGroupDefinitions[groupId].groupLabel,
        summary: reviewDiffGroupDefinitions[groupId].groupSummary
      };
    })
    .filter((group): group is ReviewDiffGroupViewModel => group !== null);
}

function useTaskReviewDiffContent(artifacts: TaskArtifactViewModel[]) {
  const api = useRunManagementApi();
  const [retryToken, setRetryToken] = useState(0);
  const requestIdRef = useRef(0);
  const diffArtifacts = useMemo(
    () => artifacts.filter((artifact) => artifact.kind === "git_diff"),
    [artifacts]
  );
  const [state, setState] = useState<ReviewDiffContentState>(() =>
    diffArtifacts.length === 0
      ? { message: "No changed files are recorded for this task yet.", status: "ready", groups: [] }
      : { message: "Loading unified diffs from the current task artifacts.", status: "idle" }
  );
  const diffArtifactSignature = diffArtifacts
    .map((artifact) => `${artifact.artifactId}:${artifact.contentUrl}`)
    .join("|");

  useEffect(() => {
    if (diffArtifacts.length === 0) {
      setState({
        groups: [],
        message: "No changed files are recorded for this task yet.",
        status: "ready"
      });
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState({
      message: "Loading unified diffs from the current task artifacts.",
      status: "loading"
    });

    void Promise.allSettled(
      diffArtifacts.map(async (artifact) => {
        const content = await api.getArtifactContent(artifact.contentUrl);

        return buildReviewDiffFiles(artifact, content);
      })
    ).then((results) => {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const loadedFiles = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : []
      );
      const failedLoads = results.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );

      if (loadedFiles.length === 0 && failedLoads.length > 0) {
        setState({
          message: getReviewContentErrorMessage(failedLoads[0].reason),
          status: "error"
        });
        return;
      }

      setState({
        groups: buildReviewDiffGroups(loadedFiles),
        message:
          failedLoads.length > 0
            ? `${failedLoads.length} diff artifact${failedLoads.length === 1 ? "" : "s"} could not be loaded and are omitted from this view.`
            : null,
        status: "ready"
      });
    });
  }, [api, diffArtifactSignature, retryToken]);

  return {
    diffArtifacts,
    retry: () => {
      setRetryToken((current) => current + 1);
    },
    state
  };
}

function ReviewDiffGroup({ group }: { group: ReviewDiffGroupViewModel }) {
  return (
    <ReviewSection className="task-review-group">
      <div className="task-review-group-header">
        <div className="task-review-group-heading">
          <ReviewSectionLabel>{group.label}</ReviewSectionLabel>
          <DocumentFrameSummary>{group.summary}</DocumentFrameSummary>
        </div>
        <p className="document-name">
          {group.files.length} file{group.files.length === 1 ? "" : "s"}
        </p>
      </div>

      <ReviewFileStack>
        {group.files.map((file, index) => (
          <ReviewFileCard key={file.fileKey} open={index === 0}>
            <ReviewFileSummary>
              <span>{file.pathLabel}</span>
              <span className="review-file-note">{file.summaryLabel}</span>
            </ReviewFileSummary>
            <div className="task-review-diff-shell">
              <Diff
                className="task-review-diff-table"
                diffType={file.diffType}
                hunks={file.hunks}
                viewType="unified"
              >
                {(hunks) =>
                  hunks.map((hunk) => <Hunk key={`${file.fileKey}:${hunk.content}`} hunk={hunk} />)
                }
              </Diff>
            </div>
          </ReviewFileCard>
        ))}
      </ReviewFileStack>
    </ReviewSection>
  );
}

function SupportingArtifactsSection({ artifacts }: { artifacts: TaskArtifactViewModel[] }) {
  if (artifacts.length === 0) {
    return null;
  }

  return (
    <ReviewSection className="task-review-group">
      <div className="task-review-group-header">
        <div className="task-review-group-heading">
          <ReviewSectionLabel>Supporting artifacts</ReviewSectionLabel>
          <DocumentFrameSummary>
            Non-diff outputs remain available as metadata in this phase.
          </DocumentFrameSummary>
        </div>
        <p className="document-name">
          {artifacts.length} artifact{artifacts.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="task-supporting-artifact-list">
        {artifacts.map((artifact) => (
          <section key={artifact.artifactId} className="task-supporting-artifact">
            <p className="task-supporting-artifact-title">{artifact.artifactId}</p>
            <p className="review-file-note">
              {artifact.kind} · {artifact.contentType} · {artifact.sizeLabel}
            </p>
          </section>
        ))}
      </div>
    </ReviewSection>
  );
}

function TaskReviewSidebarReady({ artifacts }: { artifacts: TaskArtifactViewModel[] }) {
  const { diffArtifacts, retry, state } = useTaskReviewDiffContent(artifacts);
  const supportingArtifacts = useMemo(
    () => artifacts.filter((artifact) => artifact.kind !== "git_diff"),
    [artifacts]
  );

  return (
    <div className="task-review-sidebar">
      <ReviewSection>
        <ReviewSectionLabel>Changed files</ReviewSectionLabel>
        <DocumentFrameSummary>
          Unified diffs load from the current task artifact content URL through the authenticated
          run API seam.
        </DocumentFrameSummary>
      </ReviewSection>

      {state.status === "loading" || state.status === "idle" ? (
        <DocumentFrameSummary>{state.message}</DocumentFrameSummary>
      ) : state.status === "error" ? (
        <WorkspaceEmptyState>
          <WorkspaceEmptyStateTitle as="h3">Unable to load changed files</WorkspaceEmptyStateTitle>
          <WorkspaceEmptyStateDescription>{state.message}</WorkspaceEmptyStateDescription>
          <WorkspaceEmptyStateActions>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                retry();
              }}
            >
              Retry review
            </button>
          </WorkspaceEmptyStateActions>
        </WorkspaceEmptyState>
      ) : state.groups.length === 0 ? (
        <DocumentFrameSummary>
          {diffArtifacts.length === 0
            ? "No changed files are recorded for this task yet."
            : "No changed files were parsed from the current diff artifacts."}
        </DocumentFrameSummary>
      ) : (
        <>
          {state.message ? <DocumentFrameSummary>{state.message}</DocumentFrameSummary> : null}
          {state.groups.map((group) => (
            <ReviewDiffGroup key={group.id} group={group} />
          ))}
        </>
      )}

      <SupportingArtifactsSection artifacts={supportingArtifacts} />
    </div>
  );
}

export function TaskReviewSidebar({ artifacts }: { artifacts: TaskArtifactsViewModel }) {
  if (artifacts.state === "loading") {
    return <DocumentFrameSummary>{artifacts.message}</DocumentFrameSummary>;
  }

  if (artifacts.state === "error") {
    return (
      <WorkspaceEmptyState>
        <WorkspaceEmptyStateTitle as="h3">Unable to load task review</WorkspaceEmptyStateTitle>
        <WorkspaceEmptyStateDescription>{artifacts.message}</WorkspaceEmptyStateDescription>
        <WorkspaceEmptyStateActions>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              artifacts.retry?.();
            }}
          >
            Retry
          </button>
        </WorkspaceEmptyStateActions>
      </WorkspaceEmptyState>
    );
  }

  if (artifacts.state === "empty") {
    return <DocumentFrameSummary>{artifacts.message}</DocumentFrameSummary>;
  }

  return <TaskReviewSidebarReady artifacts={artifacts.items} />;
}
