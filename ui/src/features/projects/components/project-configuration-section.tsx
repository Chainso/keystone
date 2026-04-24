import type { ReactNode } from "react";

import { Button } from "../../../components/ui/button";

interface ProjectConfigurationSectionProps {
  actions?: ReactNode;
  children: ReactNode;
  title: string;
}

interface ProjectConfigurationActionsProps {
  actions: Array<{
    disabled?: boolean | undefined;
    label: string;
    onPress?: (() => void) | undefined;
  }>;
}

export function ProjectConfigurationSection({
  actions,
  children,
  title
}: ProjectConfigurationSectionProps) {
  return (
    <section className="project-config-section">
      <div className="project-config-section-header">
        <div className="project-config-section-copy">
          <h2 className="page-section-title">{title}</h2>
        </div>
        {actions ? <div className="project-config-section-actions">{actions}</div> : null}
      </div>

      <div className="project-config-section-body">{children}</div>
    </section>
  );
}

export function ProjectConfigurationActions({
  actions
}: ProjectConfigurationActionsProps) {
  return (
    <div className="project-form-actions">
      {actions.map((action, index) => (
        <Button
          key={action.label}
          type="button"
          disabled={action.disabled}
          variant={index === actions.length - 1 ? "default" : "outline"}
          onClick={action.onPress}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
