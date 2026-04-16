import { z } from "zod";

import type { WorkerBindings } from "../../env";

export const chatMessageRoleValues = ["system", "user", "assistant"] as const;

export const chatCompletionMessageSchema = z.object({
  role: z.enum(chatMessageRoleValues),
  content: z.string().min(1)
});

const usageSchema = z
  .object({
    prompt_tokens: z.number().int().nonnegative().optional(),
    completion_tokens: z.number().int().nonnegative().optional(),
    total_tokens: z.number().int().nonnegative().optional()
  })
  .partial();

const jsonCompletionResponseSchema = z.object({
  id: z.string().trim().min(1),
  model: z.string().trim().min(1).optional(),
  choices: z
    .array(
      z.object({
        message: z.object({
          role: z.string().trim().min(1).optional(),
          content: z.string().nullable().optional()
        }),
        finish_reason: z.string().nullable().optional()
      })
    )
    .min(1),
  usage: usageSchema.optional().nullable()
});

const streamedChunkSchema = z.object({
  id: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            role: z.string().trim().min(1).optional(),
            content: z.string().optional()
          })
          .optional()
          .default({}),
        finish_reason: z.string().nullable().optional()
      })
    )
    .min(1),
  usage: usageSchema.optional().nullable()
});

export type ChatCompletionMessage = z.infer<typeof chatCompletionMessageSchema>;

export interface ChatCompletionUsage {
  promptTokens?: number | undefined;
  completionTokens?: number | undefined;
  totalTokens?: number | undefined;
}

export interface ChatCompletionResult {
  id: string;
  model: string;
  content: string;
  finishReason?: string | null | undefined;
  usage?: ChatCompletionUsage | undefined;
  rawText: string;
}

export interface CreateChatCompletionInput {
  env: Pick<WorkerBindings, "KEYSTONE_CHAT_COMPLETIONS_BASE_URL" | "KEYSTONE_CHAT_COMPLETIONS_MODEL">;
  messages: ChatCompletionMessage[];
  temperature?: number | undefined;
}

function buildChatCompletionsUrl(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  return new URL("v1/chat/completions", normalizedBaseUrl).toString();
}

function mapUsage(
  usage: z.infer<typeof usageSchema> | null | undefined
): ChatCompletionUsage | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens
  };
}

function parseStreamedChatCompletion(rawText: string): ChatCompletionResult {
  const chunks = rawText
    .split(/\r?\n\r?\n/)
    .flatMap((eventBlock) =>
      eventBlock
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
    )
    .filter((value) => value.length > 0 && value !== "[DONE]");

  const contentParts: string[] = [];
  let completionId = "";
  let model = "";
  let finishReason: string | null | undefined;
  let usage: ChatCompletionUsage | undefined;

  for (const chunk of chunks) {
    const parsedChunk = streamedChunkSchema.parse(JSON.parse(chunk));

    if (!completionId && parsedChunk.id) {
      completionId = parsedChunk.id;
    }

    if (!model && parsedChunk.model) {
      model = parsedChunk.model;
    }

    if (parsedChunk.usage) {
      usage = mapUsage(parsedChunk.usage);
    }

    for (const choice of parsedChunk.choices) {
      if (choice.delta?.content) {
        contentParts.push(choice.delta.content);
      }

      if (choice.finish_reason !== undefined) {
        finishReason = choice.finish_reason;
      }
    }
  }

  const content = contentParts.join("").trim();

  if (!content) {
    throw new Error("Chat completions stream ended without assistant content.");
  }

  return {
    id: completionId || crypto.randomUUID(),
    model: model || "unknown",
    content,
    finishReason,
    usage,
    rawText
  };
}

function parseJsonChatCompletion(rawText: string): ChatCompletionResult {
  const parsed = jsonCompletionResponseSchema.parse(JSON.parse(rawText));
  const firstChoice = parsed.choices[0];

  if (!firstChoice) {
    throw new Error("Chat completions response did not include any choices.");
  }

  const content = firstChoice.message.content?.trim();

  if (!content) {
    throw new Error("Chat completions response did not include assistant content.");
  }

  return {
    id: parsed.id,
    model: parsed.model ?? "unknown",
    content,
    finishReason: firstChoice.finish_reason,
    usage: mapUsage(parsed.usage),
    rawText
  };
}

export function parseChatCompletionResponse(rawText: string) {
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new Error("Chat completions response body was empty.");
  }

  if (trimmed.startsWith("data:")) {
    return parseStreamedChatCompletion(rawText);
  }

  return parseJsonChatCompletion(rawText);
}

export function parseStructuredChatCompletion<T extends z.ZodTypeAny>(
  result: Pick<ChatCompletionResult, "content">,
  schema: T
): z.infer<T> {
  const directCandidates = [result.content];
  const fencedMatch = result.content.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    directCandidates.push(fencedMatch[1]);
  }

  const firstObjectStart = result.content.indexOf("{");
  const lastObjectEnd = result.content.lastIndexOf("}");

  if (firstObjectStart >= 0 && lastObjectEnd > firstObjectStart) {
    directCandidates.push(result.content.slice(firstObjectStart, lastObjectEnd + 1));
  }

  for (const candidate of directCandidates) {
    try {
      return schema.parse(JSON.parse(candidate));
    } catch {
      continue;
    }
  }

  throw new Error("Assistant response did not contain valid structured JSON.");
}

export async function createChatCompletion(
  input: CreateChatCompletionInput
): Promise<ChatCompletionResult> {
  const response = await fetch(buildChatCompletionsUrl(input.env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL), {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: input.env.KEYSTONE_CHAT_COMPLETIONS_MODEL,
      messages: input.messages.map((message) => chatCompletionMessageSchema.parse(message)),
      temperature: input.temperature ?? 0,
      stream: true
    })
  });
  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Chat completions request failed with ${response.status}: ${rawText.slice(0, 500)}`
    );
  }

  return parseChatCompletionResponse(rawText);
}
