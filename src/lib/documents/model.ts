export const documentScopeTypeValues = ["project", "run"] as const;
export const documentKindValues = [
  "specification",
  "architecture",
  "execution_plan",
  "other"
] as const;

export type DocumentScopeType = (typeof documentScopeTypeValues)[number];
export type DocumentKind = (typeof documentKindValues)[number];
export type RunPlanningDocumentKind = Exclude<DocumentKind, "other">;

export interface DocumentConversationLocator {
  conversationAgentClass: string;
  conversationAgentName: string;
}

const projectScopedCanonicalPaths = {
  specification: "product/specification",
  architecture: "technical/architecture"
} as const satisfies Partial<Record<DocumentKind, string>>;

const runScopedCanonicalPaths = {
  specification: "specification",
  architecture: "architecture",
  execution_plan: "execution-plan"
} as const satisfies Partial<Record<DocumentKind, string>>;

const allowedKindsByScope = {
  project: new Set<DocumentKind>(["specification", "architecture", "other"]),
  run: new Set<DocumentKind>(["specification", "architecture", "execution_plan", "other"])
} as const;

export const planningDocumentConversationAgentClass = "PlanningDocumentAgent";

const documentPathPattern = /^[a-z0-9]+(?:[a-z0-9/_-]*[a-z0-9])?$/;

export function getCanonicalDocumentPath(scopeType: DocumentScopeType, kind: DocumentKind) {
  if (scopeType === "project") {
    switch (kind) {
      case "specification":
        return projectScopedCanonicalPaths.specification;
      case "architecture":
        return projectScopedCanonicalPaths.architecture;
      default:
        return undefined;
    }
  }

  switch (kind) {
    case "specification":
      return runScopedCanonicalPaths.specification;
    case "architecture":
      return runScopedCanonicalPaths.architecture;
    case "execution_plan":
      return runScopedCanonicalPaths.execution_plan;
    default:
      return undefined;
  }
}

export function normalizeDocumentPath(path: string) {
  return path.trim().replace(/^\/+|\/+$/g, "");
}

export function isRunPlanningDocumentKind(kind: DocumentKind): kind is RunPlanningDocumentKind {
  return kind === "specification" || kind === "architecture" || kind === "execution_plan";
}

export function isRunPlanningDocument(input: {
  kind: DocumentKind;
  scopeType: DocumentScopeType;
}): input is {
  kind: RunPlanningDocumentKind;
  scopeType: "run";
} {
  return input.scopeType === "run" && isRunPlanningDocumentKind(input.kind);
}

export function validateDocumentPath(path: string) {
  const normalizedPath = normalizeDocumentPath(path);

  if (normalizedPath.length === 0) {
    throw new Error("Document path is required.");
  }

  if (!documentPathPattern.test(normalizedPath) || normalizedPath.includes("//")) {
    throw new Error(
      `Document path ${normalizedPath} must use lowercase logical segments separated by "/" or "-".`
    );
  }

  return normalizedPath;
}

export function buildRunPlanningConversationLocator(input: {
  kind: RunPlanningDocumentKind;
  path?: string | undefined;
  runId: string;
  tenantId: string;
}): DocumentConversationLocator {
  const canonicalPath = validateDocumentKindPath(
    "run",
    input.kind,
    input.path ?? getCanonicalDocumentPath("run", input.kind) ?? input.kind
  );

  return {
    conversationAgentClass: planningDocumentConversationAgentClass,
    conversationAgentName: `tenant:${input.tenantId}:run:${input.runId}:document:${canonicalPath}`
  };
}

export function getRunPlanningConversationLocator(input: {
  kind: DocumentKind;
  path: string;
  runId: string | null;
  scopeType: DocumentScopeType;
  tenantId: string;
}) {
  if (!input.runId || !isRunPlanningDocument(input)) {
    return null;
  }

  return buildRunPlanningConversationLocator({
    tenantId: input.tenantId,
    runId: input.runId,
    kind: input.kind,
    path: input.path
  });
}

export function validateDocumentKindPath(
  scopeType: DocumentScopeType,
  kind: DocumentKind,
  path: string
) {
  if (!allowedKindsByScope[scopeType].has(kind)) {
    throw new Error(`Document kind ${kind} is not allowed for ${scopeType}-scoped documents.`);
  }

  const normalizedPath = validateDocumentPath(path);
  const canonicalPath = getCanonicalDocumentPath(scopeType, kind);
  const reservedPaths = new Set<string>(
    Object.values(scopeType === "project" ? projectScopedCanonicalPaths : runScopedCanonicalPaths)
  );

  if (canonicalPath && normalizedPath !== canonicalPath) {
    throw new Error(
      `${scopeType}-scoped ${kind} documents must use the canonical path ${canonicalPath}.`
    );
  }

  if (kind === "other" && reservedPaths.has(normalizedPath)) {
    throw new Error(
      `${scopeType}-scoped other documents cannot use reserved planning path ${normalizedPath}.`
    );
  }

  return normalizedPath;
}
