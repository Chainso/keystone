import type { ReactNode } from "react";

interface PageSectionProps {
  eyebrow: string;
  title: string;
  children: ReactNode;
}

export function PageSection({ eyebrow, title, children }: PageSectionProps) {
  return (
    <section className="page-section">
      <p className="page-section-eyebrow">{eyebrow}</p>
      <h2 className="page-section-title">{title}</h2>
      {children}
    </section>
  );
}
