import { describe, expect, it, vi } from "vitest";

import { createRunRecord, ensureRunRecord, updateRunRecord } from "../../src/lib/db/runs";
import { runs } from "../../src/lib/db/schema";
import { buildRunSandboxId } from "../../src/lib/workspace/worktree";

type CompileRevisionJoinRow = {
  documentRevisionId: string;
  documentId: string;
  documentProjectId: string;
  documentRunId: string;
  documentScopeType: string;
  documentKind: string;
  documentPath: string;
};

type RunRecordState = {
  project: {
    tenantId: string;
    projectId: string;
  } | null;
  run:
    | {
        tenantId: string;
        runId: string;
        projectId: string;
        workflowInstanceId: string;
        executionEngine: string;
        sandboxId: string;
        status: string;
        compiledSpecRevisionId: string | null;
        compiledArchitectureRevisionId: string | null;
        compiledExecutionPlanRevisionId: string | null;
        compiledAt: Date | null;
        startedAt: Date | null;
        endedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }
    | null;
  compileRevisions: CompileRevisionJoinRow[];
};

function createRunRepositoryClient(stateOverrides: Partial<RunRecordState> = {}) {
  const counters = {
    inserts: 0,
    updates: 0
  };
  let state: RunRecordState = {
    project: {
      tenantId: "tenant-fixture",
      projectId: "project-fixture"
    },
    run: null,
    compileRevisions: [
      {
        documentRevisionId: "revision-spec",
        documentId: "doc-spec",
        documentProjectId: "project-fixture",
        documentRunId: "run-123",
        documentScopeType: "run",
        documentKind: "specification",
        documentPath: "specification"
      },
      {
        documentRevisionId: "revision-architecture",
        documentId: "doc-architecture",
        documentProjectId: "project-fixture",
        documentRunId: "run-123",
        documentScopeType: "run",
        documentKind: "architecture",
        documentPath: "architecture"
      },
      {
        documentRevisionId: "revision-execution-plan",
        documentId: "doc-execution-plan",
        documentProjectId: "project-fixture",
        documentRunId: "run-123",
        documentScopeType: "run",
        documentKind: "execution_plan",
        documentPath: "execution-plan"
      }
    ],
    ...stateOverrides
  };

  const db = {
    query: {
      projects: {
        findFirst: async () => structuredClone(state.project)
      },
      runs: {
        findFirst: async () => structuredClone(state.run)
      }
    },
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: async () => structuredClone(state.compileRevisions)
        })
      })
    }),
    insert: (table: unknown) => ({
      values: (value: Record<string, unknown>) => ({
        returning: async () => {
          if (table !== runs) {
            throw new Error("Unexpected table insert in run-record test.");
          }

          counters.inserts += 1;
          state.run = {
            tenantId: value.tenantId as string,
            runId: value.runId as string,
            projectId: value.projectId as string,
            workflowInstanceId: value.workflowInstanceId as string,
            executionEngine: value.executionEngine as string,
            sandboxId: (value.sandboxId as string | undefined) ?? buildRunSandboxId("tenant-fixture", "run-123"),
            status: value.status as string,
            compiledSpecRevisionId:
              (value.compiledSpecRevisionId as string | null | undefined) ?? null,
            compiledArchitectureRevisionId:
              (value.compiledArchitectureRevisionId as string | null | undefined) ?? null,
            compiledExecutionPlanRevisionId:
              (value.compiledExecutionPlanRevisionId as string | null | undefined) ?? null,
            compiledAt: (value.compiledAt as Date | null | undefined) ?? null,
            startedAt: (value.startedAt as Date | null | undefined) ?? null,
            endedAt: (value.endedAt as Date | null | undefined) ?? null,
            createdAt: new Date("2026-04-17T00:00:00.000Z"),
            updatedAt: new Date("2026-04-17T00:00:00.000Z")
          };

          return [structuredClone(state.run)];
        }
      })
    }),
    update: (table: unknown) => ({
      set: (value: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            if (table !== runs || !state.run) {
              throw new Error("Unexpected table update in run-record test.");
            }

            counters.updates += 1;
            state.run = {
              ...state.run,
              ...structuredClone(value)
            };

            return [structuredClone(state.run)];
          }
        })
      })
    })
  };

  return {
    client: {
      connectionString: "postgres://test",
      sql: {} as never,
      db
    },
    getState: () => structuredClone(state),
    getCounters: () => structuredClone(counters)
  };
}

describe("run record persistence", () => {
  it("persists executionEngine on create and compile provenance on update", async () => {
    const compiledAt = new Date("2026-04-17T12:00:00.000Z");
    const { client, getState } = createRunRepositoryClient();

    const created = await createRunRecord(client as never, {
      tenantId: "tenant-fixture",
      runId: "run-123",
      projectId: "project-fixture",
      workflowInstanceId: "workflow-run-123",
      executionEngine: "think",
      status: "configured"
    });

    expect(created).toMatchObject({
      runId: "run-123",
      projectId: "project-fixture",
      executionEngine: "think",
      sandboxId: buildRunSandboxId("tenant-fixture", "run-123"),
      status: "configured"
    });

    const updated = await updateRunRecord(client as never, {
      tenantId: "tenant-fixture",
      runId: "run-123",
      status: "active",
      compiledSpecRevisionId: "revision-spec",
      compiledArchitectureRevisionId: "revision-architecture",
      compiledExecutionPlanRevisionId: "revision-execution-plan",
      compiledAt
    });

    expect(updated).toMatchObject({
      runId: "run-123",
      executionEngine: "think",
      status: "active",
      compiledSpecRevisionId: "revision-spec",
      compiledArchitectureRevisionId: "revision-architecture",
      compiledExecutionPlanRevisionId: "revision-execution-plan",
      compiledAt
    });
    expect(getState().run).toMatchObject({
      runId: "run-123",
      executionEngine: "think",
      status: "active",
      compiledSpecRevisionId: "revision-spec",
      compiledArchitectureRevisionId: "revision-architecture",
      compiledExecutionPlanRevisionId: "revision-execution-plan",
      compiledAt
    });
  });

  it("repairs an existing same-project run row through ensureRunRecord", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T09:00:00.000Z"));

    try {
      const compiledAt = new Date("2026-04-18T08:30:00.000Z");
      const { client, getCounters, getState } = createRunRepositoryClient({
        run: {
          tenantId: "tenant-fixture",
          runId: "run-123",
          projectId: "project-fixture",
          workflowInstanceId: "workflow-stale",
          executionEngine: "scripted",
          sandboxId: buildRunSandboxId("tenant-fixture", "run-123"),
          status: "configured",
          compiledSpecRevisionId: null,
          compiledArchitectureRevisionId: null,
          compiledExecutionPlanRevisionId: null,
          compiledAt: null,
          startedAt: null,
          endedAt: null,
          createdAt: new Date("2026-04-17T00:00:00.000Z"),
          updatedAt: new Date("2026-04-17T00:00:00.000Z")
        }
      });

      const ensured = await ensureRunRecord(client as never, {
        tenantId: "tenant-fixture",
        runId: "run-123",
        projectId: "project-fixture",
        workflowInstanceId: "workflow-run-123",
        executionEngine: "think_live",
        sandboxId: "sandbox-run-123",
        status: "active",
        compiledSpecRevisionId: "revision-spec",
        compiledArchitectureRevisionId: "revision-architecture",
        compiledExecutionPlanRevisionId: "revision-execution-plan",
        compiledAt
      });

      expect(ensured).toMatchObject({
        runId: "run-123",
        projectId: "project-fixture",
        workflowInstanceId: "workflow-run-123",
        executionEngine: "think_live",
        sandboxId: "sandbox-run-123",
        status: "active",
        compiledSpecRevisionId: "revision-spec",
        compiledArchitectureRevisionId: "revision-architecture",
        compiledExecutionPlanRevisionId: "revision-execution-plan",
        compiledAt,
        startedAt: new Date("2026-04-18T09:00:00.000Z"),
        endedAt: null
      });
      expect(getCounters()).toEqual({
        inserts: 0,
        updates: 1
      });
      expect(getState().run).toMatchObject({
        workflowInstanceId: "workflow-run-123",
        executionEngine: "think_live",
        sandboxId: "sandbox-run-123",
        status: "active",
        startedAt: new Date("2026-04-18T09:00:00.000Z"),
        endedAt: null
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("preserves startedAt and derives endedAt when ensureRunRecord repairs a terminal status", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-18T10:15:00.000Z"));

    try {
      const startedAt = new Date("2026-04-18T09:00:00.000Z");
      const { client, getCounters, getState } = createRunRepositoryClient({
        run: {
          tenantId: "tenant-fixture",
          runId: "run-123",
          projectId: "project-fixture",
          workflowInstanceId: "workflow-run-123",
          executionEngine: "think_live",
          sandboxId: "sandbox-run-123",
          status: "active",
          compiledSpecRevisionId: "revision-spec",
          compiledArchitectureRevisionId: "revision-architecture",
          compiledExecutionPlanRevisionId: "revision-execution-plan",
          compiledAt: new Date("2026-04-18T08:30:00.000Z"),
          startedAt,
          endedAt: null,
          createdAt: new Date("2026-04-17T00:00:00.000Z"),
          updatedAt: new Date("2026-04-18T09:05:00.000Z")
        }
      });

      const ensured = await ensureRunRecord(client as never, {
        tenantId: "tenant-fixture",
        runId: "run-123",
        projectId: "project-fixture",
        workflowInstanceId: "workflow-run-123",
        executionEngine: "think_live",
        status: "failed"
      });

      expect(ensured).toMatchObject({
        runId: "run-123",
        status: "failed",
        startedAt,
        endedAt: new Date("2026-04-18T10:15:00.000Z")
      });
      expect(getCounters()).toEqual({
        inserts: 0,
        updates: 1
      });
      expect(getState().run).toMatchObject({
        status: "failed",
        startedAt,
        endedAt: new Date("2026-04-18T10:15:00.000Z")
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects ensureRunRecord when the existing run belongs to a different project", async () => {
    const { client, getCounters, getState } = createRunRepositoryClient({
      run: {
        tenantId: "tenant-fixture",
        runId: "run-123",
        projectId: "project-other",
        workflowInstanceId: "workflow-run-123",
        executionEngine: "think_live",
        sandboxId: buildRunSandboxId("tenant-fixture", "run-123"),
        status: "configured",
        compiledSpecRevisionId: null,
        compiledArchitectureRevisionId: null,
        compiledExecutionPlanRevisionId: null,
        compiledAt: null,
        startedAt: null,
        endedAt: null,
        createdAt: new Date("2026-04-17T00:00:00.000Z"),
        updatedAt: new Date("2026-04-17T00:00:00.000Z")
      }
    });

    await expect(
      ensureRunRecord(client as never, {
        tenantId: "tenant-fixture",
        runId: "run-123",
        projectId: "project-fixture",
        workflowInstanceId: "workflow-run-123",
        executionEngine: "think_live",
        status: "configured"
      })
    ).rejects.toThrow(
      "Run run-123 already belongs to project project-other, not project-fixture."
    );

    expect(getCounters()).toEqual({
      inserts: 0,
      updates: 0
    });
    expect(getState().run).toMatchObject({
      runId: "run-123",
      projectId: "project-other",
      status: "configured"
    });
  });
});
