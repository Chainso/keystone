export interface ShellLinkDefinition {
  label: string;
  path: string;
}

export interface ShellActionDefinition extends ShellLinkDefinition {
  icon: "plus" | "settings";
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
    icon: "plus",
    label: "New project",
    path: "/projects/new"
  },
  {
    icon: "settings",
    label: "Project settings",
    path: "/settings"
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
