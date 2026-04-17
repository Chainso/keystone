const encoder = new TextEncoder();

function slugify(value: string, maxLength: number) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return (slug || "default").slice(0, maxLength);
}

function bytesToUuid(bytes: Uint8Array) {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function buildStableSessionId(...parts: string[]) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(parts.join("::")));
  const bytes = new Uint8Array(digest).slice(0, 16);
  const versionByte = bytes[6];
  const variantByte = bytes[8];

  if (versionByte === undefined || variantByte === undefined) {
    throw new Error("Stable session id digest was unexpectedly truncated.");
  }

  bytes[6] = (versionByte & 0x0f) | 0x40;
  bytes[8] = (variantByte & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}

export function buildRunWorkflowInstanceId(tenantId: string, runId: string) {
  return `run-${slugify(runId, 40)}-${slugify(tenantId, 12)}`.slice(0, 63);
}

export function buildTaskWorkflowInstanceId(tenantId: string, runId: string, taskId: string) {
  return `task-${slugify(taskId, 28)}-${slugify(runId, 20)}-${slugify(tenantId, 8)}`.slice(0, 63);
}
