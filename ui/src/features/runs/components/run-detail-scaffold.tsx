import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePageHeading,
  WorkspacePageSection
} from "../../../components/workspace/workspace-page";
import { StatusPill } from "../../../shared/layout/status-pill";
import { RunPhaseStepper } from "./run-phase-stepper";
import type { RunPhaseStepViewModel } from "../use-run-view-model";

interface RunDetailScaffoldProps {
  displayId: string;
  executionEngineLabel: string;
  summary: string;
  statusLabel: string;
  statusTone: ComponentProps<typeof StatusPill>["tone"];
  updatedLabel: string;
  phaseSteps: RunPhaseStepViewModel[];
  workflowInstanceId: string;
  children: ReactNode;
}

export function RunDetailScaffold({
  displayId,
  executionEngineLabel,
  summary,
  statusLabel,
  statusTone,
  updatedLabel,
  phaseSteps,
  workflowInstanceId,
  children
}: RunDetailScaffoldProps) {
  return (
    <WorkspacePage>
      <WorkspacePageHeader className="run-detail-header">
        <WorkspacePageHeading className="run-detail-heading">
          <Link to="/runs" className="back-link">
            Back to runs
          </Link>
          <p className="page-eyebrow">Run workspace</p>
          <h1 className="run-detail-title">{displayId}</h1>
          <p className="document-card-summary">{summary}</p>
        </WorkspacePageHeading>

        <div className="run-detail-meta-row" aria-label="Run details">
          <StatusPill label={statusLabel} tone={statusTone} />
          <p className="meta-chip">{`Workflow ${workflowInstanceId}`}</p>
          <p className="meta-chip">{`Engine ${executionEngineLabel}`}</p>
          <p className="meta-chip">{updatedLabel}</p>
        </div>
      </WorkspacePageHeader>

      <WorkspacePageSection className="run-detail-top-rail">
        <p className="page-section-eyebrow">Run stages</p>
        <RunPhaseStepper steps={phaseSteps} />
      </WorkspacePageSection>

      <div className="run-stage-body">{children}</div>
    </WorkspacePage>
  );
}
