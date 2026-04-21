import "@testing-library/jest-dom/vitest";

import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { AppProviders } from "../app/app-providers";
import type { CurrentProject } from "../features/projects/project-context";
import { appRoutes } from "../routes/router";

interface RenderRouteOptions {
  project?: CurrentProject;
}

export function renderRoute(initialEntry: string, options: RenderRouteOptions = {}) {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialEntry]
  });

  const view = render(
    <AppProviders {...(options.project ? { project: options.project } : {})}>
      <RouterProvider router={router} />
    </AppProviders>
  );

  return {
    ...view,
    router
  };
}
