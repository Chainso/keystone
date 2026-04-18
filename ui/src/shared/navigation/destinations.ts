export interface ShellLinkDefinition {
  label: string;
  path: string;
  summary: string;
}

export interface ShellActionDefinition extends ShellLinkDefinition {
  glyph: string;
}

export const primaryDestinations: ShellLinkDefinition[] = [
  {
    label: "Runs",
    path: "/runs",
    summary: "Open the run index, nested stepper phases, and execution scaffold."
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

export const projectActions: ShellActionDefinition[] = [
  {
    glyph: "+",
    label: "New project",
    path: "/projects/new",
    summary: "Create a new project scaffold."
  },
  {
    glyph: "=",
    label: "Project settings",
    path: "/settings",
    summary: "Review project configuration placeholders."
  }
];
