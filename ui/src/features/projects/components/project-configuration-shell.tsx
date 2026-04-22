import type { ReactNode } from "react";
import type { NavLinkRenderProps } from "react-router-dom";
import { NavLink } from "react-router-dom";

import type {
  ProjectConfigurationMode,
  ProjectConfigurationTabId
} from "../project-configuration-scaffold";
import { Badge } from "../../../components/ui/badge";
import {
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePageHeading
} from "../../../components/workspace/workspace-page";
import {
  WorkspacePanel,
  WorkspacePanelEyebrow,
  WorkspacePanelHeader,
  WorkspacePanelHeading,
  WorkspacePanelSummary,
  WorkspacePanelTitle
} from "../../../components/workspace/workspace-panel";

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
    eyebrow: "Project setup",
    modeLabel: "Create flow",
    summary:
      "Set the project overview, repositories, rules, and environment in one tabbed workspace before creating the project."
  },
  settings: {
    eyebrow: "Project configuration",
    modeLabel: "Save flow",
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
      <WorkspacePageHeader className="project-config-shell-header">
        <WorkspacePageHeading>
          <WorkspacePanelEyebrow>{shellContent.eyebrow}</WorkspacePanelEyebrow>
          <h1 className="run-detail-title">{title}</h1>
          <p className="workspace-page-summary project-config-shell-summary">
            {shellContent.summary}
          </p>
        </WorkspacePageHeading>
        <div
          className="project-config-shell-meta"
          role="group"
          aria-label="Project configuration metadata"
        >
          <Badge variant="outline">{shellContent.modeLabel}</Badge>
          <Badge variant="outline">{tabs.length || 4} tabs</Badge>
        </div>
      </WorkspacePageHeader>

      <WorkspacePanel className="project-config-panel">
        <WorkspacePanelHeader className="project-config-panel-header">
          <WorkspacePanelHeading>
            <WorkspacePanelTitle>Configuration areas</WorkspacePanelTitle>
            <WorkspacePanelSummary>
              Move freely between tabs. Create and save actions stay direct in every tab footer.
            </WorkspacePanelSummary>
          </WorkspacePanelHeading>
        </WorkspacePanelHeader>

        {tabs.length > 0 ? (
          <nav className="project-tab-strip" aria-label="Project configuration tabs">
            {tabs.map((tab, index) => (
              <NavLink key={tab.tabId} to={tab.path} className={getProjectTabClassName}>
                <span className="project-tab-link-step" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="project-tab-link-label">{tab.label}</span>
                <span className="project-tab-link-copy" aria-hidden="true">
                  {tab.summary}
                </span>
              </NavLink>
            ))}
          </nav>
        ) : null}

        <div className="project-config-body">{children}</div>
      </WorkspacePanel>
    </WorkspacePage>
  );
}
