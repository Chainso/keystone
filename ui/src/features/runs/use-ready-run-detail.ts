import { useRunDetail } from "./run-detail-context";

export function useReadyRunDetail() {
  const runDetail = useRunDetail();

  if (runDetail.meta.status !== "ready" || !runDetail.state.run || !runDetail.state.workflow) {
    throw new Error("Run view models require a ready RunDetailProvider.");
  }

  return runDetail;
}
