import { useState } from "react";

import {
  getProjectDocumentationSelection
} from "../resource-model/selectors";
import { useResourceModel } from "../resource-model/context";

export interface DocumentationTreeDocument {
  documentId: string;
  label: string;
  title: string;
  path: string;
  isSelected: boolean;
}

export interface DocumentationTreeGroup {
  groupId: string;
  label: string;
  documents: DocumentationTreeDocument[];
}

export interface DocumentationSelectedDocument {
  documentId: string;
  title: string;
  path: string;
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
  const { state } = useResourceModel();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const selection = getProjectDocumentationSelection(
    state.currentProjectId,
    selectedDocumentId,
    state.dataset
  );

  if (!selection) {
    throw new Error(`Project "${state.currentProjectId}" is missing documentation scaffold data.`);
  }

  return {
    title: "Project documentation",
    groups: selection.groups.map((group) => ({
      groupId: group.groupId,
      label: group.label,
      documents: group.documents.map((document) => ({
        documentId: document.documentId,
        label: document.label,
        title: document.title,
        path: document.path,
        isSelected: document.documentId === selection.selectedDocument.documentId
      }))
    })),
    selectedDocument: {
      documentId: selection.selectedDocument.documentId,
      title: selection.selectedDocument.title,
      path: selection.selectedDocument.path,
      viewerTitle: selection.selectedDocument.viewerTitle,
      contentLines: selection.selectedDocument.contentLines
    },
    selectDocument(documentId: string) {
      setSelectedDocumentId(documentId);
    }
  };
}
