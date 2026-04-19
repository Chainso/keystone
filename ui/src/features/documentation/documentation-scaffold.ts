export interface DocumentationEntryScaffold {
  documentId: string;
  label: string;
  viewerTitle: string;
  contentLines: string[];
}

export interface DocumentationGroupScaffold {
  groupId: string;
  label: string;
  documents: DocumentationEntryScaffold[];
}

export const documentationGroups: DocumentationGroupScaffold[] = [
  {
    groupId: "product-specifications",
    label: "Product Specifications",
    documents: [
      {
        documentId: "product-spec-current",
        label: "Current",
        viewerTitle: "current living product specification",
        contentLines: [
          "Operator work stays organized around Runs, Documentation, Workstreams, and project settings inside one workspace.",
          "This document captures the current product state instead of preserving run-by-run chat history as the source of truth.",
          "The current direction keeps Documentation project-scoped and Workstreams focused on active task handoff into execution."
        ]
      }
    ]
  },
  {
    groupId: "technical-architecture",
    label: "Technical Architecture",
    documents: [
      {
        documentId: "architecture-current",
        label: "Current",
        viewerTitle: "current living architecture + decisions",
        contentLines: [
          "The product runs as a Cloudflare-served SPA with route-owned destinations and feature-owned rendering surfaces.",
          "Run detail owns planning and execution views, while Documentation and Workstreams stay project-level destinations.",
          "The shared shell provides navigation and layout primitives without turning every destination into one large route module."
        ]
      }
    ]
  },
  {
    groupId: "miscellaneous-notes",
    label: "Miscellaneous Notes",
    documents: [
      {
        documentId: "research-notes",
        label: "Research notes",
        viewerTitle: "research notes",
        contentLines: [
          "Navigation, table structure, and document ownership were all simplified to match the canonical workspace boards.",
          "Documentation stays focused on current project knowledge rather than execution-only artifacts.",
          "Workstreams keeps the operational task list visible without adding another frame or side rail."
        ]
      },
      {
        documentId: "open-questions",
        label: "Open questions",
        viewerTitle: "open questions",
        contentLines: [
          "How should current project documents evolve once editing and persistence are added?",
          "What navigation affordances belong in the execution task view versus the project-level workstreams table?",
          "Which document relationships should stay project-scoped when richer run artifacts arrive?"
        ]
      }
    ]
  }
];

export const defaultDocumentId = documentationGroups[0]?.documents[0]?.documentId ?? "";

export function findDocumentationDocument(documentId: string) {
  return documentationGroups
    .flatMap((group) => group.documents)
    .find((document) => document.documentId === documentId);
}
