# Keystone Think Live Full Workflow

## Purpose / Big Picture

Keystone already proves a narrow Think-backed task runtime, but the current live demo path does not yet prove the whole workflow from raw run input to archived run. Today the live Think demo still shortcuts the compile phase for the fixture target, and the Think task path only accepts the fixture-backed greeting task. After this plan is complete, an operator should be able to start a no-human-in-the-loop live Think demo that begins with a decision package, compiles a real run plan, executes the compiled task path with the live Think runtime, and finishes with the normal `run_summary` artifact and archived run status.

The observable outcome is:

- the live Think demo starts from the same `/v1/runs` entrypoint as the rest of Keystone,
- `thinkMode=live` means live compile plus live Think task execution on the happy path,
- the workflow no longer depends on a pre-shaped fixture task handoff for the live demo,
- the deterministic mock-backed Think path remains available for stable validation, and
- the full happy-path demo still avoids human approvals and keeps the implementation simple.

## Backward Compatibility

Backward compatibility is required with the currently shipped M1 and Think runtime proof:

- Keep `scripted` as the default runtime until a later explicit decision changes that.
- Keep the existing deterministic mock-backed Think demo path available for stable validation.
- Preserve the current file-first architecture: canonical truth remains in R2 artifacts, Postgres operational rows, and Workflow/session events.
- Preserve the existing approval-gated `gitUrl` path for flows that need it, but do not require approvals on the new live Think happy path.
- Do not introduce first-class `Thread` or `Lease` primitives in this plan unless a concrete runtime gap appears during execution.

Backward compatibility with arbitrary local repository ingestion is not required in this plan. The first live full-workflow proof will stay on the committed fixture repository and committed fixture decision package so the workflow change stays small and observable.

## Design Decisions

1. **Date:** 2026-04-17  
   **Decision:** Define the new target as a narrow happy path: `decision package -> live compile -> compiled task handoff -> live Think execution -> run summary`, with no human-in-the-loop.  
   **Rationale:** This is the simplest workflow slice that proves the product goal the user asked for without reopening broader orchestration design.  
   **Alternatives considered:** Adding approval branches or reviewer/tester roles in the same plan; keeping the current pre-shaped handoff path.

2. **Date:** 2026-04-17  
   **Decision:** Do not add first-class `Thread` or `Lease` primitives in this plan.  
   **Rationale:** The current product preference is to avoid introducing those abstractions unless the Think runtime or current workflow shape proves they are necessary. The current gap is end-to-end workflow coverage, not orchestration vocabulary.  
   **Alternatives considered:** Adding thread abstractions for role orchestration now; expanding lease semantics before the live happy path exists.

3. **Date:** 2026-04-17  
   **Decision:** Keep the first live full-workflow proof on the committed fixture repo and committed fixture decision package.  
   **Rationale:** This keeps the work focused on workflow behavior instead of widening scope into arbitrary repo ingestion, host filesystem access, or new upload semantics.  
   **Alternatives considered:** Generalizing immediately to any local repository path; making `gitUrl` the required proof path.

4. **Date:** 2026-04-17  
   **Decision:** `thinkMode=live` should mean live compile plus live Think task execution for the approved happy path, while `thinkMode=mock` remains the deterministic fallback.  
   **Rationale:** The current live mode is misleading because it still uses deterministic fixture compile. Aligning the mode with the actual runtime behavior makes the operator-facing demo contract honest and easier to reason about.  
   **Alternatives considered:** Adding a third demo mode just for full workflow; keeping live Think task execution but deterministic compile.

5. **Date:** 2026-04-17  
   **Decision:** Keep integration and finalization deterministic and file-first in this plan; only compile and implementer execution need to be live-model-backed.  
   **Rationale:** The product gap is at the front of the workflow and task execution seam. Finalization already exists and does not need new model behavior to prove the live end-to-end story.  
   **Alternatives considered:** Expanding live-model behavior into review, integration, or finalization in the same plan.

6. **Date:** 2026-04-17  
   **Decision:** Phase 1 will clean the current repo-wide lint noise from generated `.localflare/.wrangler` outputs so broad validation becomes trustworthy again.  
   **Rationale:** The planning baseline shows `npm run lint` currently fails on generated local artifacts rather than source problems. That noise would obscure real regressions during execution.  
   **Alternatives considered:** Carry the lint failure as known debt throughout the plan; use only targeted lint commands in every phase.

## Execution Log

- **Date:** 2026-04-17  
  **Phase:** Planning  
  **Decision:** Treat the first full-workflow live Think proof as a fixture-scoped workflow upgrade, not a general repository-ingestion project.  
  **Rationale:** The user asked to keep implementation simple and focus on the current workflow gap, which is that the live demo begins from a pre-shaped task path instead of the full workflow.

- **Date:** 2026-04-17  
  **Phase:** Planning  
  **Decision:** Plan explicit preservation of the existing mock Think path and scripted fallback while upgrading `thinkMode=live`.  
  **Rationale:** The repo already has stable proofs that should remain intact while the live full-workflow path is introduced.

- **Date:** 2026-04-17  
  **Phase:** Phase 1  
  **Decision:** Ignore generated `.localflare/**` output in ESLint and make the demo scripts/docs say explicitly that Phase 1 `thinkMode=live` is still a fixture-backed Think turn rather than the final live full-workflow proof.  
  **Rationale:** Later phases need a trustworthy repo-wide lint baseline and an honest operator-facing contract before workflow semantics change.

- **Date:** 2026-04-17  
  **Phase:** Phase 1 Fix Pass  
  **Decision:** Extract the demo-script contract resolution into direct-test helpers and add script-level coverage for the default and live-override branches.  
  **Rationale:** Phase 1 validation needs to prove the operator-facing `demo:run` / `demo:validate` contract itself, not only the `/v1/runs` handler defaults.

- **Date:** 2026-04-17  
  **Phase:** Phase 1 Second Fix Pass  
  **Decision:** Exercise the actual `npm run demo:run` and `npm run demo:validate` entrypoints against a local stub HTTP server and assert the emitted JSON and live event output.  
  **Rationale:** This closes the remaining test-quality gap around direct-execution bootstrap, fetch/poll wiring, and the exact operator-facing output without changing Phase 1 runtime semantics.

- **Date:** 2026-04-17  
  **Phase:** Phase 1 Extra Fix Pass  
  **Decision:** Add black-box CLI coverage for the preserved deterministic `runtime=think` plus `thinkMode=mock` path through the real `npm run demo:run` and `npm run demo:validate` entrypoints.  
  **Rationale:** The prior pass covered the scripted default path and the live Think path at the command boundary, but the operator-facing mock Think contract still was not proven end to end.

- **Date:** 2026-04-17  
  **Phase:** Phase 2  
  **Decision:** Route deterministic fixture compile only through the preserved `runtime=think` plus `thinkMode=mock` path, and stamp `compileMode` into compile-session metadata plus compile artifact/event metadata for both live and fixture compile modes.  
  **Rationale:** `thinkMode=live` needed to stop silently reusing the fixture shortcut, while the mock validation path still needed an explicit stable fallback and observable metadata that shows which compile mode actually ran.

- **Date:** 2026-04-17  
  **Phase:** Phase 2 Fix Pass  
  **Decision:** Canonicalize live compile output back onto the approved fixture decision-package task ids/titles before writing artifacts, and reject any persisted live plan that still falls outside that Phase 2 gate before task fanout.  
  **Rationale:** Phase 3 has not generalized `TaskWorkflow` yet, so Phase 2 needed a narrow compatibility guard that does not depend on the model preserving the fixture task shape on its own.

- **Date:** 2026-04-17  
  **Phase:** Phase 2 Second Fix Pass  
  **Decision:** Tighten the temporary live-compile compatibility shim so it only canonicalizes plans that still match the approved decision-package id plus at least one task identifier anchor (`taskId` or `title`), and align the operator-facing live demo contract with the new Phase 2 compile proof.  
  **Rationale:** The prior shim still accepted arbitrary single-task output by array position, and the scripts/tests were still describing the pre-Phase-2 live promise instead of the current live-compile proof with the remaining Phase 3 task-execution seam.

- **Date:** 2026-04-17  
  **Phase:** Phase 2 Third Fix Pass  
  **Decision:** Preserve existing run-session metadata during finalization, require live compile output to keep the approved task ids and translatable dependencies before any artifact write, and extend tests around compile failure semantics plus the live CLI request body.  
  **Rationale:** Archived run summaries must retain `runtime` / `options` so `demo:validate` can recover the actual Think contract, and the temporary Phase 2 compatibility shim needed to fail closed instead of accepting title-only matches or silently dropping bad `dependsOn` edges.

- **Date:** 2026-04-17  
  **Phase:** Phase 3  
  **Decision:** Replace the temporary approved-task-id canonicalization seam with an explicit fixture-scoped compiled-plan validator, and let `TaskWorkflow` execute any independent compiled handoff that still matches the approved decision package by task id or title.  
  **Rationale:** Phase 3 needed to remove the hidden `task-greeting-tone` dependency without widening scope into multi-task orchestration or arbitrary repo ingestion, so the narrowest safe cut is a visible fixture-scoped happy-path validator plus direct Think execution of the persisted compiled handoff.

- **Date:** 2026-04-17  
  **Phase:** Phase 4 Discovery  
  **Decision:** Split the original closeout phase so the next phase focuses only on making the exact documented live `demo:run` -> `demo:validate` pair pass against a real local Worker before docs/archive move forward.  
  **Rationale:** The first real host rerun proved the environment can be brought up, but it also exposed a real product gap: the live Think path can still archive without promoting a `run_note`, so the plan cannot honestly close on documentation alone.

- **Date:** 2026-04-17  
  **Phase:** Phase 4  
  **Decision:** Persist the last successful demo run id for the exact `demo:run` -> `demo:validate` pair, and synthesize a markdown Think handoff note when a completed live turn stages no `run_note` artifact.  
  **Rationale:** The exact operator-facing validation pair must work without extra shell glue, and the live Think happy path cannot be considered reliable if a completed archived run can still omit the promoted `run_note` contract.

- **Date:** 2026-04-17  
  **Phase:** Phase 4 Fix Pass  
  **Decision:** Tighten the persisted demo-state shortcut so only archived runs update it, make explicit validation inputs bypass the state file entirely, and add a direct `KeystoneThinkAgent.executeTurn` boundary test for the empty-text synthesized-note path.  
  **Rationale:** The first Phase 4 implementation fixed the broad live-pair gap, but review correctly flagged that failed/cancelled runs could still overwrite the shortcut state, explicit `--run-id` / `KEYSTONE_RUN_ID` still depended on eagerly parsing the state file, and the synthesized-note behavior was only covered indirectly.

- **Date:** 2026-04-17  
  **Phase:** Phase 5  
  **Decision:** Keep the live runtime code untouched, align the durable docs to the accepted Phase 4 contract, record only the remaining single-task fixture validator as deferred debt, and archive the plan.  
  **Rationale:** Phase 5 is a documentation and closeout pass. The live proof was already accepted in Phase 4, and no runtime changes landed afterward, so the correct work is to document the validated contract rather than reopen implementation scope.

## Progress

- [x] 2026-04-17 Discovery decisions resolved in conversation: no new `Thread`/`Lease` primitives, no HITL on the happy path, and keep the first proof fixture-scoped.
- [x] 2026-04-17 Baseline run completed for `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- [x] 2026-04-17 Active execution plan created under `.ultrakit/exec-plans/active/`.
- [x] 2026-04-17 Phase 1: Stabilize the operator-facing live demo contract and clean baseline validation noise.
- [x] 2026-04-17 Phase 1 fix pass: add automated script-level coverage for `demo-run` / `demo-validate` contract defaults and live overrides.
- [x] 2026-04-17 Phase 1 second fix pass: exercise the real `demo:run` / `demo:validate` npm entrypoints against a stub HTTP server and lock the emitted JSON/event output.
- [x] 2026-04-17 Phase 1 extra fix pass: cover the deterministic `think/mock` operator contract at the real `npm run demo:run` / `demo:validate` boundary.
- [x] 2026-04-17 Phase 2: Route `thinkMode=live` through live compile and compiled handoffs instead of deterministic fixture compile.
- [x] 2026-04-17 Phase 2 fix pass: canonicalize live compile task shape onto the approved decision-package contract and deepen persisted compile-artifact coverage.
- [x] 2026-04-17 Phase 2 second fix pass: require a meaningful live-compile shape match before canonicalization, cover persisted-plan guard branches more directly, and update the live demo contract wording to the Phase 2 compile proof.
- [x] 2026-04-17 Phase 2 third fix pass: preserve archived runtime/options metadata, fail closed on ambiguous live compile output, and deepen compile failure plus live CLI request coverage.
- [x] 2026-04-17 Phase 3: Generalize the Think task path from the fixture greeting gate to compiled task handoffs on the happy path.
- [x] 2026-04-17 Phase 4: Stabilize the exact live `demo:run` -> `demo:validate` pair against a real local Worker.
- [x] 2026-04-17 Phase 4 fix pass: tighten persisted demo-state precedence and add direct Think-turn fallback-note coverage.
- [x] 2026-04-17 Phase 5: Update durable docs, record the remaining validator debt, and archive the plan.

## Surprises & Discoveries

- **2026-04-17:** `npm run lint` currently fails on generated `.localflare/.wrangler` output rather than source files. This is baseline noise, not direct evidence of runtime regressions.
- **2026-04-17:** `npm run typecheck` passes cleanly at baseline.
- **2026-04-17:** `npm run test` passes at baseline with `21 passed | 1 skipped` test files and `62 passed | 3 skipped` tests.
- **2026-04-17:** `npm run build` fails inside the Codex sandbox because Wrangler and Docker try to write under `/home/chanzo/.config/.wrangler` and `/home/chanzo/.docker/buildx`. This is a host-environment constraint already documented in `.ultrakit/notes.md`, not a code regression.
- **2026-04-17:** The current live Think demo already has a real-model code path inside `KeystoneThinkAgent`; the remaining gap is the workflow contract around compile selection and task handoff execution.
- **2026-04-17:** `demo:validate` can derive runtime and `thinkMode` from persisted run metadata, so the validation output can describe the actual contract that ran instead of trusting caller-supplied environment flags.
- **2026-04-17:** The cleanest narrow fix for the remaining script-quality gap was to run the real `npm run --silent demo:run` / `demo:validate` entrypoints against a local stub HTTP server, which exercises CLI bootstrap, fetch/poll wiring, live event streaming, and final JSON without altering runtime semantics.
- **2026-04-17:** After the Phase 1 second fix pass, repo-wide validation remains clean: `npm run lint`, `npm run typecheck`, and `npm run test` pass, with `npm run test` now reporting `22 passed | 1 skipped` test files and `70 passed | 3 skipped` tests.
- **2026-04-17:** The remaining command-level gap was narrow enough to close entirely in `tests/scripts/demo-contracts.test.ts`: the real `npm run demo:run` and `npm run demo:validate` mock Think branch can be proven with the same stub-server harness used for the scripted and live CLI paths, without adding new script hooks.
- **2026-04-17:** After the Phase 1 extra fix pass, repo-wide validation remains clean: `npm run lint`, `npm run typecheck`, and `npm run test` pass, with `npm run test` now reporting `22 passed | 1 skipped` test files and `72 passed | 3 skipped` tests.
- **2026-04-17:** After the Phase 2 implementation pass, repo-wide validation remains clean: `npm run typecheck` and `npm run test` pass, with `npm run test` now reporting `23 passed | 1 skipped` test files and `74 passed | 3 skipped` tests.
- **2026-04-17:** The fixture-scoped live compile path already preserves the decision-package task id `task-greeting-tone`, so the host-local `think/live` demo can archive successfully in Phase 2 even though `TaskWorkflow` is still fixture-gated and Phase 3 still needs to generalize that path.
- **2026-04-17:** The narrowest safe Phase 2 compatibility fix is to canonicalize live compile output onto the approved decision-package ids/titles before writing `run_plan` / `task_handoff` artifacts, then assert the reloaded persisted plan still matches that gate before task fanout.
- **2026-04-17:** After the Phase 2 fix pass, repo-wide validation remains clean: `npm run typecheck` and `npm run test` pass, with `npm run test` now reporting `24 passed | 1 skipped` test files and `77 passed | 3 skipped` tests.
- **2026-04-17:** The Phase 2 compatibility shim still needed one more tightening pass: array-position fallback was too permissive for the single-task fixture demo, so the guard now requires the live compile output to preserve the approved decision-package id and at least one matching task anchor (`taskId` or `title`) before canonicalization.
- **2026-04-17:** After the Phase 2 second fix pass, repo-wide validation remains clean: `npm run typecheck` and `npm run test` pass, with `npm run test` now reporting `24 passed | 1 skipped` test files and `81 passed | 3 skipped` tests. The host-local `demo:run` rerun was not feasible in this session because no local Worker was listening on `127.0.0.1:8787`.
- **2026-04-17:** Archived run summaries were losing `runtime` and `options` because `finalizeRun` replaced the run-session metadata on archive instead of merging it; preserving the existing metadata is enough for `demo:validate` to recover the actual Think contract from a real archived run.
- **2026-04-17:** The temporary Phase 2 compatibility shim still was not fail-closed after the second fix pass: title-only task matching and dropped `dependsOn` entries could still reshape incompatible live compile output instead of rejecting it before `run_plan` / `task_handoff` writes.
- **2026-04-17:** After the Phase 2 third fix pass, repo-wide validation remains clean: `npm run typecheck` and `npm run test` pass, with `npm run test` now reporting `25 passed | 1 skipped` test files and `84 passed | 3 skipped` tests. The host-local `demo:run` command in this session still fails immediately with `connect ECONNREFUSED 127.0.0.1:8787` because no local Worker is listening.
- **2026-04-17:** The narrowest safe Phase 3 generalization is to validate the persisted live plan against the fixture decision package by matching task id or title and requiring `dependsOn` to stay empty, which removes the hidden greeting-task seam without reintroducing Phase 2's canonicalization shim.
- **2026-04-17:** After the Phase 3 implementation pass, repo-wide validation remains clean: `npm run typecheck`, `npm run test`, and `npm run think:smoke` pass, with `npm run test` now reporting `26 passed | 1 skipped` test files and `88 passed | 3 skipped` tests. The exact host-local `demo:run` command still fails immediately with `connect ECONNREFUSED 127.0.0.1:8787`, and the exact `demo:validate` command then fails with `Provide --run-id=<id> or set KEYSTONE_RUN_ID.` because no live run was created in this session.
- **2026-04-17:** Once `wrangler dev` is started outside the sandbox on this host, the local Worker can serve health and the exact documented live `demo:run` command can archive a real Think run on `http://127.0.0.1:8787`.
- **2026-04-17:** The first real host rerun exposed the remaining product gap: the latest archived live Think run only produced 4 artifacts and omitted a promoted `run_note`, so the exact documented `demo:validate` command failed with `Expected at least 5 artifacts, received 4.` even though the Worker and CLI pair were otherwise wired correctly.
- **2026-04-17:** The exact operator-facing pair needed one more script seam fix even after the Worker came up: `demo:validate` now reuses the last successful `demo:run` state from `.keystone/demo-last-run.json`, so the documented live pair no longer depends on an extra exported `KEYSTONE_RUN_ID`.
- **2026-04-17:** The live Think model can complete with empty assistant text, and it does not always reliably stage a markdown handoff on its own. Normalizing empty summaries and synthesizing a fallback markdown note under `/artifacts/out` is the narrowest safe reliability fix because it preserves the existing promotion path and keeps the `run_note` contract explicit.
- **2026-04-17:** After the revised Phase 4 pass, `npm run typecheck`, `npm run test`, and `npm run think:smoke` pass, with `npm run test` reporting `26 passed | 1 skipped` test files and `91 passed | 3 skipped` tests. The exact host-local `KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run` and `demo:validate` pair also passes against the real local Worker on `http://127.0.0.1:8787`, with the validated run archiving `decision_package`, `run_plan`, `task_handoff`, `run_note`, and `run_summary`.
- **2026-04-17:** The Phase 4 fix pass tightened the shortcut semantics successfully: `demo:run` now leaves `.keystone/demo-last-run.json` untouched on failed runs, explicit `demo:validate --run-id=...` no longer depends on parsing the state file, and repo validation now reports `27 passed | 1 skipped` test files with `94 passed | 3 skipped` tests.
- **2026-04-17:** During the Phase 5 closeout session, no local Worker was listening on `127.0.0.1:8787`, so the live host pair was not rerun. Because no runtime changes landed after the accepted Phase 4 fix pass, that exact-pair evidence remains the authoritative live proof for docs and archive.
- **2026-04-17:** Phase 5 broad validation remained clean on the docs/archive tree: `npm run lint`, `npm run typecheck`, and `npm run test` all passed, with `npm run test` reporting `27 passed | 1 skipped` test files and `94 passed | 3 skipped` tests.

## Outcomes & Retrospective

This plan completed with the following outcomes:

- Phase 1 restored a trustworthy lint baseline, made the demo/docs explicit that the current live Think path was still fixture-backed at that stage, and added direct automated coverage for the operator-facing scripted, deterministic Think mock, and live Think CLI contracts.
- Phase 2 removed the hidden `think/live` fixture-compile bypass, added compile-mode metadata that distinguishes live versus fixture compile artifacts/events, preserved archived run-session metadata so real run summaries still expose `runtime` / `options`, tightened the temporary live-compile guard so the path fails closed unless the live output keeps approved task ids plus translatable dependencies, aligned the operator-facing live demo contract with the real compile proof, and proved a host-local live run archived with model-generated `run_plan` and `task_handoff` artifacts.
- Phase 3 removed the hardcoded `task-greeting-tone` Think gate, replaced the temporary Phase 2 canonicalization seam with an explicit fixture-scoped compiled-plan validator, updated the Think prompt/system guidance to point at projected `decision_package` / `run_plan` / `task_handoff` inputs, and proved that live compiled handoffs now execute through the Think implementer path and promote `run_note` artifacts while deterministic `think/mock` remains intact.
- Phase 4 made the exact documented live `demo:run` -> `demo:validate` pair reliable against a real local Worker by persisting only the last successful archived run for the validation shortcut, ensuring explicit validation inputs bypass the state file, normalizing empty Think-turn summaries, and synthesizing a markdown fallback note when a completed live turn stages no `run_note` artifact.
- Phase 5 aligned the README and Think runtime docs to the validated `scripted` default / deterministic `think/mock` / fixture-scoped `think/live` contract, captured the remaining single-task validator gap in `tech-debt-tracker.md`, reran broad repo validation, and archived the completed plan.
- The shipped live Think demo now proves the workflow from `/v1/runs` input to archived run summary on the approved fixture happy path.
- The mock Think demo remains available for deterministic validation.
- The repo-wide validation baseline is cleaner and easier to trust.
- The remaining intentional workflow-generalization gap is recorded explicitly in `tech-debt-tracker.md`.

## Context and Orientation

Current relevant runtime behavior:

- `src/http/handlers/runs.ts` accepts `/v1/runs`, persists runtime/options, and starts `RunWorkflow`.
- `src/workflows/RunWorkflow.ts` now routes `runtime=think` plus `thinkMode=live` through `compileRunPlan`, while keeping `compileDemoFixtureRunPlan` only for the preserved deterministic `runtime=think` plus `thinkMode=mock` fixture path.
- `src/keystone/compile/plan-run.ts` writes explicit `compileMode` metadata for both the real compile path (`live`) and the deterministic fixture compile path (`fixture`), and the live path now persists model-authored task ids/titles as long as the compiled plan still matches the fixture decision package and keeps `dependsOn` empty.
- `src/workflows/TaskWorkflow.ts` now accepts fixture-scoped compiled Think handoffs that match the approved decision package and have no dependencies, instead of special-casing `taskId === "task-greeting-tone"`.
- `src/keystone/agents/base/KeystoneThinkAgent.ts` and `src/keystone/agents/implementer/ImplementerAgent.ts` now support a real live-model Think turn, the deterministic mock path, and a fallback synthesized markdown note when a completed live turn stages no `run_note` artifact.
- `scripts/demo-run.ts` and `scripts/demo-validate.ts` are the operator-facing local demo proof commands. They now persist only the last successful archived run under `.keystone/demo-last-run.json`, and explicit `--run-id` / `KEYSTONE_RUN_ID` validation inputs bypass that state file entirely.
- `.ultrakit/developer-docs/think-runtime-architecture.md` and `.ultrakit/developer-docs/think-runtime-runbook.md` now describe the validated `scripted` default, deterministic `think/mock`, and fixture-scoped live compile plus compiled Think task contract, including the last-successful demo-state shortcut.

Relevant files to keep in view:

- `src/http/contracts/run-input.ts`
- `src/http/handlers/runs.ts`
- `src/workflows/RunWorkflow.ts`
- `src/workflows/TaskWorkflow.ts`
- `src/keystone/compile/contracts.ts`
- `src/keystone/compile/plan-run.ts`
- `src/keystone/tasks/load-task-contracts.ts`
- `src/keystone/agents/base/KeystoneThinkAgent.ts`
- `src/keystone/agents/implementer/ImplementerAgent.ts`
- `src/lib/runs/options.ts`
- `scripts/demo-run.ts`
- `scripts/demo-validate.ts`
- `README.md`
- `.ultrakit/developer-docs/think-runtime-architecture.md`
- `.ultrakit/developer-docs/think-runtime-runbook.md`

Scope constraints for this plan:

- The first proof remains fixture-scoped. Arbitrary local repo ingestion is out of scope.
- No HITL path is required on the happy path.
- No new product-level thread or lease abstraction should be introduced unless a concrete gap emerges.
- The deterministic mock-backed Think path and the scripted fallback must remain runnable throughout execution.

## Plan of Work

The work starts by stabilizing the operator-facing contract and validation baseline so later phases can prove the workflow cleanly. That means making the current demo and validation commands truthful about what they are testing and removing the generated-file lint noise that currently hides real regressions.

Once the baseline is clean, the next priority is to make `RunWorkflow` honest for `thinkMode=live`: it should use the real compile path and produce real task handoffs instead of silently switching to the deterministic fixture compile shortcut. The compile stage already exists; the missing work is the workflow routing and the validation expectations around it.

After that, the Think task path needs to stop depending on the single hardcoded fixture greeting task. The right cut for this plan is not “support any possible task contract.” The right cut is “accept compiled task handoffs that come from the live happy-path compile and run them through the existing Think implementer/runtime bridge.” That keeps the plan small while removing the current full-workflow blocker.

The final phase is end-to-end proof and documentation. The demo and runbooks should make a clear distinction between:

- deterministic mock Think validation, and
- live full-workflow Think validation.

When the work is done, the live Think demo should prove the same workflow entrypoint and artifact model as the rest of Keystone, just without human approvals on the happy path.

### Phase 1: Stabilize the live demo contract and validation baseline

Clarify the operator-facing demo contract and remove baseline lint noise caused by generated local Wrangler artifacts. This phase does not change the live workflow semantics yet; it prepares the repo so later phases can validate broad changes cleanly.

#### Phase Handoff

**Goal**  
Make the repo-wide validation baseline trustworthy again and make the live demo contract explicit in scripts/docs before deeper workflow edits begin.

**Scope Boundary**  
In scope: lint ignore or config changes for generated `.localflare/.wrangler` artifacts, small script or docs changes needed to distinguish mock Think validation from live full-workflow validation, and test updates for those contract clarifications.  
Out of scope: changing compile routing, changing task workflow behavior, or changing artifact semantics.

**Read First**  
`eslint.config.js`  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`  
`README.md`  
`.ultrakit/developer-docs/think-runtime-runbook.md`

**Files Expected To Change**  
`eslint.config.js`  
`.gitignore`  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`  
`README.md`  
`.ultrakit/developer-docs/think-runtime-runbook.md`  
`tests/http/app.test.ts`  
`tests/scripts/demo-contracts.test.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
```

Success means repo-wide lint no longer fails on generated local artifacts, typecheck stays green, and tests still pass. Any demo-script contract changes should be reflected in tests or in deterministic script output checks.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and this phase handoff. If the baseline changes materially, record it in `Artifacts and Notes`.

**Deliverables**  
A cleaner validation baseline and explicit operator-facing wording that distinguishes mock Think validation from the intended live full-workflow demo.

**Commit Expectation**  
`Stabilize Think demo contract and lint baseline`

**Known Constraints / Baseline Failures**  
`npm run build` still cannot be treated as an in-sandbox baseline because Wrangler and Docker write under home-directory state on this host. Keep that host constraint recorded rather than trying to “fix” it in repo code during this phase.

**Status**  
Completed 2026-04-17.

**Completion Notes**  
- ESLint now ignores generated `.localflare/**` output, so repo-wide lint no longer fails on Localflare/Wrangler artifacts.
- `scripts/demo-run.ts` and `scripts/demo-validate.ts` now emit explicit contract metadata that distinguishes deterministic mock Think validation from the current live Think-turn fixture path.
- `README.md` and `.ultrakit/developer-docs/think-runtime-runbook.md` now say plainly that Phase 1 `thinkMode=live` does not yet prove live compile or compiled task handoffs.
- `tests/http/app.test.ts` now locks `runtime=think` requests to the default `thinkMode=mock` / `preserveSandbox=false` contract unless explicitly overridden.
- `tests/scripts/demo-contracts.test.ts` now covers both the pure contract helpers and the real `npm run demo:run` / `demo:validate` entrypoints against a stub HTTP server, including the scripted default path, the deterministic `think/mock` path, the live Think event-polling path, and the emitted JSON operators see.

**Next Starter Context**  
Phase 2 should leave the new contract wording intact and change only the workflow semantics behind `runtime=think` plus `thinkMode=live`: remove the deterministic fixture-compile bypass, keep `thinkMode=mock` deterministic, and add tests that prove live compile output is now the source of task handoffs.

### Phase 2: Route the live Think happy path through real compile output

Upgrade `RunWorkflow` so `runtime=think` plus `thinkMode=live` uses the real compile path and emits real run-plan and task-handoff artifacts for the happy path, instead of switching to deterministic fixture compile.

#### Phase Handoff

**Goal**  
Make the live Think happy path start from real compile output instead of the deterministic fixture compile shortcut.

**Scope Boundary**  
In scope: `RunWorkflow` compile-selection logic, any compile metadata or validation changes needed to reflect live compile honestly, and tests covering the live versus mock compile behavior.  
Out of scope: general local file ingestion redesign, arbitrary repository support, or task execution changes beyond what compile routing requires.

**Read First**  
`src/workflows/RunWorkflow.ts`  
`src/keystone/compile/plan-run.ts`  
`src/http/handlers/runs.ts`  
`src/keystone/integration/finalize-run.ts`  
`src/lib/runs/options.ts`  
`tests/http/app.test.ts`  
`tests/lib/compile-plan-run.test.ts`  
`tests/lib/workflows/run-workflow-compile.test.ts`  
`tests/scripts/demo-contracts.test.ts`

**Files Expected To Change**  
`src/workflows/RunWorkflow.ts`  
`src/keystone/compile/plan-run.ts`  
`src/keystone/integration/finalize-run.ts`  
`src/lib/runs/options.ts`  
`src/http/handlers/runs.ts`  
`tests/http/app.test.ts`  
`tests/lib/compile-plan-run.test.ts`  
`tests/lib/finalize-run.test.ts`  
`tests/lib/workflows/**`  
`tests/scripts/demo-contracts.test.ts`

**Validation**  
Run from repo root:

```bash
npm run typecheck
npm run test
```

Host validation outside the Codex sandbox:

```bash
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run -- --stream-events=false
```

Success means the run reaches a real compile phase for the live Think path, the persisted artifacts include a non-fixture `run_plan` and `task_handoff` set, and no deterministic fixture-compile bypass remains on that path.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, `Artifacts and Notes`, and this phase handoff.

**Deliverables**  
Real compile routing for the live Think happy path, with tests and observable artifact/event evidence.

**Commit Expectation**  
`Use live compile for Think full-workflow path`

**Known Constraints / Baseline Failures**  
Keep the deterministic mock path intact. This phase must not remove `compileDemoFixtureRunPlan` if the mock path still depends on it.

**Status**  
Completed 2026-04-17.

**Completion Notes**  
- `RunWorkflow` now routes the fixture-scoped `runtime=think` plus `thinkMode=live` happy path through `compileRunPlan`, while the preserved deterministic fixture compile shortcut only applies to `runtime=think` plus `thinkMode=mock`.
- `src/lib/runs/options.ts` now exposes explicit live-versus-mock Think helpers so the workflow routing and live poll-window logic do not duplicate mode checks.
- `src/keystone/compile/plan-run.ts` now stamps `compileMode` across compile session metadata, compile events, and artifact metadata for both live and fixture compile paths, and Phase 2 now fails closed unless the live output preserves the approved decision-package id, the approved task ids, and only translatable `dependsOn` references before artifacts are written.
- `src/workflows/RunWorkflow.ts` now validates the reloaded persisted live `run_plan` artifact against the current Phase 2 fixture gate before task fanout, so incompatible stored handoffs fail fast instead of reaching `TaskWorkflow`.
- `src/keystone/integration/finalize-run.ts` now preserves existing run-session metadata when archiving, so archived run summaries keep the real `runtime` / `options` contract that `demo:validate` reads back from `/v1/runs/:runId`.
- `tests/lib/workflows/run-workflow-compile.test.ts` now proves the live fanout consumes the persisted `run_plan` artifact rather than the raw compiler return value, while the mock path still calls `compileDemoFixtureRunPlan`, and rejects incompatible persisted live plans across the task-id, task-count, and decision-package guard branches before batch creation.
- `tests/lib/compile-plan-run.test.ts` now asserts `compileMode` propagation across live and fixture compile session metadata, compile events, and artifact metadata, rejects title-only task matching plus unmappable `dependsOn` edges, and proves rejected live compile output leaves no persisted `run_plan` or `task_handoff` artifacts while still recording the expected failed-session and `compile.failed` semantics with `compileMode: "live"`.
- `tests/lib/finalize-run.test.ts` and `tests/scripts/demo-contracts.test.ts` now lock the archived metadata preservation path and prove the live `demo:run` CLI POST sends `thinkMode=live` together with the preserved sandbox flag.
- Host validation succeeded with `KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run -- --stream-events=false`: the run archived with one each of `decision_package`, `run_plan`, `task_handoff`, `run_note`, and `run_summary`, emitted `compile.started` / `compile.completed` with `compileMode: "live"`, and persisted model-generated `run_plan` / `task_handoff` text rather than the deterministic fixture summary.
- This fix pass did not repeat a successful host-local archive because `rtk env KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run -- --stream-events=false` currently fails immediately with `connect ECONNREFUSED 127.0.0.1:8787` when no local Worker is listening; the earlier successful Phase 2 host proof remains the last positive host validation.

**Next Starter Context**  
Phase 3 should leave the new live compile routing, compile-mode metadata, and archived run-session metadata preservation intact, then remove the remaining `TaskWorkflow` fixture gate around `taskId === "task-greeting-tone"` plus the temporary Phase 2 approved-task-id compatibility guard once compiled happy-path Think handoffs are accepted end to end.

### Phase 3: Execute compiled task handoffs with the Think runtime

Generalize the Think task path so it can execute the compiled happy-path handoffs produced by Phase 2, rather than only the fixture greeting task.

#### Phase Handoff

**Goal**  
Make `TaskWorkflow` accept the live compiled happy-path task handoffs and run them through the existing Think implementer path.

**Scope Boundary**  
In scope: `TaskWorkflow` Think-path gating, prompt/input shaping for compiled happy-path tasks, any small implementer-agent updates required for compiled handoffs, artifact promotion expectations, and validation updates.  
Out of scope: reviewer/tester roles, multi-agent orchestration, arbitrary repo support, or making Think the default runtime.

**Read First**  
`src/workflows/TaskWorkflow.ts`  
`src/keystone/tasks/load-task-contracts.ts`  
`src/keystone/agents/base/KeystoneThinkAgent.ts`  
`src/keystone/agents/implementer/ImplementerAgent.ts`  
`src/lib/workspace/init.ts`  
`scripts/demo-validate.ts`

**Files Expected To Change**  
`src/workflows/TaskWorkflow.ts`  
`src/keystone/agents/implementer/ImplementerAgent.ts`  
`src/workflows/RunWorkflow.ts`  
`src/keystone/compile/plan-run.ts`  
`src/keystone/tasks/load-task-contracts.ts`  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`  
`tests/lib/agents/**`  
`tests/lib/compile-plan-run.test.ts`  
`tests/lib/workflows/**`  
`tests/scripts/demo-contracts.test.ts`

**Validation**  
Run from repo root:

```bash
npm run typecheck
npm run test
npm run think:smoke
```

Host validation outside the Codex sandbox:

```bash
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate
```

Success means the live Think demo reaches task execution from compiled handoff artifacts, promotes at least one `run_note`, and finishes with the normal archived run plus `run_summary`.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, `Outcomes & Retrospective`, `Artifacts and Notes`, and this phase handoff.

**Deliverables**  
Think task execution driven by compiled happy-path handoffs instead of the hardcoded fixture greeting gate.

**Commit Expectation**  
`Run compiled Think handoffs through task workflow`

**Known Constraints / Baseline Failures**  
Keep the mock Think path intact and deterministic. If the live path still needs fixture-specific guardrails, record them explicitly rather than hiding them behind the old greeting-task special case.

**Status**  
Completed 2026-04-17.

**Completion Notes**  
- `src/keystone/tasks/load-task-contracts.ts` now exports a shared fixture-scoped compiled-plan validator, and `src/keystone/compile/plan-run.ts` plus `src/workflows/RunWorkflow.ts` both use it so the live compile path persists model-authored handoffs without the old approved-task-id canonicalization seam while still failing closed on decision-package, task-shape, or `dependsOn` mismatches.
- `src/workflows/TaskWorkflow.ts` no longer special-cases `taskId === "task-greeting-tone"` for Think. It now accepts any independent compiled handoff for the approved fixture decision package, adds decision-package/task/dependency context to the live implementer prompt, and preserves deterministic `think/mock` by injecting `createThinkSmokePlan()` only for the mock path.
- `src/keystone/agents/implementer/ImplementerAgent.ts`, `scripts/demo-run.ts`, and `scripts/demo-validate.ts` now point the agent and the operator-facing contract at the Phase 3 proof: projected compile artifacts are available under `/artifacts/in`, live Think means compiled handoff execution, and the archived run is still expected to promote a `run_note`.
- `tests/lib/workflows/task-workflow-think.test.ts` now proves live compiled handoffs execute through the Think implementer path and promote a `run_note`, while updated compile/workflow/script tests prove the new fixture-scoped validator, the preserved deterministic mock branch, and the revised live demo wording.
- Validation passed with `npm run typecheck`, `npm run test`, and `npm run think:smoke`. The exact host-local `KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run` command still fails immediately with `connect ECONNREFUSED 127.0.0.1:8787` because no local Worker is listening, and the exact `demo:validate` command then fails with `Provide --run-id=<id> or set KEYSTONE_RUN_ID.` because no live run was created in this session.

**Next Starter Context**  
Phase 4 should keep the remaining fixture-scoped guardrails explicit, rerun `KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run` plus `demo:validate` against a live local Worker, and fix the remaining live runtime gap that currently lets a real archived Think run omit the promoted `run_note`.

### Phase 4: Stabilize the exact live demo validation pair

Make the exact documented live `demo:run` -> `demo:validate` pair pass end to end against a real local Worker before the plan moves on to docs/archive.

#### Phase Handoff

**Goal**  
Make the exact documented live `demo:run` -> `demo:validate` pair pass against a real local Worker, including the required promoted Think artifact contract.

**Scope Boundary**  
In scope: runtime or script changes required to make the real local `demo:run` / `demo:validate` pair reliable, any supporting tests, and plan updates that record the new evidence.  
Out of scope: broader documentation refresh, plan archive work, adding more runtime roles, changing the default runtime, or widening scope into arbitrary repo ingestion.

**Read First**  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`  
`src/workflows/TaskWorkflow.ts`  
`src/keystone/agents/implementer/ImplementerAgent.ts`  
`tests/scripts/demo-contracts.test.ts`  
This plan in its latest state

**Files Expected To Change**  
`.gitignore`  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`  
`scripts/demo-state.ts`  
`src/keystone/agents/base/KeystoneThinkAgent.ts`  
`src/keystone/agents/implementer/ImplementerAgent.ts`  
`tests/lib/agents/implementer-agent.test.ts`  
`tests/lib/agents/keystone-think-agent.test.ts`  
`tests/scripts/demo-contracts.test.ts`  
This plan file

**Validation**  
Host validation outside the Codex sandbox:

```bash
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate
```

Also rerun focused in-repo validation:

```bash
npm run typecheck
npm run test
npm run think:smoke
```

Success means the exact documented live command pair passes against a real local Worker, including at least one promoted `run_note`, and the supporting repo validation remains green.

**Plan / Docs To Update**  
Update the living sections of this plan so the live-validation evidence and any remaining blocker are explicit.

**Deliverables**  
An exact live `demo:run` -> `demo:validate` pair that passes against a real local Worker, plus the tests or small runtime/script changes required to make that contract reliable.

**Commit Expectation**  
`Stabilize live Think demo validation pair`

**Known Constraints / Baseline Failures**  
The host-local `wrangler dev` constraint still applies. No additional Phase 4 blocker remains after the live `run_note` reliability fix and the exact host validation pair rerun.

**Status**  
Completed 2026-04-17.

**Completion Notes**  
- `scripts/demo-run.ts`, `scripts/demo-validate.ts`, `scripts/demo-state.ts`, and `tests/scripts/demo-contracts.test.ts` now make the exact documented live pair self-contained and review-safe: `demo:run` persists only the last successful archived run id/base URL under `.keystone/demo-last-run.json`, failed/cancelled runs do not overwrite that state, and `demo:validate` reuses the shortcut only when no explicit `--run-id` or `KEYSTONE_RUN_ID` is supplied.
- `src/keystone/agents/implementer/ImplementerAgent.ts`, `src/keystone/agents/base/KeystoneThinkAgent.ts`, and `tests/lib/agents/implementer-agent.test.ts` now normalize empty assistant summaries and synthesize a markdown fallback note under `/artifacts/out` when a completed live Think turn stages no `run_note`, which preserves the existing artifact-promotion path instead of inventing a second promotion mechanism.
- Validation passed with `npm run typecheck`, `npm run test`, and `npm run think:smoke`, with `npm run test` reporting `26 passed | 1 skipped` test files and `91 passed | 3 skipped` tests.
- Host validation passed on the real local Worker at `http://127.0.0.1:8787`: `KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run` archived run `bba28327-3dd9-4bcf-b551-4d9b02f64833`, and the exact follow-on `KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate` succeeded against that persisted run with `decision_package`, `run_plan`, `task_handoff`, `run_note`, and `run_summary` present.
- The Phase 4 fix pass added direct Think-turn boundary coverage in `tests/lib/agents/keystone-think-agent.test.ts`, proving that a live `KeystoneThinkAgent.executeTurn(...)` with empty assistant text and no staged files still returns a synthesized markdown `run_note` and the normalized fallback summary.
- Fix-pass validation passed with `npm run typecheck` and `npm run test`, with `npm run test` reporting `27 passed | 1 skipped` test files and `94 passed | 3 skipped` tests. The exact host-local pair was also reconfirmed on the real local Worker at `http://127.0.0.1:8787`: `KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run` archived run `679029a5-d572-4339-a7b1-345b7d919f69`, and the exact follow-on `demo:validate` succeeded against that persisted run with one each of `decision_package`, `run_plan`, `task_handoff`, `run_note`, and `run_summary`.

**Next Starter Context**  
Phase 5 should leave the now-working exact live validation pair untouched, update the README and Think runtime docs to match the validated `scripted`-default / `think-live` fixture-scoped contract, record any still-intentional single-task guardrails as durable debt only if they remain explicitly deferred, and then archive the plan.

### Phase 5: Revalidate the live full-workflow demo, update durable docs, and archive the plan

Close the loop with end-to-end proof, documentation updates, plan archive work, and any explicitly deferred debt captured in the tracker.

#### Phase Handoff

**Goal**  
Leave behind a passing live full-workflow Think demo path and docs that explain it accurately.

**Scope Boundary**  
In scope: README/runbook/developer-doc updates, `.ultrakit/notes.md` updates if observations changed, plan closeout, debt tracker entries for intentionally deferred gaps, and archiving the plan after success.  
Out of scope: adding more runtime roles, changing the default runtime, or widening scope into arbitrary repo ingestion.

**Read First**  
`README.md`  
`.ultrakit/developer-docs/think-runtime-architecture.md`  
`.ultrakit/developer-docs/think-runtime-runbook.md`  
`.ultrakit/notes.md`  
This plan in its latest state

**Files Expected To Change**  
`README.md`  
`.ultrakit/developer-docs/think-runtime-architecture.md`  
`.ultrakit/developer-docs/think-runtime-runbook.md`  
`.ultrakit/notes.md`  
`.ultrakit/exec-plans/tech-debt-tracker.md`  
`.ultrakit/exec-plans/active/index.md`  
`.ultrakit/exec-plans/completed/README.md`  
This plan file and its archived location under `completed/`

**Validation**  
Host validation outside the Codex sandbox:

```bash
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate
```

Also rerun broad in-repo validation if the baseline remains clean:

```bash
npm run lint
npm run typecheck
npm run test
```

Success means the docs describe the same commands that just passed and the plan is ready to archive with any real remaining gaps written down explicitly.

**Plan / Docs To Update**  
Update every living section of this plan, `.ultrakit/notes.md`, and the listed docs. Add explicit deferred items to `tech-debt-tracker.md` if they remain out of scope.

**Deliverables**  
Passing end-to-end live full-workflow demo proof, aligned docs, explicit deferred debt if any, and an archived completed plan.

**Commit Expectation**  
`Document Think full-workflow demo path`

**Known Constraints / Baseline Failures**  
The host-local `wrangler dev` constraint still applies. If no local Worker is currently listening, rely on the last accepted exact-pair host proof rather than reopening runtime work during this docs/archive phase.

**Status**  
Completed 2026-04-17.

**Completion Notes**  
- `README.md`, `.ultrakit/developer-docs/think-runtime-architecture.md`, and `.ultrakit/developer-docs/think-runtime-runbook.md` now describe the current validated contract exactly: `scripted` remains the default runtime, `runtime=think` plus `thinkMode=mock` remains deterministic, and `runtime=think` plus `thinkMode=live` proves live compile -> persisted compiled handoff -> Think task execution -> archived run on the approved fixture path.
- The durable docs now say explicitly that the live proof remains fixture-scoped to the committed demo repo plus committed decision package, and that the compiled Think validator still requires the approved single independent task shape with empty `dependsOn`.
- `.ultrakit/notes.md` now records the precise `.keystone/demo-last-run.json` behavior: only the last successful archived run is persisted, and explicit `--run-id` / `KEYSTONE_RUN_ID` validation inputs bypass that state file.
- `.ultrakit/exec-plans/tech-debt-tracker.md` now records the only remaining deferred workflow gap from this plan: broadening the live Think proof beyond the current fixture-scoped single independent task validator.
- Phase 5 reran `npm run lint`, `npm run typecheck`, and `npm run test`; all passed, with `npm run test` reporting `27 passed | 1 skipped` test files and `94 passed | 3 skipped` tests.
- The local Worker was not reachable on `127.0.0.1:8787` during this closeout session, so the exact live host pair was not rerun here. The accepted Phase 4 fix-pass proof remains the authoritative live evidence: run `679029a5-d572-4339-a7b1-345b7d919f69` archived on `http://127.0.0.1:8787`, and the exact follow-on `demo:validate` succeeded with `decision_package`, `run_plan`, `task_handoff`, `run_note`, and `run_summary`.

**Next Starter Context**  
No next phase. This plan is ready to archive. Future workflow generalization should start from `TD-2026-04-17-001` in `tech-debt-tracker.md`.

## Concrete Steps

1. Record and fix the current validation baseline noise:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm run lint
npm run typecheck
npm run test
```

Expected result: broad validation is either green or any remaining noise is narrow and intentional.

2. Rewire the live Think compile path:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk sed -n '1,260p' src/workflows/RunWorkflow.ts
rtk sed -n '1,240p' src/keystone/compile/plan-run.ts
```

Expected result: `thinkMode=live` no longer silently maps to deterministic fixture compile on the happy path.

3. Rewire the Think task path around compiled handoffs:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk sed -n '1,360p' src/workflows/TaskWorkflow.ts
rtk sed -n '1,260p' src/keystone/agents/implementer/ImplementerAgent.ts
```

Expected result: the live Think task execution path is driven by compiled handoff artifacts rather than the hardcoded fixture greeting gate.

4. Make the exact live validation pair reliable:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate
```

Expected result: the run starts from decision-package input, compiles live, executes Think task work, promotes the required `run_note`, and `demo:validate` passes against the real archived run without manual run-id patching.

5. Update durable docs and archive the plan:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk sed -n '1,220p' README.md
rtk sed -n '1,240p' .ultrakit/developer-docs/think-runtime-architecture.md
rtk sed -n '1,240p' .ultrakit/developer-docs/think-runtime-runbook.md
```

Expected result: the docs describe the exact commands that just passed, any intentional limits are explicit, and the completed plan can move out of `active/`.

## Validation and Acceptance

This plan is accepted only when all of the following are true:

1. `npm run lint`, `npm run typecheck`, and `npm run test` are green in-repo, or any remaining broad validation noise is explicitly documented as an intentional baseline issue.
2. `runtime=think` plus `thinkMode=mock` still provides the deterministic validation path.
3. `runtime=think` plus `thinkMode=live` uses the real compile path instead of `compileDemoFixtureRunPlan` for the happy-path demo.
4. The live Think demo starts from `/v1/runs` input and not from a precomputed task handoff shortcut.
5. `TaskWorkflow` no longer hard-fails on the live happy path with `The Think runtime is only wired for the fixture-backed demo task path.`
6. The live happy-path run produces normal workflow artifacts, including `run_plan`, `task_handoff`, at least one promoted Think artifact such as `run_note`, and `run_summary`.
7. The live happy-path run reaches `archived` with no HITL approval step required.
8. README and the Think runbook describe the commands that actually passed.

Known baseline state before execution:

- `npm run typecheck` passes.
- `npm run test` passes.
- `npm run lint` fails on generated `.localflare/.wrangler` files.
- `npm run build` fails in the Codex sandbox because Wrangler and Docker try to write under the user home directory.

## Idempotence and Recovery

- The mock Think path must remain available until the live full-workflow path is proven. Do not remove the fallback early.
- If a phase stalls, update `Progress`, `Execution Log`, `Surprises & Discoveries`, and the current phase handoff before stopping.
- Any workflow-routing change should keep stable artifact keys and session IDs so reruns remain inspectable instead of creating ambiguous duplicates.
- If a fix requires narrowing the live happy path back to a smaller supported shape, record that explicitly in the plan and docs instead of silently restoring the old hidden shortcut.
- Host-local live validation must continue to respect the `.ultrakit/notes.md` constraint that local `wrangler dev` runs outside the Codex sandbox boundary.

## Artifacts and Notes

Planning-time baseline captured on 2026-04-17:

```text
$ npm run lint
Fails because ESLint traverses generated .localflare/.wrangler outputs.
```

```text
$ npm run typecheck
> tsc --noEmit
```

```text
$ npm run test
Test Files  21 passed | 1 skipped (22)
Tests  62 passed | 3 skipped (65)
```

```text
$ npm run build
Fails in the Codex sandbox because Wrangler/Docker try to write under ~/.config/.wrangler and ~/.docker/buildx.
```

Phase 1 completion captured on 2026-04-17:

```text
$ npm run lint
> eslint .
```

```text
$ npm run typecheck
> tsc --noEmit
```

```text
$ npm run test
Test Files  21 passed | 1 skipped (22)
Tests  63 passed | 3 skipped (66)
```

Phase 2 completion captured on 2026-04-17:

```text
$ npm run typecheck
> tsc --noEmit
```

```text
$ npm run test
Test Files  23 passed | 1 skipped (24)
Tests  74 passed | 3 skipped (77)
```

```text
$ KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run -- --stream-events=false
status=archived
artifacts.byKind: decision_package=1 run_plan=1 task_handoff=1 run_note=1 run_summary=1
compile.started payload.compileMode=live
compile.completed payload.compileMode=live
run_plan.summary="Make a small deterministic update to the greeting implementation, verify the fixture tests still pass, and capture evidence-ready outputs for later phases."
task_handoff.task.summary="Update the greeting source file in a minimal, reviewable way and confirm the existing fixture behavior remains valid."
```

Phase 2 third fix pass captured on 2026-04-17:

```text
$ npm run typecheck
> tsc --noEmit
```

```text
$ npm run test
Test Files  25 passed | 1 skipped (26)
Tests  84 passed | 3 skipped (87)
```

```text
$ KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run -- --stream-events=false
TypeError: fetch failed
[cause]: Error: connect ECONNREFUSED 127.0.0.1:8787
```

Phase 3 completion captured on 2026-04-17:

```text
$ npm run typecheck
> tsc --noEmit
```

```text
$ npm run test
Test Files  26 passed | 1 skipped (27)
Tests  88 passed | 3 skipped (91)
```

```text
$ npm run think:smoke
ok=true
stagedArtifacts[0].kind=run_note
bashCommand=node --test
```

```text
$ KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run
TypeError: fetch failed
[cause]: Error: connect ECONNREFUSED 127.0.0.1:8787
```

```text
$ KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate
Error: Provide --run-id=<id> or set KEYSTONE_RUN_ID.
```

Phase 4 fix pass captured on 2026-04-17:

```text
$ npm run typecheck
> tsc --noEmit
```

```text
$ npm run test
Test Files  27 passed | 1 skipped (28)
Tests  94 passed | 3 skipped (97)
```

```text
$ KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run
status=archived
runId=679029a5-d572-4339-a7b1-345b7d919f69
artifacts.byKind: decision_package=1 run_plan=1 task_handoff=1 run_note=1 run_summary=1
```

```text
$ KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate
ok=true
runId=679029a5-d572-4339-a7b1-345b7d919f69
runtime=think
thinkMode=live
```

Phase 5 completion captured on 2026-04-17:

```text
$ npm run lint
> eslint .
```

```text
$ npm run typecheck
> tsc --noEmit
```

```text
$ npm run test
Test Files  27 passed | 1 skipped (28)
Tests  94 passed | 3 skipped (97)
```

```text
$ curl -sS -i http://127.0.0.1:8787/v1/health
curl: (7) Failed to connect to 127.0.0.1 port 8787 after 0 ms: Could not connect to server
```

Key remaining intentional limitations:

- the live Think proof remains fixture-scoped to the approved demo repo and decision package
- the compiled plan validator still requires a single independent task with empty `dependsOn`

## Interfaces and Dependencies

Important interfaces and modules in this plan:

- `RunInput` in `src/http/contracts/run-input.ts`
- `RunExecutionOptions` in `src/lib/runs/options.ts`
- `RunWorkflowParams` in `src/workflows/RunWorkflow.ts`
- `TaskWorkflowParams` in `src/workflows/TaskWorkflow.ts`
- `CompiledRunPlan` and `CompiledTaskPlan` in `src/keystone/compile/contracts.ts`
- `TaskHandoff` in `src/keystone/tasks/load-task-contracts.ts`
- `KeystoneThinkAgent.runImplementerTurn()` in `src/keystone/agents/base/KeystoneThinkAgent.ts`

External/runtime dependencies this plan relies on:

- Cloudflare Workers
- Cloudflare Workflows
- Cloudflare Durable Objects
- Cloudflare Sandboxes
- R2-backed artifact storage
- Hyperdrive-backed local Postgres
- Local OpenAI-compatible chat-completions backend at `http://localhost:10531`

The architectural rule for this plan stays the same as the current docs: Think may own the inside of a task turn, but Keystone still owns the workflow truth.
