import { posix as path } from "node:path";

import type { ExecutionSession, ListFilesOptions } from "@cloudflare/sandbox";

import type { SandboxAgentBridge } from "../../../lib/workspace/init";

export interface SandboxFilesystemBridge {
  session: ExecutionSession;
  bridge: SandboxAgentBridge;
}

export interface ResolvedSandboxPath {
  requestedPath: string;
  virtualPath: string;
  sandboxPath: string;
  root: keyof SandboxAgentBridge["layout"];
}

const readOnlyRoots = new Set<keyof SandboxAgentBridge["layout"]>(["artifactsInRoot", "keystoneRoot"]);
const writableRoots = new Set<keyof SandboxAgentBridge["layout"]>(["workspaceRoot", "artifactsOutRoot"]);

function normalizeRequestedPath(requestedPath: string) {
  const trimmed = requestedPath.trim();

  if (!trimmed) {
    throw new Error("Path is required.");
  }

  return path.normalize(trimmed.startsWith("/") ? trimmed : path.join("/workspace", trimmed));
}

function resolvePathFromRoot(
  bridge: SandboxAgentBridge,
  root: keyof SandboxAgentBridge["layout"],
  virtualPath: string
) {
  const virtualRoot = bridge.layout[root];
  const targetRoot = bridge.targets[root];

  if (virtualPath === virtualRoot) {
    return {
      sandboxPath: targetRoot,
      root
    };
  }

  if (virtualPath.startsWith(`${virtualRoot}/`)) {
    return {
      sandboxPath: `${targetRoot}${virtualPath.slice(virtualRoot.length)}`,
      root
    };
  }

  return null;
}

export function resolveSandboxAgentPath(
  bridge: SandboxAgentBridge,
  requestedPath: string
): ResolvedSandboxPath {
  const virtualPath = normalizeRequestedPath(requestedPath);
  const candidates: Array<keyof SandboxAgentBridge["layout"]> = [
    "artifactsInRoot",
    "artifactsOutRoot",
    "keystoneRoot",
    "workspaceRoot"
  ];

  for (const root of candidates) {
    const resolved = resolvePathFromRoot(bridge, root, virtualPath);

    if (resolved) {
      return {
        requestedPath,
        virtualPath,
        sandboxPath: resolved.sandboxPath,
        root
      };
    }
  }

  throw new Error(`Unsupported sandbox path: ${requestedPath}`);
}

function assertWritablePath(resolvedPath: ResolvedSandboxPath) {
  if (!writableRoots.has(resolvedPath.root)) {
    throw new Error(`Writes are not allowed under ${resolvedPath.virtualPath}`);
  }
}

function toVirtualPath(
  bridge: SandboxAgentBridge,
  absolutePath: string
) {
  const candidateRoots: Array<keyof SandboxAgentBridge["targets"]> = [
    "workspaceRoot",
    "artifactsInRoot",
    "artifactsOutRoot",
    "keystoneRoot"
  ];

  for (const root of candidateRoots) {
    const targetRoot = bridge.targets[root];
    const virtualRoot = bridge.layout[root];

    if (absolutePath === targetRoot) {
      return virtualRoot;
    }

    if (absolutePath.startsWith(`${targetRoot}/`)) {
      return `${virtualRoot}${absolutePath.slice(targetRoot.length)}`;
    }
  }

  return absolutePath;
}

export async function readSandboxAgentFile(
  bridge: SandboxFilesystemBridge,
  requestedPath: string,
  options?: {
    encoding?: string | undefined;
  }
) {
  const resolvedPath = resolveSandboxAgentPath(bridge.bridge, requestedPath);
  const readOptions = options?.encoding ? { encoding: options.encoding } : undefined;

  return bridge.session.readFile(resolvedPath.sandboxPath, readOptions);
}

export async function writeSandboxAgentFile(
  bridge: SandboxFilesystemBridge,
  requestedPath: string,
  content: string,
  options?: {
    encoding?: string | undefined;
  }
) {
  const resolvedPath = resolveSandboxAgentPath(bridge.bridge, requestedPath);

  assertWritablePath(resolvedPath);
  const writeOptions = options?.encoding ? { encoding: options.encoding } : undefined;

  return bridge.session.writeFile(resolvedPath.sandboxPath, content, writeOptions);
}

export async function mkdirSandboxAgentPath(
  bridge: SandboxFilesystemBridge,
  requestedPath: string,
  options?: {
    recursive?: boolean | undefined;
  }
) {
  const resolvedPath = resolveSandboxAgentPath(bridge.bridge, requestedPath);

  assertWritablePath(resolvedPath);
  const mkdirOptions =
    options?.recursive !== undefined ? { recursive: options.recursive } : undefined;

  return bridge.session.mkdir(resolvedPath.sandboxPath, mkdirOptions);
}

export async function sandboxAgentPathExists(
  bridge: SandboxFilesystemBridge,
  requestedPath: string
) {
  const resolvedPath = resolveSandboxAgentPath(bridge.bridge, requestedPath);

  return bridge.session.exists(resolvedPath.sandboxPath);
}

export async function listSandboxAgentFiles(
  bridge: SandboxFilesystemBridge,
  requestedPath: string,
  options?: ListFilesOptions
) {
  const resolvedPath = resolveSandboxAgentPath(bridge.bridge, requestedPath);
  const result = await bridge.session.listFiles(resolvedPath.sandboxPath, options);

  return {
    ...result,
    path: resolvedPath.virtualPath,
    files: result.files.map((file) => ({
      ...file,
      absolutePath: toVirtualPath(bridge.bridge, file.absolutePath),
      relativePath: path.relative(resolvedPath.virtualPath, toVirtualPath(bridge.bridge, file.absolutePath))
    }))
  };
}

export async function listSandboxAgentStagedOutputs(
  bridge: SandboxFilesystemBridge
) {
  const stagedResult = await listSandboxAgentFiles(
    bridge,
    bridge.bridge.layout.artifactsOutRoot,
    {
      recursive: true,
      includeHidden: true
    }
  );

  return stagedResult.files.filter((file) => file.type === "file");
}

export function isSandboxAgentReadOnlyRoot(root: keyof SandboxAgentBridge["layout"]) {
  return readOnlyRoots.has(root);
}
