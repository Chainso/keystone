import { Navigate, createBrowserRouter, type RouteObject } from "react-router-dom";

import { DocumentationScreen } from "./screens/documentation-screen";
import { NewProjectScreen } from "./screens/new-project-screen";
import { ProjectSettingsScreen } from "./screens/project-settings-screen";
import { RunsScreen } from "./screens/runs-screen";
import { WorkstreamsScreen } from "./screens/workstreams-screen";
import { ShellLayout } from "./shell-layout";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <ShellLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/runs" replace />
      },
      {
        path: "runs",
        element: <RunsScreen />
      },
      {
        path: "documentation",
        element: <DocumentationScreen />
      },
      {
        path: "workstreams",
        element: <WorkstreamsScreen />
      },
      {
        path: "projects/new",
        element: <NewProjectScreen />
      },
      {
        path: "settings",
        element: <ProjectSettingsScreen />
      }
    ]
  }
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
