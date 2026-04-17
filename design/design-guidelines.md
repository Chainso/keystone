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

The app should use one stable shell across intake, implementation, review, and release.

From left to right:

1. Global rail
   Workspace, project, and session/run navigation.
2. Artifact rail
   A tree view of project artifacts and run-specific artifacts.
3. Primary workspace
   The center pane where the user works in either `Agent Chat` or `Workflow DAG`.
4. Inspector
   The right pane for the selected artifact or record.

The shell should stay recognizable across all phases. We should not redesign the entire frame between planning, task execution, and release.

## Navigation Model

The far-left rail should answer:

- what workspace am I in?
- what project am I in?
- what run or session am I looking at?

The second left rail should answer:

- what artifacts exist for this project?
- which artifacts belong to this run?
- what is selected right now?

The center pane should answer:

- what is the agent doing right now?
- what task is currently in focus?
- where am I in the workflow?

The right pane should answer:

- what is the selected file, note, review, or output?
- what details matter for the current selection?

## Chat and DAG Relationship

`Agent Chat` and `Workflow DAG` are two modes of the same central workspace, not two unrelated screens.

Rules:

- the mode switch belongs at the top of the center pane
- `Agent Chat` is the default working mode
- `Workflow DAG` is the structural overview mode
- switching modes should preserve project, run, and task context

### DAG Interaction

The DAG is not just a static visualization.

It should support:

- selecting a node to inspect task status
- showing blockers, state, and ownership inline
- opening the relevant artifact in the inspector
- moving the user into the task-scoped chat for that node

Default behavior:

- clicking a workflow node should switch the center pane from `Workflow DAG` to `Agent Chat`
- the chat header should update to the selected task
- the artifact tree and inspector should stay in the same run context

## Artifact Model

Artifacts should feel like real working documents, not abstract telemetry.

Good artifact groups:

- decision package
- ADRs
- review notes
- diffs
- logs
- evidence
- run summary
- release notes

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

- same shell layout
- same pane order
- same mode switch location
- same artifact tree behavior
- same inspector role
- same status vocabulary
- same accent color family
- same card radius and border treatment

Do not let one screen become a dashboard, another a chat app, and another a document reader. They should all feel like different states of the same product.

## Reference Set Usage

Use the target images in `target-reference/` as follows:

- `keystone-target-board.png`
  Overall shell and cross-phase consistency.
- `keystone-live-task-chat.png`
  Task-scoped chat layout, message rhythm, and artifact inspector balance.
- `keystone-workflow-dag.png`
  DAG presentation, node emphasis, and the handoff from graph to task chat.

Use the committed external reference screens under `external-reference/screen-*` for source inspiration and flow coverage, but not as the visual source of truth.
