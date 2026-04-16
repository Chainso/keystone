import type { AuthContext, WorkerBindings } from "../../env";

export function getAuthenticatedTenantId(auth: AuthContext) {
  return auth.tenantId;
}

export function getRunCoordinatorName(tenantId: string, runId: string) {
  return `tenant:${encodeURIComponent(tenantId)}:run:${encodeURIComponent(runId)}`;
}

export function getTaskSessionName(
  tenantId: string,
  runId: string,
  sessionId: string,
  taskId: string
) {
  return `tenant:${encodeURIComponent(tenantId)}:run:${encodeURIComponent(runId)}:session:${encodeURIComponent(sessionId)}:task:${encodeURIComponent(taskId)}`;
}

export function getRunCoordinatorStub(
  env: Pick<WorkerBindings, "RUN_COORDINATOR">,
  tenantId: string,
  runId: string
) {
  return env.RUN_COORDINATOR.getByName(getRunCoordinatorName(tenantId, runId));
}

export function getTaskSessionStub(
  env: Pick<WorkerBindings, "TASK_SESSION">,
  tenantId: string,
  runId: string,
  sessionId: string,
  taskId: string
) {
  return env.TASK_SESSION.getByName(getTaskSessionName(tenantId, runId, sessionId, taskId));
}
