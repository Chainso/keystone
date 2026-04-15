import type { AuthContext, WorkerBindings } from "../../env";

export function getAuthenticatedTenantId(auth: AuthContext) {
  return auth.tenantId;
}

export function getRunCoordinatorName(tenantId: string, runId: string) {
  return `tenant:${encodeURIComponent(tenantId)}:run:${encodeURIComponent(runId)}`;
}

export function getRunCoordinatorStub(
  env: Pick<WorkerBindings, "RUN_COORDINATOR">,
  tenantId: string,
  runId: string
) {
  return env.RUN_COORDINATOR.getByName(getRunCoordinatorName(tenantId, runId));
}
