const MAX_SEGMENT_LENGTH = 48;
const MAX_SANDBOX_ID_LENGTH = 63;

function slugifySegment(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.slice(0, MAX_SEGMENT_LENGTH) || "default";
}

export function buildWorkspaceId(runId: string, sessionId: string) {
  return `workspace-${slugifySegment(runId)}-${sessionId.slice(0, 8)}`;
}

export function buildSandboxId(tenantId: string, runId: string, sessionId: string) {
  const sandboxId = `kt-${slugifySegment(tenantId)}-${slugifySegment(runId)}-${sessionId.slice(0, 8)}`
    .slice(0, MAX_SANDBOX_ID_LENGTH)
    .replace(/^-+|-+$/g, "");

  return sandboxId || "kt-default";
}

export function buildWorkspaceRoot(runId: string, sessionId: string) {
  return `/workspace/runs/${slugifySegment(runId)}-${sessionId.slice(0, 8)}`;
}

export function buildRepositoryPath(workspaceRoot: string) {
  return `${workspaceRoot}/repo`;
}

export function buildTaskWorktreePath(workspaceRoot: string, taskId: string) {
  return `${workspaceRoot}/tasks/${slugifySegment(taskId)}`;
}

export function buildTaskBranchName(taskId: string) {
  return `keystone/${slugifySegment(taskId)}`;
}
