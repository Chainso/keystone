import type { ArtifactResource } from "../../../../src/http/api/v1/artifacts/contracts";

type TaskReviewArtifactLike = Pick<ArtifactResource, "contentType" | "kind">;

const reviewableTextArtifactKinds = new Set<ArtifactResource["kind"]>(["run_note", "staged_output"]);

export function isTextArtifactContentType(contentType: string | null | undefined) {
  if (!contentType) {
    return false;
  }

  return (
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("javascript") ||
    contentType.includes("xml") ||
    contentType.includes("yaml") ||
    contentType.includes("markdown")
  );
}

export function canArtifactContainReviewDiff(artifact: TaskReviewArtifactLike) {
  return (
    reviewableTextArtifactKinds.has(artifact.kind) && isTextArtifactContentType(artifact.contentType)
  );
}

export function partitionTaskReviewArtifacts<T extends TaskReviewArtifactLike>(artifacts: T[]) {
  const reviewCandidates: T[] = [];
  const supportingArtifacts: T[] = [];

  for (const artifact of artifacts) {
    if (canArtifactContainReviewDiff(artifact)) {
      reviewCandidates.push(artifact);
      continue;
    }

    supportingArtifacts.push(artifact);
  }

  return {
    reviewCandidates,
    supportingArtifacts
  };
}
