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
