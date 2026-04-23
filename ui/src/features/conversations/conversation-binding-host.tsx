import type { ConversationLocator } from "../runs/run-types";
import { useCloudflareConversation } from "./use-cloudflare-conversation";

function AttachedConversationBindingHost({
  locator
}: {
  locator: ConversationLocator;
}) {
  useCloudflareConversation(locator);

  return null;
}

export function ConversationBindingHost({
  locator
}: {
  locator: ConversationLocator | null;
}) {
  if (!locator) {
    return null;
  }

  return <AttachedConversationBindingHost locator={locator} />;
}
