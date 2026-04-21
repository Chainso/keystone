function keySegment(value: string) {
  return encodeURIComponent(value.trim());
}

export function tenantRunPrefix(tenantId: string, runId: string) {
  return `tenants/${keySegment(tenantId)}/runs/${keySegment(runId)}`;
}

export function runPlanArtifactKey(tenantId: string, runId: string) {
  return `${tenantRunPrefix(tenantId, runId)}/plan/plan.json`;
}

export function taskHandoffArtifactKey(
  tenantId: string,
  runId: string,
  runTaskId: string
) {
  return `${tenantRunPrefix(tenantId, runId)}/tasks/${keySegment(runTaskId)}/handoff.json`;
}

export function taskLogArtifactKey(
  tenantId: string,
  runId: string,
  runTaskId: string,
  attemptId: string
) {
  return `${tenantRunPrefix(tenantId, runId)}/tasks/${keySegment(runTaskId)}/logs/${keySegment(attemptId)}.jsonl`;
}

export function taskEvidenceIndexArtifactKey(
  tenantId: string,
  runId: string,
  taskId: string,
  attemptId: string
) {
  return `${tenantRunPrefix(tenantId, runId)}/tasks/${keySegment(taskId)}/evidence/${keySegment(attemptId)}/index.json`;
}

export function integrationMergeReportArtifactKey(
  tenantId: string,
  runId: string,
  integrationId: string
) {
  return `${tenantRunPrefix(tenantId, runId)}/integration/${keySegment(integrationId)}/merge-report.json`;
}

export function releasePackArtifactKey(tenantId: string, runId: string) {
  return `${tenantRunPrefix(tenantId, runId)}/release/release-pack.zip`;
}

export function runSummaryArtifactKey(tenantId: string, runId: string) {
  return `${tenantRunPrefix(tenantId, runId)}/release/run-summary.json`;
}

export function sandboxBackupArtifactKey(
  tenantId: string,
  sandboxId: string,
  backupId: string
) {
  return `tenants/${keySegment(tenantId)}/sandboxes/${keySegment(sandboxId)}/backups/${keySegment(backupId)}.squashfs`;
}
