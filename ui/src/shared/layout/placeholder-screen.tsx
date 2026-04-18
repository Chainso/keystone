import { PageSection } from "./page-section";

interface PlaceholderScreenProps {
  destination: string;
  title: string;
  summary: string;
  lockedInThisPhase: string[];
  deferredWork: string[];
  nextSlice: string;
}

function renderBulletItems(items: string[]) {
  return (
    <ul className="page-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function PlaceholderScreen({
  destination,
  title,
  summary,
  lockedInThisPhase,
  deferredWork,
  nextSlice
}: PlaceholderScreenProps) {
  return (
    <div className="page-stage">
      <header className="page-hero">
        <div>
          <span className="page-badge">Phase 1 scaffold</span>
          <p className="page-eyebrow">{destination}</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-summary">{summary}</p>
        </div>
        <aside className="hero-aside">
          <p className="hero-aside-title">Placeholder honesty</p>
          <p className="hero-aside-copy">
            This route exists to freeze shell ownership, provider boundaries, and navigation
            structure. It does not claim real product behavior yet.
          </p>
        </aside>
      </header>

      <div className="page-grid">
        <PageSection eyebrow="Locked in now" title="Structure frozen in Phase 1">
          {renderBulletItems(lockedInThisPhase)}
        </PageSection>

        <PageSection eyebrow="Deferred work" title="Still intentionally unimplemented">
          {renderBulletItems(deferredWork)}
        </PageSection>

        <PageSection eyebrow="Next slice" title="Expected follow-on work">
          <p className="page-emphasis">{nextSlice}</p>
          <p className="page-disclaimer">
            All controls, lists, and panels on this page remain scaffold-only until a later
            phase lands the destination-specific behavior.
          </p>
        </PageSection>
      </div>
    </div>
  );
}
