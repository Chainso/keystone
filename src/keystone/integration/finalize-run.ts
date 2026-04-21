import type { DatabaseClient } from "../../lib/db/client";
import {
  createArtifactRef,
  deleteArtifactRef,
  findArtifactRefByObjectKey
} from "../../lib/db/artifacts";
import { deleteArtifactObject, putArtifactJson } from "../../lib/artifacts/r2";
import { runSummaryArtifactKey } from "../../lib/artifacts/keys";
import { getRunRecord, listRunTaskDependencies, listRunTasks, updateRunRecord } from "../../lib/db/runs";
import type { WorkerBindings } from "../../env";

const ARTIFACTS_BUCKET_NAME = "keystone-artifacts-dev";

export async function finalizeRun(
  env: WorkerBindings,
  client: DatabaseClient,
  input: {
    tenantId: string;
    runId: string;
  }
) {
  const run = await getRunRecord(client, {
    tenantId: input.tenantId,
    runId: input.runId
  });

  if (!run) {
    throw new Error(`Run ${input.runId} could not be loaded during finalization.`);
  }

  const [runTasks, dependencies] = await Promise.all([
    listRunTasks(client, {
      tenantId: input.tenantId,
      runId: input.runId
    }),
    listRunTaskDependencies(client, {
      tenantId: input.tenantId,
      runId: input.runId
    })
  ]);
  const dependsOnByTaskId = new Map<string, string[]>();

  for (const dependency of dependencies) {
    const dependsOn = dependsOnByTaskId.get(dependency.childRunTaskId) ?? [];
    dependsOn.push(dependency.parentRunTaskId);
    dependsOnByTaskId.set(dependency.childRunTaskId, dependsOn);
  }

  const successfulTasks = runTasks.filter((task) => task.status === "completed");
  const failedTasks = runTasks.filter((task) => task.status !== "completed");
  const finalStatus = failedTasks.length === 0 ? "archived" : "failed";
  const summary = {
    runId: input.runId,
    successfulTasks: successfulTasks.length,
    failedTasks: failedTasks.length,
    tasks: runTasks.map((task) => ({
      runTaskId: task.runTaskId,
      name: task.name,
      description: task.description,
      status: task.status,
      dependsOn: dependsOnByTaskId.get(task.runTaskId) ?? [],
      conversation:
        task.conversationAgentClass && task.conversationAgentName
          ? {
              agentClass: task.conversationAgentClass,
              agentName: task.conversationAgentName
            }
          : null,
      startedAt: task.startedAt?.toISOString() ?? null,
      endedAt: task.endedAt?.toISOString() ?? null
    }))
  };

  const artifactKey = runSummaryArtifactKey(input.tenantId, input.runId);
  const existingArtifactRef = (await findArtifactRefByObjectKey(client, {
    tenantId: input.tenantId,
    bucket: ARTIFACTS_BUCKET_NAME,
    objectKey: artifactKey,
    runId: input.runId,
    artifactKind: "run_summary"
  })) ?? null;
  const artifact = await putArtifactJson(
    env.ARTIFACTS_BUCKET,
    ARTIFACTS_BUCKET_NAME,
    artifactKey,
    summary
  );
  const matchedArtifactRef =
    existingArtifactRef ??
    (await findArtifactRefByObjectKey(client, {
      tenantId: input.tenantId,
      bucket: ARTIFACTS_BUCKET_NAME,
      objectKey: artifact.key,
      runId: input.runId,
      artifactKind: "run_summary"
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
        projectId: run.projectId,
        artifactKind: "run_summary",
        storageBackend: artifact.storageBackend,
        bucket: ARTIFACTS_BUCKET_NAME,
        objectKey: artifact.key,
        objectVersion: artifact.objectVersion,
        etag: artifact.etag,
        contentType: "application/json; charset=utf-8",
        sha256: artifact.sha256,
        sizeBytes: artifact.sizeBytes
      });
      createdArtifactRefId = artifactRef.artifactRefId;
    }

    await updateRunRecord(client, {
      tenantId: input.tenantId,
      runId: input.runId,
      status: finalStatus,
      endedAt: new Date()
    });
    statusPersisted = true;

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
