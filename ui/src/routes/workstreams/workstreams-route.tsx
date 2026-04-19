import { WorkstreamsBoard } from "../../features/workstreams/components/workstreams-board";
import { useWorkstreamsViewModel } from "../../features/workstreams/use-workstreams-view-model";

export function WorkstreamsRoute() {
  const model = useWorkstreamsViewModel();

  return <WorkstreamsBoard model={model} />;
}
