import type { ReactNode } from "react";

import { RunPhaseStepper } from "./run-phase-stepper";

interface RunDetailScaffoldProps {
  displayId: string;
  children: ReactNode;
}

export function RunDetailScaffold({ displayId, children }: RunDetailScaffoldProps) {
  return (
    <div className="page-stage">
      <header className="run-detail-header">
        <h1 className="run-detail-title">{displayId}</h1>
      </header>

      <RunPhaseStepper />

      <div className="run-stage-body">{children}</div>
    </div>
  );
}
