import { posix as path } from "node:path";

import type { ExecutionSession } from "@cloudflare/sandbox";
import type { LanguageModel } from "ai";
import { tool, type ToolSet } from "ai";
import { z } from "zod";

import type { AgentRuntimeArtifactKind } from "../../../lib/artifacts/model";
import type { AgentTurnContext, AgentRuntimeArtifact } from "../../../maestro/agent-runtime";
import type { SandboxAgentBridge } from "../../../lib/workspace/init";
import { execSandboxAgentBash } from "../tools/bash";
import {
  listSandboxAgentFiles,
  listSandboxAgentStagedOutputs,
  mkdirSandboxAgentPath,
  readSandboxAgentFile,
  writeSandboxAgentFile
} from "../tools/filesystem";

export interface ImplementerTurnMetadata {
  prompt: string;
  sandboxId: string;
  agentBridge: SandboxAgentBridge;
  modelId?: string | undefined;
  mockModelPlan?: ImplementerMockTurnStep[] | undefined;
}

export interface ImplementerToolEvent {
  eventType: string;
  payload: Record<string, unknown>;
  severity?: "info" | "warning" | "error" | undefined;
}

export interface ImplementerToolDependencies {
  session: ExecutionSession;
  bridge: SandboxAgentBridge;
  recordEvent?: ((event: ImplementerToolEvent) => Promise<void>) | undefined;
}

export interface ImplementerMockToolCall {
  toolName: string;
  input: Record<string, unknown>;
}

export type ImplementerMockTurnStep =
  | {
      type: "tool-calls";
      calls: ImplementerMockToolCall[];
    }
  | {
      type: "text";
      text: string;
    };

const implementerMockToolCallSchema = z.object({
  toolName: z.string().trim().min(1),
  input: z.record(z.string(), z.unknown())
});

const implementerMockTurnStepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tool-calls"),
    calls: z.array(implementerMockToolCallSchema).min(1)
  }),
  z.object({
    type: z.literal("text"),
    text: z.string()
  })
]);

const baseBridgeSchema = z.object({
  layout: z.object({
    workspaceRoot: z.string().trim().min(1),
    artifactsInRoot: z.string().trim().min(1),
    artifactsOutRoot: z.string().trim().min(1),
    keystoneRoot: z.string().trim().min(1)
  }),
  targets: z.object({
    workspaceRoot: z.string().trim().min(1),
    artifactsInRoot: z.string().trim().min(1),
    artifactsOutRoot: z.string().trim().min(1),
    keystoneRoot: z.string().trim().min(1)
  }),
  readOnlyRoots: z.array(z.string()),
  writableRoots: z.array(z.string()),
  environment: z.record(z.string(), z.string()).optional(),
  controlFiles: z.object({
    session: z.string().trim().min(1),
    filesystem: z.string().trim().min(1),
    artifacts: z.string().trim().min(1)
  }),
  projectedArtifacts: z.array(
    z.object({
      artifactRefId: z.string().trim().min(1),
      kind: z.string().trim().min(1),
      contentType: z.string().trim().min(1),
      storageUri: z.string().trim().min(1),
      projectedPath: z.string().trim().min(1),
      sizeBytes: z.number().nullable().optional(),
      metadata: z.record(z.string(), z.unknown()).optional()
    })
  )
});

const implementerTurnMetadataSchema = z.object({
  prompt: z.string().trim().min(1),
  sandboxId: z.string().trim().min(1),
  agentBridge: baseBridgeSchema,
  modelId: z.string().trim().min(1).optional(),
  mockModelPlan: z.array(implementerMockTurnStepSchema).optional()
});

const textUsage = {
  inputTokens: {
    total: 0,
    noCache: 0,
    cacheRead: 0,
    cacheWrite: 0
  },
  outputTokens: {
    total: 0,
    text: 0,
    reasoning: 0
  }
};

const defaultImplementerTurnSummary = "Implementer turn completed without assistant text.";
const synthesizedRunNoteFileName = "keystone-think-run-note.md";

function emitToolCallChunks(
  controller: ReadableStreamDefaultController<unknown>,
  calls: ImplementerMockToolCall[]
) {
  for (const [index, call] of calls.entries()) {
    const toolCallId = `tool-${index + 1}-${crypto.randomUUID()}`;

    controller.enqueue({
      type: "tool-call",
      toolCallId,
      toolName: call.toolName,
      input: JSON.stringify(call.input)
    });
  }
}

function emitTextChunks(
  controller: ReadableStreamDefaultController<unknown>,
  text: string
) {
  const textId = `text-${crypto.randomUUID()}`;

  controller.enqueue({
    type: "text-start",
    id: textId
  });
  controller.enqueue({
    type: "text-delta",
    id: textId,
    delta: text
  });
  controller.enqueue({
    type: "text-end",
    id: textId
  });
}

function inferContentType(filePath: string) {
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }

  if (filePath.endsWith(".md")) {
    return "text/markdown; charset=utf-8";
  }

  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }

  if (filePath.endsWith(".ts")) {
    return "text/plain; charset=utf-8";
  }

  return "text/plain; charset=utf-8";
}

function inferArtifactKind(filePath: string): AgentRuntimeArtifactKind {
  if (filePath.endsWith(".md")) {
    return "run_note";
  }

  return "staged_output";
}

export function resolveImplementerTurnSummary(summary: string | undefined) {
  const normalizedSummary = summary?.trim();

  return normalizedSummary && normalizedSummary.length > 0
    ? normalizedSummary
    : defaultImplementerTurnSummary;
}

export function buildSynthesizedRunNote(summary: string) {
  return [
    "# Keystone Think Run Note",
    "",
    "This note was synthesized because the completed Think turn did not stage a markdown handoff under `/artifacts/out`.",
    "",
    summary,
    ""
  ].join("\n");
}

export function parseImplementerTurnMetadata(context: AgentTurnContext): ImplementerTurnMetadata {
  return implementerTurnMetadataSchema.parse(context.metadata);
}

export function buildImplementerSystemPrompt(context: AgentTurnContext) {
  const metadata = parseImplementerTurnMetadata(context);

  return [
    "You are Keystone's implementer role running inside Think.",
    "Treat Think conversation history as ephemeral scratch space. Keystone files, staged outputs, events, and promoted artifacts remain the source of truth.",
    `Your writable roots are ${context.filesystem.workspaceRoot} and ${context.filesystem.artifactsOutRoot}.`,
    `Read projected inputs from ${context.filesystem.artifactsInRoot} and control files from ${context.filesystem.keystoneRoot}.`,
    `Read ${metadata.agentBridge.controlFiles.session} before acting and use ${metadata.agentBridge.controlFiles.artifacts} to inspect projected inputs such as run planning documents, run_plan, and task_handoff artifacts.`,
    "If you change files under /workspace, create a git commit in the task worktree before handing off. Use a concise commit message and do not amend or rewrite existing commits.",
    "Stage durable handoff files only under /artifacts/out. Do not assume staged files are promoted automatically.",
    "Use bash sparingly and prefer direct file edits when that is simpler.",
    `Task prompt: ${metadata.prompt}`
  ].join(" ");
}

export function extractAssistantText(message: unknown) {
  if (!message || typeof message !== "object") {
    return "";
  }

  const parts = Reflect.get(message, "parts");

  if (!Array.isArray(parts)) {
    return "";
  }

  const text = parts
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }

      const type = Reflect.get(part, "type");

      if (type === "text") {
        const value = Reflect.get(part, "text");

        return typeof value === "string" ? value : "";
      }

      return "";
    })
    .filter(Boolean)
    .join("")
    .trim();

  return text;
}

function toGenerateContent(step: ImplementerMockTurnStep) {
  if (step.type === "tool-calls") {
    return step.calls.map((call, index) => ({
      type: "tool-call" as const,
      toolCallId: `tool-${index + 1}-${crypto.randomUUID()}`,
      toolName: call.toolName,
      input: JSON.stringify(call.input)
    }));
  }

  return [
    {
      type: "text" as const,
      text: step.text
    }
  ];
}

export function createMockImplementerModel(plan: ImplementerMockTurnStep[]): LanguageModel {
  const steps = implementerMockTurnStepSchema.array().parse(plan);
  let stepIndex = 0;

  return {
    specificationVersion: "v3",
    provider: "keystone-think",
    modelId: "mock-implementer",
    supportedUrls: {},
    async doGenerate() {
      const step = steps[stepIndex] ?? {
        type: "text" as const,
        text: "No additional work was required."
      };
      stepIndex += 1;

      return {
        content: toGenerateContent(step),
        finishReason: {
          unified: step.type === "tool-calls" ? "tool-calls" : "stop",
          raw: step.type === "tool-calls" ? "tool-calls" : "stop"
        },
        usage: textUsage,
        warnings: [],
        response: {
          modelId: "mock-implementer",
          id: `mock-${stepIndex}`,
          timestamp: new Date()
        }
      };
    },
    async doStream() {
      const step = steps[stepIndex] ?? {
        type: "text" as const,
        text: "No additional work was required."
      };
      stepIndex += 1;

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "stream-start",
            warnings: []
          });
          controller.enqueue({
            type: "response-metadata",
            modelId: "mock-implementer",
            id: `mock-${stepIndex}`,
            timestamp: new Date()
          });

          if (step.type === "tool-calls") {
            emitToolCallChunks(controller, step.calls);
            controller.enqueue({
              type: "finish",
              usage: textUsage,
              finishReason: {
                unified: "tool-calls",
                raw: "tool-calls"
              }
            });
          } else {
            emitTextChunks(controller, step.text);
            controller.enqueue({
              type: "finish",
              usage: textUsage,
              finishReason: {
                unified: "stop",
                raw: "stop"
              }
            });
          }

          controller.close();
        }
      });

      return {
        stream
      };
    }
  } as LanguageModel;
}

export function createThinkSmokePlan(): ImplementerMockTurnStep[] {
  return [
    {
      type: "tool-calls",
      calls: [
        {
          toolName: "read_file",
          input: {
            path: "/workspace/code/repo/src/greeting.js"
          }
        },
        {
          toolName: "write_file",
          input: {
            path: "/workspace/code/repo/src/greeting.js",
            content:
              'export function makeGreeting(name = "Keystone") {\n  const subject = name;\n  return `Hello, ${subject}.`;\n}\n'
          }
        },
        {
          toolName: "run_bash",
          input: {
            command: "node --test",
            cwd: "/workspace/code/repo"
          }
        },
        {
          toolName: "write_file",
          input: {
            path: "/artifacts/out/implementer-summary.md",
            content:
              "# Think Smoke\n\nUpdated `src/greeting.js` and verified the fixture tests from the sandbox worktree.\n"
          }
        }
      ]
    },
    {
      type: "text",
      text: "Updated the greeting implementation, verified the tests, and staged a summary artifact."
    }
  ];
}

async function recordToolEvent(
  recordEvent: ImplementerToolDependencies["recordEvent"],
  event: ImplementerToolEvent
) {
  await recordEvent?.(event);
}

export function createImplementerTools(input: ImplementerToolDependencies): ToolSet {
  return {
    read_file: tool({
      description: "Read a file from /workspace, /artifacts/in, /artifacts/out, or /keystone.",
      inputSchema: z.object({
        path: z.string().trim().min(1)
      }),
      execute: async ({ path: targetPath }) => {
        await recordToolEvent(input.recordEvent, {
          eventType: "agent.tool_call",
          payload: {
            toolName: "read_file",
            path: targetPath
          }
        });

        const result = await readSandboxAgentFile(input, targetPath);

        await recordToolEvent(input.recordEvent, {
          eventType: "agent.tool_result",
          payload: {
            toolName: "read_file",
            path: targetPath,
            size: result.size,
            encoding: result.encoding
          }
        });

        return {
          path: targetPath,
          content: result.content,
          encoding: result.encoding,
          size: result.size
        };
      }
    }),
    list_files: tool({
      description: "List files from a path within the Keystone sandbox bridge roots.",
      inputSchema: z.object({
        path: z.string().trim().min(1),
        recursive: z.boolean().optional()
      }),
      execute: async ({ path: targetPath, recursive }) => {
        await recordToolEvent(input.recordEvent, {
          eventType: "agent.tool_call",
          payload: {
            toolName: "list_files",
            path: targetPath,
            recursive: recursive ?? false
          }
        });

        const result = await listSandboxAgentFiles(input, targetPath, {
          recursive: recursive ?? false,
          includeHidden: true
        });

        await recordToolEvent(input.recordEvent, {
          eventType: "agent.tool_result",
          payload: {
            toolName: "list_files",
            path: targetPath,
            count: result.count
          }
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
    write_file: tool({
      description: "Write or overwrite a file under /workspace or /artifacts/out.",
      inputSchema: z.object({
        path: z.string().trim().min(1),
        content: z.string(),
        ensureParent: z.boolean().optional()
      }),
      execute: async ({ path: targetPath, content, ensureParent }) => {
        await recordToolEvent(input.recordEvent, {
          eventType: "agent.tool_call",
          payload: {
            toolName: "write_file",
            path: targetPath,
            size: content.length
          }
        });

        if (ensureParent ?? true) {
          await mkdirSandboxAgentPath(input, path.dirname(targetPath), {
            recursive: true
          });
        }

        await writeSandboxAgentFile(input, targetPath, content);

        await recordToolEvent(input.recordEvent, {
          eventType: "agent.tool_result",
          payload: {
            toolName: "write_file",
            path: targetPath,
            size: content.length
          }
        });

        return {
          path: targetPath,
          bytesWritten: content.length
        };
      }
    }),
    run_bash: tool({
      description: "Execute a bash command inside the sandboxed task workspace.",
      inputSchema: z.object({
        command: z.string().trim().min(1),
        cwd: z.string().trim().min(1).optional(),
        timeoutMs: z.number().int().positive().max(120_000).optional()
      }),
      execute: async ({ command, cwd, timeoutMs }) => {
        await recordToolEvent(input.recordEvent, {
          eventType: "agent.tool_call",
          payload: {
            toolName: "run_bash",
            command,
            cwd: cwd ?? input.bridge.layout.workspaceRoot
          }
        });

        const result = await execSandboxAgentBash(input, {
          command,
          cwd,
          timeout: timeoutMs
        });

        await recordToolEvent(input.recordEvent, {
          eventType: "agent.tool_result",
          payload: {
            toolName: "run_bash",
            command,
            cwd: cwd ?? input.bridge.layout.workspaceRoot,
            exitCode: result.result.exitCode,
            success: result.result.success
          },
          severity: result.result.success ? "info" : "warning"
        });

        return {
          command: result.requestedCommand,
          resolvedCommand: result.resolvedCommand,
          cwd,
          exitCode: result.result.exitCode,
          stdout: result.result.stdout,
          stderr: result.result.stderr,
          success: result.result.success
        };
      }
    })
  };
}

export async function collectStagedArtifacts(
  session: ExecutionSession,
  bridge: SandboxAgentBridge
): Promise<AgentRuntimeArtifact[]> {
  const stagedOutputs = await listSandboxAgentStagedOutputs({
    session,
    bridge
  });

  return stagedOutputs.map((file) => ({
    path: file.absolutePath,
    kind: inferArtifactKind(file.absolutePath),
    contentType: inferContentType(file.absolutePath),
    metadata: {
      relativePath: file.relativePath,
      fileName: path.basename(file.absolutePath),
      sizeBytes: file.size
    }
  }));
}

export async function ensureStagedRunNoteArtifact(
  session: ExecutionSession,
  bridge: SandboxAgentBridge,
  summary: string
): Promise<AgentRuntimeArtifact[]> {
  const stagedArtifacts = await collectStagedArtifacts(session, bridge);

  if (stagedArtifacts.some((artifact) => artifact.kind === "run_note")) {
    return stagedArtifacts;
  }

  await writeSandboxAgentFile(
    {
      session,
      bridge
    },
    path.join(bridge.layout.artifactsOutRoot, synthesizedRunNoteFileName),
    buildSynthesizedRunNote(summary)
  );

  return collectStagedArtifacts(session, bridge);
}
