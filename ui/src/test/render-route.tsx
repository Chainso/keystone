import "@testing-library/jest-dom/vitest";

import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { AppProviders } from "../app/app-providers";
import type { CurrentProject } from "../features/projects/project-context";
import { createStaticProjectManagementApi } from "../features/projects/project-management-api";
import { selectCurrentProjectSummary } from "../features/resource-model/selectors";
import { appRoutes } from "../routes/router";

interface RenderRouteOptions {
  project?: CurrentProject;
  useBrowserProjectApi?: boolean;
}

export function renderRoute(initialEntry: string, options: RenderRouteOptions = {}) {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialEntry]
  });
  const defaultProjectApi = createStaticProjectManagementApi([selectCurrentProjectSummary()]);
  const providerProps = options.useBrowserProjectApi
    ? {}
    : {
        projectApi: defaultProjectApi
      };

  const view = render(
    <AppProviders
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
