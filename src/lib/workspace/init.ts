import type { ExecutionSession } from "@cloudflare/sandbox";

import {
  createAgentFilesystemLayout,
  type AgentFilesystemLayout
} from "../../maestro/agent-runtime";
import type { WorkspaceStrategy } from "../../maestro/contracts";
import {
  buildRepositoryPath,
  buildTaskBranchName,
  buildTaskWorktreePath,
  buildWorkspaceId,
  buildWorkspaceRoot,
  slugifySegment
} from "./worktree";
import { createTaskWorktree, getHeadSha, initializeGitRepository } from "./git";
import type { WorkspaceSeedFile } from "./fixtures";

export interface InlineWorkspaceSource {
  type: "inline";
  repoUrl: string;
  repoRef?: string | undefined;
  baseRef?: string | undefined;
  files: WorkspaceSeedFile[];
}

export interface GitWorkspaceSource {
  type: "git";
  repoUrl: string;
  repoRef?: string | undefined;
  baseRef?: string | undefined;
}

export type WorkspaceSource = InlineWorkspaceSource | GitWorkspaceSource;

export interface ProjectedArtifactManifestEntry {
  artifactRefId: string;
  kind: string;
  contentType: string;
  storageUri: string;
  projectedPath: string;
  sizeBytes?: number | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface SandboxAgentBridge {
  layout: AgentFilesystemLayout;
  targets: AgentFilesystemLayout;
  readOnlyRoots: string[];
  writableRoots: string[];
  controlFiles: {
    session: string;
    filesystem: string;
    artifacts: string;
  };
  projectedArtifacts: ProjectedArtifactManifestEntry[];
}

export interface MaterializedWorkspace {
  workspaceId: string;
  strategy: WorkspaceStrategy;
  repoUrl: string;
  repoRef: string;
  baseRef: string;
  workspaceRoot: string;
  repositoryPath: string;
  worktreePath: string;
  branchName: string;
  headSha: string;
  agentBridge: SandboxAgentBridge;
}

export interface ProjectedArtifactInput {
  artifactRefId: string;
  kind: string;
  contentType: string;
  storageUri: string;
  body: string;
  encoding?: "utf-8" | "base64" | undefined;
  fileName?: string | undefined;
  sizeBytes?: number | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface MaterializeSandboxAgentBridgeInput {
  workspace: MaterializedWorkspace;
  tenantId: string;
  runId: string;
  sessionId: string;
  taskId: string;
  sandboxId: string;
  artifacts?: ProjectedArtifactInput[] | undefined;
}

function createSandboxAgentBridge(
  worktreePath: string,
  projectedArtifacts: ProjectedArtifactManifestEntry[] = []
): SandboxAgentBridge {
  const layout = createAgentFilesystemLayout();

  return {
    layout,
    targets: {
      ...layout,
      workspaceRoot: worktreePath
    },
    readOnlyRoots: [layout.artifactsInRoot, layout.keystoneRoot],
    writableRoots: [layout.workspaceRoot, layout.artifactsOutRoot],
    controlFiles: {
      session: `${layout.keystoneRoot}/session.json`,
      filesystem: `${layout.keystoneRoot}/filesystem.json`,
      artifacts: `${layout.keystoneRoot}/artifacts.json`
    },
    projectedArtifacts
  };
}

function quoteShellArgument(value: string) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

async function execOrThrow(session: ExecutionSession, command: string) {
  const result = await session.exec(command);

  if (!result.success) {
    throw new Error(
      `Sandbox command failed (${command}) with exit code ${result.exitCode}: ${result.stderr || result.stdout}`
    );
  }
}

async function writeJsonFile(
  session: ExecutionSession,
  path: string,
  value: Record<string, unknown>
) {
  await session.writeFile(path, JSON.stringify(value, null, 2));
}

async function prepareProjectionRoots(
  session: ExecutionSession,
  bridge: SandboxAgentBridge
) {
  await Promise.all(
    [
      bridge.layout.artifactsInRoot,
      bridge.layout.artifactsOutRoot,
      bridge.layout.keystoneRoot
    ].map((path) => session.mkdir(path, { recursive: true }))
  );

  await execOrThrow(
    session,
    [
      `chmod -R u+w ${quoteShellArgument(bridge.layout.artifactsInRoot)} ${quoteShellArgument(bridge.layout.artifactsOutRoot)} ${quoteShellArgument(bridge.layout.keystoneRoot)} 2>/dev/null || true`,
      `find ${quoteShellArgument(bridge.layout.artifactsInRoot)} -mindepth 1 -delete`,
      `find ${quoteShellArgument(bridge.layout.artifactsOutRoot)} -mindepth 1 -delete`,
      `find ${quoteShellArgument(bridge.layout.keystoneRoot)} -mindepth 1 -delete`
    ].join(" && ")
  );
}

function sanitizeArtifactFileName(value: string) {
  const normalized = value.split("/").at(-1)?.trim() ?? "artifact";
  const safe = normalized.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

  return safe || "artifact";
}

function buildProjectedArtifactPath(
  bridge: SandboxAgentBridge,
  artifact: ProjectedArtifactInput
) {
  const artifactDir = [
    bridge.layout.artifactsInRoot,
    slugifySegment(artifact.kind),
    artifact.artifactRefId
  ].join("/");
  const fileName = sanitizeArtifactFileName(
    artifact.fileName ??
      artifact.metadata?.fileName?.toString() ??
      artifact.metadata?.key?.toString() ??
      artifact.storageUri
  );

  return `${artifactDir}/${fileName}`;
}

async function writeProjectedArtifacts(
  session: ExecutionSession,
  bridge: SandboxAgentBridge,
  artifacts: ProjectedArtifactInput[]
) {
  const manifestEntries: ProjectedArtifactManifestEntry[] = [];

  for (const artifact of artifacts) {
    const projectedPath = buildProjectedArtifactPath(bridge, artifact);
    const parentPath = projectedPath.slice(0, projectedPath.lastIndexOf("/"));

    await session.mkdir(parentPath, { recursive: true });
    await session.writeFile(projectedPath, artifact.body, {
      encoding: artifact.encoding ?? "utf-8"
    });
    manifestEntries.push({
      artifactRefId: artifact.artifactRefId,
      kind: artifact.kind,
      contentType: artifact.contentType,
      storageUri: artifact.storageUri,
      projectedPath,
      sizeBytes: artifact.sizeBytes ?? null,
      metadata: artifact.metadata ?? {}
    });
  }

  return manifestEntries;
}

async function lockProjectionRoots(
  session: ExecutionSession,
  bridge: SandboxAgentBridge
) {
  await execOrThrow(
    session,
    [
      `chmod -R a-w ${quoteShellArgument(bridge.layout.artifactsInRoot)} ${quoteShellArgument(bridge.layout.keystoneRoot)}`,
      `chmod -R u+rwX ${quoteShellArgument(bridge.layout.artifactsOutRoot)}`
    ].join(" && ")
  );
}

export async function materializeSandboxAgentBridge(
  session: ExecutionSession,
  input: MaterializeSandboxAgentBridgeInput
): Promise<SandboxAgentBridge> {
  const projectedArtifactsInput = input.artifacts ?? [];
  const bridge = createSandboxAgentBridge(input.workspace.worktreePath);

  await prepareProjectionRoots(session, bridge);

  const projectedArtifacts = await writeProjectedArtifacts(
    session,
    bridge,
    projectedArtifactsInput
  );
  const nextBridge = createSandboxAgentBridge(input.workspace.worktreePath, projectedArtifacts);

  await writeJsonFile(session, nextBridge.controlFiles.session, {
    tenantId: input.tenantId,
    runId: input.runId,
    sessionId: input.sessionId,
    taskId: input.taskId,
    sandboxId: input.sandboxId,
    workspace: {
      workspaceId: input.workspace.workspaceId,
      strategy: input.workspace.strategy,
      repoUrl: input.workspace.repoUrl,
      repoRef: input.workspace.repoRef,
      baseRef: input.workspace.baseRef,
      workspaceRoot: nextBridge.layout.workspaceRoot,
      branchName: input.workspace.branchName,
      headSha: input.workspace.headSha
    }
  });
  await writeJsonFile(session, nextBridge.controlFiles.filesystem, {
    layout: nextBridge.layout,
    readOnlyRoots: nextBridge.readOnlyRoots,
    writableRoots: nextBridge.writableRoots
  });
  await writeJsonFile(session, nextBridge.controlFiles.artifacts, {
    count: projectedArtifacts.length,
    artifacts: projectedArtifacts
  });

  await lockProjectionRoots(session, nextBridge);

  return nextBridge;
}

async function ensureInlineRepository(
  session: ExecutionSession,
  repositoryPath: string,
  files: WorkspaceSeedFile[]
) {
  const gitDirectory = `${repositoryPath}/.git`;
  const existingGitDirectory = await session.exists(gitDirectory);

  if (existingGitDirectory.exists) {
    return;
  }

  await session.mkdir(repositoryPath, { recursive: true });

  for (const file of files) {
    const absolutePath = `${repositoryPath}/${file.path}`;
    const lastSlash = absolutePath.lastIndexOf("/");

    if (lastSlash > 0) {
      await session.mkdir(absolutePath.slice(0, lastSlash), { recursive: true });
    }

    await session.writeFile(absolutePath, file.content);
  }

  await initializeGitRepository(session, repositoryPath);
}

async function ensureGitRepository(
  session: ExecutionSession,
  repositoryPath: string,
  source: GitWorkspaceSource
) {
  const gitDirectory = `${repositoryPath}/.git`;
  const existingGitDirectory = await session.exists(gitDirectory);

  if (existingGitDirectory.exists) {
    return;
  }

  await session.gitCheckout(
    source.repoUrl,
    source.repoRef
      ? {
          branch: source.repoRef,
          targetDir: repositoryPath
        }
      : {
          targetDir: repositoryPath
        }
  );
}

export async function ensureWorkspaceMaterialized(
  session: ExecutionSession,
  input: {
    runId: string;
    sessionId: string;
    taskId: string;
    source: WorkspaceSource;
  }
): Promise<MaterializedWorkspace> {
  const workspaceRoot = buildWorkspaceRoot(input.runId, input.sessionId);
  const repositoryPath = buildRepositoryPath(workspaceRoot);
  const worktreePath = buildTaskWorktreePath(workspaceRoot, input.taskId);
  const branchName = buildTaskBranchName(input.taskId);
  const repoRef = input.source.type === "inline" ? input.source.repoRef ?? "main" : input.source.repoRef ?? "HEAD";
  const baseRef = input.source.type === "inline" ? input.source.baseRef ?? repoRef : input.source.baseRef ?? "HEAD";

  await session.mkdir(`${workspaceRoot}/tasks`, { recursive: true });

  if (input.source.type === "inline") {
    await ensureInlineRepository(session, repositoryPath, input.source.files);
  } else {
    await ensureGitRepository(session, repositoryPath, input.source);
  }

  await createTaskWorktree(session, {
    repositoryPath,
    worktreePath,
    branchName,
    baseRef
  });

  return {
    workspaceId: buildWorkspaceId(input.runId, input.sessionId),
    strategy: "worktree",
    repoUrl: input.source.repoUrl,
    repoRef,
    baseRef,
    workspaceRoot,
    repositoryPath,
    worktreePath,
    branchName,
    headSha: await getHeadSha(session, repositoryPath),
    agentBridge: createSandboxAgentBridge(worktreePath)
  };
}
