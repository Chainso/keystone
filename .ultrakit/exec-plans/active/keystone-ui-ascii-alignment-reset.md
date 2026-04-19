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

- **Date:** 2026-04-18  
  **Phase:** Phase 1 fix pass  
  **Decision:** Close the remaining shell review finding with test-only route-target assertions instead of reopening the shell implementation.  
  **Rationale:** The important gap was coverage, not behavior. The shared shell already sourced its destinations correctly, so the smallest truthful fix was to assert the actual `href` targets for sidebar destinations and project-action links.

- **Date:** 2026-04-18  
  **Phase:** Phase 2  
  **Decision:** Move run-only workspace components under `features/` and collapse the `Runs` surfaces to the plain board structures from the ASCII spec.  
  **Rationale:** The visible drift and the layer-boundary drift were the same problem. Rewriting the `Runs` surfaces without moving those modules out of `shared` would have preserved the wrong ownership while the files were already open.

- **Date:** 2026-04-18  
  **Phase:** Phase 2 targeted fix pass  
  **Decision:** Realign the remaining `Runs` scaffold literals and plan references with the canonical ASCII board instead of treating the initial Phase 2 landing as final.  
  **Rationale:** The Phase 2 component move landed, but `run-102`, one execution-plan chat line, the execution legend, and the active-plan file references still reflected review drift rather than the canonical board text and current feature-owned locations.

- **Date:** 2026-04-18  
  **Phase:** Phase 3  
  **Decision:** Move `Documentation` and `Workstreams` rendering into feature-owned surfaces and trim their view models back to board-shaped data only.  
  **Rationale:** Both destinations had route files acting as page implementations and view-model hooks carrying the extra explainer copy that drifted away from the ASCII boards. Extracting feature surfaces corrected both problems without changing the route tree.

- **Date:** 2026-04-18  
  **Phase:** Phase 3 targeted fix pass  
  **Decision:** Correct the remaining `Documentation`/`Workstreams` review drift in seed data, row interaction, test coverage, and active-plan ownership references instead of reopening the Phase 3 surface extraction.  
  **Rationale:** The feature-owned destination move landed, but the workstreams table rows no longer matched the canonical board, the board still exposed a duplicated row-navigation contract, and the active plan still pointed readers at route files instead of the feature-owned workspace/scaffold modules that actually own those surfaces now.

## Progress

- [x] 2026-04-18 Discovery completed through direct review of `design/workspace-spec.md`, the current UI implementation, and five parallel frame-specific audits.
- [x] 2026-04-18 Baseline validation recorded: `npm run lint`, `npm run typecheck`, and `npm run test` passed in the sandbox; `npm run build` failed in the sandbox only on Wrangler/Docker home-directory writes and then passed outside the sandbox.
- [x] 2026-04-18 Corrective execution plan created and registered in `.ultrakit/exec-plans/active/index.md`.
- [x] 2026-04-18 User approval recorded and execution started.
- [x] 2026-04-18 Phase 1: Reset the shared shell and base styling to a minimal ASCII-faithful scaffold.
- [x] 2026-04-18 Phase 1 fix pass: strengthened shell route-target coverage for `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings`.
- [x] 2026-04-18 Phase 2: Realign the `Runs` family to the index / planning panes / execution / task-detail boards.
- [x] 2026-04-18 Phase 2 targeted fix pass: aligned `run-102` with the canonical `Execution` stage, restored the reviewed ASCII copy drift, and corrected the active-plan `Runs`/`Execution` file references to the feature-owned component locations that actually landed.
- [x] 2026-04-18 Phase 3: Realigned `Documentation` and `Workstreams` to their canonical tree/viewer and filter/table boards, and restored thin route containers through feature-owned destination surfaces.
- [x] 2026-04-18 Phase 3 targeted fix pass: restored the canonical `Workstreams` rows, removed the duplicated row-vs-link navigation contract, strengthened Phase 3 destination coverage, and corrected the active-plan `Documentation`/`Workstreams` ownership references to the feature-owned modules that actually landed.
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
- The only post-implementation Phase 1 review finding was a shell test-coverage gap. The shell implementation itself already used the expected route definitions, so the corrective pass stayed test-only.
- The `Runs` boundary correction was lower-risk than expected because the route modules were already thin containers. Most of the Phase 2 structural change came from moving the workspace components under `features/` and deleting run-only copy/data fields from the scaffold models.
- The Phase 2 workspace move was correct, but the plan text and one seeded run still lagged behind it. The targeted fix pass had to reconcile stale `shared/layout` references in the active plan and a `run-102` default redirect that still pointed at `execution-plan`.
- Phase 3 did not need any new shared layout primitive after the shell reset. Feature-owned destination components plus smaller scaffold-data modules were enough to restore both board fidelity and route-container boundaries.
- The Phase 3 surface move was correct, but the `Workstreams` seed drifted from the canonical board in all four visible rows, not just the blocked one. The targeted fix pass had to reconcile those literals, remove the row-level pseudo-control that survived the extraction, and update the plan text so it pointed at the feature-owned workspace/scaffold modules rather than the now-thin route containers.

## Outcomes & Retrospective

Planning outcome on 2026-04-18:

- The corrective scope is now concrete: keep the route skeleton, strip the internal narration, remove the extra surfaces, and collapse the visual treatment to plain scaffold components.
- The plan breaks cleanly into one shared-shell foundation phase, three surface-alignment phases, and one closeout phase.
- If this plan lands cleanly, later UI plans can wire behavior into a faithful scaffold instead of preserving today’s misaligned presentation.

Phase 1 outcome on 2026-04-18:

- The global shell now reads as a sparse project workspace: terse project context, icon-only project actions, primary navigation labels only, and no shell footnote or summary copy.
- The shared stylesheet now uses neutral border-and-panel primitives that keep the existing route tree renderable without the old gradients, shadows, or branded chrome.
- The shell test now asserts the actual targets for `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings`, so a miswired shared-shell destination will fail Phase 1 validation.
- Phase 2 can now focus on run-surface structure and ownership boundaries without also carrying shell-level cleanup.

Phase 2 outcome on 2026-04-18:

- The `Runs` index now renders as a plain heading-plus-table board with the existing route targets intact and no explainer sidebar or scaffold narration.
- The run detail shell now shows only the run heading, the phase stepper, and the active board content; the old coverage/status aside is gone.
- Specification, architecture, and execution-plan phases now render as direct chat-plus-document splits with semantic composer textareas and document content that matches the canonical board.
- Execution now defaults to a graph-first DAG placeholder with clickable task nodes, and task detail is reduced to the conversation-plus-review split from the board.
- Run-specific workspace components no longer live under `ui/src/shared/layout/`; they now sit under `features/runs/components/` and `features/execution/components/`, leaving the shared layer to generic primitives.

Phase 2 targeted fix pass outcome on 2026-04-18:

- `run-102` now matches the canonical `Runs` board row and redirects into `Execution` by default instead of reopening the execution-plan pane.
- The execution-plan chat copy and execution legend now match the exact ASCII board text where the review flagged literal drift.
- The active plan’s `Runs` context and Phase 2 handoff now point at the feature-owned workspace components that actually landed, so later phases do not chase deleted `ui/src/shared/layout/*` files.

Phase 3 outcome on 2026-04-18:

- `Documentation` now renders as a plain project-documentation heading plus the board-shaped tree/viewer split, with the old phase badge, honesty aside, group summaries, and backend/deferred sections removed.
- `Workstreams` now renders as a plain heading, `Filters:` bar, and clickable task table, with the prior explainer right rail, row notes, and scaffold narration removed.
- Both route files are thin containers again: destination rendering moved into `ui/src/features/documentation/components/` and `ui/src/features/workstreams/components/`, and the hooks now focus on local selection/filter state over smaller scaffold-data modules.
- Phase 3 validation passed: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm run test -- ui/src/test/phase3-destinations.test.tsx` (`4` tests passed), and `rtk npm run test` (`33` files passed, `2` skipped; `143` tests passed, `8` skipped).

Phase 3 targeted fix pass outcome on 2026-04-18:

- The visible `Workstreams` table rows now match the canonical board values for task id, title, run, status, and updated timestamp, including the restored blocked `TASK-019` row in `Run-101`.
- `Workstreams` no longer treats each table row as a focusable pseudo-control wrapped around a nested link; the task link is now the single row-level navigation contract.
- [ui/src/test/phase3-destinations.test.tsx](../../../ui/src/test/phase3-destinations.test.tsx) now checks the documentation tree shape and selection state plus all `Workstreams` filter views against the canonical row content, so obvious group/selection and board-literal regressions fail quickly.
- The active plan context and Phase 3 handoff now point readers at the feature-owned documentation/workstreams workspace and scaffold modules instead of implying the route files are still the main surface owners.

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
  - [ui/src/features/runs/components/run-detail-scaffold.tsx](../../../ui/src/features/runs/components/run-detail-scaffold.tsx)
  - [ui/src/features/runs/components/run-phase-stepper.tsx](../../../ui/src/features/runs/components/run-phase-stepper.tsx)
  - [ui/src/features/runs/components/planning-workspace.tsx](../../../ui/src/features/runs/components/planning-workspace.tsx)
  - [ui/src/features/execution/components/execution-workspace.tsx](../../../ui/src/features/execution/components/execution-workspace.tsx)
  - [ui/src/features/execution/components/task-detail-workspace.tsx](../../../ui/src/features/execution/components/task-detail-workspace.tsx)
  - [ui/src/features/runs/run-scaffold.ts](../../../ui/src/features/runs/run-scaffold.ts)
  - [ui/src/features/runs/use-run-view-model.ts](../../../ui/src/features/runs/use-run-view-model.ts)
  - [ui/src/features/execution/use-execution-view-model.ts](../../../ui/src/features/execution/use-execution-view-model.ts)
  - The React audit originally flagged these run-specific workspace layouts when they lived under `shared`. Phase 2 moved them under feature ownership; later work should keep run-only surfaces out of the shared layer.
- The `Documentation` surface lives in:
  - [ui/src/features/documentation/components/documentation-workspace.tsx](../../../ui/src/features/documentation/components/documentation-workspace.tsx)
  - [ui/src/features/documentation/documentation-scaffold.ts](../../../ui/src/features/documentation/documentation-scaffold.ts)
  - [ui/src/features/documentation/use-documentation-view-model.ts](../../../ui/src/features/documentation/use-documentation-view-model.ts)
  - [ui/src/routes/documentation/documentation-route.tsx](../../../ui/src/routes/documentation/documentation-route.tsx) now stays as the thin route container over those feature-owned modules.
- The `Workstreams` surface lives in:
  - [ui/src/features/workstreams/components/workstreams-board.tsx](../../../ui/src/features/workstreams/components/workstreams-board.tsx)
  - [ui/src/features/workstreams/workstreams-scaffold.ts](../../../ui/src/features/workstreams/workstreams-scaffold.ts)
  - [ui/src/features/workstreams/use-workstreams-view-model.ts](../../../ui/src/features/workstreams/use-workstreams-view-model.ts)
  - [ui/src/routes/workstreams/workstreams-route.tsx](../../../ui/src/routes/workstreams/workstreams-route.tsx) now stays as the thin route container over those feature-owned modules.
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
- Documentation layout/data: [ui/src/features/documentation/components/documentation-workspace.tsx](../../../ui/src/features/documentation/components/documentation-workspace.tsx), [ui/src/features/documentation/documentation-scaffold.ts](../../../ui/src/features/documentation/documentation-scaffold.ts), [ui/src/features/documentation/use-documentation-view-model.ts](../../../ui/src/features/documentation/use-documentation-view-model.ts), [ui/src/routes/documentation/documentation-route.tsx](../../../ui/src/routes/documentation/documentation-route.tsx)
- Workstreams layout/data: [ui/src/features/workstreams/components/workstreams-board.tsx](../../../ui/src/features/workstreams/components/workstreams-board.tsx), [ui/src/features/workstreams/workstreams-scaffold.ts](../../../ui/src/features/workstreams/workstreams-scaffold.ts), [ui/src/features/workstreams/use-workstreams-view-model.ts](../../../ui/src/features/workstreams/use-workstreams-view-model.ts), [ui/src/routes/workstreams/workstreams-route.tsx](../../../ui/src/routes/workstreams/workstreams-route.tsx)
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
`ui/src/test/app-shell.test.tsx`  
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
Completed on 2026-04-18. Targeted fix pass completed on 2026-04-18.

**Completion Notes**  
- Removed navigation summaries, scaffold footnote copy, and the `UI structure scaffold placeholder` project text from the shared shell.
- Simplified shared navigation and project-context data structures so the shell only carries project identity, route labels, and project-action glyphs.
- Replaced `ui/src/app/styles.css` with a neutral scaffold stylesheet that still covers the current route-family markup used outside this phase.
- Strengthened [ui/src/test/app-shell.test.tsx](../../../ui/src/test/app-shell.test.tsx) so the shell test asserts the actual `href` targets for `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings` on both the default redirect path and direct destination mounts.
- Validation passed for the implementation and the targeted fix pass: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm run test -- ui/src/test/app-shell.test.tsx`, and `rtk npm run test`.

**Next Starter Context**  
Phase 2 should treat the shell reset as complete. The remaining shell review gap is closed in test coverage, and the next work should focus only on the `Runs` family’s rendered structure and ownership boundaries.

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
`ui/src/features/runs/components/run-detail-scaffold.tsx`  
`ui/src/features/runs/components/run-phase-stepper.tsx`  
`ui/src/features/runs/components/planning-workspace.tsx`  
`ui/src/features/execution/components/execution-workspace.tsx`  
`ui/src/features/execution/components/task-detail-workspace.tsx`  
`ui/src/features/runs/run-scaffold.ts`  
`ui/src/features/runs/use-run-view-model.ts`  
`ui/src/features/runs/use-runs-index-view-model.ts`  
`ui/src/features/execution/use-execution-view-model.ts`

**Files Expected To Change**  
`ui/src/routes/runs/runs-index-route.tsx`  
`ui/src/features/runs/components/run-detail-scaffold.tsx`  
`ui/src/features/runs/components/run-phase-stepper.tsx`  
`ui/src/features/runs/components/planning-workspace.tsx`  
`ui/src/features/execution/components/execution-workspace.tsx`  
`ui/src/features/execution/components/task-detail-workspace.tsx`  
`ui/src/features/runs/run-scaffold.ts`  
`ui/src/features/runs/use-run-view-model.ts`  
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
Completed on 2026-04-18. Targeted fix pass completed on 2026-04-18.

**Completion Notes**  
- Replaced the `Runs` index hero/aside layout with a plain table board and kept the existing `/runs/:runId` route targets intact.
- Simplified the run detail shell and phase stepper to board-like labels only, removing the prior coverage, deferred-work, and scaffold-status copy.
- Rewrote the planning panes, execution DAG surface, and task-detail split around feature-owned components with lighter scaffold data and no raw API/backlog narration.
- Moved run-only workspace components out of `ui/src/shared/layout/` into `ui/src/features/runs/components/` and `ui/src/features/execution/components/`.
- Targeted fix pass: aligned `run-102` with the canonical `Execution` stage, restored `user: include scaffold spike` in the execution-plan chat, and corrected the execution legend to `running = highlighted   queued = dim   done = solid`.
- Targeted fix pass: updated the active plan context and Phase 2 handoff to reference the feature-owned run and execution components that actually landed.
- Updated [ui/src/test/runs-routes.test.tsx](../../../ui/src/test/runs-routes.test.tsx) to assert the new board structure and the absence of the old `Runs` explainer copy.
- Validation passed for the implementation and the targeted fix pass: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm run test -- ui/src/test/runs-routes.test.tsx` (`9` tests passed), and `rtk npm run test` (`33` files passed, `2` skipped; `143` tests passed, `8` skipped).

**Next Starter Context**  
Phase 3 should leave the `Runs` family alone unless a shared primitive regression is discovered. The targeted fix pass closed the remaining Phase 2 scaffold drift, so the next work should focus on making `Documentation` and `Workstreams` match their boards without reintroducing route-as-feature or explainer-sidebar patterns.

## Phase 3: Realign Documentation and Workstreams

### Phase Handoff

**Goal**  
Reduce `Documentation` and `Workstreams` to the exact board-shaped scaffolds the spec calls for.

**Scope Boundary**  
In scope: the feature-owned `Documentation` and `Workstreams` workspace/scaffold/view-model modules, any shared table/panel primitives they need after the shell reset, and the thin route-container updates needed to keep destination rendering out of the route files.  
Out of scope: `Runs`, project configuration, and live document/workstream adapters.

**Read First**  
`design/workspace-spec.md`  
`ui/src/features/documentation/components/documentation-workspace.tsx`  
`ui/src/features/documentation/documentation-scaffold.ts`  
`ui/src/features/documentation/use-documentation-view-model.ts`  
`ui/src/features/workstreams/components/workstreams-board.tsx`  
`ui/src/features/workstreams/workstreams-scaffold.ts`  
`ui/src/features/workstreams/use-workstreams-view-model.ts`

**Files Expected To Change**  
`ui/src/features/documentation/components/documentation-workspace.tsx`  
`ui/src/features/documentation/documentation-scaffold.ts`  
`ui/src/features/documentation/use-documentation-view-model.ts`  
`ui/src/features/workstreams/components/workstreams-board.tsx`  
`ui/src/features/workstreams/workstreams-scaffold.ts`  
`ui/src/features/workstreams/use-workstreams-view-model.ts`  
Potentially the thin route containers plus small shared layout/test files.

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
`Correct phase 3 scaffold fidelity`

**Known Constraints / Baseline Failures**  
Rows should route into the existing task-detail route shape, but this phase should not redesign task detail or add live project-wide filtering. Keep hooks from growing into broader mixed “UI state + data shaping + rendering contract” bundles if small separations are practical while touching the files.

**Status**  
Completed on 2026-04-18. Targeted fix pass completed on 2026-04-18.

**Completion Notes**  
- Reduced [ui/src/routes/documentation/documentation-route.tsx](../../../ui/src/routes/documentation/documentation-route.tsx) to a route container and moved the destination rendering into [ui/src/features/documentation/components/documentation-workspace.tsx](../../../ui/src/features/documentation/components/documentation-workspace.tsx) with tree/viewer-only scaffold content from [ui/src/features/documentation/documentation-scaffold.ts](../../../ui/src/features/documentation/documentation-scaffold.ts).
- Reduced [ui/src/routes/workstreams/workstreams-route.tsx](../../../ui/src/routes/workstreams/workstreams-route.tsx) to a route container and moved the destination rendering into [ui/src/features/workstreams/components/workstreams-board.tsx](../../../ui/src/features/workstreams/components/workstreams-board.tsx) with filter/table-only scaffold content from [ui/src/features/workstreams/workstreams-scaffold.ts](../../../ui/src/features/workstreams/workstreams-scaffold.ts).
- Trimmed both view-model hooks to local selection/filter state plus board-shaped data, removing the prior backend-gap, deferred-work, and route-handoff copy.
- Updated [ui/src/test/phase3-destinations.test.tsx](../../../ui/src/test/phase3-destinations.test.tsx) to assert the tree/viewer and filter/table structures plus the absence of the removed scaffold chrome.
- Targeted fix pass: realigned [ui/src/features/workstreams/workstreams-scaffold.ts](../../../ui/src/features/workstreams/workstreams-scaffold.ts) with the canonical `Workstreams` board rows, including the restored blocked `TASK-019` entry in `Run-101`.
- Targeted fix pass: simplified [ui/src/features/workstreams/components/workstreams-board.tsx](../../../ui/src/features/workstreams/components/workstreams-board.tsx) to a single link-based navigation contract instead of a focusable row plus nested `Link`.
- Targeted fix pass: strengthened [ui/src/test/phase3-destinations.test.tsx](../../../ui/src/test/phase3-destinations.test.tsx) to cover the canonical workstreams rows and filter states plus the documentation tree shape and selection state.
- Targeted fix pass: updated the active-plan context and Phase 3 handoff to reference the feature-owned documentation/workstreams workspace and scaffold modules instead of centering the route containers.
- Validation passed for the implementation and the targeted fix pass: `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm run test -- ui/src/test/phase3-destinations.test.tsx` (`4` tests passed), and `rtk npm run test` (`33` files passed, `2` skipped; `143` tests passed, `8` skipped).

**Next Starter Context**  
Phase 4 should leave `Documentation` and `Workstreams` alone unless a shared primitive regression is discovered. The targeted fix pass closed the remaining Phase 3 board-fidelity, navigation-contract, test-coverage, and ownership-reference drift, so the remaining corrective work is the project-configuration family behind the shared route layout.

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
