import "@testing-library/jest-dom/vitest";

import { render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";

import { AppProviders } from "../app/app-providers";
import { appRoutes } from "../routes/router";

export function renderRoute(initialEntry: string) {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [initialEntry]
  });

  const view = render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );

  return {
    ...view,
    router
  };
}
