import { PlaceholderScreen } from "../../shared/layout/placeholder-screen";

export function WorkstreamsScreen() {
  return (
    <PlaceholderScreen
      destination="Workstreams destination"
      title="Workstreams"
      summary={
        "Workstreams is already reserved as a live operational destination even though the list and task-routing behavior are not built yet. This keeps the workspace spec intact and prevents later route churn."
      }
      lockedInThisPhase={[
        "Workstreams is part of the global information architecture from day one.",
        "The shell now communicates that project-wide work exists outside a single run view.",
        "Future rows can route back into run execution without changing the top-level shell."
      ]}
      deferredWork={[
        "There is no active or queued work list yet.",
        "Task routing back into Runs > Execution is not implemented in Phase 1.",
        "Filtering, sorting, and live status data remain out of scope."
      ]}
      nextSlice="A later phase can introduce the list scaffold, row affordances, and the bridge back into execution task detail."
    />
  );
}
