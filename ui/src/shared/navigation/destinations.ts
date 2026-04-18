export interface ShellLinkDefinition {
  label: string;
  path: string;
  summary: string;
}

export const primaryDestinations: ShellLinkDefinition[] = [
  {
    label: "Runs",
    path: "/runs",
    summary: "Open the operator run workspace and its future stepper flow."
  },
  {
    label: "Documentation",
    path: "/documentation",
    summary: "Project-scoped living documents and notes land here."
  },
  {
    label: "Workstreams",
    path: "/workstreams",
    summary: "Active and queued project work lives in this destination."
  }
];

export const projectActions: ShellLinkDefinition[] = [
  {
    label: "New project",
    path: "/projects/new",
    summary: "Create a new project scaffold."
  },
  {
    label: "Project settings",
    path: "/settings",
    summary: "Review project configuration placeholders."
  }
];
