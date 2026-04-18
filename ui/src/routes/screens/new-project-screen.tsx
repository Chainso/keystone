import { PlaceholderScreen } from "../../shared/layout/placeholder-screen";

export function NewProjectScreen() {
  return (
    <PlaceholderScreen
      destination="Project creation"
      title="New project"
      summary={
        "The create-project route already exists as a shell action so Phase 1 can freeze the global project controls. The configuration tabs and placeholder component flow are intentionally deferred until the destination-specific phase."
      }
      lockedInThisPhase={[
        "Project creation is expressed as a global action instead of a normal nav item.",
        "The route path is fixed before any form implementation begins.",
        "Later work can reuse the same project configuration surface without renaming routes."
      ]}
      deferredWork={[
        "Overview, Components, Rules, and Environment tabs are not scaffolded yet.",
        "There is no component type picker or form behavior in this phase.",
        "Project submission and validation remain out of scope."
      ]}
      nextSlice="Phase 3 is expected to add the shared project-configuration tabs and a placeholder Git repository component flow."
    />
  );
}
