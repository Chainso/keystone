import type { ExecutionSession } from "@cloudflare/sandbox";

import type { ArtifactKind } from "../artifacts/model";
import {
  createAgentFilesystemLayout,
  type AgentFilesystemLayout
} from "../../maestro/agent-runtime";
import type { WorkspaceStrategy } from "../../maestro/contracts";
import {
  buildComponentPathSegment,
  buildComponentRepositoryPath,
  buildComponentWorktreePath,
  buildTaskBranchName,
  buildWorkspaceCodeRoot,
  buildWorkspaceId,
  buildWorkspaceRoot,
  buildTaskWorkspaceTargetPathWithIdentity,
  buildWorkspaceCodeRootWithIdentity,
  slugifySegment
} from "./worktree";
import { ensureTaskWorktree, getHeadSha, initializeGitRepository } from "./git";
import type { WorkspaceSeedFile } from "./fixtures";

const LEGACY_WORKSPACE_COMPONENT_KEY = "repo";

export interface InlineWorkspaceSource {
  type: "inline";
  componentKey?: string | undefined;
  repoUrl: string;
  repoRef?: string | undefined;
  baseRef?: string | undefined;
  files: WorkspaceSeedFile[];
}

export interface GitWorkspaceSource {
  type: "git";
  componentKey?: string | undefined;
  repoUrl: string;
  repoRef?: string | undefined;
  baseRef?: string | undefined;
}

export type WorkspaceSource = InlineWorkspaceSource | GitWorkspaceSource;

export interface WorkspaceComponentSource extends Omit<InlineWorkspaceSource, "componentKey"> {
  componentKey: string;
}

export interface GitWorkspaceComponentSource extends Omit<GitWorkspaceSource, "componentKey"> {
  componentKey: string;
}

export type WorkspaceMaterializationSource =
  | WorkspaceComponentSource
  | GitWorkspaceComponentSource;

export interface ProjectedArtifactManifestEntry {
  artifactRefId: string;
  kind: ArtifactKind;
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
  environment?: Record<string, string> | undefined;
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
  defaultComponentKey: string;
  repoUrl: string;
  repoRef: string;
  baseRef: string;
  workspaceRoot: string;
  workspaceTargetPath: string;
  codeRoot: string;
  defaultCwd: string;
  repositoryPath: string;
  worktreePath: string;
  branchName: string;
  headSha: string;
  components: MaterializedWorkspaceComponent[];
  agentBridge: SandboxAgentBridge;
}

export interface MaterializedWorkspaceComponent {
  componentKey: string;
  repoUrl: string;
  repoRef: string;
  baseRef: string;
  repositoryPath: string;
  worktreePath: string;
  branchName: string;
  headSha: string;
}

export interface ProjectedArtifactInput {
  artifactRefId: string;
  kind: ArtifactKind;
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
  environment?: Record<string, string> | undefined;
  artifacts?: ProjectedArtifactInput[] | undefined;
}

function createSandboxAgentBridge(
  workspaceTargetPath: string,
  environment?: Record<string, string>,
  projectedArtifacts: ProjectedArtifactManifestEntry[] = []
): SandboxAgentBridge {
  const layout = createAgentFilesystemLayout();

  return {
    layout,
    targets: {
      ...layout,
      workspaceRoot: workspaceTargetPath
    },
    readOnlyRoots: [layout.artifactsInRoot, layout.keystoneRoot],
    writableRoots: [layout.workspaceRoot, layout.artifactsOutRoot],
    environment,
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
  const bridge = createSandboxAgentBridge(input.workspace.workspaceTargetPath, input.environment);

  await prepareProjectionRoots(session, bridge);

  const projectedArtifacts = await writeProjectedArtifacts(
    session,
    bridge,
    projectedArtifactsInput
  );
  const nextBridge = createSandboxAgentBridge(
    input.workspace.workspaceTargetPath,
    input.environment,
    projectedArtifacts
  );

  await writeJsonFile(session, nextBridge.controlFiles.session, {
    tenantId: input.tenantId,
    runId: input.runId,
    sessionId: input.sessionId,
    taskId: input.taskId,
    sandboxId: input.sandboxId,
    environment: nextBridge.environment ?? {},
    workspace: {
      workspaceId: input.workspace.workspaceId,
      strategy: input.workspace.strategy,
      defaultComponentKey: input.workspace.defaultComponentKey,
      workspaceRoot: nextBridge.layout.workspaceRoot,
      workspaceTargetPath: input.workspace.workspaceTargetPath,
      codeRoot: `${nextBridge.layout.workspaceRoot}/code`,
      defaultCwd: input.workspace.defaultCwd,
      components: input.workspace.components.map((component) => ({
        componentKey: component.componentKey,
        repoUrl: component.repoUrl,
        repoRef: component.repoRef,
        baseRef: component.baseRef,
        repositoryPath: component.repositoryPath,
        worktreePath: component.worktreePath,
        branchName: component.branchName,
        headSha: component.headSha,
        sandboxPath: `${nextBridge.layout.workspaceRoot}/code/${buildComponentPathSegment(component.componentKey)}`
      }))
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
  source: GitWorkspaceComponentSource
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

function normalizeWorkspaceSources(
  input:
    | {
        source: WorkspaceSource;
        components?: never;
      }
    | {
        source?: never;
        components: WorkspaceMaterializationSource[];
      }
) {
  if ("components" in input) {
    return input.components;
  }

  return [
    {
      ...input.source,
      componentKey: input.source.componentKey ?? LEGACY_WORKSPACE_COMPONENT_KEY
    } satisfies WorkspaceMaterializationSource
  ];
}

function resolveWorkspaceComponentRefs(source: WorkspaceMaterializationSource) {
  if (source.type === "inline") {
    const repoRef = source.repoRef ?? "main";

    return {
      repoRef,
      baseRef: source.baseRef ?? repoRef
    };
  }

  return {
    repoRef: source.repoRef ?? "HEAD",
    baseRef: source.baseRef ?? "HEAD"
  };
}

function createMaterializedWorkspace(
  input: {
    runId: string;
    taskId: string;
    runTaskId: string;
    workspaceRoot: string;
    components: MaterializedWorkspaceComponent[];
  }
): MaterializedWorkspace {
  const defaultComponent = input.components[0];

  if (!defaultComponent) {
    throw new Error("At least one workspace component is required.");
  }

  const workspaceTargetPath = buildTaskWorkspaceTargetPathWithIdentity(
    input.workspaceRoot,
    input.taskId,
    input.runTaskId
  );
  const codeRoot = buildWorkspaceCodeRootWithIdentity(
    input.workspaceRoot,
    input.taskId,
    input.runTaskId
  );
  const defaultCwd =
    input.components.length === 1 ? defaultComponent.worktreePath : workspaceTargetPath;

  return {
    workspaceId: buildWorkspaceId(input.runId),
    strategy: "worktree",
    defaultComponentKey: defaultComponent.componentKey,
    repoUrl: defaultComponent.repoUrl,
    repoRef: defaultComponent.repoRef,
    baseRef: defaultComponent.baseRef,
    workspaceRoot: input.workspaceRoot,
    workspaceTargetPath,
    codeRoot,
    defaultCwd,
    repositoryPath: defaultComponent.repositoryPath,
    worktreePath: defaultComponent.worktreePath,
    branchName: defaultComponent.branchName,
    headSha: defaultComponent.headSha,
    components: input.components,
    agentBridge: createSandboxAgentBridge(input.workspaceRoot)
  };
}

export async function ensureWorkspaceMaterialized(
  session: ExecutionSession,
  input:
    | {
        runId: string;
        taskId: string;
        runTaskId: string;
        source: WorkspaceSource;
        components?: never;
      }
    | {
        runId: string;
        taskId: string;
        runTaskId: string;
        source?: never;
        components: WorkspaceMaterializationSource[];
      }
): Promise<MaterializedWorkspace> {
  const workspaceRoot = buildWorkspaceRoot(input.runId);
  const branchName = buildTaskBranchName(input.taskId, input.runTaskId);
  const componentSources = normalizeWorkspaceSources(input);
  const materializedComponents: MaterializedWorkspaceComponent[] = [];
  const taskCodeRoot = buildWorkspaceCodeRootWithIdentity(
    workspaceRoot,
    input.taskId,
    input.runTaskId
  );

  await session.mkdir(taskCodeRoot, { recursive: true });

  for (const component of componentSources) {
    const repositoryPath = buildComponentRepositoryPath(workspaceRoot, component.componentKey);
    const worktreePath = buildComponentWorktreePath(
      workspaceRoot,
      input.taskId,
      input.runTaskId,
      component.componentKey
    );
    const { repoRef, baseRef } = resolveWorkspaceComponentRefs(component);

    if (component.type === "inline") {
      await ensureInlineRepository(session, repositoryPath, component.files);
    } else {
      await ensureGitRepository(session, repositoryPath, component);
    }

    await ensureTaskWorktree(session, {
      repositoryPath,
      worktreePath,
      branchName,
      baseRef
    });

    materializedComponents.push({
      componentKey: component.componentKey,
      repoUrl: component.repoUrl,
      repoRef,
      baseRef,
      repositoryPath,
      worktreePath,
      branchName,
      headSha: await getHeadSha(session, repositoryPath)
    });
  }

  return createMaterializedWorkspace({
    runId: input.runId,
    taskId: input.taskId,
    runTaskId: input.runTaskId,
    workspaceRoot,
    components: materializedComponents
  });
}
