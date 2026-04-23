import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import {
  getProject,
  getProjectDocumentationSelection
} from "../resource-model/selectors";
import { useResourceModel } from "../resource-model/context";
import { useCurrentProject } from "../projects/project-context";
import { buildMarkdownSourceFromLines } from "../../shared/markdown/source-markdown";
import { updateSearchParams } from "../../shared/navigation/search-param-state";

export interface DocumentationTreeDocument {
  documentId: string;
  href: string;
  label: string;
  title: string;
  path: string;
  isSelected: boolean;
}

export interface DocumentationTreeGroup {
  groupId: string;
  label: string;
  summary: string;
  documents: DocumentationTreeDocument[];
}

export interface DocumentationSelectedDocument {
  documentId: string;
  title: string;
  path: string;
  viewerTitle: string;
  markdown: string;
}

export interface DocumentationViewModel {
  compatibilityState?: {
    heading: string;
    message: string;
  };
  currentProjectLabel: string;
  documentCountLabel: string;
  title: string;
  groups: DocumentationTreeGroup[];
  selectedDocument: DocumentationSelectedDocument | null;
  selectDocument: (documentId: string) => void;
}

function formatDocumentCount(count: number) {
  return `${count} document${count === 1 ? "" : "s"}`;
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
        heading: "Documentation is not connected for this project yet",
        message:
          "Project documentation is currently available only for the sample Keystone Cloudflare project. Switch to that project to review the current Documentation surface."
      },
      currentProjectLabel: project.displayName,
      documentCountLabel: "Sample project only",
      title: "Documentation",
      groups: [],
      selectedDocument: null,
      selectDocument() {}
    };
  }

  if (!selection) {
    return {
      compatibilityState: {
        heading: "No documentation yet",
        message: `${project.displayName} does not have any project documentation yet.`
      },
      currentProjectLabel: project.displayName,
      documentCountLabel: "0 documents",
      title: "Documentation",
      groups: [],
      selectedDocument: null,
      selectDocument() {}
    };
  }

  const documentCount = selection.groups.reduce(
    (count, group) => count + group.documents.length,
    0
  );

  return {
    currentProjectLabel: project.displayName,
    documentCountLabel: formatDocumentCount(documentCount),
    title: "Documentation",
    groups: selection.groups.map((group) => ({
      groupId: group.groupId,
      label: group.label,
      summary: formatDocumentCount(group.documents.length),
      documents: group.documents.map((document) => ({
        documentId: document.documentId,
        href: `?${updateSearchParams(searchParams, {
          document: document.documentId
        }).toString()}`,
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
      markdown: buildMarkdownSourceFromLines(selection.selectedDocument.contentLines)
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
