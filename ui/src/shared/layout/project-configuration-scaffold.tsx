import type { ReactNode } from "react";
import type { NavLinkRenderProps } from "react-router-dom";
import { NavLink } from "react-router-dom";

import type { ProjectConfigurationTabId } from "../../features/projects/project-configuration-scaffold";
import { PageSection } from "./page-section";

interface ProjectConfigurationScaffoldProps {
  title: string;
  summary: string;
  honestyCopy: string;
  tabs: Array<{
    tabId: ProjectConfigurationTabId;
    label: string;
    summary: string;
    path: string;
  }>;
  sidebarSections: Array<{
    eyebrow: string;
    title: string;
    items: string[];
  }>;
  children: ReactNode;
}

function getProjectTabClassName({ isActive }: NavLinkRenderProps) {
  return isActive ? "project-tab-link is-active" : "project-tab-link";
}

export function ProjectConfigurationScaffold({
  title,
  summary,
  honestyCopy,
  tabs,
  sidebarSections,
  children
}: ProjectConfigurationScaffoldProps) {
  return (
    <div className="page-stage">
      <header className="page-hero">
        <div>
          <span className="page-badge">Phase 3 scaffold</span>
          <p className="page-eyebrow">Project configuration</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-summary">{summary}</p>
        </div>
        <aside className="hero-aside">
          <p className="hero-aside-title">Placeholder honesty</p>
          <p className="hero-aside-copy">{honestyCopy}</p>
        </aside>
      </header>

      <div className="project-config-grid">
        <section className="workspace-panel project-config-panel">
          <nav className="project-tab-strip" aria-label="Project configuration tabs">
            {tabs.map((tab) => (
              <NavLink key={tab.tabId} to={tab.path} className={getProjectTabClassName}>
                <span className="project-tab-link-label">{tab.label}</span>
                <span className="project-tab-link-summary">{tab.summary}</span>
              </NavLink>
            ))}
          </nav>

          <div className="project-config-body">{children}</div>
        </section>

        <div className="project-config-sidebar">
          {sidebarSections.map((section) => (
            <PageSection key={section.title} eyebrow={section.eyebrow} title={section.title}>
              <ul className="page-list compact-list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </PageSection>
          ))}
        </div>
      </div>
    </div>
  );
}
