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

## Progress

- [x] 2026-04-17 Discovery decisions resolved in conversation: no new `Thread`/`Lease` primitives, no HITL on the happy path, and keep the first proof fixture-scoped.
- [x] 2026-04-17 Baseline run completed for `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- [x] 2026-04-17 Active execution plan created under `.ultrakit/exec-plans/active/`.
- [x] 2026-04-17 Phase 1: Stabilize the operator-facing live demo contract and clean baseline validation noise.
- [x] 2026-04-17 Phase 1 fix pass: add automated script-level coverage for `demo-run` / `demo-validate` contract defaults and live overrides.
- [x] 2026-04-17 Phase 1 second fix pass: exercise the real `demo:run` / `demo:validate` npm entrypoints against a stub HTTP server and lock the emitted JSON/event output.
- [x] 2026-04-17 Phase 1 extra fix pass: cover the deterministic `think/mock` operator contract at the real `npm run demo:run` / `demo:validate` boundary.
- [x] 2026-04-17 Phase 2: Route `thinkMode=live` through live compile and compiled handoffs instead of deterministic fixture compile.
- [ ] Phase 3: Generalize the Think task path from the fixture greeting gate to compiled task handoffs on the happy path.
- [ ] Phase 4: Revalidate the live full-workflow demo, update docs, and archive the plan.

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

## Outcomes & Retrospective

This section will be completed as phases land. The target retrospective for the finished plan is:

- Phase 1 restored a trustworthy lint baseline, made the demo/docs explicit that the current live Think path is still fixture-backed in this phase, and added direct automated coverage for the operator-facing scripted, deterministic Think mock, and live Think CLI contracts.
- Phase 2 removed the hidden `think/live` fixture-compile bypass, added compile-mode metadata that distinguishes live versus fixture compile artifacts/events, added direct `RunWorkflow` routing coverage, and proved a host-local live run archived with model-generated `run_plan` and `task_handoff` artifacts.
- the live Think demo proves the workflow from run input to archived run summary,
- the mock Think demo remains available for deterministic validation,
- the repo-wide validation baseline is cleaner and easier to trust, and
- any intentionally deferred gaps are recorded explicitly in `tech-debt-tracker.md`.

## Context and Orientation

Current relevant runtime behavior:

- `src/http/handlers/runs.ts` accepts `/v1/runs`, persists runtime/options, and starts `RunWorkflow`.
- `src/workflows/RunWorkflow.ts` now routes `runtime=think` plus `thinkMode=live` through `compileRunPlan`, while keeping `compileDemoFixtureRunPlan` only for the preserved deterministic `runtime=think` plus `thinkMode=mock` fixture path.
- `src/keystone/compile/plan-run.ts` writes explicit `compileMode` metadata for both the real compile path (`live`) and the deterministic fixture compile path (`fixture`) so artifacts and compile events show which path actually ran.
- `src/workflows/TaskWorkflow.ts` still restricts the Think path to the fixture greeting task by throwing `The Think runtime is only wired for the fixture-backed demo task path.` for anything outside that narrow shape.
- `src/keystone/agents/base/KeystoneThinkAgent.ts` and `src/keystone/agents/implementer/ImplementerAgent.ts` already support a real live-model Think turn plus the deterministic mock path.
- `scripts/demo-run.ts` and `scripts/demo-validate.ts` are the operator-facing local demo proof commands.
- `.ultrakit/developer-docs/think-runtime-architecture.md` and `.ultrakit/developer-docs/think-runtime-runbook.md` accurately describe the current limitations: `scripted` remains default, the Think path is only wired for the fixture-backed demo task, and the current proof is narrow.

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
`src/lib/runs/options.ts`  
`tests/http/app.test.ts`  
`tests/lib/workflow-ids.test.ts`

**Files Expected To Change**  
`src/workflows/RunWorkflow.ts`  
`src/keystone/compile/plan-run.ts`  
`src/lib/runs/options.ts`  
`src/http/handlers/runs.ts`  
`tests/http/app.test.ts`  
`tests/lib/workflows/**`

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
- `src/keystone/compile/plan-run.ts` now stamps `compileMode` across compile session metadata, compile events, and artifact metadata for both live and fixture compile paths, so the persisted compile record is explicit instead of inferred.
- `tests/lib/workflows/run-workflow-compile.test.ts` now instantiates `RunWorkflow` with mocked workflow dependencies and proves the live path calls `compileRunPlan` while the mock path still calls `compileDemoFixtureRunPlan`.
- Host validation succeeded with `KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run -- --stream-events=false`: the run archived with one each of `decision_package`, `run_plan`, `task_handoff`, `run_note`, and `run_summary`, emitted `compile.started` / `compile.completed` with `compileMode: "live"`, and persisted model-generated `run_plan` / `task_handoff` text rather than the deterministic fixture summary.

**Next Starter Context**  
Phase 3 should leave the new live compile routing and compile-mode metadata intact, then remove the remaining `TaskWorkflow` fixture gate around `taskId === "task-greeting-tone"` so compiled happy-path Think handoffs are accepted without depending on the greeting-task special case.

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
`src/keystone/agents/base/KeystoneThinkAgent.ts`  
`src/keystone/agents/implementer/ImplementerAgent.ts`  
`src/keystone/tasks/load-task-contracts.ts`  
`scripts/demo-validate.ts`  
`tests/lib/agents/**`  
`tests/http/app.test.ts`

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
Not started.

### Phase 4: Revalidate the live full-workflow demo and update durable docs

Close the loop with end-to-end proof, documentation updates, plan archive work, and any explicitly deferred debt captured in the tracker.

#### Phase Handoff

**Goal**  
Leave behind a passing live full-workflow Think demo path and docs that explain it accurately.

**Scope Boundary**  
In scope: end-to-end demo reruns, README/runbook/developer-doc updates, `.ultrakit/notes.md` updates if observations changed, plan closeout, and debt tracker entries for intentionally deferred gaps.  
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
This plan file

**Validation**  
Host validation outside the Codex sandbox:

```bash
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate
```

Also rerun broad in-repo validation if Phase 1 cleaned the baseline:

```bash
npm run lint
npm run typecheck
npm run test
```

Success means the docs describe the same commands that just passed and the plan is ready to archive with any real remaining gaps written down explicitly.

**Plan / Docs To Update**  
Update every living section of this plan, `.ultrakit/notes.md`, and the listed docs. Add explicit deferred items to `tech-debt-tracker.md` if they remain out of scope.

**Deliverables**  
Passing end-to-end live full-workflow demo proof, aligned docs, and a plan ready for archive.

**Commit Expectation**  
`Document Think full-workflow demo path`

**Known Constraints / Baseline Failures**  
The host-local `wrangler dev` constraint still applies. Do not archive the plan unless the live full-workflow commands have been rerun exactly as documented.

**Status**  
Not started.

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

4. Prove the end-to-end live workflow:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate
```

Expected result: the run starts from decision-package input, compiles live, executes Think task work, promotes artifacts, and archives with a `run_summary`.

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

Key current source limitations to remove:

- `src/workflows/TaskWorkflow.ts`: `resolveThinkTurnInput(...)` throws outside the greeting fixture task
- `.ultrakit/developer-docs/think-runtime-architecture.md`: documents that the Think path is only wired for the fixture-backed demo task

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
