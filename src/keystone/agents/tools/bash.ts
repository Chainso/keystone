import type { ExecOptions, ExecResult, ExecutionSession } from "@cloudflare/sandbox";

import type { SandboxAgentBridge } from "../../../lib/workspace/init";
import { resolveSandboxAgentPath } from "./filesystem";

export interface SandboxBashBridge {
  session: ExecutionSession;
  bridge: SandboxAgentBridge;
}

export interface SandboxBashExecutionResult {
  requestedCommand: string;
  resolvedCommand: string;
  cwd: string;
  result: ExecResult;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteCommandPaths(command: string, bridge: SandboxAgentBridge) {
  const roots = [
    bridge.layout.artifactsInRoot,
    bridge.layout.artifactsOutRoot,
    bridge.layout.keystoneRoot,
    bridge.layout.workspaceRoot
  ].sort((left, right) => right.length - left.length);

  return roots.reduce((rewrittenCommand, virtualRoot) => {
    const targetRoot =
      virtualRoot === bridge.layout.workspaceRoot
        ? bridge.targets.workspaceRoot
        : virtualRoot;
    const pattern = new RegExp(`${escapeRegex(virtualRoot)}(?=$|[/'"\\s])`, "g");

    return rewrittenCommand.replace(pattern, targetRoot);
  }, command);
}

export async function execSandboxAgentBash(
  bridge: SandboxBashBridge,
  input: {
    command: string;
    cwd?: string | undefined;
    env?: Record<string, string | undefined> | undefined;
    stdin?: string | undefined;
    timeout?: number | undefined;
  }
): Promise<SandboxBashExecutionResult> {
  const resolvedCwd = input.cwd
    ? resolveSandboxAgentPath(bridge.bridge, input.cwd).sandboxPath
    : bridge.bridge.targets.workspaceRoot;
  const resolvedCommand = rewriteCommandPaths(input.command, bridge.bridge);
  const execOptions: ExecOptions = {
    cwd: resolvedCwd
  };

  const mergedEnv =
    bridge.bridge.environment || input.env
      ? {
          ...(bridge.bridge.environment ?? {}),
          ...(input.env ?? {})
        }
      : undefined;

  if (mergedEnv) {
    execOptions.env = mergedEnv;
  }

  if (input.timeout !== undefined) {
    execOptions.timeout = input.timeout;
  }

  const result = await bridge.session.exec(resolvedCommand, execOptions);

  return {
    requestedCommand: input.command,
    resolvedCommand,
    cwd: resolvedCwd,
    result
  };
}
