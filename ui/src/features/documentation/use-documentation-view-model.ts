import { useState } from "react";

import { useCurrentProject } from "../projects/project-context";

interface DocumentationEntryScaffold {
  documentId: string;
  label: string;
  summary: string;
  viewerTitle: string;
  viewerSummary: string;
  currentState: string[];
  backendCoverage: string[];
  deferredWork: string[];
}

interface DocumentationGroupScaffold {
  groupId: string;
  label: string;
  summary: string;
  documents: DocumentationEntryScaffold[];
}

const documentationGroups: DocumentationGroupScaffold[] = [
  {
    groupId: "product-specifications",
    label: "Product Specifications",
    summary: "Current product intent lives here instead of inside run-local chat history.",
    documents: [
      {
        documentId: "product-spec-current",
        label: "Current",
        summary: "The living product specification for the selected project.",
        viewerTitle: "Current living product specification",
        viewerSummary:
          "Documentation keeps the current product direction visible without pretending project-backed document persistence is already wired into the UI.",
        currentState: [
          "The tree and viewer are now fixed as project-scoped documentation surfaces in the workspace shell.",
          "This screen is about current knowledge, not historical run transcripts or changelog-style archives."
        ],
        backendCoverage: [
          "`GET /v1/projects/:projectId/documents` exists today, but it still returns an empty typed stub collection.",
          "Decision packages remain separate from project documentation and still surface as stub-backed project resources."
        ],
        deferredWork: [
          "There is no live document query, editor state, or version history in Phase 3.",
          "Document selection is local placeholder state only until real project-backed content lands."
        ]
      }
    ]
  },
  {
    groupId: "technical-architecture",
    label: "Technical Architecture",
    summary: "Architecture decisions stay project-scoped and current.",
    documents: [
      {
        documentId: "architecture-current",
        label: "Current",
        summary: "The current architecture and decision record for the project.",
        viewerTitle: "Current architecture and decisions",
        viewerSummary:
          "The architecture surface stays explicit about the Worker-plus-SPA runtime boundary while leaving deeper document handling for a later phase.",
        currentState: [
          "Architecture remains a living reference and does not get demoted to a historical appendix.",
          "The shell now has a dedicated documentation destination instead of forcing architecture references to hide inside run detail."
        ],
        backendCoverage: [
          "The current `v1` APIs already expose the project and run seams that future document adapters will read against.",
          "Project-level architecture documents are still stub-backed, so this viewer intentionally uses fixed placeholder sections."
        ],
        deferredWork: [
          "No live architecture rendering, ADR threading, or approval surfaces are implemented here.",
          "Cross-linking between run artifacts and project docs stays out of scope for this phase."
        ]
      }
    ]
  },
  {
    groupId: "miscellaneous-notes",
    label: "Miscellaneous Notes",
    summary: "Loose project knowledge has a stable home outside the run stepper.",
    documents: [
      {
        documentId: "research-notes",
        label: "Research notes",
        summary: "Open investigation notes that inform the current project state.",
        viewerTitle: "Research notes",
        viewerSummary:
          "Miscellaneous notes remain project-scoped and intentionally lightweight so the documentation surface can grow without changing its route or layout ownership.",
        currentState: [
          "Miscellaneous notes are grouped beside product and architecture documents inside the same destination.",
          "The viewer keeps the selected note in focus without introducing a second app frame or modal flow."
        ],
        backendCoverage: [
          "Project-document persistence is still stub-backed, so this note content is scaffold-owned for now.",
          "The tree shape is in place before any document taxonomy or filtering logic is finalized."
        ],
        deferredWork: [
          "No search, note creation, or collaborative editing is implemented.",
          "Real note trees and document metadata are deferred until the project-document backend grows beyond its current stub."
        ]
      },
      {
        documentId: "open-questions",
        label: "Open questions",
        summary: "Tracked unknowns that still need product or architecture resolution.",
        viewerTitle: "Open questions",
        viewerSummary:
          "This placeholder keeps unresolved project questions visible inside Documentation without implying there is already a live document workflow behind it.",
        currentState: [
          "Documentation now has room for lighter-weight notes that do not belong in the run stepper.",
          "The viewer can switch between multiple note records using local state while the backend remains stub-backed."
        ],
        backendCoverage: [
          "`GET /v1/projects/:projectId/documents` will eventually back this note list when project documents become durable.",
          "The UI keeps the project-document gap explicit so placeholder content does not masquerade as stored records."
        ],
        deferredWork: [
          "No project-wide search, tagging, or open-question resolution flow exists yet.",
          "Selecting a note only updates the local placeholder viewer in Phase 3."
        ]
      }
    ]
  }
];

const defaultDocumentId = documentationGroups[0]?.documents[0]?.documentId ?? "";

function findSelectedDocument(documentId: string) {
  return documentationGroups
    .flatMap((group) => group.documents)
    .find((document) => document.documentId === documentId);
}

export function useDocumentationViewModel() {
  const project = useCurrentProject();
  const [selectedDocumentId, setSelectedDocumentId] = useState(defaultDocumentId);

  const selectedDocument = findSelectedDocument(selectedDocumentId) ?? findSelectedDocument(defaultDocumentId);

  if (!selectedDocument) {
    throw new Error("Documentation scaffold is missing its default document.");
  }

  return {
    title: "Project documentation",
    summary: `${project.displayName} now has a dedicated project-scoped documentation surface for living product, architecture, and note material outside a single run.`,
    stubNote:
      "Project documents and decision packages are still backend stubs, so the tree and viewer stay intentionally placeholder-backed in Phase 3.",
    groups: documentationGroups.map((group) => ({
      groupId: group.groupId,
      label: group.label,
      summary: group.summary,
      documents: group.documents.map((document) => ({
        documentId: document.documentId,
        label: document.label,
        summary: document.summary,
        isSelected: document.documentId === selectedDocument.documentId
      }))
    })),
    selectedDocument,
    selectDocument(documentId: string) {
      setSelectedDocumentId(documentId);
    }
  };
}
