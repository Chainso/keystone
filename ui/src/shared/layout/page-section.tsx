import type { ReactNode } from "react";

import { WorkspacePageSection } from "../../components/workspace/workspace-page";

interface PageSectionProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

export function PageSection({ eyebrow, title, children }: PageSectionProps) {
  return (
    <WorkspacePageSection>
      <p className="page-section-eyebrow">{eyebrow}</p>
      <h2 className="page-section-title">{title}</h2>
      {children}
    </WorkspacePageSection>
  );
}
