# Design References

This directory now has three distinct kinds of reference material:

## 1. Committed External References

These are the source reference screens under `external-reference/` that informed the Keystone direction:

- `external-reference/screen-1/`: intake and planning reference
- `external-reference/screen-2/`: workflow graph reference
- `external-reference/screen-3/`: task execution reference
- `external-reference/screen-4/`: verification and release reference

Treat these as committed source inspiration, not Keystone-owned concepts and not the current visual target.

## 2. Current Target References

These are the new images under `target-reference/`. They reflect the current direction we want to build toward:

- `keystone-target-board.png`
  Three aligned views showing intake, live task work, and verification/release inside one consistent shell.
- `keystone-live-task-chat.png`
  Focused reference for the task-scoped chat mode.
- `keystone-workflow-dag.png`
  Focused reference for the workflow DAG mode and task handoff into chat.

These are the images that should guide new UI work unless a newer target set replaces them.

## 3. Design Rules

There are now two written design references:

- `workspace-spec.md`
  The canonical product structure, navigation model, ASCII boards, and long-running design decisions.
- `design-guidelines.md`
  The visual and interaction rules that should stay stable across implementations.

Use `workspace-spec.md` first when deciding what screens and flows exist. Use `design-guidelines.md` to decide how those screens should feel and behave.

Use it for:

- shell rules
- pane responsibilities
- mode-switch behavior
- naming and artifact language
- visual consistency constraints

### Preview: Cross-Phase Target Board

![Keystone target board](./target-reference/keystone-target-board.png)

### Preview: Task-Scoped Chat

![Keystone live task chat](./target-reference/keystone-live-task-chat.png)

### Preview: Workflow DAG Mode

![Keystone workflow DAG](./target-reference/keystone-workflow-dag.png)

## External Reference vs Target

The current target direction is informed by the committed external reference screens under `external-reference/`. Those references are about structure, not imitation.

Use the external reference for:

- overall pane hierarchy
- project and session navigation shape
- the feeling of a tool for active work rather than a dashboard
- keeping the center pane dominant

Do not copy the external reference literally:

- do not mirror its labels, menus, or app chrome one-to-one
- do not inherit its product vocabulary
- do not treat it as a pixel-accurate spec

The committed target images in `target-reference/` are the adapted Keystone direction. They are what we are aiming for.

## Current UI Target

The current Keystone target is:

- global left sidebar with project switcher plus `New project` and `Project settings`
- `Runs` index first, then run detail with a stepper for `Specification`, `Architecture`, `Execution Plan`, and `Execution`
- `Specification`, `Architecture`, and `Execution Plan` use an agent-chat plus living-document layout
- `Execution` defaults to the task workflow DAG, and clicking a task opens task conversation plus code review
- `Documentation` is a project document tree for current product and architecture docs plus notes
- `Workstreams` is a project-wide active and queued task list

See `external-reference/README.md` for provenance, `workspace-spec.md` for the canonical app structure, and `design-guidelines.md` for the visual and interaction rules that should keep future design work consistent.
