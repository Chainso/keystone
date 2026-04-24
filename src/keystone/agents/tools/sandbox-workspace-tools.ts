import { posix as path } from "node:path";

import type { FileInfo } from "@cloudflare/shell";
import {
  createDeleteTool,
  createEditTool,
  createFindTool,
  createGrepTool,
  createListTool,
  createReadTool,
  createWriteTool,
  type DeleteOperations,
  type EditOperations,
  type FindOperations,
  type GrepOperations,
  type ListOperations,
  type ReadOperations,
  type WriteOperations
} from "@cloudflare/think/tools/workspace";
import type { ToolSet } from "ai";

import type { SandboxAgentBridge } from "../../../lib/workspace/init";
import {
  isSandboxAgentReadOnlyRoot,
  listSandboxAgentFiles,
  mkdirSandboxAgentPath,
  readSandboxAgentFile,
  resolveSandboxAgentPath,
  sandboxAgentPathExists,
  writeSandboxAgentFile,
  type SandboxFilesystemBridge
} from "./filesystem";

type WorkspaceOperations = ReadOperations &
  WriteOperations &
  EditOperations &
  ListOperations &
  FindOperations &
  GrepOperations &
  DeleteOperations;

type VirtualDirectoryEntry = {
  path: string;
  name: string;
  type: "directory";
};

const virtualContainerDirectories: Record<string, VirtualDirectoryEntry[]> = {
  "/": [
    { path: "/workspace", name: "workspace", type: "directory" },
    { path: "/documents", name: "documents", type: "directory" },
    { path: "/artifacts", name: "artifacts", type: "directory" },
    { path: "/keystone", name: "keystone", type: "directory" }
  ],
  "/artifacts": [
    { path: "/artifacts/in", name: "in", type: "directory" },
    { path: "/artifacts/out", name: "out", type: "directory" }
  ]
};

function nowTimestamp() {
  return Date.now();
}

function toWorkspaceDirectoryInfo(entry: VirtualDirectoryEntry): FileInfo {
  const timestamp = nowTimestamp();

  return {
    path: entry.path,
    name: entry.name,
    type: "directory",
    mimeType: "inode/directory",
    size: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function mapSandboxFileType(type: string): FileInfo["type"] {
  if (type === "directory" || type === "symlink") {
    return type;
  }

  return "file";
}

function toWorkspaceFileInfo(file: Awaited<ReturnType<typeof listSandboxAgentFiles>>["files"][number]): FileInfo {
  const updatedAt = Number.isNaN(Date.parse(file.modifiedAt))
    ? nowTimestamp()
    : Date.parse(file.modifiedAt);

  return {
    path: file.absolutePath,
    name: file.name,
    type: mapSandboxFileType(file.type),
    mimeType: file.type === "directory" ? "inode/directory" : "text/plain",
    size: file.size,
    createdAt: updatedAt,
    updatedAt
  };
}

function quoteShellArgument(value: string) {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

function createGlobMatcher(pattern: string) {
  let index = 0;
  let regex = "^";

  while (index < pattern.length) {
    const char = pattern[index];

    if (char === undefined) {
      break;
    }

    if (char === "*") {
      if (pattern[index + 1] === "*") {
        index += 2;
        if (pattern[index] === "/") {
          regex += "(?:.+/)?";
          index += 1;
        } else {
          regex += ".*";
        }
      } else {
        regex += "[^/]*";
        index += 1;
      }
    } else if (char === "?") {
      regex += "[^/]";
      index += 1;
    } else if (char === "[") {
      const close = pattern.indexOf("]", index + 1);

      if (close === -1) {
        regex += "\\[";
        index += 1;
      } else {
        regex += pattern.slice(index, close + 1);
        index = close + 1;
      }
    } else if (char === "{") {
      const close = pattern.indexOf("}", index + 1);

      if (close === -1) {
        regex += "\\{";
        index += 1;
      } else {
        regex += `(?:${pattern.slice(index + 1, close).split(",").join("|")})`;
        index = close + 1;
      }
    } else {
      regex += char.replace(/[.+^$|\\()]/g, "\\$&");
      index += 1;
    }
  }

  return new RegExp(`${regex}$`);
}

function normalizeGlobPattern(pattern: string) {
  const trimmed = pattern.trim();

  if (!trimmed) {
    throw new Error("Glob pattern is required.");
  }

  if (trimmed.startsWith("/")) {
    return path.normalize(trimmed);
  }

  return path.normalize(path.join("/workspace", trimmed));
}

function getSearchRoots(bridge: SandboxAgentBridge, absolutePattern: string) {
  const roots = [
    bridge.layout.workspaceRoot,
    bridge.layout.documentsRoot,
    bridge.layout.artifactsInRoot,
    bridge.layout.artifactsOutRoot,
    bridge.layout.keystoneRoot
  ];

  if (absolutePattern === "/" || absolutePattern.startsWith("/**")) {
    return roots;
  }

  if (absolutePattern === "/artifacts" || absolutePattern.startsWith("/artifacts/")) {
    return [bridge.layout.artifactsInRoot, bridge.layout.artifactsOutRoot];
  }

  return roots.filter(
    (root) => absolutePattern === root || absolutePattern.startsWith(`${root}/`)
  );
}

async function listRootRecursive(
  bridge: SandboxFilesystemBridge,
  root: string
) {
  try {
    const result = await listSandboxAgentFiles(bridge, root, {
      recursive: true,
      includeHidden: true
    });

    return result.files.map(toWorkspaceFileInfo);
  } catch {
    return [];
  }
}

async function readFileOrNull(
  bridge: SandboxFilesystemBridge,
  requestedPath: string
) {
  const exists = await sandboxAgentPathExists(bridge, requestedPath);

  if (!exists.exists) {
    return null;
  }

  try {
    return (await readSandboxAgentFile(bridge, requestedPath)).content;
  } catch {
    return null;
  }
}

async function statPath(
  bridge: SandboxFilesystemBridge,
  requestedPath: string
): Promise<FileInfo | null> {
  const normalized = path.normalize(requestedPath.trim() || "/");
  const virtualEntries = virtualContainerDirectories[normalized];

  if (virtualEntries) {
    return toWorkspaceDirectoryInfo({
      path: normalized,
      name: normalized === "/" ? "" : path.basename(normalized),
      type: "directory"
    });
  }

  const resolved = resolveSandboxAgentPath(bridge.bridge, normalized);
  const exists = await bridge.session.exists(resolved.sandboxPath);

  if (!exists.exists) {
    return null;
  }

  const parentPath = path.dirname(resolved.virtualPath);

  if (parentPath !== resolved.virtualPath && parentPath !== ".") {
    try {
      const parent = await listSandboxAgentFiles(bridge, parentPath, {
        includeHidden: true
      });
      const entry = parent.files.find((file) => file.absolutePath === resolved.virtualPath);

      if (entry) {
        return toWorkspaceFileInfo(entry);
      }
    } catch {
      // Fall back to directory-ish metadata below for roots and unusual SDK responses.
    }
  }

  return toWorkspaceDirectoryInfo({
    path: resolved.virtualPath,
    name: path.basename(resolved.virtualPath),
    type: "directory"
  });
}

function createSandboxWorkspaceOperations(
  loadBridge: () => Promise<SandboxFilesystemBridge>
): WorkspaceOperations {
  return {
    readFile: async (requestedPath) => readFileOrNull(await loadBridge(), requestedPath),
    stat: async (requestedPath) => statPath(await loadBridge(), requestedPath),
    writeFile: async (requestedPath, content) => {
      const bridge = await loadBridge();
      const parentPath = path.dirname(path.normalize(requestedPath));

      if (parentPath && parentPath !== "/" && parentPath !== ".") {
        await mkdirSandboxAgentPath(bridge, parentPath, { recursive: true });
      }

      await writeSandboxAgentFile(bridge, requestedPath, content);
    },
    mkdir: async (requestedPath, opts) => {
      await mkdirSandboxAgentPath(await loadBridge(), requestedPath, opts);
    },
    readDir: async (requestedPath, opts) => {
      const bridge = await loadBridge();
      const normalized = path.normalize(requestedPath.trim() || "/");
      const virtualEntries = virtualContainerDirectories[normalized];

      if (virtualEntries) {
        return virtualEntries
          .map(toWorkspaceDirectoryInfo)
          .slice(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? virtualEntries.length));
      }

      const result = await listSandboxAgentFiles(bridge, normalized, {
        includeHidden: true
      });
      const offset = opts?.offset ?? 0;
      const limit = opts?.limit ?? result.files.length;

      return result.files.slice(offset, offset + limit).map(toWorkspaceFileInfo);
    },
    glob: async (pattern) => {
      const bridge = await loadBridge();
      const absolutePattern = normalizeGlobPattern(pattern);
      const matcher = createGlobMatcher(absolutePattern);
      const roots = getSearchRoots(bridge.bridge, absolutePattern);
      const entries = (
        await Promise.all(roots.map((root) => listRootRecursive(bridge, root)))
      ).flat();
      const seen = new Set<string>();

      return entries
        .filter((entry) => matcher.test(entry.path))
        .filter((entry) => {
          if (seen.has(entry.path)) {
            return false;
          }

          seen.add(entry.path);
          return true;
        })
        .sort((left, right) => left.path.localeCompare(right.path));
    },
    rm: async (requestedPath, opts) => {
      const bridge = await loadBridge();
      const resolved = resolveSandboxAgentPath(bridge.bridge, requestedPath);

      if (isSandboxAgentReadOnlyRoot(resolved.root)) {
        throw new Error(`Deletes are not allowed under ${resolved.virtualPath}`);
      }

      if (Object.values(bridge.bridge.layout).includes(resolved.virtualPath)) {
        throw new Error(`Refusing to delete sandbox root ${resolved.virtualPath}`);
      }

      const result = await bridge.session.exec(
        opts?.recursive
          ? `rm -rf ${quoteShellArgument(resolved.sandboxPath)}`
          : `rm -f ${quoteShellArgument(resolved.sandboxPath)}`
      );

      if (!result.success) {
        throw new Error(
          `Failed to delete ${resolved.virtualPath}: ${result.stderr || result.stdout}`
        );
      }
    }
  };
}

export function createSandboxWorkspaceTools(
  loadBridge: () => Promise<SandboxFilesystemBridge>
): ToolSet {
  let bridgePromise: Promise<SandboxFilesystemBridge> | null = null;
  const loadBridgeOnce = () => {
    bridgePromise ??= loadBridge();

    return bridgePromise;
  };
  const ops = createSandboxWorkspaceOperations(loadBridgeOnce);

  return {
    read: createReadTool({ ops }),
    write: createWriteTool({ ops }),
    edit: createEditTool({ ops }),
    list: createListTool({ ops }),
    find: createFindTool({ ops }),
    grep: createGrepTool({ ops }),
    delete: createDeleteTool({ ops })
  };
}
