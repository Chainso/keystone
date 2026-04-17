const MAX_SEGMENT_LENGTH = 48;
const MAX_SANDBOX_ID_LENGTH = 63;

export function slugifySegment(value: string) {
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

export function buildWorkspaceCodeRoot(workspaceRoot: string) {
  return `${workspaceRoot}/code`;
}

export function buildComponentPathSegment(componentKey: string) {
  const trimmed = componentKey.trim();

  if (!trimmed) {
    return "default";
  }

  return encodeURIComponent(trimmed).replaceAll(".", "%2E");
}

export function buildComponentRepositoryPath(workspaceRoot: string, componentKey: string) {
  return `${workspaceRoot}/repositories/${buildComponentPathSegment(componentKey)}`;
}

export function buildComponentWorktreePath(workspaceRoot: string, componentKey: string) {
  return `${buildWorkspaceCodeRoot(workspaceRoot)}/${buildComponentPathSegment(componentKey)}`;
}

export function buildTaskBranchName(taskId: string) {
  return `keystone/${slugifySegment(taskId)}`;
}
