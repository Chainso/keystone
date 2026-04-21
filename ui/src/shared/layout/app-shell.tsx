import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import { useProjectManagement } from "../../features/projects/project-context";
import { ShellSidebar } from "./shell-sidebar";

interface AppShellProps {
  children: ReactNode;
}

function ProjectShellState() {
  const { actions, meta } = useProjectManagement();

  if (meta.status === "loading") {
    return (
      <section className="page-stage shell-state" aria-live="polite">
        <section className="page-section">
          <p className="page-eyebrow">Project context</p>
          <h1 className="page-title">Loading projects</h1>
          <p className="page-summary">Keystone is loading the available project list.</p>
        </section>
      </section>
    );
  }

  if (meta.status === "empty") {
    return (
      <section className="page-stage shell-state">
        <section className="page-section">
          <p className="page-eyebrow">Project context</p>
          <h1 className="page-title">No projects yet</h1>
          <p className="page-summary">
            Create a project to start working in Runs, Documentation, and Workstreams.
          </p>
          <div className="shell-state-actions">
            <Link className="ghost-button" to="/projects/new">
              New project
            </Link>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="page-stage shell-state">
      <section className="page-section">
        <p className="page-eyebrow">Project context</p>
        <h1 className="page-title">Unable to load projects</h1>
        <p className="page-summary">{meta.errorMessage ?? "Keystone could not load the project list."}</p>
        <div className="shell-state-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              void actions.reloadProjects();
            }}
          >
            Retry
          </button>
        </div>
      </section>
    </section>
  );
}

export function AppShell({ children }: AppShellProps) {
  const { meta } = useProjectManagement();

  return (
    <div className="workspace-shell">
      <ShellSidebar />
      <main className="workspace-stage">
        {meta.status === "ready" ? children : <ProjectShellState />}
      </main>
    </div>
  );
}
