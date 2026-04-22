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

## Progress

- [x] 2026-04-21 Installed workspace dependencies with `npm install`.
- [x] 2026-04-21 Ran broad baseline commands and recorded pre-existing failures plus current build behavior.
- [x] 2026-04-21 Reviewed the current UI composition seams, route ownership, and test harness constraints.
- [x] 2026-04-21 Drafted this execution plan and registered it as the active plan.
- [x] 2026-04-21 Received explicit approval to execute the plan.
- [x] 2026-04-21 Ran the one allowed Phase 1 fix pass, hardened the remaining `runs-routes` transition assertions, and revalidated the exact `npx` gate plus the standalone route suite.
- [x] Phase 1 complete: stabilize the UI test harness and targeted validation path, with fix-pass revalidation.
- [x] 2026-04-21 Completed the Phase 2 bug-fix pass with a native shell project selector, guarded run-planning edits, URL-backed documentation/workstreams state, duplicate-key cleanup, and shared UTC formatting.
- [x] Phase 2 complete: ship the user-facing bug-fix pass for navigation state, accessibility, and data formatting.
- [ ] Phase 3 complete: unify the project-configuration component hierarchy and provider contract.
- [ ] Phase 4 complete: simplify the runs/planning component hierarchy and supporting utilities.
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
- Documentation and workstreams now treat selection/filter/pagination as URL state, with targeted tests proving browser-history restoration.
- Run-planning edits now warn on both in-app navigation and browser unload while dirty, and the touched run/workstream surfaces share one UTC formatter instead of repeating ad hoc timestamp logic.

## Context and Orientation

This repository serves a Cloudflare Worker plus React UI workspace. The current UI code lives under `ui/src/`.

Key files and seams for this plan:

- `ui/AGENTS.md`, `design/workspace-spec.md`, and `design/design-guidelines.md` are the UI architecture and product-model sources of truth.
- `ui/src/app/App.tsx`, `ui/src/app/app-providers.tsx`, and `ui/src/routes/router.tsx` define the top-level provider stack and route tree.
- `ui/src/shared/layout/app-shell.tsx` and `ui/src/shared/layout/shell-sidebar.tsx` own the persistent shell and project switcher.
- `ui/src/features/projects/project-context.tsx` owns current-project selection and scaffold compatibility.
- `ui/src/features/projects/{new-project-context.tsx,project-settings-context.tsx,use-project-configuration-view-model.ts}` plus `ui/src/features/projects/components/` own the project-configuration surface.
- `ui/src/shared/layout/project-configuration-scaffold.tsx` and `ui/src/shared/forms/component-type-picker.tsx` are currently “shared” even though they are project-specific.
- `ui/src/features/runs/use-run-view-model.ts` is the main run-planning view-model file and currently mixes layout, formatting, editing, and compile behavior.
- `ui/src/features/runs/components/` and `ui/src/features/execution/components/` render the run-planning, compile, execution, and task-detail surfaces.
- `ui/src/features/documentation/use-documentation-view-model.ts` and `ui/src/features/workstreams/use-workstreams-view-model.ts` currently keep selection/filter state locally instead of in the URL.
- `ui/src/shared/layout/status-pill.tsx`, `ui/src/features/execution/components/execution-workspace.tsx`, and several view-model files each reinterpret statuses separately.
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

- **Status:** Completed on 2026-04-21
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
- **Completion Notes:** `ui/src/shared/layout/shell-sidebar.tsx` now uses a native `<select>` for project switching, so the shell keeps the same product posture without depending on a half-finished custom listbox. `ui/src/shared/navigation/use-unsaved-changes-guard.ts` protects dirty planning edits on route changes and `beforeunload`, `ui/src/features/documentation/use-documentation-view-model.ts` and `ui/src/features/workstreams/use-workstreams-view-model.ts` now back user-facing selection state with search params, `ui/src/shared/formatting/date.ts` centralizes the touched UTC formatting, and `ui/src/features/documentation/components/documentation-workspace.tsx` now keys document lines safely by index. The Phase 2 gate passed with `npx vitest run ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx ui/src/test/runs-routes.test.tsx`, `npx eslint ui/src vitest.config.ts`, and `npx tsc --noEmit -p tsconfig.ui.json`.
- **Next Starter Context:** Phase 3 should treat the native shell project selector as the new truthful contract and keep downstream tests on combobox semantics rather than reviving button/listbox assumptions. Preserve the new search-param contracts for `Documentation` and `Workstreams`, keep the shared unsaved-change/date utilities reusable instead of duplicating them inside project-configuration code, and do not fold this bug-fix work into broader route or destination redesign.

## Phase 3: Project Configuration Composition Cleanup

### Phase Handoff

- **Status:** Pending
- **Goal:** Replace the duplicated `new`/`settings` project-configuration hierarchy with one clearer feature-owned composition model.
- **Scope Boundary:** In scope: project-configuration providers, view models, feature components, and moving project-specific UI out of `shared/`. Out of scope: backend project API changes, route-path changes, or visual redesign.
- **Read First:**
  - `ui/src/routes/projects/project-configuration-layout.tsx`
  - `ui/src/routes/projects/project-configuration-tab-route.tsx`
  - `ui/src/features/projects/new-project-context.tsx`
  - `ui/src/features/projects/project-settings-context.tsx`
  - `ui/src/features/projects/use-project-configuration-view-model.ts`
  - `ui/src/features/projects/components/project-configuration-tabs.tsx`
  - `ui/src/features/projects/components/project-component-card.tsx`
  - `ui/src/shared/layout/project-configuration-scaffold.tsx`
  - `ui/src/shared/forms/component-type-picker.tsx`
  - `ui/src/test/destination-scaffolds.test.tsx`
  - `ui/src/test/resource-model-selectors.test.tsx`
- **Files Expected To Change:**
  - `ui/src/routes/projects/project-configuration-layout.tsx`
  - `ui/src/routes/projects/project-configuration-tab-route.tsx`
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

## Phase 4: Runs And Planning Composition Cleanup

### Phase Handoff

- **Status:** Pending
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
