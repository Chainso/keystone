# Technical Debt Tracker

## Purpose

Track known debt explicitly and prioritize cleanup without losing product momentum.

## Entry Template

New entries should follow this format:

1. **ID:** `TD-YYYY-MM-DD-NNN`
2. **Date Added:** `YYYY-MM-DD`
3. **Area:** `<subsystem or feature area>`
4. **Description:** What the gap is and why it was deferred.
5. **Impact:** What breaks, degrades, or is risky without this being fixed.
6. **Owner:** `<exec-plan-id or team label>`
7. **Proposed Fix:** Concrete description of the remediation.
8. **Target Window:** `<next cycle name or date range>`
9. **Status:** `open` | `closed (YYYY-MM-DD)`

## Entries

1. **ID:** `TD-2026-04-17-001`
2. **Date Added:** `2026-04-17`
3. **Area:** `Think live full-workflow validator`
4. **Description:** Historical note: the shipped live Think proof used to accept only the approved fixture path on a single independent compiled task before DAG generalization landed on 2026-04-21.
5. **Impact:** Contributors previously could not validate broader project-backed Think DAGs, dependency edges, or prompt fanout through the durable demo contract.
6. **Owner:** `keystone-think-live-dag-generalization`
7. **Proposed Fix:** Completed in the DAG-generalization plan: `think_live` now accepts single-target compiled handoffs, `RunWorkflow` fans out `active + ready` work safely, and the public `scripted` / `think_live` demo validator now requires a well-formed non-trivial DAG while `think_mock` stays deterministic and fixture-scoped.
8. **Target Window:** `completed 2026-04-21`
9. **Status:** `closed (2026-04-21)`

1. **ID:** `TD-2026-04-17-002`
2. **Date Added:** `2026-04-17`
3. **Area:** `Project-backed compile target selection`
4. **Description:** Project-backed runs now fail clearly when a project defines multiple executable components because Phase 4 introduced no explicit product concept for selecting which component should drive compile-time repo resolution.
5. **Impact:** Multi-component projects can materialize and execute at task time, but they cannot enter the compile path unless exactly one executable component exists.
6. **Owner:** `keystone-project-model-foundation`
7. **Proposed Fix:** Add an explicit compile-target concept to the project or run contract, then update `RunWorkflow`, validation, and demo tooling to resolve compile routing without hidden component ordering.
8. **Target Window:** `next project/workflow modeling cycle`
9. **Status:** `open`

1. **ID:** `TD-2026-04-17-003`
2. **Date Added:** `2026-04-17`
3. **Area:** `Local run helper scripts`
4. **Description:** `npm run run:local` still posts the legacy repo-backed `/v1/runs` payload even though the HTTP contract now requires `projectId`.
5. **Impact:** Contributors who discover the helper script directly from `package.json` can get misleading local failures and may assume the run API is broken.
6. **Owner:** `keystone-project-model-foundation`
7. **Proposed Fix:** Either migrate `scripts/run-local.ts` to the stored-project contract or remove the helper in favor of `demo:ensure-project` plus documented manual `POST /v1/runs` examples.
8. **Target Window:** `next local-dev cleanup cycle`
9. **Status:** `closed (2026-04-18)`

1. **ID:** `TD-2026-04-18-004`
2. **Date Added:** `2026-04-18`
3. **Area:** `Retired UI-first scaffold surfaces`
4. **Description:** Historical note: the old UI-first scaffold used to advertise `DecisionPackage`, `EvidenceBundle`, `IntegrationRecord`, and `Release` families before the target-model cleanup removed those dead surfaces from the current backend and contributor docs on 2026-04-21.
5. **Impact:** Contributors previously could mistake the retired scaffold vocabulary for active backend work.
6. **Owner:** `keystone-target-model-dead-surface-cleanup`
7. **Proposed Fix:** Keep the current project/document/run/task/artifact-first docs and tests aligned so the retired DecisionPackage / Evidence / Integration / Release family does not reappear as active debt.
8. **Target Window:** `next docs/model audit if drift returns`
9. **Status:** `closed (2026-04-21)`

1. **ID:** `TD-2026-04-20-005`
2. **Date Added:** `2026-04-20`
3. **Area:** `Target-model developer docs`
4. **Description:** Historical note: `README.md`, `.ultrakit/developer-docs/README.md`, and the archived target-model migration plan used to reference `keystone-target-model-handoff.md` before the file was restored on 2026-04-21.
5. **Impact:** Contributors previously hit a broken source-of-truth link when changing persistence, API, run orchestration, or document behavior.
6. **Owner:** `keystone-target-model-migration`
7. **Proposed Fix:** Restored `.ultrakit/developer-docs/keystone-target-model-handoff.md` and kept the current contributor-facing indexes pointed at it.
8. **Target Window:** `next docs cleanup cycle`
9. **Status:** `closed (2026-04-21)`
