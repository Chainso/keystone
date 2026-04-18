import { PlaceholderScreen } from "../../shared/layout/placeholder-screen";

export function RunsScreen() {
  return (
    <PlaceholderScreen
      destination="Runs destination"
      title="Runs"
      summary={
        "This is the default Keystone landing route in Phase 1. The global shell and project-scoped navigation are now fixed, but the run index, stepper phases, and execution drill-down are still waiting on Phase 2."
      }
      lockedInThisPhase={[
        "The app lands in a project-scoped workspace instead of a raw API response.",
        "Runs owns the default route and keeps the persistent sidebar visible.",
        "Future run detail work now has a stable top-level destination to extend."
      ]}
      deferredWork={[
        "No run list, stage badges, or status table exists yet.",
        "Run detail, planning-phase layouts, and execution task drill-down are still placeholder-only.",
        "Live API loading remains out of scope for this phase."
      ]}
      nextSlice="Phase 2 adds the run index, the stepper rail for Specification through Execution, and the first execution-route shells."
    />
  );
}
