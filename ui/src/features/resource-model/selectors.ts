import {
  getResourceModelIndexes,
  uiScaffoldDataset,
  type ResourceModelIndexes
} from "./scaffold-dataset";
import {
  getPlanningPhaseForDocumentKind,
  planningDocumentKindByRunPhase,
  type RunPhaseId,
  type RunPlanningPhaseId
} from "./run-phase";
import type {
  ResourceArtifact,
  ResourceDocument,
  ResourceDocumentRevision,
  ResourceModelDataset,
  ResourceDocumentKind,
  ResourceProject
} from "./types";
import { buildRunPath, buildRunTaskPath } from "../../shared/navigation/run-phases";

export interface CurrentProjectSummary {
  projectId: string;
  projectKey: string;
  displayName: string;
}

export interface RunScaffoldSummary {
  runId: string;
  displayId: string;
  summary: string;
  status: string;
  updatedLabel: string;
  detailPath: string;
  defaultPhaseId: RunPhaseId;
}

export interface PlanningDocumentSelection {
  phaseId: RunPlanningPhaseId;
  document: ResourceDocument;
  revision: ResourceDocumentRevision;
}

export interface DocumentationTreeDocument {
  documentId: string;
  label: string;
  viewerTitle: string;
  contentLines: string[];
}

export interface DocumentationTreeGroup {
  groupId: string;
  label: string;
  documents: DocumentationTreeDocument[];
}

export interface WorkstreamTaskSummary {
  rowId: string;
  taskId: string;
  taskDisplayId: string;
  title: string;
  runDisplayId: string;
  status: string;
  updatedLabel: string;
  detailPath: string;
}

function getIndexes(dataset: ResourceModelDataset) {
  return getResourceModelIndexes(dataset);
}

function getRevisionForDocument(
  document: ResourceDocument,
  indexes: ResourceModelIndexes
): ResourceDocumentRevision {
  const revision = indexes.documentRevisionsById.get(document.currentRevisionId);

  if (!revision) {
    throw new Error(`Document "${document.documentId}" is missing revision "${document.currentRevisionId}".`);
  }

  return revision;
}

function compareDocumentsByLabel(left: ResourceDocument, right: ResourceDocument) {
  return left.label.localeCompare(right.label);
}

export function listProjects(dataset: ResourceModelDataset = uiScaffoldDataset) {
  return dataset.projects;
}

export function getProject(projectId: string, dataset: ResourceModelDataset = uiScaffoldDataset) {
  return getIndexes(dataset).projectsById.get(projectId) ?? null;
}

export function getCurrentProject(
  dataset: ResourceModelDataset = uiScaffoldDataset,
  projectId: string = dataset.meta.defaultProjectId
) {
  return getProject(projectId, dataset);
}

export function selectCurrentProjectSummary(
  dataset: ResourceModelDataset = uiScaffoldDataset,
  projectId: string = dataset.meta.defaultProjectId
): CurrentProjectSummary {
  const project = getCurrentProject(dataset, projectId);

  if (!project) {
    throw new Error(`Current project "${projectId}" is missing from the scaffold dataset.`);
  }

  return {
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName
  };
}

export function listRunsForProject(
  projectId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
) {
  return dataset.runs.filter((run) => run.projectId === projectId);
}

export function getRun(runId: string, dataset: ResourceModelDataset = uiScaffoldDataset) {
  return getIndexes(dataset).runsById.get(runId) ?? null;
}

export function listRunTasks(runId: string, dataset: ResourceModelDataset = uiScaffoldDataset) {
  return [...(getIndexes(dataset).tasksByRunId.get(runId) ?? [])];
}

export function getTask(taskId: string, dataset: ResourceModelDataset = uiScaffoldDataset) {
  return getIndexes(dataset).tasksById.get(taskId) ?? null;
}

export function getRunWorkflowGraph(
  runId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
) {
  return getIndexes(dataset).workflowGraphsByRunId.get(runId) ?? null;
}

export function getTaskArtifacts(
  taskId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
): ResourceArtifact[] {
  return [...(getIndexes(dataset).artifactsByTaskId.get(taskId) ?? [])];
}

export function listRunPlanningDocuments(
  runId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
): PlanningDocumentSelection[] {
  const indexes = getIndexes(dataset);

  return (indexes.documentsByRunId.get(runId) ?? [])
    .flatMap((document) => {
      const phaseId = getPlanningPhaseForDocumentKind(document.kind);

      if (!phaseId) {
        return [];
      }

      return [
        {
          phaseId,
          document,
          revision: getRevisionForDocument(document, indexes)
        }
      ];
    })
    .sort((left, right) => {
      const leftOrder = Object.keys(planningDocumentKindByRunPhase).indexOf(left.phaseId);
      const rightOrder = Object.keys(planningDocumentKindByRunPhase).indexOf(right.phaseId);

      return leftOrder - rightOrder;
    });
}

export function getRunPlanningDocument(
  runId: string,
  phaseId: RunPlanningPhaseId,
  dataset: ResourceModelDataset = uiScaffoldDataset
) {
  const indexes = getIndexes(dataset);
  const kind = planningDocumentKindByRunPhase[phaseId];
  const document = (indexes.documentsByRunId.get(runId) ?? []).find(
    (candidate) => candidate.kind === kind
  );

  if (!document) {
    return null;
  }

  return {
    phaseId,
    document,
    revision: getRevisionForDocument(document, indexes)
  };
}

export function getRunDefaultPhaseId(
  runId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
): RunPhaseId {
  if (listRunTasks(runId, dataset).length > 0) {
    return "execution";
  }

  if (getRunPlanningDocument(runId, "execution-plan", dataset)) {
    return "execution-plan";
  }

  if (getRunPlanningDocument(runId, "architecture", dataset)) {
    return "architecture";
  }

  return "specification";
}

export function getRunSummary(
  runId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
): RunScaffoldSummary | null {
  const run = getRun(runId, dataset);

  if (!run) {
    return null;
  }

  return {
    runId: run.runId,
    displayId: run.displayId,
    summary: run.summary,
    status: run.status,
    updatedLabel: run.updatedLabel,
    detailPath: buildRunPath(run.runId),
    defaultPhaseId: getRunDefaultPhaseId(run.runId, dataset)
  };
}

export function listRunSummaries(
  projectId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
) {
  return listRunsForProject(projectId, dataset).map((run) => {
    return getRunSummary(run.runId, dataset)!;
  });
}

export function listProjectWorkstreamTasks(
  projectId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
): WorkstreamTaskSummary[] {
  const indexes = getIndexes(dataset);

  return (indexes.tasksByProjectId.get(projectId) ?? []).map((task) => {
    const run = indexes.runsById.get(task.runId);

    if (!run) {
      throw new Error(`Task "${task.taskId}" references missing run "${task.runId}".`);
    }

    return {
      rowId: `${task.runId}-${task.taskId}`,
      taskId: task.taskId,
      taskDisplayId: task.displayId,
      title: task.title,
      runDisplayId: run.displayId,
      status: task.status,
      updatedLabel: task.updatedLabel,
      detailPath: buildRunTaskPath(task.runId, task.taskId)
    };
  });
}

const documentationGroupDefinitions = [
  {
    groupId: "product-specifications",
    label: "Product Specifications",
    kinds: ["product-specification"] as ResourceDocumentKind[]
  },
  {
    groupId: "technical-architecture",
    label: "Technical Architecture",
    kinds: ["technical-architecture"] as ResourceDocumentKind[]
  },
  {
    groupId: "miscellaneous-notes",
    label: "Miscellaneous Notes",
    kinds: ["miscellaneous-note"] as ResourceDocumentKind[]
  }
];

export function listProjectDocumentationGroups(
  projectId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
): DocumentationTreeGroup[] {
  const indexes = getIndexes(dataset);
  const projectDocuments = indexes.projectDocumentsByProjectId.get(projectId) ?? [];

  return documentationGroupDefinitions.map((group) => ({
    groupId: group.groupId,
    label: group.label,
    documents: projectDocuments
      .filter((document) => group.kinds.includes(document.kind))
      .sort(compareDocumentsByLabel)
      .map((document) => {
        const revision = getRevisionForDocument(document, indexes);

        return {
          documentId: document.documentId,
          label: document.label,
          viewerTitle: revision.viewerTitle,
          contentLines: revision.contentLines
        };
      })
  }));
}

export function getDocumentationDocument(
  documentId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
) {
  const indexes = getIndexes(dataset);
  const document = indexes.documentsById.get(documentId);

  if (!document || document.scopeType !== "project") {
    return null;
  }

  const revision = getRevisionForDocument(document, indexes);

  return {
    document,
    revision
  };
}

export function getDefaultDocumentationDocumentId(
  projectId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
) {
  return listProjectDocumentationGroups(projectId, dataset)[0]?.documents[0]?.documentId ?? "";
}

export function getProjectDocumentationDocument(
  documentId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
) {
  const selection = getDocumentationDocument(documentId, dataset);

  if (!selection) {
    return null;
  }

  return {
    documentId: selection.document.documentId,
    viewerTitle: selection.revision.viewerTitle,
    contentLines: selection.revision.contentLines
  };
}

export function createProjectOverrideDataset(
  project: CurrentProjectSummary,
  dataset: ResourceModelDataset = uiScaffoldDataset
) {
  const existingProject = dataset.projects.find(
    (candidate) => candidate.projectId === dataset.meta.defaultProjectId
  );

  const overrideProject: ResourceProject = {
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: existingProject?.description ?? `${project.displayName} project scaffold.`
  };

  const remainingProjects = dataset.projects.filter(
    (candidate) => candidate.projectId !== dataset.meta.defaultProjectId
  );

  return {
    ...dataset,
    meta: {
      ...dataset.meta,
      defaultProjectId: overrideProject.projectId
    },
    projects: [overrideProject, ...remainingProjects]
  };
}
