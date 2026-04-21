# Keystone Workspace Spec

This document is the current source of truth for the Keystone operator UI structure.

Use it for:

- global information architecture
- project selection and project configuration flows
- run navigation and run-stage behavior
- documentation and workstreams surfaces
- long-running design decisions that should stay stable across iterations

If a future mockup or implementation disagrees with this file, update this file in the same change.

## Product Intent

Keystone should feel like an active software delivery workspace for one selected project.

The app is not a dashboard of unrelated cards. It is a focused working environment where the user:

1. selects a project,
2. creates or opens a run,
3. works through specification, architecture, planning, and execution,
4. reads current project documentation, and
5. checks active work across the project.

## Primary App Model

The current app model has one persistent global sidebar and three primary destinations:

- `Runs`
- `Documentation`
- `Workstreams`

The global sidebar also includes project controls:

- project switcher dropdown
- `+` action for `New project`
- settings action for `Project settings`

This means the top-level product structure is:

```text
Project context
  -> Runs
  -> Documentation
  -> Workstreams
  -> New project
  -> Project settings
```

## Core Decisions

### One project at a time

The app is always scoped to one selected project. Project selection is global and should not be repeated inside each destination.

### Runs first, then step into a run

`Runs` should first show a run index. After the user opens a run, the UI should switch into the run detail experience.

### Stepper only inside a run

The run detail uses a horizontal top rail with:

- `Specification`
- `Architecture`
- `Execution Plan`
- `Execution`

This is a stepper-shaped flow, but users can move back and forth freely. It should feel like revisiting phases of the same run, not moving between unrelated pages.

### Tabs for project configuration, not a stepper

`New project` and `Project settings` should use tabs:

- `Overview`
- `Components`
- `Rules`
- `Environment`

These are configuration categories, not lifecycle phases.

### Living documents, not historical logs

The product specification and architecture documents shown in the UI should always represent the current intended state.

They are not revision logs. History can exist elsewhere later, but the primary document surface should always answer:

- what is the current product specification?
- what is the current technical architecture and set of decisions?

### Execution defaults to the DAG

Within `Execution`, the default workspace is the task workflow graph. This view answers:

- what has completed?
- what is running?
- what is queued?
- what is blocked?

Clicking a task should move the user into the task-scoped execution surface.

### Task detail uses chat plus review sidebar

When the user opens a task from the execution graph, the view should become:

- task conversation on the left
- code review sidebar on the right

The right sidebar should show changed files and one-pane diffs with collapsible file sections.

### Documentation is project-scoped current knowledge

`Documentation` is for project-level documents and notes, not run-scoped transient artifacts.

The top-level document categories are:

- `Product Specifications`
- `Technical Architecture`
- `Miscellaneous Notes`

### Workstreams is a live operational list

`Workstreams` is a project-wide list of active and queued work. Rows should be clickable and route into the corresponding task view under `Runs > Execution`.

## Backend-Informed Constraints

These design constraints come from the current backend and should shape the first UI iteration:

- Projects are implemented and support create, list, detail, and update.
- Project runs are implemented and can be listed per project.
- Project documents and decision packages are still stubbed and should not be over-promised in the first UI.
- Project configuration currently supports components, project-wide rules, and non-secret environment variables.
- Component type support currently includes only `git_repository`.
- A project must contain at least one component.
- Component creation should still use a type picker so the UI can grow without redesign later.

## Project Configuration Surface

The same project configuration screen should be used in two modes:

- `New project`
- `Project settings`

The difference is mostly framing and button labels.

Action model:

- `New project` should use direct create semantics such as `[ Cancel ] [ Create project ]`.
- `Project settings` should use direct save semantics such as `[ Discard ] [ Save changes ]`.
- Do not treat project configuration tabs like a draft workflow or a next-step wizard.

### Overview

`Overview` should capture:

- project name
- project key
- description

### Components

`Components` should support:

- `+ Add component`
- type picker on add
- component name
- component key
- component type
- source mode selection
- `localPath` or `gitUrl`
- `defaultRef`
- optional component-level rule override

For now the type picker should offer only:

- `Git repository`

### Rules

`Rules` should allow editing:

- project review instructions
- project test instructions

These should be list-shaped inputs rather than one large freeform textarea.

### Environment

`Environment` should allow editing project env vars.

For now this is non-secret configuration only.

## Canonical App Board

```text
KESTONE UI BOARD

┌────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL SIDEBAR             │ RUNS: INDEX                                                                    │
│                            │                                                                               │
│  Project                   │  Runs                                                                          │
│  [ Keystone Cloudflare ▾ ] │                                                                               │
│                    [+] [⚙] │  [ + New run ]                                                                │
│                            │                                                                               │
│  Navigation                │  ┌──────────┬──────────────────────┬──────────────┬──────────────┬─────────┐ │
│  ──────────                │  │ Run ID    │ Summary              │ Stage        │ Status       │ Updated │ │
│  > Runs                    │  ├──────────┼──────────────────────┼──────────────┼──────────────┼─────────┤ │
│    Documentation           │  │ Run-104   │ UI workspace build   │ Execution    │ In progress  │ 2m ago  │ │
│    Workstreams             │  │ Run-103   │ Docs refresh         │ Architecture │ Complete     │ 1h ago  │ │
│                            │  │ Run-102   │ Task steering work   │ Execution    │ Blocked      │ 3h ago  │ │
│                            │  │ Run-101   │ Initial operator UI  │ Spec         │ Draft        │ 1d ago  │ │
│                            │  └──────────┴──────────────────────┴──────────────┴──────────────┴─────────┘ │
│                            │                                                                               │
│                            │  click row                                                                    │
│                            │      │                                                                        │
└────────────────────────────┴──────┼────────────────────────────────────────────────────────────────────────┘
                                     v
┌────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL SIDEBAR             │ RUN: SPECIFICATION                                                             │
│                            │                                                                               │
│  [ Keystone Cloudflare ▾ ] │  Run-104                                                                       │
│                    [+] [⚙] │                                                                               │
│                            │  [ Specification * ] [ Architecture ] [ Execution Plan ] [ Execution ]      │
│  > Runs                    │                                                                               │
│    Documentation           │  ┌───────────────────────────────────────────────┬─────────────────────────┐  │
│    Workstreams             │  │ SPECIFICATION AGENT CHAT                      │ LIVING PRODUCT SPEC     │  │
│                            │  │                                               │                         │  │
│                            │  │  agent: define operator goals                 │ product-spec.md         │  │
│                            │  │  user: add run index + workstreams            │ ─────────────────────   │  │
│                            │  │  agent: revising current spec                 │ always reflects the     │  │
│                            │  │                                               │ current intended        │  │
│                            │  │  [ message composer...................... ]   │ product state           │  │
│                            │  │                                               │                         │  │
│                            │  └───────────────────────────────────────────────┴─────────────────────────┘  │
└────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     v
┌────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL SIDEBAR             │ RUN: ARCHITECTURE                                                             │
│                            │                                                                               │
│  [ Keystone Cloudflare ▾ ] │  Run-104                                                                       │
│                    [+] [⚙] │                                                                               │
│                            │  [ Specification ] [ Architecture * ] [ Execution Plan ] [ Execution ]      │
│  > Runs                    │                                                                               │
│    Documentation           │  ┌───────────────────────────────────────────────┬─────────────────────────┐  │
│    Workstreams             │  │ ARCHITECTURE AGENT CHAT                       │ LIVING ARCHITECTURE DOC │  │
│                            │  │                                               │                         │  │
│                            │  │  agent: refine system boundaries              │ architecture.md         │  │
│                            │  │  user: Worker + React + Radix                │ ─────────────────────   │  │
│                            │  │  agent: capture current decisions             │ current technical       │  │
│                            │  │                                               │ architecture +          │  │
│                            │  │  [ message composer...................... ]   │ decisions only          │  │
│                            │  │                                               │                         │  │
│                            │  └───────────────────────────────────────────────┴─────────────────────────┘  │
└────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     v
┌────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL SIDEBAR             │ RUN: EXECUTION PLAN                                                           │
│                            │                                                                               │
│  [ Keystone Cloudflare ▾ ] │  Run-104                                                                       │
│                    [+] [⚙] │                                                                               │
│                            │  [ Specification ] [ Architecture ] [ Execution Plan * ] [ Execution ]      │
│  > Runs                    │                                                                               │
│    Documentation           │  ┌───────────────────────────────────────────────┬─────────────────────────┐  │
│    Workstreams             │  │ EXECUTION PLAN AGENT CHAT                     │ EXECUTION PLAN DOC      │  │
│                            │  │                                               │                         │  │
│                            │  │  agent: phase the UI rollout                  │ execution-plan.md       │  │
│                            │  │  user: include scaffold spike                 │ ─────────────────────   │  │
│                            │  │  user: include zellij + localflare            │ phases, deliverables,   │  │
│                            │  │                                               │ validation, risks       │  │
│                            │  │  [ message composer...................... ]   │                         │  │
│                            │  │                                               │                         │  │
│                            │  └───────────────────────────────────────────────┴─────────────────────────┘  │
└────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     v
┌────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL SIDEBAR             │ RUN: EXECUTION DEFAULT                                                        │
│                            │                                                                               │
│  [ Keystone Cloudflare ▾ ] │  Run-104                                                                       │
│                    [+] [⚙] │                                                                               │
│                            │  [ Specification ] [ Architecture ] [ Execution Plan ] [ Execution * ]      │
│  > Runs                    │                                                                               │
│    Documentation           │  ┌─────────────────────────────────────────────────────────────────────────┐  │
│    Workstreams             │  │ TASK WORKFLOW DAG                                                         │  │
│                            │  │                                                                         │  │
│                            │  │    [ Spec ] -> [ Arch ] -> [ Plan ] -> [ Shell ] -> [ Task View ]     │  │
│                            │  │                                             \-> [ Docs ]               │  │
│                            │  │                                                                         │  │
│                            │  │    running = highlighted   queued = dim   done = solid                │  │
│                            │  │                                                                         │  │
│                            │  │    click task node                                                     │  │
│                            │  └─────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     v
┌────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL SIDEBAR             │ RUN: TASK DETAIL                                                              │
│                            │                                                                               │
│  [ Keystone Cloudflare ▾ ] │  Run-104 / TASK-032                                                           │
│                    [+] [⚙] │                                                                               │
│                            │  [ Specification ] [ Architecture ] [ Execution Plan ] [ Execution * ]      │
│  > Runs                    │                                                                               │
│    Documentation           │  ┌───────────────────────────────────────────────┬─────────────────────────┐  │
│    Workstreams             │  │ TASK CONVERSATION                             │ CODE REVIEW SIDEBAR     │  │
│                            │  │                                               │                         │  │
│                            │  │  agent: inspected implementation              │ Changed files           │  │
│                            │  │  user: steer toward simpler flow              │ ▾ src/http/router.ts    │  │
│                            │  │  reviewer: flagged issue                      │   1-pane diff           │  │
│                            │  │  agent: applying task fix                     │                         │  │
│                            │  │                                               │ ▸ src/ui/runs-view.tsx  │  │
│                            │  │  [ steer this task....................... ]   │ ▸ src/ui/task-view.tsx  │  │
│                            │  │                                               │                         │  │
│                            │  │  [ Back to DAG ]                              │ collapsible file diffs  │  │
│                            │  └───────────────────────────────────────────────┴─────────────────────────┘  │
└────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL SIDEBAR             │ DOCUMENTATION                                                                 │
│                            │                                                                               │
│  [ Keystone Cloudflare ▾ ] │  Project documentation                                                        │
│                    [+] [⚙] │                                                                               │
│                            │  ┌──────────────────────────────┬──────────────────────────────────────────┐ │
│    Runs                    │  │ DOC TREE                     │ DOCUMENT VIEWER                          │ │
│  > Documentation           │  │                              │                                          │ │
│    Workstreams             │  │ ▾ Product Specifications     │ current living product specification     │ │
│                            │  │   └─ Current                 │                                          │ │
│                            │  │                              │                                          │ │
│                            │  │ ▾ Technical Architecture     │ current living architecture + decisions │ │
│                            │  │   └─ Current                 │                                          │ │
│                            │  │                              │                                          │ │
│                            │  │ ▾ Miscellaneous Notes        │ selected note/document                  │ │
│                            │  │   ├─ Research notes          │                                          │ │
│                            │  │   └─ Open questions          │                                          │ │
│                            │  └──────────────────────────────┴──────────────────────────────────────────┘ │
└────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL SIDEBAR             │ WORKSTREAMS                                                                   │
│                            │                                                                               │
│  [ Keystone Cloudflare ▾ ] │  Active and queued project work                                               │
│                    [+] [⚙] │                                                                               │
│                            │  Filters: [ All ] [ Running ] [ Queued ] [ Blocked ]                        │
│    Runs                    │                                                                               │
│    Documentation           │  ┌──────────┬──────────────────────┬──────────────┬──────────────┬─────────┐ │
│  > Workstreams             │  │ Task ID    │ Title                │ Run          │ Status       │ Updated │ │
│                            │  ├──────────┼──────────────────────┼──────────────┼──────────────┼─────────┤ │
│                            │  │ TASK-032  │ Build shell           │ Run-104      │ Running      │ 2m ago  │ │
│                            │  │ TASK-033  │ DAG wiring            │ Run-104      │ Queued       │ 4m ago  │ │
│                            │  │ TASK-021  │ Docs refresh          │ Run-103      │ Running      │ 9m ago  │ │
│                            │  │ TASK-019  │ Review fix            │ Run-101      │ Blocked      │ 1h ago  │ │
│                            │  └──────────┴──────────────────────┴──────────────┴──────────────┴─────────┘ │
│                            │                                                                               │
│                            │  click row -> opens that task inside Runs > Execution                        │
└────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL SIDEBAR             │ NEW PROJECT                                                                   │
│                            │                                                                               │
│  [ Keystone Cloudflare ▾ ] │  New project                                                                  │
│                    [+] [⚙] │                                                                               │
│                            │  [ Overview * ] [ Components ] [ Rules ] [ Environment ]                    │
│    Runs                    │                                                                               │
│    Documentation           │  ┌─────────────────────────────────────────────────────────────────────────┐  │
│    Workstreams             │  │ OVERVIEW                                                                 │  │
│                            │  │                                                                         │  │
│                            │  │ Project name                                                            │  │
│                            │  │ [ Keystone Cloudflare............................................... ]  │  │
│                            │  │                                                                         │  │
│                            │  │ Project key                                                             │  │
│                            │  │ [ keystone-cloudflare............................................... ]  │  │
│                            │  │                                                                         │  │
│                            │  │ Description                                                             │  │
│                            │  │ [ Internal operator workspace...................................... ]  │  │
│                            │  │                                                                         │  │
│                            │  │                                             [ Cancel ] [ Create project ]│ │
│                            │  └─────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘


┌────────────────────────────┬───────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL SIDEBAR             │ PROJECT SETTINGS                                                              │
│                            │                                                                               │
│  [ Keystone Cloudflare ▾ ] │  Project settings: Keystone Cloudflare                                       │
│                    [+] [⚙] │                                                                               │
│                            │  [ Overview ] [ Components * ] [ Rules ] [ Environment ]                    │
│    Runs                    │                                                                               │
│    Documentation           │  ┌─────────────────────────────────────────────────────────────────────────┐  │
│    Workstreams             │  │ COMPONENTS                                                               │  │
│                            │  │                                                                         │  │
│                            │  │ [ + Add component ▾ ]                                                   │  │
│                            │  │                                                                         │  │
│                            │  │ Add component menu                                                      │  │
│                            │  │   - Git repository                                                     │  │
│                            │  │                                                                         │  │
│                            │  │ Component 1                                                             │  │
│                            │  │ Type        [ Git repository ]                                          │  │
│                            │  │ Name        [ API.................................................... ] │  │
│                            │  │ Key         [ api.................................................... ] │  │
│                            │  │                                                                         │  │
│                            │  │ Source mode  [ Local path ○ ] [ Git URL ○ ]                            │  │
│                            │  │ Local path   [ ./services/api....................................... ] │  │
│                            │  │ Git URL      [ ..................................................... ] │  │
│                            │  │ Default ref  [ main................................................. ] │  │
│                            │  │                                                                         │  │
│                            │  │ Optional rule override                                                  │  │
│                            │  │ Review      [ Focus on API changes................................. ] │  │
│                            │  │ Test        [ Run targeted API tests................................ ] │  │
│                            │  │                                                                         │  │
│                            │  │                                                      [ Remove ]       │  │
│                            │  │                                                                         │  │
│                            │  │                                            [ Discard ] [ Save changes ]│ │
│                            │  └─────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────┴───────────────────────────────────────────────────────────────────────────────┘
```

## What Should Stay Stable

The following design choices should be treated as stable unless there is an explicit product-level decision to change them:

- one selected project at a time
- global sidebar with project selector and `+` / settings controls
- top-level destinations of `Runs`, `Documentation`, and `Workstreams`
- run index before run detail
- run detail stepper with `Specification`, `Architecture`, `Execution Plan`, and `Execution`
- living product and architecture documents
- DAG-first execution view
- task detail as conversation plus review sidebar
- project configuration as tabbed settings, not a lifecycle flow

## Near-Term Design Implications

For the first UI iterations:

- build the global sidebar and run index first
- treat `Specification`, `Architecture`, and `Execution Plan` as the same shared layout with different document semantics
- treat `Execution` as two connected states: graph and task detail
- design the `Documentation` tree around the current canonical documents, not around version history
- include the project configuration surfaces early because project selection and creation are part of the normal workflow
