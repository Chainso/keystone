import { createExecuteTool } from "@cloudflare/think/tools/execute";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

import type { WorkerBindings } from "../../../env";
import { saveRunDocumentTextRevision } from "../../../lib/documents/revision-persistence";
import { execSandboxAgentBash } from "../tools/bash";
import { readSandboxAgentFile } from "../tools/filesystem";
import { createSandboxWorkspaceTools } from "../tools/sandbox-workspace-tools";
import type { PlanningDocumentAgentConfig } from "./planning-agent-config";
import type { PlanningSandboxContext } from "./planning-context";

export interface PlanningToolDependencies {
  env: WorkerBindings;
  loadContext: () => Promise<PlanningSandboxContext | null>;
  loader: WorkerLoader;
  documentConfig: PlanningDocumentAgentConfig | null;
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

function createDocumentSaveTools(input: PlanningToolDependencies): ToolSet {
  const config = input.documentConfig;

  if (!config) {
    return {};
  }

  return {
    [config.saveToolName]: tool({
      description: config.saveToolDescription,
      inputSchema: z.object({
        title: z.string().trim().min(1).optional()
      }),
      execute: async ({ title }) => {
        const context = await requirePlanningContext(input.loadContext);
        const draft = await readSandboxAgentFile(context, config.draftSandboxPath);

        const content = draft.content;

        const result = await saveRunDocumentTextRevision({
          env: input.env,
          tenantId: context.identity.tenantId,
          runId: context.identity.runId,
          path: config.documentPath,
          kind: config.documentKind,
          content,
          title: title ?? `Agent save for ${config.documentPath}`
        });

        return {
          documentId: result.document.documentId,
          documentRevisionId: result.revision.documentRevisionId,
          revisionNumber: result.revision.revisionNumber,
          path: result.document.path,
          title: result.revision.title,
          bytesWritten: result.artifact.sizeBytes
        };
      }
    })
  };
}

export function createPlanningTools(input: PlanningToolDependencies): ToolSet {
  const workspaceTools = createSandboxWorkspaceTools(() =>
    requirePlanningContext(input.loadContext)
  );

  return {
    ...workspaceTools,
    execute: createExecuteTool({
      tools: workspaceTools,
      loader: input.loader
    }),
    ...createDocumentSaveTools(input),
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
