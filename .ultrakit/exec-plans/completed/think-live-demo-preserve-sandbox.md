# Think Live Demo Preserve Sandbox

## Purpose / Big Picture

Keystone already has a Think-backed fixture demo path, but today that path is anchored on a deterministic mock model and the task session teardown destroys the sandbox at the end of execution. After this plan lands, an operator should be able to launch an explicit demo run that uses the real Think model path against the fixture workspace and keep the sandbox alive afterward for manual inspection.

The observable outcome is:

- the existing deterministic Think demo remains available for stable validation,
- a separate live-model Think demo path exists for manual inspection and experimentation, and
- the preserved demo sandbox can still be opened after the run instead of being destroyed during task-session teardown.

## Backward Compatibility

Backward compatibility is required with the current M1 and Think runtime proof:

- Keep `scripted` as the default runtime.
- Keep the current deterministic mock-backed Think validation path available.
- Do not change the file-first artifact promotion flow or the existing fixture repository contract.
- Limit the new preserved-sandbox behavior to explicit opt-in demo runs rather than changing every task workflow by default.

## Design Decisions

1. **Date:** 2026-04-17  
   **Decision:** Represent the new behavior as explicit run options carried through run creation into `RunWorkflow` and `TaskWorkflow`.  
   **Rationale:** The runtime already carries `runtime` selection through durable workflow params. Live-model demo execution and sandbox preservation should use the same explicit, durable pattern instead of relying on local-only implicit behavior.  
   **Alternatives considered:** Hard-code the live-model path for all Think runs; key behavior off ad hoc environment variables inside the workflow only.

2. **Date:** 2026-04-17  
   **Decision:** Preserve the sandbox for inspection by adding a non-destructive task-session close path instead of simply skipping teardown logic entirely.  
   **Rationale:** The run should still close cleanly and publish an observable event, but the sandbox and execution session should remain available for inspection.  
   **Alternatives considered:** Remove teardown with no replacement; keep destroying the sandbox and require artifact-only inspection.

3. **Date:** 2026-04-17  
   **Decision:** Keep the deterministic mock-backed Think path as the default fixture validation mode and add a separate explicit live-model Think mode.  
   **Rationale:** The repository still needs a stable, repeatable validation path that does not depend on model output variance, while the user also wants a real-agent demo for inspection.  
   **Alternatives considered:** Replace the existing Think validation path outright with live-model execution.

4. **Date:** 2026-04-17  
   **Decision:** Do not add first-class `Thread` or `Lease` primitives as part of this feature.  
   **Rationale:** The current user preference is to avoid introducing those abstractions unless a concrete Keystone gap appears that the Think runtime or Cloudflare platform does not already cover.  
   **Alternatives considered:** Expand this feature into broader orchestration primitive work.

## Execution Log

- **Date:** 2026-04-17  
  **Phase:** Planning  
  **Decision:** Keep the new live-model path fixture-scoped for now and thread it through the existing run API as a demo option rather than creating a new dedicated HTTP route.  
  **Rationale:** The existing `/v1/runs` path already owns durable run creation and summary polling. Reusing it keeps the demo path close to the real product flow.

- **Date:** 2026-04-17  
  **Phase:** Phase 1  
  **Decision:** Add a normalized `options` object to run input with `thinkMode` and `preserveSandbox`, and persist that object into run session metadata plus workflow params.  
  **Rationale:** The workflow already persists `runtime` durably. The new demo behavior needed the same end-to-end explicitness so retries and summaries stay consistent.

- **Date:** 2026-04-17  
  **Phase:** Phase 1  
  **Decision:** Implement sandbox preservation as `TaskSessionDO.preserveForInspection()` which archives the task session and emits `sandbox.preserved` without deleting the execution session or destroying the sandbox.  
  **Rationale:** The user explicitly wants post-run sandbox inspection. Archiving the session without destruction keeps the workflow clean while preserving the live container.

- **Date:** 2026-04-17  
  **Phase:** Phase 2  
  **Decision:** Default `scripts/demo-run.ts` to preserve the sandbox automatically when running `runtime=think` with `thinkMode=live`, and add `demo:run:think-live` as the convenience entrypoint.  
  **Rationale:** The live-model demo is an inspection-oriented path. Requiring a second flag every time would make the main operator workflow harder to discover than necessary.

## Progress

- [x] 2026-04-17 Plan created and registered in the active plan index.
- [x] 2026-04-17 Phase 1 completed: explicit run options now carry `thinkMode` and `preserveSandbox` from `/v1/runs` through `RunWorkflow` into `TaskWorkflow`.
- [x] 2026-04-17 Phase 1 completed: `TaskSessionDO.preserveForInspection()` archives the task session and emits `sandbox.preserved` without destroying the sandbox.
- [x] 2026-04-17 Phase 2 completed: `demo:run:think-live`, `scripts/demo-run.ts`, `README.md`, and the Think runbook now document the live-model Think demo plus preserved sandbox inspection path.
- [x] 2026-04-17 Phase 2 validation completed: targeted Vitest coverage, `npm run typecheck`, and targeted ESLint on the changed code paths all passed.

## Surprises & Discoveries

- The current Think fixture path already has a real-model code path in `KeystoneThinkAgent`; the workflow forces the mock behavior by injecting `mockModelPlan` inside `TaskWorkflow`.
- The current demo teardown behavior is centralized in `TaskWorkflow` via `taskSession.teardown()`, so preserving the sandbox can be implemented as one explicit workflow branch instead of changing the agent implementation.
- Repo-wide `npm run lint` is currently noisy because generated `.localflare/.wrangler` artifacts are not ignored by ESLint in this workspace. The changed code paths still passed targeted ESLint cleanly.

## Outcomes & Retrospective

The live-model Think demo path now exists without replacing the deterministic mock-backed Think proof. Operators can run `npm run demo:run:think-live` to exercise the real Think model path against the fixture repository, and that path preserves the sandbox so `npm run sandbox:shell` can inspect it afterward while local Wrangler is still running.

The deterministic mock-backed Think path remains intact for stable validation. The remaining gap is host-local manual rerun against a live `wrangler dev` instance, which still depends on the existing machine-level constraint that local Wrangler must run outside the Codex sandbox boundary.

## Context and Orientation

The current relevant runtime surface is:

- `src/http/contracts/run-input.ts`: accepted run payload shape.
- `src/http/handlers/runs.ts`: durable run creation entrypoint and runtime selection.
- `src/workflows/RunWorkflow.ts`: run-scoped orchestration and task workflow fanout.
- `src/workflows/TaskWorkflow.ts`: task execution, Think mock injection, artifact promotion, and teardown.
- `src/durable-objects/TaskSessionDO.ts`: workspace materialization and destructive sandbox teardown.
- `src/keystone/agents/base/KeystoneThinkAgent.ts`: live-model vs mock-model Think execution seam.
- `scripts/demo-run.ts` and `scripts/demo-validate.ts`: operator-facing local demo helpers.
- `README.md` and `.ultrakit/developer-docs/think-runtime-runbook.md`: durable operator/developer guidance.

The live-model capability already exists in `KeystoneThinkAgent`: if `mockModelPlan` is absent, it uses the local OpenAI-compatible backend configured by `KEYSTONE_CHAT_COMPLETIONS_BASE_URL` and `KEYSTONE_CHAT_COMPLETIONS_MODEL`.

## Plan of Work

First, extend the durable run input contract with a small options object that can express two concerns: whether a Think demo run should use the deterministic mock path or the live model path, and whether the task sandbox should be preserved for inspection after the task finishes.

Next, thread those options through `createRunHandler`, `RunWorkflow`, and `TaskWorkflow`. `TaskWorkflow` should stop force-injecting `mockModelPlan` for every fixture-backed Think run and instead decide between the mock path and the live-model path based on the explicit option.

Then, split destructive teardown from “preserve for inspection” inside `TaskSessionDO`. Preserving the sandbox should still close the workflow path cleanly and publish an event, but it must not destroy the sandbox container or delete the execution session.

Finally, update the local demo helpers and durable docs so an operator can intentionally choose:

- deterministic Think validation, or
- live-model Think demo plus preserved sandbox inspection.

## Concrete Steps

1. Update the run input contract and run creation handler:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk sed -n '1,260p' src/http/contracts/run-input.ts
rtk sed -n '1,220p' src/http/handlers/runs.ts
```

Expected result: a durable run options object is accepted, validated, and persisted into workflow params and run session metadata.

2. Update workflow propagation and Think path selection:

```bash
rtk sed -n '1,460p' src/workflows/RunWorkflow.ts
rtk sed -n '1,620p' src/workflows/TaskWorkflow.ts
```

Expected result: fixture-backed Think runs can select `mock` or `live`, and sandbox preservation is an explicit workflow decision.

3. Add a non-destructive task-session preservation path:

```bash
rtk sed -n '1,660p' src/durable-objects/TaskSessionDO.ts
```

Expected result: the workflow can close a task session for inspection without calling `sandbox.destroy()`.

4. Update the demo helpers and docs:

```bash
rtk sed -n '1,220p' scripts/demo-run.ts
rtk sed -n '1,220p' scripts/demo-validate.ts
rtk sed -n '1,220p' README.md
rtk sed -n '1,220p' .ultrakit/developer-docs/think-runtime-runbook.md
```

Expected result: the live-model Think demo path and preserved sandbox behavior are visible to the next contributor without reading source first.

## Validation and Acceptance

Acceptance is met when all of the following are true:

- `parseRunInput(...)` accepts the new explicit demo options and rejects invalid values.
- A Think run can still use the deterministic mock-backed path for stable validation.
- An explicit live-model Think demo run does not inject `mockModelPlan`.
- A preserved demo sandbox is not destroyed by `TaskWorkflow` teardown logic.
- The local demo helpers document how to run the live-model Think demo and inspect the sandbox afterward.

Targeted validation:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm run test -- tests/http/run-input.test.ts tests/http/app.test.ts
npm run lint
npm run typecheck
```

If host-local Worker validation is run later, the manual proof path should be:

```bash
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live KEYSTONE_PRESERVE_SANDBOX=1 npm run demo:run
KEYSTONE_AGENT_RUNTIME=think npm run sandbox:shell
```

Known baseline constraint: host-local `wrangler dev` on this machine still needs to run outside the Codex sandbox boundary.

## Idempotence and Recovery

The code changes are safe to retry because they only extend the run options contract and branch behavior off explicit flags. If work stops midway:

- ensure `Progress` reflects which files were partially updated,
- keep the deterministic mock-backed Think path working until the live-model path is fully wired,
- do not remove destructive teardown until the preservation path exists, and
- rerun the targeted tests before attempting host-local manual validation.

## Artifacts and Notes

- Existing local sandbox inspection helper: `scripts/open-sandbox-shell.sh`
- Existing deterministic Think smoke path: `scripts/think-smoke.ts`
- Existing task-session teardown callsite: `src/workflows/TaskWorkflow.ts`

## Interfaces and Dependencies

The final implementation should leave these interfaces in a coherent state:

- `RunInput` accepts optional durable demo options.
- `RunWorkflowParams` and `TaskWorkflowParams` carry those options explicitly.
- `TaskSessionDO` exposes both destructive teardown and non-destructive preservation.
- `KeystoneThinkAgent` still supports both live and mock model execution through the same `runImplementerTurn()` surface.

### Phase 1 Phase Handoff

#### Goal

Wire explicit run options through the HTTP and workflow stack, then add the non-destructive sandbox preservation path.

#### Scope Boundary

Stay within run-input parsing, run/workflow params, `TaskWorkflow`, and `TaskSessionDO`. Do not redesign the broader runtime model.

#### Read First

- `src/http/contracts/run-input.ts`
- `src/http/handlers/runs.ts`
- `src/workflows/RunWorkflow.ts`
- `src/workflows/TaskWorkflow.ts`
- `src/durable-objects/TaskSessionDO.ts`

#### Files Expected To Change

- `src/http/contracts/run-input.ts`
- `src/http/handlers/runs.ts`
- `src/workflows/RunWorkflow.ts`
- `src/workflows/TaskWorkflow.ts`
- `src/durable-objects/TaskSessionDO.ts`

#### Validation

- `npm run test -- tests/http/run-input.test.ts tests/http/app.test.ts`
- `npm run typecheck`

#### Plan / Docs To Update

- this plan’s `Progress`, `Execution Log`, and `Surprises & Discoveries`

#### Deliverables

- explicit durable run options
- live vs mock Think path selection in `TaskWorkflow`
- non-destructive task-session preservation method

#### Commit Expectation

One implementation commit is fine if the phase completes cleanly.

#### Known Constraints / Baseline Failures

- Keep the existing deterministic Think path working.
- Do not require host-local `wrangler dev` just to prove the contract changes.

#### Status

Completed on 2026-04-17.

#### Completion Notes

- Run input now accepts explicit normalized demo options.
- `TaskWorkflow` selects mock vs live Think execution from those options.
- `TaskSessionDO` can preserve the sandbox for inspection without destroying it.

#### Next Starter Context

Phase 1 is done. If follow-up work is needed, start from the operator-facing docs or from host-local manual demo proof rather than reopening the workflow contract.

### Phase 2 Phase Handoff

#### Goal

Update local demo scripts, validation, and durable docs so the live-model path and preserved sandbox behavior are discoverable and usable.

#### Scope Boundary

Stay within scripts, tests, and docs required to explain and validate the new demo behavior.

#### Read First

- `scripts/demo-run.ts`
- `scripts/demo-validate.ts`
- `README.md`
- `.ultrakit/developer-docs/think-runtime-runbook.md`

#### Files Expected To Change

- `scripts/demo-run.ts`
- `scripts/demo-validate.ts`
- `README.md`
- `.ultrakit/developer-docs/think-runtime-runbook.md`
- tests touched by the new input contract or output shape

#### Validation

- `npm run lint`
- `npm run typecheck`
- targeted tests updated for the new options

#### Plan / Docs To Update

- this plan’s living sections
- durable docs listed above

#### Deliverables

- explicit live-model Think demo invocation
- documented preserved sandbox inspection path
- updated validation expectations where needed

#### Commit Expectation

Can land with the implementation commit if the work stays small; otherwise use a follow-up commit.

#### Known Constraints / Baseline Failures

- The stable validation path should remain the deterministic mock-backed Think mode.
- Host-local manual validation still depends on a live local Worker outside Codex sandbox restrictions.

#### Status

Completed on 2026-04-17.

#### Completion Notes

- Added `demo:run:think-live`.
- `scripts/demo-run.ts` now sends `options.thinkMode` plus `options.preserveSandbox`.
- README and Think runbook now describe the preserved-sandbox inspection path.

#### Next Starter Context

The user’s requested behavior is now implemented. The next likely follow-up is a host-local live rerun and any ergonomics work that falls out of real sandbox inspection.
