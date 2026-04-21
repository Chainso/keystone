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

export function buildWorkspaceId(runId: string) {
  return `workspace-${slugifySegment(runId)}`;
}

export function buildSandboxId(tenantId: string, runId: string, sessionId: string) {
  const sandboxId = `kt-${slugifySegment(tenantId)}-${slugifySegment(runId)}-${sessionId.slice(0, 8)}`
    .slice(0, MAX_SANDBOX_ID_LENGTH)
    .replace(/^-+|-+$/g, "");

  return sandboxId || "kt-default";
}

export function buildRunSandboxId(tenantId: string, runId: string) {
  return buildSandboxId(tenantId, runId, runId);
}

export function buildWorkspaceRoot(runId: string) {
  return `/workspace/runs/${slugifySegment(runId)}`;
}

export function buildTaskWorkspaceTargetPath(workspaceRoot: string, taskId: string) {
  return `${workspaceRoot}/tasks/${encodeURIComponent(taskId)}`;
}

export function buildWorkspaceCodeRoot(workspaceRoot: string, taskId?: string) {
  if (!taskId) {
    return `${workspaceRoot}/code`;
  }

  return `${buildTaskWorkspaceTargetPath(workspaceRoot, taskId)}/code`;
}

function buildTaskWorkspaceSegment(taskId: string, runTaskId: string) {
  const taskSlug = slugifySegment(taskId);
  const runTaskSlug = slugifySegment(runTaskId).slice(0, 8) || "task";

  return `${taskSlug}-${runTaskSlug}`;
}

export function buildTaskWorkspaceTargetPathWithIdentity(
  workspaceRoot: string,
  taskId: string,
  runTaskId: string
) {
  return `${workspaceRoot}/tasks/${buildTaskWorkspaceSegment(taskId, runTaskId)}`;
}

export function buildWorkspaceCodeRootWithIdentity(
  workspaceRoot: string,
  taskId: string,
  runTaskId: string
) {
  return `${buildTaskWorkspaceTargetPathWithIdentity(workspaceRoot, taskId, runTaskId)}/code`;
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

export function buildComponentWorktreePath(
  workspaceRoot: string,
  taskId: string,
  runTaskId: string,
  componentKey: string
) {
  return `${buildWorkspaceCodeRootWithIdentity(workspaceRoot, taskId, runTaskId)}/${buildComponentPathSegment(componentKey)}`;
}

export function buildTaskBranchName(taskId: string, runTaskId: string) {
  const taskSlug = slugifySegment(taskId);
  const runTaskSlug = slugifySegment(runTaskId).slice(0, 8) || "task";

  return `keystone/${taskSlug}-${runTaskSlug}`;
}
