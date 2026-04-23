import type { ReactNode } from "react";
import type { NavLinkRenderProps } from "react-router-dom";
import { NavLink } from "react-router-dom";

import type {
  ProjectConfigurationMode,
  ProjectConfigurationTabId
} from "../project-configuration-scaffold";
import {
  WorkspacePage
} from "../../../components/workspace/workspace-page";

interface ProjectConfigurationShellProps {
  children: ReactNode;
  mode: ProjectConfigurationMode;
  tabs: Array<{
    label: string;
    path: string;
    summary: string;
    tabId: ProjectConfigurationTabId;
  }>;
  title: string;
}

const projectConfigurationShellContent = {
  new: {
    eyebrow: "New project",
    modeLabel: "New project",
    summary:
      "Set the project overview, repositories, rules, and environment in one tabbed workspace before creating the project."
  },
  settings: {
    eyebrow: "Project settings",
    modeLabel: "Project settings",
    summary:
      "Update the selected project's repositories, review rules, and environment without leaving the current workspace."
  }
} satisfies Record<
  ProjectConfigurationMode,
  {
    eyebrow: string;
    modeLabel: string;
    summary: string;
  }
>;

function getProjectTabClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? "project-tab-link is-active" : "project-tab-link";
}

export function ProjectConfigurationShell({
  children,
  mode,
  tabs,
  title
}: ProjectConfigurationShellProps) {
  const shellContent = projectConfigurationShellContent[mode];

  return (
    <WorkspacePage>
      <header className="workspace-surface-header project-config-shell-header">
        <div className="workspace-surface-heading project-config-shell-copy">
          <h1 className="run-detail-title">{title}</h1>
          <p className="workspace-surface-note project-config-shell-summary">{shellContent.summary}</p>
        </div>
      </header>

      {tabs.length > 0 ? (
        <nav className="project-tab-strip" aria-label="Project configuration tabs">
          {tabs.map((tab) => (
            <NavLink key={tab.tabId} to={tab.path} className={getProjectTabClassName}>
              <span className="project-tab-link-label">{tab.label}</span>
              <span className="project-tab-link-copy" aria-hidden="true">
                {tab.summary}
              </span>
            </NavLink>
          ))}
        </nav>
      ) : null}

      <div className="project-config-panel project-config-body">{children}</div>
    </WorkspacePage>
  );
}
