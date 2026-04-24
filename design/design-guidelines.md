# Keystone UI Design Guidelines

## Product Posture

Keystone should feel like an active software delivery workspace, not a generic ops dashboard and not a sci-fi control room.

The product tone should be:

- calm
- focused
- grounded
- precise

It should not feel:

- robotic
- over-instrumented
- noisy
- theatrical

## Core Shell

The app should use one stable shell centered on a normal left sidebar.

The left sidebar should include:

1. Project switcher
   The currently selected project.
2. Project actions
   `New project` and `Project settings`.
3. Global navigation
   `Runs`, `Documentation`, and `Workstreams`.

The right side of the app is view-specific. Different destinations can introduce their own internal rails or sidebars, but the global sidebar should remain stable.

The shell should stay recognizable across planning, task execution, and documentation work. We should not redesign the entire frame between related product states.

## Navigation Model

The global sidebar should answer:

- what project am I in?
- what part of the product am I in?
- how do I create or configure a project?

The `Runs` destination should answer:

- what runs exist for this project?
- which run is open right now?
- which phase of that run am I looking at?

The main workspace should answer:

- what is the agent doing right now?
- what document or task is in focus?
- where am I in the run flow?

The contextual right sidebar should answer:

- what current document, diff, or detail record am I inspecting?
- what matters for the current task or document?

## Run Flow Structure

The run detail view should use a top rail with:

- `Specification`
- `Architecture`
- `Execution Plan`
- `Execution`

This is a stepper-shaped flow, but it should allow free movement between phases.

### Shared Planning Layout

`Specification`, `Architecture`, and `Execution Plan` should all use the same structural layout:

- agent chat on the left
- living document on the right

Only the document semantics change between the three phases.

### Execution Relationship

`Execution` is different from the first three phases.

Default behavior:

- show the workflow DAG first
- clicking a task switches into the task-scoped execution surface
- task-scoped execution shows task conversation on the left and code review on the right
- the user should be able to return from task detail to the DAG without losing run context

### DAG Interaction

The DAG is not just a static visualization.

It should support:

- selecting a node to inspect task status
- showing blockers, state, and ownership inline
- moving the user into the task-scoped conversation for that node
- exposing the relevant code review output in the right sidebar

Default behavior:

- clicking a workflow node should switch from the DAG to task detail
- the task conversation should update to the selected task
- the review sidebar should update to that task's changed files and diffs

## Document and Review Model

Documents and task outputs should feel like real working material, not abstract telemetry.

Good document and review groups:

- product specification
- technical architecture
- execution plan
- review notes
- diffs
- logs
- evidence
- run summary

Avoid vague or synthetic naming such as:

- system bundle
- orchestration capsule
- compute package
- execution substrate

If a label sounds machine-generated or product-marketing-heavy, it is probably wrong.

## Copy and Language

All generated references and future UI copy should use plain, natural language.

Use:

- `Decision package`
- `Review notes`
- `Release summary`
- `Open in inspector`
- `Waiting on review`
- `Validation passed`

Avoid:

- pseudo-Latin filler
- random abbreviations
- labels that sound auto-synthesized
- overuse of all-caps status text

Status language should be short and human:

- `In progress`
- `Blocked`
- `Needs review`
- `Ready to release`

## Visual Direction

The current visual direction is dark, but it should feel restrained rather than flashy.

Use:

- graphite and warm charcoal base surfaces
- one muted blue-violet accent for focus and active state
- soft panel separation instead of high-contrast outlines
- subtle texture or grain only if it stays quiet

Avoid:

- neon glow
- multiple competing accents
- aggressive gradients
- glassmorphism
- game HUD styling

## Typography

Typography should feel editorial and functional, not default and not overly futuristic.

Rules:

- use one strong display style for main pane titles
- keep secondary labels simple and readable
- prefer sentence case for labels and headings
- reserve monospaced text for code, paths, diffs, and machine output

## Consistency Rules

Every new mockup should keep these stable unless there is a deliberate design change:

- same global sidebar structure
- same run stepper structure
- same planning-phase split layout
- same execution graph-to-task-detail handoff
- same project settings tab set
- same direct project-configuration action model: create for `New project`, save for `Project settings`, no draft/next wizard controls
- same right-sidebar role for document or review detail
- same status vocabulary
- same accent color family
- same card radius and border treatment

Do not let one screen become a dashboard, another a chat app, and another a document reader. They should all feel like different states of the same product.
