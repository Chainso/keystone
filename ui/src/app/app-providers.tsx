import type { ReactNode } from "react";

import { CurrentProjectProvider } from "../features/projects/project-context";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return <CurrentProjectProvider>{children}</CurrentProjectProvider>;
}
