import { useNavigate } from "react-router-dom";

import { WorkstreamsBoard } from "../../features/workstreams/components/workstreams-board";
import { useWorkstreamsViewModel } from "../../features/workstreams/use-workstreams-view-model";

export function WorkstreamsRoute() {
  const model = useWorkstreamsViewModel();
  const navigate = useNavigate();

  return <WorkstreamsBoard model={model} onRowActivate={(row) => navigate(row.detailPath)} />;
}
