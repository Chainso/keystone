import type { ReactNode } from "react";
import type { NavLinkRenderProps } from "react-router-dom";
import { NavLink } from "react-router-dom";

import type { ProjectConfigurationTabId } from "../../features/projects/project-configuration-scaffold";

interface ProjectConfigurationScaffoldProps {
  title: string;
  tabs: Array<{
    tabId: ProjectConfigurationTabId;
    label: string;
    path: string;
  }>;
  children: ReactNode;
}

function getProjectTabClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? "project-tab-link is-active" : "project-tab-link";
}

export function ProjectConfigurationScaffold({
  title,
  tabs,
  children
}: ProjectConfigurationScaffoldProps) {
  return (
    <div className="page-stage">
      <section className="workspace-panel project-config-panel">
        <header className="workspace-panel-header">
          <div>
            <h1 className="run-detail-title">{title}</h1>
          </div>
        </header>

        <nav className="project-tab-strip" aria-label="Project configuration tabs">
          {tabs.map((tab) => (
            <NavLink key={tab.tabId} to={tab.path} className={getProjectTabClassName}>
              <span className="project-tab-link-label">{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="project-config-body">{children}</div>
      </section>
    </div>
  );
}
