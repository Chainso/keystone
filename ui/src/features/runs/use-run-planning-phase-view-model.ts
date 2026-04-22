import { useEffect, useRef, useState } from "react";

import { getRunPhaseDefinition } from "../../shared/navigation/run-phases";
import { useUnsavedChangesGuard } from "../../shared/navigation/use-unsaved-changes-guard";
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
    phaseSummary: phase.summary,
    phaseTitle: `${phase.label} conversation`
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
      phaseSummary: base.phaseSummary,
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
    phaseSummary: base.phaseSummary,
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
  const [title, setTitle] = useState(sourceDraft.title);
  const [body, setBody] = useState(sourceDraft.body);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const pendingEditorSourceKeyRef = useRef<string | null>(null);
  const createInFlightRef = useRef(false);
  const saveInFlightRef = useRef(false);

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

  async function startEditing() {
    setSubmitErrorMessage(null);

    if (planningState.status === "empty" && planningState.reason === "missing_document") {
      if (createInFlightRef.current) {
        return;
      }

      createInFlightRef.current = true;
      setIsCreating(true);

      try {
        const document = await actions.createPlanningDocument(phaseId);

        pendingEditorSourceKeyRef.current = buildPlanningDocumentSourceKey({
          documentId: document.documentId,
          reason: "missing_revision",
          revisionId: null,
          status: "empty"
        });
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

  const hasUnsavedChanges = body !== sourceDraft.body || title !== sourceDraft.title;
  const canSave =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    hasUnsavedChanges &&
    !isSubmitting;
  const hasPendingChanges = isEditing && (hasUnsavedChanges || isSubmitting);

  useUnsavedChangesGuard({
    message: `You have unsaved changes in ${phase.label}. Leave this document without saving?`,
    when: hasPendingChanges
  });

  async function saveChanges() {
    const trimmedTitle = title.trim();
    const canSaveNow =
      trimmedTitle.length > 0 &&
      body.trim().length > 0 &&
      hasUnsavedChanges;

    if (!canSaveNow || saveInFlightRef.current) {
      return;
    }

    saveInFlightRef.current = true;
    setIsSubmitting(true);
    setSubmitErrorMessage(null);

    try {
      await actions.savePlanningDocument(phaseId, {
        body,
        title: trimmedTitle
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
      bodyField: {
        label: "Document body",
        onChange: setBody,
        value: body
      },
      canSave,
      conversationLocator: base.conversationLocator,
      discardChanges,
      documentPath: base.documentPath,
      hasUnsavedChanges,
      helperMessage:
        planningState.status === "ready"
          ? "Saving creates a new current revision for this run document."
          : "Saving creates the first current revision for this run document.",
      isSubmitting,
      panelTitle: title.trim() || base.panelTitle,
      phaseSummary: base.phaseSummary,
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
      documentLines: planningState.content.split(/\r?\n/),
      documentPath: base.documentPath,
      editDocument: startEditing,
      panelTitle: planningState.revision.title,
      phaseSummary: base.phaseSummary,
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
      phaseSummary: base.phaseSummary,
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
