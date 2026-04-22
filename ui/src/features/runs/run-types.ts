import type { RunPhaseId } from "../../shared/navigation/run-phases";

export type RunPlanningPhaseId = Exclude<RunPhaseId, "execution">;

export interface ConversationLocator {
  agentClass: string;
  agentName: string;
}
