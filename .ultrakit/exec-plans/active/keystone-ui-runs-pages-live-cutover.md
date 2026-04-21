# Keystone UI Runs Pages Live Cutover

## Purpose / Big Picture

This plan turns the `Runs` destination from a split live/scaffold compromise into a truthful operator workspace for API-backed runs. After this work lands, an operator should be able to:

- open the selected project's run list and create a new run from the real `POST /v1/projects/:projectId/runs` contract,
- open any live run row into a real run-detail workspace instead of stopping at the index,
- work through `Specification`, `Architecture`, and `Execution Plan` as live run-scoped documents rather than scaffold-only placeholders,
- compile a run once those planning documents exist,
- move into `Execution`, inspect the live workflow DAG, and drill into a task detail surface that shows truthful task metadata and artifact inspection states.

From the user's perspective, success means `Runs` behaves like the product described in `design/workspace-spec.md` and `design/design-guidelines.md`, not like a static demo overlay:

- the `Runs` index is still project-scoped and honest,
- `+ New run` is a real action,
- run detail is live for API-backed runs,
- planning pages show the real current run documents or explicit empty states,
- `Execution` is backed by the run's actual workflow and task APIs,
- the UI uses explicit loading, empty, error, and compatibility states instead of falling back to scaffold data.

This plan is about product behavior, state ownership, API seams, and user experience structure first. Styling changes are incidental only.

## Backward Compatibility

Backward compatibility with the current scaffold-backed run-detail implementation is **not required**. The existing live behavior intentionally stops at the `Runs` index because the detail pages are still scaffold-only. The user explicitly asked to plan the real `Runs` pages and to follow the UI architecture rules in `ui/AGENTS.md`.

Compatibility that **is** required:

- preserve the product structure and terminology from `design/workspace-spec.md`,
- keep route URLs stable under `/runs`, `/runs/:runId`, and `/runs/:runId/execution/tasks/:taskId`,
- keep route files thin and feature-owned state under `ui/src/features/`,
- keep `Documentation` and `Workstreams` out of scope except where shared shell changes must avoid regressions,
- keep auth handling centralized in the existing browser API seam rather than spreading auth-specific UI logic across the run pages,
- keep the UI honest about backend gaps rather than faking unavailable content.

## Design Decisions

1. **Date:** 2026-04-20  
   **Decision:** Scope this plan to the full `Runs` family: runs index, live run detail shell, planning-phase pages, execution DAG, task detail, and the `+ New run` launcher.  
   **Rationale:** The current repo already made the `Runs` index live, but the rest of the destination still depends on scaffold selectors. Treating only one subpage at a time would continue the split-brain product model the workspace spec is trying to avoid.  
   **Alternatives considered:** limit the plan to run-detail read-only pages; defer `+ New run`; keep execution/task detail scaffold-backed.

2. **Date:** 2026-04-20  
   **Decision:** Keep route files thin and move live run state ownership into feature-owned seams under `ui/src/features/runs/` and `ui/src/features/execution/`, using `state` / `actions` / `meta` provider contracts where multiple siblings must coordinate.  
   **Rationale:** This follows `ui/AGENTS.md`, `vercel-composition-patterns`, and the repo-wide guidance to keep destination logic out of routes and shared primitives. The current scaffold hooks in `resource-model` are no longer the right owner for live run behavior.  
   **Alternatives considered:** add more fetch logic directly to route files; keep growing the scaffold `resource-model` to simulate live run behavior.

3. **Date:** 2026-04-20  
   **Decision:** Introduce a dedicated run API seam for the UI instead of continuing to hang run-detail behavior off `ui/src/features/projects/project-management-api.ts`.  
   **Rationale:** Project selection is project-management state. Run detail is destination-specific state with different loading, mutation, and validation needs. Splitting these responsibilities keeps ownership clearer and follows the repo's UI guidance.  
   **Alternatives considered:** keep all project and run calls in one `project-management-api.ts` module; call `fetch()` ad hoc inside run hooks.

4. **Date:** 2026-04-20  
   **Decision:** Treat live run detail as the source of truth and retire `resource-model` ownership for the `Runs` family in the real app. Static scaffold fixtures may remain only in tests or other still-scaffolded destinations.  
   **Rationale:** `ui/src/features/runs/use-run-view-model.ts` and `ui/src/features/execution/use-execution-view-model.ts` currently resolve all run detail through scaffold selectors. That is incompatible with live project switching and with the now-live project-scoped run index.  
   **Alternatives considered:** keep a hybrid live/scaffold resolver for run detail; rewrite scaffold datasets per current project the way the older compatibility layer did.

5. **Date:** 2026-04-20  
   **Decision:** Add the minimal backend read contracts the UI needs instead of fabricating missing data in the browser.  
   **Rationale:** Discovery showed two concrete gaps:
   - the public run-document routes expose `currentRevisionId` but not a read path for the current revision metadata/body,
   - the backend already has `listTaskArtifactsHandler`, but the run router no longer mounts a task-artifacts route.
   
   The UI cannot truthfully render planning documents or task review content without closing those gaps.  
   **Alternatives considered:** keep planning pages read-only placeholders forever; derive fake content from scaffold data; show broken deep links or empty review panes without explaining why.

6. **Date:** 2026-04-20  
   **Decision:** Keep the planning-phase layout structurally consistent with the design docs, but let the right pane become an editor when the operator is authoring a run document.  
   **Rationale:** `design/design-guidelines.md` says `Specification`, `Architecture`, and `Execution Plan` share one structural layout: agent/chat on the left, living document on the right. A live editable document still fits that model better than introducing a separate modal or wizard.  
   **Alternatives considered:** create a separate full-page editor route; move editing controls into the left pane.

7. **Date:** 2026-04-20  
   **Decision:** Make all three planning phases directly accessible for live runs, even when a document does not exist yet, and use explicit empty states plus creation actions instead of disabling those phase links.  
   **Rationale:** The stepper is a navigable run workspace, not a locked wizard. A missing document is an honest empty state, not a reason to hide the phase.  
   **Alternatives considered:** disable missing phases; preserve the scaffold rule that a phase only exists once scaffold content exists.

8. **Date:** 2026-04-20  
   **Decision:** Keep `Execution` disabled until the run has compiled workflow state, but once available it should use the live workflow and task APIs rather than scaffold graph projections.  
   **Rationale:** The product model says `Execution` defaults to the DAG. The backend already exposes `GET /v1/runs/:runId/workflow` and task routes. The UI should use those directly and only disable `Execution` when the run has not been compiled yet.  
   **Alternatives considered:** always allow `Execution` and show a scaffold graph; hide `Execution` entirely for uncompiled runs.

9. **Date:** 2026-04-20  
   **Decision:** Put the explicit `Compile run` action on the `Execution Plan` page and gate it on the presence of current revisions for `specification`, `architecture`, and `execution-plan`.  
   **Rationale:** The backend compile contract is explicit (`POST /v1/runs/:runId/compile`) and the execution-plan phase is the last planning step before execution. Keeping compile there makes the run flow legible without inventing a separate launcher surface.  
   **Alternatives considered:** compile from the run header; compile from the `Execution` page; auto-compile on save.

10. **Date:** 2026-04-20  
    **Decision:** Use honest execution review rendering instead of preserving the scaffold's diff-specific artifact cards. The live task sidebar should show artifact records, lazily load supported text content, and use explicit compatibility messaging for unsupported artifact kinds or empty task outputs.  
    **Rationale:** The live artifact API exposes artifact metadata plus `contentUrl`, not the scaffold's pre-shaped diff lines. The UI should adapt to the real contract rather than forcing the backend to pretend every artifact is a one-pane diff.  
    **Alternatives considered:** synthesize fake diff blocks from metadata only; keep the entire review sidebar scaffold-only.

11. **Date:** 2026-04-20  
    **Decision:** Keep mutation side effects in explicit event handlers and derive view state during render or provider load functions; do not drive run creation, document saves, or compile transitions through effect-triggered flags.  
    **Rationale:** This follows `ui/AGENTS.md` and `vercel-react-best-practices`, and avoids redundant mirrored state and brittle sequencing around mutations and route changes.  
    **Alternatives considered:** use `useEffect` to detect draft changes and auto-save; submit create/compile mutations from status flags.

12. **Date:** 2026-04-20  
    **Decision:** Keep styling and animation work out of scope except where small changes are necessary to keep the live states readable in the existing shell.  
    **Rationale:** The repo's UI instructions explicitly prioritize behavior, composition, and user experience over polish for this kind of work.  
    **Alternatives considered:** include a visual refresh for the run pages in the same plan.

## Execution Log

- **Date:** 2026-04-20  
  **Phase:** Planning  
  **Decision:** Treat this as a new active plan rather than appending to the earlier project-management plan.  
  **Rationale:** The previous plan intentionally stopped at the live `Runs` index and recorded live run detail as out of scope. This work is the next product slice.

- **Date:** 2026-04-20  
  **Phase:** Planning  
  **Decision:** Read the full design markdown set under `design/`, not only `workspace-spec.md` and `design-guidelines.md`.  
  **Rationale:** The user explicitly asked for the broader design context, and `design/README.md` plus `design/external-reference/README.md` clarify what is target truth versus inspiration.

- **Date:** 2026-04-20  
  **Phase:** Planning  
  **Decision:** Record `typecheck` in the baseline even though the planning-stage skill only strictly requires broad test/lint/build runs.  
  **Rationale:** The repo exposes `typecheck` as a broad script, and the current binding-related failure is useful context for future execution phases.

- **Date:** 2026-04-20  
  **Phase:** Phase 1  
  **Decision:** Start execution with the backend read seams before touching the live UI provider cutover.  
  **Rationale:** The plan already identified missing backend read routes as the only hard blocker for truthful planning-page and task-artifact reads, so landing those seams first keeps later UI phases additive instead of forcing browser-side workarounds.

- **Date:** 2026-04-20  
  **Phase:** Phase 1  
  **Decision:** Expose run revision reads at `GET /v1/runs/:runId/documents/:documentId/revisions/:documentRevisionId` and reuse the existing artifact content route via an additive `contentUrl` field on document revisions. Mount task artifact reads at `GET /v1/runs/:runId/tasks/:taskId/artifacts`.  
  **Rationale:** This is the smallest truthful browser contract that keeps document and artifact ownership explicit. The UI can read current revision metadata from a dedicated route and fetch revision bodies from the already-public artifact content surface without inventing scaffold data or redesigning the document system.

- **Date:** 2026-04-20  
  **Phase:** Phase 1  
  **Decision:** Close the Phase 1 review pass with route-specific HTTP assertions for `document_revision_not_found` on the run document revision read and `task_not_found` on the mounted task-artifacts collection route.  
  **Rationale:** The implementation was already correct, but the reviewer identified that the new route-specific 404 branches were still untested. The existing fixtures can exercise both branches directly, so the fix stays test-only and within the original phase boundary.

- **Date:** 2026-04-20  
  **Phase:** Phase 2  
  **Decision:** Keep live run detail state in a run-owned provider that preloads run, document, workflow, and task collections, then lazy-load task artifacts per selected task.  
  **Rationale:** The layout header, phase stepper, default-phase redirect, and planning routes all need the same base snapshot, but task artifacts are only needed on the task-detail branch. This keeps the provider seam feature-owned without widening the initial load to every artifact collection.

- **Date:** 2026-04-20  
  **Phase:** Phase 2  
  **Decision:** Reuse the protected browser-header helper from `ui/src/features/projects/project-management-api.ts` inside the new run API seam.  
  **Rationale:** The repo already records that protected browser requests should not duplicate local dev-auth header logic. Reusing the existing helper keeps auth wiring centralized while the new run feature remains the owner of run-detail reads.

- **Date:** 2026-04-20
  **Phase:** Phase 2 fix pass
  **Decision:** Close the Phase 2 review findings by making `/runs/:runId` prefer the first incomplete planning step, keying the run-detail provider by `runId`, and routing task-artifact content through the authenticated run API seam instead of raw anchors. Add focused browser-path coverage plus updated destination-scaffold assertions so the live seam is tested end to end.
  **Rationale:** The original cutover landed the live read path, but review showed three contract gaps: default redirects still behaved like a deepest-document chooser, task artifacts exposed unauthenticated content links, and run-to-run navigation could briefly render stale state. The fix pass stays within the original read-only scope while making the seam truthful under real browser loading and route transitions.

## Progress

- [x] 2026-04-20 Discovery completed across the run routes, current UI architecture, backend run/document/task/artifact contracts, the active design markdown files, and the relevant completed plans.
- [x] 2026-04-20 Required planning inputs read:
  - `.ultrakit/notes.md`
  - `.ultrakit/exec-plans/active/index.md`
  - `.ultrakit/exec-plans/plan-contract.md`
  - `ui/AGENTS.md`
  - `design/workspace-spec.md`
  - `design/design-guidelines.md`
  - `design/README.md`
  - `design/external-reference/README.md`
- [x] 2026-04-20 Broad baseline recorded before execution:
  - `rtk npm run test` passes with `35 passed | 2 skipped` files and `203 passed | 18 skipped` tests.
  - `rtk npm run lint` fails on pre-existing repo issues outside this planned UI slice.
  - `rtk npm run typecheck` fails on the pre-existing `tests/lib/db-client-worker.test.ts` Hyperdrive binding mismatch.
  - `rtk npm run build` completes `vite build`, then fails in the sandbox on Wrangler/Docker writes under `~/.config/.wrangler` and `~/.docker/buildx/activity`.
- [x] 2026-04-20 Active execution plan written and registered.
- [x] 2026-04-20 User approved execution of the active runs-page plan.
- [x] 2026-04-20 Phase 1 completed: added run document revision reads, mounted run task artifact collection reads, updated the shared document-revision contract with `contentUrl`, and passed `rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts`.
- [x] 2026-04-20 Phase 1 fix pass completed: added focused HTTP 404 assertions for `document_revision_not_found` and `task_not_found` on the new read routes, reran `rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts`, and closed the review finding without widening scope.
- [x] 2026-04-20 Phase 2 completed: landed `ui/src/features/runs/run-management-api.ts` plus `run-detail-context.tsx`, cut live run header/stepper/default-phase logic over to backend data, rewired planning/execution/task routes to truthful read-only live states, updated route/app-shell tests, and passed `rtk npm run test -- ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx`.
- [x] 2026-04-20 Phase 2 fix pass completed: corrected `/runs/:runId` to land on the first incomplete planning step unless compiled workflow state exists, keyed `RunDetailProvider` by `runId` to avoid stale cross-run renders, replaced raw task-artifact links with authenticated preview loading through `RunManagementApi`, expanded browser-backed/failure route coverage, updated the stale scaffold-era `/runs/...` assertions in `ui/src/test/destination-scaffolds.test.tsx`, and passed `rtk npm run test -- ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx` plus `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx`.

## Surprises & Discoveries

- The current design markdown set under `design/` is intentionally small. The durable product truth is concentrated in `workspace-spec.md`, `design-guidelines.md`, and the two README files.
- The real app already has the correct route tree for `Runs`, but the run detail family is still fully scaffold-backed through `ui/src/features/runs/use-run-view-model.ts` and `ui/src/features/execution/use-execution-view-model.ts`.
- `src/http/api/v1/runs/router.ts` mounts run detail, workflow, and task routes, but it does **not** currently expose the task-artifacts read route even though `src/http/api/v1/runs/handlers.ts` already contains `listTaskArtifactsHandler`.
- The public document contracts expose `currentRevisionId`, but the current run document read surface does not provide a public way for the browser to retrieve the current revision metadata and artifact reference for a live planning page.
- `src/lib/db/documents.ts` already had the needed `getDocumentRevision()` helper, so Phase 1 did not need new persistence helpers. The only contract addition was a shared `contentUrl` on `document_revision` resources so browser consumers can jump straight to artifact content.
- The current live `Runs` index already knows the backend's authoritative live shape (`runId`, `workflowInstanceId`, `executionEngine`, `status`, `compiledFrom`, `startedAt`, `endedAt`), so this plan should not try to recreate scaffold-only fields such as `displayId` or `summary`.
- `ui/src/features/projects/project-context.tsx` still wraps the app with `ResourceModelProvider` as a compatibility layer. That is acceptable for still-scaffolded destinations, but it is the wrong abstraction for live run detail ownership.
- The design guidance is explicit that `Specification`, `Architecture`, and `Execution Plan` are one shared structural layout. The current scaffold components already reflect that visually, which makes them good view shells but poor data owners.
- The task collection route already carries enough task metadata for the read-only task shell (`name`, `description`, `status`, `dependsOn`, `conversation`), so Phase 2 only needed one lazy browser read for per-task artifacts instead of another eager task-detail fetch path.
- The backend artifact collection is intentionally metadata-only today. A truthful live task inspector therefore cannot preserve scaffold-only changed-file paths or inline diffs; it has to present artifact records plus content links until richer artifact projections exist.

## Outcomes & Retrospective

Phase 2 is now closed with the live run-detail cutover and its targeted fix pass in place. The UI reads real run, planning-document, workflow, task, and task-artifact data through feature-owned run providers and API adapters, `/runs/:runId` now lands on the first incomplete planning step until compiled workflow state exists, run-to-run navigation no longer reuses stale provider state, and task-artifact content now stays inside the authenticated API seam instead of exposing broken raw links. Phase 3 remains to add planning-document authoring and compile behavior on top of the new live read seam.

## Context and Orientation

The current repo state relevant to this plan is:

- `ui/src/routes/runs/`
  The `Runs` route tree is already nested correctly:
  - `/runs`
  - `/runs/:runId`
  - `/runs/:runId/specification`
  - `/runs/:runId/architecture`
  - `/runs/:runId/execution-plan`
  - `/runs/:runId/execution`
  - `/runs/:runId/execution/tasks/:taskId`

- `ui/src/features/runs/use-runs-index-view-model.ts`
  The `Runs` index is already live through `GET /v1/projects/:projectId/runs`, with honest loading, empty, and error states. This is the starting point, not something to replace.

- `ui/src/features/runs/use-run-view-model.ts`
  The run header, planning pages, and phase stepper currently depend on scaffold selectors from `ui/src/features/resource-model/selectors.ts`.

- `ui/src/features/execution/use-execution-view-model.ts`
  The execution DAG and task detail also resolve entirely from the scaffold dataset, including scaffold-only artifact diff lines.

- `ui/src/features/runs/components/` and `ui/src/features/execution/components/`
  These files are useful view shells. They already express the product layout from the design docs, but their data assumptions are scaffold-only.

- `ui/src/features/projects/project-context.tsx`
  Current-project selection is live and should remain the owner of selected-project state. It should not become the owner of live run detail state.

- `ui/src/app/app-providers.tsx` and `ui/src/test/render-route.tsx`
  These define how browser and test providers are composed today. Execution phases that introduce run-specific providers or API seams need to keep the test harness usable without reopening the whole app shell.

- `src/http/api/v1/runs/router.ts`
  The backend already serves:
  - `GET /v1/projects/:projectId/runs`
  - `POST /v1/projects/:projectId/runs`
  - `GET /v1/runs/:runId`
  - `GET /v1/runs/:runId/documents`
  - `POST /v1/runs/:runId/documents`
  - `GET /v1/runs/:runId/documents/:documentId`
  - `GET /v1/runs/:runId/documents/:documentId/revisions/:documentRevisionId`
  - `POST /v1/runs/:runId/documents/:documentId/revisions`
  - `POST /v1/runs/:runId/compile`
  - `GET /v1/runs/:runId/workflow`
  - `GET /v1/runs/:runId/tasks`
  - `GET /v1/runs/:runId/tasks/:taskId/artifacts`
  - `GET /v1/runs/:runId/tasks/:taskId`

- `src/http/api/v1/documents/contracts.ts`
  The document resource still exposes `currentRevisionId`. `document_revision` resources now also expose `contentUrl`, so the UI can fetch current revision metadata and then read the body from the artifact content endpoint without extra inference.

- `src/http/api/v1/artifacts/contracts.ts` and `src/http/api/v1/artifacts/handlers.ts`
  Artifact detail and artifact content reads already exist. The UI can use these once it has task artifact ids and document revision artifact ids.

- `design/workspace-spec.md` and `design/design-guidelines.md`
  These are the source of truth for the product structure:
  - `Runs` index first
  - run detail stepper inside a selected run
  - shared planning layout for the first three phases
  - `Execution` as DAG first, then task detail
  - no dashboard drift or fake narration

- `.ultrakit/exec-plans/completed/keystone-ui-project-management-live-wiring.md`
  This is the immediate predecessor. It intentionally made only the `Runs` index live and recorded live run detail as a future plan.

## Plan of Work

First, add the minimal backend read seams the run pages require. The current browser-visible contract is missing a truthful way to read planning document revision metadata/body and does not actually mount the task-artifacts route even though the handler exists. This phase should stay small and additive: expose the missing read routes and cover them with focused HTTP tests.

Second, cut the run-detail shell off the scaffold resource model and onto a live feature-owned run data seam. That includes the run header, stepper, default-phase redirect, the three planning pages in read-only mode, and the execution DAG/task-detail shell states. The goal of this phase is not editing or compile yet; it is establishing live ownership, honest loading/error/empty states, and removing scaffold assumptions from the real app path.

Third, add planning document authoring to the three planning pages. Missing planning documents should become explicit empty states with creation actions. Existing documents should load their current revision and render into an editor/viewer on the right pane with explicit save/discard controls. The provider should own all document fetch/save state so the route components stay thin.

Fourth, wire `+ New run` on the index and make live default-phase behavior match the run's actual state. Run creation should use the selected project, create a real run record, land inside the new run's `Specification` page, and rely on the planning-page empty states rather than auto-seeding fake documents. The run default redirect should prefer the first incomplete planning step and only route to `Execution` when the run has compiled workflow state.

Fifth, add the explicit compile and execution refresh loop. The `Execution Plan` page should expose the `Compile run` action when the three planning documents all have current revisions. On success, the provider should refresh run detail, enable the `Execution` step, and route into the DAG. Task detail should then use the live task-artifact route and artifact content reads to render a truthful review sidebar with supported text preview and honest compatibility states for unsupported content.

Finally, close out with documentation, notes, and broad validation updates. The plan, notes, and any durable developer docs that describe the UI boundary should be updated so future contributors no longer assume run detail is scaffold-only.

## Concrete Steps

1. Review the current live/scaffold boundary and confirm the active baseline:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk npm run test
rtk npm run lint
rtk npm run typecheck
rtk npm run build
```

Expected result:
- `test` passes.
- `lint` and `typecheck` still show the known pre-existing non-plan failures recorded below.
- `build` completes `vite build` and then fails under the sandbox Wrangler/Docker boundary.

2. Land the missing backend read contracts for run-document revisions and task artifacts, plus focused HTTP tests.

3. Introduce the live run UI seam and route-scoped provider, then migrate the run-detail family off scaffold selectors.

4. Add planning document create/save flows and the right-pane editor contract.

5. Wire `+ New run`, default-phase routing, and compile transitions.

6. Update durable docs, rerun the broad validations, and prepare the plan for archival after approval and execution.

## Validation and Acceptance

Acceptance for the full plan means all of the following are true:

- selecting a live project and opening `Runs` shows real project-backed rows and a real `+ New run` action,
- clicking a live run row opens `/runs/:runId` into a truthful live run-detail workspace,
- `Specification`, `Architecture`, and `Execution Plan` render real document content when current revisions exist and explicit empty/editor states when they do not,
- `Execution` is only enabled when compiled workflow state exists and then renders the live DAG,
- task detail shows live task metadata and a truthful artifact inspector instead of scaffold-only diff cards,
- no real run-detail page in the app depends on `resource-model` scaffold selectors,
- route-level and feature-level tests cover live loading, empty, error, create, save, compile, and task-detail states,
- broad validation is rerun and any remaining baseline failures are accurately recorded.

Baseline before execution:

- `rtk npm run test`
  Passes with `35 passed | 2 skipped` files and `203 passed | 18 skipped` tests.

- `rtk npm run lint`
  Pre-existing failure set includes:
  - unused vars in `scripts/demo-validate.ts`, `scripts/run-local.ts`, `src/http/handlers/ws.ts`, `src/keystone/compile/plan-run.ts`, `src/lib/db/schema.ts`, `src/lib/workspace/init.ts`, `src/workflows/RunWorkflow.ts`, `src/workflows/TaskWorkflow.ts`, `tests/lib/project-workspace-materialization.test.ts`, and `tests/lib/workflows/run-workflow-compile.test.ts`,
  - missing `cause` attachments in `src/http/api/v1/documents/handlers.ts` and `src/keystone/integration/finalize-run.ts`,
  - `prefer-const` in `tests/lib/run-records.test.ts`,
  - `no-useless-assignment` in `src/workflows/TaskWorkflow.ts`.

- `rtk npm run typecheck`
  Pre-existing failure:
  - `tests/lib/db-client-worker.test.ts` is missing `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` in the test binding shape.

- `rtk npm run build`
  Current sandbox failure after a successful `vite build`:
  - Wrangler cannot write `~/.config/.wrangler/logs/...`,
  - Docker buildx cannot write under `~/.docker/buildx/activity/...`.

## Idempotence and Recovery

This plan is safe to execute incrementally if each phase keeps its seam additive and its UI states honest.

- Backend route additions should be additive. Do not break existing routes to expose the missing read data.
- The live run-detail cutover should happen behind feature-owned providers and API adapters so phases can be resumed without re-deriving hidden state from routes.
- If a phase stops midway, leave the route family truthful. For example:
  - if live run-detail fetch state exists but document authoring is not done, planning pages must still render explicit read-only or empty states,
  - if task artifact content preview is not yet complete, the review sidebar must still render artifact metadata plus a compatibility message instead of failing.
- When rerunning mutations in development:
  - `POST /v1/projects/:projectId/runs` creates new runs and is not idempotent, so tests and manual validation should use isolated fixtures or explicit assertions on the created run id,
  - document creation should check for existing run-scoped planning documents before creating duplicates,
  - revision writes are append-only by design, so retries should be deliberate and not hidden in effects.
- If host-level build proof is needed later, rerun `rtk npm run build` outside the sandbox boundary rather than trying to work around the known Wrangler/Docker write paths inside the sandbox.

## Artifacts and Notes

- Design references used during discovery:
  - `design/workspace-spec.md`
  - `design/design-guidelines.md`
  - `design/README.md`
  - `design/external-reference/README.md`

- Current live run index seam:
  - `ui/src/features/runs/use-runs-index-view-model.ts`
  - `ui/src/routes/runs/runs-index-route.tsx`

- Current scaffold run-detail seams that this plan should replace in the real app path:
  - `ui/src/features/runs/use-run-view-model.ts`
  - `ui/src/features/execution/use-execution-view-model.ts`
  - `ui/src/features/resource-model/selectors.ts`

- Live run-detail seams landed in Phase 2:
  - `ui/src/features/runs/run-management-api.ts`
  - `ui/src/features/runs/run-detail-context.tsx`
  - `ui/src/features/runs/use-run-view-model.ts`
  - `ui/src/features/execution/use-execution-view-model.ts`
  - `ui/src/routes/runs/run-detail-layout.tsx`

- Backend files most relevant to the missing live read gaps:
  - `src/http/api/v1/runs/router.ts`
  - `src/http/api/v1/runs/handlers.ts`
  - `src/http/api/v1/documents/contracts.ts`
  - `src/http/api/v1/artifacts/contracts.ts`
  - `src/http/api/v1/artifacts/handlers.ts`

- Phase 2 validation artifacts:
  - `ui/src/test/runs-routes.test.tsx`
  - `ui/src/test/app-shell.test.tsx`
  - `.ultrakit/developer-docs/m1-architecture.md`

## Interfaces and Dependencies

- UI provider and routing seams:
  - `ui/src/app/app-providers.tsx`
  - `ui/src/routes/router.tsx`
  - `ui/src/routes/runs/*.tsx`

- Current-project dependency:
  - `ui/src/features/projects/project-context.tsx`

- Existing live project/run collection API seam:
  - `ui/src/features/projects/project-management-api.ts`

- Candidate new run feature seams to introduce:
  - `ui/src/features/runs/run-management-api.ts`
  - `ui/src/features/runs/run-detail-context.tsx`
  - `ui/src/features/runs/use-run-detail-view-model.ts`
  - `ui/src/features/runs/use-planning-document-view-model.ts`
  - `ui/src/features/execution/use-live-execution-view-model.ts`

- Backend routes and contracts:
  - `src/http/api/v1/runs/router.ts`
  - `src/http/api/v1/runs/handlers.ts`
  - `src/http/api/v1/runs/contracts.ts`
  - `src/http/api/v1/documents/contracts.ts`
  - `src/http/api/v1/artifacts/contracts.ts`

- Design truth:
  - `design/workspace-spec.md`
  - `design/design-guidelines.md`

## Phase 1: Backend Read Seams For Live Run Pages

### Phase Handoff

**Goal:** Expose the missing backend read routes the live `Runs` pages need for planning documents and task artifacts.

**Scope Boundary:**  
In scope: additive backend route and contract work for run-document revision reads and task-artifact collection reads, plus focused HTTP coverage.  
Out of scope: UI changes, new auth behavior, or broader document-system redesign.

**Read First:**  
`src/http/api/v1/runs/router.ts`  
`src/http/api/v1/runs/handlers.ts`  
`src/http/api/v1/documents/contracts.ts`  
`src/http/api/v1/artifacts/contracts.ts`  
`.ultrakit/developer-docs/m1-architecture.md`

**Files Expected To Change:**  
`src/http/api/v1/runs/router.ts`  
`src/http/api/v1/runs/handlers.ts`  
`src/http/api/v1/runs/contracts.ts`  
`src/http/api/v1/documents/contracts.ts`  
`tests/http/app.test.ts`  
`tests/http/projects.test.ts` or another focused HTTP test file as needed

**Validation:**  
Run from repo root:

```bash
rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts
```

Success means the new read routes return the expected envelopes and existing run routes still pass their focused HTTP coverage.

**Plan / Docs To Update:**  
Update `Progress`, `Execution Log`, and `Surprises & Discoveries`. Update `Context and Orientation` if the final route shape differs from the planning assumption.

**Deliverables:**  
- One additive read path for run document revisions suitable for browser reads of current revision metadata.
- One mounted task-artifacts collection route for run tasks.
- Focused HTTP tests proving those routes.

**Commit Expectation:**  
`add run document and task artifact read routes`

**Known Constraints / Baseline Failures:**  
- Keep the route changes additive.
- Do not claim a green `lint`, `typecheck`, or sandbox `build`; those already have recorded baseline failures.

**Status:** Completed

**Completion Notes:** Added `GET /v1/runs/:runId/documents/:documentId/revisions/:documentRevisionId` in the run router/handlers, mounted `GET /v1/runs/:runId/tasks/:taskId/artifacts`, added shared `document_revision.contentUrl`, updated focused HTTP coverage in `tests/http/app.test.ts` including the review-driven `document_revision_not_found` and `task_not_found` assertions, and extended the shared revision-contract assertion in `tests/http/projects.test.ts`. Validation passed with `rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts`.

**Next Starter Context:** Phase 2 can rely on `GET /v1/runs/:runId/documents/:documentId/revisions/:documentRevisionId` for live planning-document revision metadata and `GET /v1/runs/:runId/tasks/:taskId/artifacts` for task artifact collections. Revision bodies still flow through `/v1/artifacts/:artifactId/content`, with the shared `document_revision.contentUrl` field now pointing there directly, and the backend seam now has focused coverage for both the success cases and the new route-specific 404 branches.

## Phase 2: Live Run Detail Provider And Read-Only Cutover

### Phase Handoff

**Goal:** Replace scaffold-backed run detail ownership with a live run provider and truthful read-only run pages.

**Scope Boundary:**  
In scope: live run header, phase stepper, default-phase logic, read-only planning pages, execution DAG shell, task-detail shell, and the feature-owned run API/provider seam.  
Out of scope: planning document editing, `+ New run`, compile action, or document/task mutation flows.

**Read First:**  
`ui/AGENTS.md`  
`design/workspace-spec.md`  
`design/design-guidelines.md`  
`ui/src/routes/runs/run-detail-layout.tsx`  
`ui/src/features/runs/use-run-view-model.ts`  
`ui/src/features/execution/use-execution-view-model.ts`  
`ui/src/features/projects/project-context.tsx`  
`ui/src/test/runs-routes.test.tsx`

**Files Expected To Change:**  
`ui/src/routes/runs/run-detail-layout.tsx`  
`ui/src/routes/runs/run-default-phase-route.tsx`  
`ui/src/routes/runs/specification-route.tsx`  
`ui/src/routes/runs/architecture-route.tsx`  
`ui/src/routes/runs/execution-plan-route.tsx`  
`ui/src/routes/runs/execution-route.tsx`  
`ui/src/routes/runs/task-detail-route.tsx`  
`ui/src/features/runs/components/*.tsx`  
`ui/src/features/execution/components/*.tsx`  
`ui/src/features/runs/*`  
`ui/src/features/execution/*`  
`ui/src/app/app-providers.tsx`  
`ui/src/test/render-route.tsx`  
`ui/src/test/runs-routes.test.tsx`

**Validation:**  
Run from repo root:

```bash
rtk npm run test -- ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx
```

Success means live run detail routes render truthful loading, empty, error, and read-only states without scaffold selector dependency in the real app path.

**Plan / Docs To Update:**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and `Artifacts and Notes`.

**Deliverables:**  
- A feature-owned live run provider/API seam.
- Live run header, stepper, and default-phase routing.
- Read-only live planning and execution/task shells.
- Updated route tests using the new live seam.

**Commit Expectation:**  
`cut run detail over to live data`

**Known Constraints / Baseline Failures:**  
- Keep route files thin.
- Do not push run-detail business logic into `ui/src/shared/`.
- The current-project provider should remain the owner of selected-project state only.

**Status:** Completed

**Completion Notes:** Added `ui/src/features/runs/run-management-api.ts` and `run-detail-context.tsx`, reused the protected browser-header seam from project management, rewired `run-detail-layout`, default-phase routing, planning routes, execution DAG, and task detail to live run data, updated the runs index to deep-link live rows, replaced scaffold-only task diffs with truthful artifact metadata, and updated `.ultrakit/developer-docs/m1-architecture.md` to reflect the new live/read-only run-detail boundary. The targeted fix pass then corrected default-phase routing to choose the first incomplete planning step, keyed `RunDetailProvider` by `runId`, replaced raw task-artifact anchors with authenticated preview loading through `RunManagementApi`, added browser-backed provider/failure coverage plus restored architecture/execution-plan and disabled-stepper assertions, and removed stale scaffold-era `/runs/...` expectations from `ui/src/test/destination-scaffolds.test.tsx`. Validation passed with `rtk npm run test -- ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx` and `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx`.

**Next Starter Context:** Phase 3 should build on the final live read seam rather than reopening provider ownership. Planning authoring can now layer on top of `RunDetailProvider` plus `GET /v1/runs/:runId/documents`, `GET /v1/runs/:runId/documents/:documentId/revisions/:documentRevisionId`, and authenticated artifact-content reads while assuming three settled behaviors: `/runs/:runId` routes to the first incomplete planning step unless compiled workflow state exists, the run-detail provider resets cleanly across `runId` changes, and task-artifact content is only exposed through `RunManagementApi`, not raw browser links.

## Phase 3: Planning Document Authoring

### Phase Handoff

**Goal:** Let the three planning pages create missing run documents and save current revisions through the live document API.

**Scope Boundary:**  
In scope: planning-page empty states, document creation, current-revision loading, right-pane editor/viewer behavior, save/discard flows, and focused tests.  
Out of scope: compile action, execution refresh, or task artifact review.

**Read First:**  
`design/workspace-spec.md`  
`design/design-guidelines.md`  
`ui/src/features/runs/components/planning-workspace.tsx`  
`src/http/api/v1/documents/contracts.ts`  
`src/http/api/v1/runs/router.ts`  
`src/lib/documents/model.ts`

**Files Expected To Change:**  
`ui/src/features/runs/components/planning-workspace.tsx`  
`ui/src/features/runs/components/specification-workspace.tsx`  
`ui/src/features/runs/components/architecture-workspace.tsx`  
`ui/src/features/runs/components/execution-plan-workspace.tsx`  
`ui/src/features/runs/*`  
`ui/src/shared/forms/*` only if a generic editor helper is truly reusable  
`ui/src/test/runs-routes.test.tsx`

**Validation:**  
Run from repo root:

```bash
rtk npm run test -- ui/src/test/runs-routes.test.tsx
```

Success means each planning page can:
- render an explicit empty state when its document does not exist,
- create the missing document,
- load the current revision,
- save a new revision without route churn.

**Plan / Docs To Update:**  
Update `Progress`, `Execution Log`, and `Artifacts and Notes`.

**Deliverables:**  
- Empty-state and editor flows for all three planning phases.
- Document create/save API integration.
- Route tests proving live document authoring behavior.

**Commit Expectation:**  
`add live run planning editors`

**Known Constraints / Baseline Failures:**  
- Keep the shared planning layout stable.
- Do not auto-save from effects.
- Do not invent local draft persistence unless the phase proves it is necessary.

**Status:** Pending approval

**Completion Notes:** Not started.

**Next Starter Context:** The right pane should remain the living document surface. Editing can happen there without changing the left-pane conversation/document relationship.

## Phase 4: New Run Flow And Default Navigation

### Phase Handoff

**Goal:** Make `+ New run` real and route new or partial runs to the correct first working phase.

**Scope Boundary:**  
In scope: `POST /v1/projects/:projectId/runs`, index-page mutation state, route-to-new-run behavior, default-phase selection for live runs, and focused test coverage.  
Out of scope: compile action and task review polish.

**Read First:**  
`ui/src/routes/runs/runs-index-route.tsx`  
`ui/src/features/runs/use-runs-index-view-model.ts`  
`ui/src/routes/runs/run-default-phase-route.tsx`  
`src/http/api/v1/runs/contracts.ts`  
`.ultrakit/developer-docs/m1-architecture.md`

**Files Expected To Change:**  
`ui/src/routes/runs/runs-index-route.tsx`  
`ui/src/features/runs/use-runs-index-view-model.ts`  
`ui/src/features/runs/*`  
`ui/src/test/app-shell.test.tsx`  
`ui/src/test/runs-routes.test.tsx`

**Validation:**  
Run from repo root:

```bash
rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx
```

Success means:
- `+ New run` creates a real run for the selected project,
- the app routes into that run without broken intermediate states,
- `/runs/:runId` resolves to the first incomplete planning phase for an uncompiled run and to `Execution` only when compiled workflow data exists.

**Plan / Docs To Update:**  
Update `Progress`, `Execution Log`, and `Surprises & Discoveries`.

**Deliverables:**  
- Real run creation from the index.
- Truthful default-phase behavior for live runs.
- Updated tests covering new-run and redirect behavior.

**Commit Expectation:**  
`wire live new-run flow`

**Known Constraints / Baseline Failures:**  
- Run creation must not auto-seed planning documents.
- New-run UX should rely on the empty-state/editor flows from Phase 3.

**Status:** Pending approval

**Completion Notes:** Not started.

**Next Starter Context:** The product model already supports empty run records. The UI should embrace that instead of trying to hide it.

## Phase 5: Compile Action And Live Execution Review

### Phase Handoff

**Goal:** Add the explicit compile transition and finish the live execution/task-detail review path.

**Scope Boundary:**  
In scope: `Compile run` action, compile gating, post-compile refresh/routing, live execution enablement, task artifact list and text preview behavior, and focused tests.  
Out of scope: chat transport, live streaming, or compile progress websockets.

**Read First:**  
`ui/src/features/runs/components/execution-plan-workspace.tsx`  
`ui/src/features/execution/components/execution-workspace.tsx`  
`ui/src/features/execution/components/task-detail-workspace.tsx`  
`src/http/api/v1/runs/contracts.ts`  
`src/http/api/v1/artifacts/contracts.ts`  
`.ultrakit/developer-docs/m1-architecture.md`

**Files Expected To Change:**  
`ui/src/features/runs/components/execution-plan-workspace.tsx`  
`ui/src/features/execution/components/execution-workspace.tsx`  
`ui/src/features/execution/components/task-detail-workspace.tsx`  
`ui/src/features/runs/*`  
`ui/src/features/execution/*`  
`ui/src/test/runs-routes.test.tsx`  
`ui/src/test/app-shell.test.tsx`

**Validation:**  
Run from repo root:

```bash
rtk npm run test -- ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx
```

Success means:
- `Compile run` is only available when the run is ready,
- compile success enables `Execution` and routes into the DAG,
- task detail uses live artifacts and honest compatibility states rather than scaffold-only diff assumptions.

**Plan / Docs To Update:**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and `Artifacts and Notes`.

**Deliverables:**  
- Compile mutation flow.
- Live execution/task review cutover.
- Focused tests covering compile gating and artifact inspection.

**Commit Expectation:**  
`complete live run execution flow`

**Known Constraints / Baseline Failures:**  
- Keep compile explicit; do not auto-compile on save.
- Artifact content may be non-text. Unsupported content needs explicit compatibility UI, not hidden failures.

**Status:** Pending approval

**Completion Notes:** Not started.

**Next Starter Context:** The task-detail sidebar should adapt to the real artifact contract instead of trying to recreate scaffold diff cards verbatim.

## Phase 6: Documentation And Closeout

### Phase Handoff

**Goal:** Align durable docs, notes, tests, and plan bookkeeping with the shipped live `Runs` surface.

**Scope Boundary:**  
In scope: plan updates, notes, developer docs if the UI boundary description changed, broad validation reruns, and archive bookkeeping.  
Out of scope: unrelated UI polish or adjacent destination work.

**Read First:**  
`.ultrakit/notes.md`  
`.ultrakit/developer-docs/m1-architecture.md`  
`.ultrakit/exec-plans/plan-contract.md`  
`.ultrakit/exec-plans/active/index.md`

**Files Expected To Change:**  
`.ultrakit/notes.md`  
`.ultrakit/developer-docs/m1-architecture.md` if needed  
`.ultrakit/exec-plans/active/index.md`  
`.ultrakit/exec-plans/completed/README.md` if needed  
This plan file

**Validation:**  
Run from repo root:

```bash
rtk npm run test
rtk npm run lint
rtk npm run typecheck
rtk npm run build
```

Success means the broad-suite truth is recorded accurately, including any still-pre-existing failures and the known sandbox build boundary.

**Plan / Docs To Update:**  
All living sections in this plan, plus any durable docs proven stale by the final UI boundary.

**Deliverables:**  
- Truthful durable docs and notes.
- Final validation record.
- Plan ready for archive.

**Commit Expectation:**  
`document live runs workspace`

**Known Constraints / Baseline Failures:**  
- Do not claim broad validation is green unless it actually is.
- Preserve the known sandbox build limitation if it still exists.

**Status:** Pending approval

**Completion Notes:** Not started.

**Next Starter Context:** The closeout phase should leave no stale repo narrative that still says live run detail is out of scope.
