import { useState } from "react";

import {
  buildProjectComponentScaffold,
  buildProjectConfigurationPath,
  getProjectConfigurationDefaultTab,
  projectComponentTypeOptions,
  projectConfigurationTabs,
  type ProjectConfigurationMode
} from "./project-configuration-scaffold";
import { useCurrentProject } from "./project-context";

export function useProjectConfigurationShellViewModel(mode: ProjectConfigurationMode) {
  const project = useCurrentProject();
  const isNewProject = mode === "new";

  return {
    title: isNewProject ? "New project" : `Project settings: ${project.displayName}`,
    summary: isNewProject
      ? "New project and project settings now share one tabbed configuration surface, but form submission and backend writes remain intentionally out of scope."
      : "Project settings now has the same tabbed structure as project creation so future edits can land without reopening layout or route ownership.",
    honestyCopy: isNewProject
      ? "This route proves the shared project-configuration layout before create-project submission exists. Buttons and fields are structural only in Phase 3."
      : "This route freezes the project-settings tabs, component picker flow, and field groups before any real project-update wiring lands.",
    defaultPath: buildProjectConfigurationPath(mode, getProjectConfigurationDefaultTab(mode)),
    tabs: projectConfigurationTabs.map((tab) => ({
      tabId: tab.tabId,
      label: tab.label,
      summary: tab.summary,
      path: buildProjectConfigurationPath(mode, tab.tabId)
    })),
    sidebarSections: [
      {
        eyebrow: "Current contract",
        title: "What this surface freezes",
        items: [
          "Project creation and settings now share one tab layout instead of diverging into separate flows.",
          "Git-repository components can now model either a local workspace path or a remote Git URL, matching the existing backend contract shape.",
          "Component creation still starts with a type picker even though only Git repository is currently supported."
        ]
      },
      {
        eyebrow: "Deferred",
        title: "Still intentionally placeholder-only",
        items: [
          "No `POST /v1/projects` or `PUT /v1/projects/:projectId` wiring is attached to these controls yet.",
          "Rules and environment inputs stay structural only, with no persistence or validation behavior in Phase 3."
        ]
      }
    ]
  };
}

export function useProjectOverviewViewModel(mode: ProjectConfigurationMode) {
  const project = useCurrentProject();
  const fields =
    mode === "new"
      ? [
          {
            label: "Project name",
            value: "Checkout workflow"
          },
          {
            label: "Project key",
            value: "checkout-workflow"
          },
          {
            label: "Description",
            value: "Operator workspace for the checkout rewrite and release preparation."
          }
        ]
      : [
          {
            label: "Project name",
            value: project.displayName
          },
          {
            label: "Project key",
            value: project.projectKey
          },
          {
            label: "Description",
            value: "Worker-first operator workspace with scaffolded runs, documentation, and project settings."
          }
        ];

  return {
    heading: "Project identity",
    summary:
      "Overview holds the shared identity fields for both create-project and settings without committing to real form submission yet.",
    nameField: fields[0]!,
    keyField: fields[1]!,
    descriptionField: fields[2]!,
    footerActions:
      mode === "new"
        ? ["Cancel", "Save draft", "Next"]
        : ["Discard", "Save changes"]
  };
}

export function useProjectComponentsViewModel(mode: ProjectConfigurationMode) {
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [components, setComponents] = useState(() =>
    mode === "settings" ? [buildProjectComponentScaffold("settings", 0)] : []
  );

  return {
    heading: "Project components",
    summary:
      "Components keep the project-to-code boundary explicit. The picker flow is real as structure, even though component edits still do not submit anywhere.",
    emptyState:
      "A project must contain at least one component. Use the type picker to add the first placeholder component before real validation and submission exist.",
    typePickerTitle: "Add component menu",
    typePickerSummary:
      "The picker stays in the flow even with a single supported option so future component kinds fit without redesign.",
    typePickerOpen: isPickerOpen,
    typeOptions: projectComponentTypeOptions,
    components,
    openTypePicker() {
      setPickerOpen(true);
    },
    closeTypePicker() {
      setPickerOpen(false);
    },
    pickComponentType() {
      setComponents((currentComponents) => [
        ...currentComponents,
        buildProjectComponentScaffold(mode, currentComponents.length)
      ]);
      setPickerOpen(false);
    }
  };
}

export function useProjectRulesViewModel() {
  return {
    heading: "Project-wide rules",
    summary:
      "Rules are intentionally list-shaped inputs so review and test guidance can stay structured when the real project write flow lands.",
    reviewInstructions: [
      "Keep UI route boundaries explicit when placeholder content grows.",
      "Call out backend stubs instead of implying project documents are already persisted."
    ],
    testInstructions: [
      "Run `npm run lint`, `npm run typecheck`, and `npm run test` before handoff.",
      "Record the known host-only `npm run build` caveat if it still applies."
    ]
  };
}

export function useProjectEnvironmentViewModel() {
  return {
    heading: "Project environment",
    summary:
      "Environment stays limited to non-secret project values in `v1`, and the Phase 3 UI keeps that boundary visible instead of inventing secret-management behavior.",
    envVars: [
      {
        name: "KEYSTONE_AGENT_RUNTIME",
        value: "scripted",
        note: "Non-secret default runtime selector."
      },
      {
        name: "KEYSTONE_CHAT_COMPLETIONS_BASE_URL",
        value: "http://localhost:10531",
        note: "Local OpenAI-compatible backend used by compile and Think paths."
      },
      {
        name: "KEYSTONE_CHAT_COMPLETIONS_MODEL",
        value: "gpt-5.4-mini",
        note: "Placeholder model name shown structurally only."
      }
    ]
  };
}
