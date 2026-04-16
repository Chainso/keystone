import type { Process, ProcessStatus } from "@cloudflare/sandbox";

export interface ProcessLogCursor {
  stdoutBytes: number;
  stderrBytes: number;
}

export interface ProcessLogDelta {
  stdout: string;
  stderr: string;
  nextCursor: ProcessLogCursor;
}

export interface ProcessSnapshot {
  processId: string;
  command: string;
  status: ProcessStatus;
  startedAt: string;
  endedAt?: string | undefined;
  exitCode?: number | undefined;
  logCursor: ProcessLogCursor;
  terminalEventRecorded: boolean;
}

export function createEmptyProcessLogCursor(): ProcessLogCursor {
  return {
    stdoutBytes: 0,
    stderrBytes: 0
  };
}

export function createProcessSnapshot(process: Process): ProcessSnapshot {
  return {
    processId: process.id,
    command: process.command,
    status: process.status,
    startedAt: process.startTime.toISOString(),
    endedAt: process.endTime?.toISOString(),
    exitCode: process.exitCode,
    logCursor: createEmptyProcessLogCursor(),
    terminalEventRecorded: false
  };
}

export function applyProcessLogDelta(
  logs: {
    stdout: string;
    stderr: string;
  },
  cursor: ProcessLogCursor
): ProcessLogDelta {
  const stdout = logs.stdout.slice(cursor.stdoutBytes);
  const stderr = logs.stderr.slice(cursor.stderrBytes);

  return {
    stdout,
    stderr,
    nextCursor: {
      stdoutBytes: logs.stdout.length,
      stderrBytes: logs.stderr.length
    }
  };
}

export function isTerminalProcessStatus(status: ProcessStatus) {
  return status === "completed" || status === "failed" || status === "killed" || status === "error";
}
