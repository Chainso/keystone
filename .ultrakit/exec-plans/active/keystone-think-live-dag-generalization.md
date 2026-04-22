# Keystone Think Live DAG Generalization

## Purpose / Big Picture

Keystone already proves a narrow `think_live` happy path, but that proof is still artificially limited. After this plan is complete, an operator should be able to run `KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:run` and `npm run demo:validate` against a single-target project and see a real compiled DAG execute through the live Think runtime, including multiple ready tasks and at least one dependency edge, without reopening compile-target selection or changing the current artifact/state boundary.

The observable outcome is:

- `think_live` no longer rejects non-fixture compiled handoffs for single-target projects
- `think_live` becomes the default execution engine for new runs unless the caller explicitly requests `scripted` or `think_mock`
- `RunWorkflow` launches all ready tasks immediately instead of serializing independent ready roots
- newly ready tasks can launch while unrelated branches remain active
- the operator-facing demo proof validates a real DAG shape instead of only “compile provenance plus one task”
- durable docs describe the broader `think_live` contract truthfully

## Backward Compatibility

Backward compatibility is required with the currently shipped M1 backend and Think runtime proof.

Constraints to preserve:

- keep `think_mock` as the deterministic validation path and keep it fixture-scoped
- keep explicit `scripted` and `think_mock` execution-engine selection working even though the implicit default changes to `think_live`
- keep the current file-first architecture: Keystone remains authoritative for compile, DAG persistence, and run/task state; Think remains inside one planning or task turn
- keep the current single-target compile requirement; multi-component compile-target selection remains out of scope
- keep one sandbox per run with task-specific worktrees inside that sandbox
- do not introduce HITL branches, reviewer/tester role expansion, or new first-class `Thread` / `Lease` product abstractions
- do not change the artifact kind boundary or the `taskId` / `runTaskId` split

## Design Decisions

1. **Date:** 2026-04-21  
   **Decision:** Scope this plan to projects that already resolve to exactly one compile repo.  
   **Rationale:** The user wants workflow generalization now, not compile-target selection. Current compile-target ambiguity for multi-component projects is already tracked as separate debt and would materially expand this plan.  
   **Alternatives considered:** Solving compile-target selection in the same plan; staying fixture-project-only.

2. **Date:** 2026-04-21  
   **Decision:** Generalize `think_live` by removing the fixture-only live handoff gate in `TaskWorkflow`, while keeping the fixture gate only on `think_mock`.  
   **Rationale:** Discovery showed the live compiler, compiled-plan persistence, dependency validation, and handoff loading already support generic DAGs. The remaining artificial live gate sits in `resolveThinkTurnInput()`.  
   **Alternatives considered:** Adding another compatibility shim in compile; keeping live handoff acceptance fixture-scoped and only widening tests/docs.

3. **Date:** 2026-04-21  
   **Decision:** `RunWorkflow` should fan out every runnable task on each poll, defined as the union of currently `active` tasks plus all currently `ready` tasks.  
   **Rationale:** The user explicitly wants ready work scheduled immediately. Including `active` tasks in the batch preserves existing workflow-instance repair behavior while allowing independent roots and newly ready children to start without waiting for unrelated work to finish.  
   **Alternatives considered:** Keeping the current “only first ready task” serialization; launching only `ready` tasks and dropping active-instance repair from the fanout batch.

4. **Date:** 2026-04-21  
   **Decision:** Scheduler-side promotion and dependency-failure cancellation must use guarded status transitions from `pending` only. Do not introduce a new runtime `blocked` state in this plan.  
   **Rationale:** Discovery showed `TaskWorkflow` already uses `ifStatusIn` guards, but the scheduler helpers do not. Parallel ready-task fanout without scheduler CAS guards risks regressing `active` tasks back to `ready` or cancelling tasks another runner already promoted. The existing dependency-failure contract resolves to `cancelled`, not `blocked`, and that semantic should remain stable here.  
   **Alternatives considered:** Leaving scheduler helpers as read-then-write updates; introducing a new `blocked` execution state as part of the fanout work.

5. **Date:** 2026-04-21  
   **Decision:** Preserve the current `taskId` / `runTaskId` split and the deterministic workflow-instance ID model.  
   **Rationale:** Logical task IDs remain the compile/artifact dependency language, while authoritative `runTaskId` values drive persistence, handoff lookup, and workflow instance IDs. Reworking that split would turn a focused generalization into a deeper orchestration rewrite.  
   **Alternatives considered:** Moving dependency edges and workflow instance IDs to logical task IDs only; regenerating run-task identity during replay.

6. **Date:** 2026-04-21  
   **Decision:** The operator-facing DAG proof for `think_live` must use committed planning-document fixtures that ask for a small but non-trivial DAG and `demo:validate` must verify DAG structure, not exact task IDs.  
   **Rationale:** The current operator proof is too narrow and the current demo documents are seeded from committed files. To avoid drift between unit tests and the user-visible proof, the plan should add stronger committed fixture inputs and validate structural outcomes such as multiple tasks and at least one dependency edge, without reintroducing brittle task-ID shims.  
   **Alternatives considered:** Proving broader DAG support only in unit tests; validating exact task titles or task IDs in the live path.

7. **Date:** 2026-04-21  
   **Decision:** Preserve the current single-sandbox-per-run topology and validate shared-sandbox parallel fanout explicitly rather than redesigning sandbox isolation in this plan.  
   **Rationale:** The docs and runtime already assume one sandbox per run with task-specific worktrees. The immediate question is whether the existing topology behaves correctly when all ready work launches promptly, not whether sandbox topology should change.  
   **Alternatives considered:** Introducing sandbox-per-task as part of live DAG generalization; keeping serialized launches solely to avoid validating shared-sandbox concurrency.

8. **Date:** 2026-04-21  
   **Decision:** Flip the implicit default execution engine from `scripted` to `think_live`, while preserving explicit opt-in `scripted` and `think_mock` paths.  
   **Rationale:** The user wants `think_live` to be the expected product path, not merely the documented intended path. Keeping `scripted` as the implicit default would leave the operator-facing contract misaligned with the intended product behavior even after DAG generalization lands.  
   **Alternatives considered:** Keeping `scripted` as the code default and only changing docs; deferring the default flip to a later plan.

## Execution Log

- **Date:** 2026-04-21  
  **Phase:** Planning  
  **Decision:** Treat this as a new active plan rooted in `TD-2026-04-17-001`, not as a continuation of the archived live Think workflow plan.  
  **Rationale:** The archived plan is historical and already closed on the earlier fixture-scoped proof. The new work is a separate workflow-generalization slice with different acceptance.

- **Date:** 2026-04-21  
  **Phase:** Planning  
  **Decision:** Split the work into four phases: live handoff acceptance, scheduler fanout safety, operator-facing DAG proof, and documentation/debt closeout.  
  **Rationale:** Discovery showed three distinct implementation seams plus a required documentation phase. Keeping them separate avoids forcing execution subagents to invent sequencing or mix runtime semantics with operator-proof and doc work.

- **Date:** 2026-04-21  
  **Phase:** Planning  
  **Decision:** Treat single-task runs as valid product behavior, but require the operator-facing `think_live` proof for this plan to demonstrate a non-trivial DAG with both independent roots and at least one dependency edge.  
  **Rationale:** A single-task run is still a valid DAG, but it would not prove the broader behavior this plan is intended to land.

- **Date:** 2026-04-21  
  **Phase:** Planning  
  **Decision:** Record the current broad-validation baseline as “toolchain missing in this workspace” rather than escalating to environment repair during planning.  
  **Rationale:** The plan contract requires a truthful baseline before execution. In this workspace, `eslint`, `tsc`, `vitest`, and `vite` are not available yet because repo-local dependencies are not installed, so the honest baseline is command failure before source checks begin.

- **Date:** 2026-04-21  
  **Phase:** Phase 1 - Generalize live Think handoff acceptance  
  **Decision:** Accept `think_live` task turns whenever `buildProjectExecutionSnapshot()` resolves exactly one compile repo, while keeping `think_mock` on the inline fixture path.  
  **Rationale:** `RunWorkflow` already requires a single compile target before `TaskWorkflow` is reached, and `projectExecution.compileRepo` is the narrow existing signal for that scope boundary. This removes the live fixture identity gate without reopening compile-target selection, while tests now prove non-fixture and dependent live handoffs plus non-fixture `think_mock` rejection.

- **Date:** 2026-04-21  
  **Phase:** Phase 1 - Targeted fix pass  
  **Decision:** Add explicit task-workflow regression coverage for the intentional `think_live` rejection path when a non-fixture project resolves multiple executable components and therefore has no `compileRepo`.  
  **Rationale:** The Phase 1 review found that existing tests covered non-fixture single-target acceptance and fixture-only `think_mock`, but not the preserved single-target boundary. The fix pass closes that gap without changing runtime behavior.

- **Date:** 2026-04-21
  **Phase:** Phase 2 - Fan out all ready tasks safely
  **Decision:** Fan out the full `active + ready` task set on each scheduler poll and guard scheduler-driven `ready` / `cancelled` writes with `ifStatusIn: ["pending"]`.
  **Rationale:** The shared-sandbox scheduler needs prompt launch behavior for independent roots and newly unblocked work, but it must not regress concurrently updated tasks back to `ready` or `cancelled` when a stale poll snapshot races with live task execution.

- **Date:** 2026-04-21
  **Phase:** Phase 2 - Targeted fix pass
  **Decision:** Tighten Phase 2 regression coverage by asserting the `active + ready` scheduler poll through task-workflow status checks and by adding the missing guarded `pending -> ready` repository regression.
  **Rationale:** `ensureTaskWorkflowFanout()` checks every scheduled entry before `createBatch()` launches only missing instances, so asserting the second `createBatch()` payload alone does not prove an already-active task stayed in the scheduler batch. The guarded promotion path also needed the same direct repository regression coverage that guarded cancellation already had.

- **Date:** 2026-04-21
  **Phase:** Phase 3 - Establish the operator-facing live DAG proof
  **Decision:** Make `think_live` the implicit default at the request/runtime boundary, strengthen the committed demo documents to request a non-trivial DAG, and validate the public proof through the workflow-graph projection instead of brittle task-title assertions.
  **Rationale:** The operator-facing contract needed to prove the broader DAG semantics directly. Using the workflow graph lets the validator assert multiple tasks, at least one dependency edge, and at least two independent roots without coupling the proof to exact task IDs or titles.

- **Date:** 2026-04-21
  **Phase:** Phase 3 - Targeted fix pass
  **Decision:** Preserve the `think_live` default at the API/runtime boundary, but narrow only the zero-argument `demo:run` helper back to `scripted` until the host-local live proof archives reliably; harden `demo:validate` so public DAG proofs require a well-formed workflow graph with dependency references that resolve to known nodes; add explicit `scripted` and per-gate DAG regression coverage.
  **Rationale:** The review findings showed two separate issues: the validator could still accept malformed workflow graphs, and the no-argument operator helper had been flipped to a live path whose last recorded host-local proof still failed after reaching the backend. That host-local failure is deeper than the helper surface, so a Phase 3-safe fix is to keep the requested product default on `think_live` while narrowing only the no-argument demo helper and strengthening the script contract around explicit `scripted`, minimum-task, dependency-edge, root-count, and malformed-graph cases.

- **Date:** 2026-04-21
  **Phase:** Phase 4 - Documentation and closeout
  **Decision:** Update the durable docs to capture the broadened single-target `think_live` DAG contract, the scheduler's `active + ready` fanout, the API/runtime-vs-helper default split, and the current host-local live-proof caveat without reopening runtime behavior.
  **Rationale:** Phase 3 intentionally left the product default and zero-argument helper split in place, but the shipped docs still described the older fixture-scoped single-task proof. Phase 4 needed to make the durable contributor and operator-facing narrative truthful before final review.

- **Date:** 2026-04-21
  **Phase:** Phase 4 - Documentation and closeout
  **Decision:** Record the final validation truthfully and treat the newly observed broad `lint` / `test` failures as existing repo-wide baseline issues outside the scope of this documentation pass.
  **Rationale:** Phase 4 only changed docs, notes, and plan artifacts. The closeout commands showed `think:smoke` still passes, `typecheck` still fails on the known two-file baseline, `lint` currently fails on 22 pre-existing source issues, and a fresh live-demo rerun is blocked because the local Worker is not listening on `127.0.0.1:8787`, but the two host-only UI failures needed to be handled as stale contract assertions rather than generic noise.

- **Date:** 2026-04-22
  **Phase:** Phase 4 - Targeted fix pass
  **Decision:** Align the stale `Runs` create-run UI assertions to the shipped `think_live` request default, and correct the runbooks so the explicit live helper is documented as engine selection only, not as a guaranteed post-completion sandbox-preservation contract.
  **Rationale:** The review findings were both truthfulness issues. The UI path already relies on `runCreateRequestSchema` defaulting omitted create-run input to `think_live`, and the public helper/API contract still does not expose `preserveSandbox`, so the tests and durable docs needed to match the code that actually ships.

## Progress

- [x] 2026-04-21 Discovery completed for live DAG generalization, scheduler fanout behavior, and doc/validation scope.
- [x] 2026-04-21 Parallel exploration completed across runtime gating, scheduler behavior, and docs/tests impact.
- [x] 2026-04-21 Broad baseline attempted with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- [x] 2026-04-21 Active plan drafted under `.ultrakit/exec-plans/active/`.
- [x] 2026-04-21 Phase 1: generalize live Think handoff acceptance for single-target projects.
- [x] 2026-04-21 Phase 1 targeted fix pass: cover `think_live` rejection when `projectExecution.compileRepo` is absent for a non-fixture multi-target project.
- [x] 2026-04-21 Phase 2: fan out all ready tasks safely on the shared run sandbox.
- [x] 2026-04-21 Phase 2 targeted fix pass: tighten `active + ready` fanout observation and guarded ready-promotion regression coverage.
- [x] 2026-04-21 Phase 3: establish an operator-facing live DAG proof and validator contract; targeted validation passed and the host-local live proof blocker was recorded with exact command evidence.
- [x] 2026-04-21 Phase 3 targeted fix pass: preserve the API/runtime `think_live` default, narrow only the zero-argument `demo:run` helper to `scripted`, harden workflow-graph validation, and expand script-level regression coverage for explicit `scripted` and each DAG gate.
- [x] 2026-04-21 Phase 4 completed: durable docs, `.ultrakit/notes.md`, and the tech-debt tracker now describe the broader single-target `think_live` DAG contract truthfully; final validation evidence is recorded; the plan is ready for final review and archive bookkeeping remains intentionally deferred.
- [x] 2026-04-22 Phase 4 targeted fix pass: stale UI create-run assertions now match the shipped `think_live` default, and the runbooks no longer promise post-completion sandbox inspection through the public live helper.

## Surprises & Discoveries

- The only production code that directly fixture-gates `think_live` is `resolveThinkTurnInput()` in `src/workflows/TaskWorkflow.ts`; compile and handoff persistence are already more general than the current docs imply.
- `compileRunPlan()` already supports arbitrary task arrays with dependency references and writes one `task_handoff` artifact per persisted `runTaskId`; the main runtime generalization seam is not in compile persistence.
- `RunWorkflow` already models dependency-driven readiness and cancellation, but it intentionally serializes ready roots by launching only the first `ready` task when nothing is active.
- Scheduler-side promotion/cancellation currently lacks the `ifStatusIn` protection that `TaskWorkflow` uses for its own status transitions. This is the main execution-model risk when enabling prompt fanout of all ready work.
- The repo exposes a `blocked` task status for listing/filtering, but the actual dependency-failure scheduler path emits `cancelled`, not `blocked`.
- `demo:run` always seeds the same committed planning-document fixtures from `fixtures/demo-run-documents/`, so an operator-facing DAG proof requires stronger committed fixture inputs, not just broader unit tests.
- The user explicitly wants `think_live` to become the default engine. That widens the operator/API contract beyond the earlier plan and should be handled deliberately in Phase 3 rather than as a late docs-only tweak.
- Broad baseline commands currently fail before source-level validation because repo-local toolchain binaries are missing:
  - `npm run lint` -> `eslint: command not found`
  - `npm run typecheck` -> `tsc: command not found`
  - `npm run test` -> `vitest: command not found`
  - `npm run build` -> `vite: command not found`
- After `npm install`, the Phase 1 focused test passed, but repo-wide `npm run typecheck` still fails on unrelated baseline issues in `src/keystone/agents/implementer/ImplementerAgent.ts` and `tests/lib/db-client-worker.test.ts`. Future phases should treat those as existing validation noise unless they explicitly take ownership of those files.
- The preserved no-`compileRepo` `think_live` rejection runs after workspace materialization because `resolveThinkTurnInput()` is inside the implementer step, so the regression test needs to assert both the explicit boundary error and that the implementer turn never starts.
- `updateRunTask(..., ifStatusIn)` already behaves like a guarded compare-and-swap by returning the current row on a status mismatch, so Phase 2 only needed scheduler call-site changes plus a repository regression to prove pending-only cancellation behavior.
- `TASK_WORKFLOW.createBatch()` only sees workflow instances that are still missing after `ensureTaskWorkflowFanout()` polls the whole scheduler batch, so Phase 2's `active + ready` contract has to be asserted through the namespace status-check path rather than by `createBatch()` payloads alone.
- `tests/lib/db-repositories.test.ts` is gated by `KEYSTONE_RUN_DB_TESTS=1` plus either `DATABASE_URL` or `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`; in the current workspace those env vars are unset, so the suite skips during standard Phase 2 validation.
- Phase 3's strongest public DAG assertion is the existing `/v1/runs/:runId/workflow` projection, not the task list alone; using that endpoint lets `demo:validate` assert root-count and dependency-edge structure without depending on exact compiled task names.
- Sandboxed host-like commands that use local IPC or localhost listeners still fail on this machine even after dependencies are installed: `rtk npm run test -- tests/scripts/demo-contracts.test.ts tests/http/app.test.ts tests/lib/workflow-ids.test.ts` fails inside the sandbox with `listen EPERM: operation not permitted 127.0.0.1`, and `rtk npm run db:migrate` fails inside the sandbox with `listen EPERM: operation not permitted /tmp/tsx-1000/14.pipe`.
- The host-local Worker can be brought up outside the sandbox and authenticated locally, but the live Phase 3 proof still does not archive cleanly in this environment: `env KEYSTONE_BASE_URL=http://127.0.0.1:8787 KEYSTONE_EXECUTION_ENGINE=think_live KEYSTONE_DEV_TOKEN=change-me-local-token KEYSTONE_DEMO_TENANT_ID=tenant-dev-local rtk npm run demo:run` exited with `Error: Expected archived run, received failed.`, and inspecting `GET /v1/projects/eb7e2c71-3e07-49f1-932f-e93e79b0e828/runs` afterwards showed the latest run `67086342-3e2b-4e0a-8ae4-c03720a99337` with `executionEngine: "think_live"`, `status: "failed"`, and `compiledFrom: null`.
- `demo:validate` originally fetched tasks and workflow state before failing an invalid `executionEngine`, so the fix pass had to move the run-detail engine guard earlier to keep malformed-detail failures closed and avoid extra requests.
- During the Phase 3 fix-pass host-proof recheck, `curl -sS -i http://127.0.0.1:8787/v1/health` failed with `Could not connect to server`, so no fresh outside-sandbox `demo:run` / `demo:validate` proof could be gathered; the earlier explicit `think_live` failure remains the latest live-proof blocker evidence.
- Phase 4 closeout broad validation uncovered additional repo-wide drift beyond the earlier `typecheck` note: `rtk npm run lint` currently fails with 22 existing errors across unchanged source/test files, and the host-permitted broad test rerun surfaced two stale `ui/src/test/app-shell.test.tsx` assertions that still expected the pre-Phase-3 `scripted` create-run body instead of the shipped `think_live` request body.
- A fresh host-local live rerun is still blocked on this machine. During Phase 4 closeout, `rtk curl -sS -i http://127.0.0.1:8787/v1/health` failed with `Could not connect to server` both inside and outside the sandbox, so the final review should carry forward both the earlier explicit `think_live` archived-run failure and the current not-listening state.
- The explicit live helper still does not carry a public `preserveSandbox` knob. That flag exists on the internal workflow payload, but `POST /v1/projects/:projectId/runs`, `demo:run`, and `demo:run:think-live` do not expose it, so runbooks must not imply post-completion sandbox inspection through those surfaces.

## Outcomes & Retrospective

Planning outcome on 2026-04-21:

- The workflow-generalization scope is now resolved tightly enough to execute without major design decisions mid-phase.
- The plan explicitly separates live handoff acceptance, scheduler safety, operator-facing proof, and documentation closeout.
- Compile-target selection remains out of scope and is preserved as separate debt.
- No implementation work has started yet. Execution approval is required before phases begin.

Execution update on 2026-04-21:

- Phase 1 completed with a scoped runtime change: `think_live` now accepts any project path that resolves exactly one compile repo before `TaskWorkflow`, while `think_mock` stays fixture-only and deterministic.
- The Phase 1 fix pass added the missing multi-target regression: non-fixture `think_live` now has explicit test coverage for the rejection path where `projectExecution.compileRepo` is absent, preserving the single-target boundary without a runtime change.
- Targeted validation now runs locally after `npm install`: `rtk npm run test -- tests/lib/workflows/task-workflow-think.test.ts` passes, while repo-wide `rtk npm run typecheck` remains blocked by unrelated baseline errors in `src/keystone/agents/implementer/ImplementerAgent.ts` and `tests/lib/db-client-worker.test.ts`.
- Phase 2 completed with a scoped scheduler change: `RunWorkflow` now fans out every `active` or `ready` task on each poll, while readiness promotion and dependency-failure cancellation both use pending-only guarded updates.
- Phase 2 validation now proves prompt fanout in the unit workflow suite: `rtk npm run test -- tests/lib/workflows/run-workflow-compile.test.ts` passes, `rtk npm run test -- tests/lib/workflows/run-workflow-compile.test.ts tests/lib/db-repositories.test.ts` passes with the DB repository suite skipped because its env gate is unset, and `rtk npm run typecheck` still fails only on the unrelated baseline errors in `src/keystone/agents/implementer/ImplementerAgent.ts` and `tests/lib/db-client-worker.test.ts`.
- The Phase 2 targeted fix pass closed the remaining review gaps without a runtime change: the workflow suite now proves the child launch happens in a scheduler pass that also polls an already-running unrelated root, and the repository suite now includes the missing guarded `pending -> ready` regression so an already-active task cannot be rewritten back to `ready`.
- Phase 3 completed with a scoped operator-contract change: the implicit execution-engine default now resolves to `think_live`, the committed demo planning-document fixtures now explicitly ask for multiple tasks with at least one dependency edge and at least two roots, and `demo:validate` now uses the workflow graph to require a non-trivial DAG for public `think_live` and `scripted` proofs while leaving the narrow `think_mock` path available.
- Phase 3 validation now proves the broadened contract directly: `rtk npm run test -- tests/http/run-input.test.ts tests/lib/workflow-ids.test.ts` ✅, `rtk npm run test -- tests/scripts/demo-contracts.test.ts tests/http/app.test.ts tests/lib/workflow-ids.test.ts` ✅ outside the sandbox because the script suite binds localhost, and `rtk npm run typecheck` ⚠️ still fails only on the unrelated baseline errors in `src/keystone/agents/implementer/ImplementerAgent.ts` and `tests/lib/db-client-worker.test.ts`.
- Host-local live-proof validation was attempted and reached the Worker, but it did not complete successfully in this environment. Concrete evidence: `curl -sS -i http://127.0.0.1:8787/v1/health` returned `200 OK`, then `env KEYSTONE_BASE_URL=http://127.0.0.1:8787 KEYSTONE_EXECUTION_ENGINE=think_live KEYSTONE_DEV_TOKEN=change-me-local-token KEYSTONE_DEMO_TENANT_ID=tenant-dev-local rtk npm run demo:run` failed with `Expected archived run, received failed`, and `GET /v1/projects/eb7e2c71-3e07-49f1-932f-e93e79b0e828/runs` showed the new `think_live` run in `failed` state with no compile provenance. Phase 3 records that blocker rather than expanding scope into deeper runtime repair.
- The Phase 3 targeted fix pass closed the remaining review findings without changing the underlying product default: `src/lib/runs/options.ts`, `src/http/api/v1/runs/contracts.ts`, and `scripts/run-local.ts` still default implicit run creation to `think_live`, while `scripts/demo-run.ts` now keeps only the zero-argument operator helper on `scripted` until a host-local live proof is reliable again. `demo:validate` now rejects malformed workflow graphs, missing dependency edges, and unknown dependency references before accepting a public `scripted` or `think_live` DAG proof, and the script suite now covers explicit `scripted` run/validate flows plus separate minimum-task, dependency-edge, root-count, and malformed-graph failures.
- Phase 3 fix-pass validation on 2026-04-21: `rtk npm run test -- tests/http/run-input.test.ts tests/lib/workflow-ids.test.ts` ✅, `rtk npm run test -- tests/scripts/demo-contracts.test.ts tests/http/app.test.ts tests/lib/workflow-ids.test.ts` ✅ outside the sandbox, and `rtk npm run typecheck` ⚠️ still fails only on the pre-existing baseline errors in `src/keystone/agents/implementer/ImplementerAgent.ts:215` and `tests/lib/db-client-worker.test.ts:24`. A fresh host-local proof could not be rerun because `curl -sS -i http://127.0.0.1:8787/v1/health` returned `Could not connect to server`, so the earlier explicit `think_live` failure remains the latest blocker evidence rather than a new code regression.
- Phase 4 completed the durable closeout without changing runtime code: `README.md`, the Think runtime docs, `.ultrakit/notes.md`, and the debt tracker now describe the broader single-target `think_live` DAG proof, `active + ready` scheduler fanout, the `think_live` API/runtime default versus the zero-argument `demo:run` scripted fallback, and the current host-local live-proof caveats. `TD-2026-04-17-001` is now closed, while compile-target selection remains separate under `TD-2026-04-17-002`.
- Phase 4 validation on 2026-04-21 recorded the durable-doc closeout truthfully except for two stale UI assertions: `rtk npm run think:smoke` ✅; `rtk npm run typecheck` ⚠️ still fails only on the known baseline errors in `src/keystone/agents/implementer/ImplementerAgent.ts:215` and `tests/lib/db-client-worker.test.ts:24`; `rtk npm run lint` ⚠️ now fails with 22 repo-wide issues across unchanged source/test files; `rtk npm run test` ⚠️ fails inside the sandbox because `tests/scripts/demo-contracts.test.ts` binds `127.0.0.1`; and `rtk curl -sS -i http://127.0.0.1:8787/v1/health` ⚠️ fails both inside and outside the sandbox with `Could not connect to server`, so no fresh Phase 4 live demo rerun was possible.
- Phase 4 targeted fix-pass validation on 2026-04-22: `rtk npm run test -- ui/src/test/app-shell.test.tsx` ✅. The earlier host-only `scripted` create-run expectation failures were stale contract assertions, not generic baseline noise.
- The plan is phase-complete and ready for the orchestrator's final comprehensive review. Archive bookkeeping is intentionally still deferred, so the completed-plan index remains unchanged until that review passes.

## Context and Orientation

The relevant runtime and proof seams are concentrated in a small set of files:

- `src/workflows/TaskWorkflow.ts`
  - `resolveThinkTurnInput()` now accepts `think_live` for single-target project-backed runs while keeping `think_mock` fixture-only
  - task-state transitions already use guarded `ifStatusIn` writes
  - Think tasks already record conversation locators and promote task-scoped artifacts
- `src/workflows/RunWorkflow.ts`
  - `promoteNewlyReadyRunTasks()` and `cancelBlockedRunTasks()` drive dependency-based readiness
  - `buildTaskWorkflowFanoutBatch()` now fans out the full `active + ready` task set
  - `ensureTaskWorkflowFanout()` already has deterministic workflow-instance repair logic
- `src/keystone/compile/plan-run.ts`
  - live compile already parses and persists generic DAGs
  - the mock fixture compile path still emits a single compiled task and should remain the deterministic `think_mock` path
- `src/keystone/tasks/load-task-contracts.ts`
  - validates compiled task uniqueness and dependency integrity by logical `taskId`
- `src/lib/db/runs.ts`
  - persists the compiled graph, seeding roots as `ready` and dependents as `pending`
  - `updateRunTask()` already supports `ifStatusIn`, which Phase 2 should reuse from scheduler helpers
- `src/lib/runs/options.ts`
  - now resolves the implicit default execution engine to `think_live` while preserving explicit `scripted` and `think_mock`
- `src/http/api/v1/runs/contracts.ts`
  - now defaults `runCreateRequestSchema.executionEngine` to `think_live`
- `scripts/demo-run.ts` and `scripts/demo-validate.ts`
  - seed committed run planning documents and provide the operator-facing proof commands
  - `demo:run` now keeps the zero-argument operator helper on `scripted`, while explicit `demo:run:think-live` and the request/runtime defaults remain `think_live`
  - `demo:validate` asserts DAG structure through the workflow graph and now rejects malformed or semantically inconsistent nodes/edges before accepting a public proof
- `fixtures/demo-run-documents/`
  - holds the committed planning-document fixture inputs used by `demo:run`
- Durable docs:
  - `README.md`
  - `.ultrakit/developer-docs/think-runtime-architecture.md`
  - `.ultrakit/developer-docs/think-runtime-runbook.md`
  - `.ultrakit/developer-docs/m1-local-runbook.md`
- Historical context:
  - `.ultrakit/exec-plans/completed/keystone-think-live-full-workflow.md`
  - `.ultrakit/exec-plans/tech-debt-tracker.md`

Two important non-goals should stay visible throughout execution:

- multi-component compile-target selection is separate work
- no new orchestration primitives or sandbox-topology redesign belong in this plan

## Plan of Work

The work starts by removing the last artificial runtime restriction on live Think task execution. `TaskWorkflow` should stop rejecting non-fixture compiled handoffs for single-target projects while leaving `think_mock` deterministic and fixture-only. This phase should touch only the live handoff gate and the task-workflow Think tests so the end-state contract is explicit before the scheduler changes.

Once the live handoff gate is gone, the next seam is the run scheduler. `RunWorkflow` already knows when a task becomes ready, but it still launches only one ready root at a time. That phase should change fanout to schedule all runnable work immediately, then harden scheduler writes so readiness promotion and dependency-failure cancellation cannot regress concurrently changing tasks.

After the runtime seams are in place, the operator-facing proof and default-engine contract need to catch up. `demo:run` should seed stronger committed planning-document fixtures that ask for a small but non-trivial DAG, `demo:validate` should assert structural DAG evidence for `think_live` rather than only one task plus compile provenance, and the implicit default execution engine should flip to `think_live` in the request/runtime contract while preserving explicit `scripted` and `think_mock` selection. The script-contract and API-facing tests should prove that broader behavior directly.

The final phase is documentation and closeout. Once the broader DAG proof passes, the README, Think runtime docs, and runbooks need to describe the new contract truthfully, and `TD-2026-04-17-001` should be closed or narrowed to whatever remains intentionally deferred. This phase should also capture the final validation evidence and prepare the plan for archive.

### Phase 1: Generalize live Think handoff acceptance

This phase removes the `think_live` fixture gate from `TaskWorkflow` for single-target projects while keeping `think_mock` deterministic and fixture-scoped. It should not change scheduler fanout, demo fixtures, or durable docs yet.

#### Phase Handoff

- **Goal:** Allow `think_live` to execute compiled handoffs for any single-target project shape that already reaches `TaskWorkflow`, while keeping `think_mock` fixture-only.
- **Scope Boundary:** In scope: `TaskWorkflow` live/mock turn-input gating and task-workflow Think tests. Out of scope: `RunWorkflow` scheduling, demo fixture docs, operator-facing validator changes, compile-target selection, and durable docs.
- **Read First:** `src/workflows/TaskWorkflow.ts`, `tests/lib/workflows/task-workflow-think.test.ts`, `src/lib/projects/runtime.ts`, `.ultrakit/developer-docs/think-runtime-architecture.md`.
- **Files Expected To Change:** `src/workflows/TaskWorkflow.ts`, `tests/lib/workflows/task-workflow-think.test.ts`.
- **Validation:** From repo root after dependencies are installed: `rtk npm run typecheck`; `rtk npm run test -- tests/lib/workflows/task-workflow-think.test.ts`. Success means `think_live` passes for non-fixture and dependent handoff cases, while `think_mock` still fails outside the fixture path and `think_live` still rejects non-single-target projects.
- **Plan / Docs To Update:** Update this plan’s `Progress`, `Execution Log`, `Surprises & Discoveries`, and the Phase 1 handoff `Status` / `Completion Notes` / `Next Starter Context`. Do not update durable docs yet.
- **Deliverables:** Production removal of the live-only fixture gate; targeted tests that preserve fixture-only `think_mock` behavior and cover broader `think_live` acceptance.
- **Commit Expectation:** `Generalize think_live handoff acceptance`
- **Known Constraints / Baseline Failures:** Repo-local dependencies were installed during Phase 1. `rtk npm run typecheck` now reaches source analysis but still fails on unrelated baseline errors in `src/keystone/agents/implementer/ImplementerAgent.ts` and `tests/lib/db-client-worker.test.ts`. Broad host validation is not required in this phase.
- **Status:** Completed on 2026-04-21.
- **Completion Notes:** `resolveThinkTurnInput()` now allows `think_live` whenever `projectExecution.compileRepo` is present, while `think_mock` still requires the inline fixture project. The targeted fix pass added explicit regression coverage for non-fixture single-target live acceptance, non-fixture `think_mock` rejection, dependent non-fixture live handoffs, and non-fixture `think_live` rejection when a multi-target project produces no `compileRepo`. Validation evidence: `rtk npm run test -- tests/lib/workflows/task-workflow-think.test.ts` ✅, `rtk npm run typecheck` ⚠️ blocked only by the unrelated baseline errors noted above.
- **Next Starter Context:** Phase 1 removed the last live handoff fixture identity gate and closed the review gap around the preserved single-target boundary. Phase 2 should now focus on `RunWorkflow` fanout and guarded scheduler writes; current repo-wide `typecheck` noise is limited to `src/keystone/agents/implementer/ImplementerAgent.ts` and `tests/lib/db-client-worker.test.ts`, not the Phase 1 files.

### Phase 2: Fan out all ready tasks safely

This phase changes scheduler behavior so every runnable task launches promptly and adds guarded scheduler transitions so the broader fanout remains sound on the shared run sandbox.

#### Phase Handoff

- **Goal:** Launch all runnable tasks on each `RunWorkflow` poll and harden scheduler status writes so prompt fanout does not introduce race-driven state regressions.
- **Scope Boundary:** In scope: `RunWorkflow` fanout batching, scheduler helper write guards, and run-workflow tests. Out of scope: `TaskWorkflow` live/mock turn-input logic, demo fixture docs, demo validator changes, compile-target selection, and durable docs.
- **Read First:** `src/workflows/RunWorkflow.ts`, `src/lib/db/runs.ts`, `tests/lib/workflows/run-workflow-compile.test.ts`, `.ultrakit/developer-docs/think-runtime-architecture.md`.
- **Files Expected To Change:** `src/workflows/RunWorkflow.ts`, `src/lib/db/runs.ts` if helper APIs need guarded updates, `tests/lib/workflows/run-workflow-compile.test.ts`, and any adjacent repository/workflow tests needed to cover guarded scheduler writes.
- **Validation:** From repo root after dependencies are installed: `rtk npm run typecheck`; `rtk npm run test -- tests/lib/workflows/run-workflow-compile.test.ts tests/lib/db-repositories.test.ts`. Success means two independent ready roots launch in the same first batch, newly ready work can launch while unrelated branches stay active, and dependency-failure cancellation still lands only from `pending`.
- **Plan / Docs To Update:** Update this plan’s `Progress`, `Execution Log`, `Surprises & Discoveries`, and the Phase 2 handoff `Status` / `Completion Notes` / `Next Starter Context`. Do not update durable docs yet.
- **Deliverables:** Scheduler batching over `active + ready` tasks; status-guarded scheduler writes; test coverage for parallel root launch and ready-while-active behavior.
- **Commit Expectation:** `Fan out ready task workflows safely`
- **Known Constraints / Baseline Failures:** `tests/lib/db-repositories.test.ts` may require the project DB test env to be configured; if so, record the exact gating env vars in the plan rather than silently skipping. Do not introduce a new `blocked` runtime status in this phase.
- **Status:** Completed on 2026-04-21.
- **Completion Notes:** `buildTaskWorkflowFanoutBatch()` now schedules the full `active` plus `ready` task union instead of serializing a single ready root, preserving deterministic workflow-instance IDs while allowing new work to launch during unrelated active branches. `promoteNewlyReadyRunTasks()` and `cancelBlockedRunTasks()` now use `updateRunTask(..., ifStatusIn: ["pending"])` and only treat rows as promoted/cancelled when the guarded transition actually lands. The targeted fix pass tightened the regression coverage without changing runtime behavior: workflow coverage now proves two independent roots launch in the first batch and that a newly ready child launches in a scheduler pass that also polls an already-running unrelated root, while repository coverage now proves both guarded cancellation and guarded ready promotion only mutate rows that are still `pending`. Validation evidence: `rtk npm run test -- tests/lib/workflows/run-workflow-compile.test.ts tests/lib/db-repositories.test.ts` ✅ with `tests/lib/db-repositories.test.ts` skipped because `KEYSTONE_RUN_DB_TESTS=1` plus `DATABASE_URL` or `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` were not set, `rtk npm run typecheck` ⚠️ blocked only by the unrelated baseline errors in `src/keystone/agents/implementer/ImplementerAgent.ts` and `tests/lib/db-client-worker.test.ts`.
- **Next Starter Context:** Phase 2 removed the ready-root serialization contract and closed the review gaps around observing `active + ready` scheduler fanout and guarded ready-promotion races, without changing runtime statuses or compile-target selection. Phase 3 should now focus on the operator-facing DAG proof: stronger committed demo documents, `think_live` as the implicit default engine, and validator/API/script tests that assert a non-trivial DAG. The current repo-wide `typecheck` noise is still limited to `src/keystone/agents/implementer/ImplementerAgent.ts` and `tests/lib/db-client-worker.test.ts`; DB repository integration coverage still requires `KEYSTONE_RUN_DB_TESTS=1` plus `DATABASE_URL` or `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`.

### Phase 3: Establish the operator-facing live DAG proof

This phase upgrades the committed demo inputs, run-create defaulting contract, script validator, and script-level tests so the live Think demo proves a real DAG instead of the older single-task-shaped contract.

#### Phase Handoff

- **Goal:** Make the operator-facing contract DAG-aware by flipping the implicit default to `think_live`, seeding committed non-trivial DAG fixtures, and strengthening the validator and script/API tests.
- **Scope Boundary:** In scope: `fixtures/demo-run-documents/`, `scripts/demo-run.ts`, `scripts/demo-validate.ts`, `src/lib/runs/options.ts`, `src/http/api/v1/runs/contracts.ts`, `tests/scripts/demo-contracts.test.ts`, and any supporting workflow/API tests needed for DAG assertions or default-engine coverage. Out of scope: compile-target selection, new orchestration primitives, broad durable-doc rewrites beyond what is necessary for in-repo script/test truth, and sandbox-topology changes.
- **Read First:** `scripts/demo-run.ts`, `scripts/demo-validate.ts`, `src/lib/runs/options.ts`, `src/http/api/v1/runs/contracts.ts`, `fixtures/demo-run-documents/specification.md`, `fixtures/demo-run-documents/architecture.md`, `fixtures/demo-run-documents/execution-plan.md`, `tests/scripts/demo-contracts.test.ts`, `tests/http/app.test.ts`, `tests/lib/workflow-ids.test.ts`.
- **Files Expected To Change:** `fixtures/demo-run-documents/specification.md`, `fixtures/demo-run-documents/architecture.md`, `fixtures/demo-run-documents/execution-plan.md`, `scripts/demo-run.ts`, `scripts/demo-validate.ts`, `src/lib/runs/options.ts`, `src/http/api/v1/runs/contracts.ts`, `tests/scripts/demo-contracts.test.ts`, `tests/http/app.test.ts`, `tests/lib/workflow-ids.test.ts`, and any supporting test files needed to assert DAG edges.
- **Validation:** From repo root after dependencies are installed: `rtk npm run typecheck`; `rtk npm run test -- tests/scripts/demo-contracts.test.ts tests/http/app.test.ts tests/lib/workflow-ids.test.ts`; if a local Worker is available outside the sandbox, run `rtk npm run demo:run` and `rtk npm run demo:validate`. Success means `think_live` is now the default for implicit run creation, the validator requires a non-trivial DAG with multiple tasks, at least one dependency edge, and at least one independent root for the public `think_live` proof, while explicit `scripted` and `think_mock` behavior still work.
- **Plan / Docs To Update:** Update this plan’s `Progress`, `Execution Log`, `Surprises & Discoveries`, and the Phase 3 handoff `Status` / `Completion Notes` / `Next Starter Context`. If the host-local proof cannot run, record the exact environment blocker.
- **Deliverables:** Stronger committed DAG-oriented planning-doc fixtures; `think_live` as the implicit default engine; a `think_live` validator that proves non-trivial DAG structure; script-level and API-facing contract coverage for the broader proof.
- **Commit Expectation:** `Make think_live the default DAG proof path`
- **Known Constraints / Baseline Failures:** The local Worker must run outside the Codex sandbox on this host. `demo:run` still seeds committed fixture docs, so DAG proof reliability depends on the fixture wording being strong enough to produce the intended structural result.
- **Status:** Completed on 2026-04-21.
- **Completion Notes:** The committed demo planning documents now explicitly request a small but non-trivial DAG with multiple tasks, at least one dependency edge, and at least two independent roots. `src/lib/runs/options.ts`, `src/http/api/v1/runs/contracts.ts`, and `scripts/run-local.ts` still treat `think_live` as the implicit request/runtime default, while `scripts/demo-run.ts` now keeps only the zero-argument operator helper on `scripted` until the host-local live proof is reliable again; explicit `scripted`, `think_mock`, and `demo:run:think-live` paths remain available. `demo:validate` now fetches `/v1/runs/:runId/workflow`, validates that the workflow graph is well-formed and that dependency edges resolve to known nodes, and fails closed for public `scripted` / `think_live` proofs unless it sees at least three tasks, at least two roots, and consistent dependency edges; the narrow `think_mock` path remains accepted. Validation evidence: `rtk npm run typecheck` ⚠️ blocked only by the unrelated baseline errors in `src/keystone/agents/implementer/ImplementerAgent.ts:215` and `tests/lib/db-client-worker.test.ts:24`; `rtk npm run test -- tests/http/run-input.test.ts tests/lib/workflow-ids.test.ts` ✅; `rtk npm run test -- tests/scripts/demo-contracts.test.ts tests/http/app.test.ts tests/lib/workflow-ids.test.ts` ✅ outside the sandbox because the script suite binds localhost. The earlier explicit live blocker remains recorded (`curl -sS -i http://127.0.0.1:8787/v1/health` had previously returned `200 OK`, but `env KEYSTONE_BASE_URL=http://127.0.0.1:8787 KEYSTONE_EXECUTION_ENGINE=think_live KEYSTONE_DEV_TOKEN=change-me-local-token KEYSTONE_DEMO_TENANT_ID=tenant-dev-local rtk npm run demo:run` failed with `Expected archived run, received failed`, leaving run `67086342-3e2b-4e0a-8ae4-c03720a99337` in `failed` state with `compiledFrom: null`), and the fix-pass recheck could not rerun the proof because `curl -sS -i http://127.0.0.1:8787/v1/health` now returns `Could not connect to server`.
- **Next Starter Context:** Phase 3 now reflects the review-driven split truthfully: the product/API default is still `think_live`, but the zero-argument `demo:run` helper is intentionally `scripted` until a host-local live proof archives reliably. Phase 4 should document that distinction clearly, carry forward both the earlier explicit `think_live` failure evidence and the latest “Worker not listening on 127.0.0.1:8787” blocker, and avoid widening scope into deeper runtime repair without new investigation.

### Phase 4: Update durable docs, close or narrow debt, and archive

This phase aligns durable docs to the validated DAG proof, records the final validation evidence, closes or narrows the workflow-generalization debt item, and prepares the plan for archive.

#### Phase Handoff

- **Goal:** Make the durable docs describe the validated live DAG contract truthfully and close the plan cleanly.
- **Scope Boundary:** In scope: README, Think runtime docs/runbooks, tech-debt tracker, active/completed plan indexes, and final validation evidence capture. Out of scope: new runtime behavior, compile-target selection, and any additional feature expansion beyond what prior phases already landed.
- **Read First:** `README.md`, `.ultrakit/developer-docs/think-runtime-architecture.md`, `.ultrakit/developer-docs/think-runtime-runbook.md`, `.ultrakit/developer-docs/m1-local-runbook.md`, `.ultrakit/exec-plans/tech-debt-tracker.md`, `.ultrakit/exec-plans/active/index.md`, `.ultrakit/exec-plans/completed/README.md`.
- **Files Expected To Change:** `README.md`, `.ultrakit/developer-docs/think-runtime-architecture.md`, `.ultrakit/developer-docs/think-runtime-runbook.md`, `.ultrakit/developer-docs/m1-local-runbook.md`, `.ultrakit/exec-plans/tech-debt-tracker.md`, this plan file, `.ultrakit/exec-plans/active/index.md`, and `.ultrakit/exec-plans/completed/README.md` when archiving.
- **Validation:** From repo root after dependencies are installed: `rtk npm run lint`; `rtk npm run typecheck`; `rtk npm run test`; `rtk npm run think:smoke`; if a local Worker is available outside the sandbox, rerun `KEYSTONE_EXECUTION_ENGINE=think_live rtk npm run demo:run` and `KEYSTONE_EXECUTION_ENGINE=think_live rtk npm run demo:validate`. Success means docs describe the broader DAG proof accurately and the final validation evidence matches that documented contract.
- **Plan / Docs To Update:** Update all living sections in this plan, especially `Progress`, `Execution Log`, `Surprises & Discoveries`, and `Outcomes & Retrospective`. Record the final status of `TD-2026-04-17-001`. Archive the plan only after the plan-contract archive checklist is satisfied.
- **Deliverables:** Updated durable docs, narrowed or closed workflow-generalization debt, final validation evidence, and a phase-complete plan ready for final review and archival bookkeeping.
- **Commit Expectation:** `Document the think_live DAG proof`
- **Known Constraints / Baseline Failures:** Dependencies are installed, but broad validation is still noisy on this machine: `rtk npm run typecheck` continues to fail on the known baseline errors in `src/keystone/agents/implementer/ImplementerAgent.ts` and `tests/lib/db-client-worker.test.ts`; `rtk npm run lint` currently fails with broader existing repo-wide issues; `rtk npm run test` still needs a host-permitted rerun because the script suite binds `127.0.0.1`; and `rtk npm run build` may still require a normal host shell because Wrangler writes outside the sandbox.
- **Status:** Completed on 2026-04-22 after the targeted fix pass.
- **Completion Notes:** Durable docs and plan artifacts now state the broadened `think_live` contract truthfully without overstating the demo helper surface: the runbooks still describe the API/runtime `think_live` default, the zero-argument `demo:run` scripted fallback, the broader DAG workflow/task proof surface, and the mixed host-local live-proof evidence from 2026-04-21, but they no longer claim that `demo:run:think-live` preserves the sandbox after completion. `ui/src/test/app-shell.test.tsx` now matches the shipped `POST /v1/projects/:projectId/runs` request body default of `{ "executionEngine": "think_live" }`, so the earlier host-only failures are resolved as stale contract assertions rather than baseline noise. Validation evidence for final review: `rtk npm run think:smoke` ✅; `rtk npm run typecheck` ⚠️ still fails only on `src/keystone/agents/implementer/ImplementerAgent.ts:215` and `tests/lib/db-client-worker.test.ts:24`; `rtk npm run lint` ⚠️ fails with 22 existing repo-wide issues; `rtk npm run test` ⚠️ still fails inside the sandbox with `listen EPERM: operation not permitted 127.0.0.1`; `rtk npm run test -- ui/src/test/app-shell.test.tsx` ✅; `rtk curl -sS -i http://127.0.0.1:8787/v1/health` ⚠️ failed both inside and outside the sandbox with `Could not connect to server`, so no fresh Phase 4 live demo rerun was possible.
- **Next Starter Context:** The plan is ready for the orchestrator's final comprehensive review. Do not archive it yet. The targeted fix pass resolved the stale UI test expectations and the inaccurate sandbox-preservation claim, so any remaining closeout review should preserve the documented split between the API/runtime `think_live` default and the zero-argument `demo:run` scripted helper, carry forward both the earlier explicit `think_live` archived-run failure and the current `127.0.0.1:8787` not-listening blocker, and keep multi-component compile-target selection isolated under `TD-2026-04-17-002`.

## Concrete Steps

Run all commands from repo root unless noted otherwise.

Baseline and environment prep:

```bash
rtk npm install
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

Targeted phase validations:

```bash
rtk npm run test -- tests/lib/workflows/task-workflow-think.test.ts
rtk npm run test -- tests/lib/workflows/run-workflow-compile.test.ts
rtk npm run test -- tests/scripts/demo-contracts.test.ts tests/http/app.test.ts
rtk npm run think:smoke
```

Host-local proof when the local Worker is available outside the sandbox:

```bash
rtk docker compose up -d postgres
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgres://postgres:postgres@127.0.0.1:5432/keystone"
rtk npm run db:migrate
rtk npm run dev -- --ip 127.0.0.1 --show-interactive-dev-session=false
KEYSTONE_EXECUTION_ENGINE=think_live rtk npm run demo:run
KEYSTONE_EXECUTION_ENGINE=think_live rtk npm run demo:validate
```

Expected observable results:

- Phase 1 validation: `think_live` task-workflow tests pass for non-fixture and dependent handoffs; `think_mock` remains fixture-only.
- Phase 2 validation: the first workflow fanout batch contains all ready roots, not one-at-a-time serialized launches.
- Phase 3 validation: the demo validator requires structural DAG evidence for `think_live`.
- Final validation: durable docs and demo/runbook wording match the proof that actually passed.

## Validation and Acceptance

Acceptance for the full plan requires all of the following:

- `think_live` can execute compiled handoffs for any single-target project shape that reaches `TaskWorkflow`
- implicit run creation defaults to `think_live`, while explicit `scripted` and `think_mock` requests remain available
- `RunWorkflow` launches all ready tasks immediately and preserves dependency semantics
- scheduler promotion/cancellation uses guarded state transitions and does not regress active work during broader fanout
- the operator-facing `think_live` demo proof validates a non-trivial DAG with multiple tasks, at least one dependency edge, and at least one independent root
- `think_mock` remains deterministic and fixture-scoped
- broad validation passes after dependencies are installed, or any host-specific or newly observed repo-wide failures are recorded truthfully rather than misclassified as Phase 4 regressions
- durable docs no longer say `think_live` is fixture-scoped if the validated contract is broader

Known current closeout validation results:

- `rtk npm run lint` currently fails with 22 repo-wide lint errors across unchanged source/test files
- `rtk npm run typecheck` still fails on the known baseline errors in `src/keystone/agents/implementer/ImplementerAgent.ts` and `tests/lib/db-client-worker.test.ts`
- `rtk npm run test` still fails inside the sandbox because `tests/scripts/demo-contracts.test.ts` binds `127.0.0.1`; the earlier host-only `ui/src/test/app-shell.test.tsx` failures were stale create-run expectations and `rtk npm run test -- ui/src/test/app-shell.test.tsx` now passes
- `rtk npm run think:smoke` passes
- `rtk curl -sS -i http://127.0.0.1:8787/v1/health` currently fails with `Could not connect to server`, so a fresh Phase 4 live demo rerun is blocked by local Worker availability

## Idempotence and Recovery

- Re-running compile is already protected by persisted-plan revision provenance and handoff existence checks; phases must preserve those guards rather than bypass them.
- Re-running `demo:validate` with `--run-id` or `KEYSTONE_RUN_ID` remains the safe way to validate a specific archived run without depending on `.keystone/demo-last-run.json`.
- If Phase 2 lands without Phase 3, the runtime may support broader DAG execution before the operator-facing proof catches up. In that case, update this plan so the next contributor knows that the remaining gap is proof/docs, not core DAG execution.
- If host-local validation is blocked by environment issues, record the exact blocker and the last successful targeted test evidence in this plan instead of guessing at runtime behavior.
- Do not reopen compile-target selection as an emergency fix during execution. If a phase unexpectedly hits multi-component compile ambiguity, stop, record it, and escalate rather than widening scope.

## Artifacts and Notes

- Final closeout evidence on 2026-04-21:
  - `rtk npm run lint` -> 22 existing repo-wide lint errors across unchanged source/test files
  - `rtk npm run typecheck` -> the known baseline errors in `src/keystone/agents/implementer/ImplementerAgent.ts:215` and `tests/lib/db-client-worker.test.ts:24`
  - `rtk npm run think:smoke` -> passed
  - `rtk npm run test` inside the sandbox -> `listen EPERM: operation not permitted 127.0.0.1` from `tests/scripts/demo-contracts.test.ts`
  - host `rtk npm run test` -> surfaced two stale `ui/src/test/app-shell.test.tsx` assertions that still expected `executionEngine: "scripted"` instead of the shipped `think_live` request body
  - `rtk npm run test -- ui/src/test/app-shell.test.tsx` on 2026-04-22 -> passed after aligning those stale UI expectations to `executionEngine: "think_live"`
  - `rtk curl -sS -i http://127.0.0.1:8787/v1/health` inside and outside the sandbox -> `curl: (7) Failed to connect to 127.0.0.1 port 8787`
- The current fixture compile helper still emits a single-task plan in `src/keystone/compile/plan-run.ts`. That path should remain the deterministic `think_mock` path and should not be generalized in this plan.
- The current run-workflow test explicitly codifies serialized root launches in `tests/lib/workflows/run-workflow-compile.test.ts`. Phase 2 is expected to invert that test contract intentionally.
- The current live demo documents are loaded from `fixtures/demo-run-documents/` via `scripts/demo-run.ts`. Phase 3 should treat those fixtures as the canonical operator-proof inputs.

## Interfaces and Dependencies

Important modules and interfaces:

- `src/workflows/TaskWorkflow.ts`
- `src/workflows/RunWorkflow.ts`
- `src/keystone/compile/plan-run.ts`
- `src/keystone/tasks/load-task-contracts.ts`
- `src/lib/db/runs.ts`
- `src/lib/workflows/ids.ts`
- `src/lib/runs/options.ts`
- `src/http/api/v1/runs/contracts.ts`
- `scripts/demo-run.ts`
- `scripts/demo-validate.ts`
- `fixtures/demo-run-documents/`

Key contracts to preserve:

- `CompiledRunPlan` and `CompiledTaskPlan` from `src/keystone/compile/contracts.ts`
- logical `taskId` in compile artifacts and dependency edges
- authoritative `runTaskId` in persistence, workflow instance IDs, and artifact ownership
- `updateRunTask(..., ifStatusIn)` as the guarded write primitive for task status changes
- one sandbox per run, task-specific worktrees inside that sandbox

Dependencies and platform primitives:

- existing Node/Vitest/TypeScript toolchain from `package.json`; no new dependency should be introduced for this plan
- existing Cloudflare Workflows runtime and deterministic workflow-instance IDs
- existing Think runtime integration; no change to the current Keystone/Think ownership boundary
