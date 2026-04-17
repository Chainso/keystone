import type { ExecutionSession } from "@cloudflare/sandbox";

import type { WorkspaceStrategy } from "../../maestro/contracts";
import {
  buildRepositoryPath,
  buildTaskBranchName,
  buildTaskWorktreePath,
  buildWorkspaceId,
  buildWorkspaceRoot
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
    headSha: await getHeadSha(session, repositoryPath)
  };
}
