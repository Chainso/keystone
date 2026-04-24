import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";

import { buildProtectedBrowserHeaders, buildProtectedBrowserQuery } from "../../shared/api/browser-dev-auth";
import type { ConversationLocator } from "../runs/run-types";

type UseAgentChatOptions = Parameters<typeof useAgentChat>[0];

type CloudflareConversationOptions = Pick<
  UseAgentChatOptions,
  "body" | "onToolCall" | "tools"
>;

export function useCloudflareConversation(
  locator: ConversationLocator,
  options: CloudflareConversationOptions = {}
) {
  const agent = useAgent({
    agent: locator.agentClass,
    name: locator.agentName,
    query: buildProtectedBrowserQuery()
  });
  const chat = useAgentChat({
    agent,
    ...options,
    credentials: "same-origin",
    headers: buildProtectedBrowserHeaders()
  });

  return {
    agent,
    chat
  };
}
