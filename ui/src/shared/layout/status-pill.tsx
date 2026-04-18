function getStatusTone(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("block")) {
    return "blocked";
  }

  if (
    normalized.includes("progress") ||
    normalized.includes("running") ||
    normalized.includes("review")
  ) {
    return "active";
  }

  if (normalized.includes("complete") || normalized.includes("done") || normalized.includes("passed")) {
    return "complete";
  }

  if (normalized.includes("ready") || normalized.includes("queue") || normalized.includes("draft")) {
    return "queued";
  }

  return "neutral";
}

interface StatusPillProps {
  label: string;
}

export function StatusPill({ label }: StatusPillProps) {
  const tone = getStatusTone(label);

  return <span className={`status-pill status-pill-${tone}`}>{label}</span>;
}
