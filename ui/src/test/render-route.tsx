import "@testing-library/jest-dom/vitest";

import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { AppProviders } from "../app/app-providers";
import type { RunExecutionApi } from "../features/execution/execution-api";
import type { CurrentProject } from "../features/projects/project-context";
import { createStaticProjectManagementApi } from "../features/projects/project-management-api";
import {
  createProjectOverrideDataset,
  selectCurrentProjectSummary
} from "../features/resource-model/selectors";
import { appRoutes } from "../routes/router";

interface RenderRouteOptions {
  executionApi?: RunExecutionApi | null;
  project?: CurrentProject;
  useBrowserProjectApi?: boolean;
}

export function renderRoute(initialEntry: string, options: RenderRouteOptions = {}) {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialEntry]
  });
  const project = options.project ?? selectCurrentProjectSummary();
  const dataset = options.project ? createProjectOverrideDataset(options.project) : undefined;
  const defaultProjectApi = createStaticProjectManagementApi([project], dataset);
  const providerProps = options.useBrowserProjectApi
    ? {}
    : {
        projectApi: defaultProjectApi
      };

  const view = render(
    <AppProviders
      {...(options.executionApi !== undefined ? { executionApi: options.executionApi } : {})}
      {...providerProps}
      {...(options.project ? { project: options.project } : {})}
    >
      <RouterProvider router={router} />
    </AppProviders>
  );

  return {
    ...view,
    router
  };
}
