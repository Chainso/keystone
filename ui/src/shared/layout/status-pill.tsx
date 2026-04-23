import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";

export type StatusTone = "active" | "blocked" | "complete" | "neutral" | "queued";

const toneClassName: Record<StatusTone, string> = {
  active: "status-pill-active",
  blocked: "status-pill-blocked",
  complete: "status-pill-complete",
  neutral: "",
  queued: "status-pill-queued"
};

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

  return (
    <Badge
      variant="outline"
      className={cn("status-pill", toneClassName[resolvedTone])}
    >
      {label}
    </Badge>
  );
}
