import { beforeEach, describe, expect, it, vi } from "vitest";

const encoder = new TextEncoder();

const mocked = vi.hoisted(() => {
  const documentRowsByPath = new Map<string, Record<string, unknown>>();
  const documentsById = new Map<string, Record<string, unknown>>();
  const revisionsById = new Map<string, Record<string, unknown>>();
  const artifactsById = new Map<string, Record<string, unknown>>();
  const artifactBodiesByUri = new Map<
    string,
    { body: Uint8Array; contentType?: string | null } | null
  >();

  function seedPlanningDocument(kind: "specification" | "architecture" | "execution_plan") {
    const path =
      kind === "execution_plan"
        ? "execution-plan"
        : kind === "specification"
          ? "specification"
          : "architecture";
    const documentId = `document-${kind}`;
    const documentRevisionId = `revision-${kind}`;
    const artifactRefId = `artifact-${kind}`;
    const objectKey = `documents/run/run-123/${documentId}/v1.md`;
    const storageUri = `r2://keystone-artifacts-dev/${objectKey}`;

    documentRowsByPath.set(path, {
      documentId,
      tenantId: "tenant-fixture",
      projectId: "project-fixture",
      runId: "run-123",
      scopeType: "run",
      kind,
      path,
      currentRevisionId: documentRevisionId,
      conversationAgentClass: null,
      conversationAgentName: null,
      createdAt: new Date("2026-04-19T00:00:00.000Z"),
      updatedAt: new Date("2026-04-19T00:00:00.000Z")
    });
    documentsById.set(documentId, {
      documentId,
      tenantId: "tenant-fixture",
      projectId: "project-fixture",
      runId: "run-123",
      scopeType: "run",
      kind,
      path,
      currentRevisionId: documentRevisionId,
      currentRevision: null,
      conversationAgentClass: null,
      conversationAgentName: null,
      createdAt: new Date("2026-04-19T00:00:00.000Z"),
      updatedAt: new Date("2026-04-19T00:00:00.000Z")
    });
    revisionsById.set(documentRevisionId, {
      documentRevisionId,
      tenantId: "tenant-fixture",
      documentId,
      artifactRefId,
      revisionNumber: 1,
      title: `${kind} v1`,
      createdAt: new Date("2026-04-19T00:00:00.000Z")
    });
    artifactsById.set(artifactRefId, {
      artifactRefId,
      tenantId: "tenant-fixture",
      projectId: "project-fixture",
      runId: "run-123",
      runTaskId: null,
      artifactKind: "document_revision",
      storageBackend: "r2",
      bucket: "keystone-artifacts-dev",
      objectKey,
      objectVersion: null,
      etag: `etag-${kind}`,
      contentType: "text/markdown; charset=utf-8",
      sha256: null,
      sizeBytes: 32,
      createdAt: new Date("2026-04-19T00:00:00.000Z")
    });
    artifactBodiesByUri.set(storageUri, {
      body: encoder.encode(`# ${kind}\n\nFixture body.\n`),
      contentType: "text/markdown; charset=utf-8"
    });
  }

  return {
    documentRowsByPath,
    documentsById,
    revisionsById,
    artifactsById,
    artifactBodiesByUri,
    reset() {
      documentRowsByPath.clear();
      documentsById.clear();
      revisionsById.clear();
      artifactsById.clear();
      artifactBodiesByUri.clear();
      seedPlanningDocument("specification");
      seedPlanningDocument("architecture");
      seedPlanningDocument("execution_plan");
    }
  };
});

vi.mock("../../src/lib/db/documents", () => ({
  getRunDocumentByPath: vi.fn(async (_client, input) => mocked.documentRowsByPath.get(input.path) ?? null),
  getDocumentWithCurrentRevision: vi.fn(async (_client, input) => mocked.documentsById.get(input.documentId) ?? null),
  getDocumentRevision: vi.fn(async (_client, input) => mocked.revisionsById.get(input.documentRevisionId) ?? null)
}));

vi.mock("../../src/lib/db/artifacts", () => ({
  getArtifactRef: vi.fn(async (_client, _tenantId, artifactRefId) => mocked.artifactsById.get(artifactRefId) ?? null),
  getArtifactStorageUri: vi.fn((artifact) => `r2://${artifact.bucket}/${artifact.objectKey}`)
}));

vi.mock("../../src/lib/artifacts/r2", () => ({
  getArtifactBytes: vi.fn(async (_bucket, storageUri) => mocked.artifactBodiesByUri.get(storageUri) ?? null),
  isTextArtifactContentType: vi.fn((contentType: string | null | undefined) =>
    typeof contentType === "string" && contentType.startsWith("text/")
  )
}));

const { loadRequiredRunPlanningDocuments } = await import("../../src/lib/documents/runtime");

describe("document runtime planning loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.reset();
  });

  it("loads all required run planning documents through their current revisions", async () => {
    const loaded = await loadRequiredRunPlanningDocuments(
      {
        ARTIFACTS_BUCKET: {} as R2Bucket
      },
      {} as never,
      {
        tenantId: "tenant-fixture",
        runId: "run-123"
      }
    );

    expect(loaded.specification.document.path).toBe("specification");
    expect(loaded.architecture.document.path).toBe("architecture");
    expect(loaded.executionPlan.document.path).toBe("execution-plan");
    expect(loaded.executionPlan.body).toContain("Fixture body.");
  });

  it("fails when a required run planning document has no current revision", async () => {
    const executionPlan = mocked.documentsById.get("document-execution_plan");

    if (!executionPlan) {
      throw new Error("Expected execution-plan fixture document.");
    }

    executionPlan.currentRevisionId = null;

    await expect(
      loadRequiredRunPlanningDocuments(
        {
          ARTIFACTS_BUCKET: {} as R2Bucket
        },
        {} as never,
        {
          tenantId: "tenant-fixture",
          runId: "run-123"
        }
      )
    ).rejects.toThrow(/execution_plan document .* has no current revision/i);
  });

  it("fails when a required run planning document row is missing", async () => {
    mocked.documentRowsByPath.delete("specification");

    await expect(
      loadRequiredRunPlanningDocuments(
        {
          ARTIFACTS_BUCKET: {} as R2Bucket
        },
        {} as never,
        {
          tenantId: "tenant-fixture",
          runId: "run-123"
        }
      )
    ).rejects.toThrow(/run run-123 is missing its required specification document/i);
  });

  it("fails when the current document cannot be reloaded", async () => {
    mocked.documentsById.delete("document-architecture");

    await expect(
      loadRequiredRunPlanningDocuments(
        {
          ARTIFACTS_BUCKET: {} as R2Bucket
        },
        {} as never,
        {
          tenantId: "tenant-fixture",
          runId: "run-123"
        }
      )
    ).rejects.toThrow(/architecture document document-architecture could not be reloaded/i);
  });

  it("fails when the current revision cannot be reloaded", async () => {
    mocked.revisionsById.delete("revision-architecture");

    await expect(
      loadRequiredRunPlanningDocuments(
        {
          ARTIFACTS_BUCKET: {} as R2Bucket
        },
        {} as never,
        {
          tenantId: "tenant-fixture",
          runId: "run-123"
        }
      )
    ).rejects.toThrow(/architecture document document-architecture could not load its current revision/i);
  });

  it("fails when the current revision artifact ref is missing", async () => {
    mocked.artifactsById.delete("artifact-architecture");

    await expect(
      loadRequiredRunPlanningDocuments(
        {
          ARTIFACTS_BUCKET: {} as R2Bucket
        },
        {} as never,
        {
          tenantId: "tenant-fixture",
          runId: "run-123"
        }
      )
    ).rejects.toThrow(/architecture document revision .* is missing artifact/i);
  });

  it("fails when the current revision artifact bytes cannot be read", async () => {
    const architectureArtifact = mocked.artifactsById.get("artifact-architecture");

    if (!architectureArtifact) {
      throw new Error("Expected architecture artifact fixture.");
    }

    mocked.artifactBodiesByUri.set(
      `r2://${architectureArtifact.bucket}/${architectureArtifact.objectKey}`,
      null
    );

    await expect(
      loadRequiredRunPlanningDocuments(
        {
          ARTIFACTS_BUCKET: {} as R2Bucket
        },
        {} as never,
        {
          tenantId: "tenant-fixture",
          runId: "run-123"
        }
      )
    ).rejects.toThrow(/architecture document artifact .* could not be read/i);
  });

  it("fails when the current revision artifact is not text-readable", async () => {
    const architectureArtifact = mocked.artifactsById.get("artifact-architecture");

    if (!architectureArtifact) {
      throw new Error("Expected architecture artifact fixture.");
    }

    architectureArtifact.contentType = "application/octet-stream";
    mocked.artifactBodiesByUri.set(
      `r2://${architectureArtifact.bucket}/${architectureArtifact.objectKey}`,
      {
        body: encoder.encode("binary-ish"),
        contentType: "application/octet-stream"
      }
    );

    await expect(
      loadRequiredRunPlanningDocuments(
        {
          ARTIFACTS_BUCKET: {} as R2Bucket
        },
        {} as never,
        {
          tenantId: "tenant-fixture",
          runId: "run-123"
        }
      )
    ).rejects.toThrow(/architecture document artifact .* must be text-readable/i);
  });
});
