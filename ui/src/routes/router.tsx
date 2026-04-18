import { Navigate, Outlet, createBrowserRouter, type RouteObject } from "react-router-dom";

import {
  getProjectConfigurationDefaultTab,
  projectConfigurationTabs
} from "../features/projects/project-configuration-scaffold";
import { DocumentationRoute } from "./documentation/documentation-route";
import { ProjectConfigurationLayout } from "./projects/project-configuration-layout";
import { ProjectConfigurationTabRoute } from "./projects/project-configuration-tab-route";
import { ArchitectureRoute } from "./runs/architecture-route";
import { ExecutionRoute } from "./runs/execution-route";
import { ExecutionPlanRoute } from "./runs/execution-plan-route";
import { RunDefaultPhaseRoute } from "./runs/run-default-phase-route";
import { RunDetailLayout } from "./runs/run-detail-layout";
import { RunsIndexRoute } from "./runs/runs-index-route";
import { SpecificationRoute } from "./runs/specification-route";
import { TaskDetailRoute } from "./runs/task-detail-route";
import { ShellLayout } from "./shell-layout";
import { WorkstreamsRoute } from "./workstreams/workstreams-route";

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
        element: <DocumentationRoute />
      },
      {
        path: "workstreams",
        element: <WorkstreamsRoute />
      },
      {
        path: "projects",
        element: <Outlet />,
        children: [
          {
            path: "new",
            element: <ProjectConfigurationLayout mode="new" />,
            children: [
              {
                index: true,
                element: <Navigate to={getProjectConfigurationDefaultTab("new")} replace />
              },
              ...projectConfigurationTabs.map((tab) => ({
                path: tab.tabId,
                element: <ProjectConfigurationTabRoute mode="new" tabId={tab.tabId} />
              }))
            ]
          }
        ]
      },
      {
        path: "settings",
        element: <ProjectConfigurationLayout mode="settings" />,
        children: [
          {
            index: true,
            element: <Navigate to={getProjectConfigurationDefaultTab("settings")} replace />
          },
          ...projectConfigurationTabs.map((tab) => ({
            path: tab.tabId,
            element: <ProjectConfigurationTabRoute mode="settings" tabId={tab.tabId} />
          }))
        ]
      }
    ]
  }
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}
