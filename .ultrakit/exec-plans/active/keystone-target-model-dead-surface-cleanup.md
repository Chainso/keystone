# Keystone Target-Model Dead-Surface Cleanup

## Purpose / Big Picture

Keystone's current backend contract is already the target-model shape: project-scoped runs, run-scoped planning documents, explicit compile, DAG-backed task execution, artifact-backed revisions, and direct run/task state in relational tables. The remaining problem is that parts of the repository still carry stale pre-target-model remnants from the old session/approval/event/decision-package era.

Those remnants are now misleading. They make contributors think the backend still has first-class approval flows, websocket run streaming, release/evidence/integration placeholder artifacts, or a broader Maestro session model than the current Think-backed runtime actually uses.

After this plan lands:

- dead route/control-plane leftovers are gone from backend code and tests,
- `src/maestro/` only expresses the runtime primitives that the current Think-backed execution path still uses,
- artifact helpers only model the artifact families that still exist in the current backend,
- contributor-facing docs point at a real target-model handoff document instead of a missing file,
- the repository no longer presents superseded backend shapes as if they were still current.

From the user's perspective, success means the checked-in backend and docs are honest about what Keystone is now: project/document/run/task/artifact-first, not session/approval/event/coordinator-first.

## Backward Compatibility

Backward compatibility is **not required** for this cleanup.

Keystone is not a live service, the target-model migration already explicitly removed the legacy route families, and the current repo docs say not to reintroduce approval, event, decision-package, or release/evidence/integration placeholder surfaces.

This plan therefore assumes:

- no obligation to preserve dormant legacy types, helper functions, or dead handlers,
- no obligation to keep object-key helpers or tests for artifact families that no longer exist in the current model,
- no obligation to preserve broken contributor links to a missing target-model document,
- no obligation to keep compatibility tombstones like a standalone websocket handler when the live router already treats the surface as absent.

Compatibility that **is** required:

- preserve the current operator-facing route set documented in `.ultrakit/developer-docs/m1-architecture.md`,
- preserve the current Think-backed task/runtime path and its targeted tests,
- preserve the current finalization behavior that writes `run_summary`,
- keep archived plans as historical records rather than rewriting them into current docs.

## Design Decisions

1. **Date:** 2026-04-21  
   **Decision:** Treat `.ultrakit/exec-plans/completed/keystone-target-model-migration.md`, `.ultrakit/developer-docs/m1-architecture.md`, and `.ultrakit/developer-docs/think-runtime-architecture.md` as the resolved target model for planning and execution.  
   **Rationale:** The original `keystone-target-model-handoff.md` is missing, but the archived migration plan explicitly names those files as the durable record of the target model.  
   **Alternatives considered:** Re-derive the target model from older specs; treat archived M1/UI-first plans as co-equal sources of truth.

2. **Date:** 2026-04-21  
   **Decision:** Delete dead backend compatibility scaffolding instead of preserving tombstones when the live product contract already treats the legacy surface as absent.  
   **Rationale:** The target-model migration explicitly removed approval, event, decision-package, and coordinator/stream surfaces. Keeping dead handlers or mocks around only obscures that fact.  
   **Alternatives considered:** Leave inert handlers in place as a reminder; convert dead handlers into explicit `410` compatibility endpoints.

3. **Date:** 2026-04-21  
   **Decision:** Narrow `src/maestro/` to the runtime primitives that the current Think-backed execution slice still uses, and remove dormant approval/session-event/lease-era contracts unless a live import proves they are still required.  
   **Rationale:** The current backend uses `maestro/agent-runtime.ts` as a runtime seam, but the broader `SessionEvent`, `Approval`, `Lease`, and `paused_for_approval` model is no longer part of the shipped backend contract.  
   **Alternatives considered:** Keep the broader contracts "for future use"; rename files without deleting the dead concepts.

4. **Date:** 2026-04-21  
   **Decision:** Phase 3 should both delete dead evidence/integration/release-pack helpers and narrow admitted artifact kinds at runtime/public-contract boundaries to the current family set: `document_revision`, `run_plan`, `task_handoff`, `task_log`, `run_note`, `run_summary`, and `staged_output`. Keep `runSummaryArtifactKey` stable in this pass unless code inspection proves the surviving storage path itself is coupled to removed public behavior.  
   **Rationale:** Deleting helper functions alone would still leave the backend open to stale artifact kinds because `artifactKind` is currently free-form across DB, workflow, and HTTP seams. Narrowing the admitted family set removes the real stale-model leak while avoiding a larger artifact-key migration.  
   **Alternatives considered:** Only delete the dead helper exports/tests; rename all surviving artifact keys as part of this plan.

5. **Date:** 2026-04-21  
   **Decision:** Restore a durable contributor-facing `keystone-target-model-handoff.md` rather than continuing to rely on a broken README link or forcing contributors to infer the target model from archived plans.  
   **Rationale:** The repo currently instructs contributors to read a file that does not exist. Restoring a concise handoff doc is clearer and more durable than only repointing links into archived plan prose.  
   **Alternatives considered:** Update all contributor-facing links to point directly at the archived migration plan; leave the missing handoff as documented tech debt.

6. **Date:** 2026-04-21  
   **Decision:** Defer naming-only cleanup of the live task-session bridge (`TaskSessionDO`, `sessionId`, `buildStableSessionId`) unless execution finds a zero-risk rename. Limit this plan to deleting clearly dead baggage around that seam, such as `parentSessionId` and stale test-only mocks.  
   **Rationale:** The task-session/sandbox bridge is live, broadly tested, and not part of the removed public HTTP contract. Broad renaming there is riskier than the dead-surface cleanup this plan is trying to finish.  
   **Alternatives considered:** Rename the whole task-session layer as part of this plan; leave even the obviously dead baggage untouched.

## Execution Log

- **Date:** 2026-04-21  
  **Phase:** Planning  
  **Decision:** Split the cleanup into separate route/control-plane, Maestro-runtime, artifact-surface, and documentation phases.  
  **Rationale:** The seams are independent, each has a distinct validation story, and each can be executed by a single implementation subagent without cross-cutting ambiguity.

- **Date:** 2026-04-21  
  **Phase:** Planning  
  **Decision:** Record both the broad repo baseline and the focused backend validation baseline before execution starts.  
  **Rationale:** The repo is already red in several unrelated areas, so the plan needs both the broad failure inventory and a cleanup-relevant green test subset.

- **Date:** 2026-04-21  
  **Phase:** Planning  
  **Decision:** Launch parallel explorer subagents across the stale-code seams before locking the execution plan.  
  **Rationale:** The user explicitly asked for delegated context gathering, and the seams are independent enough to justify parallel repository reads.

- **Date:** 2026-04-21  
  **Phase:** Execution - Phase 1 kickoff  
  **Decision:** Start execution with the dead websocket/control-plane cleanup and carry the active plan/index into the first phase commit while explicitly excluding the unrelated `package-lock.json` churn.  
  **Rationale:** The user approved execution, the Phase 1 seam is independently validated as dead/unregistered, and the current worktree would otherwise risk omitting the active plan from history or bundling unrelated lockfile noise into the cleanup commit.

- **Date:** 2026-04-21  
  **Phase:** Execution - Phase 1 complete  
  **Decision:** Delete `src/http/handlers/ws.ts`, remove the stale websocket mock from `tests/http/projects.test.ts`, and pin the removed realtime route with an explicit `/v1/runs/:runId/ws` `404` assertion in `tests/http/app.test.ts`.  
  **Rationale:** The live router never mounted the websocket handler, and one direct app-level negative assertion is a clearer contract than retaining dead compatibility code or relying only on generic fallthrough.

- **Date:** 2026-04-21  
  **Phase:** Execution - Phase 1 review closeout  
  **Decision:** Accept Phase 1 without a fix pass after the review round returned no critical or important findings.  
  **Rationale:** The only review note was a minor wording nit in this plan; the code, tests, and route-contract cleanup itself passed all five review dimensions.

- **Date:** 2026-04-21  
  **Phase:** Execution - Phase 2 kickoff  
  **Decision:** Narrow Phase 2 to deleting dead Maestro session/approval contracts, preserving only the live `WorkspaceStrategy`, `AgentRuntimeKind`, and `ArtifactStorageBackend` families, and limiting adjacent task-session cleanup to clearly write-only baggage such as `parentSessionId`.  
  **Rationale:** Read-only exploration confirmed those are the live import seams today, while `src/maestro/session.ts` is unimported dead code and the real integration risk sits with the still-live `sessionId`/`taskSessionId` path rather than with the removed approval vocabulary.

- **Date:** 2026-04-21  
  **Phase:** Execution - Phase 2 complete  
  **Decision:** Delete `src/maestro/session.ts`, narrow `src/maestro/contracts.ts` to the three still-live contract families, remove write-only `parentSessionId` state from `TaskSessionDO`, and drop the stale session-status mocks from `tests/lib/agents/keystone-think-agent.test.ts`.  
  **Rationale:** Repo search confirmed the deleted Maestro session surface had no consumers, while the surviving imports still map exactly to the live Think/task-workspace runtime slice and the focused validation suite stayed green after the narrowing.

- **Date:** 2026-04-21  
  **Phase:** Execution - Phase 2 review closeout  
  **Decision:** Accept Phase 2 without a fix pass after the review round returned no critical or important findings.  
  **Rationale:** The only review note was a minor observation that `src/maestro/contracts.ts` still carries a few unconsumed literals in the surviving value arrays; the live runtime seam, tests, and scoped cleanup itself all reviewed cleanly.

- **Date:** 2026-04-21  
  **Phase:** Execution - Phase 3 kickoff  
  **Decision:** Treat Phase 3 as a three-seam cleanup: delete dead artifact helpers, narrow artifact-kind admission at the persistence/runtime/public-contract boundaries, and keep the live `run_summary` storage key stable even though it still sits under the historical `release/` prefix.  
  **Rationale:** Read-only exploration showed the live artifact family set is already small, but the DB, workflow, and HTTP seams still admit arbitrary strings and the helper/test surface still preserves dead evidence/integration/release-pack families.

- **Date:** 2026-04-21  
  **Phase:** Execution - Phase 3 complete  
  **Decision:** Introduce one shared live artifact-kind model, delete the dead evidence/integration/release-pack key helpers, narrow task-stage promotion to `run_note` / `staged_output`, and make the focused tests assert both the surviving family set and the stable `runTaskId` / `run_summary` contracts.  
  **Rationale:** This closes the real stale-model leak at the DB/runtime/public seams instead of only deleting helper exports, while preserving the live `release/run-summary.json` object key and the authoritative `runTaskId` storage path.

## Progress

- [x] 2026-04-21 Reviewed the current target-model record in the archived migration plan plus the current M1 and Think runtime developer docs.
- [x] 2026-04-21 Confirmed there is no active execution plan in `.ultrakit/exec-plans/active/`.
- [x] 2026-04-21 Recorded the current broad baseline: `rtk npm run lint` fails with 24 existing errors, `rtk npm run typecheck` fails in `tests/lib/db-client-worker.test.ts`, `rtk npm test` fails in the already-broken UI suites and sandbox-only demo script binding path, and `rtk npm run build` passes when rerun outside the sandbox after the known Wrangler home-directory write failure.
- [x] 2026-04-21 Recorded a focused backend baseline: `rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts tests/lib/artifact-keys.test.ts tests/lib/finalize-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts tests/lib/agents/keystone-think-agent.test.ts` passes, and `rtk npm run test -- tests/lib/agents/implementer-agent.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts` passes.
- [x] 2026-04-21 User approved execution; active-plan status moved to `In Progress`, and Phase 1 was re-verified against the current route tree before handing off implementation.
- [x] 2026-04-21 Phase 1 complete: deleted the dead websocket handler, removed the stale projects-test mock, and made removed-surface coverage assert `/v1/runs/:runId/ws` returns `404`.
- [x] 2026-04-21 Phase 1 review passed across spec compliance, test quality, code quality, regression safety, and integration coherence; no fix pass was required.
- [x] 2026-04-21 Phase 2 execution context re-gathered: only `WorkspaceStrategy`, `AgentRuntimeKind`, and `ArtifactStorageBackend` are live Maestro exports; `src/maestro/session.ts` is dead; `parentSessionId` is write-only; `sessionId`/`taskSessionId` remain live and out of scope for renaming.
- [x] 2026-04-21 Phase 2 complete: deleted the dead `src/maestro/session.ts` module, narrowed `src/maestro/contracts.ts` to `WorkspaceStrategy` / `AgentRuntimeKind` / `ArtifactStorageBackend`, removed `parentSessionId` from `TaskSessionDO`, and cleaned stale `getSessionRecord` / `updateSessionStatus` mocks from `tests/lib/agents/keystone-think-agent.test.ts`.
- [x] 2026-04-21 Phase 2 review passed across spec compliance, test quality, code quality, regression safety, and integration coherence; no fix pass was required.
- [x] 2026-04-21 Phase 3 execution context re-gathered: live artifact kinds are `document_revision`, `run_plan`, `task_handoff`, `task_log`, `run_note`, `run_summary`, and `staged_output`; dead helper families remain in `src/lib/artifacts/keys.ts`; DB/workflow/HTTP seams still admit free-form artifact kinds; `run_summary` must keep its current deterministic storage key.
- [x] 2026-04-21 Phase 3 complete: added `src/lib/artifacts/model.ts` as the shared live-family source of truth, removed the dead key helpers, narrowed DB/API/task-runtime artifact-kind admission to the surviving families, kept `run_summary` at `release/run-summary.json`, and updated the focused tests to assert the remaining contracts explicitly.
- [ ] Phase 4 complete: restore contributor-facing target-model docs and clean the remaining README/notes source-of-truth drift after the code cleanup lands.

## Surprises & Discoveries

- The repo's strongest target-model statement is no longer a standalone developer doc. The archived target-model migration plan explicitly says the missing handoff should be replaced by the archived plan plus the current architecture docs.
- `src/http/handlers/ws.ts` still exists even though removed-surface tests already assert `404` for the old approval/event/coordinator/decision-package families and the websocket handler does not appear to be registered on the current route tree.
- `src/maestro/contracts.ts` still models `Approval`, `SessionEvent`, `Lease`, `integration`, and `paused_for_approval`, but the current Think runtime only appears to need the narrower runtime primitives exposed through `maestro/agent-runtime.ts`.
- `src/lib/artifacts/keys.ts` still exports helpers for task evidence indexes, integration merge reports, and release packs even though the current backend contract says those placeholder families are removed. The focused backend baseline still passes because tests explicitly preserve those helpers today.
- Artifact-kind validation is still open: DB inserts, workflow promotion, and the public artifact contract currently accept arbitrary string kinds even though the live runtime only emits a much smaller family set.
- Contributor-facing docs drift beyond the missing handoff link. README and notes still contain stale Workstreams, `/v1/runs`, inline decision-package, and `RunCoordinatorDO` language that no longer matches the current target-model backend.
- The broad repo baseline is noisy and must not be used as a cleanup acceptance gate. Focused backend tests are a better signal for this plan.
- Phase 1 re-verification confirmed `src/http/handlers/ws.ts` is unregistered dead code: the live app mounts `src/http/router.ts`, which only registers the `v1` route matrix, and repo search now only finds the websocket handler file itself plus a stale mock in `tests/http/projects.test.ts`.
- The old websocket path is not currently asserted explicitly in `tests/http/app.test.ts`; removed-surface coverage is implicit via the app-level `404` fallback unless Phase 1 adds a direct `/v1/runs/:runId/ws` negative assertion.
- After Phase 1 cleanup, the only remaining websocket-path reference in code/tests is the explicit `/v1/runs/:runId/ws` negative assertion in `tests/http/app.test.ts`; no live imports or route registrations surfaced.
- Phase 2 reachability checks were cleaner than expected: repo search found no imports of `src/maestro/session.ts` or its status helpers anywhere, so the runtime narrowing did not require follow-on production rewiring beyond the planned `parentSessionId` and stale-test cleanup.
- Phase 2 review found one minor leftover in `src/maestro/contracts.ts`: the surviving value arrays still include unconsumed literals such as `clone_fetch`, `scripted`, and `external`. That did not block the phase because no live runtime consumer depends on those values today.
- Phase 3 re-verification showed the code already emits only `document_revision`, `run_plan`, `task_handoff`, `task_log`, `run_note`, `run_summary`, and `staged_output`, but the persistence/runtime/public seams still admit arbitrary artifact-kind strings and would echo unexpected values into storage paths and API responses.
- Phase 3 implementation exposed one extra runtime nuance: `run_summary` is still a live artifact family overall, but task-stage promotion must reject it because Think/scripted task turns are only allowed to mint `run_note` and `staged_output`.

## Outcomes & Retrospective

Phases 1 through 3 landed as planned: the backend tree no longer carries the dead websocket handler, stale Maestro session/approval contracts, adjacent write-only `parentSessionId` baggage, or dead evidence/integration/release-pack artifact helpers. Artifact kinds now share one narrowed source of truth across DB inserts, task-stage promotion, sandbox projection metadata, and the public artifact resource schema, while the live `run_summary` key remains at `release/run-summary.json` and the authoritative `runTaskId` storage/API contract stays intact. The focused route/runtime/artifact suite passed after each narrowing pass.

If later phases uncover a live dependency on one of the remaining suspected dead seams, update this section and the relevant phase handoff before continuing.

## Context and Orientation

The current target model is documented in three places that must stay aligned:

- `.ultrakit/exec-plans/completed/keystone-target-model-migration.md`
- `.ultrakit/developer-docs/m1-architecture.md`
- `.ultrakit/developer-docs/think-runtime-architecture.md`

Those docs say the current backend is project/document/run/task/artifact-first and explicitly remove:

- approval routes,
- event / stream live-update routes,
- decision-package resources,
- evidence / integration / release placeholder routes,
- session/event-derived product state,
- coordinator-driven live fanout.

The likely cleanup seams are:

- `src/http/handlers/ws.ts` plus any test mocks or router references that keep the old websocket surface alive as a dead file,
- `src/maestro/contracts.ts` and `src/maestro/session.ts`, which still carry approval/session-era contract vocabulary even though `src/maestro/agent-runtime.ts` is the active runtime seam,
- `src/lib/artifacts/keys.ts` plus `tests/lib/artifact-keys.test.ts`, which still model evidence/integration/release-pack helpers,
- `src/lib/db/artifacts.ts`, `src/http/api/v1/artifacts/contracts.ts`, `src/workflows/TaskWorkflow.ts`, `src/durable-objects/TaskSessionDO.ts`, and `src/http/api/v1/runs/handlers.ts`, which still leave artifact-kind admission broader than the current runtime model,
- contributor-facing docs such as `README.md`, `.ultrakit/developer-docs/README.md`, and `.ultrakit/notes.md`, which still point at a missing target-model handoff file or describe superseded contract behavior.

Important supporting files during execution:

- `tests/http/app.test.ts` proves removed public surfaces return `404`,
- `tests/http/projects.test.ts` still contains a mock for `src/http/handlers/ws`,
- `src/keystone/integration/finalize-run.ts` is the active runtime writer for `run_summary`,
- `tests/lib/finalize-run.test.ts` and `tests/lib/workflows/run-workflow-compile.test.ts` cover the current finalization path,
- `src/keystone/agents/base/KeystoneThinkAgent.ts` and the task workflow tests cover the current runtime slice that still relies on `maestro/agent-runtime.ts`,
- `.ultrakit/notes.md` and `README.md` still contain pre-target-model contract guidance that should be corrected in the final docs phase.

The current repo baseline matters during execution:

- `rtk npm run lint` is already red in unrelated files,
- `rtk npm run typecheck` is already red in `tests/lib/db-client-worker.test.ts`,
- `rtk npm test` is already red in the UI suites and demo-contract scripts,
- `rtk npm run build` requires a host-permitted run on this machine because sandboxed Wrangler writes under `~/.config/.wrangler`.

That means phase validation should use focused backend commands, not the broad repo commands, unless a phase explicitly changes one of the broad baseline failures.

## Plan of Work

Execution starts by deleting the dead HTTP/realtime leftovers that no longer participate in the live route tree. That is the smallest, safest cleanup seam and immediately removes one misleading backend artifact without reopening the active project/document/run/task APIs.

The next step is to narrow the residual Maestro contract surface to the Think-backed runtime the repository actually uses today. This phase is intentionally limited to dead session/approval/event-era scaffolding and any imports/tests that still refer to it.

After the runtime surface is narrowed, execution moves to artifact cleanup. This phase removes the dead evidence/integration/release-pack helper families, narrows admitted artifact kinds to the current runtime family set, and updates the focused artifact/finalization/workflow tests so the checked-in helper surface matches the current backend contract.

The final phase restores the missing target-model handoff doc and updates the broader contributor-facing doc drift in README, developer-doc indexes, and notes. This phase happens last so the new handoff can describe the final cleaned backend state rather than the partially-cleaned one.

## Concrete Steps

1. Inspect the current seams before editing:

```bash
cd /home/chanzo/.codex/worktrees/c645/keystone-cloudflare
rtk rg -n "runWebSocketHandler|approvals|decision-packages|evidence|integration|release|paused_for_approval|SessionEvent|Approval" src tests README.md .ultrakit
```

2. Phase 1 validation command:

```bash
cd /home/chanzo/.codex/worktrees/c645/keystone-cloudflare
rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts
```

3. Phase 2 validation commands:

```bash
cd /home/chanzo/.codex/worktrees/c645/keystone-cloudflare
rtk npm run test -- tests/lib/agents/keystone-think-agent.test.ts tests/lib/agents/implementer-agent.test.ts tests/lib/task-session-do.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts
```

4. Phase 3 validation commands:

```bash
cd /home/chanzo/.codex/worktrees/c645/keystone-cloudflare
rtk npm run test -- tests/lib/artifact-keys.test.ts tests/lib/finalize-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts tests/lib/agents/implementer-agent.test.ts tests/http/projects.test.ts
```

5. Final focused cleanup validation after Phase 4:

```bash
cd /home/chanzo/.codex/worktrees/c645/keystone-cloudflare
rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts tests/lib/artifact-keys.test.ts tests/lib/finalize-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts tests/lib/agents/keystone-think-agent.test.ts tests/lib/agents/implementer-agent.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts
```

6. Final host build proof after backend cleanup, if code changes touch buildable source:

```bash
cd /home/chanzo/.codex/worktrees/c645/keystone-cloudflare
rtk npm run build
```

Expected result: same host-permitted build success observed during planning, with no new backend build regressions.

## Validation and Acceptance

This plan is complete when all of the following are true:

- the repository no longer contains dead backend code that implies websocket run streaming or approval/event/decision-package control-plane support still exists,
- `src/maestro/` no longer exports dormant approval/session-event/lease-era shapes that are not needed by the current Think-backed runtime,
- artifact helper modules and validation seams no longer admit stale evidence/integration/release artifact kinds that the current backend does not ship,
- `README.md`, `.ultrakit/developer-docs/README.md`, and `.ultrakit/notes.md` point to a real contributor-facing target-model handoff doc or otherwise describe only the current contract,
- the focused backend validation commands in this plan pass,
- no phase reintroduces any of the broad baseline failures outside their current known set.

Known pre-existing failures that are **not** regressions for this plan unless they worsen:

- `rtk npm run lint` failing with the current 24 unrelated errors,
- `rtk npm run typecheck` failing in `tests/lib/db-client-worker.test.ts`,
- `rtk npm test` failing in the UI suites and in the sandbox-only `listen EPERM` demo-contract path,
- sandboxed `rtk npm run build` failing because Wrangler tries to write under `~/.config/.wrangler`.

## Idempotence and Recovery

Each phase should be safe to retry because the work is deletion- and narrowing-oriented:

- deleting an unused file should be paired with the test/doc updates that remove its last references,
- if a phase uncovers a live import that makes a suspected dead seam still necessary, stop, update the plan, and narrow the deletion rather than pushing through a breaking removal,
- if a validation command fails, restore only the current phase's scope rather than reverting unrelated worktree changes,
- keep the focused test commands green after each phase so the next contributor can resume from a coherent intermediate state.

The broad repo baseline is intentionally not part of phase completion. Recovery should compare failures against the planning baseline before treating them as regressions.

## Artifacts and Notes

Planning baseline evidence:

- `rtk npm run lint` -> fails with 24 existing errors, including an unused `_context` in `src/http/handlers/ws.ts`.
- `rtk npm run typecheck` -> fails in `tests/lib/db-client-worker.test.ts` because `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` is missing from the test env shape.
- `rtk npm test` -> fails broadly in the UI suites (`window.localStorage.clear is not a function`) and in demo-contract script tests inside the sandbox (`listen EPERM: operation not permitted 127.0.0.1`).
- `rtk npm run build` -> fails in the sandbox because Wrangler cannot write logs under `~/.config/.wrangler`, then passes when rerun outside the sandbox.
- `rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts tests/lib/artifact-keys.test.ts tests/lib/finalize-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts tests/lib/agents/keystone-think-agent.test.ts` -> passes.
- `rtk npm run test -- tests/lib/agents/implementer-agent.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts` -> passes.
- Phase 1 validation: `rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts` -> passes after deleting `src/http/handlers/ws.ts`, removing the stale websocket mock from `tests/http/projects.test.ts`, and adding a direct `/v1/runs/run-123/ws` `404` assertion in `tests/http/app.test.ts`.
- Phase 2 reachability check: `rtk rg -n "SessionType|SessionStatus|WorkspaceStrategy|AgentRuntimeKind|ArtifactStorageBackend|SessionEvent|Approval|Lease|canTransitionSessionStatus|buildConfiguredSession|deriveSessionStatusForAgentTurnOutcome|parentSessionId" src tests` -> only `WorkspaceStrategy`, `AgentRuntimeKind`, and `ArtifactStorageBackend` are live imports; `src/maestro/session.ts` is self-contained dead code; `parentSessionId` is write-only in `src/durable-objects/TaskSessionDO.ts`.
- Phase 2 validation: `rtk npm run test -- tests/lib/agents/runtime-contract.test.ts tests/lib/agents/keystone-think-agent.test.ts tests/lib/agents/implementer-agent.test.ts tests/lib/task-session-do.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts` -> passes (6 files, 23 tests) after deleting `src/maestro/session.ts`, narrowing `src/maestro/contracts.ts`, removing `parentSessionId`, and cleaning the stale Think-agent test mocks.
- Phase 3 validation: `rtk npm run test -- tests/lib/artifact-keys.test.ts tests/lib/compile-plan-run.test.ts tests/lib/finalize-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts tests/lib/agents/implementer-agent.test.ts tests/http/projects.test.ts` -> passes (8 files, 56 tests) after adding `src/lib/artifacts/model.ts`, deleting the dead key helpers, narrowing `artifactKind` / staged-artifact typing to the live families, and updating the focused tests to reject stale/public/runtime kinds while keeping `run_summary` and `runTaskId` assertions explicit.

Primary file inventory for execution:

- `src/http/handlers/ws.ts`
- `tests/http/app.test.ts`
- `tests/http/projects.test.ts`
- `src/maestro/contracts.ts`
- `src/maestro/session.ts`
- `src/maestro/agent-runtime.ts`
- `src/keystone/agents/base/KeystoneThinkAgent.ts`
- `src/lib/artifacts/keys.ts`
- `src/lib/artifacts/model.ts`
- `src/lib/db/artifacts.ts`
- `src/http/api/v1/artifacts/contracts.ts`
- `src/keystone/integration/finalize-run.ts`
- `src/workflows/TaskWorkflow.ts`
- `src/durable-objects/TaskSessionDO.ts`
- `tests/lib/artifact-keys.test.ts`
- `tests/lib/finalize-run.test.ts`
- `README.md`
- `.ultrakit/developer-docs/README.md`
- `.ultrakit/notes.md`
- `.ultrakit/developer-docs/m1-architecture.md`
- `.ultrakit/developer-docs/think-runtime-architecture.md`

## Interfaces and Dependencies

Important interfaces and boundaries in this plan:

- `src/http/api/v1/**`: the current target-model HTTP contract that must remain intact,
- `tests/http/app.test.ts`: authoritative removed-surface coverage for approval/event/coordinator/decision-package route absence,
- `src/maestro/agent-runtime.ts`: the active execution/runtime seam that must remain after the broader Maestro cleanup,
- `src/keystone/agents/base/KeystoneThinkAgent.ts`: current Think-backed runtime adapter that depends on the narrower Maestro runtime surface,
- `src/workflows/TaskWorkflow.ts` and `src/workflows/RunWorkflow.ts`: current execution path that must keep passing targeted tests,
- `src/lib/artifacts/keys.ts`, `src/lib/db/artifacts.ts`, `src/http/api/v1/artifacts/contracts.ts`, and `src/keystone/integration/finalize-run.ts`: current artifact/finalization seam,
- `.ultrakit/developer-docs/keystone-target-model-handoff.md`: contributor-facing handoff doc to restore in the documentation phase.

No new third-party dependencies are expected in this plan. The work should reuse the current TypeScript, Vitest, and existing developer-doc structure.

## Phase 1 - Remove Dead HTTP/Realtime Control-Plane Leftovers

Delete backend code and test scaffolding that still implies the removed websocket/control-plane surfaces exist, while keeping the current target-model route contract unchanged.

### Phase Handoff

**Status:** Complete

**Goal**  
Remove dead route/control-plane leftovers such as the unused websocket handler and any stale mocks or references that keep it alive.

**Scope Boundary**  
In scope: `src/http/handlers/ws.ts`, stale tests or mocks that reference it, and any focused backend docs/comments directly tied to that dead file.  
Out of scope: changing the live project/document/run/task/artifact routes, reintroducing stream endpoints, or changing the `404` removed-surface assertions in `tests/http/app.test.ts` except where necessary to keep them honest.

**Read First**  
`src/http/handlers/ws.ts`  
`tests/http/app.test.ts`  
`tests/http/projects.test.ts`  
`.ultrakit/developer-docs/m1-architecture.md`

**Files Expected To Change**  
`src/http/handlers/ws.ts`  
`tests/http/projects.test.ts`  
Potentially `tests/http/app.test.ts` if a dead-surface assertion needs to move or be clarified.

**Validation**  
Run `rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts` from repo root.  
Success means the removed-surface coverage still passes and there are no remaining references that require the deleted websocket handler.

**Plan / Docs To Update**  
Update this plan's `Progress`, `Execution Log`, `Surprises & Discoveries`, and `Artifacts and Notes` sections.  
Do not update broader contributor docs yet unless Phase 1 changes a statement that would otherwise become false immediately.

**Deliverables**  
A backend tree with no dead websocket handler file or stale mock references for the removed control-plane surface.

**Commit Expectation**  
`Remove dead realtime control-plane leftovers`

**Known Constraints / Baseline Failures**  
Broad `npm test` is already red in unrelated UI suites; only the focused HTTP tests matter for this phase.

**Completion Notes**  
Deleted `src/http/handlers/ws.ts`, removed the stale `../../src/http/handlers/ws` mock from `tests/http/projects.test.ts`, and hardened removed-surface coverage in `tests/http/app.test.ts` with an explicit `/v1/runs/run-123/ws` `404` assertion. Focused validation passed with `rtk npm run test -- tests/http/app.test.ts tests/http/projects.test.ts`.

**Next Starter Context**  
Phase 1 is complete and should be committed without the unrelated `package-lock.json` churn. Phase 2 should read `src/maestro/contracts.ts`, `src/maestro/session.ts`, `src/maestro/agent-runtime.ts`, `tests/lib/agents/keystone-think-agent.test.ts`, `tests/lib/agents/implementer-agent.test.ts`, `tests/lib/task-session-do.test.ts`, `tests/lib/workflows/task-workflow-think.test.ts`, and `tests/lib/workflows/task-workflow-scripted.test.ts`, then remove only the dormant approval/session-event/lease-era Maestro scaffolding that the live runtime no longer imports.

## Phase 2 - Narrow Maestro to the Current Runtime Slice

Delete dormant session/approval/event-era Maestro contracts and keep only the runtime primitives the current Think-backed execution path still uses, including adjacent dead baggage like `parentSessionId` and stale session-status test mocks.

### Phase Handoff

**Status:** Complete

**Goal**  
Make `src/maestro/` honest about the current backend by removing or narrowing dead legacy contracts while preserving the active agent-runtime seam.

**Scope Boundary**  
In scope: `src/maestro/contracts.ts`, `src/maestro/session.ts`, `src/maestro/agent-runtime.ts`, dead session-era baggage directly adjacent to the live task-session seam such as `parentSessionId`, and any direct imports/tests that depend on those files.  
Out of scope: redesigning the Think runtime, renaming the live task-session bridge wholesale, changing task execution behavior, or inventing new Maestro abstractions beyond what the live runtime needs today.

**Read First**  
`src/maestro/contracts.ts`  
`src/maestro/session.ts`  
`src/maestro/agent-runtime.ts`  
`src/keystone/agents/base/KeystoneThinkAgent.ts`  
`src/durable-objects/TaskSessionDO.ts`  
`src/workflows/TaskWorkflow.ts`  
`tests/lib/agents/keystone-think-agent.test.ts`  
`.ultrakit/developer-docs/think-runtime-architecture.md`

**Files Expected To Change**  
`src/maestro/contracts.ts`  
`src/maestro/session.ts`  
`src/maestro/agent-runtime.ts`  
Potentially small import updates in `src/keystone/agents/base/KeystoneThinkAgent.ts`, `src/durable-objects/TaskSessionDO.ts`, or nearby tests.

**Validation**  
Run `rtk npm run test -- tests/lib/agents/runtime-contract.test.ts tests/lib/agents/keystone-think-agent.test.ts tests/lib/agents/implementer-agent.test.ts tests/lib/task-session-do.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts`.  
Success means the Think-backed runtime and task workflow tests still pass after the contract narrowing.

**Plan / Docs To Update**  
Update this plan's living sections.  
Defer contributor-facing doc rewrites to Phase 4 unless Phase 2 makes an existing architecture statement materially false.

**Deliverables**  
A narrower `src/maestro/` surface that no longer exports dormant approval/session-event/lease-era concepts, plus removal of the obviously dead `parentSessionId`/stale test baggage discovered during planning.

**Commit Expectation**  
`Narrow Maestro runtime contracts`

**Known Constraints / Baseline Failures**  
`rtk npm run typecheck` is already red outside this phase because of `tests/lib/db-client-worker.test.ts`; do not use broad typecheck as the phase gate.

**Completion Notes**  
Deleted `src/maestro/session.ts`, narrowed `src/maestro/contracts.ts` to the live `WorkspaceStrategy`, `AgentRuntimeKind`, and `ArtifactStorageBackend` families, removed write-only `parentSessionId` baggage from `src/durable-objects/TaskSessionDO.ts`, and dropped the stale `getSessionRecord` / `updateSessionStatus` mocks from `tests/lib/agents/keystone-think-agent.test.ts`. Focused validation passed with `rtk npm run test -- tests/lib/agents/runtime-contract.test.ts tests/lib/agents/keystone-think-agent.test.ts tests/lib/agents/implementer-agent.test.ts tests/lib/task-session-do.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts`.

**Next Starter Context**  
Phase 2 is complete and should be committed without the unrelated `package-lock.json` churn. Phase 3 can now focus entirely on artifact-surface narrowing: `src/lib/artifacts/keys.ts`, `src/lib/db/artifacts.ts`, `src/http/api/v1/artifacts/contracts.ts`, `src/keystone/integration/finalize-run.ts`, and the focused artifact/finalization/workflow tests. The Maestro runtime seam is now reduced to the live contract families, `src/maestro/session.ts` is gone, and the `sessionId` / `taskSessionId` / `buildStableSessionId` bridge remains unchanged for the next pass.

## Phase 3 - Narrow the Artifact Surface to the Current Model

Delete artifact helper families and validation seams that still model removed evidence/integration/release placeholder concepts while keeping the active finalization path intact.

### Phase Handoff

**Status:** Complete

**Goal**  
Align the artifact helper surface with the current backend by removing dead evidence/integration/release-pack helpers, narrowing admitted artifact kinds to the current runtime family set, and updating focused tests accordingly.

**Scope Boundary**  
In scope: `src/lib/artifacts/keys.ts`, `src/lib/db/artifacts.ts`, `src/http/api/v1/artifacts/contracts.ts`, the task/finalization promotion seams, the focused artifact/finalization/workflow tests, and small runtime adjustments needed to close artifact-kind admission over the current family set.  
Out of scope: redesigning the entire artifact model, changing `run_summary` behavior beyond what is required for artifact-kind narrowing, or introducing new artifact families.

**Read First**  
`src/lib/artifacts/keys.ts`  
`src/lib/artifacts/model.ts`  
`src/lib/db/artifacts.ts`  
`src/lib/db/schema.ts`  
`src/http/api/v1/artifacts/contracts.ts`  
`src/http/api/v1/runs/projections.ts`  
`src/maestro/agent-runtime.ts`  
`src/keystone/agents/implementer/ImplementerAgent.ts`  
`src/keystone/integration/finalize-run.ts`  
`src/workflows/TaskWorkflow.ts`  
`src/durable-objects/TaskSessionDO.ts`  
`src/http/api/v1/runs/handlers.ts`  
`tests/lib/artifact-keys.test.ts`  
`tests/lib/compile-plan-run.test.ts`  
`tests/lib/finalize-run.test.ts`  
`tests/lib/workflows/run-workflow-compile.test.ts`  
`.ultrakit/developer-docs/m1-architecture.md`

**Files Expected To Change**  
`src/lib/artifacts/keys.ts`  
`src/lib/artifacts/model.ts`  
`src/lib/db/artifacts.ts`  
`src/lib/db/schema.ts`  
`src/http/api/v1/artifacts/contracts.ts`  
`tests/lib/artifact-keys.test.ts`  
Potentially `src/http/api/v1/runs/projections.ts`, `src/maestro/agent-runtime.ts`, `src/keystone/agents/implementer/ImplementerAgent.ts`, `src/keystone/integration/finalize-run.ts`, `src/workflows/TaskWorkflow.ts`, `src/durable-objects/TaskSessionDO.ts`, `src/http/api/v1/runs/handlers.ts`, `tests/lib/compile-plan-run.test.ts`, and the focused workflow/finalization tests if the active helper surface needs a small adjustment to stay coherent.

**Validation**  
Run `rtk npm run test -- tests/lib/artifact-keys.test.ts tests/lib/compile-plan-run.test.ts tests/lib/finalize-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts tests/lib/agents/implementer-agent.test.ts tests/http/projects.test.ts`.  
Success means the active `run_summary` finalization path still passes, task artifact promotion still works, and stale artifact kinds are no longer admitted by the cleaned seams.

**Plan / Docs To Update**  
Update this plan's living sections.  
Leave contributor-facing doc updates for Phase 4 unless Phase 3 changes the current architecture wording.

**Deliverables**  
A focused artifact helper and validation surface that matches the current backend contract and no longer preserves dead placeholder families or open-ended stale artifact kinds.

**Commit Expectation**  
`Remove dead artifact helper families`

**Known Constraints / Baseline Failures**  
The broad repo lint/typecheck/test failures are unrelated to this phase; use the focused artifact/finalization suite as the gate.

**Completion Notes**  
Added `src/lib/artifacts/model.ts` as the shared live artifact-kind source of truth, removed the dead `taskEvidenceIndexArtifactKey` / `integrationMergeReportArtifactKey` / `releasePackArtifactKey` exports, narrowed `artifact_refs.artifactKind`, `createArtifactRef`, the public artifact schema, agent-runtime staged artifacts, task-stage promotion, and sandbox projection metadata to the surviving family set, and strengthened the focused tests to reject stale kinds while keeping the stable `run_summary` key and `runTaskId`-based handoff storage contract explicit. Focused validation passed with `rtk npm run test -- tests/lib/artifact-keys.test.ts tests/lib/compile-plan-run.test.ts tests/lib/finalize-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts tests/lib/agents/implementer-agent.test.ts tests/http/projects.test.ts`.

**Next Starter Context**  
Phase 3 is complete and should be committed without the unrelated `package-lock.json` churn. Phase 4 can now focus on contributor-facing doc cleanup only: restore the durable target-model handoff document, repoint README/developer-doc references, and remove the remaining stale notes language now that the backend code and focused tests are honest about the target-model artifact/runtime surface.

## Phase 4 - Restore the Contributor-Facing Target-Model Handoff

Create a real target-model handoff document and repoint the broader contributor-facing references so the repo stops sending people to a missing file or to superseded contract guidance.

### Phase Handoff

**Status:** Pending

**Goal**  
Restore a durable target-model handoff doc and align contributor-facing docs with the cleaned backend state, including the README and notes drift that still describe pre-target-model behavior.

**Scope Boundary**  
In scope: `README.md`, `.ultrakit/developer-docs/README.md`, `.ultrakit/developer-docs/keystone-target-model-handoff.md`, `.ultrakit/notes.md`, and any current architecture docs or debt trackers that should be updated once the cleanup is complete.  
Out of scope: rewriting archived historical plans except where a current contributor-facing doc must summarize or disclaim them.

**Read First**  
`.ultrakit/exec-plans/completed/keystone-target-model-migration.md`  
`.ultrakit/developer-docs/m1-architecture.md`  
`.ultrakit/developer-docs/think-runtime-architecture.md`  
`README.md`  
`.ultrakit/developer-docs/README.md`  
`.ultrakit/exec-plans/tech-debt-tracker.md`

**Files Expected To Change**  
`README.md`  
`.ultrakit/developer-docs/README.md`  
`.ultrakit/developer-docs/keystone-target-model-handoff.md`  
`.ultrakit/notes.md`  
Potentially `.ultrakit/developer-docs/m1-architecture.md`, `.ultrakit/exec-plans/tech-debt-tracker.md`, and `.ultrakit/exec-plans/completed/README.md`

**Validation**  
Run the final focused backend suite from this plan, use `rtk rg -n "keystone-target-model-handoff|RunCoordinatorDO|/v1/runs\\b|decision-package"` across `README.md`, `.ultrakit/developer-docs`, and `.ultrakit/notes.md`, then run `rtk npm run build` in a host-permitted shell if backend source changed in a way that should still satisfy the existing build baseline.  
Success means the docs point to a real handoff file, current contributor docs no longer advertise superseded contract language, and the focused backend suite remains green.

**Plan / Docs To Update**  
Update every living section in this plan, especially `Outcomes & Retrospective` and `Artifacts and Notes`.  
Update the restored handoff doc and any contributor-facing references that still point at the missing file.

**Deliverables**  
A real target-model handoff doc, corrected contributor links, cleaned README/notes guidance, and backend docs that match the cleaned codebase.

**Commit Expectation**  
`Restore target-model handoff docs`

**Known Constraints / Baseline Failures**  
`rtk npm run build` still needs a host-permitted run on this machine because Wrangler writes under `~/.config/.wrangler`; record both the sandbox failure and the host rerun result if build evidence is refreshed.
