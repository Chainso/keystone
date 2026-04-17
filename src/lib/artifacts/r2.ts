export interface R2ArtifactPutResult {
  storageBackend: "r2";
  storageUri: string;
  key: string;
  etag: string | null;
  sizeBytes: number;
}

export interface R2ArtifactGetResult {
  storageBackend: "r2";
  storageUri: string;
  key: string;
  etag: string | null;
  sizeBytes: number;
  body: ArrayBuffer;
  contentType: string | null;
}

export type ArtifactBodyEncoding = "utf-8" | "base64" | undefined;

export function toR2Uri(bucketName: string, key: string) {
  return `r2://${bucketName}/${key}`;
}

export function parseR2Uri(storageUri: string) {
  const match = /^r2:\/\/([^/]+)\/(.+)$/.exec(storageUri);

  if (!match || !match[1] || !match[2]) {
    throw new Error(`Unsupported R2 artifact URI: ${storageUri}`);
  }

  return {
    bucketName: match[1],
    key: match[2]
  };
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

export async function getArtifactBytes(
  bucket: R2Bucket,
  storageUri: string
): Promise<R2ArtifactGetResult | null> {
  const parsed = parseR2Uri(storageUri);
  const object = await bucket.get(parsed.key);

  if (!object) {
    return null;
  }

  return {
    storageBackend: "r2",
    storageUri,
    key: parsed.key,
    etag: object.httpEtag ?? null,
    sizeBytes: object.size,
    body: await object.arrayBuffer(),
    contentType: object.httpMetadata?.contentType ?? null
  };
}

export function decodeArtifactBody(content: string, encoding?: ArtifactBodyEncoding) {
  if (encoding === "base64") {
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  return content;
}

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
