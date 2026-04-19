import type { DatabaseClient } from "../../lib/db/client";
import {
  createArtifactRef,
  deleteArtifactRef,
  findArtifactRefByStorageUri,
  getArtifactRef
} from "../../lib/db/artifacts";
import { deleteArtifactObject, putArtifactJson } from "../../lib/artifacts/r2";
import { runSummaryArtifactKey } from "../../lib/artifacts/keys";
import { appendAndPublishRunEvent } from "../../lib/events/publish";
import { getSessionRecord, updateSessionStatus } from "../../lib/db/runs";
import type { WorkerBindings } from "../../env";

const ARTIFACTS_BUCKET_NAME = "keystone-artifacts-dev";

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
  const runSession = await getSessionRecord(client, input.tenantId, input.runSessionId);

  if (!runSession) {
    throw new Error(`Run session ${input.runSessionId} could not be loaded during finalization.`);
  }

  const existingMetadata =
    runSession.metadata && typeof runSession.metadata === "object"
      ? (runSession.metadata as Record<string, unknown>)
      : {};
  const artifactKey = runSummaryArtifactKey(input.tenantId, input.runId);
  const existingArtifactRefId =
    typeof existingMetadata.runSummaryArtifactRefId === "string"
      ? existingMetadata.runSummaryArtifactRefId
      : null;
  const existingArtifactRef = existingArtifactRefId
    ? await getArtifactRef(client, input.tenantId, existingArtifactRefId)
    : null;
  const artifact = await putArtifactJson(
    env.ARTIFACTS_BUCKET,
    ARTIFACTS_BUCKET_NAME,
    artifactKey,
    summary
  );
  const matchedArtifactRef =
    existingArtifactRef ??
    (await findArtifactRefByStorageUri(client, {
      tenantId: input.tenantId,
      runId: input.runId,
      storageUri: artifact.storageUri,
      sessionId: input.runSessionId,
      taskId: null,
      kind: "run_summary"
    }));
  const reusedExistingArtifactRef = Boolean(matchedArtifactRef);
  let artifactRef = matchedArtifactRef;
  let createdArtifactRefId: string | null = null;
  let statusPersisted = false;

  try {
    if (!artifactRef) {
      artifactRef = await createArtifactRef(client, {
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
      createdArtifactRefId = artifactRef.artifactRefId;
    }

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
    statusPersisted = true;

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
  } catch (error) {
    if (!reusedExistingArtifactRef && !statusPersisted) {
      const cleanupErrors: unknown[] = [];

      if (createdArtifactRefId) {
        try {
          await deleteArtifactRef(client, {
            tenantId: input.tenantId,
            artifactRefId: createdArtifactRefId
          });
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }

      try {
        await deleteArtifactObject(env.ARTIFACTS_BUCKET, artifactKey);
      } catch (cleanupError) {
        cleanupErrors.push(cleanupError);
      }

      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          "Run finalization failed and summary cleanup did not complete."
        );
      }
    }

    throw error;
  }
}
