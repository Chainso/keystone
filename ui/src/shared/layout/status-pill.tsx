export type StatusTone = "active" | "blocked" | "complete" | "neutral" | "queued";

export function inferStatusTone(label: string): StatusTone {
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
  tone?: StatusTone | undefined;
}

export function StatusPill({ label, tone }: StatusPillProps) {
  const resolvedTone = tone ?? inferStatusTone(label);

  return <span className={`status-pill status-pill-${resolvedTone}`}>{label}</span>;
}
