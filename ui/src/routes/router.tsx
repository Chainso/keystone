import { Navigate, Outlet, createBrowserRouter, type RouteObject } from "react-router-dom";

import { ArchitectureRoute } from "./runs/architecture-route";
import { ExecutionRoute } from "./runs/execution-route";
import { ExecutionPlanRoute } from "./runs/execution-plan-route";
import { RunDefaultPhaseRoute } from "./runs/run-default-phase-route";
import { RunDetailLayout } from "./runs/run-detail-layout";
import { RunsIndexRoute } from "./runs/runs-index-route";
import { SpecificationRoute } from "./runs/specification-route";
import { TaskDetailRoute } from "./runs/task-detail-route";
import { DocumentationScreen } from "./screens/documentation-screen";
import { NewProjectScreen } from "./screens/new-project-screen";
import { ProjectSettingsScreen } from "./screens/project-settings-screen";
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
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <RunsIndexRoute />
          },
          {
            path: ":runId",
            element: <RunDetailLayout />,
            children: [
              {
                index: true,
                element: <RunDefaultPhaseRoute />
              },
              {
                path: "specification",
                element: <SpecificationRoute />
              },
              {
                path: "architecture",
                element: <ArchitectureRoute />
              },
              {
                path: "execution-plan",
                element: <ExecutionPlanRoute />
              },
              {
                path: "execution",
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <ExecutionRoute />
                  },
                  {
                    path: "tasks/:taskId",
                    element: <TaskDetailRoute />
                  }
                ]
              }
            ]
          }
        ]
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
