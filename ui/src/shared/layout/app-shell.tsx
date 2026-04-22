import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import {
  WorkspacePage,
  WorkspacePageSection
} from "../../components/workspace/workspace-page";
import { useProjectManagement } from "../../features/projects/project-context";
import { ShellSidebar } from "./shell-sidebar";

interface AppShellProps {
  children: ReactNode;
}

function ProjectShellState() {
  const { actions, meta } = useProjectManagement();

  if (meta.status === "loading") {
    return (
      <WorkspacePage className="shell-state" aria-live="polite">
        <WorkspacePageSection>
          <p className="page-eyebrow">Project context</p>
          <h1 className="page-title">Loading projects</h1>
          <p className="page-summary">Keystone is loading the available project list.</p>
        </WorkspacePageSection>
      </WorkspacePage>
    );
  }

  if (meta.status === "empty") {
    return (
      <WorkspacePage className="shell-state">
        <WorkspacePageSection>
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
        </WorkspacePageSection>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage className="shell-state">
      <WorkspacePageSection>
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
      </WorkspacePageSection>
    </WorkspacePage>
  );
}

export function AppShell({ children }: AppShellProps) {
  const { meta } = useProjectManagement();
  const location = useLocation();
  const allowProjectRecoveryRoute =
    meta.status === "empty" && location.pathname.startsWith("/projects/new");
  const shouldRenderChildren = meta.status === "ready" || allowProjectRecoveryRoute;

  return (
    <div className="workspace-shell">
      <ShellSidebar />
      <main className="workspace-stage">
        {shouldRenderChildren ? children : <ProjectShellState />}
      </main>
    </div>
  );
}
