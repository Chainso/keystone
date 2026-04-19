export interface ShellLinkDefinition {
  label: string;
  path: string;
}

export interface ShellActionDefinition extends ShellLinkDefinition {
  glyph: string;
}

export const primaryDestinations: ShellLinkDefinition[] = [
  {
    label: "Runs",
    path: "/runs"
  },
  {
    label: "Documentation",
    path: "/documentation"
  },
  {
    label: "Workstreams",
    path: "/workstreams"
  }
];

export const projectActions: ShellActionDefinition[] = [
  {
    glyph: "+",
    label: "New project",
    path: "/projects/new"
  },
  {
    glyph: "=",
    label: "Project settings",
    path: "/settings"
  }
];
