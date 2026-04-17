export type RpcInitializableAgent = {
  __unsafe_ensureInitialized?: (() => Promise<void>) | undefined;
};

export async function ensureThinkRpcInitialization(agent: RpcInitializableAgent) {
  // Think session state is created during onStart(); raw RPC entry can reach
  // user methods before that happens unless we force PartyServer init first.
  await agent.__unsafe_ensureInitialized?.();
}
