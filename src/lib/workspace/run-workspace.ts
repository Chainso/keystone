import type { WorkerBindings } from "../../env";
import { getTaskSessionStub } from "../auth/tenant";
import type { WorkspaceMaterializationSource } from "./init";

const RUN_WORKSPACE_SESSION_ID = "run-workspace";
const RUN_WORKSPACE_TASK_ID = "run-workspace";
const RUN_WORKSPACE_RUN_TASK_ID = "run-workspace";

export interface EnsureRunWorkspaceInput {
  tenantId: string;
  runId: string;
  sandboxId: string;
  components: WorkspaceMaterializationSource[];
  env?: Record<string, string> | undefined;
}

export async function ensureRunWorkspace(
  env: Pick<WorkerBindings, "TASK_SESSION">,
  input: EnsureRunWorkspaceInput
) {
  const taskSession = getTaskSessionStub(
    env,
    input.tenantId,
    input.runId,
    RUN_WORKSPACE_SESSION_ID,
    RUN_WORKSPACE_TASK_ID
  );

  await taskSession.initialize({
    tenantId: input.tenantId,
    runId: input.runId,
    sessionId: RUN_WORKSPACE_SESSION_ID,
    taskId: RUN_WORKSPACE_TASK_ID,
    runTaskId: RUN_WORKSPACE_RUN_TASK_ID,
    sandboxId: input.sandboxId
  });

  return taskSession.ensureWorkspace({
    components: input.components,
    env: input.env
  });
}
