import type { ReactNode } from "react";
import type { NavLinkRenderProps } from "react-router-dom";
import { NavLink } from "react-router-dom";

import type { ProjectConfigurationTabId } from "../project-configuration-scaffold";

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
    <div className="page-stage">
      <section className="workspace-panel project-config-panel">
        <header className="workspace-panel-header">
          <div>
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

        <div className="project-config-body">{children}</div>
      </section>
    </div>
  );
}
