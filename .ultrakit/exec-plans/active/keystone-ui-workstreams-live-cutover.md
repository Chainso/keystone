# Keystone UI Workstreams Live Cutover

## Purpose / Big Picture

This plan turns `Workstreams` from a scaffold-only destination into a truthful live project surface. After this work lands, an operator should be able to:

- open `Workstreams` on a live project and see current project-wide work across runs,
- filter that list by `Active`, `Running`, `Queued`, and `Blocked`, or expand to `All`,
- click a workstream row and land in the matching task under `Runs > Execution`,
- return from that task back to the live execution graph without losing run context, and
- keep the current shell, terminology, and route structure from the design docs instead of introducing a separate workstream-specific flow.

From the user's perspective, success means `Workstreams` is no longer an explicit compatibility fallback for live projects. It becomes a real operational list that matches the product model in `design/workspace-spec.md`, while staying honest about the still-out-of-scope areas such as live planning-document surfaces under other run phases.

## Backward Compatibility

Backward compatibility with the current live-project `Workstreams are not available for this project yet` fallback is **not required**. That fallback exists only because the feature has not been cut over yet.

Compatibility that **is** required:

- preserve the top-level route tree and product terminology from `design/workspace-spec.md`,
- keep `Workstreams` project-scoped and keep task drill-in under `Runs > Execution`,
- preserve the existing scaffold-backed route/test harness behavior for provided projects and non-API tests,
- keep route files thin and keep destination logic in feature-owned hooks/modules under `ui/src/features/`,
- do not expand the scope into auth UX, documentation cutover, or styling redesign,
- keep the current `Documentation` live/scaffold split unchanged unless a file must be touched incidentally for shared run-route ownership.

## Design Decisions

1. **Date:** 2026-04-20  
   **Decision:** Scope this plan to the full live `Workstreams` operator flow, not only the table view. The plan includes the project-scoped task list, the live execution graph/task-detail drill-in path, and the minimal backend/API work required to support both.  
   **Rationale:** The design docs define `Workstreams` as a project-wide operational list whose rows route into the task view under `Runs > Execution`. The current live run execution/task routes are still scaffold-only, so planning only the table would knowingly leave the user flow incomplete.  
   **Alternatives considered:** cut over only the `/workstreams` table and leave live task routes as compatibility states; treat drill-in as a separate later plan.

2. **Date:** 2026-04-20  
   **Decision:** Add a dedicated project-scoped task collection endpoint at `GET /v1/projects/:projectId/tasks` and treat it as the primary live data source for `Workstreams`.  
   **Rationale:** `Workstreams` is a project-level concept in the product model. The current backend exposes run-scoped task routes only, which would force the UI into an N+1 fanout over project runs and still would not provide a single contract for project-level pagination, filtering, and empty/error handling.  
   **Alternatives considered:** client-side fanout over `GET /v1/projects/:projectId/runs` plus `GET /v1/runs/:runId/tasks`; continue using scaffold selectors for project-level aggregation.

3. **Date:** 2026-04-20  
   **Decision:** Enrich the shared task API projection with the fields `logicalTaskId` and `updatedAt`, then reuse that richer task resource in both run-scoped and project-scoped task collections.  
   **Rationale:** The current task resource lacks the two fields the Workstreams table actually needs for a truthful `Task ID` and `Updated` column. The compiled run plan already contains the logical task ids, and `run_tasks.updated_at` already exists in persistence, so the missing fields are a projection gap, not a missing-domain-model problem. Reusing one richer task resource keeps the project task collection aligned with the run task detail contract.  
   **Alternatives considered:** show raw `runTaskId` UUIDs in the UI; invent UI-local display ids; create a one-off workstreams-only response shape unrelated to the existing task resource.

4. **Date:** 2026-04-20  
   **Decision:** Keep `Workstreams` filter chips aligned with the updated workspace spec as `All`, `Active`, `Running`, `Queued`, and `Blocked`, and map backend task states into those buckets in the UI and backend query contract. `Active` means the union of running, queued, and blocked work, while `All` includes terminal task states as well.  
   **Rationale:** The product needs one operator-focused filter that answers "what still needs attention?" without losing the ability to inspect completed or failed tasks. The backend still owns the authoritative raw task status (`active`, `ready`, `pending`, `blocked`, `completed`, `failed`, `cancelled`), while the product model owns how those states are grouped.  
   **Alternatives considered:** keep only `All`, `Running`, `Queued`, and `Blocked`; expose raw backend statuses directly in the chips.

5. **Date:** 2026-04-20  
   **Decision:** Use additive live variants instead of boolean-heavy scaffold/live switches in route and feature modules. Where the live route shape differs materially from the scaffold path, prefer explicit live hooks/components or explicit route composition branches.  
   **Rationale:** `ui/AGENTS.md` and `vercel-composition-patterns` both push toward explicit variants and feature-owned state instead of mode-heavy APIs. The current scaffold execution and run-detail hooks assume a normalized local dataset; the live versions will fetch and cache different data and should not be forced through one large boolean API.  
   **Alternatives considered:** add `isLive` flags throughout the existing scaffold hooks; overload `ResourceModelProvider` again to pretend live execution data is just another scaffold dataset.

6. **Date:** 2026-04-20  
   **Decision:** Keep the current run route structure intact (`/runs/:runId`, `/runs/:runId/execution`, `/runs/:runId/execution/tasks/:taskId`) and make the execution graph plus task detail truthful for live runs before the Workstreams cutover depends on them.  
   **Rationale:** The design docs define drill-in through `Runs > Execution`, and the existing route tree already encodes that. Changing the route structure would create avoidable product churn; the problem is not the path shape, it is the missing live data under that path.  
   **Alternatives considered:** add a Workstreams-local task detail route; redirect workstream clicks to a temporary standalone detail page.

7. **Date:** 2026-04-20  
   **Decision:** Implement server-side filtering and pagination on `GET /v1/projects/:projectId/tasks` for the first live pass, with a default `pageSize` of `25`.  
   **Rationale:** Once `All` includes terminal tasks, the route needs server-side pagination to stay scalable and to keep page counts coherent with the active filter. This also avoids baking a client-side full-collection assumption into the first public contract.  
   **Alternatives considered:** keep filtering/pagination client-side for the first pass; leave the page unpaginated.

8. **Date:** 2026-04-20  
   **Decision:** Use `runId` as the `Run` column label in `Workstreams` for the first live pass.  
   **Rationale:** Runs do not currently have titles in persistence or in the public API contract. Using `runId` is truthful and consistent with the existing live `Runs` table instead of inventing a UI-only display field.  
   **Alternatives considered:** add a new run title/display label to the backend model as part of this plan; derive a synthetic UI label.

## Execution Log

- 2026-04-20, orchestration: execution started after plan approval; active index moved to `In Progress` and Phase 1 was prepared for implementation handoff.
- 2026-04-20, Phase 1: added `GET /v1/projects/:projectId/tasks`, enriched the shared task resource with `logicalTaskId` and `updatedAt`, reused compiled run-plan artifacts to recover logical task ids without changing persistence, and validated the backend contract with `rtk npm run test -- tests/http/projects.test.ts tests/http/app.test.ts`.
- 2026-04-20, Phase 1 fix pass: made logical-task-id recovery fail-open for unreadable run-plan artifacts, replaced the project-task count path with an aggregate plus deterministic `createdAt`/`runTaskId` ordering, strengthened the HTTP suites with fail-open and repository-level bucket/pagination coverage, and revalidated with `rtk npm run test -- tests/http/projects.test.ts tests/http/app.test.ts`.

## Progress

- [x] 2026-04-20 Planning completed: discovery finished, the design markdown references were read, the live/scaffold route boundary was resolved, and the broad baseline was recorded.
- [x] 2026-04-20 Phase 1 started: backend projection handoff prepared for implementation.
- [x] 2026-04-20 Phase 1 completed: the project task collection route, filter/pagination contract, and enriched shared task resource landed with focused HTTP coverage.
- [x] 2026-04-20 Phase 1 fix pass completed: logical task ids now fail open to `runTaskId` when run-plan artifacts are unreadable, and project-task pagination is deterministic under stable ordering.
- [ ] Phase 2: Cut over the live execution graph and task-detail routes under the existing run route tree.
- [ ] Phase 3: Cut over the `Workstreams` UI to the live task collection while preserving scaffold mode for the static harness.
- [ ] Phase 4: Update durable docs/notes, rerun validation, and archive the plan.

## Surprises & Discoveries

- The design markdown files reinforce that `Workstreams` is not just a list view. `design/workspace-spec.md` explicitly says rows should open the corresponding task under `Runs > Execution`, and the canonical board now needs to reflect the resolved `All`, `Active`, `Running`, `Queued`, and `Blocked` filter set.
- The current live task API does not expose a user-friendly task id or an `updatedAt` field, even though the Workstreams board needs both. This is the main reason a dedicated projection change is required before the UI cutover.
- The current live run shell cutover stopped at the runs index. `ui/src/routes/runs/run-detail-layout.tsx`, `ui/src/routes/runs/run-default-phase-route.tsx`, and `ui/src/features/execution/use-execution-view-model.ts` are still scaffold-only.
- There is currently no `GET /v1/projects/:projectId/tasks` route, even though the earlier archived target-model UI plan anticipated that shape.
- The compiled run-plan artifact already carries the logical task ids needed by Workstreams, but the mapping is only trustworthy when keyed by persisted `runTaskId`. Reusing that artifact projection let Phase 1 expose `logicalTaskId` without adding a new database column or altering the existing run-task routes.
- The run-plan artifact is not part of route correctness. The fix pass confirmed the projection must treat artifact read, parse, and schema failures as optional enhancement misses; otherwise one bad artifact can break otherwise valid DB-backed task routes.
- The worktree baseline initially lacked local dependencies. After `rtk npm install`, the current baseline is:
  - `rtk npm run test` passes (`35` files passed, `2` skipped; `203` tests passed, `18` skipped),
  - `rtk npm run lint` fails with pre-existing unrelated backend/script lint errors,
  - `rtk npm run typecheck` fails with the pre-existing `tests/lib/db-client-worker.test.ts(24,47)` worker-binding mismatch,
  - `rtk npm run build` fails in the Codex sandbox with Wrangler/Docker `EROFS` writes under `~/.config/.wrangler` and `~/.docker`, then passes when rerun from a host-permitted shell.

## Outcomes & Retrospective

Planning outcome on 2026-04-20:

- The `Workstreams` implementation boundary is now explicit: this is a live project-task cutover plus the live execution/task drill-in seam it depends on.
- The plan keeps to the UI agent guidance by prioritizing truthful behavior, thin routes, and feature-owned state over styling work or auth expansion.
- The work is split into junior-engineer-sized phases so backend projection work, live run execution wiring, and the Workstreams page cutover can each be reviewed independently.
- The plan records the real current baseline and the host-only `build` caveat, so execution can distinguish pre-existing repo issues from regressions introduced by this feature.

Phase 1 outcome on 2026-04-20:

- The backend now exposes `GET /v1/projects/:projectId/tasks` with server-side `filter`, `page`, and `pageSize` params plus a paginated response envelope that reports `pageCount`.
- The shared run-task resource now includes `logicalTaskId` and `updatedAt`, so run-scoped task routes and the new project-scoped task collection stay on one contract.
- Logical task ids now come from compiled run-plan artifacts when available, with a fallback to the authoritative `runTaskId`, which keeps the route additive and avoids inventing a second task identifier model.
- Focused validation passed with `rtk npm run test -- tests/http/projects.test.ts tests/http/app.test.ts`.

Phase 1 fix-pass outcome on 2026-04-20:

- Logical task id recovery now fails open for unreadable or invalid run-plan artifacts, so task routes still return authoritative DB-backed rows with fallback logical ids.
- The project-task repository now derives `total` from a count aggregate instead of materializing every matching id, and it pages with deterministic ordering by `run_tasks.created_at` plus `run_task_id`.
- The focused test suites now cover route-level fail-open behavior plus repository-level `running`, `queued`, and `blocked` bucket behavior and stable pagination slices.

## Context and Orientation

Relevant repository context for this work:

- `ui/AGENTS.md` is the UI working contract. It requires behavior/composition first, thin routes, explicit unfinished states, and explicit variant components instead of boolean-heavy APIs.
- `design/workspace-spec.md`, `design/design-guidelines.md`, and `design/README.md` are the product/design source of truth. They define `Workstreams` as a project-level task list with row drill-in under `Runs > Execution`, with `Active` as the operator-focused filter and `All` as the complete task view.
- `ui/src/routes/workstreams/workstreams-route.tsx`, `ui/src/features/workstreams/use-workstreams-view-model.ts`, and `ui/src/features/workstreams/components/workstreams-board.tsx` are the current Workstreams path. Today they derive rows entirely from the scaffold resource model and show a compatibility state for non-scaffold live projects.
- `ui/src/features/projects/project-management-api.ts` is the current browser API seam for live project and runs data. It does not yet expose any project-level task collection.
- `ui/src/features/runs/use-runs-index-view-model.ts` already follows the live current project via `GET /v1/projects/:projectId/runs`, but the rest of the run route tree still assumes scaffold data.
- `ui/src/routes/runs/run-detail-layout.tsx`, `ui/src/routes/runs/run-default-phase-route.tsx`, `ui/src/routes/runs/execution-route.tsx`, `ui/src/routes/runs/task-detail-route.tsx`, `ui/src/features/runs/use-run-view-model.ts`, and `ui/src/features/execution/use-execution-view-model.ts` are the main live/scaffold gap for drill-in. They currently throw when the run/task is not present in the scaffold dataset.
- `src/http/api/v1/runs/contracts.ts` and `src/http/api/v1/runs/projections.ts` define the shared live run/task resource model. After Phase 1, `taskResourceSchema` now exposes `runId`, `taskId`, `logicalTaskId`, `name`, `description`, `status`, `dependsOn`, `conversation`, `updatedAt`, `startedAt`, and `endedAt`, and both run-scoped and project-scoped task collections reuse that richer contract.
- `src/lib/db/schema.ts` confirms the current persistence boundary: tasks already have displayable names via `run_tasks.name`, while runs do not currently have a title field and must be labeled by `runId` unless the backend model expands later.
- `src/http/api/v1/projects/router.ts`, `src/http/api/v1/projects/handlers.ts`, and `src/http/api/v1/projects/contracts.ts` own the project-scoped HTTP surface, including the Phase 1 `GET /v1/projects/:projectId/tasks` collection with server-side filter/pagination params.
- `src/lib/db/runs.ts` owns project/run/task persistence helpers. It is the likely home for any new project-task listing helper needed by the new endpoint.
- `tests/http/projects.test.ts` and `tests/http/app.test.ts` are the backend safety net for project and run route contracts.
- `ui/src/test/destination-scaffolds.test.tsx`, `ui/src/test/runs-routes.test.tsx`, `ui/src/test/app-shell.test.tsx`, and `ui/src/test/render-route.tsx` are the main frontend route and API-integration safety net for this work.
- `.ultrakit/developer-docs/m1-architecture.md` currently documents `Documentation` and `Workstreams` as scaffold-backed on live projects. That doc must be updated when the Workstreams live cutover lands.

## Plan of Work

The first phase adds the backend data contract that the page actually needs. Instead of teaching the UI to aggregate project work from many run-scoped calls, the backend should expose a project-scoped task collection and enrich the shared task resource with `logicalTaskId` and `updatedAt`. That route should also own server-side filtering and pagination with a default page size of `25`, so the first live contract does not assume the UI can always load the entire project task history in one response. This work belongs next to the existing project and run projections, not inside the UI.

The second phase makes the live drill-in path real under the route tree that already exists. The plan does not require a full live cutover for all run phases, but it does require the execution graph and task-detail surfaces under `/runs/:runId/execution` to render truthful live data. That includes a live run header/phase-stepper decision, the workflow graph, the task dependency detail, conversation locator state, and the return path back to the execution graph. This phase should keep scaffold mode intact for tests and provided-project scenarios.

The third phase cuts the `Workstreams` page itself over to the new project task collection. The route should remain thin; the feature hook should own live loading/error/empty/filter/pagination state, and the board component should stay mostly presentational. The page should use the resolved chip set of `All`, `Active`, `Running`, `Queued`, and `Blocked`, use `runId` for the `Run` column, and replace the non-scaffold live project fallback with a truthful live list.

The final phase updates the durable docs and notes, reruns the validation set, and archives the plan. Because the current broad repo baseline is not fully green, the closeout must explicitly record the remaining unrelated lint/typecheck failures and the host-only `build` caveat so future contributors do not misclassify them as regressions from the Workstreams work.

## Concrete Steps

Run commands from `/home/chanzo/.codex/worktrees/6dd2/keystone-cloudflare` unless noted otherwise.

Baseline commands already run during planning:

```bash
rtk npm install
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

Observed planning baseline:

- `rtk npm install` succeeded and restored the local toolchain in this worktree.
- `rtk npm run lint` failed with pre-existing unrelated repo errors in backend/script files.
- `rtk npm run typecheck` failed with the pre-existing worker-binding mismatch at `tests/lib/db-client-worker.test.ts(24,47)`.
- `rtk npm run test` passed: `35` files passed, `2` skipped; `203` tests passed, `18` skipped.
- `rtk npm run build` failed inside the Codex sandbox with Wrangler/Docker `EROFS` writes under `~/.config/.wrangler` and `~/.docker`, then passed when rerun from a host-permitted shell.

Expected execution-phase commands:

1. Backend projection phase:

```bash
rtk npm run test -- tests/http/projects.test.ts tests/http/app.test.ts
```

Expected result:

- the new project task route and enriched task resource contract validate through the existing HTTP test harness,
- the new endpoint supports server-side filter and pagination params with default page size `25`.

2. Live execution/task route phase:

```bash
rtk npm run test -- ui/src/test/runs-routes.test.tsx
rtk ./node_modules/.bin/tsc --noEmit -p tsconfig.ui.json
```

Expected result:

- the live execution graph and task detail paths render without scaffold dataset assumptions,
- the UI-only typecheck remains clean even though broad repo typecheck still has the known unrelated failure.

3. Workstreams page phase:

```bash
rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/app-shell.test.tsx
rtk ./node_modules/.bin/tsc --noEmit -p tsconfig.ui.json
```

Expected result:

- Workstreams renders truthful live data for API-backed projects,
- the page can request and display paginated filtered results from the backend,
- the row-click path opens the live task route,
- scaffold-mode route tests still pass.

4. Closeout:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

Expected result:

- `test` passes,
- `lint` and `typecheck` are either improved or still fail only in the already-recorded unrelated locations,
- `build` still requires the same host-shell rerun if the Codex sandbox reproduces the Wrangler/Docker home-directory write failure.

## Validation and Acceptance

This plan is accepted only when all of the following are true:

- `GET /v1/projects/:projectId/tasks` exists and returns project-scoped live task resources with enough data to render `Task ID`, `Title`, `Run`, `Status`, and `Updated` truthfully.
- that endpoint supports server-side pagination and filtering, with default page size `25`.
- the run-scoped task resource exposes `logicalTaskId` and `updatedAt`, and the project task collection reuses that richer contract instead of inventing a second incompatible task shape.
- opening `/workstreams` on a live project shows a truthful list instead of the current compatibility fallback.
- the `Workstreams` filter chips are `All`, `Active`, `Running`, `Queued`, and `Blocked`, with `Active` representing queued + running + blocked work and `All` including terminal tasks too.
- the `Run` column uses `runId` truthfully for the first live pass.
- clicking a live Workstreams row opens `/runs/:runId/execution/tasks/:taskId`, and that task detail renders from live APIs rather than scaffold selectors.
- the live task detail view can navigate back to a live execution graph for the same run without losing context.
- scaffold-mode route/test harness behavior still works for provided/static projects.
- durable docs and notes no longer describe Workstreams as scaffold-backed for live projects.

## Idempotence and Recovery

- The backend route work is additive. If Phase 1 stops halfway, the safe recovery path is to finish the shared task resource contract first, then register the new project route only after the handler and tests are in place.
- Keep live and scaffold route variants isolated. If Phase 2 stops midway, leave the scaffold path untouched and gate the live route branch behind explicit readiness checks rather than partially mutating shared scaffold hooks.
- Workstreams UI changes should land only after the live task collection contract is stable. If Phase 3 stops midway, the safe fallback is to keep the current compatibility-state branch for live projects instead of showing a partially wired list.
- The closeout phase should not archive the plan until the docs, notes, and active index all agree on the final state.
- If `rtk npm run build` fails in the Codex sandbox again, rerun it from a host-permitted shell and record that as the expected environment-specific recovery path rather than treating it as a feature regression.

## Artifacts and Notes

- Design source of truth:
  - `design/workspace-spec.md`
  - `design/design-guidelines.md`
  - `design/README.md`
  - `design/external-reference/README.md`
- Current implementation seams:
  - `ui/src/features/workstreams/*`
  - `ui/src/features/execution/*`
  - `ui/src/features/runs/use-run-view-model.ts`
  - `ui/src/features/projects/project-management-api.ts`
  - `src/http/api/v1/projects/*`
  - `src/http/api/v1/runs/*`
- Current broad baseline evidence:
  - `test` passes after dependency restore,
  - `lint` and `typecheck` still have unrelated repo failures,
  - `build` is host-only on this machine when Wrangler/Docker need writable home-directory paths.

## Interfaces and Dependencies

- Backend HTTP interfaces:
  - `GET /v1/projects/:projectId/tasks` (new; filtered and paginated)
  - `GET /v1/projects/:projectId/runs` (existing)
  - `GET /v1/runs/:runId` (existing)
  - `GET /v1/runs/:runId/workflow` (existing)
  - `GET /v1/runs/:runId/tasks` (existing, enriched contract)
  - `GET /v1/runs/:runId/tasks/:taskId` (existing, enriched contract)
- Backend modules:
  - `src/http/api/v1/projects/contracts.ts`
  - `src/http/api/v1/projects/router.ts`
  - `src/http/api/v1/projects/handlers.ts`
  - `src/http/api/v1/runs/contracts.ts`
  - `src/http/api/v1/runs/projections.ts`
  - `src/lib/db/runs.ts`
- Frontend modules:
  - `ui/src/features/workstreams/use-workstreams-view-model.ts`
  - `ui/src/features/workstreams/components/workstreams-board.tsx`
  - `ui/src/routes/workstreams/workstreams-route.tsx`
  - `ui/src/features/execution/use-execution-view-model.ts`
  - `ui/src/features/execution/components/execution-workspace.tsx`
  - `ui/src/features/execution/components/task-detail-workspace.tsx`
  - `ui/src/features/runs/use-run-view-model.ts`
  - `ui/src/routes/runs/run-detail-layout.tsx`
  - `ui/src/routes/runs/run-default-phase-route.tsx`
  - `ui/src/routes/runs/execution-route.tsx`
  - `ui/src/routes/runs/task-detail-route.tsx`
  - `ui/src/features/projects/project-management-api.ts` or a new feature-owned live execution/workstreams API seam if that yields clearer ownership
- Durable docs:
  - `.ultrakit/developer-docs/m1-architecture.md`
  - `.ultrakit/notes.md`

## Phase 1: Project Task Projection Foundation

### Phase Handoff

- **Status:** Completed
- **Goal:** Add the project-scoped task collection plus the shared task-resource fields that live Workstreams and live task drill-in both require.
- **Scope Boundary:** In scope: backend contracts, handlers, route registration, projection helpers, server-side filter/pagination params, and HTTP tests for project task collection plus enriched task resources. Out of scope: React route cutover, Workstreams board rendering, and live execution UI.
- **Read First:**
  - `src/http/api/v1/projects/contracts.ts`
  - `src/http/api/v1/projects/router.ts`
  - `src/http/api/v1/projects/handlers.ts`
  - `src/http/api/v1/runs/contracts.ts`
  - `src/http/api/v1/runs/projections.ts`
  - `src/lib/db/runs.ts`
  - `tests/http/projects.test.ts`
  - `tests/http/app.test.ts`
- **Files Expected To Change:**
  - `src/http/api/v1/projects/contracts.ts`
  - `src/http/api/v1/projects/router.ts`
  - `src/http/api/v1/projects/handlers.ts`
  - `src/http/api/v1/runs/contracts.ts`
  - `src/http/api/v1/runs/projections.ts`
  - `src/lib/db/runs.ts`
  - `tests/http/projects.test.ts`
  - `tests/http/app.test.ts`
- **Validation:** Run `rtk npm run test -- tests/http/projects.test.ts tests/http/app.test.ts`. Success means the new project task route, filter/pagination params, and enriched task resource parse correctly and the existing run-task routes still pass.
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.
- **Deliverables:** A new `GET /v1/projects/:projectId/tasks` route with server-side filtering/pagination plus enriched task resources that expose `logicalTaskId` and `updatedAt`.
- **Commit Expectation:** `Add project task collection projection`
- **Known Constraints / Baseline Failures:** Keep the route additive. Do not invent UI-only display ids in the backend response. Broad repo `lint` and `typecheck` are already red for unrelated reasons; use the focused HTTP tests for this phase.
- **Completion Notes:** Added the new project task collection route and response schema under `src/http/api/v1/projects/*`, added `listProjectTasks` in `src/lib/db/runs.ts`, enriched `taskResourceSchema` plus the shared task projector with `logicalTaskId` and `updatedAt`, and taught both project-scoped and run-scoped task responses to load logical ids from compiled run-plan artifacts when present. The fix pass then made logical-id recovery fail open when artifact reads or parsing fail, replaced the `total` path with a count aggregate, stabilized pagination ordering with a `createdAt`/`runTaskId` tie-breaker, and strengthened the focused HTTP suites with fail-open coverage plus repository-level bucket/pagination assertions.
- **Next Starter Context:** Phase 2 can assume the backend task contract is stable and fail-open on missing/invalid run-plan artifacts. Start with the live run-route/UI files listed below and wire `/runs/:runId/execution` plus `/runs/:runId/execution/tasks/:taskId` against the existing `GET /v1/runs/:runId/workflow`, `GET /v1/runs/:runId/tasks`, and `GET /v1/runs/:runId/tasks/:taskId` endpoints before touching the Workstreams page.

## Phase 2: Live Execution And Task Drill-In

### Phase Handoff

- **Status:** Pending
- **Goal:** Make `/runs/:runId/execution` and `/runs/:runId/execution/tasks/:taskId` truthful for live runs under the existing route tree.
- **Scope Boundary:** In scope: live run header/stepper decisions, live execution graph loading, live task detail loading, and route/test harness changes required for those surfaces. Out of scope: planning-document live cutover, documentation route changes, and Workstreams list rendering.
- **Read First:**
  - `ui/AGENTS.md`
  - `design/workspace-spec.md`
  - `ui/src/routes/runs/run-detail-layout.tsx`
  - `ui/src/routes/runs/run-default-phase-route.tsx`
  - `ui/src/routes/runs/execution-route.tsx`
  - `ui/src/routes/runs/task-detail-route.tsx`
  - `ui/src/features/runs/use-run-view-model.ts`
  - `ui/src/features/execution/use-execution-view-model.ts`
  - `ui/src/features/execution/components/execution-workspace.tsx`
  - `ui/src/features/execution/components/task-detail-workspace.tsx`
  - `ui/src/test/runs-routes.test.tsx`
  - `ui/src/test/render-route.tsx`
- **Files Expected To Change:**
  - `ui/src/routes/runs/run-detail-layout.tsx`
  - `ui/src/routes/runs/run-default-phase-route.tsx`
  - `ui/src/routes/runs/execution-route.tsx`
  - `ui/src/routes/runs/task-detail-route.tsx`
  - `ui/src/features/runs/use-run-view-model.ts`
  - `ui/src/features/execution/use-execution-view-model.ts`
  - `ui/src/features/execution/components/execution-workspace.tsx`
  - `ui/src/features/execution/components/task-detail-workspace.tsx`
  - `ui/src/test/runs-routes.test.tsx`
  - `ui/src/test/render-route.tsx`
  - `ui/src/features/projects/project-management-api.ts` or a new feature-owned API module if needed for clearer ownership
- **Validation:** Run `rtk npm run test -- ui/src/test/runs-routes.test.tsx` and `rtk ./node_modules/.bin/tsc --noEmit -p tsconfig.ui.json`. Success means live run execution/task routes render without scaffold dataset lookups and the UI-only typecheck passes.
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.
- **Deliverables:** Truthful live execution graph and live task detail route support under the existing run route tree.
- **Commit Expectation:** `Cut over live execution task routes`
- **Known Constraints / Baseline Failures:** Keep route files thin. Do not push live fetching state into the generic scaffold provider. Do not expand this phase into live specification/architecture/execution-plan surfaces.

## Phase 3: Workstreams UI Cutover

### Phase Handoff

- **Status:** Pending
- **Goal:** Replace the live-project compatibility fallback on `/workstreams` with a truthful project task list backed by the new project task collection.
- **Scope Boundary:** In scope: Workstreams live loading/error/empty states, filter mapping, paginated response state, row-click behavior, and scaffold/live test coverage. Out of scope: global shell redesign, documentation cutover, and search/sort features beyond the existing board contract.
- **Read First:**
  - `ui/AGENTS.md`
  - `design/workspace-spec.md`
  - `ui/src/routes/workstreams/workstreams-route.tsx`
  - `ui/src/features/workstreams/use-workstreams-view-model.ts`
  - `ui/src/features/workstreams/components/workstreams-board.tsx`
  - `ui/src/features/projects/project-management-api.ts`
  - `ui/src/test/destination-scaffolds.test.tsx`
  - `ui/src/test/app-shell.test.tsx`
- **Files Expected To Change:**
  - `ui/src/routes/workstreams/workstreams-route.tsx`
  - `ui/src/features/workstreams/use-workstreams-view-model.ts`
  - `ui/src/features/workstreams/components/workstreams-board.tsx`
  - `ui/src/features/projects/project-management-api.ts` or a new feature-owned workstreams API module
  - `ui/src/test/destination-scaffolds.test.tsx`
  - `ui/src/test/app-shell.test.tsx`
- **Validation:** Run `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/app-shell.test.tsx` and `rtk ./node_modules/.bin/tsc --noEmit -p tsconfig.ui.json`. Success means live projects render truthful paginated workstreams, filters remain usable, and row drill-in lands on the live task route.
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.
- **Deliverables:** A live Workstreams destination for API-backed projects, while scaffold mode still works for the static harness.
- **Commit Expectation:** `Wire live Workstreams page`
- **Known Constraints / Baseline Failures:** Preserve the `All`/`Active`/`Running`/`Queued`/`Blocked` chip set from the workspace spec, with `runId` as the `Run` label for the first live pass. Keep the board component mostly presentational and avoid reintroducing right-rail narration or scaffold-only fallback copy for live projects.

## Phase 4: Docs, Validation, And Archive

### Phase Handoff

- **Status:** Pending
- **Goal:** Update durable docs/notes to reflect the live Workstreams cutover, rerun the validation set, and archive the completed plan.
- **Scope Boundary:** In scope: developer docs, notes, final validation, plan closeout, and index/archive bookkeeping. Out of scope: new feature work or reopening earlier design decisions.
- **Read First:**
  - `.ultrakit/developer-docs/m1-architecture.md`
  - `.ultrakit/notes.md`
  - `.ultrakit/exec-plans/active/index.md`
  - `.ultrakit/exec-plans/completed/README.md`
  - `ui/src/test/runs-routes.test.tsx`
  - `ui/src/test/destination-scaffolds.test.tsx`
  - `ui/src/test/app-shell.test.tsx`
- **Files Expected To Change:**
  - `.ultrakit/developer-docs/m1-architecture.md`
  - `.ultrakit/notes.md`
  - `.ultrakit/exec-plans/active/index.md`
  - `.ultrakit/exec-plans/completed/README.md`
  - `.ultrakit/exec-plans/active/keystone-ui-workstreams-live-cutover.md`
  - any touched tests if final truthfulness adjustments are required
- **Validation:** Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm run test`, and `rtk npm run build`. Success means `test` passes, `build` is revalidated with the known host-shell caveat when needed, and any remaining `lint`/`typecheck` failures are still only the already-recorded unrelated backlog.
- **Plan / Docs To Update:** Update all living sections, then archive the plan and update active/completed indexes.
- **Deliverables:** Updated durable docs/notes, final validation evidence, and an archived completed plan.
- **Commit Expectation:** `Document live Workstreams cutover`
- **Known Constraints / Baseline Failures:** `rtk npm run build` still needs a host-permitted shell on this machine when Wrangler/Docker write under home-directory paths. Do not archive the plan while docs or indexes still claim Workstreams is scaffold-backed for live projects.
