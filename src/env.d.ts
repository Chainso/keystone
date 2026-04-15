export type AuthMode = "dev";

export interface AuthContext {
  authMode: AuthMode;
  tenantId: string;
  tokenFingerprint: string;
}

export interface WorkerBindings extends Env {
  KEYSTONE_DEV_TOKEN?: string;
}

export type AppEnv = {
  Bindings: WorkerBindings;
  Variables: {
    auth: AuthContext;
  };
};
