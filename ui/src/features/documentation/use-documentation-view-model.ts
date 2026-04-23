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

function isFenceMarker(line: string) {
  return /^\s*(```|~~~)/.test(line);
}

function isHeadingLine(line: string) {
  return /^\s{0,3}#{1,6}\s+/.test(line);
}

function isListItemLine(line: string) {
  return /^\s*(?:[-*+]|\d+[.)])\s+/.test(line);
}

function isBlockquoteLine(line: string) {
  return /^\s*>/.test(line);
}

function isTableLine(line: string) {
  return /^\s*\|/.test(line);
}

function isIndentedCodeLine(line: string) {
  return /^(?: {4}|\t)/.test(line);
}

function shouldUseSingleLineBreak(input: {
  currentLine: string;
  inFence: boolean;
  previousLine: string;
}) {
  const { currentLine, inFence, previousLine } = input;

  if (currentLine.trim().length === 0 || previousLine.trim().length === 0) {
    return true;
  }

  if (inFence || isFenceMarker(previousLine) || isFenceMarker(currentLine)) {
    return true;
  }

  const previousIsListItem = isListItemLine(previousLine);
  const currentIsListItem = isListItemLine(currentLine);

  if (previousIsListItem && currentIsListItem) {
    return true;
  }

  if (currentIsListItem) {
    return true;
  }

  const previousIsBlockquote = isBlockquoteLine(previousLine);
  const currentIsBlockquote = isBlockquoteLine(currentLine);

  if ((previousIsBlockquote && currentIsBlockquote) || currentIsBlockquote) {
    return true;
  }

  const previousIsTable = isTableLine(previousLine);
  const currentIsTable = isTableLine(currentLine);

  if ((previousIsTable && currentIsTable) || currentIsTable) {
    return true;
  }

  if (isHeadingLine(previousLine)) {
    return true;
  }

  if (isIndentedCodeLine(previousLine) && isIndentedCodeLine(currentLine)) {
    return true;
  }

  return false;
}

export function buildDocumentationMarkdown(contentLines: string[]) {
  const lines = contentLines.map((line) => line.replace(/\r/g, ""));

  if (lines.length === 0) {
    return "";
  }

  let markdown = "";
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index] ?? "";

    if (markdown.length === 0) {
      markdown = currentLine;

      if (isFenceMarker(currentLine)) {
        inFence = !inFence;
      }

      continue;
    }

    const previousLine = lines[index - 1] ?? "";

    markdown = `${markdown}${shouldUseSingleLineBreak({
      currentLine,
      inFence,
      previousLine
    })
      ? "\n"
      : "\n\n"}${currentLine}`;

    if (isFenceMarker(currentLine)) {
      inFence = !inFence;
    }
  }

  return markdown;
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
      currentProjectLabel: project.displayName,
      documentCountLabel: "Compatibility only",
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
      currentProjectLabel: project.displayName,
      documentCountLabel: "0 documents",
      title: "Project documentation",
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
    title: "Project documentation",
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
      markdown: buildDocumentationMarkdown(selection.selectedDocument.contentLines)
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
