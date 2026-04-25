import { useCallback, useEffect, useRef, useState } from "react";

import { getRunPhaseDefinition } from "../../shared/navigation/run-phases";
import { useUnsavedChangesGuard } from "../../shared/navigation/use-unsaved-changes-guard";
import { buildMarkdownSourceSaveDraft } from "../../shared/markdown/source-markdown";
import {
  useReadyRunDetail
} from "./use-ready-run-detail";
import {
  canonicalDocumentPathByPhase,
  defaultRevisionTitleByPhase
} from "./run-planning-config";
import type { RunPlanningDocumentState } from "./run-detail-context";
import type { RunPlanningPhaseId } from "./run-types";
import type {
  RunPlanningPhaseEmptyViewModel,
  RunPlanningPhaseViewModel
} from "./run-view-model-types";

function buildPhaseBaseViewModel(
  phaseId: RunPlanningPhaseId,
  planningState: RunPlanningDocumentState
) {
  const phase = getRunPhaseDefinition(phaseId);

  return {
    conversationLocator: planningState.document?.conversation ?? null,
    documentPath: planningState.document?.path ?? canonicalDocumentPathByPhase[phaseId],
    panelTitle:
      planningState.status === "ready"
        ? planningState.revision.title
        : `${phase.label} document`,
    phaseTitle: `${phase.label} agent chat`
  };
}

function buildPlanningDocumentSourceKey(input: {
  documentId: string | null;
  reason: "missing_document" | "missing_revision" | null;
  revisionId: string | null;
  status: RunPlanningDocumentState["status"];
}) {
  return [
    input.status,
    input.documentId ?? "missing-document",
    input.revisionId ?? "missing-revision",
    input.reason ?? "none"
  ].join(":");
}

function getPlanningDocumentSourceKey(planningState: RunPlanningDocumentState) {
  return buildPlanningDocumentSourceKey({
    documentId: planningState.document?.documentId ?? null,
    reason: planningState.status === "empty" ? planningState.reason : null,
    revisionId: planningState.revision?.documentRevisionId ?? null,
    status: planningState.status
  });
}

function buildPlanningDraftSource(
  phaseId: RunPlanningPhaseId,
  planningState: RunPlanningDocumentState
) {
  if (planningState.status === "ready") {
    return {
      body: planningState.content,
      title: planningState.revision.title
    };
  }

  return {
    body: "",
    title: defaultRevisionTitleByPhase[phaseId]
  };
}

function buildPlanningEmptyViewModel(
  phaseId: RunPlanningPhaseId,
  planningState: Extract<RunPlanningDocumentState, { status: "empty" }>,
  base: ReturnType<typeof buildPhaseBaseViewModel>,
  input: {
    actionErrorMessage: string | null;
    isCreating: boolean;
    startEditing: () => void;
  }
): RunPlanningPhaseEmptyViewModel {
  const phase = getRunPhaseDefinition(phaseId);
  const label = phase.label.toLowerCase();

  if (planningState.reason === "missing_document") {
    return {
      actionErrorMessage: input.actionErrorMessage,
      actionLabel: input.isCreating ? "Creating document..." : `Create ${label} document`,
      conversationLocator: base.conversationLocator,
      documentPath: base.documentPath,
      emptyMessage: `This run does not have a ${label} document yet. Create it to start writing the current ${label}.`,
      emptyTitle: `No ${label} document yet`,
      isCreating: input.isCreating,
      panelTitle: base.panelTitle,
      phaseTitle: base.phaseTitle,
      startEditing: input.startEditing,
      state: "empty"
    };
  }

  return {
    actionErrorMessage: input.actionErrorMessage,
    actionLabel: "Write first revision",
    conversationLocator: base.conversationLocator,
    documentPath: base.documentPath,
    emptyMessage: `This ${label} document exists, but it does not have a current revision yet. Write the first revision to make it the current document surface.`,
    emptyTitle: `No current ${label} revision`,
    isCreating: input.isCreating,
    panelTitle: base.panelTitle,
    phaseTitle: base.phaseTitle,
    startEditing: input.startEditing,
    state: "empty"
  };
}

export function useRunPlanningPhaseViewModel(phaseId: RunPlanningPhaseId): RunPlanningPhaseViewModel {
  const { actions, state } = useReadyRunDetail();
  const phase = getRunPhaseDefinition(phaseId);
  const planningState = state.planningDocuments[phaseId];
  const base = buildPhaseBaseViewModel(phaseId, planningState);
  const sourceDraft = buildPlanningDraftSource(phaseId, planningState);
  const sourceKey = getPlanningDocumentSourceKey(planningState);
  const shouldAutoCreateDocument =
    planningState.status === "empty" && planningState.reason === "missing_document";
  const [title, setTitle] = useState(sourceDraft.title);
  const [body, setBody] = useState(sourceDraft.body);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const pendingEditorSourceKeyRef = useRef<string | null>(null);
  const createInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);
  const savedSourceDraft = buildMarkdownSourceSaveDraft(sourceDraft);
  const savedDraft = buildMarkdownSourceSaveDraft({
    body,
    title
  });

  useEffect(() => {
    const shouldEnterEditor = pendingEditorSourceKeyRef.current === sourceKey;

    createInFlightRef.current = false;
    pendingEditorSourceKeyRef.current = null;
    saveInFlightRef.current = false;
    setBody(sourceDraft.body);
    setIsCreating(false);
    setIsEditing(shouldEnterEditor);
    setIsSubmitting(false);
    setSubmitErrorMessage(null);
    setTitle(sourceDraft.title);
  }, [sourceDraft.body, sourceDraft.title, sourceKey]);

  const createMissingPlanningDocument = useCallback(async (input: { enterEditor: boolean }) => {
    if (createInFlightRef.current) {
      return;
    }

    createInFlightRef.current = true;
    setIsCreating(true);
    setSubmitErrorMessage(null);

    try {
      const document = await actions.createPlanningDocument(phaseId);

      if (input.enterEditor) {
        pendingEditorSourceKeyRef.current = buildPlanningDocumentSourceKey({
          documentId: document.documentId,
          reason: "missing_revision",
          revisionId: null,
          status: "empty"
        });
      }
    } catch (error) {
      setIsCreating(false);
      setSubmitErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : `Unable to create ${phase.label.toLowerCase()} document.`
      );
    } finally {
      createInFlightRef.current = false;
    }
  }, [actions, phase.label, phaseId]);

  useEffect(() => {
    if (!shouldAutoCreateDocument) {
      return;
    }

    void createMissingPlanningDocument({
      enterEditor: false
    });
  }, [createMissingPlanningDocument, shouldAutoCreateDocument, sourceKey]);

  async function startEditing() {
    setSubmitErrorMessage(null);

    if (planningState.status === "empty" && planningState.reason === "missing_document") {
      await createMissingPlanningDocument({
        enterEditor: true
      });

      return;
    }

    setIsEditing(true);
  }

  function discardChanges() {
    setBody(sourceDraft.body);
    setIsEditing(false);
    setIsSubmitting(false);
    setSubmitErrorMessage(null);
    setTitle(sourceDraft.title);
  }

  const hasUnsavedChanges =
    savedDraft.body !== savedSourceDraft.body ||
    savedDraft.title !== savedSourceDraft.title;
  const canSave =
    savedDraft.title.length > 0 &&
    savedDraft.body.trim().length > 0 &&
    hasUnsavedChanges &&
    !isSubmitting;
  const hasPendingChanges = isEditing && (hasUnsavedChanges || isSubmitting);

  useUnsavedChangesGuard({
    message: `You have unsaved changes in ${phase.label}. Leave this document without saving?`,
    when: hasPendingChanges
  });

  async function saveChanges() {
    const canSaveNow =
      savedDraft.title.length > 0 &&
      savedDraft.body.trim().length > 0 &&
      (savedDraft.body !== savedSourceDraft.body ||
        savedDraft.title !== savedSourceDraft.title);

    if (!canSaveNow || saveInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmitErrorMessage(null);

    try {
      await actions.savePlanningDocument(phaseId, {
        body: savedDraft.body,
        title: savedDraft.title
      });
    } catch (error) {
      setIsSubmitting(false);
      setSubmitErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : `Unable to save ${phase.label.toLowerCase()}.`
      );
    } finally {
      saveInFlightRef.current = false;
    }
  }

  if (isEditing) {
    return {
      canSave,
      conversationLocator: base.conversationLocator,
      discardChanges,
      documentEditor: {
        disabled: isSubmitting,
        editorLabel: "Document body",
        markdown: body,
        markdownSourceKey: sourceKey,
        onChange: setBody,
        placeholder: `Write the current ${phase.label.toLowerCase()} in markdown.`,
      },
      documentPath: base.documentPath,
      hasUnsavedChanges,
      isSubmitting,
      panelTitle: title.trim() || base.panelTitle,
      phaseTitle: base.phaseTitle,
      saveChanges,
      saveLabel: isSubmitting ? "Saving changes..." : "Save changes",
      state: "editing",
      submitErrorMessage,
      titleField: {
        label: "Document title",
        onChange: setTitle,
        value: title
      }
    };
  }

  if (planningState.status === "ready") {
    return {
      conversationLocator: base.conversationLocator,
      documentMarkdown: planningState.content,
      documentPath: base.documentPath,
      editDocument: startEditing,
      panelTitle: planningState.revision.title,
      phaseTitle: base.phaseTitle,
      state: "ready"
    };
  }

  if (planningState.status === "error") {
    return {
      conversationLocator: base.conversationLocator,
      documentPath: base.documentPath,
      errorMessage: planningState.errorMessage,
      errorTitle: `Unable to load ${phase.label.toLowerCase()}`,
      panelTitle: base.panelTitle,
      phaseTitle: base.phaseTitle,
      retry: () => {
        void actions.reload();
      },
      state: "error"
    };
  }

  return buildPlanningEmptyViewModel(phaseId, planningState, base, {
    actionErrorMessage: submitErrorMessage,
    isCreating,
    startEditing
  });
}
