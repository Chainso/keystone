# Keystone UI Review Follow-Ups

## Purpose / Big Picture

This plan closes the remaining findings from the final comprehensive UI scaffold review. After it lands, the current-project override seam should stay coherent when the override project changes, execution coverage should prove both positive artifact rendering and real DAG row grouping, and the durable docs/archive should stop describing stale build constraints or deleted scaffold files as current guidance.

From the operator perspective, success means the shipped scaffold behavior does not regress, the remaining architecture seam is fixed, and the repository docs match the current validation reality.

## Backward Compatibility

Backward compatibility is required for the current scaffold route tree, selector contracts, and checked-in target-model resource structure. This follow-up is corrective work on top of the completed scaffold rewrite, not another contract reset.

Required compatibility:

- preserve the current route tree and target-model scaffold shapes,
- keep `CurrentProjectProvider` and `ResourceModelProvider` APIs intact,
- keep the current execution/task/detail screens scaffold-only,
- keep the archived plan historically accurate while correcting misleading current-state notes.

## Design Decisions

1. **Date:** 2026-04-20  
   **Decision:** Fix the override-project seam by making `ResourceModelProvider` respond when its resolved starting project changes, instead of pushing remount logic into route-level consumers.  
   **Rationale:** The bug is in provider state ownership, so the repair should live at the provider seam and keep consumers simple.  
   **Alternatives considered:** force remounts with keyed providers only; ignore the issue because the current UI rarely swaps override projects at runtime.

2. **Date:** 2026-04-20  
   **Decision:** Close the execution coverage gap with route-level assertions that prove positive artifact rendering and concrete DAG grouping, rather than adding only selector-unit coverage.  
   **Rationale:** The missing regressions are user-facing render paths, so route-level assertions are the most direct proof.  
   **Alternatives considered:** add only selector tests; leave the coverage gap documented but unfixed.

3. **Date:** 2026-04-20  
   **Decision:** Update the archived plan and durable docs to preserve historical context while correcting stale current-state guidance about sandbox `build` behavior and deleted scaffold files.  
   **Rationale:** The archive should stay historically useful, but current readers should not be misled about what now validates or which files still exist.  
   **Alternatives considered:** leave the archive untouched because it is historical; update only the runbook and notes.

## Execution Log

- **Date:** 2026-04-20  
  **Phase:** Planning  
  **Decision:** Treat the review follow-up as one small corrective pass with two phases: implementation/test fixes first, then docs/archive cleanup plus final validation.  
  **Rationale:** The code and doc issues are tightly related but easier to verify in that order.

- **Date:** 2026-04-20  
  **Phase:** Phase 1  
  **Decision:** Fix the override-project seam inside `ResourceModelProvider` by deriving an effective current project id for the provider value and then synchronizing state to that value in an effect, while passing `initialProjectId` through the override branch of `CurrentProjectProvider`.  
  **Rationale:** This avoids the broken one-render window where selectors could read a removed project id after an override-project change, without changing consumer contracts.

- **Date:** 2026-04-20  
  **Phase:** Phase 1  
  **Decision:** Close the execution coverage gap with route-facing assertions that verify the actual DAG row grouping and rendered artifact cards through DOM containers instead of brittle single-line text matches against `<pre>` blocks.  
  **Rationale:** The missing regressions were user-facing render paths, and the original direct text assertions were too strict for multiline diff blocks.

- **Date:** 2026-04-20  
  **Phase:** Phase 2  
  **Decision:** Preserve the archived build caveat after revalidation instead of rewriting history to claim sandbox `build` now passes; update the docs to say the same `EROFS` failure still reproduces in Codex and the host rerun remains required on this host.  
  **Rationale:** The comprehensive review claim about sandbox `build` success did not reproduce during the follow-up validation, so the truthful fix is to keep the caveat and record the fresh evidence.

## Progress

- [x] 2026-04-20 Follow-up findings reviewed and scoped into a dedicated corrective plan.
- [x] 2026-04-20 Phase 1 complete: fixed provider-state resync and extended execution coverage for positive artifacts plus DAG grouping.
- [x] 2026-04-20 Phase 2 complete: removed stale scaffold CSS, updated archived-plan/M1 docs/notes, reran validation, and prepared this follow-up plan for archival.

## Surprises & Discoveries

- The archived UI scaffold plan is functionally complete, but a fresh review still found one live architecture seam (`CurrentProjectProvider` -> `ResourceModelProvider`) that was not covered by the earlier override-project tests.
- The comprehensive review claim that sandbox `npm run build` now passes did not reproduce. Revalidating on 2026-04-20 hit the same `EROFS` writes under `~/.config/.wrangler` and `~/.docker/buildx/activity`, so the host-shell rerun remains a real environment constraint on this machine.

## Outcomes & Retrospective

Follow-up outcome on 2026-04-20:

- `ResourceModelProvider` now keeps the provider value coherent when an override project changes, so `CurrentProjectProvider` no longer exposes a removed project id for one render before state catches up.
- Execution coverage now proves both concrete dependency-depth grouping in the DAG and positive artifact-card rendering for tasks that include recorded review output.
- The dead scaffold CSS selectors flagged in review were removed from `ui/src/app/styles.css`.
- The archived UI scaffold plan and durable docs were updated to remove misleading references to deleted scaffold files while preserving the correct host-only `build` caveat, which was revalidated during this follow-up.
- Validation passed with `rtk npm run lint`, `rtk npm run test`, `rtk npm run typecheck`, and `rtk npm run build` after the expected host-permitted rerun.

## Context and Orientation

Relevant paths for this corrective pass:

- `ui/src/features/resource-model/context.tsx` owns shared scaffold dataset/current-project state.
- `ui/src/features/projects/project-context.tsx` is the current-project compatibility seam over `ResourceModelProvider`.
- `ui/src/features/execution/use-execution-view-model.ts` plus `ui/src/features/execution/components/{execution-workspace,task-detail-workspace}.tsx` own the DAG/task-detail scaffold behavior under review.
- `ui/src/test/runs-routes.test.tsx`, `ui/src/test/phase3-destinations.test.tsx`, and `ui/src/test/resource-model-selectors.test.tsx` are the relevant regression surfaces.
- `ui/src/app/styles.css` still contains stale selectors for removed scaffold structures.
- `.ultrakit/exec-plans/completed/keystone-ui-target-model-scaffold.md`, `.ultrakit/developer-docs/m1-architecture.md`, `.ultrakit/developer-docs/m1-local-runbook.md`, and `.ultrakit/notes.md` need doc-truth cleanup.

## Plan of Work

Phase 1 will repair the provider seam so a changed override project propagates cleanly through `ResourceModelProvider`, then extend the execution tests so they prove artifact-card rendering and the actual dependency-depth row grouping in the DAG.

Phase 2 will remove the dead scaffold CSS selectors identified in review, update the archived plan and durable docs to stop presenting the old host-shell build caveat as current truth, and clean the archived handoff references that still point to deleted scaffold files. After that, rerun `lint`, `test`, `typecheck`, and `build`, then archive this follow-up plan.

## Concrete Steps

Run all commands from `/home/chanzo/code/large-projects/keystone-cloudflare`.

1. Implement Phase 1 changes and rerun:

```bash
rtk npm run lint
rtk npm run test
rtk npm run typecheck
```

2. Implement Phase 2 cleanup and rerun:

```bash
rtk npm run lint
rtk npm run test
rtk npm run typecheck
rtk npm run build
```

## Validation and Acceptance

This plan is accepted only when all of the following are true:

- changing the override project through the provider seam no longer leaves `currentProjectId` pointed at a removed project id,
- execution route tests prove both positive artifact rendering and real DAG depth grouping,
- stale scaffold CSS selectors identified in review are removed,
- the archived UI scaffold plan and durable docs no longer present the old host-shell build caveat as current truth,
- validation passes with `rtk npm run lint`, `rtk npm run test`, `rtk npm run typecheck`, and `rtk npm run build`.

## Idempotence and Recovery

These edits are safe to retry. If validation fails midway, keep the plan truthful, revert only the local incomplete changes you made, and re-run the failing command before continuing. Do not rewrite the archived plan in a way that erases historically accurate execution facts; correct only the misleading current-state notes.

## Artifacts and Notes

- Review findings driving this plan:
  - override-provider seam can retain a removed project id after override changes,
  - execution tests miss positive artifact and DAG-grouping assertions,
  - archived docs still describe `build` as host-only,
  - archived handoff sections still mention deleted scaffold files,
  - `styles.css` still contains dead scaffold selectors.

## Interfaces and Dependencies

- `ResourceModelProvider` must continue exposing `{ state, actions, meta }`.
- `CurrentProjectProvider` must continue returning the same `CurrentProject` shape to consumers.
- Execution route coverage should continue to flow through `renderRoute(...)` rather than selector-only helpers.

## Phase 1: Provider Seam And Execution Coverage

### Phase Handoff

- **Status:** Complete
- **Goal:** Fix the current-project override seam and close the execution coverage gaps.
- **Scope Boundary:** In scope: `resource-model/context.tsx`, `project-context.tsx`, and focused tests for provider changes plus execution artifacts/rows. Out of scope: route redesign, live data, or visual changes.
- **Read First:**
  - `ui/src/features/resource-model/context.tsx`
  - `ui/src/features/projects/project-context.tsx`
  - `ui/src/test/resource-model-selectors.test.tsx`
  - `ui/src/test/runs-routes.test.tsx`
  - `ui/src/test/phase3-destinations.test.tsx`
- **Files Expected To Change:**
  - `ui/src/features/resource-model/context.tsx`
  - `ui/src/features/projects/project-context.tsx` if needed
  - `ui/src/test/resource-model-selectors.test.tsx`
  - `ui/src/test/runs-routes.test.tsx`
  - `ui/src/test/phase3-destinations.test.tsx`
- **Validation:** Run `rtk npm run lint`, `rtk npm run test`, and `rtk npm run typecheck`.
- **Plan / Docs To Update:** Update `Execution Log`, `Progress`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this handoff.
- **Deliverables:** Provider-state fix plus focused execution route coverage for artifact cards and DAG grouping.
- **Commit Expectation:** `Fix UI review follow-up seams`
- **Known Constraints / Baseline Failures:** Keep the route tree and target-model scaffold contracts intact.
- **Completion Notes:** `ui/src/features/resource-model/context.tsx` now computes an effective current project id for the provider value and synchronizes state to it, `ui/src/features/projects/project-context.tsx` now passes `initialProjectId` through the override seam, and the route tests now assert positive artifact rendering plus concrete DAG grouping. Validation passed with `rtk npm run lint`, `rtk npm run test`, and `rtk npm run typecheck`.
- **Next Starter Context:** Phase 2 can treat the live provider seam and execution coverage gaps as closed. The remaining work is doc/archive truth cleanup plus the dead CSS selector removal.

## Phase 2: Docs, CSS, And Archive Truth

### Phase Handoff

- **Status:** Complete
- **Goal:** Remove stale scaffold CSS and align the archived plan plus durable docs with the current validation reality.
- **Scope Boundary:** In scope: dead CSS cleanup, archived-plan note cleanup, M1 docs/notes updates, final validation, and archiving this follow-up plan. Out of scope: new features or another architectural rewrite.
- **Read First:**
  - `ui/src/app/styles.css`
  - `.ultrakit/exec-plans/completed/keystone-ui-target-model-scaffold.md`
  - `.ultrakit/developer-docs/m1-architecture.md`
  - `.ultrakit/developer-docs/m1-local-runbook.md`
  - `.ultrakit/notes.md`
- **Files Expected To Change:**
  - `ui/src/app/styles.css`
  - `.ultrakit/exec-plans/completed/keystone-ui-target-model-scaffold.md`
  - `.ultrakit/developer-docs/m1-architecture.md`
  - `.ultrakit/developer-docs/m1-local-runbook.md`
  - `.ultrakit/notes.md`
  - `.ultrakit/exec-plans/active/index.md`
  - `.ultrakit/exec-plans/completed/README.md`
  - archive paths for this follow-up plan
- **Validation:** Run `rtk npm run lint`, `rtk npm run test`, `rtk npm run typecheck`, and `rtk npm run build`.
- **Plan / Docs To Update:** Update all living sections, then archive this plan when done.
- **Deliverables:** Cleaned stale CSS, corrected docs/archive notes, and final validation evidence.
- **Commit Expectation:** `Archive UI review follow-up plan`
- **Known Constraints / Baseline Failures:** Keep archived history truthful while correcting stale current-state guidance.
- **Completion Notes:** Removed the dead `project-config-sidebar`, `page-hero`, and `composer-*` selectors from `ui/src/app/styles.css`; updated the archived scaffold plan plus the M1 architecture/runbook/notes docs to clarify that the deleted scaffold-file references are historical and that sandbox `build` still reproduces the `EROFS` caveat on this host; reran validation with `rtk npm run lint`, `rtk npm run test`, `rtk npm run typecheck`, a sandbox `rtk npm run build` that reproduced the documented failure, and a host-permitted `rtk npm run build` that passed.
- **Next Starter Context:** Phase execution is complete. Archive this follow-up plan and leave the repo with the reviewed findings closed and the validation story recorded truthfully.
