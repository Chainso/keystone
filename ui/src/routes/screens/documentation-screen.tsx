import { PlaceholderScreen } from "../../shared/layout/placeholder-screen";

export function DocumentationScreen() {
  return (
    <PlaceholderScreen
      destination="Documentation destination"
      title="Documentation"
      summary={
        "Documentation is present as a first-class route so the workspace shape matches the current spec from the start. Living product and architecture documents, trees, and note surfaces are still placeholder-only at this stage."
      }
      lockedInThisPhase={[
        "Documentation is a top-level destination in the persistent sidebar.",
        "Project-level knowledge now has a permanent home separate from run-specific work.",
        "The route is explicit about serving current project knowledge, not historical logs."
      ]}
      deferredWork={[
        "No document tree, editor, or live project document loading is implemented yet.",
        "Project document and decision-package backend gaps remain intentionally visible.",
        "Destination-specific sublayouts are deferred until a later phase."
      ]}
      nextSlice="A later phase can add the document tree, right-pane document focus, and placeholder adapters for the project document surfaces."
    />
  );
}
