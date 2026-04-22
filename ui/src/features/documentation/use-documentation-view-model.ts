import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import {
  getProject,
  getProjectDocumentationSelection
} from "../resource-model/selectors";
import { useResourceModel } from "../resource-model/context";
import { useCurrentProject } from "../projects/project-context";
import { updateSearchParams } from "../../shared/navigation/search-param-state";

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
  compatibilityState?: {
    heading: string;
    message: string;
  };
  title: string;
  groups: DocumentationTreeGroup[];
  selectedDocument: DocumentationSelectedDocument | null;
  selectDocument: (documentId: string) => void;
}

export function useDocumentationViewModel(): DocumentationViewModel {
  const { state } = useResourceModel();
  const project = useCurrentProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedDocumentId = searchParams.get("document");
  const scaffoldProject = getProject(project.projectId, state.dataset);
  const selection = scaffoldProject
    ? getProjectDocumentationSelection(
        project.projectId,
        requestedDocumentId,
        state.dataset
      )
    : null;
  const selectedDocumentId = selection?.selectedDocument.documentId ?? null;

  useEffect(() => {
    if (
      !requestedDocumentId ||
      !selectedDocumentId ||
      requestedDocumentId === selectedDocumentId
    ) {
      return;
    }

    setSearchParams(
      updateSearchParams(searchParams, {
        document: selectedDocumentId
      }),
      { replace: true }
    );
  }, [requestedDocumentId, searchParams, selectedDocumentId, setSearchParams]);

  if (!scaffoldProject) {
    return {
      compatibilityState: {
        heading: "Documentation is not available for this project yet",
        message:
          "Project documentation still depends on scaffold-backed data. Switch to a scaffold-backed project to use this screen."
      },
      title: "Project documentation",
      groups: [],
      selectedDocument: null,
      selectDocument() {}
    };
  }

  if (!selection) {
    return {
      compatibilityState: {
        heading: "No project documentation yet",
        message: `${project.displayName} does not have any project-scoped documentation in the scaffold dataset yet.`
      },
      title: "Project documentation",
      groups: [],
      selectedDocument: null,
      selectDocument() {}
    };
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
      setSearchParams(
        updateSearchParams(searchParams, {
          document: documentId
        })
      );
    }
  };
}
