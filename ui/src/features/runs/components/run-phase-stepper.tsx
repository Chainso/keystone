import type { NavLinkRenderProps } from "react-router-dom";
import { NavLink } from "react-router-dom";

import type { RunPhaseStepViewModel } from "../use-run-view-model";

function getStepLinkClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? "run-step-link is-active" : "run-step-link";
}

interface RunPhaseStepperProps {
  steps: RunPhaseStepViewModel[];
}

export function RunPhaseStepper({ steps }: RunPhaseStepperProps) {
  return (
    <nav className="run-stepper" aria-label="Run phases">
      {steps.map((phase) =>
        phase.isAvailable ? (
          <NavLink
            key={phase.phaseId}
            to={phase.href}
            end={phase.phaseId !== "execution"}
            aria-label={phase.label}
            className={getStepLinkClassName}
          >
            <span className="run-step-link-label">{phase.label}</span>
            <span className="run-step-link-summary">{phase.summary}</span>
          </NavLink>
        ) : (
          <span
            key={phase.phaseId}
            aria-label={phase.label}
            className="run-step-link is-disabled"
            aria-disabled="true"
          >
            <span className="run-step-link-label">{phase.label}</span>
            <span className="run-step-link-summary">{phase.summary}</span>
          </span>
        )
      )}
    </nav>
  );
}
