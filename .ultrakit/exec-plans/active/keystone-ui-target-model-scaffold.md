# Keystone UI Target-Model Scaffold

## Purpose / Big Picture

This plan replaces the current UI's invented scaffold contracts with scaffold data, selectors, and component boundaries that match Keystone's target model. After this plan is complete, the operator UI should still be scaffold-only, but the scaffold will be honest: `Runs`, `Documentation`, `Workstreams`, `Project settings`, and run execution screens will all compose from `project`, `run`, `document`, `document revision`, `task`, `workflow graph`, and `artifact` concepts instead of fake `currentPhase`, fake chat transcripts, and hand-built screen copy.

From the user's perspective, success means:

- the current route tree remains intact and usable,
- the UI scaffold aligns with the target model described in the existing Keystone modelling work,
- `Workstreams` is clearly a project-scoped task surface,
- `/runs/:runId` chooses its initial destination through the agreed document/task-derived rule instead of a fake `currentPhase` field,
- planning and task chat are modeled as conversation locators, not embedded transcript arrays,
- the scaffold code is easier to extend because route containers stay thin, destination ownership stays feature-local, and large boolean-driven workspace components do not creep back in,
- no styling or visual redesign work is mixed into this effort.

This plan is intentionally limited to component composition, scaffold contracts, and React/module architecture. It does **not** add live API fetching, query caching, final styling, or new backend behavior.

## Backward Compatibility

Backward compatibility with the current scaffold data model is **not required**. The user explicitly wants the UI scaffold rewritten around the target model, and the existing scaffold contracts are placeholders rather than a shipped public interface.

Compatibility that **is** required:

- preserve the current route tree under `ui/src/routes/`,
- preserve the existing destination set and main drill-down paths from `design/workspace-spec.md`,
- keep the current repo validation baseline working: `npm run lint`, `npm run test`, `npm run typecheck`, and `npm run build`,
- keep the UI scaffold-only and avoid implying that live backend data or message transport is already wired,
- keep the current Worker/API runtime and backend route surface untouched unless a UI scaffold test or import path requires a minimal adjustment.

## Design Decisions

1. **Date:** 2026-04-19  
   **Decision:** Scope this plan to scaffold architecture only: component composition, module ownership, scaffold contracts, route seams, and tests. Styling work is out of scope except for minimal incidental updates required to keep existing screens rendering after component splits.  
   **Rationale:** The user explicitly wants best-practice scaffold work, not a visual pass. Mixing visuals into this plan would blur acceptance and make phase boundaries less precise.  
   **Alternatives considered:** combine a visual redesign with the scaffold rewrite; leave component structure untouched and only rename scaffold fields.

2. **Date:** 2026-04-19  
   **Decision:** Replace the current screen-owned fake models with a single target-model-aligned scaffold resource layer centered on `project`, `run`, `document`, `documentRevision`, `task`, `workflowGraph`, and `artifact`.  
   **Rationale:** The current `run-scaffold.ts`, `documentation-scaffold.ts`, and `workstreams-scaffold.ts` each invent their own nouns. A normalized scaffold layer lets all destinations derive their view state from the same domain model.  
   **Alternatives considered:** keep each destination's local scaffold; wait for live backend fetching before normalizing the UI model.

3. **Date:** 2026-04-19  
   **Decision:** Put the normalized scaffold resource layer under `ui/src/features/resource-model/`, not under `ui/src/shared/`.  
   **Rationale:** These are app-domain concepts, not generic UI primitives. Keeping them in `features/` preserves the repo's rule that `shared/` should not own destination-specific product logic.  
   **Alternatives considered:** `ui/src/shared/data/`; keep the data next to each destination feature.

4. **Date:** 2026-04-19  
   **Decision:** Keep route files thin and move destination composition into feature-owned view-model hooks and explicit workspace components.  
   **Rationale:** The current route tree is already structurally correct. The biggest risk is allowing routes to absorb branching logic while the scaffold is reworked.  
   **Alternatives considered:** put all destination assembly directly in route files; introduce a global store and move route ownership there.

5. **Date:** 2026-04-19  
   **Decision:** Avoid boolean-prop workspace APIs. Use explicit components for explicit destinations or phases, with small shared layout primitives only where those primitives genuinely reduce repetition.  
   **Rationale:** The existing scaffold already trends toward route-owned destinations. The rewrite should reinforce that by avoiding `mode`, `variant`, `isExecution`, or `showSidebar` prop growth in a single giant component.  
   **Alternatives considered:** one generic workspace component with mode switches; compound-component-only design everywhere.

6. **Date:** 2026-04-19  
   **Decision:** Treat `Workstreams` as a project-scoped task list derived from the target-model `task` shape and the agreed backend projection `GET /v1/projects/:projectId/tasks`.  
   **Rationale:** The design docs consistently describe `Workstreams` as project-level task visibility, while the target model already supplies `run_tasks` as the underlying noun.  
   **Alternatives considered:** invent a separate `workstream` domain object; derive workstreams from run summaries instead of tasks.

7. **Date:** 2026-04-19  
   **Decision:** Make `/runs/:runId` choose its default phase via the agreed UI rule: if compiled tasks exist, go to `execution`; else if an `execution_plan` document exists, go to `execution-plan`; else if an `architecture` document exists, go to `architecture`; else go to `specification`.  
   **Rationale:** This keeps the `run` model clean and avoids reintroducing a fake `currentPhase` field.  
   **Alternatives considered:** persist `currentPhase` in scaffold data; always redirect to `specification`; add a new backend field solely for UI routing.

8. **Date:** 2026-04-19  
   **Decision:** Model planning and task chat as conversation locators only, using optional `{ agentClass, agentName }` data on `document` and `task` view state. Do not keep fake message arrays as source-of-truth contracts.  
   **Rationale:** The target model stores conversation identity, not transcript history, and the user approved that abstraction. The scaffold should not hard-code a transcript model that later needs to be removed.  
   **Alternatives considered:** continue using fake chat arrays; introduce a temporary local message store that does not exist in the target model.

9. **Date:** 2026-04-19  
   **Decision:** Derive the Documentation tree from target-model document fields such as `scopeType`, `kind`, and `path` instead of from static hand-authored group data.  
   **Rationale:** This lets the Documentation scaffold reflect the real model without requiring a dedicated backend grouping resource.  
   **Alternatives considered:** keep hard-coded documentation groups; add a dedicated `documentation tree` resource solely for the scaffold.

10. **Date:** 2026-04-19  
   **Decision:** Keep project settings current-project-scoped under `/settings/*` and treat project creation/settings screens as scaffold forms over the `project` plus repository/component model, not as a new routing or API problem.  
   **Rationale:** The current route tree and design docs already support this shape, and nothing in the target model requires a route rewrite here.  
   **Alternatives considered:** move settings under `/projects/:projectId/*`; defer project configuration until after live data wiring.

11. **Date:** 2026-04-19  
   **Decision:** Defer query-library and network-client decisions. The scaffold should depend on a feature-local provider/selector seam so live data can be introduced later without reshaping the component tree.  
   **Rationale:** This plan is about composition and contracts, not transport choice. Prematurely choosing a live data stack would add noise and lock in decisions the user has not asked for yet.  
   **Alternatives considered:** adopt direct `fetch` calls now; add TanStack Query in the scaffold phase.

12. **Date:** 2026-04-19  
   **Decision:** When a destination needs shared local state, expose it through an interface shaped like `state`, `actions`, and `meta`, with the provider or hook being the only layer that knows how the state is assembled.  
   **Rationale:** This follows the composition guidance already loaded for this repo and keeps presentational components decoupled from whether their data comes from a static scaffold dataset, selectors, or a later live API adapter.  
   **Alternatives considered:** allow components to import scaffold selectors directly everywhere; introduce a global store before live data exists.

13. **Date:** 2026-04-19  
   **Decision:** Prefer explicit destination variants and small shared frames over generic workspace components with mode props. Planning and configuration surfaces may reuse shared layout pieces, but route-facing components should stay explicit, for example `SpecificationWorkspace`, `ArchitectureWorkspace`, `ExecutionPlanWorkspace`, `ExecutionWorkspace`, `TaskDetailWorkspace`, `DocumentationWorkspace`, `WorkstreamsWorkspace`, `NewProjectConfigurationWorkspace`, and `ProjectSettingsWorkspace`.  
   **Rationale:** Explicit variants make the scaffold easier to extend and keep route intent obvious without reintroducing boolean-prop complexity.  
   **Alternatives considered:** a single workspace component with mode switches; one giant project-configuration board with tab/mode booleans.

14. **Date:** 2026-04-19  
   **Decision:** Do not introduce new barrel files during the scaffold rewrite. Import feature modules directly from source files.  
   **Rationale:** The loaded React performance guidance explicitly flags barrel imports as avoidable cost. Direct imports also make feature ownership clearer during a large scaffold refactor.  
   **Alternatives considered:** add feature `index.ts` barrels for convenience; postpone import hygiene until later.

15. **Date:** 2026-04-19  
   **Decision:** Update the UI smoke tests to assert route behavior, selection state, and link targets rather than placeholder prose, transcript lines, or incidental ASCII glyphs.  
   **Rationale:** The current tests are useful, but some assertions are tied to scaffold copy that this plan intentionally removes. Structural assertions make the tests durable across scaffold contract changes.  
   **Alternatives considered:** preserve existing copy just to keep tests green; dramatically reduce test coverage during the rewrite.

16. **Date:** 2026-04-19  
   **Decision:** Do not define new React components inside other component render functions while splitting the scaffold. Shared helpers should stay at module scope or move into their own files.  
   **Rationale:** The loaded React best-practices guidance flags inline component definitions as a source of unnecessary remounts and muddy ownership. This plan is explicitly about making the scaffold more modular, so it should not regress on that front.  
   **Alternatives considered:** allow inline helper components for convenience during the refactor; defer this cleanup to a later pass.

## Execution Log

- **Date:** 2026-04-19  
  **Phase:** Planning  
  **Decision:** Use the existing route tree in `ui/src/routes/router.tsx` as fixed outer structure and plan the work as a scaffold contract cutover rather than a navigation redesign.  
  **Rationale:** The route structure already matches the workspace spec. The weak point is the fake data model behind it.

- **Date:** 2026-04-19  
  **Phase:** Planning  
  **Decision:** Record the current repo baseline before opening execution: `npm run lint`, `npm run test`, `npm run typecheck`, and `npm run build`.  
  **Rationale:** The plan contract requires a truthful baseline so later phases can distinguish regressions from pre-existing issues.

- **Date:** 2026-04-19  
  **Phase:** Planning  
  **Decision:** Treat `npm run build` as a host-only validation caveat on this machine when run from Codex, because the build succeeds only after rerunning outside the sandbox boundary that blocks Wrangler and Docker home-directory writes.  
  **Rationale:** `vite build` succeeds in the sandbox, but Wrangler and Docker need writable paths under `~/.config/.wrangler` and `~/.docker`.

- **Date:** 2026-04-19  
  **Phase:** Planning  
  **Decision:** Size the scaffold work into six phases so each phase can be completed by a single implementation agent without revisiting earlier design questions.  
  **Rationale:** Splitting Documentation from Project Configuration makes the feature boundaries cleaner and keeps each phase comfortably within a single-agent context window.

- **Date:** 2026-04-19  
  **Phase:** Phase 1  
  **Decision:** Land the target-model scaffold foundation as a new `ui/src/features/resource-model/` module with checked-in normalized resources, indexed selectors, canonical run-phase helpers, and a thin provider seam, while leaving the destination-local scaffold consumers in place for later phases.  
  **Rationale:** This creates one honest source of truth for later cutovers without widening Phase 1 into route rewrites or destabilizing the existing UI smoke coverage.

- **Date:** 2026-04-19  
  **Phase:** Phase 1 fix pass  
  **Decision:** Keep the project override compatibility shim shallow but coherent by remapping every scaffold resource keyed by the default project id onto the override project id, and add provider-seam coverage that exercises mutable `currentProjectId` state directly.  
  **Rationale:** The initial Phase 1 shim only rewrote `projects` plus `meta.defaultProjectId`, which would have left later project-scoped selectors reading empty runs, tasks, and project documents for override projects.

- **Date:** 2026-04-19  
  **Phase:** Phase 2  
  **Decision:** Rewire the runs index, run-detail shell, planning routes, and `/runs/:runId` redirect onto `resource-model` selectors, while replacing fake planning transcript/composer state with explicit planning workspaces backed by document revisions plus optional conversation locators.  
  **Rationale:** This removes the remaining Phase 2 dependency on `RunScaffold.currentPhase` and fake planning chat arrays without widening the change into execution/task detail or route-tree redesign.

## Progress

- [x] 2026-04-19 Discovery and planning inputs gathered from the current repo docs, existing UI scaffold, and target-model decisions previously resolved in the Keystone modelling worktree.
- [x] 2026-04-19 Baseline run recorded: `npm run lint`, `npm run test`, and `npm run typecheck` pass in the sandbox; `npm run build` passes when rerun outside the sandbox after Wrangler/Docker home-directory write failures.
- [x] 2026-04-19 Phase 1 complete: added `ui/src/features/resource-model/` with target-model scaffold types, normalized dataset, selectors, canonical run-phase definitions, a lightweight provider seam, and focused selector/provider coverage while keeping the current route tree intact.
- [x] 2026-04-19 Phase 1 targeted fix pass complete: made the project override shim remap project-scoped scaffold resources coherently and expanded tests to exercise mutable provider state plus scaffold meta wiring.
- [x] 2026-04-19 Phase 2 complete: reworked `Runs` and planning routes around resource-model selectors, derived `/runs/:runId` redirects from target-model data, and replaced fake planning transcripts with explicit document-plus-locator workspaces.
- [ ] 2026-04-19 Phase 3 pending: rework `Execution`, task detail, and `Workstreams` around tasks, workflow graph, artifacts, and conversation locators.
- [ ] 2026-04-19 Phase 4 pending: rework `Documentation` around target-model document and revision contracts.
- [ ] 2026-04-19 Phase 5 pending: rework project configuration scaffolds around target-model project and repository/component contracts.
- [ ] 2026-04-19 Phase 6 pending: remove obsolete scaffold modules, update developer docs, and rerun final validation.

## Surprises & Discoveries

- The current UI route tree is already solid. The problem is not routing; it is the fake scaffold model behind the routes.
- The current scaffold stores several concepts that the target model explicitly rejects for UI source-of-truth use, especially `RunScaffold.currentPhase`, fake planning/task transcript arrays, and destination-local document/task collections.
- `Workstreams` is clearly task-based in the design docs, but the missing UI projection is a project-scoped task listing rather than a new domain noun.
- The current route smoke tests are valuable and should be preserved, but many of their assertions pin fake labels and fake transcript content that this plan must deliberately remove.
- The current route smoke tests also pin some ASCII tree glyphs and placeholder prose. Those assertions are not good long-term acceptance criteria for this scaffold rewrite.
- The repo baseline is healthy. `npm run lint`, `npm run test`, and `npm run typecheck` pass in the sandbox, and `npm run build` passes outside the sandbox after the expected Wrangler/Docker home-directory write issue.
- The target-model handoff and migration work were done in an existing Codex worktree rather than inside this repo checkout. The plan therefore restates the relevant target-model UI constraints here so execution is not blocked on external chat context.
- Phase 1 exposed one compatibility seam immediately: existing run route scaffolds still import `runPhaseDefinitions` from `ui/src/shared/navigation/run-phases.ts`, so the new canonical phase metadata must be re-exported there until the later feature cutovers stop depending on the legacy modules.
- The first Phase 1 implementation also exposed that a project override shim has to remap project-scoped scaffold resources, not just the top-level `projects` list, or future project selectors silently fall back to empty states.
- Adding real run summary metadata to the shared run-detail header made one existing Phase 3 smoke test ambiguous because the run summary text duplicated a task title. The durable fix was to scope that assertion to the task-detail section instead of asserting global text uniqueness.

## Outcomes & Retrospective

Planning outcome on 2026-04-19:

- The UI scaffold rewrite now has a dedicated active plan instead of living only in chat context.
- The key unresolved UI questions are already closed for planning: `Workstreams` is project-scoped tasks, `/runs/:runId` uses the approved derived default-phase rule, and conversations are locators rather than embedded transcript data.
- The plan intentionally preserves the route tree and limits scope to scaffold composition and modular React practices, which keeps the user-visible goal crisp and the phase boundaries small.
- The revised phase split now treats Documentation and Project Configuration separately, which better matches the current feature tree and reduces execution risk.
- Execution can begin once the user approves the phase sequence and the target-model scaffold module layout described here.

Phase 1 outcome on 2026-04-19:

- The repo now has a dedicated `ui/src/features/resource-model/` foundation that models `project`, `run`, `document`, `documentRevision`, `task`, `workflowGraph`, and `artifact` resources directly instead of scattering fake destination-local contracts.
- The checked-in scaffold dataset now supports shared selectors for current project, run summaries, derived default-phase selection, planning documents, documentation grouping, workstreams, workflow graphs, and task artifacts without introducing live fetching or a global store.
- `ui/src/features/projects/project-context.tsx` is now a compatibility layer over the shared provider seam, which preserves the existing shell contract while giving later phases a stable place to plug in target-model selectors.
- Validation stayed green after re-exporting canonical run-phase definitions through `ui/src/shared/navigation/run-phases.ts`, confirming the foundation can coexist with the current route-local scaffold consumers until later cutover phases.

Phase 1 targeted fix pass outcome on 2026-04-19:

- `createProjectOverrideDataset()` now remaps runs, documents, and tasks that belong to the scaffold default project so the compatibility layer stays coherent for project-scoped selectors without introducing new route behavior.
- `ui/src/test/resource-model-selectors.test.tsx` now verifies both the override-dataset behavior and the `ResourceModelProvider` contract for `currentProjectId`, `setCurrentProjectId`, and `meta.source`, closing the main coverage gap surfaced in review.

Phase 2 outcome on 2026-04-19:

- `ui/src/features/runs/use-runs-index-view-model.ts`, `use-run-view-model.ts`, and `ui/src/routes/runs/run-default-phase-route.tsx` now derive run stage labels, run header state, planning selections, and `/runs/:runId` redirects from the shared target-model dataset instead of `run-scaffold.ts`.
- The planning routes now render explicit `SpecificationWorkspace`, `ArchitectureWorkspace`, and `ExecutionPlanWorkspace` variants over a shared planning frame that shows document revisions plus conversation locator metadata, removing fake transcript arrays and fake composer state from the Phase 2 contract.
- `ui/src/test/runs-routes.test.tsx` now asserts derived redirect behavior and planning-route structure, while `ui/src/test/phase3-destinations.test.tsx` was tightened so the richer shared run header does not create brittle global text collisions.

## Context and Orientation

The current repo state relevant to this plan is:

- `ui/src/routes/router.tsx` already defines the correct top-level shell and nested run routes: `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings`.
- `ui/src/features/runs/run-scaffold.ts` is the current fake source of truth for runs, planning phases, tasks, task detail, and redirect state. It is the main contract that needs to be retired.
- `ui/src/features/runs/use-run-view-model.ts`, `ui/src/features/runs/use-runs-index-view-model.ts`, and `ui/src/routes/runs/run-default-phase-route.tsx` currently depend on that fake run scaffold.
- `ui/src/features/execution/use-execution-view-model.ts`, `ui/src/features/execution/components/execution-workspace.tsx`, and `ui/src/features/execution/components/task-detail-workspace.tsx` currently use scaffold task and review data rather than target-model task/workflow/artifact concepts.
- `ui/src/features/documentation/documentation-scaffold.ts` and `ui/src/features/documentation/use-documentation-view-model.ts` currently hard-code documentation groups and static content.
- `ui/src/features/workstreams/workstreams-scaffold.ts` and `ui/src/features/workstreams/use-workstreams-view-model.ts` currently maintain a separate hand-built row model rather than deriving from project tasks.
- `ui/src/features/projects/project-context.tsx`, `ui/src/features/projects/project-configuration-scaffold.ts`, and `ui/src/features/projects/use-project-configuration-view-model.ts` provide the current project/settings scaffold state.
- `ui/src/shared/navigation/run-phases.ts` owns run-phase path helpers and should remain the canonical route-path helper module while the default-phase logic changes.
- `ui/src/test/app-shell.test.tsx`, `ui/src/test/runs-routes.test.tsx`, `ui/src/test/phase3-destinations.test.tsx`, and `ui/src/test/render-route.tsx` are the current UI smoke coverage surface.
- `ui/src/test/phase3-destinations.test.tsx` currently asserts placeholder prose and tree glyphs in a few places; those assertions should be rewritten toward structural route/selection behavior instead of preserved.
- `.ultrakit/developer-docs/m1-architecture.md` documents the current UI scaffold architecture and will need a final update once this plan lands.
- `design/workspace-spec.md`, `design/design-guidelines.md`, and `design/README.md` remain the local design source of truth for destination boundaries and shell behavior.

The target-model constraints that execution must treat as fixed are:

- the core scaffold nouns are `project`, `run`, `document`, `documentRevision`, `task`, `workflowGraph`, and `artifact`,
- `Workstreams` is a project-scoped task listing,
- planning documents and task detail can expose optional conversation locators,
- `/runs/:runId` does not regain a `currentPhase` field and must derive its redirect target from compiled tasks and available planning documents,
- the UI remains scaffold-only and should not imply that chat transport or live fetch/caching has already been implemented.

## Plan of Work

Phase 1 establishes a new normalized scaffold resource layer under `ui/src/features/resource-model/`. This is the replacement for the current scattered fake scaffolds. It should define the target-model-aligned types, a checked-in scaffold dataset, selector/helper functions for current project, runs, planning documents, workflow graph, task detail, workstreams, and documentation grouping, plus a light provider/context seam for destinations that need shared `state/actions/meta` wiring. The goal of the phase is not to re-render every destination yet; it is to create the single source of truth the rest of the scaffold can safely build from.

Phase 2 rewires the `Runs` surfaces and planning routes onto that new resource layer. The run index should stop depending on fake `summary`/`currentPhase` contracts, the run-detail header and stepper should read from real run/planning-document selectors, and `/runs/:runId` should implement the approved default-phase rule. The planning UI should still be scaffold-only, but its state should now derive from planning documents and conversation locators rather than fake per-phase transcript arrays. Any shared planning frame should sit underneath explicit route-facing variants instead of one mode-heavy workspace component.

Phase 3 rewires `Execution`, task detail, and `Workstreams`. The execution board should be driven from a workflow-graph projection rather than hand-built node arrays. Task detail should compose from task metadata, optional conversation locator state, and artifact/review placeholders. `Workstreams` should become a project-scoped task projection backed by the shared resource layer, with route links into the existing run execution task detail path.

Phase 4 rewires `Documentation`. The documentation tree and selected viewer state should derive from project/run documents and current revisions rather than from hand-authored groups. The goal is to make Documentation the first destination that fully proves document-driven scaffold derivation without also taking on project-form concerns in the same phase.

Phase 5 rewires project creation and settings. The route structure should stay the same, but the scaffold view models should align with the target project and repository/component contract instead of a separate one-off local scaffold. Any shared project configuration frame should remain below explicit `new` and `settings` variants rather than becoming a mode-driven catch-all component.

Phase 6 closes the loop. It removes obsolete scaffold modules that were replaced during the cutover, updates the relevant developer docs to describe the new scaffold architecture accurately, and reruns the repo baseline so the finished plan leaves a clean, documented state for the next contributor.

### Phase 1: Target-Model Resource Foundation

#### Phase Handoff

- **Status:** Complete (fixed after review)
- **Goal:** Create the shared target-model scaffold resource layer and selectors that will replace the current destination-local fake scaffold modules.
- **Scope Boundary:** In scope: normalized UI scaffold types, checked-in scaffold dataset, selectors/helpers, and any small compatibility shims needed so later phases can cut over cleanly. Out of scope: destination rewrites, route behavior changes, styling work, and live data fetching.
- **Read First:**
  - `design/workspace-spec.md`
  - `.ultrakit/developer-docs/m1-architecture.md`
  - `ui/src/routes/router.tsx`
  - `ui/src/features/runs/run-scaffold.ts`
  - `ui/src/features/documentation/documentation-scaffold.ts`
  - `ui/src/features/workstreams/workstreams-scaffold.ts`
  - `ui/src/features/projects/project-context.tsx`
- **Files Expected To Change:**
  - `ui/src/features/resource-model/types.ts` (new)
  - `ui/src/features/resource-model/scaffold-dataset.ts` (new)
  - `ui/src/features/resource-model/selectors.ts` (new)
  - `ui/src/features/resource-model/run-phase.ts` (new)
  - `ui/src/features/resource-model/context.tsx` (new)
  - `ui/src/features/projects/project-context.tsx`
  - `ui/src/shared/navigation/run-phases.ts`
  - `ui/src/test/` route or selector tests as needed
- **Validation:** Run `rtk npm run lint`, `rtk npm run test`, and `rtk npm run typecheck` from the repo root. Success means the new modules compile, the selector/provider layer is covered by at least one focused test, and existing UI smoke tests still pass.
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.
- **Deliverables:** A normalized scaffold resource module with target-model-aligned types, selectors, and a lightweight context/provider interface, plus enough compatibility wiring that later phases can stop importing destination-local fake data.
- **Commit Expectation:** `Create target-model UI scaffold resources`
- **Known Constraints / Baseline Failures:** Do not introduce a live data client. Keep `shared/` free of app-domain scaffold state. Preserve the existing route tree. Do not add new barrel files in `resource-model/`.
- **Completion Notes:** Added `ui/src/features/resource-model/{types,scaffold-dataset,selectors,run-phase,context}.ts*`, rewired `ui/src/features/projects/project-context.tsx` to use the shared provider seam, re-exported canonical phase definitions through `ui/src/shared/navigation/run-phases.ts`, and added focused selector/provider coverage in `ui/src/test/resource-model-selectors.test.tsx`. The targeted fix pass then updated `createProjectOverrideDataset()` to remap project-scoped scaffold resources coherently and expanded test coverage to exercise mutable provider state plus `meta.source`. Validation passed with `rtk npm run lint`, `rtk npm run test`, and `rtk npm run typecheck`.
- **Next Starter Context:** Phase 2 should treat `ui/src/features/resource-model/` as the only new source of truth. The Phase 1 compatibility seam now keeps override projects coherent for runs, tasks, and project documents, so later cutovers can consume project-scoped selectors directly without special-case shim logic.

### Phase 2: Runs And Planning Cutover

#### Phase Handoff

- **Status:** Complete
- **Goal:** Rework the `Runs` index, run detail shell, planning routes, and default-phase redirect to derive from the shared target-model scaffold resources.
- **Scope Boundary:** In scope: runs index scaffolding, run header/stepper view models, planning workspace composition, and `/runs/:runId` redirect logic. Out of scope: execution/task detail, project-level workstreams, documentation, styling redesign, and live fetch wiring.
- **Read First:**
  - `.ultrakit/exec-plans/active/keystone-ui-target-model-scaffold.md`
  - `ui/src/features/resource-model/*`
  - `ui/src/routes/runs/run-default-phase-route.tsx`
  - `ui/src/features/runs/use-runs-index-view-model.ts`
  - `ui/src/features/runs/use-run-view-model.ts`
  - `ui/src/features/runs/components/run-detail-scaffold.tsx`
  - `ui/src/features/runs/components/run-phase-stepper.tsx`
  - `ui/src/features/runs/components/planning-workspace.tsx`
  - `ui/src/test/runs-routes.test.tsx`
- **Files Expected To Change:**
  - `ui/src/routes/runs/run-default-phase-route.tsx`
  - `ui/src/routes/runs/runs-index-route.tsx`
  - `ui/src/routes/runs/specification-route.tsx`
  - `ui/src/routes/runs/architecture-route.tsx`
  - `ui/src/routes/runs/execution-plan-route.tsx`
  - `ui/src/features/runs/use-runs-index-view-model.ts`
  - `ui/src/features/runs/use-run-view-model.ts`
  - `ui/src/features/runs/components/run-detail-scaffold.tsx`
  - `ui/src/features/runs/components/run-phase-stepper.tsx`
  - `ui/src/features/runs/components/planning-workspace.tsx` or split successor files
  - `ui/src/features/runs/components/specification-workspace.tsx` (new, if split)
  - `ui/src/features/runs/components/architecture-workspace.tsx` (new, if split)
  - `ui/src/features/runs/components/execution-plan-workspace.tsx` (new, if split)
  - `ui/src/test/runs-routes.test.tsx`
  - `ui/src/test/app-shell.test.tsx` if route labels or assertions need to follow the new scaffold shape
- **Validation:** Run `rtk npm run lint`, `rtk npm run test`, and `rtk npm run typecheck`. Success means `/runs`, `/runs/:runId`, and the three planning routes render against the new selectors, and the default redirect follows the approved rule instead of `currentPhase`.
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.
- **Deliverables:** Target-model-based run/planning view models, explicit planning workspace composition or explicit planning route variants, and route tests updated away from fake run phase state and placeholder transcript assertions.
- **Commit Expectation:** `Rework run scaffold around target model`
- **Known Constraints / Baseline Failures:** Do not add `currentPhase` back into any scaffold contract. Avoid a single mode-switching planning workspace with boolean props. Keep tests focused on structural route behavior rather than transcript copy.
- **Completion Notes:** Reworked the runs index and run-detail shell onto resource-model selectors, added selector-backed run header and phase-stepper view models, replaced the shared fake planning transcript workspace with explicit specification/architecture/execution-plan variants over a document-plus-conversation-locator frame, and changed `/runs/:runId` to redirect via `getRunSummary(...).defaultPhaseId` instead of `currentPhase`. Updated `ui/src/test/runs-routes.test.tsx` to assert derived redirect behavior and planning structure, and tightened one `ui/src/test/phase3-destinations.test.tsx` assertion so the richer run header does not create ambiguous text matches. Validation passed with `rtk npm run lint`, `rtk npm run test`, and `rtk npm run typecheck`.
- **Next Starter Context:** Phase 3 can now treat the run shell and planning routes as fully cut over to `ui/src/features/resource-model/`. The remaining legacy run-scaffold dependency is execution/task detail, so the next pass should replace those execution/task contracts without reintroducing fake planner transcript state or `currentPhase`.

### Phase 3: Execution And Workstreams Cutover

#### Phase Handoff

- **Status:** Pending
- **Goal:** Rework execution, task detail, and workstreams so they compose from workflow graph, tasks, artifacts, and conversation locators instead of hand-authored execution/task/workstream rows.
- **Scope Boundary:** In scope: execution board composition, task detail composition, project-scoped workstreams projection, and related route smoke tests. Out of scope: documentation, project configuration, live task chat transport, and backend API implementation.
- **Read First:**
  - `.ultrakit/exec-plans/active/keystone-ui-target-model-scaffold.md`
  - `ui/src/features/resource-model/*`
  - `ui/src/features/execution/use-execution-view-model.ts`
  - `ui/src/features/execution/components/execution-workspace.tsx`
  - `ui/src/features/execution/components/task-detail-workspace.tsx`
  - `ui/src/features/workstreams/use-workstreams-view-model.ts`
  - `ui/src/features/workstreams/components/workstreams-board.tsx`
  - `ui/src/routes/runs/execution-route.tsx`
  - `ui/src/routes/runs/task-detail-route.tsx`
  - `ui/src/routes/workstreams/workstreams-route.tsx`
  - `ui/src/test/runs-routes.test.tsx`
  - `ui/src/test/phase3-destinations.test.tsx`
- **Files Expected To Change:**
  - `ui/src/features/execution/use-execution-view-model.ts`
  - `ui/src/features/execution/components/execution-workspace.tsx`
  - `ui/src/features/execution/components/task-detail-workspace.tsx`
  - `ui/src/features/workstreams/use-workstreams-view-model.ts`
  - `ui/src/features/workstreams/components/workstreams-board.tsx`
  - `ui/src/routes/runs/execution-route.tsx`
  - `ui/src/routes/runs/task-detail-route.tsx`
  - `ui/src/routes/workstreams/workstreams-route.tsx`
  - `ui/src/test/runs-routes.test.tsx`
  - `ui/src/test/phase3-destinations.test.tsx`
- **Validation:** Run `rtk npm run lint`, `rtk npm run test`, and `rtk npm run typecheck`. Success means execution renders from workflow-graph/task selectors, task detail exposes locator-based conversation state, and `Workstreams` is now task-derived and still links into `/runs/:runId/execution/tasks/:taskId`.
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.
- **Deliverables:** Target-model-based execution/workstreams view models and updated destination tests that no longer rely on fake execution rows or fake transcript content.
- **Commit Expectation:** `Rework execution and workstreams scaffold`
- **Known Constraints / Baseline Failures:** Keep conversation as a locator only; do not fabricate full task transcript state. Keep workstreams project-scoped and paginated in concept even if the scaffold dataset is finite. Do not add a separate `workstream` source model.
- **Completion Notes:** Not started.
- **Next Starter Context:** Use artifact/review placeholders sparingly and derive them from task/artifact concepts, not bespoke review-file scaffolds.

### Phase 4: Documentation Cutover

#### Phase Handoff

- **Status:** Pending
- **Goal:** Rework Documentation so it derives from target-model documents and revisions while preserving the existing route and shell behavior.
- **Scope Boundary:** In scope: documentation tree/viewer derivation, document selection state, and structural documentation tests. Out of scope: project configuration, styling redesign, document persistence, and route changes.
- **Read First:**
  - `.ultrakit/exec-plans/active/keystone-ui-target-model-scaffold.md`
  - `ui/src/features/resource-model/*`
  - `ui/src/features/documentation/documentation-scaffold.ts`
  - `ui/src/features/documentation/use-documentation-view-model.ts`
  - `ui/src/features/documentation/components/documentation-workspace.tsx`
  - `ui/src/routes/documentation/documentation-route.tsx`
  - `ui/src/test/phase3-destinations.test.tsx`
- **Files Expected To Change:**
  - `ui/src/features/documentation/use-documentation-view-model.ts`
  - `ui/src/features/documentation/components/documentation-workspace.tsx`
  - `ui/src/features/documentation/documentation-scaffold.ts` or replacement modules
  - `ui/src/routes/documentation/documentation-route.tsx`
  - `ui/src/test/phase3-destinations.test.tsx`
- **Validation:** Run `rtk npm run lint`, `rtk npm run test`, and `rtk npm run typecheck`. Success means Documentation derives from target-model documents/revisions and the tests describe structural selection behavior rather than old placeholder copy.
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.
- **Deliverables:** Documentation scaffold aligned with target-model document and revision nouns, with tests updated away from placeholder tree glyph/copy assertions.
- **Commit Expectation:** `Align documentation scaffold with target model`
- **Known Constraints / Baseline Failures:** Do not introduce real save behavior or network calls in this phase. Keep the route tree unchanged.
- **Completion Notes:** Not started.
- **Next Starter Context:** The key acceptance point is document-driven derivation and structural selection behavior, not visual refinement.

### Phase 5: Project Configuration Cutover

#### Phase Handoff

- **Status:** Pending
- **Goal:** Rework project creation and settings scaffolds so they align with target-model project and repository/component contracts while preserving the current route structure.
- **Scope Boundary:** In scope: current-project framing, project configuration view models, explicit `new` versus `settings` variants, and route tests for those surfaces. Out of scope: persistence, styling polish, live mutation flows, and route redesign.
- **Read First:**
  - `.ultrakit/exec-plans/active/keystone-ui-target-model-scaffold.md`
  - `ui/src/features/resource-model/*`
  - `ui/src/features/projects/project-context.tsx`
  - `ui/src/features/projects/project-configuration-scaffold.ts`
  - `ui/src/features/projects/use-project-configuration-view-model.ts`
  - `ui/src/routes/projects/project-configuration-layout.tsx`
  - `ui/src/routes/projects/project-configuration-tab-route.tsx`
  - `ui/src/test/phase3-destinations.test.tsx`
- **Files Expected To Change:**
  - `ui/src/features/projects/project-context.tsx`
  - `ui/src/features/projects/project-configuration-scaffold.ts`
  - `ui/src/features/projects/use-project-configuration-view-model.ts`
  - `ui/src/features/projects/components/project-configuration-tabs.tsx`
  - `ui/src/routes/projects/project-configuration-layout.tsx`
  - `ui/src/routes/projects/project-configuration-tab-route.tsx`
  - `ui/src/test/phase3-destinations.test.tsx`
  - `ui/src/test/app-shell.test.tsx` if route labels or headings change
- **Validation:** Run `rtk npm run lint`, `rtk npm run test`, and `rtk npm run typecheck`. Success means project settings and project creation derive from the shared project/resource model, the current route structure remains intact, and the tests assert route and tab behavior rather than incidental copy.
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.
- **Deliverables:** Project configuration scaffolds aligned with the target-model project and repository/component contract, with explicit `new` and `settings` variants instead of a mode-heavy catch-all.
- **Commit Expectation:** `Align project configuration scaffold`
- **Known Constraints / Baseline Failures:** Keep settings current-project-scoped. Do not introduce real save behavior, network calls, or a single component API dominated by mode booleans.
- **Completion Notes:** Not started.
- **Next Starter Context:** The key acceptance point is clear `new` versus `settings` composition over the same contract, not form completeness.

### Phase 6: Cleanup, Docs, And Final Validation

#### Phase Handoff

- **Status:** Pending
- **Goal:** Remove replaced scaffold modules, update developer documentation to match the new architecture, and rerun final validation on the completed tree.
- **Scope Boundary:** In scope: deleting obsolete scaffold modules, small import cleanup, developer doc updates, and final baseline validation. Out of scope: new features, styling polish, live API integration, or reopening the earlier phases' design decisions.
- **Read First:**
  - `.ultrakit/exec-plans/active/keystone-ui-target-model-scaffold.md`
  - `.ultrakit/developer-docs/m1-architecture.md`
  - `.ultrakit/developer-docs/m1-local-runbook.md`
  - `ui/src/features/` modules touched by earlier phases
  - `ui/src/test/` coverage files
- **Files Expected To Change:**
  - `.ultrakit/developer-docs/m1-architecture.md`
  - `.ultrakit/developer-docs/m1-local-runbook.md` (only if the current runbook becomes inaccurate)
  - `ui/src/features/runs/run-scaffold.ts` (delete or reduce to a compatibility shim)
  - `ui/src/features/documentation/documentation-scaffold.ts` (delete or reduce to a compatibility shim)
  - `ui/src/features/workstreams/workstreams-scaffold.ts` (delete or reduce to a compatibility shim)
  - `ui/src/test/*` as needed for final truthfulness
  - `.ultrakit/exec-plans/active/index.md` and archive paths when the plan completes
- **Validation:** Run `rtk npm run lint`, `rtk npm run test`, and `rtk npm run typecheck` in the sandbox. Run `rtk npm run build` from a host-permitted shell if the sandbox still blocks Wrangler/Docker home-directory writes. Success means the repo baseline passes, the docs no longer describe the UI as destination-local fake scaffolds, and there are no lingering barrel files or duplicate scaffold sources introduced by this plan.
- **Plan / Docs To Update:** Update all living sections, then archive the plan when acceptance is met.
- **Deliverables:** Clean scaffold source tree, updated developer docs, and final validation evidence recorded in the plan.
- **Commit Expectation:** `Document target-model UI scaffold`
- **Known Constraints / Baseline Failures:** `npm run build` may still require a host shell on this machine because Wrangler/Docker write outside the sandbox. Do not leave dead scaffold modules presenting a second source of truth.
- **Completion Notes:** Not started.
- **Next Starter Context:** This is the doc-and-truthfulness closure pass; use it to delete compatibility shims that earlier phases no longer need.

## Concrete Steps

Run all commands from `/home/chanzo/code/large-projects/keystone-cloudflare`.

1. Baseline before execution:

```bash
rtk npm run lint
rtk npm run test
rtk npm run typecheck
rtk npm run build
```

Expected result:

- `lint`, `test`, and `typecheck` pass in the sandbox.
- `build` passes when run outside the sandbox boundary if Wrangler/Docker home-directory writes fail in Codex.

2. Phase 1 foundation work:

```bash
rtk npm run lint
rtk npm run test
rtk npm run typecheck
```

Expected result:

- new `resource-model` modules compile and existing route tests still pass.

3. After each implementation phase:

```bash
rtk npm run lint
rtk npm run test
rtk npm run typecheck
```

Expected result:

- no regression in the route smoke suite,
- no TypeScript or ESLint regressions,
- the plan's `Progress`, `Execution Log`, and `Surprises & Discoveries` sections are updated before handoff.

4. Final closure:

```bash
rtk npm run lint
rtk npm run test
rtk npm run typecheck
rtk npm run build
```

Expected result:

- the finished scaffold tree validates cleanly,
- any remaining host-only `build` caveat is explicitly recorded with the same Wrangler/Docker home-directory explanation,
- the plan can be archived without leaving stale docs or duplicate scaffold sources.

## Validation and Acceptance

The plan is accepted only when all of the following are true:

- `Runs`, `Documentation`, `Workstreams`, `Project settings`, and run execution/task detail still render through the existing route tree,
- the UI scaffold source of truth is the shared target-model resource layer rather than destination-local fake scaffold files,
- destination stateful seams are exposed through provider or hook contracts that keep UI components decoupled from scaffold implementation details,
- `/runs/:runId` redirects through the approved derived rule and no scaffold contract reintroduces `currentPhase`,
- `Workstreams` derives from project tasks rather than a separate hand-built row model,
- planning and task conversations are modeled as optional locators, not embedded transcript arrays,
- route containers remain thin and feature modules own destination composition,
- no new barrel files are added in the rewritten UI scaffold,
- new helper components introduced by the rewrite are module-scoped rather than defined inside render functions,
- tests assert structural route behavior, selection state, and link targets rather than incidental placeholder prose or transcript lines,
- `rtk npm run lint`, `rtk npm run test`, and `rtk npm run typecheck` pass,
- `rtk npm run build` passes on a host-permitted shell if the Codex sandbox still blocks Wrangler/Docker home-directory writes,
- `.ultrakit/developer-docs/m1-architecture.md` accurately describes the new scaffold architecture.

## Idempotence and Recovery

This plan is safe to execute incrementally.

- Phase 1 is the recovery anchor. If a later phase becomes inconsistent, recheck the `resource-model` selectors first and make sure no destination has recreated its own source-of-truth data.
- Do not delete old scaffold modules until the phase that replaces their consumers is complete and validated. Earlier phases may keep a temporary compatibility shim if needed, but the replacement path must be obvious.
- If a route test fails after a phase cutover, prefer updating the destination view model and tests together rather than adding back fake fields solely to satisfy an old assertion.
- If `npm run build` fails only on Wrangler/Docker writes under `~/.config/.wrangler` or `~/.docker`, treat that as the known environment caveat and rerun the command outside the sandbox instead of changing app code.
- If a phase grows beyond a single-agent scope, stop after the last validated subset, update `Progress` and the phase handoff with the remaining split, and re-plan before continuing.

## Artifacts and Notes

- Local design sources that constrain this plan:
  - `design/README.md`
  - `design/design-guidelines.md`
  - `design/workspace-spec.md`
- Local repo developer docs that must stay accurate:
  - `.ultrakit/developer-docs/m1-architecture.md`
  - `.ultrakit/developer-docs/m1-local-runbook.md`
- Current baseline evidence from planning on 2026-04-19:
  - `npm run lint` passed
  - `npm run test` passed with `33` files passed and `2` skipped, `147` tests passed and `8` skipped
  - `npm run typecheck` passed
  - `npm run build` passed outside the sandbox after the sandbox-only Wrangler/Docker write failure
- Target-model UI constraints restated in this plan came from the existing Keystone modelling work already reviewed during discovery; execution should rely on the decisions written here rather than on external chat context.

## Interfaces and Dependencies

Important modules and interfaces involved in this plan:

- `ui/src/routes/router.tsx`: canonical route tree that must remain stable.
- `ui/src/shared/navigation/run-phases.ts`: path helpers for run-phase navigation; keep it authoritative for route construction.
- `ui/src/features/resource-model/types.ts` (new): target-model-aligned scaffold types.
- `ui/src/features/resource-model/scaffold-dataset.ts` (new): checked-in scaffold data shaped like the target model.
- `ui/src/features/resource-model/selectors.ts` (new): derived selectors for runs, documents, tasks, workstreams, workflow graph, and current project.
- `ui/src/features/resource-model/run-phase.ts` (new): default-phase derivation helpers and any run-phase selection logic that should stay outside routes/components.
- `ui/src/features/resource-model/context.tsx` (new): lightweight provider/context contract for destinations that need shared `state`, `actions`, and `meta` wiring.
- `ui/src/features/runs/*`: destination hooks and planning/run components that should compose from the shared resource layer.
- `ui/src/features/execution/*`: execution board and task-detail composition, including locator-based conversation state and artifact/review placeholders.
- `ui/src/features/documentation/*`: documentation tree/viewer composition derived from documents and revisions.
- `ui/src/features/workstreams/*`: project-scoped task projection and list composition.
- `ui/src/features/projects/*`: current-project selector usage plus project configuration scaffold state aligned with project/component contracts.
- `ui/src/test/*`: route and destination smoke coverage that must stay truthful as scaffold contracts change.

Feature-facing state contracts during this plan should follow a simple pattern:

- `state`: derived view state the destination renders
- `actions`: local destination actions such as selection or tab changes
- `meta`: route/context information and structural references that should not be mixed into render data

The goal is not to build a heavy state framework. The goal is to make later live data wiring possible without rewriting the presentational scaffold tree.

At the end of the plan, the UI should still be scaffold-only, but the scaffold should be modular, target-model-aligned, and ready for later live API wiring without another large composition rewrite.
