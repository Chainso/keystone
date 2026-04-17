export type AuthMode = "dev";

export interface AuthContext {
  authMode: AuthMode;
  tenantId: string;
  tokenFingerprint: string;
}

export interface WorkerBindings extends Env {
  KEYSTONE_DEV_TOKEN?: string;
  SANDBOX: DurableObjectNamespace<import("@cloudflare/sandbox").Sandbox>;
  TASK_SESSION: DurableObjectNamespace<import("./durable-objects/TaskSessionDO").TaskSessionDO>;
  RUN_WORKFLOW: Workflow<import("./workflows/RunWorkflow").RunWorkflowParams>;
  TASK_WORKFLOW: Workflow<import("./workflows/TaskWorkflow").TaskWorkflowParams>;
}

export type AppEnv = {
  Bindings: WorkerBindings;
  Variables: {
    auth: AuthContext;
  };
};
