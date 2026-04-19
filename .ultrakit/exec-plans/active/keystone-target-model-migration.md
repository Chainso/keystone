# Keystone Target Model Migration

## Purpose / Big Picture

Keystone's current backend, runtime, and UI scaffolds are still built around:

- `sessions`
- `session_events`
- `decision_package`
- `approvals`
- per-task sandbox/workspace persistence
- coordinator-driven live event fanout

The target model handoff replaces that architecture with a simpler and more product-aligned model:

- projects
- canonical project documents
- run-scoped planning documents
- one sandbox per run
- compiled DAG tasks plus dependency edges
- artifact-backed immutable document revisions
- direct run/task state in relational tables
- Think conversation locators on documents and tasks

After this plan lands, Keystone should no longer reconstruct the product from sessions and event streams. Instead, the product should read from first-class tables that match the UI and domain model directly:

- `documents`
- `document_revisions`
- `runs`
- `run_tasks`
- `run_task_dependencies`
- reshaped `artifact_refs`

The user-visible outcome is a product and API surface that matches the current design docs and the target-model handoff:

- project documentation and run planning are both document-first
- compile reads run planning material and writes a real DAG
- execution state lives on runs and tasks, not in event reconstruction
- task and planning chat are addressed through conversation locators, not duplicated message tables
- approvals, decision-package resources, session resources, coordinator streams, and persistent event projections are gone from the core architecture

## Backward Compatibility

Backward compatibility is **not required** for this work.

Keystone is not a live service yet. There are no production users, no production data, and no deployed client integrations that need to keep working during this migration.

This plan should therefore assume:

- no API backward compatibility requirement
- no persistence backward compatibility requirement
- no data migration requirement for existing real customer data
- no obligation to preserve legacy request/response shapes once a replacement lands
- no obligation to preserve legacy scripts once the new workflow exists
- no obligation to keep dead concepts addressable just because tests used to mention them

This migration intentionally deletes or reshapes major concepts:

- `decision_package`
- `approval`
- `session`
- `session_event`
- task conversation as an API-projected event log
- coordinator/live-event surfaces
- `runtime + thinkMode`
- `project_integration_bindings`
- `review_note`

That means we do **not** need to preserve:

- old public route shapes once their replacement phase lands
- legacy response compatibility fields
- mixed old/new product semantics for operator convenience
- old demo-script behavior after the contract cutover phase
- `PUT` or other legacy method choices if the target model says otherwise

However, **incremental execution safety is still required**.

That means:

- each phase must leave the repository in a coherent, testable state
- destructive deletions should still happen in an intentional order so execution does not thrash or strand half-finished work
- tests, scripts, and UI surfaces should move in deliberate cutover phases rather than being rewritten chaotically
- the current route tree and overall UI shell from `design/workspace-spec.md` remain stable while the data model underneath changes

The migration strategy in this plan is therefore:

1. add new tables and repositories first where they unblock the rest of the rewrite
2. cut runtime and API ownership over in clear phases
3. delete legacy architecture as soon as the new path is in place
4. avoid compatibility shims unless they are the shortest path to finishing the rewrite

## Design Decisions

1. **Date:** 2026-04-19  
   **Decision:** Treat the target-model handoff as the source of truth for the end state.  
   **Rationale:** The handoff already resolves the product/domain/persistence/API decisions and explicitly supersedes the earlier simplification note. Planning should now optimize for migration sequencing, not reopen the target design.  
   **Alternatives considered:** Re-derive the target model from current code; continue evolving older plan fragments independently.

2. **Date:** 2026-04-19  
   **Decision:** Migrate additively first, destructively later.  
   **Rationale:** Discovery showed that current run/task/document APIs are projected from `sessions`, `session_events`, coordinator snapshots, and artifact metadata. Some additive work is still necessary to avoid blocking ourselves mid-rewrite, but it exists only for implementation sequencing. It is not there to preserve old behavior for users or clients.  
   **Alternatives considered:** One-shot schema and API rewrite; deleting session/event architecture before replacement rows exist.

3. **Date:** 2026-04-19  
   **Decision:** Introduce the new persistence layer before changing the public API contract.  
   **Rationale:** The current codebase needs new authoritative rows (`documents`, `document_revisions`, `runs`, `run_tasks`, `run_task_dependencies`) before handlers, workflows, scripts, or the UI can cut over safely.  
   **Alternatives considered:** Start by rewriting API contracts first; let workflows keep deriving state from artifacts/events indefinitely.

4. **Date:** 2026-04-19  
   **Decision:** Keep the UI route/frame structure stable while replacing the data model underneath it.  
   **Rationale:** Discovery confirmed the route tree already matches the target product shape: run phases, execution DAG entry, task detail, documentation, and workstreams all exist as shells. The migration burden is data and contract shape, not navigation redesign.  
   **Alternatives considered:** Redesign the shell during the same migration; postpone UI work until after backend cutover.

5. **Date:** 2026-04-19  
   **Decision:** Introduce unified documents and document revisions before making compile document-driven.  
   **Rationale:** Compile cannot honestly read run `specification`, `architecture`, and `execution_plan` until those are represented as first-class documents with revision identity.  
   **Alternatives considered:** Keep compile decision-package-driven until the very end; create run tasks directly from ad hoc handler inputs.

6. **Date:** 2026-04-19  
   **Decision:** Use a dedicated API cutover phase to replace `decision_package`, approval, event, and coordinator surfaces.  
   **Rationale:** Demo scripts, HTTP tests, and the UI currently hard-code the old run contract. The cutover needs to be explicit so all downstream consumers move together and the old surface can be removed cleanly rather than shimmed indefinitely.  
   **Alternatives considered:** Opportunistically changing handlers during persistence work; leaving mixed old/new public contracts for an extended period.

7. **Date:** 2026-04-19  
   **Decision:** Treat artifact-ref reshaping as foundational, not optional cleanup.  
   **Rationale:** The target model requires `artifact_refs` to be a real physical-object index (`bucket`, `object_key`, `object_version`, `etag`, etc.) and document revisions depend on that. Current `storage_uri + metadata` shape is too implicit.  
   **Alternatives considered:** Leaving artifact refs structurally unchanged and encoding the new storage facts in metadata only.

8. **Date:** 2026-04-19  
   **Decision:** Store conversation locators on subject records only; do not introduce message persistence or `agent_conversations` during this migration.  
   **Rationale:** The target model already settles that planning chat belongs on `documents` and task chat belongs on `run_tasks`, with the actual messages living in Think / Session storage.  
   **Alternatives considered:** Adding relational chat tables; adding a separate conversation catalog now.

9. **Date:** 2026-04-19  
   **Decision:** Replace `runtime + thinkMode` with `execution_engine`, but do it in a phase that also updates scripts, request parsing, workflows, and tests.  
   **Rationale:** Discovery showed those fields leak through headers, request bodies, session metadata, compile/task workflows, demo state, and tests. This is not a one-file rename.  
   **Alternatives considered:** Keep the old fields behind the new persistence model; rename only the API while leaving internal runtime selection unchanged.

10. **Date:** 2026-04-19  
    **Decision:** Supersede the older UI-only project-management plan with this broader migration plan.  
    **Rationale:** The older plan assumes `PUT /v1/projects`, `integrationBindings`, and the pre-target-model backend contract. The target-model migration changes those assumptions and should be the authoritative umbrella plan.  
    **Alternatives considered:** Execute the UI-only plan first and then undo parts of it later; keep both plans as independent “active” work.

11. **Date:** 2026-04-19  
    **Decision:** Accept `git_url` project components by default once approvals are removed.  
    **Rationale:** The user explicitly chose automatic support rather than rejecting remote repositories. Approval removal should simplify the runtime, not silently narrow supported component sources.  
    **Alternatives considered:** Reject `git_url` components until a separate trust policy exists.

12. **Date:** 2026-04-19  
    **Decision:** Run creation must not auto-create run planning documents.  
    **Rationale:** The user explicitly does not want runs to seed specification, architecture, and execution-plan documents automatically. A run can exist before planning material exists.  
    **Alternatives considered:** Eagerly creating empty run-scoped planning documents at run creation time.

13. **Date:** 2026-04-19  
    **Decision:** Compile requires all three run-scoped planning documents: `specification`, `architecture`, and `execution_plan`.  
    **Rationale:** The user explicitly wants compile to depend on all three documents, not treat specification/architecture as optional context. This makes compile a stricter boundary and avoids ambiguous partial-input runs.  
    **Alternatives considered:** Making `execution_plan` the only required document while treating the other two as optional context.

14. **Date:** 2026-04-19  
    **Decision:** Keep run detail routes top-level by run id, but keep run list/create nested under project: `GET/POST /v1/projects/:projectId/runs`.  
    **Rationale:** The API still needs an explicit project scope for listing and creation, and `/v1/runs/:projectId` is structurally ambiguous because that segment reads like a run id. Nested project routes are the clearest shape for run collection ownership, while top-level run detail remains clean once a run exists.  
    **Alternatives considered:** Top-level `GET /v1/runs` with query/body project scoping; using `/v1/runs/:projectId` for project-scoped collections.

## Execution Log

- **Date:** 2026-04-19  
  **Phase:** Execution kickoff  
  **Decision:** Treat user approval as authorization to start the migration plan immediately and begin with Phase 1.  
  **Rationale:** The user explicitly approved execution and asked the orchestrator to execute the entire plan while they step away, so the active plan state should move from approval-pending into active execution.

- **Date:** 2026-04-19  
  **Phase:** Planning  
  **Decision:** Re-run discovery specifically for persistence, runtime, API/test, and UI coupling before drafting the plan.  
  **Rationale:** The user explicitly asked for granular phasing based on real coupling, not a broad rewrite outline.

- **Date:** 2026-04-19  
  **Phase:** Planning  
  **Decision:** Treat `sessions` and `session_events` as legacy backing infrastructure that must survive until replacement reads are proven.  
  **Rationale:** Current run, task, graph, conversation, and summary reads are all derived from them.

- **Date:** 2026-04-19  
  **Phase:** Planning  
  **Decision:** Accept that the final public API is a breaking change, but sequence the break into a dedicated cutover phase.  
  **Rationale:** The current demo scripts, tests, and UI are tightly coupled to the old surface and need a coordinated rewrite. This sequencing exists to keep implementation manageable, not to preserve compatibility for real consumers.

- **Date:** 2026-04-19  
  **Phase:** Planning  
  **Decision:** Record the current worktree validation reality separately from the earlier repo baseline.  
  **Rationale:** In this worktree, the broad npm commands are currently blocked because local JS tool binaries are not installed; planning should not misstate the worktree baseline.

- **Date:** 2026-04-19  
  **Phase:** Phase 1  
  **Decision:** Keep `artifact_refs` additive in this phase by adding the target-model physical-object columns while retaining the legacy `kind`, `storage_uri`, and required `run_id` shape.  
  **Rationale:** Runtime and public API code still read the legacy artifact columns. Making `artifact_refs` fully target-shaped here would spill into runtime/HTTP cutover work that belongs to later phases.

- **Date:** 2026-04-19  
  **Phase:** Phase 1  
  **Decision:** Restore local JS dependencies before validation instead of stopping at the earlier missing-binaries baseline.  
  **Rationale:** `vitest` was absent in this worktree, but `npm install` was sufficient to recover the expected test runner so the phase could be validated meaningfully.

- **Date:** 2026-04-19  
  **Phase:** Phase 1 fix pass  
  **Decision:** Close the blocking repository review findings inside the Phase 1 modules instead of adding a follow-on schema phase.  
  **Rationale:** The gaps were all at the repository boundary: artifact-to-document integrity, compile-provenance revision integrity, document-revision number allocation, and missing repository tests. They could be fixed cleanly without spilling into runtime, HTTP, or UI scope.

- **Date:** 2026-04-19
  **Phase:** Phase 2
  **Decision:** Hide the still-required `artifact_refs.run_id` legacy shape behind the repository/API boundary for project-scoped document revisions instead of widening the whole artifact/runtime surface in this phase.
  **Rationale:** Phase 2 needed real artifact-backed project documents now, but Phase 1 intentionally left `artifact_refs.run_id` required for existing runtime consumers. A project-scoped ownership shim keeps the public document/artifact model target-aligned without spilling into the later artifact and runtime cutover work.

- **Date:** 2026-04-19
  **Phase:** Phase 2 fix pass
  **Decision:** Close the blocking review findings inside the Phase 2 persistence and HTTP test layers instead of reopening the migration sequence.
  **Rationale:** The remaining gaps were all Phase 2-local: project-scoped artifact-boundary enforcement, compensating cleanup for failed revision writes, broad error classification, and missing test coverage for real hydration plus second revisions.

- **Date:** 2026-04-19
  **Phase:** Phase 3
  **Decision:** Mirror run-session status changes into `runs` inside the repository layer and have the run workflow backfill a missing `runs` row before any status transitions.
  **Rationale:** Normal HTTP run creation and direct workflow launches both need real target-model run rows now, but Phase 3 still keeps legacy sessions alive. Centralizing the status mirror in `updateSessionStatus` avoids touching every caller separately while `ensureRunRecord` keeps the workflow-entry path coherent.

- **Date:** 2026-04-19
  **Phase:** Phase 3 fix pass
  **Decision:** Make the Phase 3 run/session mirror atomic on create and status transitions, and let run-session metadata reconstruct a missing `runs` row during terminal status updates.
  **Rationale:** The blocking review finding was about divergence risk inside the temporary dual-write bridge. A transaction-backed mirror plus metadata-driven backfill closes that gap without expanding Phase 3 into broader API or task-model work.

## Progress

- [x] 2026-04-19 Discovery completed against the target-model handoff, design docs, current runtime, API, tests, and UI.
- [x] 2026-04-19 Broad repository baseline confirmed earlier in the same repository lineage: `lint`, `typecheck`, and `test` passed; sandboxed `build` failed only on the known Wrangler/Docker home-directory writes; host-side `build` passed.
- [x] 2026-04-19 Current worktree validation state captured: local npm script execution is presently blocked because `eslint`, `tsc`, `vitest`, and `vite` are not installed in this worktree.
- [x] 2026-04-19 Execution plan drafted.
- [x] 2026-04-19 Active plan index updated to register this plan and mark the older UI-only plan as superseded.
- [x] 2026-04-19 User approved execution and the plan entered active execution.
- [x] 2026-04-19 Local JS dependencies restored with `rtk npm install`, so repo validation commands can run again in this worktree.
- [x] 2026-04-19 Phase 1 started: new persistence foundation implementation pass delegated to `ultrakit_implementer`.
- [x] 2026-04-19 Phase 1 complete: additive target-model persistence foundation landed via new tables, repository helpers, and repository tests while legacy paths remain temporarily.
- [x] 2026-04-19 Phase 1 targeted fix pass complete: repository integrity checks, revision-number allocation, and repository test coverage now address the blocking review findings.
- [x] 2026-04-19 Phase 2 complete: unified documents and revisions now exist with artifact-backed storage, canonical kind/path enforcement, and real project/run document APIs.
- [x] 2026-04-19 Phase 2 targeted fix pass complete: project-scoped revision artifacts now enforce the ownership shim, failed revision writes clean up uploaded blobs plus inserted artifact refs, generic persistence failures surface as server errors, and Phase 2 tests now cover real current-revision hydration plus second-revision behavior.
- [x] 2026-04-19 Phase 3 complete: real `runs` rows and `execution_engine` plumbing now exist alongside the legacy run/session path temporarily, without auto-seeding planning documents.
- [x] 2026-04-19 Phase 3 targeted fix pass complete: run/session dual-write creation and status transitions are now transactional, missing mirrored `runs` rows can be reconstructed from root run-session metadata during status updates, and HTTP/workflow tests now prove `runs` authority over conflicting legacy session metadata.
- [ ] Phase 4 complete: compile and task execution write `run_tasks` and dependency edges, while legacy projections still function.
- [ ] Phase 5 complete: public run/task/document APIs and scripts cut over to the target model, and old public contract shapes are removed rather than shimmed.
- [ ] Phase 6 complete: UI reads the new document/run-task model under the existing route structure.
- [ ] Phase 7 complete: sessions/events/approvals/coordinator/workspace bindings/decision-package architecture is removed and docs are refreshed.

## Surprises & Discoveries

- The current codebase is more deeply session-centric than the names suggest. `sessions` is the actual run store today, and `session.metadata` carries project identity, runtime/options, approval state, workspace state, and run-summary inputs.
- The current run/task/workflow/task-conversation APIs are reconstructed from `session_events`, compiled run-plan artifacts, and coordinator snapshots, not direct rows.
- The UI shell is already structurally close to the target product. The route tree and major panes are not the hard part; the API/data model cutover is.
- `project_integration_bindings` and `worker_leases` appear much cheaper to remove than sessions/events/approvals/workspaces. The former is CRUD-only, and the latter appears unused beyond schema/type exports.
- `PATCH` is not currently representable in the route-contract helper layer, so adopting the target project-update method requires a small infrastructure tweak, not just a handler change.
- The artifact public schema currently requires `runId`, which is incompatible with project-scoped document revisions.
- Run creation should not assume the existence of run planning documents; compile must enforce their presence later.
- The current worktree does not have local JS tool binaries installed, so broad validation cannot be rerun here without restoring dependencies first.
- Phase 1 can widen `artifact_refs` safely, but it cannot yet make `run_id` nullable without touching current runtime/API consumers that still require `runId`. Project-scoped document revisions therefore need a later artifact/API cutover phase before they can be fully target-shaped end to end.
- Phase 2 can ship project-scoped document revisions now by storing an internal `project:${projectId}` ownership surrogate in `artifact_refs.run_id` and stripping that surrogate from the public artifact response. Full nullable project-scoped artifact ownership can still wait for the later artifact cutover.
- The real current-revision hydration helpers can be exercised in HTTP tests without a live database by wrapping them over a narrow query-fixture client; Phase 2 no longer needs canned hydration mocks just to keep route tests fast.
- After restoring dependencies, the DB repository test command still skips in this environment because `DATABASE_URL`, `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`, and `KEYSTONE_RUN_DB_TESTS` are unset.
- The broad `rtk npm run test` suite still fails in the sandbox for a pre-existing reason outside this phase: `tests/scripts/demo-contracts.test.ts` hits `Error: listen EPERM: operation not permitted 127.0.0.1`.
- Because the service is not live, there is no product reason to carry old concepts forward once their replacements exist. Any temporary coexistence in this plan is purely to make implementation tractable.
- Drizzle's Postgres select locks are enough to serialize per-document revision numbering cleanly in the repository layer, so Phase 1 did not need an extra sequence column or trigger to close the concurrency gap.
- Phase 3 did not need a separate run-status daemon or workflow-only shim: updating `updateSessionStatus` to mirror run-session transitions into `runs` was enough to keep finalization and approval-driven status changes aligned while the old session model remains in place.
- The transitional run/session mirror is only self-healing because the root run session still carries `project`, `workflowInstanceId`, and execution metadata; later cleanup phases should preserve those facts somewhere authoritative before removing root-session metadata entirely.

## Outcomes & Retrospective

Planning outcome on 2026-04-19:

- The migration is now broken into seven implementation phases that move from additive foundations to API/UI cutover to legacy deletion.
- The plan explicitly avoids a chaotic one-shot rewrite, but not because of compatibility concerns. It recognizes that current runtime, tests, scripts, and UI all depend on the old session/event architecture and need an orderly replacement.
- The main migration seam is now clear:
  1. new persistence
  2. new document model
  3. new run/task shadow writes
  4. public/API cutover
  5. UI cutover
  6. cleanup
- The older UI-only active plan is no longer the authoritative path and should be treated as superseded by this broader target-model migration.

Phase 1 outcome on 2026-04-19:

- Added `runs`, `documents`, `document_revisions`, `run_tasks`, and `run_task_dependencies` to the relational model through a new additive migration.
- Extended `artifact_refs` toward the target model with `project_id`, `run_task_id`, `artifact_kind`, `bucket`, `object_key`, `object_version`, and `etag`, while preserving legacy columns and backfilling physical R2 facts from existing `r2://` URIs.

Phase 2 outcome on 2026-04-19:

- Replaced the stub `project_document` surface with first-class `document` and `document_revision` contracts, plus real nested project/run document routes.
- Added a shared document domain model for allowed kinds, canonical planning paths, and logical-path validation, then enforced those rules in both the repository and HTTP layers.
- Added artifact-backed revision writes to R2, current-revision reads on document resources, and transitional project-scoped artifact ownership handling that keeps the public API target-shaped while `artifact_refs.run_id` remains temporarily required underneath.
- Expanded HTTP tests for project and run document list/create/detail/revision behavior and repository tests for canonical path enforcement and project-scoped revision artifacts.
- Added repository helpers for first-class documents, runs, run tasks, and dependency edges, and expanded the repository integration test to exercise the new persistence layer without changing runtime or HTTP behavior.
- Validation improved from the initial missing-binaries baseline because `npm install` restored local tooling. The remaining validation gaps are environmental: DB-gated tests still need explicit DB env vars, and the demo-contract suite still cannot bind localhost in the sandbox.

Phase 2 fix-pass outcome on 2026-04-19:

- Project-scoped document revisions now enforce the `project:${projectId}` artifact-ownership shim, so same-project run artifacts cannot slip into canonical project documents.
- Document revision writes now clean up uploaded R2 objects and inserted artifact refs when downstream persistence fails, keeping the Phase 2 write path failure-safe within scope.
- Document HTTP tests now hit the real current-revision hydration helpers through a lightweight query fixture, and repository integration coverage asserts second-revision numbering plus `currentRevisionId` replacement when DB-gated tests are enabled.

Phase 3 outcome on 2026-04-19:

- `POST /v1/runs` now creates a real `runs` row alongside the legacy run session, stores `executionEngine` internally while preserving the old public `runtime + thinkMode` contract, and still does not auto-create planning documents.
- Run detail and project-run listing now resolve project ownership and execution state from `runs` first instead of depending on `session.metadata.project.projectId`.
- The run workflow now backfills a missing run row for direct workflow launches, stores `executionEngine` in session metadata for transitional readers, and relies on repository-layer status mirroring so run finalization keeps the new `runs` table in sync with the surviving session path.
- Validation for this phase passed on the scoped workflow/input suites plus adjacent HTTP suites, while the broad `rtk npm run test` command still fails only on the pre-existing sandbox `listen EPERM` issue in `tests/scripts/demo-contracts.test.ts`.

Phase 3 fix-pass outcome on 2026-04-19:

- `src/lib/db/runs.ts` now wraps run-session creation and run-session status transitions in DB transactions, so failed `runs` writes roll back the mirrored `sessions` change instead of leaving Phase 3 drift behind.
- Missing `runs` rows during run-session status transitions are now reconstructed from persisted root-session metadata, which keeps approval cancellation and finalization paths aligned even if a prior partial write stranded only the session row.
- `tests/lib/workflows/run-workflow-compile.test.ts`, `tests/lib/finalize-run.test.ts`, `tests/http/app.test.ts`, and `tests/http/projects.test.ts` now prove persisted execution metadata precedence, `runs`-row authority over conflicting legacy session metadata, and mirrored terminal-status persistence rather than only helper invocation.

Phase 1 fix-pass outcome on 2026-04-19:

- `createDocumentRevision` now enforces that revision artifacts stay within the target document's tenant/project boundary, match the run when the document is run-scoped, and use a document-revision artifact shape rather than arbitrary task or session artifacts.
- Run compile-provenance fields now validate against canonical run planning document revisions for the same run/project context instead of accepting arbitrary revision UUIDs.
- Document revision numbering now serializes on the owning document row, closing the `max(revision_number) + 1` race without adding new schema state.
- Repository tests now cover legacy `r2://` bucket/object-key backfill, invalid document scope inputs, self-dependency rejection, and the new revision/provenance integrity guards.

## Context and Orientation

The target model is defined in [keystone-target-model-handoff.md](../../developer-docs/keystone-target-model-handoff.md). The user wants implementation planning for that exact target, not a partial simplification.

Relevant design docs:

- [design/workspace-spec.md](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/design/workspace-spec.md)
- [design/design-guidelines.md](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/design/design-guidelines.md)

Key current backend paths:

- persistence schema: [src/lib/db/schema.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/schema.ts)
- current run/session repository: [src/lib/db/runs.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/runs.ts)
- current artifact repository: [src/lib/db/artifacts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/artifacts.ts)
- current workspace repository: [src/lib/db/workspaces.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/workspaces.ts)
- current project repository: [src/lib/db/projects.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/projects.ts)
- current event repository: [src/lib/db/events.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/events.ts)
- current approval repository: [src/lib/db/approvals.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/approvals.ts)
- run workflow: [src/workflows/RunWorkflow.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/workflows/RunWorkflow.ts)
- task workflow: [src/workflows/TaskWorkflow.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/workflows/TaskWorkflow.ts)
- task session DO: [src/durable-objects/TaskSessionDO.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/durable-objects/TaskSessionDO.ts)
- coordinator DO: [src/durable-objects/RunCoordinatorDO.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/durable-objects/RunCoordinatorDO.ts)
- compile logic: [src/keystone/compile/plan-run.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/keystone/compile/plan-run.ts)
- finalize logic: [src/keystone/integration/finalize-run.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/keystone/integration/finalize-run.ts)

Key current API paths:

- project contracts/handlers/router: [src/http/api/v1/projects/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/contracts.ts), [src/http/api/v1/projects/handlers.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/handlers.ts), [src/http/api/v1/projects/router.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/router.ts)
- run contracts/handlers/projections/router: [src/http/api/v1/runs/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/contracts.ts), [src/http/api/v1/runs/handlers.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/handlers.ts), [src/http/api/v1/runs/projections.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/projections.ts), [src/http/api/v1/runs/router.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/router.ts)
- decision-package contracts/handlers/router: [src/http/api/v1/decision-packages/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/decision-packages/contracts.ts), [src/http/api/v1/decision-packages/handlers.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/decision-packages/handlers.ts), [src/http/api/v1/decision-packages/router.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/decision-packages/router.ts)
- shared route contract helper: [src/http/api/v1/common/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/common/contracts.ts)

Key current UI paths:

- route tree: [ui/src/routes/router.tsx](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/routes/router.tsx)
- planning VM/scaffold: [ui/src/features/runs/use-run-view-model.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/runs/use-run-view-model.ts), [ui/src/features/runs/run-scaffold.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/runs/run-scaffold.ts)
- execution VM/scaffold: [ui/src/features/execution/use-execution-view-model.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/execution/use-execution-view-model.ts), [ui/src/features/execution/components/execution-workspace.tsx](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/execution/components/execution-workspace.tsx), [ui/src/features/execution/components/task-detail-workspace.tsx](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/execution/components/task-detail-workspace.tsx)
- documentation scaffold: [ui/src/features/documentation/use-documentation-view-model.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/documentation/use-documentation-view-model.ts)
- workstreams scaffold: [ui/src/features/workstreams/use-workstreams-view-model.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/workstreams/use-workstreams-view-model.ts)
- project context shell: [ui/src/features/projects/project-context.tsx](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/projects/project-context.tsx), [ui/src/shared/layout/shell-sidebar.tsx](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/shared/layout/shell-sidebar.tsx)

Key tests and scripts coupled to the old model:

- HTTP contract tests: [tests/http/app.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/app.test.ts), [tests/http/projects.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/projects.test.ts), [tests/http/run-input.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/run-input.test.ts)
- DB/runtime tests: [tests/lib/db-repositories.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/db-repositories.test.ts), [tests/lib/session.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/session.test.ts), [tests/lib/run-summary.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/run-summary.test.ts), [tests/lib/workflows/run-workflow-compile.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/workflows/run-workflow-compile.test.ts), [tests/lib/workflows/task-workflow-think.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/workflows/task-workflow-think.test.ts)
- demo scripts/tests: [scripts/demo-run.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/scripts/demo-run.ts), [scripts/demo-validate.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/scripts/demo-validate.ts), [scripts/run-local.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/scripts/run-local.ts), [tests/scripts/demo-contracts.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/scripts/demo-contracts.test.ts)

Collection-vs-detail API shape to target:

- project-scoped run collection:
  - `GET /v1/projects/:projectId/runs`
  - `POST /v1/projects/:projectId/runs`
- top-level run detail:
  - `GET /v1/runs/:runId`
  - nested run resources under `/v1/runs/:runId/...`

## Plan of Work

The migration should happen in seven phases.

Phase 1 creates the new persistence foundation. This is where the new tables, new repository modules, and the reshaped artifact-ref schema land. Legacy tables stay intact temporarily because later phases still need them during the rewrite.

Phase 2 introduces unified documents and immutable document revisions. This gives the system the new planning/document model while current run creation can remain document-agnostic and the old decision-package path can still exist temporarily behind the legacy runtime.

Phase 3 introduces real `runs` rows and `execution_engine`. The important point is that the legacy run/session path still survives during this phase; we are adding the new run authority, not deleting the old one yet, and we are not auto-creating run planning documents.

Phase 4 makes compile and execution write real DAG data into `run_tasks` and `run_task_dependencies`, and makes task/run status updates flow to those rows. Compile in this phase must require the full run planning set: specification, architecture, and execution plan. This is the phase where the replacement execution-state substrate becomes real, but the old API projections can still remain intact if needed.

Phase 5 is the public API and script cutover. This is where the old resources (`decision_package`, approvals, events, coordinator surfaces, old graph/conversation shape, `runtime + thinkMode`) are replaced with the target API model, and the demo scripts/tests move with them. This phase should prefer hard replacement over compatibility shims.

Phase 6 is the UI cutover. Because the route tree is already aligned with the target product, this phase should primarily replace scaffold and old-contract view models with document/run-task-driven clients.

Phase 7 removes the legacy architecture once the new path is proven. This includes the old tables, repositories, routes, DO wiring, tests, and docs that only exist to support the superseded session/event model.

## Concrete Steps

Run all commands from `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare` unless a phase handoff says otherwise.

Broad validation baseline commands:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

Current observed results in this worktree:

- all four commands currently fail before real validation because local JS tool binaries are not installed:
  - `eslint: command not found`
  - `tsc: command not found`
  - `vitest: command not found`
  - `vite: command not found`

Known broader repo baseline from the same repository lineage on 2026-04-19:

- `rtk npm run lint` passed
- `rtk npm run typecheck` passed
- `rtk npm run test` passed
- sandbox `rtk npm run build` failed only on the known Wrangler/Docker EROFS writes under `~/.config/.wrangler` and `~/.docker`
- host-side `rtk npm run build` passed

Phase-specific validations are listed in each handoff below and should be rerun only after local dependency availability is restored in this worktree.

## Validation and Acceptance

This plan is complete when all of the following are true:

- the relational model contains first-class `documents`, `document_revisions`, `runs`, `run_tasks`, `run_task_dependencies`, and reshaped `artifact_refs`
- run and task status are no longer derived from session events
- compile reads run planning documents and records compile provenance on `runs`
- task and planning chat are addressed via `conversation_agent_class` and `conversation_agent_name` on subject rows
- the public API surface matches the target-model handoff rather than the old decision-package/session/approval/event model
- the UI planning and execution surfaces read the new document and run-task model under the existing route tree
- demo scripts and tests no longer depend on `decisionPackage`, `/events`, `sessions.total`, or `runtime + thinkMode`
- legacy session/event/approval/coordinator/workspace-binding architecture is removed
- relevant developer docs and active notes are updated to describe the new architecture accurately

## Idempotence and Recovery

This plan is intentionally phased so partial completion does not leave the repository conceptually stranded.

Recovery rules:

- If work stops during Phases 1-4, leave the repository in a state where the next contributor can continue the rewrite cleanly. Temporary coexistence of old and new code is acceptable only as a short-lived implementation state.
- If work stops during Phase 5, the checked-in plan must record exactly which routes/scripts/tests have already cut over and which old surfaces are still intentionally present.
- If work stops during Phase 6, the UI should remain truthful. Prefer temporarily mixed live/scaffold surfaces over pretending the full target model is already wired.
- Do not delete legacy tables, routes, repositories, or tests until their replacements are already passing their intended validations.
- If the worktree still lacks dependencies, record that explicitly rather than claiming validation was rerun.

## Artifacts and Notes

Discovery evidence gathered for this plan:

- UI route/frame alignment with the target product was confirmed via:
  - [ui/src/routes/router.tsx](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/routes/router.tsx)
  - [ui/src/features/runs/use-run-view-model.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/runs/use-run-view-model.ts)
  - [ui/src/features/execution/use-execution-view-model.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/execution/use-execution-view-model.ts)
  - [ui/src/features/documentation/use-documentation-view-model.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/documentation/use-documentation-view-model.ts)
- runtime coupling was confirmed via:
  - [src/workflows/RunWorkflow.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/workflows/RunWorkflow.ts)
  - [src/workflows/TaskWorkflow.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/workflows/TaskWorkflow.ts)
  - [src/durable-objects/TaskSessionDO.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/durable-objects/TaskSessionDO.ts)
  - [src/durable-objects/RunCoordinatorDO.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/durable-objects/RunCoordinatorDO.ts)
- persistence/API coupling was confirmed via:
  - [src/lib/db/schema.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/schema.ts)
  - [src/http/api/v1/runs/projections.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/projections.ts)
  - [src/http/api/v1/runs/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/contracts.ts)
  - [tests/http/app.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/app.test.ts)
  - [tests/scripts/demo-contracts.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/scripts/demo-contracts.test.ts)

## Interfaces and Dependencies

Important interfaces and modules the migration must touch:

- project domain contracts: [src/keystone/projects/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/keystone/projects/contracts.ts)
- compile contracts: [src/keystone/compile/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/keystone/compile/contracts.ts)
- run option/runtime contracts: [src/lib/runs/options.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/runs/options.ts)
- route contract helper: [src/http/api/v1/common/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/common/contracts.ts)
- artifact/R2 helpers: [src/lib/artifacts/r2.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/artifacts/r2.ts), [src/lib/artifacts/keys.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/artifacts/keys.ts)
- Think agent/runtime seam: [src/keystone/agents/base/KeystoneThinkAgent.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/keystone/agents/base/KeystoneThinkAgent.ts), [src/maestro/agent-runtime.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/maestro/agent-runtime.ts)
- workspace/sandbox helpers: [src/lib/workspace/init.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/workspace/init.ts), [src/lib/workspace/worktree.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/workspace/worktree.ts), [src/lib/sandbox/client.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/sandbox/client.ts)

## Phase 1: Add the New Persistence Foundation

### Phase Handoff

#### Goal

Introduce the new target-model tables and repository modules so the rewrite has a real foundation to build on.

#### Scope Boundary

In scope:

- new migrations for:
  - `documents`
  - `document_revisions`
  - `runs`
  - `run_tasks`
  - `run_task_dependencies`
- reshaping `artifact_refs` toward physical-object columns
- updating Drizzle schema/types
- adding new repository modules for documents and real runs/tasks
- repository-level tests for the new tables and artifact-ref shape

Out of scope:

- changing runtime/workflow behavior
- changing HTTP route behavior
- deleting any legacy tables
- changing the UI

#### Read First

- [keystone-target-model-handoff.md](../../developer-docs/keystone-target-model-handoff.md)
- [src/lib/db/schema.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/schema.ts)
- [src/lib/db/artifacts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/artifacts.ts)
- [src/lib/db/runs.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/runs.ts)
- [src/lib/db/projects.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/projects.ts)
- [tests/lib/db-repositories.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/db-repositories.test.ts)
- [migrations/0001_m1_operational_core.sql](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/migrations/0001_m1_operational_core.sql)
- [migrations/0002_project_model.sql](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/migrations/0002_project_model.sql)
- [migrations/0003_project_workspace_components.sql](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/migrations/0003_project_workspace_components.sql)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/migrations/` (new migration files)
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/schema.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/artifacts.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/runs.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/documents.ts` (new)
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/db-repositories.test.ts`

#### Validation

- `rtk npm run test -- tests/lib/db-repositories.test.ts`
- `rtk npm run test`

Success means the new tables/repositories exist and are covered, while legacy paths still function.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries` if schema ownership or artifact-ref reshaping differs from the plan
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`

#### Deliverables

- new persistence migrations
- updated Drizzle schema
- repository helpers for documents/runs/tasks/dependencies
- artifact-ref shape extended toward the target model
- repo tests covering the new persistence layer

#### Commit Expectation

`add target model persistence foundation`

#### Known Constraints / Baseline Failures

- current worktree validation is blocked until JS dependencies exist locally
- `artifact_refs` currently serve both runtime and public API consumers, so shape changes should be additive in this phase

#### Status

Completed on 2026-04-19 after the allowed targeted fix pass.

#### Completion Notes

Implemented the additive persistence foundation in `migrations/0004_target_model_persistence_foundation.sql`, widened `src/lib/db/schema.ts` and `src/lib/db/artifacts.ts`, added `src/lib/db/documents.ts`, expanded `src/lib/db/runs.ts` with first-class run/task repositories, and covered the new layer in `tests/lib/db-repositories.test.ts`. The targeted fix pass then hardened `createDocumentRevision` and run compile-provenance validation, serialized document revision numbering with a document-row `FOR UPDATE` lock, and expanded repository tests for the blocking review cases. `rtk npm run test -- tests/lib/db-repositories.test.ts` still skips only because the DB env vars are unset; `rtk npm run test` still hits the pre-existing sandbox `listen EPERM` failures in `tests/scripts/demo-contracts.test.ts`.

#### Next Starter Context

Phase 2 can now build unified document and revision APIs on top of real `documents`/`document_revisions` tables. Keep the artifact/API cutover in mind: `artifact_refs` still preserves the legacy required `run_id` shape in this phase, so fully target-shaped project-scoped revision artifacts should be finished alongside the later public artifact/document cutover rather than forced prematurely here. Compile provenance now expects canonical run planning documents by both kind and path (`specification`, `architecture`, `execution-plan`), so Phase 2 should preserve or formalize that planning-document contract when it adds document APIs.

## Phase 2: Introduce Unified Documents And Revisions

### Phase Handoff

#### Goal

Replace the old stub/legacy project-document model with first-class `documents` and `document_revisions`, backed by artifact refs and R2 objects.

#### Scope Boundary

In scope:

- new document and revision domain contracts
- project-scoped and run-scoped document repository logic
- artifact-backed revision creation/read helpers
- project document and run document API endpoints per the target model
- document-path and kind enforcement
- project/run document tests

Out of scope:

- compile reading the new documents
- run/task runtime ownership changes
- UI cutover
- deletion of decision-package routes

#### Read First

- [keystone-target-model-handoff.md](../../developer-docs/keystone-target-model-handoff.md)
- [src/http/api/v1/projects/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/contracts.ts)
- [src/http/api/v1/projects/handlers.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/handlers.ts)
- [src/http/api/v1/projects/router.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/router.ts)
- [src/http/api/v1/artifacts/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/artifacts/contracts.ts)
- [src/lib/artifacts/r2.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/artifacts/r2.ts)
- [tests/http/projects.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/projects.test.ts)
- [tests/http/app.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/app.test.ts)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/contracts.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/handlers.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/router.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/documents/` (new if split)
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/documents.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/artifacts.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/projects.test.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/app.test.ts`

#### Validation

- `rtk npm run test -- tests/http/projects.test.ts tests/http/app.test.ts`
- `rtk npm run test`

Success means document and revision APIs are real and project-document stubs are gone, while the legacy run model can still coexist.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries`
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`

#### Deliverables

- unified document contracts
- document/revision repository layer
- project and run document endpoints
- artifact-backed revision persistence
- tests for path/kind/current-revision behavior

#### Commit Expectation

`add unified document and revision model`

#### Known Constraints / Baseline Failures

- artifact contract currently assumes `runId`; project-scoped document blobs need that contract reconsidered
- current `project_document` enum is incompatible with the target kinds

#### Status

Completed on 2026-04-19 after the allowed targeted fix pass.

#### Completion Notes

Implemented a shared document domain model in `src/lib/documents/model.ts`, expanded `src/lib/db/documents.ts` and `src/lib/db/artifacts.ts` for scoped document/revision persistence plus the temporary project-artifact ownership shim, added `src/http/api/v1/documents/contracts.ts` and `src/http/api/v1/documents/handlers.ts`, and rewired project/run routers to serve real nested document resources. Project-document stubs are gone; decision-package routes remain untouched. The allowed targeted fix pass then tightened project-scoped revision artifact ownership to the `project:${projectId}` boundary, added compensating artifact-ref plus R2 cleanup for failed revision writes, narrowed generic document persistence errors to server failures, replaced canned HTTP hydration mocks with wrapped real repository helpers, and extended repository coverage to second revisions. `rtk npm run test -- tests/http/projects.test.ts tests/http/app.test.ts` passed. `rtk npm run test -- tests/lib/db-repositories.test.ts` still skips because `DATABASE_URL`, `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`, and `KEYSTONE_RUN_DB_TESTS` are unset in this environment. `rtk npm run test` still fails only on the pre-existing sandbox `listen EPERM` issue in `tests/scripts/demo-contracts.test.ts`.

#### Next Starter Context

Phase 3 can now start writing and reading real `runs` rows and `execution_engine` fields while leaving the new document APIs intact. Project-scoped document revision artifacts still use the internal `project:${projectId}` ownership surrogate to satisfy the still-required `artifact_refs.run_id`, but Phase 2 now enforces that surrogate on revision attachment and cleans up failed writes; remove the surrogate only when the later artifact/public cutover makes nullable project-scoped artifact ownership safe. Keep decision-package routes untouched until the dedicated contract cutover phase.

## Phase 3: Introduce Real Runs And Execution Engine

### Phase Handoff

#### Goal

Create real `runs` rows and begin moving run ownership into the target model, including `execution_engine`, while the old session-backed path still exists temporarily.

#### Scope Boundary

In scope:

- creating `runs` rows alongside legacy run sessions
- migrating run identity off `session.metadata.project.projectId`
- introducing `execution_engine`
- ensuring run creation does not auto-seed planning documents
- run finalization/status updates on the new `runs` table

Out of scope:

- replacing the public run API contract
- deleting run sessions
- writing DAG tasks/dependencies
- UI cutover

#### Read First

- [src/http/api/v1/runs/handlers.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/handlers.ts)
- [src/workflows/RunWorkflow.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/workflows/RunWorkflow.ts)
- [src/lib/runs/options.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/runs/options.ts)
- [src/lib/db/runs.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/runs.ts)
- [src/keystone/integration/finalize-run.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/keystone/integration/finalize-run.ts)
- [tests/lib/workflows/run-workflow-compile.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/workflows/run-workflow-compile.test.ts)
- [tests/lib/finalize-run.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/finalize-run.test.ts)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/handlers.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/workflows/RunWorkflow.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/runs/options.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/runs.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/keystone/integration/finalize-run.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/workflows/run-workflow-compile.test.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/finalize-run.test.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/run-input.test.ts`

#### Validation

- `rtk npm run test -- tests/lib/workflows/run-workflow-compile.test.ts tests/lib/finalize-run.test.ts tests/http/run-input.test.ts`
- `rtk npm run test`

Success means `runs` are being written and kept in sync without yet deleting the legacy session-backed run path, and run creation still does not create planning documents implicitly.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries`
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`

#### Deliverables

- real `runs` row creation/update path
- `execution_engine` introduction
- explicit no-auto-seed run creation behavior
- workflow/finalization tests updated for dual-run persistence

#### Commit Expectation

`shadow runs into target model rows`

#### Known Constraints / Baseline Failures

- current handlers, scripts, and tests still speak `runtime + thinkMode`
- project/run identity is still inferred from session metadata in multiple readers until later cutover phases

#### Status

Completed on 2026-04-19 after the allowed targeted fix pass.

#### Completion Notes

`src/http/api/v1/runs/handlers.ts` now creates the root run session and mirrored `runs` row through a single repository transaction instead of separate writes. `src/http/api/v1/runs/projections.ts` continues to prefer the run row for `projectId`, `status`, and execution metadata, and `src/http/api/v1/projects/handlers.ts` still lists project runs from `runs` while only using sessions for the still-public `sessions.total` projection. `src/lib/runs/options.ts` and `src/workflows/RunWorkflow.ts` still provide the transitional execution-engine bridge, but the allowed targeted fix pass tightened `src/lib/db/runs.ts` so run-session status updates are also transactional and can reconstruct a missing mirrored `runs` row from persisted root-session metadata during terminal transitions. `tests/lib/workflows/run-workflow-compile.test.ts` now proves persisted execution metadata wins over conflicting workflow-request defaults, `tests/http/app.test.ts` and `tests/http/projects.test.ts` now prove `runs.projectId` and `runs.executionEngine` beat conflicting legacy session metadata on read, and `tests/lib/finalize-run.test.ts` now covers atomic create rollback plus mirrored terminal-status persistence. `rtk npm run test -- tests/lib/workflows/run-workflow-compile.test.ts tests/lib/finalize-run.test.ts tests/http/run-input.test.ts` passed. Supplemental adjacent HTTP validation `rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts` also passed. `rtk npm run test` still fails only on the pre-existing sandbox `listen EPERM` problem in `tests/scripts/demo-contracts.test.ts`.

#### Next Starter Context

Phase 4 can assume `runs` is now the authoritative run-identity table even though the public API and task/runtime projections still read legacy sessions and events for parts of the response. Keep the transactional run/session mirror in place until `run_tasks`, compile provenance, and task-state rows become authoritative, and keep root run-session metadata rich enough to reconstruct the mirror row until the later cleanup phases replace that fallback with fully target-model ownership.

## Phase 4: Persist Compile Output And Task State As A Real DAG

### Phase Handoff

#### Goal

Make compile and task execution write `run_tasks` and `run_task_dependencies`, and move task state toward direct row updates instead of event-derived state.

#### Scope Boundary

In scope:

- writing `run_tasks` and `run_task_dependencies` during compile
- recording compile provenance on `runs`
- updating task status/timestamps directly on `run_tasks`
- storing task conversation locators on `run_tasks`
- moving sandbox/worktree ownership toward one-sandbox-per-run while keeping the agent filesystem bridge stable
- enforcing compile preconditions that require run `specification`, `architecture`, and `execution_plan` documents

Out of scope:

- public API cutover
- deletion of session events
- full UI cutover
- final removal of workspace-binding tables

#### Read First

- [src/keystone/compile/plan-run.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/keystone/compile/plan-run.ts)
- [src/workflows/TaskWorkflow.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/workflows/TaskWorkflow.ts)
- [src/durable-objects/TaskSessionDO.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/durable-objects/TaskSessionDO.ts)
- [src/lib/workspace/init.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/workspace/init.ts)
- [src/lib/workspace/worktree.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/workspace/worktree.ts)
- [src/keystone/tasks/load-task-contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/keystone/tasks/load-task-contracts.ts)
- [tests/lib/compile-plan-run.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/compile-plan-run.test.ts)
- [tests/lib/workflows/task-workflow-think.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/workflows/task-workflow-think.test.ts)
- [tests/lib/project-workspace-materialization.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/project-workspace-materialization.test.ts)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/keystone/compile/plan-run.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/workflows/TaskWorkflow.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/durable-objects/TaskSessionDO.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/workspace/init.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/workspace/worktree.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/workspaces.ts` (transitional if still needed)
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/compile-plan-run.test.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/workflows/task-workflow-think.test.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/project-workspace-materialization.test.ts`

#### Validation

- `rtk npm run test -- tests/lib/compile-plan-run.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/project-workspace-materialization.test.ts`
- `rtk npm run test`

Success means the replacement DAG state and task-state rows are real, compile requires all three run planning documents, and legacy projections can still remain temporarily if needed.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries`
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`

#### Deliverables

- compile writes DAG rows
- task workflows update `run_tasks`
- compile provenance stored on `runs`
- task conversation locators stored on `run_tasks`
- run-sandbox ownership model advanced toward the target
- compile precondition enforcement for all three planning documents

#### Commit Expectation

`persist compiled dag and task state`

#### Known Constraints / Baseline Failures

- current live compile path is still fixture-scoped in important ways
- task tooling and filesystem bridge assume the current `/workspace` and artifact bridge layout and should not be broken casually

#### Status

Pending approval.

#### Completion Notes

Not started.

#### Next Starter Context

This phase is still not the time to delete `session_events`. It is the time to make those events non-authoritative by establishing direct DAG/task rows.

## Phase 5: Cut Over The Public API And Scripts

### Phase Handoff

#### Goal

Replace the old decision-package/session/approval/event/coordinator public contract with the target document/run-task API model, and migrate scripts/tests with it.

#### Scope Boundary

In scope:

- deleting public `decision_package` resources
- deleting approval, event, stream, and websocket/coordinator routes from the active contract
- reshaping `POST /v1/runs`
- reshaping run collection/create under project-scoped routes
- reshaping run/task/workflow responses to the target model
- introducing target document and revision endpoints
- updating demo scripts and HTTP/runtime tests to the new contract
- adding `PATCH` route-contract support if project update moves there in this phase

Out of scope:

- UI cutover
- final deletion of legacy persistence tables

#### Read First

- [src/http/api/v1/runs/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/contracts.ts)
- [src/http/api/v1/runs/handlers.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/handlers.ts)
- [src/http/api/v1/runs/projections.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/projections.ts)
- [src/http/api/v1/decision-packages/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/decision-packages/contracts.ts)
- [src/http/api/v1/decision-packages/router.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/decision-packages/router.ts)
- [src/http/api/v1/common/contracts.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/common/contracts.ts)
- [scripts/demo-run.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/scripts/demo-run.ts)
- [scripts/demo-validate.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/scripts/demo-validate.ts)
- [tests/http/app.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/app.test.ts)
- [tests/scripts/demo-contracts.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/scripts/demo-contracts.test.ts)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/common/contracts.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/contracts.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/router.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/projects/handlers.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/contracts.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/router.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/handlers.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/runs/projections.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/decision-packages/` (delete or retire)
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/handlers/ws.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/scripts/demo-run.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/scripts/demo-validate.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/scripts/run-local.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/scripts/demo-state.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/app.test.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/projects.test.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/run-input.test.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/scripts/demo-contracts.test.ts`

#### Validation

- `rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts tests/http/run-input.test.ts tests/scripts/demo-contracts.test.ts`
- `rtk npm run test`

Success means the active public contract and demo scripts align with the target model, not the old one.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries`
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`

#### Deliverables

- target-model HTTP contracts and handlers
- demo scripts migrated to the new contract
- old public decision-package/approval/event/coordinator surfaces removed, not merely deprecated
- HTTP/script tests rewritten
- project-scoped run collection/create routes adopted

#### Commit Expectation

`cut over api to target run and document model`

#### Known Constraints / Baseline Failures

- demo tooling currently tolerates mixed response shapes, which can hide incomplete cutovers if tests are not tightened
- current `graph` and task-conversation endpoints are deeply coupled to old projections

#### Status

Pending approval.

#### Completion Notes

Not started.

#### Next Starter Context

This phase is the intentional public break. Do not add compatibility shims unless a later phase would be blocked without them, and if one is added, record exactly why it is temporary.

## Phase 6: Cut Over The UI To Documents And Run Tasks

### Phase Handoff

#### Goal

Replace scaffold and old-contract UI view models with document/revision and run-task-driven clients under the existing route tree.

#### Scope Boundary

In scope:

- planning-phase view models reading run-scoped documents and revisions
- documentation view models reading project-scoped documents and revisions
- execution DAG view models reading `run_tasks` and `run_task_dependencies`
- task detail view models using task conversation locators instead of fabricated conversation JSON
- workstreams view models mapping to real run-task data where appropriate
- UI route and shell tests updated to the new data model

Out of scope:

- changing the route tree or shell structure
- final deletion of legacy backend code

#### Read First

- [design/workspace-spec.md](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/design/workspace-spec.md)
- [design/design-guidelines.md](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/design/design-guidelines.md)
- [ui/src/routes/router.tsx](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/routes/router.tsx)
- [ui/src/features/runs/use-run-view-model.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/runs/use-run-view-model.ts)
- [ui/src/features/runs/run-scaffold.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/runs/run-scaffold.ts)
- [ui/src/features/execution/use-execution-view-model.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/execution/use-execution-view-model.ts)
- [ui/src/features/documentation/use-documentation-view-model.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/documentation/use-documentation-view-model.ts)
- [ui/src/features/workstreams/use-workstreams-view-model.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/workstreams/use-workstreams-view-model.ts)
- [ui/src/test/runs-routes.test.tsx](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/test/runs-routes.test.tsx)
- [ui/src/test/phase3-destinations.test.tsx](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/test/phase3-destinations.test.tsx)
- [ui/src/test/app-shell.test.tsx](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/test/app-shell.test.tsx)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/runs/use-run-view-model.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/runs/run-scaffold.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/runs/components/planning-workspace.tsx`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/execution/use-execution-view-model.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/execution/components/execution-workspace.tsx`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/execution/components/task-detail-workspace.tsx`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/documentation/use-documentation-view-model.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/features/workstreams/use-workstreams-view-model.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/test/runs-routes.test.tsx`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/test/phase3-destinations.test.tsx`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/ui/src/test/app-shell.test.tsx`

#### Validation

- `rtk npm run test -- ui/src/test/runs-routes.test.tsx ui/src/test/phase3-destinations.test.tsx ui/src/test/app-shell.test.tsx`
- `rtk npm run test`
- `rtk npm run build`

Success means the UI route tree is unchanged but the backing data model is the new one.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries`
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`

#### Deliverables

- planning/documentation/execution/workstreams view models on the new API
- task detail using conversation locators
- UI tests updated to the new data shape

#### Commit Expectation

`rewire ui to target document and run task model`

#### Known Constraints / Baseline Failures

- current view models are scaffold-only and route tests hard-code scaffold copy/task IDs
- local worktree JS dependencies are currently absent

#### Status

Pending approval.

#### Completion Notes

Not started.

#### Next Starter Context

Do not redesign the shell. Keep the route/frame structure and swap the data model underneath it.

## Phase 7: Remove Legacy Architecture And Refresh Docs

### Phase Handoff

#### Goal

Delete the superseded session/event/approval/coordinator/workspace-binding/decision-package architecture and update docs to describe the final target model accurately.

#### Scope Boundary

In scope:

- deleting:
  - `sessions`
  - `session_events`
  - `approvals`
  - `workspace_bindings`
  - `workspace_materialized_components`
  - `worker_leases`
  - `project_integration_bindings`
  - `RunCoordinatorDO`
  - decision-package handlers/contracts/routes
  - event/coordinator handlers and tests
- removing legacy repositories and helper modules
- cleaning migrations/schema exports/types where appropriate
- updating developer docs and `.ultrakit/notes.md`
- closing the plan and archiving superseded assumptions

Out of scope:

- new product behavior beyond the target model already established

#### Read First

- [keystone-target-model-handoff.md](../../developer-docs/keystone-target-model-handoff.md)
- [src/lib/db/schema.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/schema.ts)
- [src/lib/db/events.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/events.ts)
- [src/lib/db/approvals.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/approvals.ts)
- [src/lib/db/workspaces.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/workspaces.ts)
- [src/durable-objects/RunCoordinatorDO.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/durable-objects/RunCoordinatorDO.ts)
- [src/http/handlers/ws.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/handlers/ws.ts)
- [src/http/api/v1/decision-packages/](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/decision-packages)
- [tests/lib/db-repositories.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/db-repositories.test.ts)
- [tests/lib/run-summary.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/run-summary.test.ts)
- [tests/lib/event-types.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/event-types.test.ts)
- [tests/http/app.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/app.test.ts)
- [tests/scripts/demo-contracts.test.ts](/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/scripts/demo-contracts.test.ts)

#### Files Expected To Change

- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/schema.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/events.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/approvals.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/lib/db/workspaces.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/durable-objects/RunCoordinatorDO.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/handlers/ws.ts`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/src/http/api/v1/decision-packages/`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/lib/`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/http/`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/tests/scripts/`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/.ultrakit/developer-docs/`
- `/home/chanzo/.codex/worktrees/e3b7/keystone-cloudflare/.ultrakit/notes.md`

#### Validation

- `rtk npm run test`
- `rtk npm run build`

Success means the repository no longer depends on the old architecture and the docs describe the final state truthfully.

#### Plan / Docs To Update

- Update `Execution Log`
- Update `Progress`
- Update `Surprises & Discoveries`
- Update `Outcomes & Retrospective`
- Update this phase handoff `Status`, `Completion Notes`, and `Next Starter Context`
- Update `.ultrakit/notes.md` if durable repo-specific lessons emerged

#### Deliverables

- legacy architecture deleted
- docs updated to the final model
- stale tests removed or rewritten
- plan ready for archive

#### Commit Expectation

`remove legacy session and event architecture`

#### Known Constraints / Baseline Failures

- do not perform this phase until replacement APIs, scripts, and UI paths are already proven

#### Status

Pending approval.

#### Completion Notes

Not started.

#### Next Starter Context

This is the only destructive cleanup phase. If the repository still has mixed old/new reads at this point, stop and re-scope rather than deleting support prematurely.
