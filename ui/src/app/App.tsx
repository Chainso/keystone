import { RouterProvider } from "react-router-dom";

import { AppProviders } from "./app-providers";
import { createAppRouter } from "../routes/router";

const appRouter = createAppRouter();

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={appRouter} />
    </AppProviders>
  );
}
