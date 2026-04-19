import type { NavLinkRenderProps } from "react-router-dom";
import { NavLink } from "react-router-dom";

import { runPhaseDefinitions } from "../../../shared/navigation/run-phases";

function getStepLinkClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? "run-step-link is-active" : "run-step-link";
}

export function RunPhaseStepper() {
  return (
    <nav className="run-stepper" aria-label="Run phases">
      {runPhaseDefinitions.map((phase) => (
        <NavLink
          key={phase.id}
          to={phase.id}
          end={phase.id !== "execution"}
          className={getStepLinkClassName}
        >
          <span className="run-step-link-label">{phase.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
