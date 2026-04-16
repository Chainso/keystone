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
}

export type AppEnv = {
  Bindings: WorkerBindings;
  Variables: {
    auth: AuthContext;
  };
};
