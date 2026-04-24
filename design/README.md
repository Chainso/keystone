# Design References

This directory contains the written design material that defines the Keystone workspace:

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

## Current UI Direction

The current Keystone target is:

- global left sidebar with project switcher plus `New project` and `Project settings`
- `Runs` index first, then run detail with a stepper for `Specification`, `Architecture`, `Execution Plan`, and `Execution`
- `Specification`, `Architecture`, and `Execution Plan` use an agent-chat plus living-document layout
- `Execution` defaults to the task workflow DAG, and clicking a task opens task conversation plus code review
- `Documentation` is a project document tree for current product and architecture docs plus notes
- `Workstreams` is a project-wide active and queued task list

See `workspace-spec.md` for the canonical app structure and `design-guidelines.md` for the visual and interaction rules that should keep future design work consistent.
