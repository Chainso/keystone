# Keystone UI ASCII Alignment Reset

## Purpose / Big Picture

This plan resets the current React UI scaffold so it matches the canonical ASCII boards in [design/workspace-spec.md](../../../design/workspace-spec.md) instead of presenting itself as an internal milestone demo. After this work lands, an operator opening the app should see a sparse, product-shaped workspace with the right shell, tables, tabs, panels, and route boundaries, but without implementation-phase narration, backend-gap explainers, extra side rails, or custom visual treatment that was never part of the source-of-truth boards.

From the user's perspective, success means:

- the global sidebar, `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings` still exist in the same top-level route model,
- each surface now looks like the corresponding ASCII frame rather than an embellished scaffold explainer,
- no user-facing page says things like `Phase 2 scaffold`, `Placeholder honesty`, or similar internal delivery language,
- the UI uses plain structural components and minimal styling instead of gradients, branded cards, and extra hero/aside patterns,
- later plans can safely add live wiring and richer behavior on top of a stable, faithful component scaffold.

This is a corrective scaffold plan, not a live-data plan. It intentionally prioritizes fidelity to the ASCII frames over preserving the current placeholder presentation.

## Backward Compatibility

Backward compatibility for the current UI presentation is **not required**. The user explicitly wants the current scaffold presentation corrected, including removal of user-visible scaffold language, custom styling, and surfaces that are outside the ASCII diagrams.

Compatibility that **is** required:

- preserve the current top-level information architecture from [design/workspace-spec.md](../../../design/workspace-spec.md): one selected project, global sidebar, `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings`,
- preserve the current route tree and deployable shape in [ui/src/routes/router.tsx](../../../ui/src/routes/router.tsx) and the same Worker-served SPA architecture,
- preserve the current repo validation baseline: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`, with the known sandbox-vs-host build caveat,
- do **not** expand this corrective plan into project live wiring, run live wiring, document persistence, or workstream backend integration,
- do **not** mutate the unrelated active plans except to keep the active-plan index accurate and ordered.

## Design Decisions

1. **Date:** 2026-04-18  
   **Decision:** Treat the ASCII boards in [design/workspace-spec.md](../../../design/workspace-spec.md) as the primary visual and structural source of truth for this corrective pass.  
   **Rationale:** The audits showed the route tree is mostly right, but the rendered UI drifted by adding explanatory chrome and custom treatments that are not in the canonical boards.  
   **Alternatives considered:** Preserve the existing scaffold presentation and only remove the worst copy; treat the current implementation as an acceptable interpretation.

2. **Date:** 2026-04-18  
   **Decision:** Keep the current route tree and file ownership layers, but reset the visible surfaces to match the board frames more closely.  
   **Rationale:** The route structure under [ui/src/routes/router.tsx](../../../ui/src/routes/router.tsx) already encodes the correct product model. The corrective work is primarily about what is rendered inside those boundaries, not about inventing a new navigation system.  
   **Alternatives considered:** Rebuild the route tree from scratch; collapse multiple destinations into one temporary shell.

3. **Date:** 2026-04-18  
   **Decision:** Remove all delivery-process, scaffold-status, backend-gap, and implementation-planning language from user-facing UI copy.  
   **Rationale:** The audits consistently found phrases like `Phase 2 scaffold`, `Placeholder honesty`, raw API references, and implementation sequencing inside the product UI. That language belongs in plans and docs, not in the interface.  
   **Alternatives considered:** Keep a reduced version of the honesty copy; hide it only behind developer-only flags.

4. **Date:** 2026-04-18  
   **Decision:** Replace the custom art-directed style layer with minimal layout-only styling that supports shell, tabs, tables, splits, and form scaffolds without product branding.  
   **Rationale:** The user explicitly wants the component scaffold, not a custom visual system. The current [ui/src/app/styles.css](../../../ui/src/app/styles.css) is a bespoke dark treatment with gradients, shadows, display typography, and animated chrome that materially exceeds that brief.  
   **Alternatives considered:** Keep the dark system but tone it down; migrate to another opinionated design kit.

5. **Date:** 2026-04-18  
   **Decision:** Remove surface patterns that are outside the ASCII frames unless they are necessary for route structure or accessibility.  
   **Rationale:** The repeated hero headers, honesty asides, right-rail guarantee/deferred panels, nav summaries, phase summaries, stats strips, and extra row notes are the main sources of drift.  
   **Alternatives considered:** Preserve selected extras when they seem useful; defer the cleanup until after live wiring.

6. **Date:** 2026-04-18  
   **Decision:** Use real semantic scaffold controls where the boards imply them: links, buttons, tabs, tables, tree items, and form fields should render as those controls even when the backing behavior is still minimal or local-only.  
   **Rationale:** The current project configuration scaffold often renders values through custom placeholder wrappers instead of actual inputs and editors. That makes the scaffold less faithful to the board and less reusable for later live wiring.  
   **Alternatives considered:** Keep the current read-only placeholder wrappers; fully implement the controls against live APIs in this plan.

7. **Date:** 2026-04-18  
   **Decision:** Keep this corrective plan presentation-only and treat it as a prerequisite for `keystone-ui-project-management-live-wiring`.  
   **Rationale:** The active live-wiring plan assumes the current scaffold surfaces are the right ones to fill in. The audit shows they are not. The scaffold needs to be corrected before deeper behavior lands on top of it.  
   **Alternatives considered:** Execute live wiring first and clean up the UI afterward; merge both concerns into one larger plan.

8. **Date:** 2026-04-18  
   **Decision:** Run-specific workspace layouts should not remain in `ui/src/shared/` if they depend on run-feature types or run-specific section structure.  
   **Rationale:** The React architecture audit found that `PlanningWorkspace`, `ExecutionWorkspace`, and `TaskDetailWorkspace` currently live in the shared layer while depending directly on `features/runs` types and assumptions. That reverses the boundary and will make future live-wiring work harder.  
   **Alternatives considered:** Keep the current placement and accept the coupling; defer the boundary correction until live data lands.

9. **Date:** 2026-04-18  
   **Decision:** Avoid mode-driven monoliths in project configuration. If the corrective pass touches that area structurally, keep `new` vs `settings` differences at the route/composition boundary and prefer explicit tab modules over one large mode-switching route module.  
   **Rationale:** The current `mode: "new" | "settings"` branching is already turning project configuration into a variant-by-flag hotspot. That is a poor foundation for later live project wiring.  
   **Alternatives considered:** Preserve the current one-file, one-hook mode branching and only clean up the copy/styling.

10. **Date:** 2026-04-18  
   **Decision:** Where large workspace components are touched in this plan, bias toward smaller composable primitives or clearly feature-owned surfaces instead of one large prop-bag component.  
   **Rationale:** The current workspaces are structurally rigid and will otherwise grow into prop-heavy monoliths once streaming states, empty states, and richer side panels arrive.  
   **Alternatives considered:** Leave the large workspace components intact and defer all composability cleanup.

11. **Date:** 2026-04-18  
   **Decision:** Route files should stay thin containers; destination-specific rendering should move into feature surfaces when a route is doing too much.  
   **Rationale:** `DocumentationRoute` and, to a lesser extent, `WorkstreamsRoute` currently behave as both route container and feature surface, which weakens reuse and testing boundaries.  
   **Alternatives considered:** Keep route files as the primary feature implementation modules.

12. **Date:** 2026-04-18  
   **Decision:** Custom hooks touched in this plan should move toward a split between local UI-state hooks and feature data-shaping hooks instead of growing one broad “view model” hook per surface.  
   **Rationale:** The current view-model hooks mix interaction state with feature shaping in ways that will get awkward once data becomes live. The corrective pass should not deepen that coupling.  
   **Alternatives considered:** Continue using one mixed view-model hook per destination and address the coupling only during live wiring.

## Execution Log

- **Date:** 2026-04-18  
  **Phase:** Planning  
  **Decision:** Base the corrective plan on five separate audits rather than one blended opinion.  
  **Rationale:** Independent audits for `Runs`, `Documentation`, `Workstreams`, `Project configuration`, and cross-cutting shell/style concerns all converged on the same root issue, which makes the plan constraints more durable.

- **Date:** 2026-04-18  
  **Phase:** Planning  
  **Decision:** Keep this plan separate from the active live-wiring and document-collection plans instead of rewriting those plans in place.  
  **Rationale:** Those plans are still awaiting approval and solve different problems. The corrective plan needs a clean acceptance target centered on ASCII-frame fidelity.

- **Date:** 2026-04-18  
  **Phase:** Phase 1  
  **Decision:** Replace the shell’s summary-heavy sidebar with board-like project and navigation controls, and rewrite the global UI stylesheet to neutral layout primitives instead of tuning the existing bespoke treatment.  
  **Rationale:** The shell drift was caused by both copy and the shared visual system. Resetting only one of those layers would have left the scaffold reading like a polished milestone demo instead of the canonical workspace frame.

## Progress

- [x] 2026-04-18 Discovery completed through direct review of `design/workspace-spec.md`, the current UI implementation, and five parallel frame-specific audits.
- [x] 2026-04-18 Baseline validation recorded: `npm run lint`, `npm run typecheck`, and `npm run test` passed in the sandbox; `npm run build` failed in the sandbox only on Wrangler/Docker home-directory writes and then passed outside the sandbox.
- [x] 2026-04-18 Corrective execution plan created and registered in `.ultrakit/exec-plans/active/index.md`.
- [x] 2026-04-18 User approval recorded and execution started.
- [x] 2026-04-18 Phase 1: Reset the shared shell and base styling to a minimal ASCII-faithful scaffold.
- [ ] Phase 2: Realign the `Runs` family to the index / planning panes / execution / task-detail boards.
- [ ] Phase 3: Realign `Documentation` and `Workstreams` to their canonical boards.
- [ ] Phase 4: Realign `New project` and `Project settings` to the project-configuration boards.
- [ ] Phase 5: Update tests, docs, and plan notes; capture the corrective outcome and the dependency this creates for later live-wiring work.

## Surprises & Discoveries

- All five audits agreed that the main drift is presentation, not information architecture. The route model is mostly aligned; the visible UI is where the mismatch lives.
- The current UI leaks internal delivery language from multiple layers at once: route components, shared shell copy, feature view models, and seed placeholder data all contribute.
- [ui/src/app/styles.css](../../../ui/src/app/styles.css) is a large bespoke visual system, not a minimal scaffold stylesheet. The corrective work will need to simplify shared classes broadly instead of only changing a few page-level rules.
- Existing UI tests encode some of the current scaffold language and surface patterns. The corrective plan must update tests to verify ASCII-frame structure and absence of internal copy instead of reinforcing the current drift.
- There are already two other active plans awaiting approval in `.ultrakit/exec-plans/active/index.md`. This corrective plan should be considered the higher-priority UI prerequisite for any plan that wants to fill in the current scaffold surfaces.
- A separate React architecture audit found five additional structural risks to address while correcting the scaffold: run-specific layouts living in `shared`, a mode-driven project-configuration monolith, large prop-bag workspace components, route files acting as feature surfaces, and view-model hooks mixing local UI state with feature data shaping.
- Resetting the shell styling cleanly required replacing nearly the entire shared stylesheet, because out-of-scope route families still depend on the same global class layer. A small shell-only CSS patch would have preserved too much of the prior chrome.

## Outcomes & Retrospective

Planning outcome on 2026-04-18:

- The corrective scope is now concrete: keep the route skeleton, strip the internal narration, remove the extra surfaces, and collapse the visual treatment to plain scaffold components.
- The plan breaks cleanly into one shared-shell foundation phase, three surface-alignment phases, and one closeout phase.
- If this plan lands cleanly, later UI plans can wire behavior into a faithful scaffold instead of preserving today’s misaligned presentation.

Phase 1 outcome on 2026-04-18:

- The global shell now reads as a sparse project workspace: terse project context, icon-only project actions, primary navigation labels only, and no shell footnote or summary copy.
- The shared stylesheet now uses neutral border-and-panel primitives that keep the existing route tree renderable without the old gradients, shadows, or branded chrome.
- Phase 2 can now focus on run-surface structure and ownership boundaries without also carrying shell-level cleanup.

## Context and Orientation

Relevant current repository state:

- The current source of truth for UI structure is [design/workspace-spec.md](../../../design/workspace-spec.md), especially the `Canonical App Board` section and the stable decisions beneath it.
- The current route tree already encodes the right product destinations in [ui/src/routes/router.tsx](../../../ui/src/routes/router.tsx).
- The shared shell and much of the copy drift come from:
  - [ui/src/shared/layout/shell-sidebar.tsx](../../../ui/src/shared/layout/shell-sidebar.tsx)
  - [ui/src/shared/navigation/destinations.ts](../../../ui/src/shared/navigation/destinations.ts)
  - [ui/src/features/projects/project-context.tsx](../../../ui/src/features/projects/project-context.tsx)
  - [ui/src/app/styles.css](../../../ui/src/app/styles.css)
- The `Runs` surface is split across:
  - [ui/src/routes/runs/](../../../ui/src/routes/runs/)
  - [ui/src/shared/layout/run-detail-scaffold.tsx](../../../ui/src/shared/layout/run-detail-scaffold.tsx)
  - [ui/src/shared/layout/run-phase-stepper.tsx](../../../ui/src/shared/layout/run-phase-stepper.tsx)
  - [ui/src/shared/layout/planning-workspace.tsx](../../../ui/src/shared/layout/planning-workspace.tsx)
  - [ui/src/shared/layout/execution-workspace.tsx](../../../ui/src/shared/layout/execution-workspace.tsx)
  - [ui/src/shared/layout/task-detail-workspace.tsx](../../../ui/src/shared/layout/task-detail-workspace.tsx)
  - [ui/src/features/runs/run-scaffold.ts](../../../ui/src/features/runs/run-scaffold.ts)
  - [ui/src/features/execution/use-execution-view-model.ts](../../../ui/src/features/execution/use-execution-view-model.ts)
  - The React audit found that these run-specific workspace layouts should either move under `features/runs` or be rewritten around feature-neutral props; leaving them in `shared` as-is is a poor long-term boundary.
- The `Documentation` surface lives in:
  - [ui/src/routes/documentation/documentation-route.tsx](../../../ui/src/routes/documentation/documentation-route.tsx)
  - [ui/src/features/documentation/use-documentation-view-model.ts](../../../ui/src/features/documentation/use-documentation-view-model.ts)
  - The React audit found that `DocumentationRoute` currently acts as both route container and feature surface.
- The `Workstreams` surface lives in:
  - [ui/src/routes/workstreams/workstreams-route.tsx](../../../ui/src/routes/workstreams/workstreams-route.tsx)
  - [ui/src/features/workstreams/use-workstreams-view-model.ts](../../../ui/src/features/workstreams/use-workstreams-view-model.ts)
  - The React audit found that `WorkstreamsRoute` is trending toward the same route-as-feature pattern.
- The project-configuration surfaces live in:
  - [ui/src/routes/projects/project-configuration-layout.tsx](../../../ui/src/routes/projects/project-configuration-layout.tsx)
  - [ui/src/routes/projects/project-configuration-tab-route.tsx](../../../ui/src/routes/projects/project-configuration-tab-route.tsx)
  - [ui/src/shared/layout/project-configuration-scaffold.tsx](../../../ui/src/shared/layout/project-configuration-scaffold.tsx)
  - [ui/src/shared/forms/placeholder-field.tsx](../../../ui/src/shared/forms/placeholder-field.tsx)
  - [ui/src/shared/forms/placeholder-list-field.tsx](../../../ui/src/shared/forms/placeholder-list-field.tsx)
  - [ui/src/shared/forms/component-type-picker.tsx](../../../ui/src/shared/forms/component-type-picker.tsx)
  - [ui/src/features/projects/use-project-configuration-view-model.ts](../../../ui/src/features/projects/use-project-configuration-view-model.ts)
  - The React audit found that this area is already drifting into a mode-driven monolith and should be split into clearer tab modules / route composition before live wiring lands.
- Current UI tests live under [ui/src/test/](../../../ui/src/test/) and currently assert some scaffold-specific behaviors and strings that this plan intends to remove.
- Other active plans currently awaiting approval are:
  - [keystone-project-document-and-decision-package-collections.md](./keystone-project-document-and-decision-package-collections.md)
  - [keystone-ui-project-management-live-wiring.md](./keystone-ui-project-management-live-wiring.md)

The working assumption for execution is that this corrective plan lands before the live-wiring plan, because the live-wiring work should fill in the corrected scaffold rather than preserve the current presentation.

## Plan of Work

The first phase resets the shared shell and global presentation primitives. It removes the extra explanatory copy in the sidebar, simplifies the project switcher and navigation treatment, and replaces the current custom visual system with minimal layout-only styling that still supports the route tree.

The second phase focuses only on `Runs`, because that is the largest and most structurally important surface. It keeps the route hierarchy and phase stepper, but removes the hero/aside patterns, coverage/deferred sidebars, extra step summaries, and scaffold narration. It also reshapes the rendered execution default toward a true graph-first placeholder rather than a stats-plus-cards view. While touching this area, the phase should also correct the module boundary issue identified in the React audit by either moving run-specific workspaces out of `shared` or making them genuinely feature-neutral.

The third phase resets `Documentation` and `Workstreams` to the board shapes. That means a simple doc tree plus viewer for `Documentation`, and a simple filter bar plus clickable table for `Workstreams`, with no secondary side rails or backend-readiness explainer content. It should also restore a cleaner route-container boundary by pushing destination rendering into feature surfaces instead of leaving route files as monolithic page implementations.

The fourth phase corrects `New project` and `Project settings`. It keeps the tab model and shared route family, but turns the presentation into one main configuration panel, uses real semantic form controls for the scaffold, and removes the hero/aside/right-sidebar patterns that currently frame the forms as an internal scaffold milestone. It should also reduce the current mode-driven monolith by splitting the project-configuration composition into clearer tab-specific and mode-specific modules.

The last phase closes the plan by updating tests, docs, and durable notes. The tests should validate board fidelity and absence of internal delivery copy. The docs should explain that the scaffold is intentionally minimal and that deeper live wiring should build on the corrected surfaces.

## Concrete Steps

Run all commands from `/home/chanzo/code/large-projects/keystone-cloudflare`.

1. Record the baseline before editing:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

Expected result: `lint`, `typecheck`, and `test` pass in the sandbox. `build` fails in the sandbox only on Wrangler/Docker home-directory writes after `vite build` completes, then passes when rerun outside the sandbox.

2. During the copy-reset work, use targeted searches to prove internal delivery language is being removed from product UI:

```bash
rtk rg -n "Phase [0-9]|scaffold|placeholder honesty|Current backend coverage|Deferred|Still intentionally stubbed" ui/src -S
```

Expected result: by the end of the plan, any remaining hits are limited to non-user-facing tests or clearly internal implementation-only symbols, not visible route/view-model copy.

3. After each phase, rerun the broad UI validation set:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test
```

Expected result: the broad repo baseline stays green after each corrective phase.

4. At the end of the full plan, rerun the full validation set and confirm the build baseline has not changed:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

Expected result: same baseline as step 1, with the known sandbox-only build caveat and a successful host rerun.

## Validation and Acceptance

This plan is complete when all of the following are true:

- The UI still uses the same top-level route tree and same Worker-served SPA structure.
- The global sidebar presents only the project context and primary destinations implied by the ASCII boards, without nav summaries, scaffold footnotes, or internal status language.
- No user-facing page shows internal delivery phrases such as `Phase 2 scaffold`, `Phase 3 scaffold`, `Placeholder honesty`, raw API references, or backend-readiness narration.
- The major repeated extras are gone: no hero/aside explainer blocks, no right-rail `guarantees / deferred / coverage` side panels, no execution KPI strip, no extra step summaries, and no row-level placeholder notes unless the ASCII board explicitly implies them.
- `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings` each render a structure that closely matches the corresponding ASCII frame.
- The `Runs` execution default is visually a graph-first placeholder rather than a stats-and-cards workspace.
- The project-configuration surfaces use semantic form controls for the scaffold rather than read-only placeholder wrappers.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` meet the same baseline expectations recorded in this plan.

## Idempotence and Recovery

This plan is safe to retry because it is presentation-only. It does not mutate backend data or change the deployable architecture.

If a phase stops halfway:

- leave the route tree intact and prefer a plainer but complete surface over a half-removed hero/sidebar pattern,
- keep visible copy truthful, even if temporary wording is sparse,
- update the plan handoff to say exactly which surfaces have been reset and which still leak internal delivery language,
- treat sandbox `build` failures under Wrangler/Docker home-directory writes as environmental unless the host rerun also fails.

If a CSS reset becomes too broad or risky, prefer deleting custom surface-specific rules and falling back to a small set of plain layout classes rather than trying to preserve the current visual system in pieces.

## Artifacts and Notes

Audit-backed findings that shaped this plan:

- `Runs`, `Documentation`, `Workstreams`, and project configuration all broadly match the route/IA structure but drift heavily in presentation.
- The repeated problems are:
  - internal delivery/scaffold narration in user-facing copy,
  - extra hero/aside/right-rail surfaces not in the ASCII boards,
  - overly designed styling in [ui/src/app/styles.css](../../../ui/src/app/styles.css),
  - placeholder content that explains backend gaps instead of simply rendering the intended board shape.

Planning baseline captured on 2026-04-18:

- `rtk npm run lint` -> passed
- `rtk npm run typecheck` -> passed
- `rtk npm run test` -> passed with `33` test files passed, `2` skipped; `142` tests passed, `8` skipped
- `rtk npm run build` in sandbox -> `vite build` passed, then Wrangler/Docker failed on:
  - `EROFS: read-only file system, open '/home/chanzo/.config/.wrangler/logs/...`
  - `open /home/chanzo/.docker/buildx/activity/...: read-only file system`
- `rtk npm run build` outside sandbox -> passed

## Interfaces and Dependencies

Important files and modules for this work:

- Route tree: [ui/src/routes/router.tsx](../../../ui/src/routes/router.tsx)
- Shared shell: [ui/src/routes/shell-layout.tsx](../../../ui/src/routes/shell-layout.tsx), [ui/src/shared/layout/app-shell.tsx](../../../ui/src/shared/layout/app-shell.tsx), [ui/src/shared/layout/shell-sidebar.tsx](../../../ui/src/shared/layout/shell-sidebar.tsx)
- Shared navigation data: [ui/src/shared/navigation/destinations.ts](../../../ui/src/shared/navigation/destinations.ts)
- Shared styles: [ui/src/app/styles.css](../../../ui/src/app/styles.css)
- Runs layout/data: [ui/src/routes/runs/](../../../ui/src/routes/runs/), [ui/src/shared/layout/](../../../ui/src/shared/layout/), [ui/src/features/runs/](../../../ui/src/features/runs/), [ui/src/features/execution/](../../../ui/src/features/execution/)
- Documentation layout/data: [ui/src/routes/documentation/documentation-route.tsx](../../../ui/src/routes/documentation/documentation-route.tsx), [ui/src/features/documentation/use-documentation-view-model.ts](../../../ui/src/features/documentation/use-documentation-view-model.ts)
- Workstreams layout/data: [ui/src/routes/workstreams/workstreams-route.tsx](../../../ui/src/routes/workstreams/workstreams-route.tsx), [ui/src/features/workstreams/use-workstreams-view-model.ts](../../../ui/src/features/workstreams/use-workstreams-view-model.ts)
- Project configuration layout/data: [ui/src/routes/projects/](../../../ui/src/routes/projects/), [ui/src/shared/forms/](../../../ui/src/shared/forms/), [ui/src/features/projects/](../../../ui/src/features/projects/)
- UI tests: [ui/src/test/](../../../ui/src/test/)

At the end of this plan, the repository should have:

- the same route skeleton and deployable shape,
- a much smaller and plainer shared style layer,
- cleaner module boundaries between route containers, feature surfaces, and truly shared primitives,
- surfaces that visually and structurally match the ASCII boards more closely,
- no user-facing internal delivery/scaffold narration,
- a corrected scaffold that later live-wiring work can build on safely.

## Phase 1: Reset the shared shell and base styling

### Phase Handoff

**Goal**  
Strip the shared shell back to a minimal ASCII-faithful frame and replace the bespoke global styling with minimal scaffold styling.

**Scope Boundary**  
In scope: shared shell layout, sidebar copy, navigation data, project-context summary text, and the common stylesheet/primitives used across the UI.  
Out of scope: surface-specific `Runs`, `Documentation`, `Workstreams`, or project-configuration content beyond what is required to keep the shell compiling against the new shared primitives.

**Read First**  
`design/workspace-spec.md`  
`ui/src/routes/shell-layout.tsx`  
`ui/src/shared/layout/app-shell.tsx`  
`ui/src/shared/layout/shell-sidebar.tsx`  
`ui/src/shared/navigation/destinations.ts`  
`ui/src/features/projects/project-context.tsx`  
`ui/src/app/styles.css`

**Files Expected To Change**  
`ui/src/shared/layout/shell-sidebar.tsx`  
`ui/src/shared/navigation/destinations.ts`  
`ui/src/features/projects/project-context.tsx`  
`ui/src/app/styles.css`  
`ui/src/shared/layout/app-shell.tsx`  
`ui/src/shared/layout/page-section.tsx`  
Possibly small supporting shared-layout files if the current hero/page-section primitives are removed or collapsed.

**Validation**  
Run:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test -- ui/src/test/app-shell.test.tsx
rtk npm run test
```

Success means the shell tests pass, the app still mounts, and no user-facing shared-shell copy includes scaffold-phase narration.

**Plan / Docs To Update**  
Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.

**Deliverables**  
- sidebar with terse board-like labels only,
- no nav summaries or scaffold footnote,
- project context copy that no longer says `UI structure scaffold placeholder`,
- minimal base styling replacing the current bespoke shell treatment,
- a shared layer that is smaller and more obviously generic, setting up later phases to move feature-owned surfaces out of `shared` where appropriate.

**Commit Expectation**  
`Reset shared UI shell to ASCII scaffold`

**Known Constraints / Baseline Failures**  
`npm run build` still has the known sandbox-only Wrangler/Docker write failure and needs a host rerun for final confirmation.

**Status**  
Completed on 2026-04-18.

**Completion Notes**  
- Removed navigation summaries, scaffold footnote copy, and the `UI structure scaffold placeholder` project text from the shared shell.
- Simplified shared navigation and project-context data structures so the shell only carries project identity, route labels, and project-action glyphs.
- Replaced `ui/src/app/styles.css` with a neutral scaffold stylesheet that still covers the current route-family markup used outside this phase.
- Validation passed: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm run test -- ui/src/test/app-shell.test.tsx`, and `rtk npm run test`.

**Next Starter Context**  
Phase 2 should treat the shell reset as complete and focus only on the `Runs` family. The shared shell now provides the plain frame; the remaining drift is inside run-route headers, sidebars, summaries, and run-specific shared-layout ownership.

## Phase 2: Realign the Runs family

### Phase Handoff

**Goal**  
Make the `Runs` index, planning phases, execution default, and task detail read like the ASCII boards instead of an internal scaffold explainer.

**Scope Boundary**  
In scope: `Runs` routes, run-detail layout, stepper presentation, planning workspace, execution workspace, task detail workspace, their feature-owned scaffold/view-model copy, and the module-boundary correction needed so run-specific workspaces are not pretending to be generic shared layouts.  
Out of scope: `Documentation`, `Workstreams`, project configuration, and live backend wiring.

**Read First**  
`design/workspace-spec.md`  
`ui/src/routes/runs/runs-index-route.tsx`  
`ui/src/routes/runs/run-detail-layout.tsx`  
`ui/src/shared/layout/run-detail-scaffold.tsx`  
`ui/src/shared/layout/run-phase-stepper.tsx`  
`ui/src/shared/layout/planning-workspace.tsx`  
`ui/src/shared/layout/execution-workspace.tsx`  
`ui/src/shared/layout/task-detail-workspace.tsx`  
`ui/src/features/runs/run-scaffold.ts`  
`ui/src/features/runs/use-runs-index-view-model.ts`  
`ui/src/features/execution/use-execution-view-model.ts`

**Files Expected To Change**  
`ui/src/routes/runs/runs-index-route.tsx`  
`ui/src/shared/layout/run-detail-scaffold.tsx`  
`ui/src/shared/layout/run-phase-stepper.tsx`  
`ui/src/shared/layout/planning-workspace.tsx`  
`ui/src/shared/layout/execution-workspace.tsx`  
`ui/src/shared/layout/task-detail-workspace.tsx`  
`ui/src/features/runs/run-scaffold.ts`  
`ui/src/features/runs/use-runs-index-view-model.ts`  
`ui/src/features/execution/use-execution-view-model.ts`  
Potentially supporting test files under `ui/src/test/`.

**Validation**  
Run:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test -- ui/src/test/runs-routes.test.tsx
rtk npm run test
```

Success means the `Runs` route family still works, rows and task links route correctly, and the user-facing `Runs` surfaces no longer expose internal delivery/scaffold language.

**Plan / Docs To Update**  
Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.

**Deliverables**  
- plain `Runs` index table aligned with the board,
- planning panes that look like chat + living document instead of coverage/deferred explainer panes,
- execution default reshaped toward a graph-first placeholder,
- task detail reduced to conversation + review sidebar without extra meta side rails,
- run-specific workspace modules either moved under feature ownership or rewritten around feature-neutral props.

**Commit Expectation**  
`Realign runs scaffold to ASCII boards`

**Known Constraints / Baseline Failures**  
Keep the current route URLs intact. Do not widen this phase into live data, real diff rendering, or task messaging writes. Avoid replacing one large prop-bag workspace with another equally rigid one.

**Status**  
Not started.

**Completion Notes**  
None yet.

**Next Starter Context**  
The route hierarchy is already correct. Focus on simplifying what is rendered and deleting the extra panels, summaries, and copy that are not in the board. Use this phase to fix the `shared` vs feature boundary for run workspaces while the files are already open.

## Phase 3: Realign Documentation and Workstreams

### Phase Handoff

**Goal**  
Reduce `Documentation` and `Workstreams` to the exact board-shaped scaffolds the spec calls for.

**Scope Boundary**  
In scope: the `Documentation` and `Workstreams` route components, their feature view models, any shared table/panel primitives they need after the shell reset, and the extraction needed to keep route files as thin containers rather than destination monoliths.  
Out of scope: `Runs`, project configuration, and live document/workstream adapters.

**Read First**  
`design/workspace-spec.md`  
`ui/src/routes/documentation/documentation-route.tsx`  
`ui/src/features/documentation/use-documentation-view-model.ts`  
`ui/src/routes/workstreams/workstreams-route.tsx`  
`ui/src/features/workstreams/use-workstreams-view-model.ts`

**Files Expected To Change**  
`ui/src/routes/documentation/documentation-route.tsx`  
`ui/src/features/documentation/use-documentation-view-model.ts`  
`ui/src/routes/workstreams/workstreams-route.tsx`  
`ui/src/features/workstreams/use-workstreams-view-model.ts`  
Potentially small shared layout/test files.

**Validation**  
Run:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test -- ui/src/test/phase3-destinations.test.tsx
rtk npm run test
```

Success means both destinations still mount correctly, `Documentation` stays a tree + viewer, `Workstreams` stays a filter bar + table, and the extra side rails/internal narration are gone.

**Plan / Docs To Update**  
Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.

**Deliverables**  
- simple doc tree + document viewer surface,
- simple workstreams filter bar + clickable table,
- no board-external hero/aside/right-rail patterns on either destination,
- destination-specific rendering moved out of the route files into clearer feature surfaces where needed.

**Commit Expectation**  
`Simplify documentation and workstreams scaffolds`

**Known Constraints / Baseline Failures**  
Rows should route into the existing task-detail route shape, but this phase should not redesign task detail or add live project-wide filtering. Keep hooks from growing into broader mixed “UI state + data shaping + rendering contract” bundles if small separations are practical while touching the files.

**Status**  
Not started.

**Completion Notes**  
None yet.

**Next Starter Context**  
The main decision is already made: remove the meta-viewer and extra sidebars. Keep only the tree/viewer and filter/table shapes that the boards show.

## Phase 4: Realign New Project and Project Settings

### Phase Handoff

**Goal**  
Make `New project` and `Project settings` match the ASCII project-configuration boards as a plain component scaffold.

**Scope Boundary**  
In scope: project-configuration shared layout, tab presentation, tab content rendering, placeholder field/list primitives, component type picker presentation, and the structural refactor needed to reduce the current mode-driven monolith.  
Out of scope: live create/update submission, project API wiring, selected-project provider work, or any changes to the separate live-wiring plan.

**Read First**  
`design/workspace-spec.md`  
`ui/src/routes/projects/project-configuration-layout.tsx`  
`ui/src/routes/projects/project-configuration-tab-route.tsx`  
`ui/src/shared/layout/project-configuration-scaffold.tsx`  
`ui/src/shared/forms/placeholder-field.tsx`  
`ui/src/shared/forms/placeholder-list-field.tsx`  
`ui/src/shared/forms/component-type-picker.tsx`  
`ui/src/features/projects/project-configuration-scaffold.ts`  
`ui/src/features/projects/use-project-configuration-view-model.ts`

**Files Expected To Change**  
`ui/src/routes/projects/project-configuration-tab-route.tsx`  
`ui/src/shared/layout/project-configuration-scaffold.tsx`  
`ui/src/shared/forms/placeholder-field.tsx`  
`ui/src/shared/forms/placeholder-list-field.tsx`  
`ui/src/shared/forms/component-type-picker.tsx`  
`ui/src/features/projects/use-project-configuration-view-model.ts`  
Potentially `ui/src/features/projects/project-configuration-scaffold.ts` and related tests.

**Validation**  
Run:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test -- ui/src/test/phase3-destinations.test.tsx
rtk npm run test
```

Success means the project-configuration routes still render all required tabs, use semantic form controls, and no longer include hero/aside/right-sidebar scaffold narration.

**Plan / Docs To Update**  
Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.

**Deliverables**  
- one main project-configuration panel per board,
- tabbed configuration scaffold with semantic controls,
- no board-external right sidebar or API/deferred-work narration,
- a scaffold that the live-wiring plan can later fill in without redoing layout,
- clearer tab-specific and mode-specific module boundaries so later live wiring does not deepen the current `mode` branching hotspot.

**Commit Expectation**  
`Reset project configuration scaffold to board layout`

**Known Constraints / Baseline Failures**  
Do not expand this phase into actual project CRUD wiring. Preserve the route family and tab ids so the separate live-wiring plan can reuse them. Prefer explicit tab modules and route-level composition over pushing more branching into one route file or one broad view-model hook.

**Status**  
Not started.

**Completion Notes**  
None yet.

**Next Starter Context**  
This phase should leave the structure clearly ready for the live-wiring plan, but it should not start that live-wiring work itself.

## Phase 5: Update tests, docs, and corrective notes

### Phase Handoff

**Goal**  
Finish the corrective pass by aligning tests and docs with the corrected scaffold and recording the dependency this creates for later UI plans.

**Scope Boundary**  
In scope: UI tests, README and developer-doc updates if needed, `.ultrakit/notes.md`, and this plan’s living sections.  
Out of scope: new feature implementation, live wiring, or unrelated active plans beyond small cross-references that this corrective plan should precede them.

**Read First**  
`README.md`  
`.ultrakit/developer-docs/m1-architecture.md`  
`.ultrakit/developer-docs/m1-local-runbook.md`  
`.ultrakit/notes.md`  
`ui/src/test/`  
This plan file

**Files Expected To Change**  
`README.md`  
`.ultrakit/developer-docs/m1-architecture.md`  
`.ultrakit/developer-docs/m1-local-runbook.md`  
`.ultrakit/notes.md`  
`ui/src/test/app-shell.test.tsx`  
`ui/src/test/runs-routes.test.tsx`  
`ui/src/test/phase3-destinations.test.tsx`  
This plan file  
Potentially `.ultrakit/exec-plans/active/index.md` if plan status changes materially during closeout.

**Validation**  
Run:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

Success means the full baseline still holds, the tests now assert corrected scaffold structure instead of scaffold-phase copy, and the docs describe the scaffold as intentionally minimal.

**Plan / Docs To Update**  
Update all living sections in this plan. Update repo docs and notes as needed. If the plan completes, archive it according to the plan contract.

**Deliverables**  
- corrected tests,
- updated docs/notes,
- final plan state ready for approval-to-execute flow or, later, for archival after execution.

**Commit Expectation**  
`Document corrected ASCII-first UI scaffold`

**Known Constraints / Baseline Failures**  
`npm run build` still requires a host rerun on this machine after the expected sandbox Wrangler/Docker write failure.

**Status**  
Not started.

**Completion Notes**  
None yet.

**Next Starter Context**  
When this phase starts, the corrective UI changes should already be in place. The test suite and docs need to stop reinforcing the old scaffold narration and start reflecting the corrected minimal scaffold.
