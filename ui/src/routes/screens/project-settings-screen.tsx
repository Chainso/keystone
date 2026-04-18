import { PlaceholderScreen } from "../../shared/layout/placeholder-screen";

export function ProjectSettingsScreen() {
  return (
    <PlaceholderScreen
      destination="Project settings"
      title="Project settings"
      summary={
        "Project settings is locked in as a shell action now so the final workspace can keep configuration global and project-scoped. The actual tabs, rule editors, and environment controls remain placeholder-only until the later destination scaffold."
      }
      lockedInThisPhase={[
        "Settings stays a global project action in the stable sidebar.",
        "The route path is reserved for the shared project configuration surface.",
        "Future settings work can plug into the existing provider and shell boundaries."
      ]}
      deferredWork={[
        "The Overview, Components, Rules, and Environment tab layout is not built yet.",
        "No project update forms, validation, or backend wiring is implemented in this phase.",
        "Component-level rule overrides and env var editing are still deferred."
      ]}
      nextSlice="Phase 3 can layer the project configuration tabs and placeholder view models on top of this reserved route."
    />
  );
}
