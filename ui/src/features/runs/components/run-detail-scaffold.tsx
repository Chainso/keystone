import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  WorkspacePage
} from "../../../components/workspace/workspace-page";
import { RunPhaseStepper } from "./run-phase-stepper";
import type { RunPhaseStepViewModel } from "../use-run-view-model";

interface RunDetailScaffoldProps {
  displayId: string;
  phaseSteps: RunPhaseStepViewModel[];
  children: ReactNode;
}

export function RunDetailScaffold({
  displayId,
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
          </div>
          <div className="run-detail-headline">
            <h1 className="run-detail-title">{displayId}</h1>
          </div>
        </div>
        <RunPhaseStepper steps={phaseSteps} />
      </header>

      <div className="run-stage-body">{children}</div>
    </WorkspacePage>
  );
}
