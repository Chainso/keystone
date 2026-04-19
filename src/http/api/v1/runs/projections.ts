import type { WorkerBindings } from "../../../../env";
import { runPlanArtifactKey } from "../../../../lib/artifacts/keys";
import { getArtifactText } from "../../../../lib/artifacts/r2";
import { isProjectScopedArtifactRunId } from "../../../../lib/db/artifacts";
import type {
  ArtifactRefRow,
  RunRow,
  SessionEventRow,
  SessionRow
} from "../../../../lib/db/schema";
import type { RunCoordinatorSnapshot } from "../../../../lib/runs/summary";
import { compiledRunPlanSchema } from "../../../../keystone/compile/contracts";
import type { ArtifactResource } from "../artifacts/contracts";
import { artifactResourceSchema } from "../artifacts/contracts";
import type {
  ApprovalResource,
  RunResource,
  TaskConversationMessage,
  TaskConversationResource,
  TaskResource,
  WorkflowGraphResource
} from "./contracts";
import {
  approvalResourceSchema,
  runResourceSchema,
  taskConversationMessageSchema,
  taskConversationResourceSchema,
  taskResourceSchema,
  workflowGraphResourceSchema
} from "./contracts";

type ApprovalRecord = {
  tenantId: string;
  approvalId: string;
  runId: string;
  sessionId: string;
  approvalType: string;
  status: string;
  requestedBy: string | null;
  requestedAt: Date | string;
  resolvedAt: Date | string | null;
  resolution: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
};

type TaskStatusSnapshot = {
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function getRunSession(sessions: SessionRow[]) {
  return sessions.find((session) => session.sessionType === "run") ?? sessions[0] ?? null;
}

function getRunProjectId(
  runRecord: RunRow | null | undefined,
  runSession: SessionRow | null,
  events: SessionEventRow[]
) {
  if (typeof runRecord?.projectId === "string" && runRecord.projectId.trim().length > 0) {
    return runRecord.projectId;
  }

  const metadata = asRecord(runSession?.metadata);
  const project = asRecord(metadata?.project);
  const projectId = asString(project?.projectId);

  if (projectId) {
    return projectId;
  }

  for (const event of [...events].reverse()) {
    const payloadProjectId = asString(asRecord(event.payload)?.projectId);

    if (payloadProjectId) {
      return payloadProjectId;
    }
  }

  throw new Error(`Run metadata is missing projectId for run ${runSession?.runId ?? "unknown"}.`);
}

function getDecisionPackageId(runSession: SessionRow | null, runPlanSummary: { decisionPackageId: string } | null) {
  if (runPlanSummary) {
    return runPlanSummary.decisionPackageId;
  }

  const metadata = asRecord(runSession?.metadata);
  const metadataDecisionPackageId = asString(metadata?.decisionPackageId);

  if (metadataDecisionPackageId) {
    return metadataDecisionPackageId;
  }

  const decisionPackage = metadata?.decisionPackage;
  const decisionPackageRecord = asRecord(decisionPackage);
  const source = asString(decisionPackageRecord?.source);

  if (source === "project_collection") {
    return asString(decisionPackageRecord?.decisionPackageId);
  }

  if (source === "inline") {
    return asString(asRecord(decisionPackageRecord?.payload)?.decisionPackageId);
  }

  if (source === "payload") {
    return asString(asRecord(decisionPackageRecord?.payload)?.decisionPackageId);
  }

  return null;
}

function getRunSummaryText(
  runSession: SessionRow | null,
  runPlanSummary: { summary: string } | null
) {
  if (runPlanSummary) {
    return runPlanSummary.summary;
  }

  const metadata = asRecord(runSession?.metadata);

  const persistedSummary = asString(metadata?.decisionPackageSummary);

  if (persistedSummary) {
    return persistedSummary;
  }

  const decisionPackage = asRecord(metadata?.decisionPackage);
  const payload = asRecord(decisionPackage?.payload);

  return asString(payload?.summary);
}

function summarizeArtifacts(artifacts: ArtifactRefRow[]) {
  const byKind = artifacts.reduce<Record<string, number>>((summary, artifact) => {
    summary[artifact.kind] = (summary[artifact.kind] ?? 0) + 1;
    return summary;
  }, {});

  return {
    total: artifacts.length,
    byKind
  };
}

function getRunExecution(runRecord: RunRow | null | undefined, runSession: SessionRow | null) {
  const metadata = asRecord(runSession?.metadata);
  const options = asRecord(metadata?.options);

  return {
    runtime:
      asString(runRecord?.executionEngine) ??
      asString(metadata?.executionEngine) ??
      asString(metadata?.runtime),
    thinkMode: asString(options?.thinkMode),
    preserveSandbox: Boolean(options?.preserveSandbox)
  };
}

function buildTaskStatusIndex(events: SessionEventRow[]) {
  const statuses = new Map<string, TaskStatusSnapshot>();

  for (const event of events) {
    if (!event.taskId || event.eventType !== "task.status_changed") {
      continue;
    }

    const payload = asRecord(event.payload);
    const nextStatus = asString(payload?.status) ?? (event.severity === "error" ? "failed" : "active");
    const current = statuses.get(event.taskId);
    const eventTimestamp = event.ts.toISOString();

    statuses.set(event.taskId, {
      status: nextStatus,
      createdAt: current?.createdAt ?? eventTimestamp,
      updatedAt: eventTimestamp
    });
  }

  return statuses;
}

export async function loadRunPlanSummary(
  env: Pick<WorkerBindings, "ARTIFACTS_BUCKET">,
  tenantId: string,
  runId: string
) {
  if (!env.ARTIFACTS_BUCKET || typeof env.ARTIFACTS_BUCKET.get !== "function") {
    return null;
  }

  const artifactText = await getArtifactText(env.ARTIFACTS_BUCKET, runPlanArtifactKey(tenantId, runId));

  if (!artifactText) {
    return null;
  }

  return compiledRunPlanSchema.parse(JSON.parse(artifactText));
}

export function projectRunResource(input: {
  tenantId: string;
  runId: string;
  runRecord?: RunRow | null | undefined;
  sessions: SessionRow[];
  events: SessionEventRow[];
  artifacts: ArtifactRefRow[];
  liveSnapshot?: RunCoordinatorSnapshot | null | undefined;
  runPlanSummary?: { decisionPackageId: string; summary: string } | null | undefined;
}): RunResource {
  const runSession = getRunSession(input.sessions);
  const taskStatuses = buildTaskStatusIndex(input.events);
  const currentTask = [...taskStatuses.entries()]
    .filter(([, status]) => status.status === "active")
    .sort((left, right) => (left[1].updatedAt ?? "").localeCompare(right[1].updatedAt ?? ""))
    .at(-1);
  const latestEvent = input.events.at(-1);

  return runResourceSchema.parse({
    resourceType: "run",
    scaffold: {
      implementation: "projected",
      note: "Projected from run sessions, events, artifacts, and the run plan artifact."
    },
    tenantId: input.tenantId,
    runId: input.runId,
    projectId: getRunProjectId(input.runRecord, runSession, input.events),
    decisionPackageId: getDecisionPackageId(runSession, input.runPlanSummary ?? null),
    summary: getRunSummaryText(runSession, input.runPlanSummary ?? null),
    status: input.liveSnapshot?.status ?? input.runRecord?.status ?? runSession?.status ?? "unknown",
    currentTaskId: currentTask?.[0] ?? null,
    createdAt: toIso(input.runRecord?.createdAt ?? runSession?.createdAt),
    updatedAt:
      input.liveSnapshot?.updatedAt ??
      toIso(latestEvent?.ts) ??
      toIso(input.runRecord?.updatedAt) ??
      toIso(runSession?.updatedAt),
    sessions: {
      total: input.sessions.length
    },
    artifacts: summarizeArtifacts(input.artifacts),
    execution: getRunExecution(input.runRecord, runSession)
  });
}

export function projectTaskResources(input: {
  tenantId: string;
  runId: string;
  events: SessionEventRow[];
  runPlanSummary?: Awaited<ReturnType<typeof loadRunPlanSummary>>;
}): TaskResource[] {
  const plan = input.runPlanSummary;

  if (!plan) {
    return [];
  }

  const taskStatuses = buildTaskStatusIndex(input.events);

  return plan.tasks.map((task) => {
    const statusSnapshot = taskStatuses.get(task.taskId);
    const blockedBy = task.dependsOn.filter((dependencyTaskId) => {
      const dependencyStatus = taskStatuses.get(dependencyTaskId)?.status;

      return dependencyStatus !== "completed";
    });
    const status = statusSnapshot?.status ?? (blockedBy.length > 0 ? "blocked" : "pending");

    return taskResourceSchema.parse({
      resourceType: "task",
      scaffold: {
        implementation: "projected",
        note: "Projected from run-plan artifacts and task session events."
      },
      tenantId: input.tenantId,
      runId: input.runId,
      taskId: task.taskId,
      title: task.title,
      summary: task.summary,
      instructions: task.instructions,
      acceptanceCriteria: task.acceptanceCriteria,
      dependsOn: task.dependsOn,
      blockedBy,
      status,
      createdAt: statusSnapshot?.createdAt ?? null,
      updatedAt: statusSnapshot?.updatedAt ?? null
    });
  });
}

export function projectWorkflowGraphResource(input: {
  tenantId: string;
  runId: string;
  tasks: TaskResource[];
}): WorkflowGraphResource {
  return workflowGraphResourceSchema.parse({
    resourceType: "workflow_graph",
    scaffold: {
      implementation: "projected",
      note: "Projected from compiled run-plan task dependencies and task status events."
    },
    tenantId: input.tenantId,
    runId: input.runId,
    nodes: input.tasks.map((task) => ({
      taskId: task.taskId,
      title: task.title,
      status: task.status,
      dependsOn: task.dependsOn,
      blockedBy: task.blockedBy
    })),
    edges: input.tasks.flatMap((task) =>
      task.dependsOn.map((dependencyTaskId) => ({
        fromTaskId: dependencyTaskId,
        toTaskId: task.taskId
      }))
    ),
    summary: {
      totalTasks: input.tasks.length,
      activeTasks: input.tasks.filter((task) => task.status === "active").length,
      blockedTasks: input.tasks.filter((task) => task.status === "blocked").length,
      completedTasks: input.tasks.filter((task) => task.status === "completed").length,
      readyTasks: input.tasks.filter((task) => task.status === "pending" && task.blockedBy.length === 0)
        .length
    }
  });
}

export function projectArtifactResource(artifact: ArtifactRefRow): ArtifactResource {
  const publicRunId = isProjectScopedArtifactRunId(artifact.runId) ? null : artifact.runId;

  return artifactResourceSchema.parse({
    resourceType: "artifact",
    scaffold: {
      implementation: "reused",
      note: null
    },
    tenantId: artifact.tenantId,
    artifactId: artifact.artifactRefId,
    projectId: artifact.projectId ?? null,
    runId: publicRunId,
    taskId: artifact.taskId ?? null,
    kind: artifact.kind,
    contentType: artifact.contentType,
    sizeBytes: artifact.sizeBytes ?? null,
    sha256: artifact.sha256 ?? null,
    contentUrl: `/v1/artifacts/${artifact.artifactRefId}/content`,
    createdAt: artifact.createdAt.toISOString(),
    metadata: artifact.metadata ?? {}
  });
}

export function projectApprovalResource(
  approval: ApprovalRecord,
  sessionById: Map<string, SessionRow>
): ApprovalResource {
  const session = sessionById.get(approval.sessionId);
  const sessionMetadata = asRecord(session?.metadata);

  return approvalResourceSchema.parse({
    resourceType: "approval",
    scaffold: {
      implementation: "reused",
      note: null
    },
    tenantId: approval.tenantId,
    approvalId: approval.approvalId,
    runId: approval.runId,
    sessionId: approval.sessionId,
    taskId: asString(sessionMetadata?.taskId),
    approvalType: approval.approvalType,
    status: approval.status,
    requestedBy: approval.requestedBy,
    requestedAt: toIso(approval.requestedAt),
    resolvedAt: toIso(approval.resolvedAt),
    resolution: approval.resolution,
    metadata: approval.metadata ?? {}
  });
}

function buildTaskNoticeMessage(event: SessionEventRow) {
  const payload = asRecord(event.payload);
  const status = asString(payload?.status);

  if (status === "active") {
    return asString(payload?.summary) ?? "Implementing...";
  }

  if (status === "completed") {
    return "Implementation complete.";
  }

  if (status === "failed") {
    const exitCode = payload?.exitCode;
    return typeof exitCode === "number"
      ? `Implementation failed with exit code ${exitCode}.`
      : "Implementation failed.";
  }

  if (status === "blocked") {
    return "Task is blocked.";
  }

  return null;
}

function buildConversationMessage(event: SessionEventRow): TaskConversationMessage | null {
  if (!event.taskId) {
    return null;
  }

  if (event.eventType === "agent.message") {
    const payload = asRecord(event.payload);
    const body = asString(payload?.text);

    if (!body) {
      return null;
    }

    return taskConversationMessageSchema.parse({
      messageId: event.eventId,
      runId: event.runId,
      taskId: event.taskId,
      messageType: "implementer_message",
      author: {
        role: "implementer",
        actorId: event.actor,
        displayName: "Implementer"
      },
      body,
      artifactIds: event.artifactRefId ? [event.artifactRefId] : [],
      sourceEventIds: [event.eventId],
      metadata: asRecord(event.payload)?.metadata ?? {},
      createdAt: event.ts.toISOString()
    });
  }

  if (event.eventType === "task.status_changed") {
    const body = buildTaskNoticeMessage(event);

    if (!body) {
      return null;
    }

    return taskConversationMessageSchema.parse({
      messageId: event.eventId,
      runId: event.runId,
      taskId: event.taskId,
      messageType: "workflow_notice",
      author: {
        role: "system",
        actorId: null,
        displayName: "Keystone"
      },
      body,
      artifactIds: event.artifactRefId ? [event.artifactRefId] : [],
      sourceEventIds: [event.eventId],
      metadata: event.payload ?? {},
      createdAt: event.ts.toISOString()
    });
  }

  if (event.eventType === "approval.requested") {
    return taskConversationMessageSchema.parse({
      messageId: event.eventId,
      runId: event.runId,
      taskId: event.taskId,
      messageType: "workflow_notice",
      author: {
        role: "system",
        actorId: null,
        displayName: "Keystone"
      },
      body: "Waiting for approval.",
      artifactIds: event.artifactRefId ? [event.artifactRefId] : [],
      sourceEventIds: [event.eventId],
      metadata: event.payload ?? {},
      createdAt: event.ts.toISOString()
    });
  }

  if (event.eventType === "approval.resolved") {
    const payload = asRecord(event.payload);
    const resolution = asString(payload?.resolution) ?? "resolved";

    return taskConversationMessageSchema.parse({
      messageId: event.eventId,
      runId: event.runId,
      taskId: event.taskId,
      messageType: "workflow_notice",
      author: {
        role: "system",
        actorId: null,
        displayName: "Keystone"
      },
      body: `Approval ${resolution}.`,
      artifactIds: event.artifactRefId ? [event.artifactRefId] : [],
      sourceEventIds: [event.eventId],
      metadata: event.payload ?? {},
      createdAt: event.ts.toISOString()
    });
  }

  return null;
}

export function projectTaskConversationResource(input: {
  tenantId: string;
  runId: string;
  taskId: string;
  events: SessionEventRow[];
}): TaskConversationResource {
  const messages = input.events
    .filter((event) => event.taskId === input.taskId)
    .map(buildConversationMessage)
    .filter((message): message is TaskConversationMessage => Boolean(message));

  return taskConversationResourceSchema.parse({
    resourceType: "task_conversation",
    scaffold: {
      implementation: "projected",
      note: "Projected from implementer events and task workflow notices."
    },
    tenantId: input.tenantId,
    runId: input.runId,
    taskId: input.taskId,
    messageCount: messages.length,
    latestMessageAt: messages.at(-1)?.createdAt ?? null,
    messages
  });
}
