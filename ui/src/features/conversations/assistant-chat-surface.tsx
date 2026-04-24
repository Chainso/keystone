import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  type AppendMessage,
  ComposerPrimitive,
  type DataMessagePartProps,
  type FileMessagePartProps,
  MessagePrimitive,
  type ReasoningGroupProps,
  type SourceMessagePartProps,
  ThreadPrimitive,
  type ToolCallMessagePartProps,
  useExternalStoreRuntime
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import {
  getToolApproval,
  getToolInput,
  getToolOutput,
  getToolPartState
} from "@cloudflare/ai-chat/react";
import { isToolUIPart, type UIMessage } from "ai";
import { AlertTriangleIcon, BotIcon, CheckIcon, LoaderCircleIcon, UserIcon, XIcon } from "lucide-react";
import { createContext, useContext, useMemo } from "react";
import remarkGfm from "remark-gfm";

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

function formatStructuredValue(value: unknown) {
  if (value === undefined) {
    return null;
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
    reason:
      typeof approvalRequest.reason === "string" ? approvalRequest.reason : undefined
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
      (candidate) => isToolUIPart(candidate) && candidate.toolCallId === toolCallId
    );

    if (part && isToolUIPart(part)) {
      return part;
    }
  }

  return null;
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

function toUserMessageParts(message: AppendMessage): UIMessage["parts"] {
  return message.content.flatMap((part) => {
    switch (part.type) {
      case "text":
        return part.text.trim().length > 0 ? [{ text: part.text, type: "text" as const }] : [];
      case "file":
        return [
          {
            filename: part.filename,
            mediaType: part.mimeType,
            type: "file" as const,
            url: part.data
          }
        ];
      default:
        return [];
    }
  });
}

function ConversationTextPart() {
  return (
    <MarkdownTextPrimitive
      className="conversation-markdown"
      remarkPlugins={[remarkGfm]}
    />
  );
}

function ConversationReasoningGroup({ children }: ReasoningGroupProps) {
  return (
    <details className="conversation-reasoning-group">
      <summary>Reasoning</summary>
      <div className="conversation-reasoning-body">{children}</div>
    </details>
  );
}

function ConversationSourcePart({ title, url }: SourceMessagePartProps) {
  return (
    <a
      className="conversation-attachment-card"
      href={url}
      rel="noreferrer"
      target="_blank"
    >
      <span className="conversation-attachment-label">Source</span>
      <span className="conversation-attachment-title">{title ?? url}</span>
    </a>
  );
}

function ConversationFilePart({ data, filename, mimeType }: FileMessagePartProps) {
  return (
    <a
      className="conversation-attachment-card"
      href={data}
      rel="noreferrer"
      target="_blank"
    >
      <span className="conversation-attachment-label">Attachment</span>
      <span className="conversation-attachment-title">{filename ?? mimeType}</span>
    </a>
  );
}

function ConversationDataPart({ data, name }: DataMessagePartProps) {
  const formattedValue = formatStructuredValue(data);

  return (
    <details className="conversation-data-card">
      <summary>{name.replace(/-/g, " ")}</summary>
      {formattedValue ? <pre>{formattedValue}</pre> : null}
    </details>
  );
}

function ConversationToolPart({
  isError,
  result,
  toolCallId,
  toolName
}: ToolCallMessagePartProps) {
  const chat = useConversationContext();
  const originalMessages = cloudflareAssistantMessageConverter.useOriginalMessages();
  const originalPart = useMemo(
    () => findOriginalToolPart(originalMessages, toolCallId),
    [originalMessages, toolCallId]
  );
  const fallbackApprovalRequest = getApprovalRequestResult(result);
  const toolState = originalPart
    ? getToolPartState(originalPart)
    : fallbackApprovalRequest
      ? "waiting-approval"
      : isError
        ? "error"
        : "complete";
  const approval = originalPart ? getToolApproval(originalPart) : fallbackApprovalRequest;
  const input = originalPart ? getToolInput(originalPart) : undefined;
  const output = originalPart ? getToolOutput(originalPart) ?? result : result;
  const formattedInput = formatStructuredValue(input);
  const formattedOutput = formatStructuredValue(output);
  const approvalId = typeof approval?.id === "string" ? approval.id : null;
  const approvalReason = getApprovalReason(approval);

  return (
    <section className="conversation-tool-card">
      <div className="conversation-tool-header">
        <div>
          <p className="conversation-tool-name">{toolName}</p>
          <p className="conversation-tool-status">
            {toolState === "waiting-approval"
              ? "Waiting for decision"
              : toolState === "approved"
                ? "Decision submitted"
                : toolState === "denied"
                  ? "Denied"
                  : toolState === "error"
                    ? "Error"
                    : toolState === "streaming"
                      ? "Running"
                      : toolState === "loading"
                        ? "Preparing"
                        : "Completed"}
          </p>
        </div>
      </div>

      {formattedInput ? (
        <div className="conversation-tool-section">
          <p className="conversation-tool-section-label">Input</p>
          <pre>{formattedInput}</pre>
        </div>
      ) : null}

      {toolState === "waiting-approval" && approvalId ? (
        <div className="conversation-tool-section">
          <p className="conversation-tool-section-label">Decision needed</p>
          <p className="conversation-tool-help">
            This tool call is waiting on a human decision before work can continue.
          </p>
          {approvalReason ? <p className="conversation-tool-help">{approvalReason}</p> : null}
          <div className="conversation-tool-actions">
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
              <CheckIcon />
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
              <XIcon />
              Reject
            </Button>
          </div>
        </div>
      ) : null}

      {toolState !== "waiting-approval" && formattedOutput ? (
        <div className="conversation-tool-section">
          <p className="conversation-tool-section-label">
            {toolState === "error" || toolState === "denied" ? "Outcome" : "Output"}
          </p>
          <pre>{formattedOutput}</pre>
        </div>
      ) : null}
    </section>
  );
}

function ConversationUserMessage() {
  return (
    <MessagePrimitive.Root className="conversation-message conversation-message-user">
      <p className="conversation-message-meta">
        <UserIcon aria-hidden="true" />
        You
      </p>
      <div className="conversation-bubble conversation-bubble-user">
        <MessagePrimitive.Parts
          components={{
            File: ConversationFilePart,
            Text: ConversationTextPart
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function ConversationAssistantMessage() {
  return (
    <MessagePrimitive.Root className="conversation-message conversation-message-assistant">
      <p className="conversation-message-meta">
        <BotIcon aria-hidden="true" />
        Keystone
      </p>
      <div className="conversation-bubble conversation-bubble-assistant">
        <MessagePrimitive.Parts
          components={{
            File: ConversationFilePart,
            Reasoning: ConversationTextPart,
            ReasoningGroup: ConversationReasoningGroup,
            Source: ConversationSourcePart,
            Text: ConversationTextPart,
            ToolGroup: ({ children }) => <div className="conversation-tool-group">{children}</div>,
            data: {
              Fallback: ConversationDataPart
            },
            tools: {
              Override: ConversationToolPart
            }
          }}
        />
      </div>
      <div className="conversation-message-footer">
        <ActionBarPrimitive.Root
          autohide="not-last"
          autohideFloat="single-branch"
          className="conversation-action-bar"
        >
          <ActionBarPrimitive.Copy className="conversation-action-button">
            Copy
          </ActionBarPrimitive.Copy>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

function ConversationSystemMessage() {
  return (
    <MessagePrimitive.Root className="conversation-message conversation-message-system">
      <div className="conversation-bubble conversation-bubble-system">
        <MessagePrimitive.Parts
          components={{
            Text: ConversationTextPart
          }}
        />
      </div>
    </MessagePrimitive.Root>
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
    metadata: {
      ...(conversation.chat.status === "error" && errorMessage ? { error: errorMessage } : null)
    }
  });
  const runtime = useExternalStoreRuntime(
    useMemo(
      () => ({
        isRunning,
        messages,
        onAddToolResult: async ({ isError, result, toolCallId, toolName }) => {
          conversation.chat.addToolOutput({
            ...(isError ? { errorText: serializeConversationError(result) } : null),
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
        <div className="conversation-surface">
          {conversation.chat.status === "error" && errorMessage ? (
            <div className="conversation-banner conversation-banner-error" role="alert">
              <AlertTriangleIcon aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <ThreadPrimitive.Root className="conversation-thread">
            <ThreadPrimitive.Viewport
              autoScroll
              className="conversation-thread-viewport"
            >
              <ThreadPrimitive.Empty>
                <div className="conversation-empty-state" role="status">
                  <p className="conversation-empty-title">{emptyTitle}</p>
                  <p className="conversation-empty-message">{emptyMessage}</p>
                </div>
              </ThreadPrimitive.Empty>

              <ThreadPrimitive.Messages
                components={{
                  AssistantMessage: ConversationAssistantMessage,
                  SystemMessage: ConversationSystemMessage,
                  UserMessage: ConversationUserMessage
                }}
              />
            </ThreadPrimitive.Viewport>

            <div className="conversation-thread-footer">
              <p className="conversation-thread-status">
                {isRunning ? <LoaderCircleIcon aria-hidden="true" className="conversation-spinner" /> : null}
                <span>{statusCopy}</span>
              </p>

              <ComposerPrimitive.Root className="conversation-composer">
                <ComposerPrimitive.Input
                  className="conversation-composer-input"
                  aria-label="Message Keystone"
                  placeholder={composerPlaceholder}
                />
                <div className="conversation-composer-actions">
                  <ComposerPrimitive.Cancel className="conversation-secondary-button">
                    Stop
                  </ComposerPrimitive.Cancel>
                  <ComposerPrimitive.Send className="conversation-primary-button">
                    Send
                  </ComposerPrimitive.Send>
                </div>
              </ComposerPrimitive.Root>
            </div>
          </ThreadPrimitive.Root>
        </div>
      </AssistantRuntimeProvider>
    </ConversationContext.Provider>
  );
}

export function AssistantChatSurface(props: AssistantChatSurfaceProps) {
  if (!props.locator) {
    return (
      <div className="conversation-surface">
        <div className="conversation-thread conversation-thread-unavailable">
          <div className="conversation-empty-state" role="status">
            <p className="conversation-empty-title">{props.unavailableTitle}</p>
            <p className="conversation-empty-message">{props.unavailableMessage}</p>
          </div>

          <div className="conversation-thread-footer">
            <p className="conversation-thread-status">Conversation unavailable</p>
            <div className="conversation-composer conversation-composer-disabled" aria-hidden="true">
              <div className="conversation-composer-input">Conversation input becomes available after a locator is attached.</div>
              <div className="conversation-composer-actions">
                <button type="button" className="conversation-secondary-button" disabled>
                  Stop
                </button>
                <button type="button" className="conversation-primary-button" disabled>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <AttachedAssistantChatSurface {...props} locator={props.locator} />;
}
