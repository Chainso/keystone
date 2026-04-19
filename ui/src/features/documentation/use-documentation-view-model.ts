import { useState } from "react";

import {
  defaultDocumentId,
  documentationGroups,
  findDocumentationDocument
} from "./documentation-scaffold";

export interface DocumentationTreeDocument {
  documentId: string;
  label: string;
  isSelected: boolean;
}

export interface DocumentationTreeGroup {
  groupId: string;
  label: string;
  documents: DocumentationTreeDocument[];
}

export interface DocumentationSelectedDocument {
  documentId: string;
  viewerTitle: string;
  contentLines: string[];
}

export interface DocumentationViewModel {
  title: string;
  groups: DocumentationTreeGroup[];
  selectedDocument: DocumentationSelectedDocument;
  selectDocument: (documentId: string) => void;
}

export function useDocumentationViewModel(): DocumentationViewModel {
  const [selectedDocumentId, setSelectedDocumentId] = useState(defaultDocumentId);

  const selectedDocument =
    findDocumentationDocument(selectedDocumentId) ?? findDocumentationDocument(defaultDocumentId);

  if (!selectedDocument) {
    throw new Error("Documentation scaffold is missing its default document.");
  }

  return {
    title: "Project documentation",
    groups: documentationGroups.map((group) => ({
      groupId: group.groupId,
      label: group.label,
      documents: group.documents.map((document) => ({
        documentId: document.documentId,
        label: document.label,
        isSelected: document.documentId === selectedDocument.documentId
      }))
    })),
    selectedDocument: {
      documentId: selectedDocument.documentId,
      viewerTitle: selectedDocument.viewerTitle,
      contentLines: selectedDocument.contentLines
    },
    selectDocument(documentId: string) {
      setSelectedDocumentId(documentId);
    }
  };
}
