import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  buildChatCompletionsApiBaseUrl,
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
    const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}`;

    const fetchMock = vi.fn(async () =>
      new Response(
        [
          sseData({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: 1,
            model: "gpt-5.4",
            choices: [
              {
                index: 0,
                delta: {
                  role: "assistant"
                },
                finish_reason: null
              }
            ],
            usage: null
          }),
          "",
          sseData({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: 1,
            model: "gpt-5.4",
            choices: [
              {
                index: 0,
                delta: {
                  content: '{"'
                },
                finish_reason: null
              }
            ],
            usage: null
          }),
          "",
          sseData({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: 1,
            model: "gpt-5.4",
            choices: [
              {
                index: 0,
                delta: {
                  content: "response"
                },
                finish_reason: null
              }
            ],
            usage: null
          }),
          "",
          sseData({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: 1,
            model: "gpt-5.4",
            choices: [
              {
                index: 0,
                delta: {
                  content: '":"'
                },
                finish_reason: null
              }
            ],
            usage: null
          }),
          "",
          sseData({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: 1,
            model: "gpt-5.4",
            choices: [
              {
                index: 0,
                delta: {
                  content: "Under"
                },
                finish_reason: null
              }
            ],
            usage: null
          }),
          "",
          sseData({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: 1,
            model: "gpt-5.4",
            choices: [
              {
                index: 0,
                delta: {
                  content: "stood"
                },
                finish_reason: null
              }
            ],
            usage: null
          }),
          "",
          sseData({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: 1,
            model: "gpt-5.4",
            choices: [
              {
                index: 0,
                delta: {
                  content: '."'
                },
                finish_reason: null
              }
            ],
            usage: null
          }),
          "",
          sseData({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: 1,
            model: "gpt-5.4",
            choices: [
              {
                index: 0,
                delta: {
                  content: "}"
                },
                finish_reason: null
              }
            ],
            usage: null
          }),
          "",
          sseData({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: 1,
            model: "gpt-5.4",
            choices: [],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0
            }
          }),
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
        KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
        KEYSTONE_CHAT_COMPLETIONS_MODEL: "gpt-5.4"
      },
      messages: [
        {
          role: "user",
          content: "Reply with JSON."
        }
      ]
    });

    expect(result.content).toBe('{"response":"Understood."}');
    expect(result.finishReason).toBeNull();
    expect(result.usage?.totalTokens).toBe(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:10531/v1/chat/completions",
      expect.objectContaining({
        method: "POST"
      })
    );
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;

    expect(JSON.parse(String(calls[0]?.[1].body))).toEqual(
      expect.objectContaining({
        model: "gpt-5.4"
      })
    );
  });

  it("sends the compile-specific model when configured", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "chatcmpl-json",
          model: "gpt-5.4-mini",
          choices: [
            {
              message: {
                role: "assistant",
                content: '{"ok":true}'
              },
              finish_reason: "stop"
            }
          ]
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await createChatCompletion({
      env: {
        KEYSTONE_CHAT_COMPLETIONS_BASE_URL: "http://localhost:10531",
        KEYSTONE_CHAT_COMPLETIONS_MODEL: "gpt-5.4",
        KEYSTONE_COMPILE_CHAT_COMPLETIONS_MODEL: "gpt-5.4-mini"
      },
      messages: [
        {
          role: "user",
          content: "Reply with JSON."
        }
      ]
    });

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;

    expect(JSON.parse(String(calls[0]?.[1].body))).toEqual(
      expect.objectContaining({
        model: "gpt-5.4-mini"
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
        model: "gpt-5.4",
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

  it("normalizes the provider base URL to the shared /v1 root", () => {
    expect(buildChatCompletionsApiBaseUrl("http://localhost:10531")).toBe(
      "http://localhost:10531/v1"
    );
    expect(buildChatCompletionsApiBaseUrl("http://localhost:10531/v1")).toBe(
      "http://localhost:10531/v1"
    );
  });
});
