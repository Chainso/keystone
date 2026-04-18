import { useParams } from "react-router-dom";

export function useRequiredRunParams() {
  const { runId, taskId } = useParams();

  if (!runId) {
    throw new Error("Run routes require a runId parameter.");
  }

  return {
    runId,
    taskId: taskId ?? ""
  };
}
