import {
  isRunPlanningDocumentKind,
  type RunPlanningDocumentKind
} from "../../../lib/documents/model";
import { parsePlanningConversationName } from "./planning-context";

export type PlanningDocumentPath = "specification" | "architecture" | "execution-plan";

export interface PlanningDocumentAgentConfig {
  documentPath: PlanningDocumentPath;
  documentKind: RunPlanningDocumentKind;
  draftSandboxPath: `/documents/${string}.md`;
  saveToolName: "save_specification" | "save_architecture" | "save_execution_plan";
  saveToolDescription: string;
  systemPrompt: string;
}

const planningDocumentConfigs = {
  specification: {
    documentPath: "specification",
    documentKind: "specification",
    draftSandboxPath: "/documents/specification.md",
    saveToolName: "save_specification",
    saveToolDescription:
      "Save /documents/specification.md as the current Keystone specification document revision for this run.",
    systemPrompt: [
      "You are Keystone's specification agent for a single run-scoped planning document.",
      "Own product discovery for this run: clarify user-visible behavior, scope boundaries, constraints, non-goals, edge cases, backward-compatibility expectations, and acceptance criteria.",
      "Push vague requests toward concrete markdown-ready decisions that an operator can review and approve.",
      "Use repository inspection only to ground current behavior or constraints; do not drift into architecture or task decomposition except where product implications require it.",
      "When ambiguity remains, ask pointed questions or call out the exact unresolved product decision instead of papering over it.",
      "Prefer crisp sections and bullets that can be copied directly into the run specification."
    ].join(" ")
  },
  architecture: {
    documentPath: "architecture",
    documentKind: "architecture",
    draftSandboxPath: "/documents/architecture.md",
    saveToolName: "save_architecture",
    saveToolDescription:
      "Save /documents/architecture.md as the current Keystone architecture document revision for this run.",
    systemPrompt: [
      "You are Keystone's architecture agent for a single run-scoped planning document.",
      "Translate the approved specification into a concrete technical design for this repository.",
      "Resolve implementation boundaries, data flow, touched modules, dependency choices, runtime constraints, validation seams, migration or compatibility concerns, and meaningful alternatives.",
      "The execution plan should not need to revisit major architectural choices after your document is approved, so surface and settle those decisions here.",
      "Ground the architecture in the actual codebase and runtime contracts rather than generic advice.",
      "Prefer markdown sections that make decisions explicit: what to change, why, what not to change, and how the design will be validated."
    ].join(" ")
  },
  "execution-plan": {
    documentPath: "execution-plan",
    documentKind: "execution_plan",
    draftSandboxPath: "/documents/execution-plan.md",
    saveToolName: "save_execution_plan",
    saveToolDescription:
      "Save /documents/execution-plan.md as the current Keystone execution plan document revision for this run.",
    systemPrompt: [
      "You are Keystone's execution-planning agent for a single run-scoped planning document.",
      "Turn the approved specification and architecture into a small executable task DAG for Keystone's compile step.",
      "Use the execution plan as the primary task breakdown because compile consumes specification, architecture, and execution plan together to produce run_plan, task_handoff, run_tasks, and run_task_dependencies.",
      "Drive toward small, implementation-oriented tasks with minimal necessary dependencies and no hidden design work left inside the tasks.",
      "For each planned task, make the markdown clearly express a stable task id, title, short summary, concrete instructions, acceptance criteria, and dependsOn relationships so the compile model can recover the intended DAG faithfully.",
      "Prefer plans that read like an ordered graph of reviewable engineering work, not a vague checklist or a narrative essay.",
      "If the approved inputs are still too ambiguous to form a credible task graph, say exactly what is missing instead of inventing fake certainty."
    ].join(" ")
  }
} as const satisfies Record<PlanningDocumentPath, PlanningDocumentAgentConfig>;

function toPlanningDocumentPath(path: string): PlanningDocumentPath | null {
  if (path === "specification" || path === "architecture" || path === "execution-plan") {
    return path;
  }

  return null;
}

export function getPlanningDocumentAgentConfigForPath(
  path: string
): PlanningDocumentAgentConfig | null {
  const documentPath = toPlanningDocumentPath(path);

  if (!documentPath) {
    return null;
  }

  const config = planningDocumentConfigs[documentPath];

  if (!isRunPlanningDocumentKind(config.documentKind)) {
    return null;
  }

  return config;
}

export function getPlanningDocumentAgentConfig(
  name: string
): PlanningDocumentAgentConfig | null {
  const identity = parsePlanningConversationName(name);

  if (!identity) {
    return null;
  }

  return getPlanningDocumentAgentConfigForPath(identity.path);
}

export function buildGenericPlanningSystemPrompt() {
  return [
    "You are Keystone's planning assistant for a run-scoped planning document.",
    "Help the operator refine the document into concrete markdown-ready content."
  ].join(" ");
}
