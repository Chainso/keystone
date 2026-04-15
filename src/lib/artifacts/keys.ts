function keySegment(value: string) {
  return encodeURIComponent(value.trim());
}

export function tenantRunPrefix(tenantId: string, runId: string) {
  return `tenants/${keySegment(tenantId)}/runs/${keySegment(runId)}`;
}

export function decisionPackageArtifactKey(
  tenantId: string,
  runId: string,
  artifactId: string
) {
  return `${tenantRunPrefix(tenantId, runId)}/inputs/decision-package/${keySegment(artifactId)}.json`;
}

export function runPlanArtifactKey(tenantId: string, runId: string) {
  return `${tenantRunPrefix(tenantId, runId)}/plan/plan.json`;
}

export function taskHandoffArtifactKey(
  tenantId: string,
  runId: string,
  taskId: string
) {
  return `${tenantRunPrefix(tenantId, runId)}/tasks/${keySegment(taskId)}/handoff.json`;
}

export function taskLogArtifactKey(
  tenantId: string,
  runId: string,
  taskId: string,
  attemptId: string
) {
  return `${tenantRunPrefix(tenantId, runId)}/tasks/${keySegment(taskId)}/logs/${keySegment(attemptId)}.jsonl`;
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

export function sandboxBackupArtifactKey(
  tenantId: string,
  sandboxId: string,
  backupId: string
) {
  return `tenants/${keySegment(tenantId)}/sandboxes/${keySegment(sandboxId)}/backups/${keySegment(backupId)}.squashfs`;
}
