export const terminalWorkflowInstanceStatuses = [
  "complete",
  "errored",
  "terminated"
] as const;

export function isTerminalWorkflowInstanceStatus(status: string) {
  return terminalWorkflowInstanceStatuses.includes(
    status as (typeof terminalWorkflowInstanceStatuses)[number]
  );
}

export function didWorkflowInstanceSucceed(status: string) {
  return status === "complete";
}
