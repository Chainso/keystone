# Keystone UI Composition And Bug Fixes

## Purpose / Big Picture

This plan improves the operator UI in two ways at once: it fixes the current interaction and test-harness bugs that make the UI harder to trust, and it reshapes the component hierarchy so the UI is easier to evolve without duplicating logic across destinations.

After this work lands, operators should be able to rely on the current shell interactions and navigation state more confidently: the project switcher should behave like a real control, planning edits should not disappear silently, project documentation and workstream views should restore state from the URL, and the UI test surface should run deterministically enough to validate those behaviors. Internally, the project-configuration surface and run-planning surface should have clearer ownership boundaries so future work does not require editing multiple nearly-identical components and hooks for the same product behavior.

## Backward Compatibility

Backward compatibility is required for the shipped product structure and current route vocabulary.

Required compatibility constraints:

- preserve the current top-level destinations and paths: `/runs`, `/documentation`, `/workstreams`, `/projects/new`, and `/settings`,
- preserve the current run stepper concepts and labels: `Specification`, `Architecture`, `Execution Plan`, and `Execution`,
- preserve the current project-selection persistence key `keystone.ui.current-project.v1`,
- preserve the current browser API seams in `project-management-api.ts` and `run-management-api.ts`,
- preserve the current app shell posture from `design/workspace-spec.md` and `design/design-guidelines.md`.

Allowed internal change:

- component ownership, provider boundaries, hook layout, test harness structure, and `shared/` vs `features/` placement may change,
- internal view-model shapes may change if all call sites move together,
- route files may become more generic as long as the route tree and user-visible destination model stay intact.

## Design Decisions

1. **Date:** 2026-04-21  
   **Decision:** Start with a dedicated UI validation foundation phase before touching the larger composition refactors.  
   **Rationale:** The current UI test baseline is already broken in ways that would make a refactor hard to verify. The broad `npm test` run on 2026-04-21 failed with 66 tests, including all UI suites, because the current UI environment is not stable enough to trust as a regression gate. Fixing that first reduces the risk of refactoring on a moving target.  
   **Alternatives considered:** refactor the component tree first and repair tests afterward; skip the UI test surface and rely only on manual inspection.

2. **Date:** 2026-04-21  
   **Decision:** Treat the current UI test setup as its own UI subsystem and give it an explicit browser-like contract, including a deterministic `localStorage` seam if the built-in environment remains unreliable.  
   **Rationale:** The current Vitest baseline uses `environment: "node"` globally in `vitest.config.ts`, while the UI tests also use per-file jsdom annotations and still fail with `window.localStorage.clear is not a function`. That means the UI harness is not a passive detail; it is an active part of the UI architecture that must be stabilized.  
   **Alternatives considered:** keep the current mixed setup and accept flaky UI tests; remove the `localStorage`-based tests instead of fixing the harness.

3. **Date:** 2026-04-21  
   **Decision:** Split user-facing bug fixes from composition refactors, but keep both in one active plan because the bug fixes and hierarchy cleanup touch the same feature seams.  
   **Rationale:** The bug-fix pass should land early because it improves current behavior and validation quality, but the larger composition cleanup still belongs in the same plan because it is the reason the current duplication and unclear ownership exist.  
   **Alternatives considered:** one monolithic refactor phase; two totally separate plans with duplicated discovery context.

4. **Date:** 2026-04-21  
   **Decision:** Rebuild the project-configuration surface around one feature-owned contract with explicit mode metadata, instead of keeping separate `new` and `settings` tab implementations and nearly-duplicated view-model mapping.  
   **Rationale:** The current project configuration hierarchy duplicates the same tab content and component mapping across `New project` and `Project settings`. The composition guidance favors explicit variants over boolean-heavy APIs, but the current code has gone one level too far in the other direction by duplicating whole trees. A single feature contract with explicit mode-aware actions keeps behavior distinct without duplicating most of the composition.  
   **Alternatives considered:** keep the current duplication; merge everything into one monolithic component with many mode conditionals.

5. **Date:** 2026-04-21  
   **Decision:** Keep the route tree thin and stable, but collapse trivial wrapper components and split `use-run-view-model.ts` into smaller concern-specific hooks and utilities.  
   **Rationale:** The current run routes already have the right general shape, but too much view-model logic lives in one file and some route-level workspace wrappers do nothing except pass props through. Splitting by concern improves composability without changing the run navigation model.  
   **Alternatives considered:** preserve the current file split unchanged; move more logic into route files.

6. **Date:** 2026-04-21  
   **Decision:** Treat destination selection state as URL state wherever the user can reasonably expect deep-linking or browser navigation support.  
   **Rationale:** Documentation selection and workstream filter/page state are currently local component state. For operator workflows, those controls are navigation state, not ephemeral rendering state. Putting them into the URL improves restoration, shareability, and route clarity.  
   **Alternatives considered:** keep state local and accept that browser navigation loses it.

7. **Date:** 2026-04-21  
   **Decision:** Keep `ui/src/shared/` genuinely generic and move project-specific components back under `ui/src/features/` unless they become truly reusable primitives.  
   **Rationale:** The current boundary leaks project-specific layout and picker components into `shared/`, which makes ownership harder to reason about. The repo guidance is explicit that feature logic and product-specific composition should stay under `features/`.  
   **Alternatives considered:** leave the current placement as-is; create more shared wrappers around project-specific behavior.

8. **Date:** 2026-04-21  
   **Decision:** Use targeted UI validation commands as the execution gate for this plan, while recording the current broad repo failures as baseline noise unless the work directly addresses them.  
   **Rationale:** On 2026-04-21, `npm run lint`, `npm test`, and `npm run typecheck` all failed for reasons outside this plan's scope, including backend/demo EPERM issues, unused-variable debt across backend files, and a worker typecheck mismatch. The plan still needs truthful validation, but it should use gates that correspond to the UI work being done.  
   **Alternatives considered:** require the full repo baseline to go green before any UI work; ignore broad baseline failures completely and record no evidence.

## Execution Log

- **Date:** 2026-04-21  
  **Phase:** Planning  
  **Decision:** Structure the work into five phases: UI test-harness foundation, user-facing bug fixes, project-configuration composition cleanup, runs/planning composition cleanup, and docs/final validation.  
  **Rationale:** This keeps each phase junior-engineer-sized and separates immediate correctness work from larger hierarchy changes.

- **Date:** 2026-04-21  
  **Phase:** Planning  
  **Decision:** Use targeted UI commands as the main validation path for execution phases, but record broad baseline results from `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` in this plan.  
  **Rationale:** The broad commands are currently too noisy to use as phase gates, but they are still valuable baseline evidence and should inform the final validation story.

- **Date:** 2026-04-21  
  **Phase:** Execution Start  
  **Decision:** Begin execution after explicit user approval and start with the planned Phase 1 UI harness stabilization pass.  
  **Rationale:** The active plan now has user approval, and the current UI validation instability is the first blocker for the rest of the refactor work.

- **Date:** 2026-04-21  
  **Phase:** Phase 2 Start  
  **Decision:** Advance to the navigation-and-state bug pass after closing Phase 1 with one targeted fix pass for brittle route-transition assertions.  
  **Rationale:** The UI harness gate is now credible enough to support user-facing bug work without carrying unresolved validation ambiguity forward.

- **Date:** 2026-04-21  
  **Phase:** Phase 3 Start  
  **Decision:** Advance to the project-configuration hierarchy cleanup after closing Phase 2 with one targeted fix pass for documentation hook safety and missing regression coverage.  
  **Rationale:** The highest-value current UI bugs are now closed, so the next safe step is to remove the duplicated project-configuration composition that blocks clearer ownership and reuse.

- **Date:** 2026-04-21  
  **Phase:** Phase 4 Start  
  **Decision:** Advance to the runs/planning composition cleanup after closing the project-configuration refactor with one targeted coverage fix pass.  
  **Rationale:** The project-configuration hierarchy is now unified enough to leave behind, so the next structural hotspot is the oversized run-planning seam and the remaining trivial planning wrappers.

- **Date:** 2026-04-21  
  **Phase:** Phase 4  
  **Decision:** Split the run composition seam into dedicated layout, planning, and compile hooks, move run/task status presentation into shared run helpers, and delete the specification/architecture pass-through workspace wrappers.  
  **Rationale:** `use-run-view-model.ts` was mixing route layout, planning editor state, compile gating, and display formatting in one seam, while execution components and status pills were still interpreting run state locally. Extracting those concerns into smaller feature-owned modules keeps routes thin, removes no-op wrappers, and makes status/date ownership explicit without changing the route tree or stepper model.

- **Date:** 2026-04-21  
  **Phase:** Phase 4 fix pass  
  **Decision:** Keep Phase 4 closed only after single-sourcing the planning order/default-phase seam and extending route coverage across blocked compile refresh, terminal compile messaging, and planning-save recovery.  
  **Rationale:** The initial refactor left `run-planning-config.ts` as a partial source of truth: the provider still hardcoded planning load order, the default route still hardcoded the fallback phase, and the new blocked/error branches in the extracted run hooks had not been executed end to end in tests.

- **Date:** 2026-04-21  
  **Phase:** Phase 3  
  **Decision:** Keep explicit `New project` and `Project settings` provider variants, but make them both implement one shared `ProjectConfigurationContext` contract so routes, view models, and tab components no longer branch on mode.  
  **Rationale:** The mode behavior still matters for labels, submit semantics, and settings loading state, but the surrounding shell and tab composition were duplicating nearly identical trees. A provider-injected `state/actions/meta` contract preserved the explicit modes without keeping parallel UI hierarchies.

- **Date:** 2026-04-21  
  **Phase:** Phase 3 fix pass  
  **Decision:** Keep Phase 3 closed only after the validation gate clicks the shared footer secondary action in both project-configuration modes and proves the settings draft-reset path end to end.  
  **Rationale:** The original Phase 3 tests checked footer labels and disabled states, but they never executed `Cancel` in `New project` mode or `Discard changes` in `Project settings`, so the unified composition model's explicit mode behavior was still unproven.

- **Date:** 2026-04-21  
  **Phase:** Phase 1  
  **Decision:** Split Vitest into explicit node and UI projects, add a repo-local browser storage setup file for UI suites, and include `worker-configuration.d.ts` in `tsconfig.ui.json` so the UI typecheck inherits the same generated Cloudflare types as the main workspace.  
  **Rationale:** The UI tests were failing before any assertions because the mixed environment setup did not provide a reliable `localStorage`, and the nominal UI typecheck was pulling root contract files without the generated Cloudflare declarations they already rely on in the main typecheck path.

- **Date:** 2026-04-21  
  **Phase:** Phase 1 fix pass  
  **Decision:** Keep Phase 1 closed only with a follow-up hardening pass that converts the remaining `runs-routes` transition assertions to awaited queries and re-runs the exact `npx` gate.  
  **Rationale:** The exact Phase 1 Vitest gate re-ran green in this worktree, but conflicting review evidence showed the recorded closeout was not yet credible. `ui/src/test/runs-routes.test.tsx` still had synchronous assertions against asynchronous route transitions at the previously cited failure points, so the plan needed both truthful rerun evidence and a durability fix.

- **Date:** 2026-04-21  
  **Phase:** Phase 2  
  **Decision:** Replace the custom project-switcher popup with a native project `<select>`, move documentation/workstreams state into search params, and add one shared unsaved-changes guard plus one shared UTC formatter instead of re-solving those behaviors per destination.  
  **Rationale:** The shell control was behaving like an incomplete custom widget, while documentation/workstreams state and run-planning protection were all variants of navigation and formatting problems. A small set of truthful shared seams fixed the shipped bugs without widening Phase 2 into a broader composition refactor.

- **Date:** 2026-04-21  
  **Phase:** Phase 2 fix pass  
  **Decision:** Keep Phase 2 closed only after stabilizing the documentation hook order and adding direct-mount URL-state plus pending-save guard coverage.  
  **Rationale:** `/documentation` stays mounted while the shell project selector changes projects, so the previous `useDocumentationViewModel` early returns could change hook order between scaffold-backed and compatibility renders. The original tests also proved click/back flows but not direct deep-link hydration or the in-flight save navigation path, so the phase needed a targeted fix pass and a full gate rerun to become credible.

## Progress

- [x] 2026-04-21 Installed workspace dependencies with `npm install`.
- [x] 2026-04-21 Ran broad baseline commands and recorded pre-existing failures plus current build behavior.
- [x] 2026-04-21 Reviewed the current UI composition seams, route ownership, and test harness constraints.
- [x] 2026-04-21 Drafted this execution plan and registered it as the active plan.
- [x] 2026-04-21 Received explicit approval to execute the plan.
- [x] 2026-04-21 Ran the one allowed Phase 1 fix pass, hardened the remaining `runs-routes` transition assertions, and revalidated the exact `npx` gate plus the standalone route suite.
- [x] Phase 1 complete: stabilize the UI test harness and targeted validation path, with fix-pass revalidation.
- [x] 2026-04-21 Completed the Phase 2 bug-fix pass with a native shell project selector, guarded run-planning edits, URL-backed documentation/workstreams state, duplicate-key cleanup, and shared UTC formatting.
- [x] 2026-04-21 Ran the one allowed Phase 2 fix pass, stabilized documentation hook order across mounted project switches, and added direct-mount URL-state plus pending-save guard coverage.
- [x] Phase 2 complete: ship the user-facing bug-fix pass for navigation state, accessibility, and data formatting, with fix-pass revalidation.
- [x] 2026-04-21 Completed the Phase 3 composition pass with a shared project-configuration context contract, one generic shell/tab composition path, and project-specific shell/type-picker ownership moved under `ui/src/features/projects/components/`.
- [x] 2026-04-21 Ran the one allowed Phase 3 fix pass, added direct route-level coverage for `Cancel` in `New project` mode and `Discard changes` in `Project settings`, and revalidated the exact Phase 3 gate.
- [x] Phase 3 complete: unify the project-configuration component hierarchy and provider contract, with fix-pass revalidation of the shared footer actions.
- [x] 2026-04-21 Completed the Phase 4 composition pass by turning `ui/src/features/runs/use-run-view-model.ts` into a thin barrel over dedicated layout, planning, and compile hooks, centralizing run/task status and activity helpers, and routing `Specification` / `Architecture` directly through the shared planning workspace frame.
- [x] 2026-04-21 Ran the one allowed Phase 4 fix pass, made `run-planning-config.ts` the shared order/default seam for the live run loader and default redirect, added `Refresh run`, terminal compile-message, and planning-save failure recovery coverage in `ui/src/test/runs-routes.test.tsx`, and revalidated the exact Phase 4 gate.
- [x] Phase 4 complete: simplify the runs/planning component hierarchy and supporting utilities, with fix-pass revalidation.
- [ ] Phase 5 complete: update durable docs/notes, rerun final validation, and prepare the plan for archival.

## Surprises & Discoveries

- `npm install` succeeded on 2026-04-21 and rewrote `package-lock.json` metadata in this worktree. That lockfile delta should be treated as installation fallout, not as part of the UI design decisions.
- The current broad `npm test` baseline on 2026-04-21 failed with 66 tests. The major UI-specific failures are:
  - all three UI suites fail with `window.localStorage.clear is not a function`,
  - `ui/src/test/runs-routes.test.tsx` also has at least one user-facing route assertion mismatch around the expected `Loading run` state,
  - `tests/scripts/demo-contracts.test.ts` fails with the previously documented `listen EPERM: operation not permitted 127.0.0.1`.
- The current broad `npm run lint` baseline on 2026-04-21 fails with 24 errors, almost all outside `ui/`; one in-scope UI lint failure already exists at `ui/src/features/runs/use-run-view-model.ts` for an unused `executionAvailable` binding.
- The current broad `npm run typecheck` baseline on 2026-04-21 fails in `tests/lib/db-client-worker.test.ts` because `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` is missing from the mocked worker bindings.
- Contrary to the current note in `.ultrakit/notes.md`, `npm run build` completed successfully inside this sandboxed worktree on 2026-04-21, including the Wrangler dry-run and Docker image export path. This needs one more deliberate revalidation during the docs phase before notes are updated.
- Running `npx vitest run ui/src/test/app-shell.test.tsx --environment jsdom` still produced the `window.localStorage.clear is not a function` failure. The test problem is not only the global `node` environment setting; the UI harness also lacks a stable storage implementation.
- The earlier `runs-routes` suspicion around a mismatched `Loading run` assertion turned out to be harness noise. Once the UI suites had a stable jsdom project and storage seam, the full targeted route suite passed without any user-facing route changes.
- The Phase 1 fix-pass rerun of the exact `npx vitest run ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx ui/src/test/resource-model-selectors.test.tsx ui/src/test/runs-routes.test.tsx` gate passed in this worktree before any new code change, so the reviewer-reported failure is not reproducible here as a persistent red baseline.
- The remaining credibility gap was still real: `ui/src/test/runs-routes.test.tsx` kept synchronous transition assertions at the previously cited materializing-workflow and run-switch points. Even with a green rerun, the Phase 1 closeout was still too timing-dependent to trust until those checks awaited the rendered state.
- `tsconfig.ui.json` was not actually UI-only in practice because the UI imports shared root contract modules. Without `worker-configuration.d.ts`, the command surfaced 82 root-file errors that do not appear in the main workspace typecheck because the generated Cloudflare declarations were missing from that config.
- In this repo, `rtk npx vitest ...` is not a truthful validation shorthand because RTK routes it through npm-script lookup and reports `Missing script: "vitest"`. Use direct `npx ...` commands or the RTK-native `rtk vitest` / `rtk lint` / `rtk tsc` wrappers instead.
- During Phase 2, deriving `page = 1` for a project switch was not enough on its own for `Workstreams`; the new project could still issue one stale page fetch before the URL reset landed. The final fix had to suppress task loading until the page-reset search-param update committed.
- During the Phase 2 fix pass, the documentation runtime issue was reproducible as a real mounted-route hazard: switching `/documentation` between a scaffold-backed project and a compatibility-only live project changes `useDocumentationViewModel` from returning a full tree to returning early, so every hook in that file has to stay above the compatibility returns.
- For Phase 3, the provider duplication was easier to remove than the route duplication: once both variants were typed against one shared `ProjectConfigurationValue`, the repeated view-model typing and tab trees collapsed cleanly without introducing a new reducer or store layer.
- The remaining Phase 3 credibility gap lived entirely in the tests, not the shared contract: `ui/src/test/destination-scaffolds.test.tsx` already had enough route harness to execute `Cancel` and `Discard changes` through the unified footer path without any extra provider or helper changes.
- `rtk proxy npx ...` works as a truthful way to honor the repo's RTK wrapper guidance while still running raw `npx vitest`, `npx eslint`, and `npx tsc` commands. The earlier failure is specific to `rtk npx ...`, not the proxy path.
- For Phase 4, the lowest-risk extraction path was to keep `ui/src/features/runs/use-run-view-model.ts` as a compatibility barrel and move the real logic into new concern-specific modules. The existing routes and components already depended on stable hook/type names, so the split did not require a route-tree rewrite.
- The only Phase 4 regression surfaced immediately in the targeted gate: the first helper version returned generic `label` / `tone` fields while the surrounding run and execution view models still expected `statusLabel` / `statusTone`. Aligning the helper contract and letting `StatusPill` accept an explicit tone resolved the failure without widening the phase.
- `runPlanningPhaseOrder` on its own was not enough to keep the live run seams aligned. The loader order and default-phase fallback were still duplicated until `run-planning-config.ts` also owned the reusable default-phase helper and record builder.

## Outcomes & Retrospective

Planning outcome on 2026-04-21:

- The work is best treated as one focused UI maintenance plan rather than a vague “cleanup” pass.
- The current UI hierarchy problems are concentrated in three seams:
  - project configuration duplicates component and view-model composition across `new` and `settings`,
  - run planning keeps too much state and formatting logic in one large hook file,
  - feature-specific composition has leaked into `shared/`.
- The bug-fix backlog is concrete enough to execute without further discovery:
  - project switcher accessibility and focus behavior,
  - unsaved-change protection in run planning,
  - URL-backed documentation/workstreams state,
  - duplicate React keys and manual UTC formatting cleanup,
  - UI test harness repair.

The main remaining open item before execution is user approval of the phase sequence and scope boundary.

Phase 2 outcome on 2026-04-21:

- The shell now uses a truthful native project selector instead of an incomplete custom popup, while preserving the existing project persistence key and destination paths.
- Documentation and workstreams now treat selection/filter/pagination as URL state, with fix-pass coverage for mounted documentation project switches plus direct deep-link hydration and canonicalization.
- Run-planning edits now warn on both in-app navigation and browser unload while dirty, and the fix pass now proves the same guard still blocks route changes while a save request is in flight.
- The touched run/workstream surfaces share one UTC formatter instead of repeating ad hoc timestamp logic.

Phase 3 outcome on 2026-04-21:

- `ui/src/features/projects/project-configuration-context.tsx` now defines one feature-owned `state/actions/meta` contract, and both explicit mode providers implement that contract instead of forcing the rest of the feature through separate hooks and component trees.
- The project-configuration routes now share one shell and one tab composition path; only the parent route still chooses between the explicit `new` and `settings` providers.
- Project-only UI composition no longer lives under `ui/src/shared/`: the shell frame and component-type picker now live under `ui/src/features/projects/components/`, and the resource-model selector probe now exercises the unified components hook directly.
- The fix pass now proves the shared footer actually runs the explicit mode behavior: `Cancel` leaves the `New project` flow for `/runs`, while `Discard changes` restores the loaded settings draft and leaves the browser-backed settings route unsaved.

Phase 4 outcome on 2026-04-21:

- `ui/src/features/runs/use-run-view-model.ts` is now a thin compatibility barrel over dedicated run-detail layout, planning-phase, and execution-plan compile hooks, so the main run seam no longer mixes route layout, editor state, compile gating, and formatting in one file.
- Run-related display interpretation is now centralized in `ui/src/features/runs/run-status.ts` plus explicit `statusTone` props on `StatusPill`, which lets the run detail header, runs index, execution DAG, and task detail all share one tone/label policy instead of reinterpreting status strings independently.
- `ui/src/features/runs/use-ready-run-detail.ts` and `ui/src/features/runs/run-execution-state.ts` now hold the common ready-provider and compile-availability logic that had been duplicated across run and execution hooks.
- The `Specification` and `Architecture` routes now render the shared planning workspace frame directly, so the deleted workspace wrappers no longer sit between thin routes and the real feature composition.
- The fix pass now keeps planning phase order, initial planning-document records, and the default incomplete-phase redirect on one shared `run-planning-config.ts` seam, so the provider load order and `/runs/:runId` fallback can no longer drift independently.
- `ui/src/test/runs-routes.test.tsx` now exercises the blocked `Refresh run` recovery path, terminal compile messaging, and planning-save failure rollback/retry, which closes the credibility gap around the new extracted run modules' recovery behavior.

## Context and Orientation

This repository serves a Cloudflare Worker plus React UI workspace. The current UI code lives under `ui/src/`.

Key files and seams for this plan:

- `ui/AGENTS.md`, `design/workspace-spec.md`, and `design/design-guidelines.md` are the UI architecture and product-model sources of truth.
- `ui/src/app/App.tsx`, `ui/src/app/app-providers.tsx`, and `ui/src/routes/router.tsx` define the top-level provider stack and route tree.
- `ui/src/shared/layout/app-shell.tsx` and `ui/src/shared/layout/shell-sidebar.tsx` own the persistent shell and project switcher.
- `ui/src/features/projects/project-context.tsx` owns current-project selection and scaffold compatibility.
- `ui/src/features/projects/{new-project-context.tsx,project-settings-context.tsx,use-project-configuration-view-model.ts}` plus `ui/src/features/projects/components/` own the project-configuration surface.
- `ui/src/shared/layout/project-configuration-scaffold.tsx` and `ui/src/shared/forms/component-type-picker.tsx` are currently “shared” even though they are project-specific.
- `ui/src/features/runs/use-run-view-model.ts` is now a compatibility barrel over `use-run-detail-view-model.ts`, `use-run-planning-phase-view-model.ts`, and `use-execution-plan-workspace-view-model.ts`.
- `ui/src/features/runs/components/` and `ui/src/features/execution/components/` render the run-planning, compile, execution, and task-detail surfaces.
- `ui/src/features/documentation/use-documentation-view-model.ts` and `ui/src/features/workstreams/use-workstreams-view-model.ts` currently keep selection/filter state locally instead of in the URL.
- `ui/src/shared/layout/status-pill.tsx` now accepts explicit tones, while `ui/src/features/runs/run-status.ts` owns the shared run/task status-label and activity formatting helpers.
- `ui/src/shared/forms/form-field.tsx` is the current form primitive layer and is too narrow for stronger input semantics.
- `vitest.config.ts` and `ui/src/test/{render-route.tsx,app-shell.test.tsx,destination-scaffolds.test.tsx,resource-model-selectors.test.tsx,runs-routes.test.tsx}` are the main validation entry points for this work.

There are no UI-specific developer docs under `.ultrakit/developer-docs/`; for this plan, the design docs above are the durable UI reference set.

## Plan of Work

Phase 1 creates a trustworthy UI validation foundation. Before any meaningful refactor, the UI tests need a stable browser-like environment with deterministic storage behavior and a clear targeted command set. This phase should also fix the existing in-scope UI lint issue and make the current targeted UI suites runnable enough to use as execution gates.

Phase 2 delivers the user-facing bug-fix pass. This includes the accessibility and behavior issues already identified in the shell and destination state: the project switcher should behave like a complete control, planning edits should gain navigation protection, documentation/workstreams state should move into the URL, and low-level correctness issues like duplicate keys and ad hoc UTC formatting should be cleaned up.

Phase 3 focuses on the project-configuration hierarchy. The current `New project` and `Project settings` surfaces duplicate both component trees and view-model mapping. This phase should replace that duplication with one feature-owned contract and one tab composition set, while keeping explicit mode semantics and preserving the route tree.

Phase 4 simplifies the runs/planning hierarchy. The current route shape is broadly correct, but `use-run-view-model.ts` is carrying too many concerns and some planning workspace components are trivial wrappers. This phase should extract smaller hooks/utilities, collapse the no-op wrappers, and centralize status/date logic where it belongs.

Phase 5 closes the plan with docs and validation. It should update any durable docs or notes affected by the real validation outcomes, especially the stale build note if the sandbox-pass result reproduces, then rerun the final commands and prepare the plan for execution review and archive readiness.

## Concrete Steps

Run all commands from `/home/chanzo/.codex/worktrees/2691/keystone-cloudflare`.

1. Baseline already collected during planning:

```bash
rtk npm install
rtk npm test
rtk npm run lint
rtk npm run typecheck
rtk npm run build
npx vitest run ui/src/test/app-shell.test.tsx --environment jsdom
```

2. Targeted UI validation command family to use during execution:

```bash
npx vitest run \
  ui/src/test/app-shell.test.tsx \
  ui/src/test/destination-scaffolds.test.tsx \
  ui/src/test/resource-model-selectors.test.tsx \
  ui/src/test/runs-routes.test.tsx

npx eslint \
  ui/src \
  vitest.config.ts

npx tsc --noEmit -p tsconfig.ui.json
```

3. Final whole-plan validation command set:

```bash
npx vitest run \
  ui/src/test/app-shell.test.tsx \
  ui/src/test/destination-scaffolds.test.tsx \
  ui/src/test/resource-model-selectors.test.tsx \
  ui/src/test/runs-routes.test.tsx

npx eslint \
  ui/src \
  vitest.config.ts

npx tsc --noEmit -p tsconfig.ui.json
rtk npm run build
```

Expected baseline summary before execution:

- `npm test` currently fails broadly; treat the documented UI and demo failures as baseline.
- `npm run lint` currently fails broadly; treat non-UI errors as baseline noise unless this plan intentionally fixes them.
- `npm run typecheck` currently fails in worker test scaffolding; treat that as baseline unless this plan intentionally changes the bindings contract.
- `npm run build` currently passes in this sandboxed worktree and should be revalidated at the end of the plan.

## Validation and Acceptance

This plan is accepted only when all of the following are true:

- targeted UI tests for shell, destinations, resource-model selectors, and runs routes pass,
- the project switcher behaves as a complete interactive control with keyboard and focus behavior or is replaced by a simpler truthful control,
- navigating away from edited planning documents no longer silently drops unsaved changes,
- documentation selection and workstreams filter/page state restore from the URL,
- the project-configuration surface no longer duplicates tab content and view-model mapping across `new` and `settings`,
- the run-planning composition no longer depends on one large mixed-responsibility view-model file and no-op wrapper components,
- `ui/src/shared/` no longer owns clearly project-specific composition,
- final `rtk npm run build` still passes,
- any durable docs or notes touched by the final validation story are updated to match reality.

Known pre-existing baseline failures that should not automatically block phase completion unless the phase targets them:

- `tests/scripts/demo-contracts.test.ts` EPERM listener failure,
- non-UI `eslint` failures outside `ui/`,
- non-UI `tsc` failure in `tests/lib/db-client-worker.test.ts`.

## Idempotence and Recovery

This work is safe to execute incrementally.

- If a phase stops halfway, keep the plan truthful before leaving the worktree.
- Re-run the targeted UI validation commands for the files touched in that phase before continuing.
- If a composition refactor becomes too broad for one phase, stop, update this plan, and split the remaining work rather than pushing through with an oversized implementation pass.
- If the final build result disagrees with the current planning baseline, record the exact command outcome in `Surprises & Discoveries` before changing any durable docs or notes.
- Do not “fix” broad backend lint/type/test debt opportunistically unless it directly blocks the UI work and is documented as an execution-phase decision.

## Artifacts and Notes

Planning baseline evidence from 2026-04-21:

- `npm install` succeeded and updated the local dependency tree.
- `npm test` failed with:
  - 66 failing tests total,
  - all major UI suites failing on `window.localStorage.clear is not a function`,
  - demo script tests failing with `listen EPERM`,
  - one run route assertion mismatch around `Loading run`.
- `npm run lint` failed with 24 errors; the in-scope UI one is `ui/src/features/runs/use-run-view-model.ts:272`.
- `npm run typecheck` failed in `tests/lib/db-client-worker.test.ts` because a required worker binding mock is missing.
- `npm run build` passed end to end in this worktree.
- `npx vitest run ui/src/test/app-shell.test.tsx --environment jsdom` still failed on `window.localStorage.clear is not a function`, confirming the UI harness needs explicit storage handling.

Phase 1 execution evidence from 2026-04-21:

- `npx vitest run ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx ui/src/test/resource-model-selectors.test.tsx ui/src/test/runs-routes.test.tsx` passed with 4 files and 87 tests.
- `npx eslint ui/src vitest.config.ts` passed.
- `npx tsc --noEmit -p tsconfig.ui.json` passed after adding `worker-configuration.d.ts` to the UI config include list.
- RTK-native equivalents `rtk vitest`, `rtk lint`, and `rtk tsc` also passed for the same Phase 1 surface.

Phase 1 fix-pass evidence from 2026-04-21:

- The exact required Vitest gate re-ran green in this worktree before the fix, but that result was not treated as sufficient closure because `ui/src/test/runs-routes.test.tsx` still used synchronous transition assertions at the previously reported failure points.
- The fix pass changed only those route-transition checks so the test now awaits `Execution is materializing`, the materializing explanation copy, and the transient `Loading run` heading during cross-run navigation.
- `npx vitest run ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx ui/src/test/resource-model-selectors.test.tsx ui/src/test/runs-routes.test.tsx` passed again with 4 files and 87 tests after the fix.
- `npx vitest run ui/src/test/runs-routes.test.tsx` passed with 1 file and 28 tests after the fix.
- `npx eslint ui/src vitest.config.ts` passed after the fix.
- `npx tsc --noEmit -p tsconfig.ui.json` passed after the fix.

Phase 3 execution evidence from 2026-04-21:

- `rtk proxy npx vitest run ui/src/test/destination-scaffolds.test.tsx ui/src/test/resource-model-selectors.test.tsx ui/src/test/app-shell.test.tsx` passed with 3 files and 63 tests.
- `rtk proxy npx eslint ui/src vitest.config.ts` passed.
- `rtk proxy npx tsc --noEmit -p tsconfig.ui.json` passed.

Phase 4 execution evidence from 2026-04-21:

- `rtk proxy npx vitest run ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx` passed with 2 files and 50 tests.
- `rtk proxy npx eslint ui/src vitest.config.ts` passed.
- `rtk proxy npx tsc --noEmit -p tsconfig.ui.json` passed.

## Interfaces and Dependencies

Important interfaces and seams that should still exist after this plan:

- `CurrentProjectProvider` should continue exposing a project-selection contract to the app shell and feature surfaces.
- `RunManagementApiProvider` and the browser run-management API seam should remain the source of live run/task/document data.
- The route tree in `ui/src/routes/router.tsx` should remain stable even if route elements become more generic.
- Shared form primitives should expose enough semantics for accessible browser inputs; if that requires broader props, they should grow rather than forcing feature code around them.
- Any new UI test setup should remain local to the repo and avoid introducing a heavyweight new test dependency unless the current toolchain cannot provide the required behavior cleanly.

## Phase 1: UI Test Harness Foundation

### Phase Handoff

- **Status:** Complete (implemented on 2026-04-21; fix pass revalidated on 2026-04-21)
- **Goal:** Make the targeted UI test surface deterministic enough to use as the validation gate for the rest of the plan.
- **Scope Boundary:** In scope: `vitest.config.ts`, UI test setup/helpers, targeted UI test fixes that are strictly about harness stability, and the existing in-scope UI lint issue. Out of scope: user-facing UI hierarchy refactors and product behavior changes beyond what is needed to make the test harness truthful.
- **Read First:**
  - `vitest.config.ts`
  - `ui/src/test/render-route.tsx`
  - `ui/src/test/app-shell.test.tsx`
  - `ui/src/test/destination-scaffolds.test.tsx`
  - `ui/src/test/resource-model-selectors.test.tsx`
  - `ui/src/test/runs-routes.test.tsx`
  - `ui/src/features/projects/project-context.tsx`
  - `ui/src/features/runs/use-run-view-model.ts`
- **Files Expected To Change:**
  - `vitest.config.ts`
  - `tsconfig.ui.json`
  - one or more files under `ui/src/test/`
  - `ui/src/features/runs/use-run-view-model.ts` if the unused binding remains after the harness cleanup
- **Validation:**
  - `npx vitest run ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx ui/src/test/resource-model-selectors.test.tsx ui/src/test/runs-routes.test.tsx`
  - `npx eslint ui/src vitest.config.ts`
  - `npx tsc --noEmit -p tsconfig.ui.json`
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Artifacts and Notes`, and this handoff.
- **Deliverables:** Stable targeted UI test environment, clear UI validation commands, and cleanup of the known in-scope UI lint blocker.
- **Commit Expectation:** `Stabilize UI test harness baseline`
- **Known Constraints / Baseline Failures:** Broad repo `npm test`, `npm run lint`, and `npm run typecheck` remain noisy and should not be treated as regressions unless this phase directly changes those failure sites.
- **Completion Notes:** `vitest.config.ts` now gives `tests/**` a node project and `ui/src/test/**` a jsdom project with a fixed `http://localhost/` origin plus repo-local setup. `ui/src/test/setup.ts` installs deterministic `localStorage` and `sessionStorage`, `render-route.tsx` no longer hides matcher setup as a side effect, `tsconfig.ui.json` now includes `worker-configuration.d.ts`, and the unused `executionAvailable` binding is removed from `ui/src/features/runs/use-run-view-model.ts`. The one allowed fix pass then hardened `ui/src/test/runs-routes.test.tsx` so the materializing-workflow and run-switch assertions await the transitional UI state instead of reading it synchronously.
- **Next Starter Context:** Phase 2 can treat the targeted UI command family above as the regression gate, but the credible Phase 1 closure is now `29001e6` plus this fix-pass follow-up, not the original commit in isolation. Do not reintroduce test-only browser setup into individual helpers, keep browser seams centralized in `ui/src/test/setup.ts`, preserve the current `npx` command forms unless RTK's `npx` routing behavior is fixed, and keep transition-state route assertions on awaited queries.

## Phase 2: Navigation And State Bug Fixes

### Phase Handoff

- **Status:** Complete (implemented on 2026-04-21; fix pass revalidated on 2026-04-21)
- **Goal:** Ship the highest-value current UI bug fixes for shell interaction, unsaved planning edits, and destination URL state.
- **Scope Boundary:** In scope: project-switcher behavior, planning unsaved-change guard, documentation selection URL state, workstreams filter/page URL state, duplicate key cleanup, and date-format cleanup for touched destinations. Out of scope: project-configuration hierarchy refactors and major run-planning structure changes.
- **Read First:**
  - `ui/src/shared/layout/shell-sidebar.tsx`
  - `ui/src/shared/layout/app-shell.tsx`
  - `ui/src/features/runs/use-run-view-model.ts`
  - `ui/src/features/documentation/use-documentation-view-model.ts`
  - `ui/src/features/documentation/components/documentation-workspace.tsx`
  - `ui/src/features/workstreams/use-workstreams-view-model.ts`
  - `ui/src/features/workstreams/components/workstreams-board.tsx`
  - `ui/src/test/app-shell.test.tsx`
  - `ui/src/test/destination-scaffolds.test.tsx`
  - `ui/src/test/runs-routes.test.tsx`
- **Files Expected To Change:**
  - `ui/src/shared/layout/shell-sidebar.tsx`
  - `ui/src/features/runs/use-run-view-model.ts`
  - `ui/src/features/documentation/use-documentation-view-model.ts`
  - `ui/src/features/documentation/components/documentation-workspace.tsx`
  - `ui/src/features/workstreams/use-workstreams-view-model.ts`
  - `ui/src/features/workstreams/components/workstreams-board.tsx`
  - any new shared URL-state or formatting utilities under `ui/src/`
  - related UI tests
- **Validation:**
  - `npx vitest run ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx ui/src/test/runs-routes.test.tsx`
  - `npx eslint ui/src vitest.config.ts`
  - `npx tsc --noEmit -p tsconfig.ui.json`
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this handoff.
- **Deliverables:** Accessible shell interaction improvements, URL-backed destination state, unsaved-change protection, and low-level rendering/data-format fixes.
- **Commit Expectation:** `Fix UI navigation and state bugs`
- **Known Constraints / Baseline Failures:** Preserve the current route tree and destination labels; do not redesign the shell or change top-level navigation semantics.
- **Completion Notes:** `ui/src/shared/layout/shell-sidebar.tsx` now uses a native `<select>` for project switching, so the shell keeps the same product posture without depending on a half-finished custom listbox. `ui/src/shared/navigation/use-unsaved-changes-guard.ts` protects dirty planning edits on route changes and `beforeunload`, `ui/src/features/documentation/use-documentation-view-model.ts` and `ui/src/features/workstreams/use-workstreams-view-model.ts` now back user-facing selection state with search params, `ui/src/shared/formatting/date.ts` centralizes the touched UTC formatting, and `ui/src/features/documentation/components/documentation-workspace.tsx` now keys document lines safely by index. The fix pass then moved the documentation canonicalization effect ahead of the compatibility returns so mounted project switches cannot change hook order, added direct-mount coverage for documentation/workstreams deep-link hydration and canonicalization, and added `ui/src/test/runs-routes.test.tsx` coverage for blocking navigation while a save request is still pending. The Phase 2 gate re-passed with `npx vitest run ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx ui/src/test/runs-routes.test.tsx`, `npx eslint ui/src vitest.config.ts`, and `npx tsc --noEmit -p tsconfig.ui.json`.
- **Next Starter Context:** Phase 3 should treat the native shell project selector as the new truthful contract and keep downstream tests on combobox semantics rather than reviving button/listbox assumptions. Preserve the new search-param contracts for `Documentation` and `Workstreams`, keep every hook in `ui/src/features/documentation/use-documentation-view-model.ts` above the compatibility returns, keep the shared unsaved-change/date utilities reusable instead of duplicating them inside project-configuration code, and do not fold this bug-fix work into broader route or destination redesign.

## Phase 3: Project Configuration Composition Cleanup

### Phase Handoff

- **Status:** Complete (implemented on 2026-04-21; fix pass revalidated on 2026-04-21)
- **Goal:** Replace the duplicated `new`/`settings` project-configuration hierarchy with one clearer feature-owned composition model.
- **Scope Boundary:** In scope: project-configuration providers, view models, feature components, and moving project-specific UI out of `shared/`. Out of scope: backend project API changes, route-path changes, or visual redesign.
- **Read First:**
  - `ui/src/routes/projects/project-configuration-layout.tsx`
  - `ui/src/routes/projects/project-configuration-tab-route.tsx`
  - `ui/src/features/projects/project-configuration-context.tsx`
  - `ui/src/features/projects/new-project-context.tsx`
  - `ui/src/features/projects/project-settings-context.tsx`
  - `ui/src/features/projects/use-project-configuration-view-model.ts`
  - `ui/src/features/projects/components/project-configuration-shell.tsx`
  - `ui/src/features/projects/components/project-configuration-tabs.tsx`
  - `ui/src/features/projects/components/project-component-type-picker.tsx`
  - `ui/src/features/projects/components/project-component-card.tsx`
  - `ui/src/test/destination-scaffolds.test.tsx`
  - `ui/src/test/resource-model-selectors.test.tsx`
- **Files Expected To Change:**
  - `ui/src/routes/projects/project-configuration-layout.tsx`
  - `ui/src/routes/projects/project-configuration-tab-route.tsx`
  - `ui/src/features/projects/project-configuration-context.tsx`
  - `ui/src/features/projects/new-project-context.tsx`
  - `ui/src/features/projects/project-settings-context.tsx`
  - `ui/src/features/projects/use-project-configuration-view-model.ts`
  - files under `ui/src/features/projects/components/`
  - project-specific files currently living under `ui/src/shared/`
  - related UI tests
- **Validation:**
  - `npx vitest run ui/src/test/destination-scaffolds.test.tsx ui/src/test/resource-model-selectors.test.tsx ui/src/test/app-shell.test.tsx`
  - `npx eslint ui/src vitest.config.ts`
  - `npx tsc --noEmit -p tsconfig.ui.json`
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this handoff.
- **Deliverables:** One project-configuration composition model with explicit mode behavior and cleaner feature/shared ownership.
- **Commit Expectation:** `Refactor project configuration composition`
- **Known Constraints / Baseline Failures:** Preserve explicit `New project` vs `Project settings` behavior and action semantics; do not replace them with a wizard flow.
- **Completion Notes:** `ui/src/features/projects/project-configuration-context.tsx` now gives both explicit provider variants one shared `state/actions/meta` contract with mode metadata, so the route layer no longer needs separate shell or tab trees for `new` versus `settings`. `ui/src/features/projects/use-project-configuration-view-model.ts` now builds one mode-aware view-model set, `ui/src/features/projects/components/project-configuration-tabs.tsx` now renders one tab composition path, and the route shell now branches only at the provider boundary. Project-specific shell and picker UI moved from `ui/src/shared/` into `ui/src/features/projects/components/`, and `ui/src/test/resource-model-selectors.test.tsx` now probes the unified components hook directly. The one allowed fix pass then added `ui/src/test/destination-scaffolds.test.tsx` coverage that clicks `Cancel` from the shared new-project footer after a tab switch and clicks `Discard changes` from project settings to restore the loaded draft without issuing a save. The Phase 3 gate then re-passed with `npx vitest run ui/src/test/destination-scaffolds.test.tsx ui/src/test/resource-model-selectors.test.tsx ui/src/test/app-shell.test.tsx`, `npx eslint ui/src vitest.config.ts`, and `npx tsc --noEmit -p tsconfig.ui.json`.
- **Next Starter Context:** Phase 4 should treat the new project-configuration provider boundary as settled: keep explicit mode behavior at the provider metadata layer and do not push project-specific shell/picker composition back into `ui/src/shared/`. The run-planning refactor can reuse the same pattern of thin routes plus feature-owned `state/actions/meta` contracts, but it should not reopen project route semantics, action labels, or the native project-selector work from Phase 2. If any future project-configuration change touches footer behavior, keep both shared-tab paths covered: `New project` must still navigate away on `Cancel`, and `Project settings` must still reset to the loaded draft on `Discard changes`.

## Phase 4: Runs And Planning Composition Cleanup

### Phase Handoff

- **Status:** Complete (implemented on 2026-04-21; fix pass revalidated on 2026-04-21)
- **Goal:** Simplify the run-planning and execution composition so ownership is clearer and the main view-model logic is split by concern.
- **Scope Boundary:** In scope: run detail layout/view-model files, planning workspace wrappers, shared run utilities, and status/date interpretation for run-related UI. Out of scope: backend run APIs, compile behavior changes, or execution graph product redesign.
- **Read First:**
  - `ui/src/routes/runs/{run-detail-layout,specification-route,architecture-route,execution-plan-route,execution-route,task-detail-route}.tsx`
  - `ui/src/features/runs/use-run-view-model.ts`
  - `ui/src/features/runs/components/{planning-workspace,specification-workspace,architecture-workspace,execution-plan-workspace,run-detail-scaffold,run-phase-stepper}.tsx`
  - `ui/src/features/execution/use-execution-view-model.ts`
  - `ui/src/shared/layout/status-pill.tsx`
  - `ui/src/test/runs-routes.test.tsx`
- **Files Expected To Change:**
  - route files under `ui/src/routes/runs/`
  - `ui/src/features/runs/use-run-view-model.ts` or its extracted replacements
  - files under `ui/src/features/runs/components/`
  - `ui/src/features/execution/use-execution-view-model.ts`
  - `ui/src/shared/layout/status-pill.tsx` or a replacement utility
  - related UI tests
- **Validation:**
  - `npx vitest run ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx`
  - `npx eslint ui/src vitest.config.ts`
  - `npx tsc --noEmit -p tsconfig.ui.json`
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this handoff.
- **Deliverables:** Smaller run-planning hook/modules, fewer trivial wrappers, and centralized run-related formatting/status behavior.
- **Commit Expectation:** `Simplify run planning composition`
- **Known Constraints / Baseline Failures:** Keep the existing run route tree and stepper semantics intact; do not collapse product-defined phases into generic labels.
- **Completion Notes:** `ui/src/features/runs/use-run-view-model.ts` now serves only as a stable export barrel while the real Phase 4 logic lives in dedicated layout, planning, and compile hooks plus shared run helpers for ready-provider state, compile availability, and status/activity presentation. `ui/src/features/execution/use-execution-view-model.ts` now consumes those shared helpers so execution rows and task detail stop inferring their own run status tone, and the `Specification` / `Architecture` routes render `PlanningWorkspaceFrame` directly so the no-op workspace wrappers are gone without changing the route tree. The one allowed fix pass then moved the live planning order/default fallback onto shared helpers in `ui/src/features/runs/run-planning-config.ts` and added `ui/src/test/runs-routes.test.tsx` coverage that clicks `Refresh run`, proves terminal compile messaging, and exercises planning-save failure rollback plus retry. The Phase 4 gate re-passed with `rtk proxy npx vitest run ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx`, `rtk proxy npx eslint ui/src vitest.config.ts`, and `rtk proxy npx tsc --noEmit -p tsconfig.ui.json`.
- **Next Starter Context:** Phase 5 should treat the split run view-model boundary as settled and `ui/src/features/runs/run-planning-config.ts` as the single source of truth for planning order plus the default incomplete-phase fallback. Keep status/activity presentation flowing from `ui/src/features/runs/run-status.ts` and view-model outputs, do not reintroduce specification/architecture wrapper components or label-based status inference back into execution components, and preserve the new route coverage for blocked refresh plus planning-save recovery while running final validation and docs updates.

## Phase 5: Docs And Final Validation

### Phase Handoff

- **Status:** Pending
- **Goal:** Reconcile durable docs/notes with the actual execution outcomes and close the plan with final validation evidence.
- **Scope Boundary:** In scope: UI-facing durable docs or notes touched by the finished work, final validation, and plan-truth updates. Out of scope: fresh feature work beyond what phases 1-4 already delivered.
- **Read First:**
  - `.ultrakit/notes.md`
  - `ui/AGENTS.md`
  - `design/workspace-spec.md`
  - `design/design-guidelines.md`
  - this plan document
- **Files Expected To Change:**
  - `.ultrakit/notes.md` if the sandbox build result remains reproducibly changed
  - any UI docs or plan sections made inaccurate by completed execution
  - `.ultrakit/exec-plans/active/index.md`
  - `.ultrakit/exec-plans/completed/README.md` when archiving
  - archive paths for this plan
- **Validation:**
  - `npx vitest run ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx ui/src/test/resource-model-selectors.test.tsx ui/src/test/runs-routes.test.tsx`
  - `npx eslint ui/src vitest.config.ts`
  - `npx tsc --noEmit -p tsconfig.ui.json`
  - `rtk npm run build`
- **Plan / Docs To Update:** Update all living sections, final acceptance evidence, and this handoff before archive.
- **Deliverables:** Truthful docs/notes, final validation record, and archive-ready plan state.
- **Commit Expectation:** `Document UI composition cleanup outcomes`
- **Known Constraints / Baseline Failures:** Only update durable notes when the validation result is actually reproduced at the end of the plan; do not rewrite notes based on a single stale assumption.
