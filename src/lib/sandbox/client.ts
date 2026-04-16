import { getSandbox, type ExecutionSession, type Sandbox as SandboxInstance } from "@cloudflare/sandbox";

import type { WorkerBindings } from "../../env";

export interface SandboxSessionContext {
  sandbox: SandboxInstance;
  session: ExecutionSession;
}

export interface EnsureSandboxSessionInput {
  env: Pick<WorkerBindings, "SANDBOX">;
  sandboxId: string;
  sessionId: string;
  cwd?: string | undefined;
  envVars?: Record<string, string | undefined> | undefined;
}

export function getSandboxClient(
  env: Pick<WorkerBindings, "SANDBOX">,
  sandboxId: string
) {
  return getSandbox(env.SANDBOX, sandboxId, {
    sleepAfter: "10m"
  });
}

export async function ensureSandboxSession(
  input: EnsureSandboxSessionInput
): Promise<SandboxSessionContext> {
  const sandbox = getSandboxClient(input.env, input.sandboxId);
  const sessionOptions: {
    id: string;
    cwd?: string;
    env?: Record<string, string | undefined>;
  } = {
    id: input.sessionId
  };

  if (input.cwd) {
    sessionOptions.cwd = input.cwd;
  }

  if (input.envVars) {
    sessionOptions.env = input.envVars;
  }

  try {
    const session = await sandbox.getSession(input.sessionId);

    return {
      sandbox,
      session
    };
  } catch {
    try {
      const session = await sandbox.createSession(sessionOptions);

      return {
        sandbox,
        session
      };
    } catch {
      const session = await sandbox.getSession(input.sessionId);

      return {
        sandbox,
        session
      };
    }
  }
}
