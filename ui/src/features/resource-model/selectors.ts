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
  ResourceProjectConfiguration,
  ResourceProjectConfigurationComponent,
  ResourceProjectConfigurationRules,
  ResourceProjectEnvironmentVariable,
  ResourceProject
} from "./types";
import {
  buildRunPhasePath,
  buildRunTaskPath
} from "../../shared/navigation/run-phases";

export interface CurrentProjectSummary {
  projectId: string;
  projectKey: string;
  displayName: string;
  description: string;
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
  title: string;
  path: string;
  viewerTitle: string;
  contentLines: string[];
}

export interface DocumentationTreeGroup {
  groupId: string;
  label: string;
  documents: DocumentationTreeDocument[];
}

export interface ProjectDocumentationSelection {
  groups: DocumentationTreeGroup[];
  selectedDocument: DocumentationTreeDocument;
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

export interface ProjectConfigurationSelection {
  configurationId: string;
  overview: {
    displayName: string;
    projectKey: string;
    description: string;
  };
  components: ResourceProjectConfigurationComponent[];
  rules: ResourceProjectConfigurationRules;
  environmentVariables: ResourceProjectEnvironmentVariable[];
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

function compareDocumentationTreeDocuments(
  left: DocumentationTreeDocument,
  right: DocumentationTreeDocument
) {
  const labelOrder = left.label.localeCompare(right.label);

  if (labelOrder !== 0) {
    return labelOrder;
  }

  return left.path.localeCompare(right.path);
}

function getDocumentationPathSegments(path: string) {
  return path.split("/").filter(Boolean);
}

function formatDocumentationGroupLabel(segment: string) {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getDocumentationGroupDefinition(document: ResourceDocument) {
  const pathSegments = getDocumentationPathSegments(document.path);
  const groupSegments = pathSegments.slice(0, -1);
  const primaryGroupSegment =
    groupSegments[1] ?? groupSegments[0] ?? document.kind;

  if (primaryGroupSegment === "product") {
    return {
      groupId: `${document.scopeType}:docs/product`,
      label: "Product Specifications"
    };
  }

  if (primaryGroupSegment === "architecture") {
    return {
      groupId: `${document.scopeType}:docs/architecture`,
      label: "Technical Architecture"
    };
  }

  if (primaryGroupSegment === "notes") {
    return {
      groupId: `${document.scopeType}:docs/notes`,
      label: "Miscellaneous Notes"
    };
  }

  return {
    groupId: `${document.scopeType}:${groupSegments.join("/") || document.kind}`,
    label: formatDocumentationGroupLabel(primaryGroupSegment)
  };
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
    displayName: project.displayName,
    description: project.description
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
  const run = getRun(runId, dataset);

  if (run?.hasCompiledTasks) {
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

  const defaultPhaseId = getRunDefaultPhaseId(run.runId, dataset);

  return {
    runId: run.runId,
    displayId: run.displayId,
    summary: run.summary,
    status: run.status,
    updatedLabel: run.updatedLabel,
    detailPath: buildRunPhasePath(run.runId, defaultPhaseId),
    defaultPhaseId
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

export function listProjectDocumentationGroups(
  projectId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
): DocumentationTreeGroup[] {
  const indexes = getIndexes(dataset);
  const projectDocuments = indexes.projectDocumentsByProjectId.get(projectId) ?? [];
  const groups = new Map<string, DocumentationTreeGroup>();

  for (const document of projectDocuments) {
    const revision = getRevisionForDocument(document, indexes);
    const groupDefinition = getDocumentationGroupDefinition(document);
    const group =
      groups.get(groupDefinition.groupId) ??
      ({
        groupId: groupDefinition.groupId,
        label: groupDefinition.label,
        documents: []
      } satisfies DocumentationTreeGroup);

    group.documents.push({
      documentId: document.documentId,
      label: document.label,
      title: document.title,
      path: document.path,
      viewerTitle: revision.viewerTitle,
      contentLines: revision.contentLines
    });

    groups.set(group.groupId, group);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    documents: [...group.documents].sort(compareDocumentationTreeDocuments)
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

export function getProjectDocumentationSelection(
  projectId: string,
  documentId: string | null | undefined,
  dataset: ResourceModelDataset = uiScaffoldDataset
): ProjectDocumentationSelection | null {
  const groups = listProjectDocumentationGroups(projectId, dataset);
  const documents = groups.flatMap((group) => group.documents);

  if (documents.length === 0) {
    return null;
  }

  const selectedDocument =
    documents.find((candidate) => candidate.documentId === documentId) ?? documents[0]!;

  return {
    groups,
    selectedDocument
  };
}

function selectProjectConfiguration(
  configuration: ResourceProjectConfiguration
): ProjectConfigurationSelection {
  return {
    configurationId: configuration.configurationId,
    overview: { ...configuration.overview },
    components: configuration.components.map((component) => ({ ...component })),
    rules: {
      reviewInstructions: [...configuration.rules.reviewInstructions],
      testInstructions: [...configuration.rules.testInstructions]
    },
    environmentVariables: configuration.environmentVariables.map((environmentVariable) => ({
      ...environmentVariable
    }))
  };
}

export function getNewProjectConfiguration(
  dataset: ResourceModelDataset = uiScaffoldDataset
): ProjectConfigurationSelection | null {
  const configuration = getIndexes(dataset).projectConfigurationTemplate;

  if (!configuration) {
    return null;
  }

  return selectProjectConfiguration(configuration);
}

export function getProjectConfiguration(
  projectId: string,
  dataset: ResourceModelDataset = uiScaffoldDataset
): ProjectConfigurationSelection | null {
  const configuration = getIndexes(dataset).projectConfigurationsByProjectId.get(projectId);

  if (!configuration) {
    return null;
  }

  return selectProjectConfiguration(configuration);
}

export function createProjectOverrideDataset(
  project: CurrentProjectSummary,
  dataset: ResourceModelDataset = uiScaffoldDataset
) {
  const sourceProjectId = dataset.meta.defaultProjectId;

  const overrideProject: ResourceProject = {
    projectId: project.projectId,
    projectKey: project.projectKey,
    displayName: project.displayName,
    description: project.description
  };

  const remainingProjects = dataset.projects.filter(
    (candidate) => candidate.projectId !== sourceProjectId
  );

  return {
    ...dataset,
    meta: {
      ...dataset.meta,
      defaultProjectId: overrideProject.projectId
    },
    projects: [overrideProject, ...remainingProjects],
    runs: dataset.runs.map((run) =>
      run.projectId === sourceProjectId ? { ...run, projectId: overrideProject.projectId } : run
    ),
    documents: dataset.documents.map((document) =>
      document.projectId === sourceProjectId
        ? { ...document, projectId: overrideProject.projectId }
        : document
    ),
    tasks: dataset.tasks.map((task) =>
      task.projectId === sourceProjectId ? { ...task, projectId: overrideProject.projectId } : task
    ),
    projectConfigurations: dataset.projectConfigurations.map((configuration) => {
      if (configuration.projectId !== sourceProjectId) {
        return configuration;
      }

      return {
        ...configuration,
        projectId: overrideProject.projectId,
        overview: {
          ...configuration.overview,
          displayName: project.displayName,
          projectKey: project.projectKey,
          description: project.description
        }
      };
    })
  };
}
