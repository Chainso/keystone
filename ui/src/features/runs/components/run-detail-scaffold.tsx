import type { ComponentProps, ReactNode } from "react";

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
    <div className="page-stage">
      <header className="run-detail-header">
        <div>
          <h1 className="run-detail-title">{displayId}</h1>
          <p className="document-card-summary">{summary}</p>
        </div>

        <div className="filter-chip-row">
          <StatusPill label={statusLabel} tone={statusTone} />
          <p className="document-name">{updatedLabel}</p>
        </div>
      </header>

      <RunPhaseStepper steps={phaseSteps} />

      <div className="run-stage-body">{children}</div>
    </div>
  );
}
