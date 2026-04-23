import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  WorkspacePage
} from "../../../components/workspace/workspace-page";
import { StatusPill } from "../../../shared/layout/status-pill";
import { RunPhaseStepper } from "./run-phase-stepper";
import type { RunPhaseStepViewModel } from "../use-run-view-model";

interface RunDetailScaffoldProps {
  displayId: string;
  summary: string;
  statusLabel: string;
  statusTone: ComponentProps<typeof StatusPill>["tone"];
  updatedLabel: string;
  phaseSteps: RunPhaseStepViewModel[];
  children: ReactNode;
}

export function RunDetailScaffold({
  displayId,
  summary,
  statusLabel,
  statusTone,
  updatedLabel,
  phaseSteps,
  children
}: RunDetailScaffoldProps) {
  return (
    <WorkspacePage className="run-detail-shell">
      <header className="run-detail-rail" aria-label="Run details">
        <div className="run-detail-identity">
          <div className="run-detail-topline">
            <Link to="/runs" className="back-link">
              Back to runs
            </Link>
            <span className="document-name">Run workspace</span>
          </div>
          <div className="run-detail-headline">
            <h1 className="run-detail-title">{displayId}</h1>
            <StatusPill label={statusLabel} tone={statusTone} />
            <p className="document-name">{updatedLabel}</p>
          </div>
          <p className="run-detail-summary">{summary}</p>
        </div>
        <RunPhaseStepper steps={phaseSteps} />
      </header>

      <div className="run-stage-body">{children}</div>
    </WorkspacePage>
  );
}
