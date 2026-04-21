import type { AuthContext, WorkerBindings } from "../../env";

export function getAuthenticatedTenantId(auth: AuthContext) {
  return auth.tenantId;
}

export function getTaskSessionName(
  tenantId: string,
  runId: string,
  sessionId: string,
  taskId: string
) {
  return `tenant:${encodeURIComponent(tenantId)}:run:${encodeURIComponent(runId)}:session:${encodeURIComponent(sessionId)}:task:${encodeURIComponent(taskId)}`;
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
