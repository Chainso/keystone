# UI Guidelines

These instructions apply to all work under `ui/`.

## Priorities

- Prioritize product behavior, component composition, state ownership, API seams, and user experience before styling.
- Do not spend time polishing visuals, redesigning layouts, or tuning aesthetics unless the user explicitly asks for styling work.
- Prefer honest unfinished behavior over polished placeholder behavior. A plain but correct UI contract is better than a styled mock.
- Do not let auth concerns expand the scope of normal UI work. Ignore auth unless the task is explicitly about auth, auth failures, auth flows, or auth boundaries.

## Skill Loading

Load the smallest relevant set of frontend skills before making non-trivial UI changes:

- Always load `vercel-composition-patterns` for UI architecture, component API design, provider boundaries, and shared state design.
- Always load `vercel-react-best-practices` for React data flow, rendering, mutation, and performance-sensitive implementation choices.
- Load `web-perf` only when the task is specifically about profiling, performance audits, Core Web Vitals, or page-speed regressions.
- Load `vercel-react-view-transitions` only when the task is specifically about route transitions, shared-element transitions, or animated state changes.

## Architecture

- Keep route files thin. Routes should own URL structure, redirects, and high-level composition, not destination-specific business logic.
- Keep destination logic inside feature-owned hooks, providers, and components under `ui/src/features/`.
- Keep `ui/src/shared/` generic. Do not move product-specific state or Keystone destination logic into shared primitives.
- Do not preserve the existing route tree, layout split, or component boundaries mechanically just because they already exist. Change them when needed to achieve clearer ownership, better consistency, and stronger patterns.
- Prefer explicit variant components over boolean-heavy components. If `New project` and `Project settings` differ in behavior, keep explicit variants instead of adding more mode flags.
- Prefer provider contracts shaped like `state`, `actions`, and `meta` when multiple UI pieces need to coordinate on the same feature state.
- The provider should be the only layer that knows how state is stored or updated. Presentational components should consume the interface, not the implementation details.

## React Practices

- Derive values during render when they can be computed from current props or state. Do not add `useEffect` just to mirror derived state.
- Put user-triggered side effects in event handlers, not in `useEffect`.
- Use `startTransition` for non-urgent UI updates when it improves responsiveness.
- Do not define components inside other components.
- Avoid barrel imports in UI code. Import directly from source modules.
- Add state only when it represents true mutable UI state. Do not create local state for values that are just projections of other state.

## UX Expectations

- Make loading, empty, error, and success states explicit.
- Keep API wiring honest. If a screen is partially wired, make the unwired parts structurally clear instead of faking complete behavior.
- Optimize for consistent behaviors and predictable UX contracts across destinations, even if that requires changing the current route or component structure.
- Preserve product concepts and user-facing terminology from `design/workspace-spec.md`, but do not treat the current implementation structure as fixed.

## References

- Follow the repo-wide guidance in the root [AGENTS.md](../AGENTS.md).
- Treat `design/workspace-spec.md` as the source of truth for UI structure and product terminology.
- Treat `design/design-guidelines.md` as the source of truth for durable UI interaction and presentation constraints when a task actually involves design decisions.
