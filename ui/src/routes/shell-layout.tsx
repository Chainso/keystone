import { Outlet } from "react-router-dom";

import { AppShell } from "../shared/layout/app-shell";

export function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
