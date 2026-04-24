import type { ReactNode } from "react";
import type { NavLinkRenderProps } from "react-router-dom";
import { NavLink } from "react-router-dom";

import type { ProjectConfigurationTabId } from "../project-configuration-scaffold";
import { WorkspacePage } from "../../../components/workspace/workspace-page";

interface ProjectConfigurationShellProps {
  children: ReactNode;
  tabs: Array<{
    label: string;
    path: string;
    tabId: ProjectConfigurationTabId;
  }>;
  title: string;
}

function getProjectTabClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? "project-tab-link is-active" : "project-tab-link";
}

export function ProjectConfigurationShell({
  children,
  tabs,
  title
}: ProjectConfigurationShellProps) {
  return (
    <WorkspacePage>
      <header className="workspace-surface-header project-config-shell-header">
        <div className="workspace-surface-heading project-config-shell-copy">
          <h1 className="run-detail-title">{title}</h1>
        </div>
      </header>

      {tabs.length > 0 ? (
        <nav className="project-tab-strip" aria-label="Project configuration tabs">
          {tabs.map((tab) => (
            <NavLink key={tab.tabId} to={tab.path} className={getProjectTabClassName}>
              <span className="project-tab-link-label">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      ) : null}

      <div className="project-config-panel project-config-body">{children}</div>
    </WorkspacePage>
  );
}
