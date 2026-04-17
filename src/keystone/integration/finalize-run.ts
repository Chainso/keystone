import type { DatabaseClient } from "../../lib/db/client";
import { createArtifactRef } from "../../lib/db/artifacts";
import { putArtifactJson } from "../../lib/artifacts/r2";
import { runSummaryArtifactKey } from "../../lib/artifacts/keys";
import { appendAndPublishRunEvent } from "../../lib/events/publish";
import { getSessionRecord, updateSessionStatus } from "../../lib/db/runs";
import type { WorkerBindings } from "../../env";

export interface FinalizeRunTaskResult {
  taskId: string;
  workflowStatus: string;
  processStatus?: string | null | undefined;
  exitCode?: number | null | undefined;
  logArtifactRefId?: string | null | undefined;
}

export async function finalizeRun(
  env: WorkerBindings,
  client: DatabaseClient,
  input: {
    tenantId: string;
    runId: string;
    runSessionId: string;
    taskResults: FinalizeRunTaskResult[];
  }
) {
  const successfulTasks = input.taskResults.filter((result) => result.workflowStatus === "complete");
  const failedTasks = input.taskResults.filter((result) => result.workflowStatus !== "complete");
  const finalStatus = failedTasks.length === 0 ? "archived" : "failed";
  const summary = {
    runId: input.runId,
    successfulTasks: successfulTasks.length,
    failedTasks: failedTasks.length,
    tasks: input.taskResults
  };
  const artifact = await putArtifactJson(
    env.ARTIFACTS_BUCKET,
    "keystone-artifacts-dev",
    runSummaryArtifactKey(input.tenantId, input.runId),
    summary
  );
  const artifactRef = await createArtifactRef(client, {
    tenantId: input.tenantId,
    runId: input.runId,
    sessionId: input.runSessionId,
    kind: "run_summary",
    storageBackend: artifact.storageBackend,
    storageUri: artifact.storageUri,
    contentType: "application/json; charset=utf-8",
    sizeBytes: artifact.sizeBytes,
    metadata: {
      key: artifact.key,
      etag: artifact.etag,
      successfulTasks: successfulTasks.length,
      failedTasks: failedTasks.length
    }
  });

  if (!artifactRef) {
    throw new Error(`Run summary artifact ref could not be created for ${input.runId}.`);
  }

  const runSession = await getSessionRecord(client, input.tenantId, input.runSessionId);

  if (!runSession) {
    throw new Error(`Run session ${input.runSessionId} could not be loaded during finalization.`);
  }

  const existingMetadata =
    runSession.metadata && typeof runSession.metadata === "object"
      ? (runSession.metadata as Record<string, unknown>)
      : {};

  await updateSessionStatus(client, {
    tenantId: input.tenantId,
    sessionId: input.runSessionId,
    status: finalStatus,
    metadata: {
      ...existingMetadata,
      runSummaryArtifactRefId: artifactRef.artifactRefId,
      successfulTasks: successfulTasks.length,
      failedTasks: failedTasks.length
    }
  });

  await appendAndPublishRunEvent(client, env, {
    tenantId: input.tenantId,
    runId: input.runId,
    sessionId: input.runSessionId,
    eventType: failedTasks.length === 0 ? "session.archived" : "session.error",
    severity: failedTasks.length === 0 ? "info" : "error",
    artifactRefId: artifactRef.artifactRefId,
    payload: summary,
    status: finalStatus
  });

  return {
    finalStatus,
    artifactRef,
    summary
  };
}
