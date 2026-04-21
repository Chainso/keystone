import type { Context } from "hono";
import { basename } from "node:path";

import type { AppEnv } from "../../../../env";
import { getArtifactBytes } from "../../../../lib/artifacts/r2";
import { getArtifactRef, getArtifactStorageUri } from "../../../../lib/db/artifacts";
import { createWorkerDatabaseClient } from "../../../../lib/db/client";
import { jsonErrorResponse, throwJsonHttpError } from "../../../../lib/http/errors";
import { artifactDetailEnvelopeSchema } from "./contracts";
import { projectArtifactResource } from "../runs/projections";

export async function getArtifactHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const artifactId = context.req.param("artifactId");

  if (!artifactId) {
    throwJsonHttpError(400, "invalid_path", "Artifact ID is required.");
  }

  const client = createWorkerDatabaseClient(context.env);

  try {
    const artifact = await getArtifactRef(client, auth.tenantId, artifactId);

    if (!artifact) {
      return jsonErrorResponse("artifact_not_found", `Artifact ${artifactId} was not found.`, 404);
    }

    return context.json(
      artifactDetailEnvelopeSchema.parse({
        data: projectArtifactResource(artifact),
        meta: {
          apiVersion: "v1",
          envelope: "detail",
          resourceType: "artifact"
        }
      })
    );
  } finally {
    await client.close();
  }
}

export async function getArtifactContentHandler(context: Context<AppEnv>) {
  const auth = context.get("auth");
  const artifactId = context.req.param("artifactId");

  if (!artifactId) {
    throwJsonHttpError(400, "invalid_path", "Artifact ID is required.");
  }

  const client = createWorkerDatabaseClient(context.env);

  try {
    const artifact = await getArtifactRef(client, auth.tenantId, artifactId);

    if (!artifact) {
      return jsonErrorResponse("artifact_not_found", `Artifact ${artifactId} was not found.`, 404);
    }

    if (artifact.storageBackend !== "r2") {
      return jsonErrorResponse(
        "artifact_backend_not_supported",
        `Artifact backend ${artifact.storageBackend} is not supported for direct reads yet.`,
        501
      );
    }

    const storageUri = getArtifactStorageUri(artifact);
    const storedArtifact = await getArtifactBytes(context.env.ARTIFACTS_BUCKET, storageUri);

    if (!storedArtifact) {
      return jsonErrorResponse(
        "artifact_content_not_found",
        `Artifact content for ${artifactId} was not found.`,
        404
      );
    }

    const headers = new Headers();

    headers.set("content-type", storedArtifact.contentType ?? artifact.contentType);

    headers.set("content-disposition", `inline; filename="${basename(artifact.objectKey)}"`);

    return new Response(storedArtifact.body, {
      status: 200,
      headers
    });
  } finally {
    await client.close();
  }
}
