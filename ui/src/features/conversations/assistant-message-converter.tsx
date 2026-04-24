import { createMessageConverter } from "@assistant-ui/core/react";
import { type MessageStatus, type ThreadMessageLike } from "@assistant-ui/react";
import { getToolName, isDataUIPart, isToolUIPart, type UIMessage } from "ai";

type ThreadMessageContent = Exclude<ThreadMessageLike["content"], string>;
type ThreadMessageContentPart = ThreadMessageContent[number];

function stringifyStructuredValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value);
  }
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type CloudflareDynamicToolPart = UIMessage["parts"][number] & {
  approval?: {
    approved?: boolean;
    id?: string;
    reason?: string;
  };
  errorText?: string;
  input?: unknown;
  output?: unknown;
  state?: string;
  toolCallId: string;
  toolName: string;
  type: "dynamic-tool";
};

function isCloudflareDynamicToolPart(
  part: UIMessage["parts"][number]
): part is CloudflareDynamicToolPart {
  return (
    isJsonRecord(part) &&
    part.type === "dynamic-tool" &&
    typeof part.toolCallId === "string" &&
    typeof part.toolName === "string"
  );
}

function convertToolPart(part: UIMessage["parts"][number]): ThreadMessageContentPart[] {
  const isStandardToolPart = isToolUIPart(part);

  if (!isStandardToolPart && !isCloudflareDynamicToolPart(part)) {
    return [];
  }

  const partRecord = part as Record<string, unknown>;
  const toolName = isStandardToolPart
    ? getToolName(part)
    : typeof partRecord.toolName === "string"
      ? partRecord.toolName
      : "tool";
  const inputText = stringifyStructuredValue(part.input);
  const result =
    part.state === "output-available"
      ? part.output
      : part.state === "output-error"
        ? { errorText: part.errorText }
        : part.state === "output-denied"
          ? {
              approval: {
                approved: false,
                reason: part.approval?.reason ?? null
              }
            }
          : part.state === "approval-requested"
            ? {
                approvalRequest: {
                  id: part.approval?.id ?? null,
                  reason: part.approval?.reason ?? null
                }
              }
          : undefined;

  const toolPart: ThreadMessageContentPart = {
    type: "tool-call",
    argsText: inputText,
    ...(result !== undefined ? { result } : {}),
    ...(part.state === "output-error" || part.state === "output-denied"
      ? { isError: true }
      : {}),
    toolCallId: part.toolCallId,
    toolName
  };

  return [toolPart];
}

function convertMessagePart(part: UIMessage["parts"][number]): ThreadMessageContentPart[] {
  if (isToolUIPart(part) || isCloudflareDynamicToolPart(part)) {
    return convertToolPart(part);
  }

  if (isDataUIPart(part)) {
    return [{ data: part.data, type: part.type }];
  }

  switch (part.type) {
    case "text":
      return [{ text: part.text, type: "text" }];
    case "reasoning":
      return [{ text: part.text, type: "reasoning" }];
    case "source-url":
      return [
        {
          id: part.sourceId,
          sourceType: "url",
          ...(part.title ? { title: part.title } : {}),
          type: "source",
          url: part.url
        }
      ];
    case "source-document":
      return [
        {
          data: {
            filename: part.filename,
            mediaType: part.mediaType,
            sourceId: part.sourceId,
            title: part.title
          },
          type: "data-source-document"
        }
      ];
    case "file":
      return [
        {
          data: part.url,
          mimeType: part.mediaType,
          ...(part.filename ? { filename: part.filename } : {}),
          type: "file"
        }
      ];
    case "step-start":
      return [];
    default:
      return [];
  }
}

function getAssistantMessageStatus(message: UIMessage): MessageStatus | undefined {
  const hasApprovalRequest = message.parts.some(
    (part) =>
      (isToolUIPart(part) || isCloudflareDynamicToolPart(part)) &&
      part.state === "approval-requested"
  );

  if (!hasApprovalRequest) {
    return undefined;
  }

  return {
    reason: "interrupt",
    type: "requires-action"
  };
}

export const cloudflareAssistantMessageConverter = createMessageConverter<UIMessage>((message) => {
  const content: ThreadMessageContentPart[] = message.parts.flatMap((part) =>
    convertMessagePart(part)
  );
  const status = message.role === "assistant" ? getAssistantMessageStatus(message) : undefined;

  const converted: ThreadMessageLike = {
    content,
    id: message.id,
    role: message.role
  };

  return status ? { ...converted, status } : converted;
});
