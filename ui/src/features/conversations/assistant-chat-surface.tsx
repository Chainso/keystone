import {
  AssistantRuntimeProvider,
  type AppendMessage,
  type ToolCallMessagePartComponent,
  type ToolCallMessagePartStatus,
  useExternalStoreRuntime
} from "@assistant-ui/react";
import {
  getToolApproval,
  getToolInput,
  getToolOutput,
  getToolPartState
} from "@cloudflare/ai-chat/react";
import { isToolUIPart, type UIMessage } from "ai";
import { AlertTriangleIcon, CheckIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { createContext, useContext, useMemo } from "react";

import { Thread } from "../../components/assistant-ui/thread";
import { ToolFallback } from "../../components/assistant-ui/tool-fallback";
import { Button } from "../../components/ui/button";
import type { ConversationLocator } from "../runs/run-types";
import { cloudflareAssistantMessageConverter } from "./assistant-message-converter";
import { useCloudflareConversation } from "./use-cloudflare-conversation";

interface AssistantChatSurfaceProps {
  composerPlaceholder: string;
  emptyMessage: string;
  emptyTitle: string;
  locator: ConversationLocator | null;
  unavailableMessage: string;
  unavailableTitle: string;
}

type ConversationContextValue = ReturnType<typeof useCloudflareConversation>["chat"];

const ConversationContext = createContext<ConversationContextValue | null>(null);

function useConversationContext() {
  const value = useContext(ConversationContext);

  if (!value) {
    throw new Error("Conversation context is unavailable.");
  }

  return value;
}

function serializeConversationError(error: unknown) {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Conversation failed.";
  }
}

function formatStructuredValue(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCloudflareDynamicToolPart(
  part: UIMessage["parts"][number]
): part is UIMessage["parts"][number] & {
  toolCallId: string;
  toolName: string;
  type: "dynamic-tool";
} {
  return (
    isJsonRecord(part) &&
    part.type === "dynamic-tool" &&
    typeof part.toolCallId === "string" &&
    typeof part.toolName === "string"
  );
}

function getApprovalRequestResult(value: unknown) {
  if (!isJsonRecord(value)) {
    return undefined;
  }

  const approvalRequest = value.approvalRequest;

  if (!isJsonRecord(approvalRequest)) {
    return undefined;
  }

  return {
    id: typeof approvalRequest.id === "string" ? approvalRequest.id : undefined,
    reason: typeof approvalRequest.reason === "string" ? approvalRequest.reason : undefined
  };
}

function getApprovalReason(value: unknown) {
  if (!isJsonRecord(value) || typeof value.reason !== "string") {
    return null;
  }

  return value.reason;
}

function findOriginalToolPart(messages: UIMessage[] | undefined, toolCallId: string) {
  for (const message of messages ?? []) {
    const messageParts = Array.isArray(message.parts) ? message.parts : [];
    const part = messageParts.find(
      (candidate) =>
        (isToolUIPart(candidate) || isCloudflareDynamicToolPart(candidate)) &&
        candidate.toolCallId === toolCallId
    );

    if (part && (isToolUIPart(part) || isCloudflareDynamicToolPart(part))) {
      return part;
    }
  }

  return null;
}

function toUserMessageParts(message: AppendMessage): UIMessage["parts"] {
  const parts: UIMessage["parts"] = [];

  for (const part of message.content) {
    switch (part.type) {
      case "text":
        if (part.text.trim().length > 0) {
          parts.push({ text: part.text, type: "text" });
        }
        break;
      case "file":
        parts.push({
          ...(part.filename ? { filename: part.filename } : {}),
          mediaType: part.mimeType,
          type: "file",
          url: part.data
        });
        break;
      default:
        break;
    }
  }

  return parts;
}

function toolStatusFromCloudflareState(
  state: ReturnType<typeof getToolPartState> | null,
  fallback: ToolCallMessagePartStatus | undefined,
  result: unknown
): ToolCallMessagePartStatus | undefined {
  switch (state) {
    case "loading":
    case "streaming":
      return { type: "running" };
    case "waiting-approval":
      return { reason: "interrupt", type: "requires-action" };
    case "error":
    case "denied":
      return { error: result, reason: "error", type: "incomplete" };
    case "approved":
    case "complete":
      return { type: "complete" };
    default:
      return fallback;
  }
}

const CloudflareToolFallback: ToolCallMessagePartComponent = (props) => {
  const chat = useConversationContext();
  const originalMessages = cloudflareAssistantMessageConverter.useOriginalMessages() as
    | UIMessage[]
    | undefined;
  const originalPart = useMemo(
    () => findOriginalToolPart(originalMessages, props.toolCallId),
    [originalMessages, props.toolCallId]
  );
  const fallbackApprovalRequest = getApprovalRequestResult(props.result);
  const toolState = originalPart
    ? getToolPartState(originalPart as Parameters<typeof getToolPartState>[0])
    : fallbackApprovalRequest
      ? "waiting-approval"
      : props.isError
        ? "error"
        : null;
  const approval = originalPart
    ? getToolApproval(originalPart as Parameters<typeof getToolApproval>[0])
    : fallbackApprovalRequest;
  const input = originalPart
    ? getToolInput(originalPart as Parameters<typeof getToolInput>[0])
    : undefined;
  const output = originalPart
    ? getToolOutput(originalPart as Parameters<typeof getToolOutput>[0]) ?? props.result
    : props.result;
  const status = toolStatusFromCloudflareState(toolState, props.status, output);
  const approvalId = typeof approval?.id === "string" ? approval.id : null;
  const approvalReason = getApprovalReason(approval);
  const argsText = props.argsText || formatStructuredValue(input);

  return (
    <ToolFallback.Root defaultOpen={toolState === "waiting-approval" || Boolean(props.isError)}>
      <ToolFallback.Trigger
        toolName={props.toolName}
        {...(status !== undefined ? { status } : {})}
      />
      <ToolFallback.Content>
        <ToolFallback.Args {...(argsText !== undefined ? { argsText } : {})} />
        {toolState === "waiting-approval" && approvalId ? (
          <div className="flex flex-col gap-3 border-t border-dashed px-4 pt-2">
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Decision needed</p>
              {approvalReason ? (
                <p className="text-muted-foreground text-sm">{approvalReason}</p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  This tool call is waiting on a human decision before work can continue.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  chat.addToolApprovalResponse({
                    approved: true,
                    id: approvalId
                  });
                }}
              >
                <CheckIcon data-icon="inline-start" />
                Approve
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => {
                  chat.addToolApprovalResponse({
                    approved: false,
                    id: approvalId
                  });
                }}
              >
                <XIcon data-icon="inline-start" />
                Reject
              </Button>
            </div>
          </div>
        ) : (
          <ToolFallback.Result result={output} />
        )}
      </ToolFallback.Content>
    </ToolFallback.Root>
  );
};

function ConversationUnavailable({
  unavailableMessage,
  unavailableTitle
}: Pick<AssistantChatSurfaceProps, "unavailableMessage" | "unavailableTitle">) {
  return (
    <div className="conversation-surface">
      <div className="grid min-h-[25rem] grid-rows-[1fr_auto] border border-border bg-background">
        <div className="grid place-items-center p-6 text-center">
          <div className="grid max-w-md gap-2">
            <p className="m-0 font-semibold text-xl">{unavailableTitle}</p>
            <p className="m-0 text-muted-foreground text-sm leading-6">{unavailableMessage}</p>
          </div>
        </div>
        <div className="border-t border-border bg-muted/30 p-3">
          <div
            className="rounded-[20px] border bg-background px-4 py-3 text-muted-foreground text-sm"
            aria-hidden="true"
          >
            Conversation unavailable
          </div>
          <p className="m-0 pt-2 text-muted-foreground text-xs">
            Conversation input becomes available after a locator is attached.
          </p>
        </div>
      </div>
    </div>
  );
}

function AttachedAssistantChatSurface({
  composerPlaceholder,
  emptyMessage,
  emptyTitle,
  locator
}: Omit<AssistantChatSurfaceProps, "unavailableMessage" | "unavailableTitle"> & {
  locator: ConversationLocator;
}) {
  const conversation = useCloudflareConversation(locator);
  const errorMessage = serializeConversationError(conversation.chat.error);
  const isRunning =
    conversation.chat.isStreaming ||
    conversation.chat.isServerStreaming ||
    conversation.chat.status === "submitted" ||
    conversation.chat.status === "streaming";
  const messages = cloudflareAssistantMessageConverter.useThreadMessages({
    isRunning,
    messages: conversation.chat.messages,
    metadata:
      conversation.chat.status === "error" && errorMessage
        ? { error: errorMessage }
        : {}
  });
  const runtime = useExternalStoreRuntime(
    useMemo(
      () => ({
        isRunning,
        messages,
        onAddToolResult: async ({ isError, result, toolCallId, toolName }) => {
          conversation.chat.addToolOutput({
            ...(isError ? { errorText: serializeConversationError(result) ?? "Tool failed." } : null),
            output: result,
            ...(toolName ? { toolName } : null),
            ...(isError ? { state: "output-error" as const } : null),
            toolCallId
          });
        },
        onCancel: async () => {
          conversation.chat.stop();
        },
        onNew: async (message: AppendMessage) => {
          const parts = toUserMessageParts(message);

          if (parts.length === 0) {
            return;
          }

          await Promise.resolve(
            conversation.chat.sendMessage({
              parts,
              role: "user"
            })
          );
        },
        unstable_capabilities: {
          copy: true
        }
      }),
      [conversation.chat, isRunning, messages]
    )
  );
  const statusCopy =
    conversation.chat.status === "error"
      ? "Conversation error"
      : isRunning
        ? "Streaming live"
        : "Conversation attached";

  return (
    <ConversationContext.Provider value={conversation.chat}>
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="conversation-surface grid gap-3">
          {conversation.chat.status === "error" && errorMessage ? (
            <div className="flex items-center gap-2 border border-destructive bg-destructive/10 px-3 py-2 text-sm" role="alert">
              <AlertTriangleIcon className="size-4" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          ) : null}
          <Thread
            ToolFallbackComponent={CloudflareToolFallback}
            className="h-[clamp(25rem,calc(100vh-22rem),34rem)] min-h-0"
            composerPlaceholder={composerPlaceholder}
            emptyMessage={emptyMessage}
            emptyTitle={emptyTitle}
          />
          <p className="m-0 inline-flex items-center gap-2 text-muted-foreground text-xs">
            {isRunning ? <LoaderCircleIcon aria-hidden="true" className="size-3 animate-spin" /> : null}
            <span>{statusCopy}</span>
          </p>
        </div>
      </AssistantRuntimeProvider>
    </ConversationContext.Provider>
  );
}

export function AssistantChatSurface(props: AssistantChatSurfaceProps) {
  if (!props.locator) {
    return (
      <ConversationUnavailable
        unavailableMessage={props.unavailableMessage}
        unavailableTitle={props.unavailableTitle}
      />
    );
  }

  return <AttachedAssistantChatSurface {...props} locator={props.locator} />;
}
