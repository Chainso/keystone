import { runs, sessionEvents, sessions, type RunRow, type SessionEventRow, type SessionRow } from "../../src/lib/db/schema";

export function buildSessionRow(
  overrides: Partial<SessionRow> = {}
): SessionRow {
  return {
    tenantId: "tenant-fixture",
    sessionId: "run-session-123",
    runId: "run-123",
    sessionType: "run",
    status: "active",
    parentSessionId: null,
    metadata: {
      project: {
        projectId: "project-fixture",
        projectKey: "fixture-demo-project",
        displayName: "Fixture Demo Project"
      },
      workflowInstanceId: "run-workflow-123",
      executionEngine: "think",
      runtime: "think",
      options: {
        thinkMode: "live",
        preserveSandbox: true
      }
    },
    createdAt: new Date("2026-04-17T00:00:00.000Z"),
    updatedAt: new Date("2026-04-17T00:00:00.000Z"),
    ...overrides
  };
}

export function buildRunRow(
  overrides: Partial<RunRow> = {}
): RunRow {
  return {
    tenantId: "tenant-fixture",
    runId: "run-123",
    projectId: "project-fixture",
    workflowInstanceId: "run-workflow-123",
    executionEngine: "think",
    sandboxId: null,
    status: "active",
    compiledSpecRevisionId: null,
    compiledArchitectureRevisionId: null,
    compiledExecutionPlanRevisionId: null,
    compiledAt: null,
    startedAt: new Date("2026-04-17T00:00:00.000Z"),
    endedAt: null,
    createdAt: new Date("2026-04-17T00:00:00.000Z"),
    updatedAt: new Date("2026-04-17T00:00:00.000Z"),
    ...overrides
  };
}

type MirrorState = {
  session: SessionRow | null;
  run: RunRow | null;
  project: {
    tenantId: string;
    projectId: string;
  } | null;
  events: SessionEventRow[];
};

type MirrorDb = {
  query: {
    projects: {
      findFirst: (...args: unknown[]) => Promise<MirrorState["project"]>;
    };
    sessions: {
      findFirst: (...args: unknown[]) => Promise<MirrorState["session"]>;
    };
    runs: {
      findFirst: (...args: unknown[]) => Promise<MirrorState["run"]>;
    };
  };
  insert: (
    table: unknown
  ) => {
    values: (value: Record<string, unknown>) => {
      returning: () => Promise<unknown[]>;
    };
  };
  update: (
    table: unknown
  ) => {
    set: (value: Record<string, unknown>) => {
      where: () => {
        returning: () => Promise<unknown[]>;
      };
    };
  };
  delete: (
    table: unknown
  ) => {
    where: () => {
      returning: () => Promise<unknown[]>;
    };
  };
  transaction: <T>(callback: (transaction: MirrorDb) => Promise<T>) => Promise<T>;
};

function buildInsertedSession(value: Record<string, unknown>): SessionRow {
  const inserted = structuredClone(value) as Partial<SessionRow>;

  return {
    tenantId: typeof inserted.tenantId === "string" ? inserted.tenantId : "tenant-fixture",
    sessionId: typeof inserted.sessionId === "string" ? inserted.sessionId : "run-session-123",
    runId: typeof inserted.runId === "string" ? inserted.runId : "run-123",
    sessionType: inserted.sessionType === "task" || inserted.sessionType === "compile" ? inserted.sessionType : "run",
    status: typeof inserted.status === "string" ? inserted.status : "configured",
    parentSessionId:
      typeof inserted.parentSessionId === "string" ? inserted.parentSessionId : null,
    metadata:
      inserted.metadata && typeof inserted.metadata === "object"
        ? (inserted.metadata as Record<string, unknown>)
        : {},
    createdAt: inserted.createdAt instanceof Date ? inserted.createdAt : new Date("2026-04-17T00:00:00.000Z"),
    updatedAt: inserted.updatedAt instanceof Date ? inserted.updatedAt : new Date("2026-04-17T00:00:00.000Z")
  };
}

function buildInsertedRun(value: Record<string, unknown>): RunRow {
  const inserted = structuredClone(value) as Partial<RunRow>;

  return {
    tenantId: typeof inserted.tenantId === "string" ? inserted.tenantId : "tenant-fixture",
    runId: typeof inserted.runId === "string" ? inserted.runId : "run-123",
    projectId: typeof inserted.projectId === "string" ? inserted.projectId : "project-fixture",
    workflowInstanceId:
      typeof inserted.workflowInstanceId === "string"
        ? inserted.workflowInstanceId
        : "run-workflow-123",
    executionEngine:
      typeof inserted.executionEngine === "string" ? inserted.executionEngine : "think",
    sandboxId:
      inserted.sandboxId === null || typeof inserted.sandboxId === "string"
        ? inserted.sandboxId
        : null,
    status: typeof inserted.status === "string" ? inserted.status : "configured",
    compiledSpecRevisionId:
      inserted.compiledSpecRevisionId === null || typeof inserted.compiledSpecRevisionId === "string"
        ? inserted.compiledSpecRevisionId
        : null,
    compiledArchitectureRevisionId:
      inserted.compiledArchitectureRevisionId === null ||
      typeof inserted.compiledArchitectureRevisionId === "string"
        ? inserted.compiledArchitectureRevisionId
        : null,
    compiledExecutionPlanRevisionId:
      inserted.compiledExecutionPlanRevisionId === null ||
      typeof inserted.compiledExecutionPlanRevisionId === "string"
        ? inserted.compiledExecutionPlanRevisionId
        : null,
    compiledAt: inserted.compiledAt instanceof Date ? inserted.compiledAt : null,
    startedAt: inserted.startedAt instanceof Date ? inserted.startedAt : null,
    endedAt: inserted.endedAt instanceof Date ? inserted.endedAt : null,
    createdAt: inserted.createdAt instanceof Date ? inserted.createdAt : new Date("2026-04-17T00:00:00.000Z"),
    updatedAt: inserted.updatedAt instanceof Date ? inserted.updatedAt : new Date("2026-04-17T00:00:00.000Z")
  };
}

export function createMirrorClient(
  options: {
    session?: SessionRow | null | undefined;
    run?: RunRow | null | undefined;
    events?: SessionEventRow[] | undefined;
    failRunInsert?: boolean | undefined;
    failRunUpdate?: boolean | undefined;
    projectExists?: boolean | undefined;
  } = {}
) {
  let state: MirrorState = {
    session: options.session === undefined ? null : structuredClone(options.session),
    run: options.run === undefined ? null : structuredClone(options.run),
    project:
      options.projectExists === false
        ? null
        : {
            tenantId: "tenant-fixture",
            projectId: "project-fixture"
          },
    events: structuredClone(options.events ?? [])
  };

  function cloneState() {
    return structuredClone(state);
  }

  function createDb(target: MirrorState): MirrorDb {
    return {
      query: {
        projects: {
          findFirst: async () => structuredClone(target.project)
        },
        sessions: {
          findFirst: async () => structuredClone(target.session)
        },
        runs: {
          findFirst: async () => structuredClone(target.run)
        }
      },
      insert: (table: unknown) => ({
        values: (value: Record<string, unknown>) => ({
          returning: async () => {
            if (table === sessions) {
              target.session = buildInsertedSession(value);
              return [structuredClone(target.session)];
            }

            if (table === runs) {
              if (options.failRunInsert) {
                throw new Error("run insert failed");
              }

              target.run = buildInsertedRun(value);
              return [structuredClone(target.run)];
            }

            if (table === sessionEvents) {
              const event = structuredClone(value) as SessionEventRow;
              target.events.push(event);
              return [structuredClone(event)];
            }

            throw new Error("Unexpected table insert in mirror test.");
          }
        })
      }),
      update: (table: unknown) => ({
        set: (value: Record<string, unknown>) => ({
          where: () => ({
            returning: async () => {
              if (table === sessions) {
                target.session = buildInsertedSession({
                  ...(target.session ?? buildSessionRow()),
                  ...structuredClone(value)
                });
                return [structuredClone(target.session)];
              }

              if (table === runs) {
                if (options.failRunUpdate) {
                  throw new Error("run update failed");
                }

                target.run = buildInsertedRun({
                  ...(target.run ?? buildRunRow()),
                  ...structuredClone(value)
                });
                return [structuredClone(target.run)];
              }

              throw new Error("Unexpected table update in mirror test.");
            }
          })
        })
      }),
      delete: (table: unknown) => ({
        where: () => ({
          returning: async () => {
            if (table === sessionEvents) {
              const deleted = structuredClone(target.events);
              target.events = [];
              return deleted;
            }

            if (table === sessions) {
              const deleted = target.session ? [structuredClone(target.session)] : [];
              target.session = null;
              return deleted;
            }

            if (table === runs) {
              const deleted = target.run ? [structuredClone(target.run)] : [];
              target.run = null;
              return deleted;
            }

            throw new Error("Unexpected table delete in mirror test.");
          }
        })
      }),
      transaction: async <T>(callback: (transaction: MirrorDb) => Promise<T>) => {
        const draft = cloneState();
        const result = await callback(createDb(draft));
        state = draft;
        return result;
      }
    };
  }

  return {
    client: {
      connectionString: "postgres://test",
      sql: {} as never,
      db: createDb(state)
    },
    getState: () => cloneState()
  };
}
