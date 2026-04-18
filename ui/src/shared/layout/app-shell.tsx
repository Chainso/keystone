import type { ReactNode } from "react";

import { ShellSidebar } from "./shell-sidebar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="workspace-shell">
      <ShellSidebar />
      <main className="workspace-stage">{children}</main>
    </div>
  );
}
