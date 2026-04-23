import { tool, type ToolSet } from "ai";
import { z } from "zod";

import { execSandboxAgentBash } from "../tools/bash";
import {
  listSandboxAgentFiles,
  readSandboxAgentFile
} from "../tools/filesystem";
import type { PlanningSandboxContext } from "./planning-context";

export interface PlanningToolDependencies {
  loadContext: () => Promise<PlanningSandboxContext | null>;
}

async function requirePlanningContext(
  loadContext: PlanningToolDependencies["loadContext"]
) {
  const context = await loadContext();

  if (!context) {
    throw new Error("Planning sandbox tools are only available for run-scoped planning documents.");
  }

  return context;
}

export function createPlanningTools(input: PlanningToolDependencies): ToolSet {
  return {
    read_file: tool({
      description:
        "Read a file from the current run planning sandbox under /workspace, /artifacts/in, /artifacts/out, or /keystone.",
      inputSchema: z.object({
        path: z.string().trim().min(1)
      }),
      execute: async ({ path }) => {
        const context = await requirePlanningContext(input.loadContext);
        const result = await readSandboxAgentFile(context, path);

        return {
          path,
          content: result.content,
          encoding: result.encoding,
          size: result.size
        };
      }
    }),
    list_files: tool({
      description: "List files from a path within the current run planning sandbox bridge roots.",
      inputSchema: z.object({
        path: z.string().trim().min(1),
        recursive: z.boolean().optional()
      }),
      execute: async ({ path, recursive }) => {
        const context = await requirePlanningContext(input.loadContext);
        const result = await listSandboxAgentFiles(context, path, {
          recursive: recursive ?? false,
          includeHidden: true
        });

        return {
          path: result.path,
          count: result.count,
          files: result.files.map((file) => ({
            path: file.absolutePath,
            type: file.type,
            size: file.size
          }))
        };
      }
    }),
    run_bash: tool({
      description:
        "Execute an inspection-oriented bash command inside the current run planning workspace.",
      inputSchema: z.object({
        command: z.string().trim().min(1),
        cwd: z.string().trim().min(1).optional(),
        timeoutMs: z.number().int().positive().max(120_000).optional()
      }),
      execute: async ({ command, cwd, timeoutMs }) => {
        const context = await requirePlanningContext(input.loadContext);
        const result = await execSandboxAgentBash(context, {
          command,
          cwd,
          timeout: timeoutMs
        });

        return {
          command: result.requestedCommand,
          resolvedCommand: result.resolvedCommand,
          cwd: cwd ?? context.bridge.layout.workspaceRoot,
          exitCode: result.result.exitCode,
          stdout: result.result.stdout,
          stderr: result.result.stderr,
          success: result.result.success
        };
      }
    })
  };
}
