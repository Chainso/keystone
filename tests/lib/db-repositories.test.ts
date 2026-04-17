import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { DatabaseClient } from "../../src/lib/db/client";
import {
  createDatabaseClientFromSource,
  resolveDatabaseConnectionString
} from "../../src/lib/db/client";
import { createArtifactRef, listRunArtifacts } from "../../src/lib/db/artifacts";
import { appendSessionEvent, listRunEvents } from "../../src/lib/db/events";
import { applyMigrations } from "../../src/lib/db/migrations";
import {
  createSessionRecord,
  getSessionRecord,
  updateSessionStatus
} from "../../src/lib/db/runs";
import {
  createWorkspaceBinding,
  listRunWorkspaceBindings,
  listWorkspaceMaterializedComponents
} from "../../src/lib/db/workspaces";

const connectionString =
  process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE ??
  process.env.DATABASE_URL;

const describeIfDatabase =
  connectionString && process.env.KEYSTONE_RUN_DB_TESTS === "1" ? describe : describe.skip;

describeIfDatabase("database repositories", () => {
  let client: DatabaseClient;

  const tenantId = `tenant-test-${crypto.randomUUID()}`;
  const sessionId = crypto.randomUUID();
  const runId = `run-${crypto.randomUUID()}`;

  beforeAll(async () => {
    const resolvedConnectionString = resolveDatabaseConnectionString({
      connectionString
    });

    await applyMigrations({
      connectionString: resolvedConnectionString
    });

    client = createDatabaseClientFromSource({
      connectionString: resolvedConnectionString
    });
  });

  afterAll(async () => {
    if (!client) {
      return;
    }

    await client.sql`DELETE FROM projects WHERE tenant_id = ${tenantId}`;
    await client.sql`DELETE FROM session_events WHERE tenant_id = ${tenantId}`;
    await client.sql`DELETE FROM artifact_refs WHERE tenant_id = ${tenantId}`;
    await client.sql`DELETE FROM workspace_materialized_components WHERE tenant_id = ${tenantId}`;
    await client.sql`DELETE FROM workspace_bindings WHERE tenant_id = ${tenantId}`;
    await client.sql`DELETE FROM sessions WHERE tenant_id = ${tenantId}`;
    await client.close();
  });

  it("creates and updates a session row", async () => {
    const inserted = await createSessionRecord(
      client,
      {
        tenantId,
        runId,
        sessionType: "run",
        metadata: {
          source: "integration-test"
        }
      },
      {
        sessionId
      }
    );

    if (!inserted) {
      throw new Error("Expected session insert to return a row.");
    }
    expect(inserted.sessionId).toBe(sessionId);
    expect(inserted.status).toBe("configured");

    const updated = await updateSessionStatus(client, {
      tenantId,
      sessionId,
      status: "provisioning"
    });

    if (!updated) {
      throw new Error("Expected session update to return a row.");
    }
    expect(updated.status).toBe("provisioning");

    const fetched = await getSessionRecord(client, tenantId, sessionId);
    expect(fetched?.runId).toBe(runId);
  });

  it("appends events and links artifacts for the run", async () => {
    const artifact = await createArtifactRef(client, {
      tenantId,
      runId,
      sessionId,
      kind: "plan",
      storageBackend: "r2",
      storageUri: "r2://keystone-artifacts-dev/test/plan.json",
      contentType: "application/json"
    });

    if (!artifact) {
      throw new Error("Expected artifact insert to return a row.");
    }
    const event = await appendSessionEvent(client, {
      tenantId,
      runId,
      sessionId,
      eventType: "session.started",
      artifactRefId: artifact.artifactRefId,
      payload: {
        phase: "phase-2-test"
      }
    });

    if (!event) {
      throw new Error("Expected event insert to return a row.");
    }
    expect(event.seq).toBe(1);
    expect(event.artifactRefId).toBe(artifact.artifactRefId);

    const runEvents = await listRunEvents(client, {
      tenantId,
      runId
    });
    const runArtifacts = await listRunArtifacts(client, tenantId, runId);

    expect(runEvents).toHaveLength(1);
    expect(runArtifacts).toHaveLength(1);
    expect(runArtifacts[0]?.storageUri).toContain("plan.json");
  });

  it("stores task workspace bindings for later cleanup", async () => {
    const workspaceId = `workspace-${crypto.randomUUID()}`;
    const binding = await createWorkspaceBinding(client, {
      tenantId,
      workspaceId,
      runId,
      sessionId,
      taskId: "task-smoke",
      strategy: "worktree",
      sandboxId: "sandbox-smoke",
      workspaceRoot: "/workspace/runs/demo",
      workspaceTargetPath: "/workspace/runs/demo/code",
      defaultComponentKey: "docs",
      materializedComponents: [
        {
          componentKey: "repo",
          repoUrl: "fixture://demo-target",
          repoRef: "main",
          baseRef: "main",
          repositoryPath: "/workspace/runs/demo/repositories/repo",
          worktreePath: "/workspace/runs/demo/code/repo",
          branchName: "keystone/task-smoke",
          headSha: "abc123"
        },
        {
          componentKey: "docs",
          repoUrl: "fixture://demo-docs",
          repoRef: "release",
          baseRef: "release",
          repositoryPath: "/workspace/runs/demo/repositories/docs",
          worktreePath: "/workspace/runs/demo/code/docs",
          branchName: "keystone/task-smoke",
          headSha: "def456"
        }
      ],
      metadata: {
        defaultCwd: "/workspace/runs/demo",
        codeRoot: "/workspace/runs/demo/code"
      }
    });

    expect(binding?.repoUrl).toBe("fixture://demo-docs");
    expect(binding?.workspaceRoot).toBe("/workspace/runs/demo");
    expect(binding?.workspaceTargetPath).toBe("/workspace/runs/demo/code");
    expect(binding?.defaultComponentKey).toBe("docs");
    expect(binding?.worktreePath).toBe("/workspace/runs/demo/code/docs");

    const bindings = await listRunWorkspaceBindings(client, {
      tenantId,
      runId
    });
    const components = await listWorkspaceMaterializedComponents(client, {
      tenantId,
      workspaceId
    });

    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.metadata).toMatchObject({
      defaultCwd: "/workspace/runs/demo",
      codeRoot: "/workspace/runs/demo/code"
    });
    expect(components).toHaveLength(2);
    expect(components.map((component) => component.componentKey)).toEqual(["docs", "repo"]);
    expect(components[0]).toMatchObject({
      componentKey: "docs",
      worktreePath: "/workspace/runs/demo/code/docs",
      headSha: "def456"
    });
    expect(components[1]).toMatchObject({
      componentKey: "repo",
      worktreePath: "/workspace/runs/demo/code/repo",
      headSha: "abc123"
    });
  });
});
