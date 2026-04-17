import type { ExecutionSession } from "@cloudflare/sandbox";

function quoteShellArgument(value: string) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

async function execOrThrow(session: ExecutionSession, command: string, cwd?: string) {
  const result = await session.exec(command, cwd ? { cwd } : undefined);

  if (!result.success) {
    throw new Error(
      `Sandbox command failed (${command}) with exit code ${result.exitCode}: ${result.stderr || result.stdout}`
    );
  }

  return result;
}

async function tryExec(session: ExecutionSession, command: string, cwd?: string) {
  return session.exec(command, cwd ? { cwd } : undefined);
}

export async function initializeGitRepository(
  session: ExecutionSession,
  repositoryPath: string
) {
  await execOrThrow(session, "git init -b main", repositoryPath);
  await execOrThrow(session, "git config user.name 'Keystone Sandbox'", repositoryPath);
  await execOrThrow(session, "git config user.email 'keystone@example.invalid'", repositoryPath);
  await execOrThrow(session, "git add .", repositoryPath);
  await execOrThrow(session, "git commit -m 'Seed workspace fixture'", repositoryPath);
}

export async function createTaskWorktree(
  session: ExecutionSession,
  input: {
    repositoryPath: string;
    worktreePath: string;
    branchName: string;
    baseRef: string;
  }
) {
  await execOrThrow(
    session,
    `git worktree add --force -B ${quoteShellArgument(input.branchName)} ${quoteShellArgument(input.worktreePath)} ${quoteShellArgument(input.baseRef)}`,
    input.repositoryPath
  );
}

async function isReusableTaskWorktree(
  session: ExecutionSession,
  input: {
    repositoryPath: string;
    worktreePath: string;
    branchName: string;
    baseRef: string;
  }
) {
  const insideWorktree = await tryExec(
    session,
    "git rev-parse --is-inside-work-tree",
    input.worktreePath
  );

  if (!insideWorktree.success || insideWorktree.stdout.trim() !== "true") {
    return false;
  }

  const commonDir = await tryExec(
    session,
    "git rev-parse --path-format=absolute --git-common-dir",
    input.worktreePath
  );

  if (!commonDir.success || commonDir.stdout.trim() !== `${input.repositoryPath}/.git`) {
    return false;
  }

  const currentBranch = await tryExec(
    session,
    "git symbolic-ref --quiet --short HEAD",
    input.worktreePath
  );

  if (!currentBranch.success || currentBranch.stdout.trim() !== input.branchName) {
    return false;
  }

  const baseReachable = await tryExec(
    session,
    `git rev-parse --verify ${quoteShellArgument(input.baseRef)}^{commit}`,
    input.worktreePath
  );

  return baseReachable.success;
}

async function recreateTaskWorktree(
  session: ExecutionSession,
  input: {
    repositoryPath: string;
    worktreePath: string;
    branchName: string;
    baseRef: string;
  }
) {
  await session.exec(
    `chmod -R u+w ${quoteShellArgument(input.worktreePath)} 2>/dev/null || true && rm -rf ${quoteShellArgument(input.worktreePath)}`,
    {}
  );
  await session.exec("git worktree prune", {
    cwd: input.repositoryPath
  });
  await createTaskWorktree(session, input);
}

export async function ensureTaskWorktree(
  session: ExecutionSession,
  input: {
    repositoryPath: string;
    worktreePath: string;
    branchName: string;
    baseRef: string;
  }
) {
  const existingGitDirectory = await session.exists(`${input.worktreePath}/.git`);

  if (existingGitDirectory.exists) {
    if (await isReusableTaskWorktree(session, input)) {
      return;
    }

    await recreateTaskWorktree(session, input);
    return;
  }

  await createTaskWorktree(session, input);
}

export async function getHeadSha(
  session: ExecutionSession,
  repositoryPath: string
) {
  const result = await execOrThrow(session, "git rev-parse HEAD", repositoryPath);

  return result.stdout.trim();
}
