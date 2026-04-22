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
    summary: "Create runs and step into the current run workspace."
  },
  {
    label: "Documentation",
    path: "/documentation",
    summary: "Current project knowledge and notes for the selected project."
  },
  {
    label: "Workstreams",
    path: "/workstreams",
    summary: "Live task activity across the selected project."
  }
];

export const projectActions: ShellActionDefinition[] = [
  {
    glyph: "+",
    label: "New project",
    path: "/projects/new",
    summary: "Create a project and define the material Keystone will work from."
  },
  {
    glyph: "=",
    label: "Project settings",
    path: "/settings",
    summary: "Update the selected project's configuration, rules, and environment."
  }
];

const shellLocationDefinitions = [
  {
    ...primaryDestinations[0],
    matches(pathname: string) {
      return pathname === "/" || pathname.startsWith("/runs");
    }
  },
  {
    ...primaryDestinations[1],
    matches(pathname: string) {
      return pathname.startsWith("/documentation");
    }
  },
  {
    ...primaryDestinations[2],
    matches(pathname: string) {
      return pathname.startsWith("/workstreams");
    }
  },
  {
    ...projectActions[0],
    matches(pathname: string) {
      return pathname.startsWith("/projects/new");
    }
  },
  {
    ...projectActions[1],
    matches(pathname: string) {
      return pathname.startsWith("/settings");
    }
  }
] as const;

export function resolveShellLocation(pathname: string) {
  return (
    shellLocationDefinitions.find((definition) => definition.matches(pathname)) ??
    shellLocationDefinitions[0]
  );
}
