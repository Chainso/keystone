import { createMessageConverter } from "@assistant-ui/core/react";
import { type MessageStatus, type ThreadMessageLike } from "@assistant-ui/react";
import { getToolName, isDataUIPart, isToolUIPart, type UIMessage } from "ai";

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

function convertToolPart(part: UIMessage["parts"][number]) {
  if (!isToolUIPart(part)) {
    return [];
  }

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
          : undefined;

  return [
    {
      type: "tool-call" as const,
      ...(isJsonRecord(part.input) ? { args: part.input } : null),
      argsText: inputText,
      ...(result !== undefined ? { result } : null),
      ...(part.state === "output-error" || part.state === "output-denied"
        ? { isError: true }
        : null),
      toolCallId: part.toolCallId,
      toolName: getToolName(part)
    }
  ];
}

function convertMessagePart(part: UIMessage["parts"][number]): ThreadMessageLike["content"] {
  if (isToolUIPart(part)) {
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
          title: part.title,
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
          filename: part.filename,
          mimeType: part.mediaType,
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
    (part) => isToolUIPart(part) && part.state === "approval-requested"
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
  const content = message.parts.flatMap((part) => convertMessagePart(part));

  return {
    ...(message.role === "assistant"
      ? {
          status: getAssistantMessageStatus(message)
        }
      : null),
    content,
    id: message.id,
    role: message.role
  };
});
