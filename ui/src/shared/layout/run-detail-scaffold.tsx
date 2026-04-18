import type { ReactNode } from "react";

import { RunPhaseStepper } from "./run-phase-stepper";
import { StatusPill } from "./status-pill";

interface RunDetailScaffoldProps {
  displayId: string;
  summary: string;
  status: string;
  updatedLabel: string;
  currentPhaseLabel: string;
  statusNote: string;
  coverageNotes: string[];
  children: ReactNode;
}

export function RunDetailScaffold({
  displayId,
  summary,
  status,
  updatedLabel,
  currentPhaseLabel,
  statusNote,
  coverageNotes,
  children
}: RunDetailScaffoldProps) {
  return (
    <div className="page-stage">
      <header className="page-hero run-hero">
        <div>
          <span className="page-badge">Phase 2 scaffold</span>
          <p className="page-eyebrow">Runs / current run</p>
          <h1 className="page-title">{displayId}</h1>
          <p className="page-summary">{summary}</p>
          <div className="run-meta-row" aria-label="Run metadata">
            <StatusPill label={status} />
            <span className="meta-chip">{currentPhaseLabel}</span>
            <span className="meta-chip">Updated {updatedLabel}</span>
          </div>
          <p className="run-status-note">{statusNote}</p>
        </div>
        <aside className="hero-aside">
          <p className="hero-aside-title">Current backend coverage</p>
          <ul className="page-list compact-list">
            {coverageNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </aside>
      </header>

      <RunPhaseStepper />

      <div className="run-stage-body">{children}</div>
    </div>
  );
}
