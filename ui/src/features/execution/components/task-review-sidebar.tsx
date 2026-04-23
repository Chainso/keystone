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
import { partitionTaskReviewArtifacts } from "../task-review-artifacts";

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
  | { artifactSignature: string; message: string; status: "idle" | "loading" }
  | {
      artifactSignature: string;
      groups: ReviewDiffGroupViewModel[];
      message: string | null;
      parsedArtifactIds: string[];
      status: "ready";
    }
  | { artifactSignature: string; message: string; status: "error" };

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

  return "Unable to load changed files from the current reviewable text artifacts.";
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
  return parseDiff(content, { nearbySequences: "zip" })
    .filter((file) => file.hunks.length > 0 || Boolean(file.oldPath) || Boolean(file.newPath))
    .map((file, index) => ({
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

function buildEmptyReviewDiffState(artifactSignature: string): ReviewDiffContentState {
  return {
    artifactSignature,
    groups: [],
    message: null,
    parsedArtifactIds: [],
    status: "ready"
  };
}

function buildLoadingReviewDiffState(artifactSignature: string): ReviewDiffContentState {
  return {
    artifactSignature,
    message: "Loading changed files from the current task artifacts.",
    status: "loading"
  };
}

function useTaskReviewDiffContent(artifacts: TaskArtifactViewModel[]) {
  const api = useRunManagementApi();
  const [retryToken, setRetryToken] = useState(0);
  const requestIdRef = useRef(0);
  const reviewCandidates = useMemo(
    () => partitionTaskReviewArtifacts(artifacts).reviewCandidates,
    [artifacts]
  );
  const reviewCandidateSignature = reviewCandidates
    .map(
      (artifact) =>
        `${artifact.artifactId}:${artifact.kind}:${artifact.contentType}:${artifact.contentUrl}`
    )
    .join("|");
  const fallbackState =
    reviewCandidates.length === 0
      ? buildEmptyReviewDiffState(reviewCandidateSignature)
      : buildLoadingReviewDiffState(reviewCandidateSignature);
  const [state, setState] = useState<ReviewDiffContentState>(() =>
    fallbackState
  );
  const visibleState =
    state.artifactSignature === reviewCandidateSignature ? state : fallbackState;

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (reviewCandidates.length === 0) {
      setState(buildEmptyReviewDiffState(reviewCandidateSignature));
      return;
    }

    setState(buildLoadingReviewDiffState(reviewCandidateSignature));

    void Promise.allSettled(
      reviewCandidates.map(async (artifact) => {
        const content = await api.getArtifactContent(artifact.contentUrl);

        return {
          artifactId: artifact.artifactId,
          files: buildReviewDiffFiles(artifact, content)
        };
      })
    ).then((results) => {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const successfulLoads = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : []
      );
      const failedLoads = results.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );

      if (successfulLoads.length === 0 && failedLoads.length > 0) {
        setState({
          artifactSignature: reviewCandidateSignature,
          message: getReviewContentErrorMessage(failedLoads[0].reason),
          status: "error"
        });
        return;
      }

      const loadedFiles = successfulLoads.flatMap((result) => result.files);
      const parsedArtifactIds = successfulLoads
        .filter((result) => result.files.length > 0)
        .map((result) => result.artifactId);

      setState({
        artifactSignature: reviewCandidateSignature,
        groups: buildReviewDiffGroups(loadedFiles),
        message:
          failedLoads.length > 0
            ? `${failedLoads.length} reviewable text artifact${failedLoads.length === 1 ? "" : "s"} could not be loaded and ${failedLoads.length === 1 ? "is" : "are"} omitted from this view.`
            : null,
        parsedArtifactIds,
        status: "ready"
      });
    });

    return () => {
      if (requestIdRef.current === requestId) {
        requestIdRef.current += 1;
      }
    };
  }, [api, reviewCandidateSignature, reviewCandidates, retryToken]);

  return {
    reviewCandidates,
    retry: () => {
      setRetryToken((current) => current + 1);
    },
    state: visibleState
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
  const { retry, reviewCandidates, state } = useTaskReviewDiffContent(artifacts);
  const { supportingArtifacts: metadataOnlyArtifacts } = useMemo(
    () => partitionTaskReviewArtifacts(artifacts),
    [artifacts]
  );
  const supportingArtifacts = useMemo(() => {
    if (state.status !== "ready") {
      return metadataOnlyArtifacts;
    }

    const parsedArtifactIds = new Set(state.parsedArtifactIds);

    return artifacts.filter((artifact) => !parsedArtifactIds.has(artifact.artifactId));
  }, [artifacts, metadataOnlyArtifacts, state]);

  return (
    <div className="task-review-sidebar">
      <ReviewSection>
        <ReviewSectionLabel>Changed files</ReviewSectionLabel>
        <DocumentFrameSummary>
          Changed files are inferred from current task text artifacts whose content parses as
          unified diff through the authenticated run API seam.
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
      ) : (
        <>
          {state.message ? <DocumentFrameSummary>{state.message}</DocumentFrameSummary> : null}
          {state.groups.length === 0 ? (
            <DocumentFrameSummary>
              {reviewCandidates.length === 0
                ? "No changed files are recorded for this task yet."
                : "No changed files were parsed from the current reviewable text artifacts."}
            </DocumentFrameSummary>
          ) : (
            state.groups.map((group) => <ReviewDiffGroup key={group.id} group={group} />)
          )}
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
