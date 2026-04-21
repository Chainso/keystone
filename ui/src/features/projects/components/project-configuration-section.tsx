import type { ReactNode } from "react";

interface ProjectConfigurationSectionProps {
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
  children,
  title
}: ProjectConfigurationSectionProps) {
  return (
    <section className="project-config-section">
      <div className="project-config-section-header">
        <div>
          <h2 className="workspace-panel-title">{title}</h2>
        </div>
      </div>

      {children}
    </section>
  );
}

export function ProjectConfigurationActions({
  actions
}: ProjectConfigurationActionsProps) {
  return (
    <div className="project-form-actions">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className="ghost-button"
          disabled={action.disabled}
          onClick={action.onPress}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
