import { formatUtcTimestamp } from "../../shared/formatting/date";
import type { StatusTone } from "../../shared/layout/status-pill";

function normalizeStatus(value: string) {
  return value.trim().toLowerCase();
}

export function formatMachineLabel(value: string) {
  if (!value.trim()) {
    return value;
  }

  return value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function buildRunActivityLabel(input: {
  compiledAt: string | null;
  endedAt: string | null;
  startedAt: string | null;
}) {
  if (input.endedAt) {
    return `Ended ${formatUtcTimestamp(input.endedAt)}`;
  }

  if (input.startedAt) {
    return `Started ${formatUtcTimestamp(input.startedAt)}`;
  }

  if (input.compiledAt) {
    return `Compiled ${formatUtcTimestamp(input.compiledAt)}`;
  }

  return "No recorded activity yet";
}

export function getRunStatusTone(status: string): StatusTone {
  const normalized = normalizeStatus(status);

  if (
    normalized.includes("block") ||
    normalized.includes("cancel") ||
    normalized.includes("fail")
  ) {
    return "blocked";
  }

  if (
    normalized.includes("active") ||
    normalized.includes("running") ||
    normalized.includes("review")
  ) {
    return "active";
  }

  if (normalized.includes("complete") || normalized.includes("done") || normalized.includes("passed")) {
    return "complete";
  }

  if (
    normalized.includes("configur") ||
    normalized.includes("draft") ||
    normalized.includes("queue") ||
    normalized.includes("ready")
  ) {
    return "queued";
  }

  return "neutral";
}

export function getTaskStatusTone(status: string): StatusTone {
  const normalized = normalizeStatus(status);

  if (
    normalized.includes("block") ||
    normalized.includes("cancel") ||
    normalized.includes("fail")
  ) {
    return "blocked";
  }

  if (
    normalized.includes("active") ||
    normalized.includes("running") ||
    normalized.includes("review")
  ) {
    return "active";
  }

  if (normalized.includes("complete") || normalized.includes("done") || normalized.includes("passed")) {
    return "complete";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("queue") ||
    normalized.includes("ready")
  ) {
    return "queued";
  }

  return "neutral";
}

export function getRunStatusPresentation(status: string) {
  return {
    statusLabel: formatMachineLabel(status),
    statusTone: getRunStatusTone(status)
  };
}

export function getTaskStatusPresentation(status: string) {
  return {
    statusLabel: formatMachineLabel(status),
    statusTone: getTaskStatusTone(status)
  };
}

export function isTerminalRunStatus(status: string) {
  return ["archived", "failed", "cancelled"].includes(normalizeStatus(status));
}
