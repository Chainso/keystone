import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildRunSandboxId } from "../../../src/lib/workspace/worktree";

function createBridge() {
  return {
    layout: {
      workspaceRoot: "/workspace",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    targets: {
      workspaceRoot: "/workspace/runs/run-123/tasks/planning-execution-plan/code",
      artifactsInRoot: "/artifacts/in",
      artifactsOutRoot: "/artifacts/out",
      keystoneRoot: "/keystone"
    },
    readOnlyRoots: ["/artifacts/in", "/keystone"],
    writableRoots: ["/workspace", "/artifacts/out"],
    environment: {
      KEYSTONE_FIXTURE_PROJECT: "1"
    },
    controlFiles: {
      session: "/keystone/session.json",
      filesystem: "/keystone/filesystem.json",
      artifacts: "/keystone/artifacts.json"
    },
    projectedArtifacts: []
  };
}

const mocked = vi.hoisted(() => {
  const close = vi.fn(async () => undefined);
  const initialize = vi.fn(async () => undefined);
  const ensureWorkspace = vi.fn(async () => ({
    sandboxId: buildRunSandboxId("tenant/a", "run/123"),
    workspace: {
      agentBridge: createBridge()
    }
  }));
  const getTaskSessionStub = vi.fn(() => ({
    initialize,
    ensureWorkspace
  }));

  return {
    close,
    initialize,
    ensureWorkspace,
    getTaskSessionStub,
    createWorkerDatabaseClient: vi.fn(() => ({
      close,
      db: {},
      sql: {}
    })),
    getRunRecord: vi.fn(async () => ({
      projectId: "project-123",
      sandboxId: null
    })),
    getProject: vi.fn(async () => ({
      projectId: "project-123"
    })),
    buildProjectExecutionSnapshot: vi.fn(() => ({
      projectId: "project-123",
      projectKey: "fixture-project",
      displayName: "Fixture Project",
      components: [
        {
          type: "git",
          componentKey: "repo",
          repoUrl: "/tmp/repo",
          repoRef: "main",
          baseRef: "main"
        }
      ],
      environment: {
        KEYSTONE_FIXTURE_PROJECT: "1"
      },
      ruleSet: {
        reviewInstructions: [],
        testInstructions: []
      },
      componentRuleOverrides: []
    })),
    ensureSandboxSession: vi.fn(async () => ({
      session: {
        id: "planning-document-execution-plan"
      }
    }))
  };
});

vi.mock("../../../src/lib/db/client", () => ({
  createWorkerDatabaseClient: mocked.createWorkerDatabaseClient
}));

vi.mock("../../../src/lib/db/runs", () => ({
  getRunRecord: mocked.getRunRecord
}));

vi.mock("../../../src/lib/db/projects", () => ({
  getProject: mocked.getProject
}));

vi.mock("../../../src/lib/projects/runtime", () => ({
  buildProjectExecutionSnapshot: mocked.buildProjectExecutionSnapshot
}));

vi.mock("../../../src/lib/auth/tenant", () => ({
  getTaskSessionStub: mocked.getTaskSessionStub
}));

vi.mock("../../../src/lib/sandbox/client", () => ({
  ensureSandboxSession: mocked.ensureSandboxSession
}));

const {
  buildPlanningRunTaskId,
  buildPlanningSessionId,
  buildPlanningTaskId,
  ensurePlanningSandboxContext,
  parsePlanningConversationName
} = await import("../../../src/keystone/agents/planning/planning-context");

describe("planning sandbox context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses deterministic planning conversation locators", () => {
    expect(
      parsePlanningConversationName(
        "tenant:tenant%2Fa:run:run%2F123:document:execution-plan"
      )
    ).toEqual({
      tenantId: "tenant/a",
      runId: "run/123",
      path: "execution-plan"
    });
    expect(parsePlanningConversationName("default")).toBeNull();
  });

  it("reuses the task-session sandbox bridge for run planning documents", async () => {
    const context = await ensurePlanningSandboxContext(
      {
        TASK_SESSION: {} as never,
        SANDBOX: {} as never
      } as never,
      "tenant:tenant%2Fa:run:run%2F123:document:execution-plan"
    );

    expect(mocked.getTaskSessionStub).toHaveBeenCalledWith(
      expect.anything(),
      "tenant/a",
      "run/123",
      buildPlanningSessionId("execution-plan"),
      buildPlanningTaskId("execution-plan")
    );
    expect(mocked.initialize).toHaveBeenCalledWith({
      tenantId: "tenant/a",
      runId: "run/123",
      sessionId: buildPlanningSessionId("execution-plan"),
      taskId: buildPlanningTaskId("execution-plan"),
      runTaskId: buildPlanningRunTaskId("execution-plan"),
      sandboxId: buildRunSandboxId("tenant/a", "run/123")
    });
    expect(mocked.ensureWorkspace).toHaveBeenCalledWith({
      components: [
        {
          type: "git",
          componentKey: "repo",
          repoUrl: "/tmp/repo",
          repoRef: "main",
          baseRef: "main"
        }
      ],
      env: {
        KEYSTONE_FIXTURE_PROJECT: "1"
      }
    });
    expect(mocked.ensureSandboxSession).toHaveBeenCalledWith({
      env: {
        TASK_SESSION: {} as never,
        SANDBOX: {} as never
      },
      sandboxId: buildRunSandboxId("tenant/a", "run/123"),
      sessionId: buildPlanningSessionId("execution-plan")
    });
    expect(context).toEqual(
      expect.objectContaining({
        sessionId: buildPlanningSessionId("execution-plan"),
        taskId: buildPlanningTaskId("execution-plan"),
        runTaskId: buildPlanningRunTaskId("execution-plan"),
        sandboxId: buildRunSandboxId("tenant/a", "run/123"),
        bridge: expect.objectContaining({
          environment: {
            KEYSTONE_FIXTURE_PROJECT: "1"
          }
        })
      })
    );
    expect(mocked.close).toHaveBeenCalledTimes(1);
  });
});
