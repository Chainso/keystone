export type ResourceDocumentScopeType = "project" | "run";

export type ResourceDocumentKind =
  | "product-specification"
  | "technical-architecture"
  | "execution-plan"
  | "miscellaneous-note";

export type ResourceRunStatus = "Draft" | "In progress" | "Complete" | "Blocked";

export type ResourceTaskStatus = "Ready" | "Queued" | "Running" | "Blocked" | "Complete";

export interface ConversationLocator {
  agentClass: string;
  agentName: string;
}

export interface ResourceProject {
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string;
}

export interface ResourceRun {
  runId: string;
  projectId: string;
  displayId: string;
  summary: string;
  status: ResourceRunStatus;
  updatedLabel: string;
  hasCompiledTasks: boolean;
}

export interface ResourceDocument {
  documentId: string;
  projectId: string;
  runId?: string;
  scopeType: ResourceDocumentScopeType;
  kind: ResourceDocumentKind;
  label: string;
  title: string;
  path: string;
  currentRevisionId: string;
  conversationLocator?: ConversationLocator;
}

export interface ResourceDocumentRevision {
  revisionId: string;
  documentId: string;
  viewerTitle: string;
  contentLines: string[];
}

export interface ResourceTask {
  taskId: string;
  projectId: string;
  runId: string;
  displayId: string;
  graphLabel: string;
  title: string;
  status: ResourceTaskStatus;
  updatedLabel: string;
  dependsOn: string[];
  blockedBy: string[];
  conversationLocator?: ConversationLocator;
  artifactIds: string[];
}

export interface ResourceWorkflowNode {
  taskId: string;
  graphLabel: string;
}

export interface ResourceWorkflowGraph {
  runId: string;
  nodes: ResourceWorkflowNode[];
}

export interface ResourceArtifact {
  artifactId: string;
  runId: string;
  taskId: string;
  path: string;
  summary: string;
  diff: string[];
}

export interface ResourceModelDataset {
  meta: {
    defaultProjectId: string;
    source: "scaffold";
  };
  projects: ResourceProject[];
  runs: ResourceRun[];
  documents: ResourceDocument[];
  documentRevisions: ResourceDocumentRevision[];
  tasks: ResourceTask[];
  workflowGraphs: ResourceWorkflowGraph[];
  artifacts: ResourceArtifact[];
}
