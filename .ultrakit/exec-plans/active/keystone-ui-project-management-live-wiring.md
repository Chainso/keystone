# Keystone UI Project Management Live Wiring

## Purpose / Big Picture

This plan turns the current project-management UI from a static scaffold into a real operator workflow backed by the existing project API. After this work lands, the operator should be able to:

- open the app with a real project list instead of a fixed scaffold project,
- switch the current project from the global sidebar,
- create a real project from `New project`,
- edit the selected project from `Project settings`,
- land on a coherent post-create experience where the new project becomes current and `Runs` reflects that project,
- apply consistent project-management behaviors and strong UI patterns while replacing fake form state and disabled controls with real behavior.

From the user's perspective, success means Keystone finally has a real project-management loop in the UI:

- the sidebar project switcher is no longer a disabled placeholder,
- `New project` submits a real `POST /v1/projects` request,
- `Project settings` submits a real `PATCH /v1/projects/:projectId` request,
- `Save Draft` disappears because there is no draft API,
- the selected project survives ordinary UI navigation and reflects the latest saved values,
- styling is still intentionally secondary to correct behavior, composition, and product experience.

This plan intentionally focuses on UI behavior, state ownership, composition, and API wiring. It does **not** attempt a visual redesign, auth UX, or unrelated destination polish.

## Backward Compatibility

Backward compatibility with the current project-management scaffold behavior is **not required**. The current `New project`, `Project settings`, and project switcher UI are placeholders, not a shipped public interface, and the user explicitly wants real behavior plus stronger implementation patterns.

Compatibility that **is** required:

- preserve the top-level product structure and terminology from `design/workspace-spec.md`,
- keep `New project` and `Project settings` as tabbed configuration surfaces rather than turning them into a wizard,
- keep styling work out of scope unless needed incidentally to keep the existing layout rendering,
- keep auth concerns out of scope for this plan; the UI should not grow auth-specific state, controls, or error handling unless a later task explicitly asks for auth work,
- avoid destabilizing unrelated backend/runtime behavior; the plan should consume the existing project APIs instead of reopening backend contract design,
- prefer strong and consistent UI patterns over preserving the current route or component structure exactly as it exists today.

## Design Decisions

1. **Date:** 2026-04-20  
   **Decision:** Scope this plan to the full UI project-management loop: sidebar project selection, current-project persistence, `New project` create, `Project settings` update, and the immediate project-scoped `Runs` experience after selection or creation.  
   **Rationale:** The user clarified that the plan should encompass all of project management, not only the initial create form. The UI currently breaks that loop into disconnected placeholders, so the plan has to own the whole operator path.  
   **Alternatives considered:** limit the plan to `POST /v1/projects` only; treat project switching as a later follow-up.

2. **Date:** 2026-04-20  
   **Decision:** Keep styling explicitly out of scope and optimize for behavior, composition, and user experience structure first.  
   **Rationale:** The user has repeated that good patterns and correct experiences matter more than visual polish right now. The new `ui/AGENTS.md` now codifies that preference for future UI work too.  
   **Alternatives considered:** fold a styling pass into the same plan; postpone UX behavior until after a design refresh.

3. **Date:** 2026-04-20  
   **Decision:** Keep auth explicitly out of scope for this plan and use same-origin project API calls without adding auth-specific UI logic.  
   **Rationale:** The user explicitly said to ignore auth. The local backend already enforces auth at the HTTP layer, but this plan is about project-management behavior and patterns, not auth UX or header plumbing.  
   **Alternatives considered:** build dev-auth header injection into the browser client now; add auth-specific empty/error states in the project UI.

4. **Date:** 2026-04-20  
   **Decision:** Introduce a dedicated project-management provider with a `state` / `actions` / `meta` contract and keep it as the single owner of project list loading, current-project selection, and create/update mutations.  
   **Rationale:** This follows the loaded `vercel-composition-patterns` guidance and matches the repo's existing preference for provider-owned state and thin routes. It prevents project-selection logic from leaking into the sidebar, route files, and every destination hook.  
   **Alternatives considered:** put `fetch` calls directly in route components; add a global store; overload the existing `ResourceModelProvider` with mutation logic.

5. **Date:** 2026-04-20  
   **Decision:** Keep the product structure and terminology from `design/workspace-spec.md`, but allow route, layout, and component restructuring wherever it improves consistency, ownership, and long-term maintainability; still prefer explicit `New project` and `Project settings` variants over collapsing everything into a mode-heavy component.  
   **Rationale:** The user does not care about preserving the current implementation structure exactly. What matters is applying best practices and consistent behavior patterns while keeping the product model clear.  
   **Alternatives considered:** freeze the existing route tree and component split; centralize everything into one giant `ProjectConfiguration` component with many mode switches.

6. **Date:** 2026-04-20  
   **Decision:** Remove `Save Draft` and `Next` from the live project-configuration flow and replace them with one real primary action per mode: `Create project` for `New project`, `Save changes` for `Project settings`.  
   **Rationale:** The spec says these screens are tabbed configuration categories, not lifecycle steps, and the user explicitly removed `Save Draft` because there is no draft API. A single real submit action is the most honest UI contract.  
   **Alternatives considered:** keep disabled draft/next actions for familiarity; invent a client-only draft state.

7. **Date:** 2026-04-20  
   **Decision:** Reuse the canonical backend project schemas in the UI adapter where they are browser-safe, instead of duplicating the request/response contract in `ui/`.  
   **Rationale:** `src/keystone/projects/contracts.ts` and `src/http/api/v1/projects/contracts.ts` already define the authoritative request and response shapes. Reusing them reduces drift between the real API and the UI payload builder.  
   **Alternatives considered:** create UI-local TypeScript types that mirror the API by hand; use untyped `fetch` responses.

8. **Date:** 2026-04-20  
   **Decision:** Perform validation in two layers: inline client validation for operator feedback, plus authoritative backend validation through the existing API contract.  
   **Rationale:** The form should catch obvious errors such as missing fields, duplicate component keys, duplicate env var names, and invalid component-source combinations before submission, but the backend remains the final authority.  
   **Alternatives considered:** rely only on backend validation; create a separate UI-only validation model that diverges from the API schema.

9. **Date:** 2026-04-20  
   **Decision:** Persist the selected current project in local storage with a small versioned key and fall back safely to the first available project when the stored id is absent or stale.  
   **Rationale:** Current project is a top-level app context, so resetting it on every reload would be a weak operator experience. The loaded React guidance also explicitly recommends schema-conscious local-storage use rather than ad hoc persistence.  
   **Alternatives considered:** no persistence; URL-encode the current project in every route.

10. **Date:** 2026-04-20  
    **Decision:** Implement the project switcher as a simple sidebar disclosure list over the real project collection, not as a searchable combobox or a route change.  
    **Rationale:** The current product model needs selection, not search. A small disclosure list keeps the interaction accessible and easy to own without broadening the plan into custom combobox complexity.  
    **Alternatives considered:** native `<select>` replacement of the current button; full searchable combobox; moving project switching into a dedicated route.

11. **Date:** 2026-04-20  
    **Decision:** Cut the `Runs` index over to the live project-scoped runs API as part of this plan, because it is the immediate post-create and post-switch destination.  
    **Rationale:** The user approved post-create routing to `/runs`, so that page must reflect the selected project or the create/switch flow will feel fake even if the project forms are live.  
    **Alternatives considered:** keep `Runs` scaffold-only and defer live data; redirect post-create somewhere else.

12. **Date:** 2026-04-20  
    **Decision:** Keep `Documentation` and `Workstreams` out of the live-data scope for this plan, but make them safe for non-scaffold projects by bridging current-project selection into empty/compatible scaffold state rather than crashing.  
    **Rationale:** The current backend constraints still say project documents are stubbed, and this plan is about project management. The selected project must still be coherent across the app, but full live cutovers for those destinations belong to separate work.  
    **Alternatives considered:** fully wire documentation/workstreams live now; leave them broken for projects that do not exist in the scaffold dataset.

13. **Date:** 2026-04-20  
    **Decision:** Rename or replace the current `placeholder-*` form primitives as part of the live form pass so real inputs are not still labeled as placeholders in shipped UI code.  
    **Rationale:** Styling is not the priority, but semantics are. Leaving real editable fields under `placeholder-*` names would make the codebase misleading just as the UI becomes real.  
    **Alternatives considered:** keep the existing names and only change props; build all form controls inside the project feature instead of `ui/src/shared/forms/`.

14. **Date:** 2026-04-20  
    **Decision:** Keep user-triggered mutations in explicit event handlers and derive display state during render, only using effects for actual I/O boundaries and persistence synchronization.  
    **Rationale:** This follows the loaded `vercel-react-best-practices` guidance and avoids effect-driven mutation flows, redundant mirrored state, and brittle update ordering.  
    **Alternatives considered:** submit through state flags plus effects; store derived summaries in separate local state.

15. **Date:** 2026-04-20  
    **Decision:** Separate live project-management state from the scaffold `ResourceModelProvider` instead of continuing the current dataset-override approach in `ui/src/features/projects/project-context.tsx`.  
    **Rationale:** Today `CurrentProjectProvider` turns a non-default project into a rewritten copy of `uiScaffoldDataset` via `createProjectOverrideDataset()`. That makes scaffold runs, documents, tasks, and settings appear to belong to whichever project is selected, which is incompatible with truthful multi-project behavior once project switching and live runs are real.  
    **Alternatives considered:** keep overloading `ResourceModelProvider` as the global current-project owner; extend the dataset override trick to live API-backed projects.

16. **Date:** 2026-04-20  
    **Decision:** Add one browser-safe same-origin API adapter for project list/detail/create/update and project-scoped runs, and make feature hooks consume that adapter instead of calling `fetch()` ad hoc.  
    **Rationale:** The UI needs a stable seam for request parsing, network error handling, and contract reuse. Centralizing these calls keeps routes and view-model hooks thin and makes tests easier to stub precisely.  
    **Alternatives considered:** inline `fetch()` in route components; one-off fetch helpers per screen.

17. **Date:** 2026-04-20  
    **Decision:** Keep the live `Runs` index honest to the current backend run contract, even when that means changing the scaffold table behavior. If a live run has no scaffold-backed detail surface yet, do not render a broken detail link.  
    **Rationale:** `GET /v1/projects/:projectId/runs` currently returns `RunResource` fields such as `runId`, `executionEngine`, `status`, `compiledFrom`, `startedAt`, and `endedAt`, but not the scaffold-only `displayId`, `summary`, or `updatedLabel` fields. Inventing those values or linking into run-detail routes that cannot render live runs would make the UI misleading.  
    **Alternatives considered:** fabricate scaffold-style summaries from partial data; keep linking every row to `/runs/:runId` and let non-scaffold runs fail later.

## Execution Log

- **Date:** 2026-04-20  
  **Phase:** Planning  
  **Decision:** Expand the plan scope from create-only wiring to the full UI project-management loop after the user clarified they want all of project management covered.  
  **Rationale:** A create-only plan would leave the sidebar switcher, current-project state, and settings path unresolved, which would still make the UI feel incomplete.

- **Date:** 2026-04-20  
  **Phase:** Planning  
  **Decision:** Record the actual baseline in this worktree after restoring dependencies, not the earlier missing-binary state.  
  **Rationale:** The first broad validation attempt failed because `node_modules` was missing. After the user approved `npm install`, the real baseline became: `typecheck` passes, `lint` has pre-existing repo errors, `test` fails only in the known `listen EPERM` demo-contract path, sandbox `build` fails on Wrangler/Docker environment boundaries, and host `build` passes.

- **Date:** 2026-04-20  
  **Phase:** Planning  
  **Decision:** Repair `.ultrakit/exec-plans/active/index.md` while registering this plan because it pointed at a missing project-management plan file and omitted the still-active target-model migration plan.  
  **Rationale:** The active plan index is part of the durable execution state. Leaving it stale would break resume safety before execution even begins.

- **Date:** 2026-04-20  
  **Phase:** Planning  
  **Decision:** Pause execution after preflight and fold the live/scaffold seam analysis back into the plan before any UI code changes.  
  **Rationale:** The current `CurrentProjectProvider` override behavior and the missing run-summary fields in the live API were concrete enough that the next executor should not have to rediscover them from code inspection or chat history.

- **Date:** 2026-04-20  
  **Phase:** Phase 1  
  **Decision:** Finish the live project-context seam by introducing a fetch-backed project-management provider above the shell, while keeping scaffold destinations alive through an explicit compatibility bridge and a static route-test provider helper.  
  **Rationale:** The sidebar and shell needed truthful live project ownership now, but Phase 1 still had to avoid pulling Runs, Documentation, Workstreams, or project-form data into live APIs before their later phases.

- **Date:** 2026-04-20  
  **Phase:** Phase 1 Fix Pass  
  **Decision:** Relax the shell gate only for the zero-project `/projects/new` recovery route and add a parent-layout compatibility state for `/settings` when the selected live project has no scaffold-backed settings data.  
  **Rationale:** The review round found that the Phase 1 shell gate accidentally blocked the visible `New project` recovery path and that non-scaffold current projects could still crash `Project settings`. Both fixes belonged inside Phase 1’s shell/provider boundary and did not require pulling real settings APIs forward.

- **Date:** 2026-04-20  
  **Phase:** Phase 2  
  **Decision:** Keep one shared project-management API seam for both project lists and project-scoped runs, while letting the static route-test provider continue returning scaffold-backed run rows so existing scaffold run-detail routes stay truthful in tests.  
  **Rationale:** The real app needed live `GET /v1/projects/:projectId/runs` behavior immediately, but the existing run-detail route and several non-Phase-2 tests still rely on scaffold-backed run records. Splitting the API by source instead of forcing one fake shape preserved truthful live behavior without breaking the scaffold route harness.

- **Date:** 2026-04-20  
  **Phase:** Phase 2 Fix Pass  
  **Decision:** Keep the Workstreams filter bar mounted independently from the zero-row state, and extend the live-runs shell tests to cover run-fetch retry plus every `Latest activity` branch.  
  **Rationale:** The review round found one behavioral regression in the new zero-row Workstreams branch and one testing gap in the live-runs path. Both fixes stayed inside the Phase 2 surface and did not require any run-detail or create/update work.

- **Date:** 2026-04-20  
  **Phase:** Phase 3  
  **Decision:** Build `New project` around a route-scoped draft provider plus shared form primitives, while keeping the actual create/list-refresh/switch-current-project mutation in the existing project-management provider seam.  
  **Rationale:** The create form needed persistent tab-to-tab draft state and canonical contract validation without pulling settings loading forward. A route-scoped draft provider kept the new-project semantics explicit, while reusing the existing live project provider for the real `POST /v1/projects` and refreshed current-project selection flow.

- **Date:** 2026-04-20  
  **Phase:** Phase 3 Fix Pass  
  **Decision:** Treat the `POST /v1/projects` detail response as authoritative if the immediate follow-up list refresh fails, and keep the newly created project selected in shell state instead of downgrading the entire flow into a retryable error.  
  **Rationale:** The review round found that a transient refresh failure after a successful create could strand the operator on a false failure path and encourage duplicate submission. Falling back to the created project record keeps the UI honest without pulling settings or broader recovery work into this phase.

## Progress

- [x] 2026-04-20 Discovery completed across the UI scaffold, workspace spec, backend project contracts, and current project-context wiring.
- [x] 2026-04-20 UI-local guidance added in `ui/AGENTS.md` to prioritize behavior/composition over styling and to ignore auth unless the task is explicitly about auth.
- [x] 2026-04-20 Baseline dependency restore completed with `rtk npm install`.
- [x] 2026-04-20 Broad baseline recorded after dependency restore:
  - `rtk npm run typecheck` passes.
  - `rtk npm run lint` fails on pre-existing repo issues outside the planned UI scope.
  - `rtk npm run test` fails only in the pre-existing `tests/scripts/demo-contracts.test.ts` `listen EPERM 127.0.0.1` path.
  - `rtk npm run build` fails in the sandbox because Wrangler/Docker need host access.
  - `rtk npm run build` passes when rerun with host permissions.
- [x] 2026-04-20 Active execution plan written and registered.
- [x] 2026-04-20 User approved the overall project-management scope and requested a more execution-ready plan before coding begins.
- [x] 2026-04-20 Pre-execution seam analysis folded back into the plan:
  - live current-project state must not keep piggybacking on `createProjectOverrideDataset()`,
  - the live project-runs API does not expose scaffold summary fields,
  - non-scaffold runs must not assume scaffold run-detail routes can render them.
- [x] 2026-04-20 Phase 1 completed:
  - `ui/src/features/projects/project-context.tsx` now owns live project list loading, persisted current-project selection, and shell-facing `state` / `actions` / `meta`.
  - `ui/src/shared/layout/{app-shell,shell-sidebar}.tsx` now render honest loading, empty, and error shell states plus a live sidebar project switcher.
  - `ui/src/features/resource-model/context.tsx` now acts as a scaffold compatibility seam instead of the canonical owner of live project selection.
  - Focused UI tests now cover stale local-storage fallback, empty project collections, and sidebar project switching with explicit `fetch` stubs.
- [x] 2026-04-20 Phase 1 targeted fix pass completed:
  - `/projects/new` remains reachable when the live project list is empty.
  - `/settings` now renders an explicit compatibility state instead of throwing for non-scaffold live projects.
  - Focused shell tests now cover loading, error/retry recovery, valid stored-project rehydration, zero-project recovery routing, and non-scaffold settings safety.
- [x] 2026-04-20 Phase 2 completed:
  - [ui/src/features/runs/use-runs-index-view-model.ts](../../ui/src/features/runs/use-runs-index-view-model.ts) now loads `GET /v1/projects/:projectId/runs` through the shared project-management API seam, exposes loading/error/empty states, and keeps live rows free of broken run-detail links.
  - [ui/src/routes/runs/runs-index-route.tsx](../../ui/src/routes/runs/runs-index-route.tsx) now renders truthful live run columns plus a visible no-detail limitation note, while preserving scaffold-backed run rows for the static test harness.
  - [ui/src/features/documentation/use-documentation-view-model.ts](../../ui/src/features/documentation/use-documentation-view-model.ts) and [ui/src/features/workstreams/use-workstreams-view-model.ts](../../ui/src/features/workstreams/use-workstreams-view-model.ts) now render explicit compatibility states for non-scaffold projects instead of falling through to scaffold defaults or throwing.
  - Focused shell and destination tests now prove stored-project rehydration into a no-runs state, sidebar-driven live run refresh, and non-scaffold safety for Documentation and Workstreams.
- [x] 2026-04-20 Phase 2 targeted fix pass completed:
  - [ui/src/features/workstreams/components/workstreams-board.tsx](../../ui/src/features/workstreams/components/workstreams-board.tsx) now keeps the filter controls visible when an active filter yields zero rows and renders a filter-specific empty state instead of hiding the controls.
  - [ui/src/test/app-shell.test.tsx](../../ui/src/test/app-shell.test.tsx) now covers `/v1/projects/:projectId/runs` failure plus Retry recovery and asserts the `Latest activity` labels for ended, compiled-only, and idle live runs.
  - [ui/src/test/destination-scaffolds.test.tsx](../../ui/src/test/destination-scaffolds.test.tsx) now includes a direct zero-row Workstreams board test so the filter-bar regression stays covered without broadening the route surface.
- [x] 2026-04-20 Phase 3 completed:
  - [ui/src/features/projects/new-project-context.tsx](../../ui/src/features/projects/new-project-context.tsx) now owns the tab-persistent `New project` draft, client validation, and user-triggered create/cancel actions.
  - [ui/src/features/projects/project-management-api.ts](../../ui/src/features/projects/project-management-api.ts) and [ui/src/features/projects/project-context.tsx](../../ui/src/features/projects/project-context.tsx) now support `POST /v1/projects` plus the required list refresh before switching the current project.
  - [ui/src/features/projects/components/project-configuration-tabs.tsx](../../ui/src/features/projects/components/project-component-card.tsx) and [ui/src/shared/forms/](../../ui/src/shared/forms/) now expose real editable overview, components, rules, and environment controls with honest field/list component names instead of `placeholder-*`.
  - [ui/src/test/destination-scaffolds.test.tsx](../../ui/src/test/destination-scaffolds.test.tsx) now covers live create success, validation failures, and the post-create `/runs` landing flow.
- [x] 2026-04-20 Phase 3 targeted fix pass completed:
  - [ui/src/features/projects/project-context.tsx](../../ui/src/features/projects/project-context.tsx) now falls back to the project returned by `POST /v1/projects` when the immediate list refresh fails, preserving the new current-project selection instead of dropping the shell into an error state.
  - [ui/src/test/destination-scaffolds.test.tsx](../../ui/src/test/destination-scaffolds.test.tsx) now proves the POST-success/refresh-failure recovery path, adds explicit required-project-key validation coverage, and exercises the new-project add/remove instruction controls directly.

## Surprises & Discoveries

- The current active plan index referenced `.ultrakit/exec-plans/active/keystone-ui-project-management-live-wiring.md`, but that file did not exist. The registry needed repair before this planning pass could be considered durable.
- The global project switcher is still a disabled button in [ui/src/shared/layout/shell-sidebar.tsx](../../ui/src/shared/layout/shell-sidebar.tsx), even though `Runs` already keys its data off `currentProjectId`. The app has the idea of project context, but not a real project-management loop.
- The current project-configuration surface in [ui/src/features/projects/use-project-configuration-view-model.ts](../../ui/src/features/projects/use-project-configuration-view-model.ts) is still scaffold-only: fake seeds, local component-card state, disabled footer actions, and no network adapter.
- The current shared form primitives are still named `placeholder-*`, which becomes actively misleading once the form is real.
- [ui/src/features/projects/project-context.tsx](../../ui/src/features/projects/project-context.tsx) is not a true live project provider yet. For non-default projects it rewrites the scaffold dataset with `createProjectOverrideDataset()`, which would make all scaffold runs, docs, tasks, and settings follow whichever project is selected.
- [src/http/api/v1/runs/contracts.ts](../../src/http/api/v1/runs/contracts.ts) exposes the live project-runs collection shape, and it omits scaffold presentation fields such as `displayId`, `summary`, and `updatedLabel`. Phase 2 must either adjust the `Runs` table to real fields or derive only clearly justified fallbacks from actual response data.
- Live run detail remains out of scope for this plan. If a run exists only in the live API and not in the scaffold resource model, the `Runs` index must not render a broken `/runs/:runId` deep link.
- After dependency restore, the worktree baseline is healthier than the initial missing-tool state but not fully green:
  - `typecheck` passes,
  - `lint` has unrelated repo errors,
  - `test` is only blocked by the known `listen EPERM` demo-script failures,
  - host `build` passes once Wrangler and Docker are allowed to run outside the sandbox.
- `Documentation` and `Workstreams` still depend on scaffold dataset assumptions around the current project, so project switching cannot simply stop at the sidebar; the provider seam has to keep non-live destinations renderable for non-scaffold projects.
- [ui/src/test/render-route.tsx](../../ui/src/test/render-route.tsx) only injects a project override today. API-backed UI phases will need explicit `fetch` stubs and `localStorage` reset discipline in jsdom tests.
- Phase 1 exposed a new repo-level validation mismatch: after restoring dependencies in this worktree, the exact required `rtk npm run typecheck` command now fails outside the UI scope in [tests/lib/db-client-worker.test.ts](../../tests/lib/db-client-worker.test.ts) because `WorkerBindings` expects `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`. The Phase 1 UI surface still compiles with `./node_modules/.bin/tsc --noEmit -p tsconfig.ui.json`.
- The first Phase 1 shell gate was too aggressive: it blocked the visible zero-project recovery route at `/projects/new`, which only showed up once the review pass exercised the route directly instead of just the empty shell CTA.
- `Project settings` needed its own non-scaffold compatibility state even before live settings APIs exist, because the parent shell/provider seam alone does not stop the scaffold-only settings view models from throwing.
- Phase 2 did not need a deeper `ResourceModelProvider` rewrite after all. Using `useCurrentProject()` plus direct dataset membership checks in Documentation and Workstreams was enough to detect non-scaffold selections honestly without changing the scaffold provider contract again.
- The first Phase 2 Workstreams empty-state branch was too coarse: treating every zero-row result like a global empty state accidentally hid the filter controls for filter-specific zero results. Keeping the filters outside that branch fixed the regression without changing the Workstreams view-model contract.
- The canonical `ProjectConfig` schema treats `description` as nullable at the storage boundary but still rejects blank strings, so the create form has to keep description explicitly required instead of auto-normalizing empty input to `null`.
- A successful create cannot rely on an immediate `/v1/projects` refresh being available. The `POST /v1/projects` detail response has to remain a trustworthy fallback source for current-project state or the UI can falsely look like the create failed and invite a duplicate retry.

## Outcomes & Retrospective

Planning outcome on 2026-04-20:

- The full UI project-management scope is now resolved enough to execute without reopening product questions.
- The plan keeps styling out of scope and auth ignored, and it now treats the current implementation structure as negotiable in service of better patterns and consistency.
- The work is split into small phases around project context, live runs integration, create, settings, and closeout so each phase fits a single implementation agent.
- The real baseline is now recorded after dependency restoration instead of being obscured by a missing `node_modules` state.
- Execution was intentionally paused after preflight so the live/scaffold provider seam, runs-contract limits, and test harness expectations could be captured in the plan before code changes started.
- The plan is now more resume-safe for a future executor because the main implementation traps are written into the checked-in document instead of living only in chat context.

Phase 1 outcome on 2026-04-20:

- Keystone now has a real project-management provider and same-origin project list adapter instead of a dataset-rewrite current-project hack.
- The global shell can show explicit loading, empty, and retry states before route content mounts, which keeps zero-project tenants coherent.
- The sidebar project switcher is now live and persisted through `keystone.ui.current-project.v1`.
- The route-test harness now defaults back to a static scaffold provider unless a test explicitly opts into the browser API path, which keeps non-Phase-1 route tests stable while live project tests stub `fetch` honestly.
- The required targeted UI tests pass, but the repo-wide `rtk npm run typecheck` command is currently blocked by an unrelated worker-binding type mismatch outside this phase.

Phase 1 targeted fix pass outcome on 2026-04-20:

- The zero-project shell now preserves the visible recovery route into `New project` instead of trapping the operator behind the empty shell state.
- `Project settings` now fails honestly for non-scaffold live projects with a compatibility state instead of crashing through scaffold-only selectors.
- The focused shell test suite now covers the missing loading, retry, valid rehydration, and non-scaffold settings cases that the review round called out.

Phase 2 outcome on 2026-04-20:

- The `Runs` index now follows the selected live project through `GET /v1/projects/:projectId/runs`, including honest loading, retry, and no-runs states.
- Live run rows no longer advertise scaffold-only deep links, while scaffold-backed test runs still preserve the existing run-detail route behavior.
- `Documentation` and `Workstreams` now stay stable for non-scaffold projects by rendering explicit compatibility states instead of crashing or silently falling back to the scaffold default project.
- The required focused test command passes, while the repo-wide `rtk npm run typecheck` command remains blocked by the same unrelated worker-binding mismatch already recorded from Phase 1.

Phase 2 targeted fix pass outcome on 2026-04-20:

- Workstreams now keeps its filter controls visible across zero-row results, so an operator can recover immediately from an empty filter selection.
- The live-runs shell coverage now exercises the run-fetch retry path and all three previously untested `Latest activity` fallback branches.
- The focused validation picture is unchanged aside from the new passing tests: `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx` passes, `rtk ./node_modules/.bin/tsc --noEmit -p tsconfig.ui.json` passes, and `rtk npm run typecheck` still fails only in the unrelated worker-binding test.

Phase 3 outcome on 2026-04-20:

- `New project` is now a real tabbed form with provider-owned draft state, editable overview/components/rules/environment fields, and no leftover `Save Draft` or `Next` stepper semantics.
- Successful create now posts the canonical `ProjectConfig` payload shape, refreshes the live project list, switches the current project, and lands the operator on the new project's `Runs` state.
- The shared project-form surface now uses honest `form-*` and `text-list-*` primitives instead of `placeholder-*`, while `Project settings` remains scaffold-backed and explicitly out of Phase 3's save/load scope.
- The focused destination test command passes, `rtk ./node_modules/.bin/tsc --noEmit -p tsconfig.ui.json` passes, and the required repo `rtk npm run typecheck` command still fails only in the unrelated worker-binding test already recorded from earlier phases.

Phase 3 targeted fix pass outcome on 2026-04-20:

- The create flow now keeps the newly created project selected and routeable even if the immediate project-list refresh fails after `POST /v1/projects`.
- The focused create-flow tests now cover the reviewer-called blind spots: refresh-failure recovery, required-project-key validation, and direct add/remove behavior for the list-editing controls.
- The focused validation picture is unchanged aside from the new passing tests: `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx` passes, `rtk ./node_modules/.bin/tsc --noEmit -p tsconfig.ui.json` passes, and `rtk npm run typecheck` still fails only in the unrelated worker-binding test.

## Context and Orientation

The current repository state relevant to this plan is:

- [ui/AGENTS.md](../../ui/AGENTS.md) now records the UI-specific working rules: behavior/composition first, styling later, and auth out of scope unless explicitly requested.
- [design/workspace-spec.md](../../design/workspace-spec.md) is still the UI structure source of truth. It defines the global sidebar project controls plus the tabbed `New project` and `Project settings` surfaces.
- [ui/src/shared/layout/shell-sidebar.tsx](../../ui/src/shared/layout/shell-sidebar.tsx) renders the current project block, but the project switcher is disabled and only shows the scaffold project.
- [ui/src/app/app-providers.tsx](../../ui/src/app/app-providers.tsx), [ui/src/features/projects/project-context.tsx](../../ui/src/features/projects/project-context.tsx), and [ui/src/features/resource-model/context.tsx](../../ui/src/features/resource-model/context.tsx) own the current project/provider seam today.
- [ui/src/features/projects/project-context.tsx](../../ui/src/features/projects/project-context.tsx) currently treats a custom project as a request to clone the scaffold dataset under a different project id. That behavior is useful for isolated scaffold tests, but it is the wrong long-term source of truth for live project selection.
- [ui/src/features/resource-model/context.tsx](../../ui/src/features/resource-model/context.tsx) currently owns `currentProjectId` for scaffold destinations. After the live cutover, it should either remain a scaffold-only context or consume a bridge from the live project provider; it should not stay the authoritative owner of live project selection.
- [ui/src/features/resource-model/selectors.ts](../../ui/src/features/resource-model/selectors.ts) contains scaffold selectors for runs, docs, workstreams, and project-configuration seeds. Future API-backed work should stop expanding these selectors for live data and instead use explicit API adapters plus compatibility hooks.
- [ui/src/features/projects/use-project-configuration-view-model.ts](../../ui/src/features/projects/use-project-configuration-view-model.ts), [ui/src/features/projects/project-configuration-scaffold.ts](../../ui/src/features/projects/project-configuration-scaffold.ts), and [ui/src/features/projects/components/project-configuration-tabs.tsx](../../ui/src/features/projects/components/project-configuration-tabs.tsx) still drive `New project` and `Project settings` from scaffold data.
- [ui/src/features/projects/components/project-component-card.tsx](../../ui/src/features/projects/components/project-component-card.tsx), [ui/src/shared/forms/placeholder-field.tsx](../../ui/src/shared/forms/placeholder-field.tsx), and [ui/src/shared/forms/placeholder-list-field.tsx](../../ui/src/shared/forms/placeholder-list-field.tsx) are the current fake form primitives.
- [ui/src/features/runs/use-runs-index-view-model.ts](../../ui/src/features/runs/use-runs-index-view-model.ts) already uses `currentProjectId`, which makes it the natural first destination to cut over to live project-aware data.
- [ui/src/routes/runs/runs-index-route.tsx](../../ui/src/routes/runs/runs-index-route.tsx) currently assumes every row can deep-link into a scaffold-backed run detail route. That assumption must be relaxed for live project runs until run-detail cutover exists.
- [ui/src/features/documentation/use-documentation-view-model.ts](../../ui/src/features/documentation/use-documentation-view-model.ts) and [ui/src/features/workstreams/use-workstreams-view-model.ts](../../ui/src/features/workstreams/use-workstreams-view-model.ts) currently assume the selected project exists in the scaffold dataset and will throw or render misleadingly when it does not.
- [src/keystone/projects/contracts.ts](../../src/keystone/projects/contracts.ts) defines the canonical `ProjectConfig` request contract and validation rules: one or more components, duplicate-key protection, env var uniqueness, and exactly one of `localPath` / `gitUrl` for `git_repository`.
- [src/http/api/v1/projects/contracts.ts](../../src/http/api/v1/projects/contracts.ts) defines the canonical project response shapes.
- [src/http/api/v1/runs/contracts.ts](../../src/http/api/v1/runs/contracts.ts) defines the canonical live run collection shape that the `Runs` index must honor.
- [src/http/api/v1/projects/handlers.ts](../../src/http/api/v1/projects/handlers.ts) already implements `GET /v1/projects`, `POST /v1/projects`, `GET /v1/projects/:projectId`, `PATCH /v1/projects/:projectId`, and `GET /v1/projects/:projectId/runs`.
- [tests/http/projects.test.ts](../../tests/http/projects.test.ts) already proves the backend project contract, so the UI plan should consume that contract rather than inventing a parallel one.
- [ui/src/test/app-shell.test.tsx](../../ui/src/test/app-shell.test.tsx), [ui/src/test/destination-scaffolds.test.tsx](../../ui/src/test/destination-scaffolds.test.tsx), and [ui/src/test/resource-model-selectors.test.tsx](../../ui/src/test/resource-model-selectors.test.tsx) are the main frontend safety net today.
- [ui/src/test/render-route.tsx](../../ui/src/test/render-route.tsx) is the main route helper. It currently assumes provider-only setup and will likely need modest expansion or surrounding helper utilities for API-backed tests.

The main architectural gap is not only missing API wiring. It is the missing live project-management state and the lack of a cohesive ownership model between the shell controls, the project configuration tabs, and the project-scoped runs destination.

## Plan of Work

The work starts by replacing the current scaffold-only current-project seam with a real project-management provider that owns project list loading, current-project selection, persistence, and create/update mutation state. That provider becomes the single source of truth for the shell project controls and exposes a clean `state` / `actions` / `meta` interface to consumers. It should replace or supersede the current `CurrentProjectProvider` instead of extending the current `createProjectOverrideDataset()` trick, because that trick aliases scaffold runs, documents, tasks, and settings to the currently selected project.

The live provider should sit above the shell, while scaffold-only destinations continue to consume a clearly scoped compatibility seam. In other words: live project state and scaffold destination data are related, but they are not the same thing. `Documentation`, `Workstreams`, and any remaining scaffold-only surfaces should either consume a bridge that knows whether the current project has scaffold backing or render a compatibility empty state when it does not.

Once the shell has a real current project, the plan immediately cuts the `Runs` index over to the live project-scoped runs API so the selected project has a truthful immediate destination. Because the live run contract does not currently expose the same presentation fields as the scaffold model, this phase should prefer honest UI changes over fake continuity. If a non-scaffold run cannot safely open in the scaffold run-detail routes yet, the index should not render a broken link. This same phase also makes the rest of the shell safe for non-scaffold projects by ensuring `Documentation` and `Workstreams` can render explicit empty or compatibility states instead of assuming every selected project already exists in the checked-in scaffold dataset.

With the project context in place, the plan replaces the fake `New project` tabs with a real editable form model. The create flow keeps explicit `New project` semantics, but the provider becomes the only layer that knows how the form is seeded, validated, serialized, and submitted. The fake `Save Draft` and `Next` actions are removed, and successful creation refreshes the live project list, updates the current-project context, and then routes the operator to `Runs` so the shell is not left on stale project state.

The next phase reuses that same form architecture for `Project settings`. It loads the current project from the real detail API, keeps the explicit settings variants, and submits `PATCH /v1/projects/:projectId` without reopening any route or styling debate. Saving settings refreshes the selected project summary and the cached project list entry so the shell and settings surface stay in sync.

The final phase cleans up misleading placeholder names, updates durable docs and notes to describe the real project-management loop, and reruns the baseline. The documentation pass should explicitly preserve the user preference that styling and auth remain out of scope for future follow-up work unless requested.

## Concrete Steps

Run these from `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare` unless stated otherwise.

Baseline commands already run during planning:

```bash
rtk npm install
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

Observed planning baseline:

- `rtk npm install` succeeded.
- `rtk npm run typecheck` succeeded.
- `rtk npm run lint` failed with pre-existing repo errors in backend/scripts files.
- `rtk npm run test` failed only in `tests/scripts/demo-contracts.test.ts` with `listen EPERM: operation not permitted 127.0.0.1`.
- `rtk npm run build` failed inside the sandbox after `vite build` because Wrangler and Docker needed host access.
- `rtk npm run build` succeeded when rerun with host permissions.

Expected execution-phase commands:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx ui/src/test/resource-model-selectors.test.tsx
rtk npm run test
rtk npm run build
```

If `npm run build` reproduces the sandbox-only Wrangler/Docker failure, rerun it with host permissions and record both outcomes in the plan.

Testing guidance for execution:

- For jsdom UI tests that hit live project flows, stub `global.fetch` explicitly per request path instead of trying to smuggle API state through the scaffold provider.
- Clear `window.localStorage` between tests that exercise current-project persistence so stale ids do not leak between cases.
- Keep route tests honest about scope: non-scaffold project selection should prove `Runs` and shell safety, not force fake run-detail behavior.

## Validation and Acceptance

Acceptance is met when all of the following are true:

- the global sidebar renders a real project switcher that loads project summaries from `GET /v1/projects`,
- changing the current project updates the shell context and the `Runs` index without route-tree churn,
- tenants with no projects get a coherent first-project experience instead of a broken current-project assumption,
- the live project provider is the source of truth for current project selection, while scaffold-only destinations use an explicit compatibility seam rather than `createProjectOverrideDataset()` as global state,
- the live `Runs` index uses only API-backed fields or clearly justified derived fallbacks and does not offer broken run-detail navigation for non-scaffold runs,
- `New project` is an editable tabbed form that validates against the real project contract and submits `POST /v1/projects`,
- successful project creation removes the fake action model, switches current project, and routes to `/runs`,
- `Project settings` loads the current project from `GET /v1/projects/:projectId`, submits `PATCH /v1/projects/:projectId`, and refreshes the visible current-project summary,
- `Save Draft` and other fake stepper semantics are gone from project configuration,
- `Documentation` and `Workstreams` do not crash when the selected project has no scaffold backing,
- frontend tests cover switching, zero-project handling, create, update, and the post-create/project-scoped `Runs` experience,
- `rtk npm run typecheck` still passes,
- any remaining `lint`, `test`, or sandbox `build` failures are explicitly classified as pre-existing or environment-specific in the plan.

## Idempotence and Recovery

This plan should be executed one phase at a time. Each phase is resumable if the plan and handoff capsule stay current.

Safe retry guidance:

- project list/detail/runs fetches are read-only and can be retried freely,
- create/update mutations should avoid duplicate submissions by tracking in-flight state inside the provider and disabling the submit action while a request is active,
- if a create succeeds but the route/navigation update fails, the next retry should detect the created project from the refreshed project list rather than blindly posting again,
- if current-project local-storage state becomes stale, the provider should discard it and fall back to the first available project or the no-project empty state,
- if execution stops mid-phase, update `Progress`, `Execution Log`, `Surprises & Discoveries`, and that phase's `Status`, `Completion Notes`, and `Next Starter Context` before handoff.

No destructive repo operations are expected. No database migrations or API contract rewrites are part of this plan.

## Artifacts and Notes

Planning baseline evidence:

```text
rtk npm install
added 671 packages, and audited 672 packages in 6s
```

```text
rtk npm run typecheck
> tsc --noEmit && tsc --noEmit -p tsconfig.ui.json
```

```text
rtk npm run test
tests/scripts/demo-contracts.test.ts ... listen EPERM: operation not permitted 127.0.0.1
```

```text
rtk npm run build
vite build succeeds, then sandbox Wrangler/Docker fail on ~/.config/.wrangler/logs and Docker CLI access
```

```text
host-permitted rtk npm run build
build passes and --dry-run exits cleanly
```

Recommended execution notes:

- Preferred local-storage key for current-project persistence: `keystone.ui.current-project.v1`.
- Preferred shape for the live provider contract:
  - `state`: project list, selected project id, selected project summary, compatibility flags, form state where relevant
  - `actions`: select project, refresh list, create project, update project, reset/discard form state
  - `meta`: loading, mutation status, persistence source, compatibility state, recoverable error
- Preferred compatibility rule for scaffold-only destinations: if the selected live project is not backed by the checked-in scaffold dataset, render an explicit empty/compatibility state instead of remapping scaffold data to that project id.
- Preferred route behavior for live runs before run-detail cutover: if a row cannot open a truthful run detail surface, render it without a misleading deep link and make that limitation visible in the page copy or row affordance.

## Interfaces and Dependencies

Key UI modules:

- `ui/src/app/app-providers.tsx`
- `ui/src/shared/layout/shell-sidebar.tsx`
- `ui/src/features/projects/project-context.tsx`
- `ui/src/features/projects/use-project-configuration-view-model.ts`
- `ui/src/features/projects/project-configuration-scaffold.ts`
- `ui/src/features/projects/components/project-configuration-tabs.tsx`
- `ui/src/features/projects/components/project-component-card.tsx`
- `ui/src/features/runs/use-runs-index-view-model.ts`
- `ui/src/routes/runs/runs-index-route.tsx`
- `ui/src/features/resource-model/context.tsx`
- `ui/src/features/resource-model/selectors.ts`
- `ui/src/test/render-route.tsx`

Canonical backend/UI contract dependencies:

- `GET /v1/projects`
- `POST /v1/projects`
- `GET /v1/projects/:projectId`
- `PATCH /v1/projects/:projectId`
- `GET /v1/projects/:projectId/runs`
- `src/keystone/projects/contracts.ts`
- `src/http/api/v1/projects/contracts.ts`
- `src/http/api/v1/runs/contracts.ts`
- `tests/http/projects.test.ts`

Pattern dependencies:

- `ui/AGENTS.md`
- `vercel-composition-patterns`
- `vercel-react-best-practices`

Expected end-state seams after execution:

- one live project-management provider module that replaces or clearly supersedes the current `project-context.tsx` scaffold override behavior,
- one browser-safe project API adapter module for list/detail/create/update plus project-scoped runs,
- one shared project-form state/serialization layer reused by both `New project` and `Project settings`,
- one explicit compatibility helper or hook for scaffold-only destinations so they can tell whether the selected project is scaffold-backed.

## Phase 1: Live Project Context And Sidebar Switcher

### Phase Handoff

#### Goal

Introduce the real project-management provider and sidebar switcher so the app can load, persist, and change the current project from the API.

#### Scope Boundary

In scope:

- a project-management provider with `state`, `actions`, and `meta`
- real loading of `GET /v1/projects`
- persisted current-project selection with safe fallback behavior
- zero-project state handling at the shell level
- converting the sidebar project switcher from disabled placeholder to real selection UI
- tests for provider behavior and shell switching

Out of scope:

- live `Runs` data
- create/update form submission
- documentation/workstreams live data
- visual redesign work
- auth-specific UI logic

#### Read First

- [ui/AGENTS.md](../../ui/AGENTS.md)
- [design/workspace-spec.md](../../design/workspace-spec.md)
- [ui/src/app/app-providers.tsx](../../ui/src/app/app-providers.tsx)
- [ui/src/shared/layout/shell-sidebar.tsx](../../ui/src/shared/layout/shell-sidebar.tsx)
- [ui/src/features/projects/project-context.tsx](../../ui/src/features/projects/project-context.tsx)
- [ui/src/features/resource-model/context.tsx](../../ui/src/features/resource-model/context.tsx)
- [src/http/api/v1/projects/contracts.ts](../../src/http/api/v1/projects/contracts.ts)
- [ui/src/test/app-shell.test.tsx](../../ui/src/test/app-shell.test.tsx)
- [ui/src/test/resource-model-selectors.test.tsx](../../ui/src/test/resource-model-selectors.test.tsx)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/app/app-providers.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/shared/layout/shell-sidebar.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/projects/project-context.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/projects/` (new provider/client helpers)
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/test/app-shell.test.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/test/resource-model-selectors.test.tsx`

#### Implementation Notes

- Replace or supersede the current `CurrentProjectProvider`; do not keep using `createProjectOverrideDataset()` as the global current-project mechanism.
- The live project provider should own the selected project id and summary. `ResourceModelProvider` may remain for scaffold destinations, but it should not remain the canonical owner of live project selection.
- Use a same-origin browser API helper for `GET /v1/projects` and parse responses with the canonical project collection schema.
- Persist the current project with the versioned local-storage key `keystone.ui.current-project.v1`.
- Tests in this phase should cover loading, zero-project state, stale local-storage ids, and successful project switching.

#### Validation

- `rtk npm run typecheck`
- `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/resource-model-selectors.test.tsx`

Success means the shell can load and change the current project, persists selection safely, and renders a coherent no-project state.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries` if provider ownership or persistence behavior differs from plan assumptions
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`

#### Deliverables

- project-management provider
- project list API adapter
- persisted current-project selection
- live sidebar switcher
- focused provider/shell tests

#### Commit Expectation

`wire live project context and sidebar switcher`

#### Known Constraints / Baseline Failures

- `rtk npm run lint` currently fails on pre-existing repo issues outside this phase's expected files
- `rtk npm run test` currently fails in `tests/scripts/demo-contracts.test.ts` with `listen EPERM: operation not permitted 127.0.0.1`
- sandbox `rtk npm run build` still fails after `vite build` because Wrangler/Docker need host access

#### Status

Completed on 2026-04-20.

#### Completion Notes

- Added `ui/src/features/projects/project-management-api.ts` and rewired [ui/src/features/projects/project-context.tsx](../../ui/src/features/projects/project-context.tsx) into a live project-management provider with persisted selection and a scaffold compatibility seam.
- Updated [ui/src/shared/layout/app-shell.tsx](../../ui/src/shared/layout/app-shell.tsx) and [ui/src/shared/layout/shell-sidebar.tsx](../../ui/src/shared/layout/shell-sidebar.tsx) so the shell handles loading/empty/error states and the sidebar exposes a real disclosure-style project switcher.
- Updated [ui/src/test/app-shell.test.tsx](../../ui/src/test/app-shell.test.tsx), [ui/src/test/resource-model-selectors.test.tsx](../../ui/src/test/resource-model-selectors.test.tsx), and [ui/src/test/render-route.tsx](../../ui/src/test/render-route.tsx) for fetch-backed provider tests plus static fallback route helpers.
- Targeted fix pass:
  - [ui/src/shared/layout/app-shell.tsx](../../ui/src/shared/layout/app-shell.tsx) now lets `/projects/new` render when the live project list is empty.
  - [ui/src/features/projects/use-project-configuration-view-model.ts](../../ui/src/features/projects/use-project-configuration-view-model.ts), [ui/src/routes/projects/project-configuration-layout.tsx](../../ui/src/routes/projects/project-configuration-layout.tsx), and [ui/src/shared/layout/project-configuration-scaffold.tsx](../../ui/src/shared/layout/project-configuration-scaffold.tsx) now expose an honest compatibility state for non-scaffold project settings.
  - [ui/src/test/app-shell.test.tsx](../../ui/src/test/app-shell.test.tsx) now covers loading, retry, valid current-project rehydration, zero-project recovery, and non-scaffold settings safety.
- Validation:
  - `rtk npm install` passed after this worktree unexpectedly lost `node_modules`.
  - `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/resource-model-selectors.test.tsx` passed.
  - `rtk npm run typecheck` failed outside Phase 1 scope in `tests/lib/db-client-worker.test.ts`.
  - `rtk ./node_modules/.bin/tsc --noEmit -p tsconfig.ui.json` passed.

#### Next Starter Context

- Phase 2 should consume `useProjectManagement()` for the selected live project and cut `Runs` over to `GET /v1/projects/:projectId/runs` without assuming scaffold-only detail fields.
- The scaffold compatibility seam still intentionally falls back for non-live destinations; Phase 2 should make `Documentation` and `Workstreams` safe for non-scaffold projects instead of relying on the default scaffold project.

## Phase 2: Live Runs Integration And Project-Safe Empty States

### Phase Handoff

#### Goal

Make the selected project drive the `Runs` index live and keep the rest of the shell safe for projects that do not exist in the scaffold dataset.

#### Scope Boundary

In scope:

- `GET /v1/projects/:projectId/runs` integration for the `Runs` index
- empty-state handling for projects with no runs
- compatibility or empty-state behavior for project-scoped destinations that still rely on scaffold data
- tests proving the selected current project changes the `Runs` experience correctly

Out of scope:

- project create/update submission
- documentation/workstreams live backend loading
- run detail live cutover
- styling work

#### Read First

- [ui/src/features/runs/use-runs-index-view-model.ts](../../ui/src/features/runs/use-runs-index-view-model.ts)
- [ui/src/routes/runs/runs-index-route.tsx](../../ui/src/routes/runs/runs-index-route.tsx)
- [ui/src/features/resource-model/context.tsx](../../ui/src/features/resource-model/context.tsx)
- [ui/src/features/resource-model/selectors.ts](../../ui/src/features/resource-model/selectors.ts)
- [src/http/api/v1/projects/handlers.ts](../../src/http/api/v1/projects/handlers.ts)
- [ui/src/test/app-shell.test.tsx](../../ui/src/test/app-shell.test.tsx)
- [ui/src/test/destination-scaffolds.test.tsx](../../ui/src/test/destination-scaffolds.test.tsx)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/runs/use-runs-index-view-model.ts`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/routes/runs/runs-index-route.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/resource-model/context.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/resource-model/selectors.ts`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/test/app-shell.test.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/test/destination-scaffolds.test.tsx`

#### Implementation Notes

- `GET /v1/projects/:projectId/runs` does not return scaffold fields like `displayId`, `summary`, or `updatedLabel`. The phase should adapt the table honestly to the real API response instead of backfilling fake scaffold values.
- If a live run has no truthful run-detail route yet, do not render a broken deep link to `/runs/:runId`.
- `Documentation` and `Workstreams` should render explicit compatibility or empty states for non-scaffold projects instead of throwing.
- Keep run-detail live cutover out of scope even if the index behavior changes.

#### Validation

- `rtk npm run typecheck`
- `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx`

Success means switching or creating a project leads to a truthful `Runs` page and no project-scoped route crashes for non-scaffold projects.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries` if resource-model bridging needs a different seam than planned
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`

#### Deliverables

- live project-scoped runs index
- no-runs empty state
- compatibility behavior for non-live project destinations
- route coverage for selected-project `Runs`

#### Commit Expectation

`wire project-scoped runs into the ui shell`

#### Known Constraints / Baseline Failures

- `Documentation` and `Workstreams` still remain scaffold-backed after this phase
- broad `lint`, broad `test`, and sandbox `build` caveats remain the same as baseline

#### Status

Completed on 2026-04-20.

#### Completion Notes

- Added project-scoped run loading to [ui/src/features/projects/project-management-api.ts](../../ui/src/features/projects/project-management-api.ts), [ui/src/features/projects/project-context.tsx](../../ui/src/features/projects/project-context.tsx), [ui/src/features/runs/use-runs-index-view-model.ts](../../ui/src/features/runs/use-runs-index-view-model.ts), and [ui/src/routes/runs/runs-index-route.tsx).
- Updated [ui/src/features/documentation/use-documentation-view-model.ts](../../ui/src/features/documentation/use-documentation-view-model.ts), [ui/src/features/documentation/components/documentation-workspace.tsx](../../ui/src/features/documentation/components/documentation-workspace.tsx), [ui/src/features/workstreams/use-workstreams-view-model.ts](../../ui/src/features/workstreams/use-workstreams-view-model.ts), and [ui/src/features/workstreams/components/workstreams-board.tsx](../../ui/src/features/workstreams/components/workstreams-board.tsx) with explicit non-scaffold compatibility states.
- Focused validation:
  - `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx` passed.
  - `rtk npm run typecheck` still fails outside Phase 2 scope in [tests/lib/db-client-worker.test.ts](../../tests/lib/db-client-worker.test.ts) because `WorkerBindings` now expects `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`.
  - `rtk ./node_modules/.bin/tsc --noEmit -p tsconfig.ui.json` passed.
- Targeted fix pass:
  - [ui/src/features/workstreams/components/workstreams-board.tsx](../../ui/src/features/workstreams/components/workstreams-board.tsx) now preserves the filter controls across zero-row states and renders a filter-specific empty-state message when appropriate.
  - [ui/src/test/app-shell.test.tsx](../../ui/src/test/app-shell.test.tsx) now covers run-fetch failure plus Retry recovery and the remaining live-run `Latest activity` branches.
  - [ui/src/test/destination-scaffolds.test.tsx](../../ui/src/test/destination-scaffolds.test.tsx) now covers the zero-row Workstreams filter state directly.

#### Next Starter Context

- Phase 3 should keep reusing the shared project-management API/provider seam and replace the scaffold-only `New project` tabs with a real editable create flow.
- The live `Runs` index is now project-scoped, so successful project creation should refresh the live project list, select the new project, and land back on `/runs` without reintroducing scaffold-only assumptions.

## Phase 3: Real New Project Flow

### Phase Handoff

#### Goal

Replace the scaffold-only `New project` tabs with a real editable form that validates, creates a project, switches current context, and routes to `Runs`.

#### Scope Boundary

In scope:

- real editable overview, components, rules, and environment fields
- shared form/provider architecture for the create flow
- client validation aligned to the real project contract
- removal of `Save Draft` and `Next`
- `POST /v1/projects` submission
- post-create switch-current-project and route-to-`/runs` behavior
- tests for create success, validation failures, and post-create navigation

Out of scope:

- `PATCH` settings save
- settings-specific loading logic
- visual redesign work

#### Read First

- [ui/AGENTS.md](../../ui/AGENTS.md)
- [design/workspace-spec.md](../../design/workspace-spec.md)
- [ui/src/features/projects/use-project-configuration-view-model.ts](../../ui/src/features/projects/use-project-configuration-view-model.ts)
- [ui/src/features/projects/project-configuration-scaffold.ts](../../ui/src/features/projects/project-configuration-scaffold.ts)
- [ui/src/features/projects/components/project-configuration-tabs.tsx](../../ui/src/features/projects/components/project-configuration-tabs.tsx)
- [ui/src/features/projects/components/project-component-card.tsx](../../ui/src/features/projects/components/project-component-card.tsx)
- [ui/src/shared/forms/placeholder-field.tsx](../../ui/src/shared/forms/placeholder-field.tsx)
- [ui/src/shared/forms/placeholder-list-field.tsx](../../ui/src/shared/forms/placeholder-list-field.tsx)
- [src/keystone/projects/contracts.ts](../../src/keystone/projects/contracts.ts)
- [src/http/api/v1/projects/contracts.ts](../../src/http/api/v1/projects/contracts.ts)
- [ui/src/test/destination-scaffolds.test.tsx](../../ui/src/test/destination-scaffolds.test.tsx)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/projects/use-project-configuration-view-model.ts`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/projects/project-configuration-scaffold.ts`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/projects/components/project-configuration-tabs.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/projects/components/project-component-card.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/shared/forms/` (renamed/reworked shared form primitives)
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/routes/projects/` (only if route plumbing needs a small submit/navigation seam)
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/test/destination-scaffolds.test.tsx`

#### Implementation Notes

- The shared form state should model `ProjectConfig` closely: overview fields, `ruleSet`, `components`, and `envVars`.
- Treat the scaffold template as an initial draft seed only. Stop using resource-model selectors as the authoritative source for live create flow state.
- Client validation in this phase should cover required overview fields, at least one component, unique component keys, unique env var names, and exactly one of `localPath` or `gitUrl` for each `git_repository` component.
- On successful create, refresh the live project list before selecting the new project and routing to `/runs` so the shell is not left on stale state.

#### Validation

- `rtk npm run typecheck`
- `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx`

Success means `New project` is a real form, submits the real payload shape, shows validation feedback, and lands on a project-scoped `Runs` experience after success.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries` if the shared schema reuse or form-provider split differs from the plan
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`

#### Deliverables

- real new-project form provider
- honest shared form primitives
- create mutation and validation flow
- post-create project switch and navigation
- focused create-flow tests

#### Commit Expectation

`wire real new project creation in the ui`

#### Known Constraints / Baseline Failures

- keep create logic in event handlers, not effect-driven submit state
- keep explicit `New project` variants; do not collapse create and settings into one mode-heavy component
- broad lint/test/build caveats remain as baseline

#### Status

Completed on 2026-04-20.

#### Completion Notes

- Added a route-scoped [ui/src/features/projects/new-project-context.tsx](../../ui/src/features/projects/new-project-context.tsx) provider for persistent new-project draft state, canonical client validation, and explicit cancel/create handlers.
- Added `createProject()` support to the shared project-management seam so successful create requests refresh `/v1/projects` before selecting the new project and routing to `/runs`.
- Replaced the `placeholder-*` shared form layer with [ui/src/shared/forms/form-field.tsx](../../ui/src/shared/forms/form-field.tsx) and [ui/src/shared/forms/text-list-field.tsx](../../ui/src/shared/forms/text-list-field.tsx), then rewired the project tabs and component cards around those real controls.
- The targeted fix pass now keeps the project returned by `POST /v1/projects` selected if the follow-up refresh fails, so the create flow does not devolve into a duplicate-submit trap.
- The targeted fix pass also extended focused create-flow coverage for refresh-failure recovery, required-project-key validation, and the add/remove instruction controls.
- Validation results for this phase:
  - `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx` passes.
  - `rtk ./node_modules/.bin/tsc --noEmit -p tsconfig.ui.json` passes.
  - `rtk npm run typecheck` still fails outside this phase in [tests/lib/db-client-worker.test.ts](../../tests/lib/db-client-worker.test.ts) because `WorkerBindings` now requires `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`.

#### Next Starter Context

- Phase 4 can reuse the new shared project-form/view-model surface, and it can assume create already preserves the POST-returned project if the follow-up list refresh fails.
- Phase 4 still needs a real settings seed from `GET /v1/projects/:projectId`, an explicit `PATCH` save action, and current-project summary refresh after save.

## Phase 4: Real Project Settings Flow

### Phase Handoff

#### Goal

Load the current project's real settings and save updates back through `PATCH /v1/projects/:projectId`.

#### Scope Boundary

In scope:

- settings-mode seed loading from the real project detail API
- reuse of the shared project-configuration form architecture
- real settings save action and in-place refresh of current-project summary
- tests for project-settings update behavior and current-project refresh

Out of scope:

- new-project create flow changes beyond shared helper reuse
- unrelated destination live-data work
- styling changes

#### Read First

- [ui/src/features/projects/use-project-configuration-view-model.ts](../../ui/src/features/projects/use-project-configuration-view-model.ts)
- [ui/src/features/projects/project-context.tsx](../../ui/src/features/projects/project-context.tsx)
- [ui/src/features/projects/components/project-configuration-tabs.tsx](../../ui/src/features/projects/components/project-configuration-tabs.tsx)
- [src/http/api/v1/projects/contracts.ts](../../src/http/api/v1/projects/contracts.ts)
- [src/http/api/v1/projects/handlers.ts](../../src/http/api/v1/projects/handlers.ts)
- [ui/src/test/destination-scaffolds.test.tsx](../../ui/src/test/destination-scaffolds.test.tsx)
- [ui/src/test/app-shell.test.tsx](../../ui/src/test/app-shell.test.tsx)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/projects/use-project-configuration-view-model.ts`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/projects/project-context.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/features/projects/components/project-configuration-tabs.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/shared/layout/shell-sidebar.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/test/destination-scaffolds.test.tsx`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/ui/src/test/app-shell.test.tsx`

#### Implementation Notes

- Load the settings seed from `GET /v1/projects/:projectId`; do not continue using scaffold project-configuration selectors as the authoritative settings source.
- A successful `PATCH` should refresh both the selected project summary and the project list entry so sidebar and settings headers stay in sync.
- If the selected project is missing or returns not found during settings load, fall back to a safe shell state instead of leaving the route on a broken assumption.

#### Validation

- `rtk npm run typecheck`
- `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/app-shell.test.tsx`

Success means settings load the real selected project, save changes through `PATCH`, and the current-project shell summary refreshes without route churn.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries` if settings refresh or current-project sync requires an unplanned seam
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`

#### Deliverables

- real settings seed/load flow
- real settings save action
- refreshed shell summary after save
- focused settings tests

#### Commit Expectation

`wire real project settings updates in the ui`

#### Known Constraints / Baseline Failures

- keep `Project settings` explicit; do not turn it into a generic mode flag on the create component
- broad lint/test/build caveats remain as baseline

#### Status

Pending.

#### Completion Notes

- None yet.

#### Next Starter Context

- Reuse the create-phase shared form architecture instead of inventing a second settings-only form stack.

## Phase 5: Cleanup, Docs, And Final Validation

### Phase Handoff

#### Goal

Close out the project-management live wiring work with durable docs, truthful notes, and final validation evidence.

#### Scope Boundary

In scope:

- remove or rename leftover misleading placeholder terminology in the changed project-management path
- update durable docs that describe the current UI shell and project-management behavior
- update `.ultrakit/notes.md` if execution reveals new durable project-management guidance
- rerun broad validation and record the final truth, including any host-only build rerun evidence

Out of scope:

- unrelated product features
- new styling work
- auth work

#### Read First

- [README.md](../../README.md)
- [.ultrakit/developer-docs/m1-architecture.md](../../.ultrakit/developer-docs/m1-architecture.md)
- [.ultrakit/developer-docs/m1-local-runbook.md](../../.ultrakit/developer-docs/m1-local-runbook.md)
- [.ultrakit/notes.md](../../.ultrakit/notes.md)
- [ui/AGENTS.md](../../ui/AGENTS.md)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/README.md`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/.ultrakit/developer-docs/m1-architecture.md`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/.ultrakit/developer-docs/m1-local-runbook.md`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/.ultrakit/notes.md`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/.ultrakit/exec-plans/active/index.md`
- `/home/chanzo/.codex/worktrees/8bf1/keystone-cloudflare/.ultrakit/exec-plans/completed/` (archive move at closeout)

#### Implementation Notes

- If the final implementation keeps a temporary live/scaffold compatibility split, the docs should explain that explicitly and not imply full project-wide live data beyond this plan's scope.
- Keep the closeout docs honest about what remains out of scope: styling, auth, and any still-unwired live run-detail or project-document behavior.

#### Validation

- `rtk npm run lint`
- `rtk npm run typecheck`
- `rtk npm run test`
- `rtk npm run build`

Success means final validation is rerun, results are recorded truthfully, and the docs explain the live project-management loop without reintroducing styling/auth scope creep.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries`
- Update `Outcomes & Retrospective`
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`

#### Deliverables

- final documentation updates
- refreshed durable notes
- final validation evidence
- archived plan once acceptance is met

#### Commit Expectation

`document live ui project management behavior`

#### Known Constraints / Baseline Failures

- broad `lint` currently has pre-existing non-UI repo errors
- broad `test` currently has pre-existing `listen EPERM` failures in `tests/scripts/demo-contracts.test.ts`
- sandbox `build` still requires host rerun for Wrangler/Docker verification

#### Status

Pending.

#### Completion Notes

- None yet.

#### Next Starter Context

- Keep the docs honest about scope: live project management is in, styling and auth are still intentionally out.
