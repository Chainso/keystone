# Keystone UI Structure Scaffold

## Purpose / Big Picture

This plan adds the first real Keystone frontend, but intentionally stops at structure. After this plan is complete, the repository should have a deployable React UI scaffold that matches the current workspace spec, runs inside the existing Cloudflare Worker deployment shape, and gives future contributors a stable place to add real UI behavior without renegotiating routing, page boundaries, feature ownership, or component composition patterns.

From the operator's perspective, success means:

- the app opens into a real Keystone UI shell instead of only raw API endpoints,
- the global project-scoped navigation exists for `Runs`, `Documentation`, and `Workstreams`,
- run detail has the intended phase structure for `Specification`, `Architecture`, `Execution Plan`, and `Execution`,
- execution has the intended graph-to-task-detail handoff shape,
- project creation and settings already exist as structural destinations,
- every screen is honest about being a placeholder scaffold where real implementation is still pending,
- the codebase structure for pages, features, shared components, hooks, providers, and route nesting is locked in before feature implementation starts.

This plan explicitly does **not** implement real screen behavior, final visuals, live backend data loading, or detailed component logic. It is a structure-first pass only.

## Backward Compatibility

Backward compatibility for a pre-existing frontend is **not required** because this repository does not yet have a shipped UI. The user explicitly wants a progressive, structure-first scaffold rather than compatibility with any earlier frontend implementation.

Compatibility that **is** required:

- keep the existing Hono Worker and `v1` API routes working,
- keep the current Worker bindings, Durable Objects, Workflows, and scripts intact unless a change is necessary to host the UI scaffold,
- preserve the current backend validation baseline: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`,
- keep the frontend honest about current backend gaps such as stubbed project documents, decision packages, evidence, integration, release, and operator task steering.

## Design Decisions

1. **Date:** 2026-04-18  
   **Decision:** Build the first UI as a React SPA using Vite and serve it from the same Cloudflare Worker deployment, with Hono continuing to own `/v1/*` and related runtime endpoints.  
   **Rationale:** The repo is already a single Worker application with Hono, Durable Objects, Workflows, and Wrangler-managed bindings. A same-deployable SPA keeps auth and API calls same-origin, avoids introducing SSR complexity, and matches the Cloudflare-first recommendation already established during discovery.  
   **Alternatives considered:** Next.js on Workers; a separate UI Worker from day one; no frontend until deeper backend behavior exists.

2. **Date:** 2026-04-18  
   **Decision:** Treat this effort as a structure-first scaffold and deliberately avoid implementing detailed component behavior, live data loading, or polished screen content.  
   **Rationale:** The user wants the route tree, page/layout boundaries, providers, hooks, and feature modules locked in before specific UI implementation starts. This reduces churn and keeps later work focused on filling in well-defined slots.  
   **Alternatives considered:** Build one polished screen first; wire live backend data immediately; mix structure work with detailed screen implementation.

3. **Date:** 2026-04-18  
   **Decision:** Use `design/workspace-spec.md` as the primary product-structure source of truth and `design/design-guidelines.md` as the visual and interaction constraint layer.  
   **Rationale:** Discovery confirmed that `workspace-spec.md` now supersedes the earlier generalized shell model. Planning and implementation should follow the current source-of-truth split instead of designing from the older board language alone.  
   **Alternatives considered:** Continue treating the target images as the primary structure spec; use only the guidelines without the workspace spec.

4. **Date:** 2026-04-18  
   **Decision:** Organize the frontend under a dedicated `ui/` subtree with `app`, `routes`, `features`, and `shared` layers instead of mixing UI files into the current backend-focused `src/` tree.  
   **Rationale:** The repository currently has no frontend scaffold and the backend already uses `src/` for Worker/runtime concerns. Isolating the UI from the start gives a stable home for page and feature structure while preserving the option to split into `apps/ui` and `apps/api` later if needed.  
   **Alternatives considered:** Place React files under `src/ui`; immediately restructure the whole repo into a monorepo-style `apps/*` layout.

5. **Date:** 2026-04-18  
   **Decision:** Use React Router with nested routes that mirror the workspace spec: top-level destinations in the global shell, nested run detail routes under `Runs`, and nested execution/task routes inside a selected run.  
   **Rationale:** The UI structure is navigation-heavy and route-driven. Nested client-side routing is the cleanest way to lock in screen boundaries, preserve context, and express the run stepper and execution drill-down without needing SSR.  
   **Alternatives considered:** Hand-rolled route state; a heavier full-stack framework; delaying route modeling until screens are implemented.

6. **Date:** 2026-04-18  
   **Decision:** Use a Radix-based foundation (`Radix Primitives`, `Radix Themes`, `Radix Colors`) plus Keystone-owned layout components and CSS tokens, not a prebuilt full-app component kit.  
   **Rationale:** The user wants strong UI practices and durable structure, while the design docs call for a restrained, editorial, product-specific feel. Radix gives accessibility and composable primitives without dictating product structure.  
   **Alternatives considered:** Tailwind-plus-component-kit scaffolding; fully custom primitives from scratch; implementing detailed visual components during the scaffold phase.

7. **Date:** 2026-04-18  
   **Decision:** Enforce data-light components and feature-owned hooks. Route containers and layout shells may coordinate feature hooks, but leaf components should remain mostly presentational during this phase.  
   **Rationale:** The user explicitly wants strong page/component/hook patterns. Following composition guidance now prevents boolean-prop sprawl and keeps later backend wiring localized to route containers and feature adapters instead of leaking into every component.  
   **Alternatives considered:** Introduce a global store immediately; put data-fetching logic directly into page components; defer hook boundaries until real data work begins.

8. **Date:** 2026-04-18  
   **Decision:** Use placeholder adapters and placeholder feature hooks for now, rather than wiring the live API during the same plan.  
   **Rationale:** The backend already exposes many useful `v1` seams, but this plan is about structural confidence, not data implementation. Placeholder hooks let the route tree and UI contracts settle without forcing premature query and caching decisions.  
   **Alternatives considered:** Wire the live API immediately; use fully static JSX with no hook layer; build a full frontend data client in the scaffold phase.

9. **Date:** 2026-04-18  
   **Decision:** Keep the initial test surface focused on route/layout smoke coverage and build/integration validation, not detailed interaction tests.  
   **Rationale:** The plan is scaffolding empty implementations. The useful proof is that the shell renders, the route tree resolves, the Worker still builds, and placeholder boundaries are explicit.  
   **Alternatives considered:** No frontend tests in this phase; detailed interaction tests for components that are not implemented yet.

10. **Date:** 2026-04-18  
   **Decision:** Phase 1 includes a checked-in local development helper that launches `npx localflare` and the UI workflow together in vertically split zellij panes.  
   **Rationale:** The user wants the scaffold phase to lock in contributor workflow as well as code structure. Standardizing the local dev entrypoint now prevents ad hoc commands from becoming the implicit convention later.  
   **Alternatives considered:** Leave the workflow manual for now; add the helper in a later phase; use a different pane layout.

## Execution Log

- **Date:** 2026-04-18  
  **Phase:** Planning  
  **Decision:** Run the current repo baseline commands before writing the plan: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.  
  **Rationale:** The plan contract requires a clean baseline so later execution can separate regressions from environment quirks.

- **Date:** 2026-04-18  
  **Phase:** Planning  
  **Decision:** Record `npm run build` as a known environment caveat rather than an application failure when run inside the Codex sandbox.  
  **Rationale:** The build fails inside the sandbox because Wrangler and Docker write under `~/.config/.wrangler` and `~/.docker`, then passes when rerun outside the sandbox.

- **Date:** 2026-04-18  
  **Phase:** Planning  
  **Decision:** Size the UI work as multiple small scaffold phases instead of one large “frontend bootstrap” phase.  
  **Rationale:** The user explicitly wants progressive structure building. The plan should reflect that by landing one stable layer at a time.

- **Date:** 2026-04-18  
  **Phase:** Phase 1  
  **Decision:** Serve the new React shell through Wrangler static assets and keep the existing Worker first only for `/v1/*`, `/internal/*`, and `/healthz`.  
  **Rationale:** This keeps the same Cloudflare deployable and preserves the Hono API/runtime boundary while letting the SPA own the operator shell routes.

- **Date:** 2026-04-18  
  **Phase:** Phase 1  
  **Decision:** Split UI typechecking into a dedicated `tsconfig.ui.json` and keep the existing worker-oriented TypeScript config intact.  
  **Rationale:** The backend compiler settings target Worker globals, while the new React scaffold needs DOM and JSX support. Separate configs avoid reopening backend typing decisions.

- **Date:** 2026-04-18  
  **Phase:** Phase 1  
  **Decision:** Extend Phase 1 before closure to include a checked-in zellij helper that runs `npx localflare` and the UI workflow together in vertically split panes.  
  **Rationale:** The user explicitly wants the local UI workflow standardized during the structure-first scaffold instead of deferred to a later cleanup pass.

- **Date:** 2026-04-18  
  **Phase:** Phase 1 fix pass  
  **Decision:** Close the integration review finding by splitting ESLint globals by runtime and overriding `tsconfig.ui.json` to browser-only types before closing Phase 1.  
  **Rationale:** The initial scaffold let browser globals lint cleanly in worker files and let UI typechecking inherit backend/test globals from the root config. The fix pass had to enforce the worker/UI boundary at the toolchain layer rather than just in folder naming.

- **Date:** 2026-04-18  
  **Phase:** Phase 2  
  **Decision:** Grow `Runs` into a nested route family under the existing shell: `/runs` for the index, `/runs/:runId` for the run-detail frame, and `/runs/:runId/execution/tasks/:taskId` for task drill-down.  
  **Rationale:** This preserves the single project-scoped app frame from Phase 1 while matching the workspace spec's run index, stepper, and task-detail hierarchy.

- **Date:** 2026-04-18  
  **Phase:** Phase 2  
  **Decision:** Implement the three planning phases through one shared split-layout scaffold and keep execution plus task detail as separate route shells under the same run frame.  
  **Rationale:** `Specification`, `Architecture`, and `Execution Plan` share the same chat-plus-document structure in the design docs, while `Execution` must stay distinct so the DAG-first state and task-detail state can evolve independently later.

## Progress

- [x] 2026-04-18 Discovery completed across the workspace spec, design guidelines, target references, current API surface, and Cloudflare-first frontend architecture options.
- [x] 2026-04-18 Baseline validation recorded: `npm run lint`, `npm run typecheck`, and `npm run test` pass in the sandbox; `npm run build` fails in the sandbox because Wrangler and Docker need host-writable home directories, then passes outside the sandbox.
- [x] 2026-04-18 Active execution plan created and registered.
- [x] 2026-04-18 User approval recorded for the structure-first UI scaffold plan and execution started.
- [x] Phase 1 completed: UI tooling, route shell, providers, and global navigation scaffolded with placeholder screens.
- [x] 2026-04-18 Phase 1 fix pass completed: browser globals are now scoped to UI files, `tsconfig.ui.json` uses browser-only global types, and the checked-in zellij helper runs `npx localflare` with the UI workflow in vertically split panes.
- [x] 2026-04-18 Phase 2 completed: `Runs` index, nested run-detail stepper routes, execution DAG shell, and task-detail placeholder route now exist under the shared shell.
- [ ] Phase 3 completed: `Documentation`, `Workstreams`, `New project`, and `Project settings` destinations scaffolded with placeholder hooks and structural sublayouts.
- [ ] Phase 4 completed: developer docs, README guidance, and validation coverage updated for the new UI scaffold.

## Surprises & Discoveries

- `design/workspace-spec.md` is now the primary UI structure source of truth. It supersedes the earlier mental model of a fixed four-pane shell everywhere.
- The current design baseline is explicitly tied to commit `e9f65c2` (`Document workspace UI structure`), which should be treated as the durable starting point for this UI work.
- The backend already exposes many of the eventual UI data seams, but several project-scoped document surfaces remain typed stubs. The scaffold should not imply those screens are fully functional yet.
- The repo has no frontend dependencies or frontend runtime structure today. The first implementation phase must establish that foundation before any destination scaffolding can happen.
- `npm run build` is trustworthy only when run outside the Codex sandbox on this host because Wrangler and Docker require host-writable home-directory paths.
- `wrangler types` successfully regenerates `worker-configuration.d.ts` in the sandbox after the assets binding change, but Wrangler still emits a non-fatal log-write warning because it cannot write under `~/.config/.wrangler`.
- Importing the full `@radix-ui/themes` runtime pulled an unnecessary `react-remove-scroll` chain into the jsdom smoke test. Using the theme CSS without the runtime wrapper kept the Phase 1 shell aligned with scope and removed the test-only dependency issue.
- Extending the root TypeScript config preserves its inherited `types`, so `tsconfig.ui.json` needed an explicit browser-only override to keep backend/test globals from leaking into the UI program.
- The user wants the local frontend workflow codified early. Phase 1 was not fully closed until the zellij plus `npx localflare` helper was checked in and documented.
- The current run APIs are already specific enough to label each Phase 2 scaffold honestly: run detail, graph, task, task conversation, and artifact seams exist, while project documents plus evidence/integration/release remain the explicit stub-backed gaps.

## Outcomes & Retrospective

Planning outcome on 2026-04-18:

- The frontend direction is resolved enough to start execution without reopening framework-level debate.
- The UI plan intentionally narrows scope to structure, routing, composition boundaries, and placeholder implementations.
- The repo now has a concrete phased path for getting from “no frontend” to “stable UI scaffold” without prematurely implementing product details.
- If this plan lands cleanly, later UI work can focus on filling in features rather than renegotiating the app frame.

Phase 1 outcome on 2026-04-18:

- The repo now has a real `ui/` subtree with `app`, `routes`, `features`, `shared`, and `test` layers.
- The same Worker deployable now serves the placeholder React shell and preserves existing API/runtime ownership for `v1`, `internal`, and health routes.
- A route smoke test now proves the shared shell and every top-level placeholder destination render inside the global sidebar frame.
- The fix pass tightened the toolchain boundary so browser globals lint only in `ui/`, while `tsconfig.ui.json` no longer inherits backend/node/vitest globals from the root TypeScript program.
- The repo now ships a checked-in `npm run dev:zellij` helper that opens `npx localflare` and `npm run dev:ui` together in vertically split zellij panes.
- `npm run lint`, `npm run typecheck`, and `npm run test` pass in the sandbox. `npm run build` still fails in the default sandbox after the frontend bundle completes because Wrangler and Docker need host-writable home-directory paths, then passes when rerun outside the sandbox.
- Phase 1 is now fully closed and Phase 2 can build on the shell, helper workflow, and worker/UI runtime boundary without reopening scaffold tooling.

Phase 2 outcome on 2026-04-18:

- `Runs` now opens to a real index route instead of a single placeholder screen, with a scaffolded run table and a disabled `New run` control that stays honest about the current inline-only launcher contract.
- Run detail now lives under `/runs/:runId` with a stepper rail for `Specification`, `Architecture`, `Execution Plan`, and `Execution`, all inside the original project-scoped shell.
- `Specification`, `Architecture`, and `Execution Plan` now share one split-layout scaffold, while `Execution` defaults to a DAG-style placeholder and drills into `/runs/:runId/execution/tasks/:taskId` for the task conversation plus review-sidebar shape.
- Route smoke coverage now proves the `Runs` index, run-phase redirects, planning panes, execution DAG shell, and task-detail shell all render with context preserved.
- `npm run lint`, `npm run typecheck`, and `npm run test` pass in the sandbox. `npm run build` still fails in the sandbox only at Wrangler/Docker home-directory writes after `vite build` succeeds, then passes when rerun outside the sandbox.
- README guidance now reflects that `Runs` is no longer only a top-level placeholder destination.

## Context and Orientation

The current repository state relevant to this plan is:

- `src/index.ts`, `src/http/app.ts`, and `src/http/router.ts` define a Hono-based Cloudflare Worker application with no frontend bundle yet.
- `wrangler.jsonc` points `main` at `src/index.ts` and already carries the Worker bindings, Durable Objects, Workflows, Hyperdrive, R2, and container configuration that must remain intact.
- `package.json` currently contains backend/runtime dependencies only; there are no React, Vite, routing, or frontend test dependencies yet.
- `design/workspace-spec.md` is the canonical UI structure spec for destinations, run flow, project configuration tabs, and the ASCII board layouts.
- `design/design-guidelines.md` defines the visual and interaction constraints that should remain stable.
- `design/README.md` explains the intended relationship between `workspace-spec.md`, `design-guidelines.md`, and the target-reference images.
- `README.md` documents the current backend surface and the `v1` API routes that the eventual UI will consume.
- `src/http/api/v1/*` already exposes the structural backend seams for runs, tasks, workflow graph, artifacts, approvals, and several stubbed resources.

Paths that matter most for execution:

- `package.json`
- `tsconfig.json`
- `wrangler.jsonc`
- `src/index.ts`
- `src/http/app.ts`
- `src/http/router.ts`
- `src/http/api/v1/`
- `README.md`
- `design/workspace-spec.md`
- `design/design-guidelines.md`
- `design/README.md`

Expected new path family:

- `ui/index.html`
- `ui/src/main.tsx`
- `ui/src/app/`
- `ui/src/routes/`
- `ui/src/features/`
- `ui/src/shared/`
- `ui/src/test/`
- `vite.config.ts`

The most important current-state facts to keep in mind:

- there is no UI scaffold today,
- the backend already has a route model that roughly matches the intended frontend structure,
- the first UI pass should not over-promise screens that still depend on stubbed backend resources,
- the user wants empty implementations and strong architectural boundaries before real UI behavior.

## Plan of Work

First, establish a frontend runtime that fits the existing Worker rather than replacing it. That means adding the React/Vite scaffold, wiring it into the current Cloudflare deployment shape, creating a top-level app shell with the persistent global sidebar and top-level destinations, and codifying the local development workflow for running the Worker and UI together. This phase should also freeze the provider, route, layout, and feature-module conventions so later work has a stable home.

Second, scaffold the `Runs` destination because it is the primary operator workflow. The run index, the run-detail stepper, the shared planning-phase split layout, and the execution graph-to-task-detail route transition should exist as empty but navigable structures. They should use placeholder feature hooks and placeholder view models rather than real backend data.

Third, scaffold the remaining product surfaces that the workspace spec treats as first-class: `Documentation`, `Workstreams`, `New project`, and `Project settings`. This phase should establish the tab layout for project configuration, the project-document tree layout, and the workstream list layout without implementing the detailed form or record behavior yet.

Finally, update the repository documentation and lightweight validation so future contributors understand the new frontend architecture, development entrypoints, and scaffold boundaries. The docs should explain what is intentionally missing, not just what was added.

## Concrete Steps

Run these commands from `/home/chanzo/code/large-projects/keystone-cloudflare` unless a phase handoff says otherwise:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected baseline:

- `lint`, `typecheck`, and `test` pass in the default sandbox.
- `build` requires execution outside the sandbox on this host because Wrangler and Docker need host-writable home-directory paths.

Likely execution commands by phase:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

If frontend-specific scripts are added during execution, the plan and README must be updated in the same phase that introduces them.

## Validation and Acceptance

This plan is accepted when all of the following are true:

- the repository contains a real React frontend scaffold served by the existing Cloudflare Worker deployment shape,
- the global navigation, top-level destinations, and run stepper route hierarchy match `design/workspace-spec.md`,
- placeholder screens clearly identify themselves as scaffolds instead of pretending to be implemented product features,
- the route/layout/module structure for pages, features, hooks, providers, and shared components is obvious from the filesystem,
- the existing backend `v1` API routes still build and test cleanly,
- the updated repo scripts and docs explain how to run the scaffold locally,
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass on the final tree, with the known host-environment caveat for `build` documented if it still applies.

## Idempotence and Recovery

This plan is safe to execute incrementally because each phase should land a navigable but incomplete scaffold rather than half-implemented business logic. If a phase stops midway:

- check `Progress` and the relevant phase handoff first,
- inspect `git status` to see whether the partial work is confined to the phase's expected file set,
- prefer completing the phase or reverting only the phase's partial edits rather than jumping ahead,
- keep placeholder text explicit so incomplete work does not masquerade as implemented behavior,
- if a new script, config file, or route convention is introduced, update the plan before handing off the next phase.

No destructive migration or irreversible data change is expected in this plan.

## Artifacts and Notes

- Design-doc baseline commit: `e9f65c2` (`Document workspace UI structure`)
- Current structure sources:
  - `design/workspace-spec.md`
  - `design/design-guidelines.md`
  - `design/README.md`
- Current frontend architecture recommendation from discovery:
  - React + Vite
  - same Worker deployable for the first UI slice
  - Hono remains the API/runtime center
  - Radix foundation with Keystone-owned layouts on top

## Interfaces and Dependencies

Important repository interfaces involved in this change:

- the existing Worker entrypoint in `src/index.ts`
- Hono route registration in `src/http/router.ts`
- the UI-facing backend contracts under `src/http/api/v1/`
- the design contract in `design/workspace-spec.md`
- the visual and interaction rules in `design/design-guidelines.md`

Expected new frontend dependencies and interfaces:

- React runtime
- Vite-based frontend build/dev entrypoint
- React Router route tree
- Radix foundation for accessible primitives and theme tokens
- placeholder feature hooks that expose stable view-model shapes without live backend integration yet

## Phase 1

### Goal

Establish the frontend runtime, app shell, global sidebar, provider stack, and top-level destination route skeletons so the repo has a deployable but intentionally empty Keystone UI.

### Scope Boundary

In scope: Vite/React scaffold, Cloudflare-compatible asset serving, top-level app shell, global sidebar, route definitions, provider boundaries, shared layout primitives, and placeholder destination screens.

Out of scope: real destination content, live backend data loading, detailed component behavior, final visual polish, and destination-specific sublayouts beyond what is necessary to freeze the top-level shell.

### Read First

- `design/workspace-spec.md`
- `design/design-guidelines.md`
- `design/README.md`
- `README.md`
- `package.json`
- `wrangler.jsonc`
- `src/index.ts`
- `src/http/app.ts`
- `src/http/router.ts`

### Files Expected To Change

- `package.json`
- `tsconfig.json`
- `wrangler.jsonc`
- `vite.config.ts`
- `ui/index.html`
- `ui/src/main.tsx`
- `ui/src/app/*`
- `ui/src/routes/*`
- `ui/src/shared/*`
- `ui/src/test/*`
- local zellij/localflare helper script(s)
- `README.md`

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Success means the Worker still builds, the UI shell compiles, at least one route/render smoke test proves the app shell and global destinations mount, and the repository contains the checked-in zellij helper for the standard local Worker-plus-UI workflow.

### Plan / Docs To Update

- `Progress`
- `Execution Log`
- `Surprises & Discoveries`
- `Outcomes & Retrospective`
- `README.md` if scripts or local dev entrypoints change

### Deliverables

- frontend tooling scaffold committed,
- global sidebar and destination route skeletons committed,
- placeholder destination screens for `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings`,
- stable folder conventions for `app`, `routes`, `features`, and `shared`,
- checked-in zellij helper for `npx localflare` plus the UI workflow in vertically split panes.

### Commit Expectation

`Scaffold UI runtime and app shell`

### Known Constraints / Baseline Failures

- `npm run build` must run outside the Codex sandbox on this host.
- The repo has no frontend structure yet, so this phase must define it from scratch without destabilizing the Worker runtime.
- The shell must follow `workspace-spec.md`, not the older generalized board mental model.
- The local dev helper should standardize on `npx localflare` and the UI workflow in a vertical zellij split.

### Status

Completed on 2026-04-18 after the targeted fix pass for the runtime-boundary review finding and the checked-in local dev helper.

### Completion Notes

- Added the Vite/React scaffold under `ui/` with a stable `app`, `routes`, `features`, `shared`, and `test` structure.
- Added the project-scoped shell, global sidebar, and placeholder routes for `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings`.
- Wired Wrangler assets to serve the SPA while preserving Worker-first handling for `/v1/*`, `/internal/*`, and `/healthz`.
- Added a checked-in `npm run dev:zellij` helper plus zellij layout that starts `npx localflare` and `npm run dev:ui` together in vertically split panes.
- Narrowed the toolchain boundary so browser globals are linted only for UI files and `tsconfig.ui.json` uses browser-only global types instead of inheriting backend/test globals from the root config.
- Validation results: `npm run lint`, `npm run typecheck`, and `npm run test` pass in the sandbox. `npm run build` fails in the sandbox at Wrangler/Docker home-directory writes after `vite build` succeeds, then passes outside the sandbox.

### Next Starter Context

Phase 2 should extend the existing shell from `ui/src/routes/router.tsx` and `ui/src/shared/layout/` rather than creating a second app frame. The default `/runs` route already exists and should grow into nested run routes, using the same placeholder-screen honesty and the same project-scoped sidebar. It can also assume the checked-in zellij helper and the worker/UI toolchain boundary are already in place.

## Phase 2

### Goal

Scaffold the `Runs` destination, run index, run-detail stepper, shared planning-phase layout, and execution route shells so the primary operator workflow exists structurally.

### Scope Boundary

In scope: `Runs` index page, run detail route nesting, `Specification`, `Architecture`, `Execution Plan`, and `Execution` pages, shared planning split layout, execution default layout, and placeholder task-detail route shape.

Out of scope: real run loading, final DAG implementation, real task conversations, real code review content, and destination logic outside `Runs`.

### Read First

- `design/workspace-spec.md`
- `design/design-guidelines.md`
- `README.md`
- `src/http/api/v1/runs/router.ts`
- `src/http/api/v1/runs/contracts.ts`
- Phase 1 results and route structure

### Files Expected To Change

- `ui/src/routes/runs/*`
- `ui/src/features/runs/*`
- `ui/src/features/execution/*`
- `ui/src/shared/layouts/*`
- `ui/src/shared/navigation/*`
- `ui/src/test/*`
- `README.md` if route or dev guidance needs clarification

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Success means route smoke coverage proves the `Runs` index, nested run phases, and execution drill-down shells all render and preserve context.

### Plan / Docs To Update

- `Progress`
- `Execution Log`
- `Surprises & Discoveries`
- `Outcomes & Retrospective`

### Deliverables

- placeholder `Runs` index,
- placeholder run-stepper pages,
- shared planning-phase scaffold,
- execution DAG placeholder shell,
- task-detail placeholder shell with chat-plus-review split.

### Commit Expectation

`Scaffold runs and execution route structure`

### Known Constraints / Baseline Failures

- Keep placeholders honest about current backend coverage and stubbed resources.
- Do not implement real task graph or task conversation behavior in this phase.
- Preserve the route shapes described in `workspace-spec.md`.

### Status

Completed on 2026-04-18.

### Completion Notes

- Added a real `Runs` index route and nested `:runId` run-detail routes under the existing shell instead of introducing a second app frame.
- Added shared planning-phase scaffolds for `Specification`, `Architecture`, and `Execution Plan`, with fixed placeholder view models that name the current backend seams and stubbed gaps explicitly.
- Added execution and task-detail route shells that preserve run context while showing the intended DAG-first and chat-plus-review states.
- Added route smoke coverage for `/runs`, `/runs/:runId`, the planning routes, the execution route, and the task-detail route.
- Updated README UI scope notes so the checked-in guidance matches the new run-route structure.
- Validation results: `npm run lint`, `npm run typecheck`, and `npm run test` pass in the sandbox. `npm run build` fails in the sandbox only because Wrangler/Docker cannot write to host home-directory paths after `vite build` succeeds, then passes when rerun outside the sandbox.

### Next Starter Context

Phase 3 should leave the new `Runs` route family intact and apply the same composition patterns to `Documentation`, `Workstreams`, `New project`, and `Project settings`. The run scaffolds now live under `ui/src/routes/runs/`, `ui/src/features/runs/`, `ui/src/features/execution/`, and `ui/src/shared/layout/`; reuse those shared layout conventions rather than introducing destination-specific app frames.

## Phase 3

### Goal

Scaffold the remaining workspace-spec destinations and project configuration surfaces so the full Keystone information architecture exists, even though the detailed screen logic is still placeholder-only.

### Scope Boundary

In scope: `Documentation`, `Workstreams`, `New project`, and `Project settings` destination shells; project settings tabs; placeholder component type picker flow; placeholder hooks and view models for these surfaces.

Out of scope: real form submission, real project updates, live document trees, real workstream filtering, and backend wiring for stubbed project-document surfaces.

### Read First

- `design/workspace-spec.md`
- `design/design-guidelines.md`
- `src/http/api/v1/projects/*`
- `README.md`
- Phase 1 and Phase 2 outputs

### Files Expected To Change

- `ui/src/routes/documentation/*`
- `ui/src/routes/workstreams/*`
- `ui/src/routes/projects/*`
- `ui/src/features/documentation/*`
- `ui/src/features/workstreams/*`
- `ui/src/features/projects/*`
- `ui/src/shared/forms/*`
- `ui/src/test/*`

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Success means all top-level destinations from the workspace spec are navigable, structurally distinct, and backed by placeholder hooks/components that match the intended information architecture.

### Plan / Docs To Update

- `Progress`
- `Execution Log`
- `Surprises & Discoveries`
- `Outcomes & Retrospective`

### Deliverables

- documentation shell and document-tree placeholder,
- workstreams shell and list placeholder,
- new-project and project-settings tab shells,
- component-type picker placeholder with only `Git repository` available.

### Commit Expectation

`Scaffold documentation workstreams and project settings`

### Known Constraints / Baseline Failures

- Project documents and decision packages remain backend stubs today.
- Component creation must use a type picker even though only one type is currently supported.
- Keep rules and environment editing structural only in this phase.

### Status

Not started.

### Completion Notes

None yet.

### Next Starter Context

This phase should extend the same shell and composition patterns established earlier. Do not create one-off layouts that fight the workspace spec.

## Phase 4

### Goal

Document the frontend scaffold architecture, update the repo guidance, and close with validation that the new UI structure is understandable and build-safe.

### Scope Boundary

In scope: README updates, developer-documentation updates if needed, `.ultrakit/notes.md` updates if execution reveals durable repo-specific knowledge, and final validation evidence.

Out of scope: new UI feature implementation or route restructuring beyond what documentation work strictly requires.

### Read First

- `README.md`
- `.ultrakit/notes.md`
- `design/workspace-spec.md`
- final Phase 1-3 results

### Files Expected To Change

- `README.md`
- `.ultrakit/notes.md`
- `.ultrakit/developer-docs/*` if architectural documentation meaningfully changes
- `.ultrakit/exec-plans/active/keystone-ui-structure-scaffold.md`

### Validation

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Success means the documentation explains how to run and extend the scaffold, and the full repo validation passes with any remaining environment caveats clearly recorded.

### Plan / Docs To Update

- `Progress`
- `Execution Log`
- `Surprises & Discoveries`
- `Outcomes & Retrospective`
- `.ultrakit/notes.md` if new durable project knowledge was learned

### Deliverables

- updated repo docs,
- updated developer notes if warranted,
- final validation evidence recorded in the plan.

### Commit Expectation

`Document UI scaffold architecture`

### Known Constraints / Baseline Failures

- Only update developer docs if the scaffold changes durable architecture or contributor workflow.
- Keep final documentation explicit about what is still placeholder-only.

### Status

Not started.

### Completion Notes

None yet.

### Next Starter Context

This is the closeout phase after the structural scaffold lands. Reuse the final repo state; do not reopen frontend architecture decisions here.
