export interface R2ArtifactPutResult {
  storageBackend: "r2";
  storageUri: string;
  key: string;
  etag: string | null;
  sizeBytes: number;
}

export function toR2Uri(bucketName: string, key: string) {
  return `r2://${bucketName}/${key}`;
}

export async function putArtifactBytes(
  bucket: R2Bucket,
  bucketName: string,
  key: string,
  body: ReadableStream | ArrayBuffer | ArrayBufferView | string,
  options?: R2PutOptions | undefined
): Promise<R2ArtifactPutResult> {
  const object = await bucket.put(key, body, options);

  if (!object) {
    throw new Error(`Failed to write artifact to ${toR2Uri(bucketName, key)}.`);
  }

  return {
    storageBackend: "r2",
    storageUri: toR2Uri(bucketName, key),
    key,
    etag: object.httpEtag ?? null,
    sizeBytes: object.size
  };
}

export async function putArtifactJson(
  bucket: R2Bucket,
  bucketName: string,
  key: string,
  value: Record<string, unknown>
) {
  return putArtifactBytes(bucket, bucketName, key, JSON.stringify(value, null, 2), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8"
    }
  });
}

export async function getArtifactText(bucket: R2Bucket, key: string) {
  const object = await bucket.get(key);

  if (!object) {
    return null;
  }

  return object.text();
}
