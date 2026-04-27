export type AuthMode = "dev";

export interface AuthContext {
  authMode: AuthMode;
  tenantId: string;
  tokenFingerprint: string;
}

export interface WorkerBindings extends Env {
  KEYSTONE_DEV_TOKEN: string;
  LOADER: WorkerLoader;
  SANDBOX: DurableObjectNamespace<import("@cloudflare/sandbox").Sandbox>;
  KEYSTONE_THINK_AGENT: DurableObjectNamespace<
    import("./keystone/agents/base/KeystoneThinkAgent").KeystoneThinkAgent
  >;
  PlanningDocumentAgent: DurableObjectNamespace<
    import("./keystone/agents/planning/PlanningDocumentAgent").PlanningDocumentAgent
  >;
  KEYSTONE_IMPLEMENTER_CHAT_COMPLETIONS_MODEL?: string;
  KEYSTONE_SPECIFICATION_CHAT_COMPLETIONS_MODEL?: string;
  KEYSTONE_ARCHITECTURE_CHAT_COMPLETIONS_MODEL?: string;
  KEYSTONE_EXECUTION_PLAN_CHAT_COMPLETIONS_MODEL?: string;
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
