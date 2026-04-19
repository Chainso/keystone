import { DocumentationWorkspace } from "../../features/documentation/components/documentation-workspace";
import { useDocumentationViewModel } from "../../features/documentation/use-documentation-view-model";

export function DocumentationRoute() {
  const model = useDocumentationViewModel();

  return <DocumentationWorkspace model={model} />;
}
