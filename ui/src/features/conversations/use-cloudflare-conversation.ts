import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";

import { buildProtectedBrowserHeaders, buildProtectedBrowserQuery } from "../../shared/api/browser-dev-auth";
import type { ConversationLocator } from "../runs/run-types";

export function useCloudflareConversation(locator: ConversationLocator) {
  const agent = useAgent({
    agent: locator.agentClass,
    name: locator.agentName,
    query: buildProtectedBrowserQuery()
  });
  const chat = useAgentChat({
    agent,
    credentials: "same-origin",
    headers: buildProtectedBrowserHeaders()
  });

  return {
    agent,
    chat
  };
}
