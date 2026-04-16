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

export async function getHeadSha(
  session: ExecutionSession,
  repositoryPath: string
) {
  const result = await execOrThrow(session, "git rev-parse HEAD", repositoryPath);

  return result.stdout.trim();
}
