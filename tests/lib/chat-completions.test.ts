import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  createChatCompletion,
  parseChatCompletionResponse,
  parseStructuredChatCompletion
} from "../../src/lib/llm/chat-completions";

describe("chat completions client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("parses streamed SSE chat completion chunks", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        [
          'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":1,"model":"gemini-3-flash-preview","choices":[{"index":0,"delta":{"role":"assistant","content":"{\\"ok\\":"},"finish_reason":null}],"usage":null}',
          "",
          'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":1,"model":"gemini-3-flash-preview","choices":[{"index":0,"delta":{"content":"true}"},"finish_reason":null}],"usage":null}',
          "",
          'data: {"id":"chatcmpl-1","object":"chat.completion.chunk","created":1,"model":"gemini-3-flash-preview","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":3,"completion_tokens":2,"total_tokens":5}}',
          "",
          "data: [DONE]",
          ""
        ].join("\n"),
        {
          status: 200,
          headers: {
            "content-type": "text/event-stream"
          }
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createChatCompletion({
      env: {
        KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:4001",
        KEYSTONE_CHAT_COMPLETIONS_MODEL: "gemini-3-flash-preview"
      },
      messages: [
        {
          role: "user",
          content: "Reply with JSON."
        }
      ]
    });

    expect(result.content).toBe('{"ok":true}');
    expect(result.finishReason).toBe("stop");
    expect(result.usage?.totalTokens).toBe(5);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4001/v1/chat/completions",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("extracts structured JSON from assistant content", () => {
    const parsed = parseStructuredChatCompletion(
      {
        content: '```json\n{"summary":"done","tasks":[{"taskId":"task-1","title":"Do it","summary":"S","instructions":["step"],"acceptanceCriteria":["done"],"dependsOn":[]}]}\n```'
      },
      z.object({
        summary: z.string(),
        tasks: z.array(
          z.object({
            taskId: z.string(),
            title: z.string(),
            summary: z.string(),
            instructions: z.array(z.string()),
            acceptanceCriteria: z.array(z.string()),
            dependsOn: z.array(z.string())
          })
        )
      })
    );

    expect(parsed.summary).toBe("done");
    expect(parsed.tasks).toHaveLength(1);
  });

  it("parses non-streaming JSON completions when provided", () => {
    const result = parseChatCompletionResponse(
      JSON.stringify({
        id: "chatcmpl-json",
        model: "gemini-3-flash-preview",
        choices: [
          {
            message: {
              role: "assistant",
              content: '{"ok":true}'
            },
            finish_reason: "stop"
          }
        ],
        usage: {
          total_tokens: 7
        }
      })
    );

    expect(result.content).toBe('{"ok":true}');
    expect(result.usage?.totalTokens).toBe(7);
  });
});
