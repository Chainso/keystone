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
4. **Description:** The shipped live Think proof still only accepts the approved fixture decision package on a single independent compiled task. Compiled plans with multiple tasks or non-empty `dependsOn` remain intentionally out of scope after this plan.
5. **Impact:** The live demo proves the full workflow only for the narrow fixture happy path; it cannot yet validate broader compiled Think task graphs.
6. **Owner:** `keystone-think-live-full-workflow`
7. **Proposed Fix:** Replace the fixture-scoped single-task validator with a broader compiled-plan contract that can persist, fan out, and validate dependent Think task graphs without reintroducing hidden fixture seams.
8. **Target Window:** `next workflow-generalization cycle`
9. **Status:** `open`

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
3. **Area:** `UI-first API scaffold backends`
4. **Description:** The UI-first contract now exposes `ProjectDocument`, first-class `DecisionPackage` detail/list surfaces, operator steering, `EvidenceBundle`, `IntegrationRecord`, and `Release`, but several of those routes are still typed stubs or structured `not_implemented` writes rather than real persisted behavior.
5. **Impact:** The UI can wire against the stable routes and types today, but those flows cannot yet provide real document collections, durable operator messages, evidence bundling, integration records, or release orchestration.
6. **Owner:** `keystone-ui-first-api-scaffold`
7. **Proposed Fix:** Add the missing persistence/projection layers and delivery behavior behind the frozen routes, starting with durable operator-message delivery and first-class decision-package/document collections.
8. **Target Window:** `next UI/backend feature implementation cycle`
9. **Status:** `open`

1. **ID:** `TD-2026-04-20-005`
2. **Date Added:** `2026-04-20`
3. **Area:** `Target-model developer docs`
4. **Description:** `README.md`, `.ultrakit/developer-docs/README.md`, and the archived target-model migration plan still reference `keystone-target-model-handoff.md`, but that file is not checked into the repo.
5. **Impact:** Contributors hit a broken source-of-truth link when changing persistence, API, run orchestration, or document behavior, which makes the final target-model guidance harder to discover.
6. **Owner:** `keystone-target-model-migration`
7. **Proposed Fix:** Either restore a durable `keystone-target-model-handoff.md` document or replace those references with the current architecture docs and archived migration plan.
8. **Target Window:** `next docs cleanup cycle`
9. **Status:** `open`
