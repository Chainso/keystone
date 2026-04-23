# Multi-Component Compile Runtime Generalization

## Purpose / Big Picture

Keystone already knows how to materialize a project with multiple peer git components into one shared task workspace. What still breaks is the runtime contract around compile and execution: compile insists on collapsing the project back down to one `compileRepo`, `think_live` rejects multi-component projects because of that assumption, and the scripted path falls back to an ambiguous shared-root `npm test` launch when more than one component exists.

After this work lands, an operator will be able to create a run for a project with multiple peer git components, write the three planning documents, and compile the run into a persisted task DAG without choosing a single primary repository. `think_live` execution will treat the full project workspace as the agent's execution surface, with all project components available under `/workspace/code/<component-key>`. The conservative `scripted` path will remain supported for single-component projects, but it will fail fast with a clear message when asked to run against a multi-component project instead of guessing at a cwd or command strategy.

Observable outcome:

- `POST /v1/runs/:runId/compile` succeeds for multi-component git projects without a compile-target selector.
- `run_plan`, `task_handoff`, `run_tasks`, and `run_task_dependencies` continue to be the persisted execution contract.
- `think_live` no longer rejects multi-component projects solely because they have more than one git component.
- the agent-facing prompt and workspace contract describe multi-component git commit expectations truthfully.
- the scripted engine either runs from the single component's worktree or rejects multi-component projects explicitly instead of silently launching from the shared task root.

## Backward Compatibility

Backward compatibility is not required for the internal compile/runtime implementation seams being changed here. The project-model work already established that the clean project-first end state is preferred over preserving transitional single-repo behavior.

Compatibility constraints that do remain:

- Preserve the public `v1` HTTP routes and run lifecycle: project-scoped run creation, explicit compile, run/task/artifact read surfaces, and the existing artifact families.
- Preserve the current target-model persistence shape: `run_plan`, `task_handoff`, `run_tasks`, and `run_task_dependencies` remain the authoritative compiled execution contract.
- Preserve one sandbox per run and one task worktree per git component inside that sandbox.
- Preserve the existing `/workspace/code/<component-key>` task workspace layout and component-aware bridge/session metadata.
- Preserve the current task schema shape unless a phase proves a change is necessary; this plan assumes tasks remain component-agnostic.
- Preserve the current single-component scripted happy path and the current `think_mock` fixture-only contract unless explicitly called out otherwise.

This plan does not add a primary component, compile-target selector, or component-scoped task schema.

## Design Decisions

1. **Date:** `2026-04-22`  
   **Decision:** Treat compile as a document-first transformation from the three run planning documents into a persisted executable DAG, not as a repository inspection step.  
   **Rationale:** The current live compile implementation already works as a single prompt/structured-output turn; the singular repo dependency is leftover coupling, not a product requirement. The user explicitly wants the planning documents to be the full compile context.  
   **Alternatives considered:** Keeping compile repo-aware; replacing compile entirely with direct persistence of `execution_plan` as a DAG without a compile step.

2. **Date:** `2026-04-22`  
   **Decision:** Remove the singular `compileRepo` runtime concept from the main execution path instead of replacing it with a project-level primary component or compile-target selector.  
   **Rationale:** Peer components are already the accepted project model, and compile-target selection was only introduced as a defensive stopgap to avoid silently picking by array order. If compile is doc-only, the selector is unnecessary for the current git-component scope.  
   **Alternatives considered:** Adding `compileTargetComponentKey` to projects; adding a run-scoped compile-target input; continuing to fail multi-component projects.

3. **Date:** `2026-04-22`  
   **Decision:** Keep compiled tasks and task handoffs component-agnostic in this change.  
   **Rationale:** The agent already receives the full multi-component workspace plus project rule overrides through the bridge/session metadata. Adding `componentKeys` to the compiled task schema would widen the product contract without a demonstrated need, and the user explicitly questioned putting components on the task.  
   **Alternatives considered:** Adding `componentKeys: string[]` to compiled tasks; attaching component hints only to task handoffs.

4. **Date:** `2026-04-22`  
   **Decision:** `think_live` becomes the intended multi-component execution path and should execute against the full shared project workspace without a single-target guard.  
   **Rationale:** The workspace and git materialization layers already support multiple components per task. The remaining blocker is an artificial compile-target gate in the Think path, not a missing sandbox capability.  
   **Alternatives considered:** Keeping `think_live` single-target only; adding component-scoped Think turns before removing the guard.

5. **Date:** `2026-04-22`  
   **Decision:** Keep `scripted` intentionally conservative: explicitly reject multi-component projects, and when exactly one component exists, launch from that component's worktree explicitly rather than relying on implicit `defaultCwd` fallback.  
   **Rationale:** The scripted path is already a narrow, command-specific validation seam (`npm test`). Running it from a multi-component shared task root would be ambiguous and likely wrong. A loud failure is better than silently guessing.  
   **Alternatives considered:** Running `npm test` from the shared task root for multi-component projects; executing `npm test` in every git component; adding project-level command configuration in this plan.

6. **Date:** `2026-04-22`  
   **Decision:** Introduce no new dependencies. Reuse the existing compile prompt/structured-output path, workspace bridge, task workflow, and test infrastructure.  
   **Rationale:** The problem is contract drift inside existing repository code, not a missing library capability. New dependencies would add maintenance cost without reducing the core ambiguity.  
   **Alternatives considered:** Adding a workflow/DAG library; introducing separate schema tooling beyond the existing Zod contracts.

7. **Date:** `2026-04-22`  
   **Decision:** Keep project config relevant to execution materialization and runtime context, but not to compile semantics.  
   **Rationale:** Project components, env vars, and rule overrides still drive workspace setup and task execution. What changes here is only that compile no longer treats project config as a singular repo pointer.  
   **Alternatives considered:** Using project config as extra compile prompt context; making compile validate project/component availability before persisting the DAG.

## Execution Log

- **Date:** `2026-04-22`  
  **Phase:** Planning  
  **Decision:** Split the work into four phases: compile-contract refactor, Think/live runtime generalization, scripted-engine hardening, and documentation/closeout.  
  **Rationale:** The discovery work showed one architectural seam plus two distinct execution paths (`think_live` and `scripted`) that should not be mixed in one implementation phase. Keeping them separate lets each phase have one clear validation story.

- **Date:** `2026-04-22`  
  **Phase:** Planning  
  **Decision:** Treat the missing local toolchain (`eslint`, `tsc`, `vitest`, `vite`) as the current baseline blocker instead of assuming older validation notes still apply unchanged.  
  **Rationale:** The plan contract requires a truthful baseline. In this workspace, broad validation currently fails before source checks begin because repo-local dependencies are absent.

- **Date:** `2026-04-22`  
  **Phase:** Phase 1  
  **Decision:** Removed `compileRepo` from the compile/run orchestration contract and made compile prompt input document-only.  
  **Rationale:** Compile only needs the three planning documents plus persistence identity. The singular repo pointer was leftover coupling rather than a product requirement.

- **Date:** `2026-04-22`  
  **Phase:** Phase 2  
  **Decision:** Removed the `think_live` single-target guard and updated Think prompt language to describe per-component commit expectations truthfully.  
  **Rationale:** The workspace bridge already exposes all materialized components. The guard was blocking a supported workspace topology rather than protecting a missing runtime capability.

- **Date:** `2026-04-22`  
  **Phase:** Phase 3  
  **Decision:** Kept `scripted` conservative by deriving an explicit single-component cwd from the materialized workspace and failing fast when more than one component is present.  
  **Rationale:** Shared-root `npm test` was ambiguous for multi-component workspaces. Explicit failure is safer than guessing a command surface.

- **Date:** `2026-04-22`  
  **Phase:** Phase 4  
  **Decision:** Updated durable docs, notes, and debt tracking to the new doc-only compile plus multi-component execution contract, then reran targeted and broad validation.  
  **Rationale:** The code change is only complete if the durable contributor-facing record matches the shipped behavior and the residual validation failures are classified accurately.

- **Date:** `2026-04-22`  
  **Phase:** Validation  
  **Decision:** Installed repo-local Node dependencies before validation and treated remaining broad failures as either unrelated baseline debt or known host/sandbox constraints based on rerun evidence.  
  **Rationale:** After `npm install`, the targeted suites passed, host-permitted build passed, and the remaining broad failures narrowed to unrelated lint/typecheck/UI-test debt rather than regressions in this backend slice.

## Progress

- [x] `2026-04-22` Discovery completed for multi-component compile/runtime generalization.
- [x] `2026-04-22` Read `.ultrakit/notes.md`, the current target-model docs, the completed project-model plan, and the live workflow/runtime seams.
- [x] `2026-04-22` Broad baseline attempted with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.
- [x] `2026-04-22` Baseline outcome recorded: all four commands currently fail immediately because `eslint`, `tsc`, `vitest`, and `vite` are not installed in this workspace.
- [x] `2026-04-22` Active plan drafted and registered in `.ultrakit/exec-plans/active/index.md`.
- [x] `2026-04-22` User approval to execute this plan.
- [x] `2026-04-22` Installed repo-local dependencies with `rtk npm install` in a host-permitted run so validation could proceed.
- [x] `2026-04-22` Phase 1 complete: compile is now doc-only and no longer depends on `compileRepo`.
- [x] `2026-04-22` Phase 2 complete: `think_live` now supports multi-component project execution without the single-target guard, and Think prompts describe multi-component commit expectations accurately.
- [x] `2026-04-22` Phase 3 complete: scripted execution now fails fast for multi-component projects and launches explicitly from the single component worktree when applicable.
- [x] `2026-04-22` Phase 4 complete: docs, notes, and debt entries now reflect the new contract, and targeted plus broad validation were rerun with residual failures classified precisely.

## Surprises & Discoveries

- The repo already supports the hardest filesystem part of multi-component execution. `ensureWorkspaceMaterialized()` creates one repository plus one task worktree per component and sets `defaultCwd` to the shared task root when more than one component exists, which means the shared-workspace model is already real rather than aspirational.
- The compiled task/handoff schema was already component-agnostic. The only code trying to force component selection was the compile/runtime seam, not the persisted task contract.
- The scripted engine had an additional hidden multi-component bug beyond `compileRepo`: `runScriptedTask()` launched `npm test` without an explicit cwd, and `TaskSessionDO.startProcess()` fell back to `workspace.defaultCwd`, which becomes the shared task root for multi-component projects. Phase 3 fixed that by deriving an explicit single-component cwd from the materialized workspace.
- Current broad baseline on `2026-04-22`:
  - `rtk npm run lint` -> `eslint: command not found`
  - `rtk npm run typecheck` -> `tsc: command not found`
  - `rtk npm run test` -> `vitest: command not found`
  - `rtk npm run build` -> `vite: command not found`
- After `npm install`, the targeted validation suites passed cleanly:
  - `rtk npm run test -- tests/lib/compile-plan-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts tests/lib/project-workspace-materialization.test.ts tests/lib/sandbox-agent-bridge.test.ts tests/lib/task-session-do.test.ts` -> `7 passed / 45 passed`
  - `rtk npx eslint src/lib/projects/runtime.ts src/keystone/compile/plan-run.ts src/workflows/RunWorkflow.ts src/workflows/TaskWorkflow.ts src/keystone/agents/implementer/ImplementerAgent.ts tests/lib/compile-plan-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts` -> clean
- Broad closeout validation narrowed remaining failures to unrelated or known-environment issues:
  - `rtk npm run lint` still fails on 10 pre-existing issues in `scripts/run-local.ts`, `src/http/api/v1/documents/handlers.ts`, `src/keystone/integration/finalize-run.ts`, `src/lib/db/schema.ts`, `src/lib/workspace/init.ts`, `tests/http/projects.test.ts`, `tests/lib/project-workspace-materialization.test.ts`, and `tests/lib/run-records.test.ts`.
  - `rtk npm run typecheck` now fails only on the unrelated pre-existing `tests/lib/db-client-worker.test.ts` Hyperdrive-env typing mismatch.
  - host-permitted `rtk npm run test` now fails only on the unrelated UI test `ui/src/test/runs-routes.test.tsx`, which expects a transient `"Compiling run..."` button state.
  - sandboxed `rtk npm run build` still hits the known Wrangler `EROFS` log-write constraint, but host-permitted `rtk npm run build` completed successfully.

## Outcomes & Retrospective

Execution outcome on `2026-04-22`:

- The backend contract is now aligned with the intended project model:
  - compile is doc-only,
  - `RunWorkflow` no longer selects or passes a singular compile repo,
  - tasks remain component-agnostic,
  - `think_live` executes against the full multi-component workspace,
  - `scripted` remains intentionally single-component only.
- Durable docs and notes now match the code, and the old compile-target debt entry is closed.
- Validation is strong for this slice:
  - targeted compile/run/think/scripted/workspace suites pass,
  - touched backend/test files lint clean,
  - host-permitted build passes.
- Remaining broad failures are outside this plan's scope:
  - unrelated repo-wide lint debt,
  - one unrelated `tests/lib/db-client-worker.test.ts` type mismatch,
  - one unrelated UI test expectation in `ui/src/test/runs-routes.test.tsx`.

## Context and Orientation

The current repository already has the right product and workspace model for multi-component projects, but a few runtime seams still assume compile means “pick one repo.”

Key repository areas:

- `src/lib/projects/runtime.ts`
  - Builds `ProjectExecutionSnapshot` from `StoredProject`.
  - This is where the current singular `compileRepo` assumption lives.
- `src/workflows/RunWorkflow.ts`
  - Orchestrates compile, task scheduling, and finalization.
  - Currently requires `compileRepo`, chooses fixture vs live compile from it, and passes `repo` into `compileRunPlan()`.
- `src/keystone/compile/plan-run.ts`
  - The compile implementation.
  - Today it is already a prompt/structured-output turn, but the prompt still includes a singular `repo` pointer.
- `src/keystone/compile/contracts.ts`
  - Defines the persisted compiled DAG schema.
  - Tasks are currently component-agnostic.
- `src/keystone/tasks/load-task-contracts.ts`
  - Defines the persisted task handoff schema and graph consistency checks.
- `src/lib/workspace/init.ts`
  - Materializes the shared task workspace and agent bridge.
  - Already exposes `/workspace/code/<component-key>` and shared-root `defaultCwd` for multi-component tasks.
- `src/durable-objects/TaskSessionDO.ts`
  - Starts/polls sandbox processes and falls back to `workspace.defaultCwd` when a command does not supply `cwd`.
- `src/workflows/TaskWorkflow.ts`
  - Loads task handoffs, prepares the workspace, runs either Think or scripted execution, and persists task status/artifacts.
  - Contains both the current `think_live` single-target guard and the scripted `npm test` path.
- `src/keystone/agents/implementer/ImplementerAgent.ts`
  - Defines the agent-facing prompt language around commits and handoff expectations.

Relevant current docs:

- `.ultrakit/developer-docs/m1-architecture.md`
- `.ultrakit/developer-docs/keystone-target-model-handoff.md`
- `.ultrakit/developer-docs/think-runtime-architecture.md`
- `.ultrakit/developer-docs/think-runtime-runbook.md`
- `.ultrakit/notes.md`

Relevant current tests:

- `tests/lib/compile-plan-run.test.ts`
- `tests/lib/workflows/run-workflow-compile.test.ts`
- `tests/lib/workflows/task-workflow-think.test.ts`
- `tests/lib/workflows/task-workflow-scripted.test.ts`
- `tests/lib/project-workspace-materialization.test.ts`
- `tests/lib/sandbox-agent-bridge.test.ts`
- `tests/lib/task-session-do.test.ts`

Important current truth to preserve:

- one sandbox per run,
- one task worktree per component inside that sandbox,
- task DAG persisted as `run_plan` + `task_handoff` + `run_tasks` + `run_task_dependencies`,
- no approval/event-stream/session-derived product model regression.

## Plan of Work

First, remove the singular `compileRepo` concept from the project/runtime boundary so compile can operate strictly on the three planning documents plus persistence identity. This will change the compile input type, the compile prompt payload, and the `RunWorkflow` handoff into compile. The persisted DAG and handoff artifacts should not change shape beyond what is necessary to stop depending on a repo pointer.

Second, generalize the Think/live path to match the workspace model that already exists. The current multi-component worktree and bridge/session metadata can stay intact; the phase only needs to remove the artificial single-target guard and update agent-facing prompt language so commits are described in terms of changed component repos rather than one singular task worktree.

Third, harden the scripted engine. Because it is intentionally narrow and command-specific, it should not silently inherit the shared multi-component task root as its launch directory. The implementation should explicitly allow the current single-component path and explicitly reject multi-component scripted runs with a clear error. This keeps the runtime truthful without inventing project-level command configuration in this plan.

Finally, close the loop in docs and debt tracking. The README, developer docs, runbooks, and notes must describe compile as doc-only and explain that multi-component execution is supported through `think_live` while scripted remains conservative. The open compile-target debt should be closed or rewritten to reflect the remaining truth after the refactor.

## Concrete Steps

Run from repo root (`/home/chanzo/.codex/worktrees/a015/keystone-cloudflare`) unless stated otherwise.

Baseline and environment checks:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

Expected current result before execution:

- all four commands fail immediately because repo-local tools are not installed.

If execution requires local tools and they are still absent:

```bash
rtk npm install
```

If `npm install` fails because network/sandbox policy blocks it, execution must stop and request the appropriate approval rather than assuming source regressions.

Targeted validation commands by phase:

```bash
rtk npm run test -- tests/lib/compile-plan-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts
rtk npm run test -- tests/lib/workflows/task-workflow-think.test.ts
rtk npm run test -- tests/lib/workflows/task-workflow-scripted.test.ts tests/lib/task-session-do.test.ts
rtk npm run test -- tests/lib/project-workspace-materialization.test.ts tests/lib/sandbox-agent-bridge.test.ts
```

Broad closeout validation after the targeted work passes and dependencies are installed:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

If `npm run build` reaches Wrangler and fails with the known host-shell write constraints, rerun it from a normal host shell and record that evidence in the plan rather than treating it as a code regression.

## Validation and Acceptance

The work is accepted when all of the following are true:

- compiling a run no longer requires a singular `compileRepo` or single-target project assumption anywhere in the main runtime path;
- the compile prompt and input types use only planning documents plus operational identity/persistence data, not a singular repo pointer;
- persisted `run_plan` and `task_handoff` artifacts still validate and still drive execution;
- `think_live` no longer rejects a multi-component project solely because the project contains multiple git components;
- the Think/task prompts tell the agent to commit in each changed component repo rather than one singular task worktree;
- the scripted path either:
  - runs from the explicit single component worktree when there is exactly one component, or
  - fails clearly for multi-component projects without attempting a shared-root `npm test`;
- the repo docs truthfully describe the new compile/runtime contract;
- any superseded debt entry about compile-target selection is updated truthfully.

Validation evidence should include:

- targeted test results for compile/run workflow, Think/live workflow, and scripted workflow behavior;
- broad validation results or a precise record of the remaining environment/toolchain blockers;
- updated docs proving the repo-level contract now matches the shipped code.

## Idempotence and Recovery

This plan is safe to execute phase by phase. If a phase stops halfway:

- update the `Progress`, `Execution Log`, `Surprises & Discoveries`, and the relevant `Phase Handoff` status fields before handing off;
- rerun the targeted tests for that phase before resuming broader validation;
- do not start later phases until the previous phase's contract is coherent in code and docs.

Specific recovery notes:

- Compile persistence already has rollback logic for partially written compiled artifacts; implementation phases should preserve or update that behavior rather than bypassing it.
- If refactoring `compileRepo` leaves stale types or tests in place, fix the type/test breakage in the same phase rather than letting partial compile-contract assumptions leak into later phases.
- If `npm install` is required to proceed and cannot be completed in the current environment, stop after recording that blocker rather than attempting partial implementation without validation tooling.

## Artifacts and Notes

Useful current references:

- current single-target debt entry: `.ultrakit/exec-plans/tech-debt-tracker.md`
- project-model design decisions and prior workspace generalization rationale: `.ultrakit/exec-plans/completed/keystone-project-model-foundation.md`
- live compile prompt seam: `src/keystone/compile/plan-run.ts`
- live single-target guard: `src/workflows/TaskWorkflow.ts`
- scripted shared-root risk: `src/workflows/TaskWorkflow.ts` plus `src/durable-objects/TaskSessionDO.ts`

Baseline transcript snippets from `2026-04-22`:

```text
> eslint .
sh: line 1: eslint: command not found

> tsc --noEmit && tsc --noEmit -p tsconfig.ui.json
sh: line 1: tsc: command not found

> vitest run
sh: line 1: vitest: command not found

> npm run build:ui && wrangler deploy --dry-run --outdir .wrangler/deploy
> vite build
sh: line 1: vite: command not found
```

## Interfaces and Dependencies

Important interfaces and modules:

- `ProjectExecutionSnapshot` in `src/lib/projects/runtime.ts`
  - should end this plan without `compileRepo`;
  - should remain the source of project components, environment, and rule overrides for execution.
- `CompileRunPlanInput` and `buildCompileMessages()` in `src/keystone/compile/plan-run.ts`
  - should end this plan as doc-only compile inputs.
- `CompiledRunPlan` / `CompiledTaskPlan` in `src/keystone/compile/contracts.ts`
  - should remain the persisted DAG contract unless a phase proves a schema change is necessary.
- `TaskHandoff` in `src/keystone/tasks/load-task-contracts.ts`
  - should remain compatible with task execution without adding component metadata in this plan.
- `TaskWorkflow` in `src/workflows/TaskWorkflow.ts`
  - should end this plan with:
    - no `think_live` single-target guard,
    - truthful multi-component commit instructions,
    - explicit scripted behavior for single vs multi-component projects.
- `TaskSessionDO.startProcess()` in `src/durable-objects/TaskSessionDO.ts`
  - already supports explicit `cwd`; the scripted phase should use that capability rather than depending on shared-root fallback.

Dependencies:

- no new runtime or test dependencies should be introduced;
- reuse existing `zod`, `@ai-sdk/openai`, `ai`, workspace bridge, and Vitest-based test seams.

## Phase 1 - Compile Contract Generalization

### Phase Handoff

**Goal**  
Make compile doc-only by removing the singular `compileRepo` dependency from the project/runtime/compile path while preserving the persisted DAG and task handoff contract.

**Scope Boundary**  
In scope: `ProjectExecutionSnapshot`, `RunWorkflow` compile input wiring, compile input types, compile prompt payload, fixture-vs-live compile selection logic, and the compile-focused tests. Out of scope: Think prompt wording, scripted-engine behavior, workspace materialization changes, and documentation updates beyond any brief comments needed to keep code readable during the phase.

**Read First**  
- `src/lib/projects/runtime.ts`
- `src/workflows/RunWorkflow.ts`
- `src/keystone/compile/plan-run.ts`
- `src/keystone/compile/contracts.ts`
- `tests/lib/compile-plan-run.test.ts`
- `tests/lib/workflows/run-workflow-compile.test.ts`
- `.ultrakit/developer-docs/keystone-target-model-handoff.md`

**Files Expected To Change**  
- `src/lib/projects/runtime.ts`
- `src/workflows/RunWorkflow.ts`
- `src/keystone/compile/plan-run.ts`
- `tests/lib/compile-plan-run.test.ts`
- `tests/lib/workflows/run-workflow-compile.test.ts`

**Validation**  
- `rtk npm run test -- tests/lib/compile-plan-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts`
- success means compile tests pass with no remaining `compileRepo` assumptions in the main runtime path.

**Plan / Docs To Update**  
- `Progress`
- `Execution Log`
- `Surprises & Discoveries`
- `Outcomes & Retrospective`
- this phase handoff's `Status`, `Completion Notes`, and `Next Starter Context`

**Deliverables**  
- doc-only compile input contract
- updated compile prompt payload
- `RunWorkflow` compile call path no longer using `compileRepo`
- passing targeted compile/run-workflow tests

**Commit Expectation**  
`make compile doc-driven instead of repo-driven`

**Known Constraints / Baseline Failures**  
- Current broad validation cannot reach source checks until repo-local dependencies are installed.
- Do not widen task schemas or execution semantics in this phase.
- Preserve compile persistence rollback behavior if compile output parsing or artifact writes fail.

**Status**  
`Completed`

**Completion Notes**  
Removed `compileRepo` from `ProjectExecutionSnapshot`, `RunWorkflow`, and `CompileRunPlanInput`; made the compile prompt document-only; updated fixture-compile routing to inspect the materialized project workspace instead of a repo pointer; and added assertions proving compile prompts/calls no longer carry `repo`.

**Next Starter Context**  
Phase 2 should treat the compile seam as settled and focus only on execution behavior: remove the `think_live` single-target guard and make the commit instructions truthful for multi-component repos.

## Phase 2 - Think Live Multi-Component Runtime

### Phase Handoff

**Goal**  
Allow `think_live` tasks to execute against multi-component project workspaces by removing the single-target guard and updating prompt/runtime wording to match multi-component git reality.

**Scope Boundary**  
In scope: `TaskWorkflow` Think/live guard removal, Think prompt wording, any helper functions directly tied to the single-target live restriction, and the Think workflow tests. Out of scope: scripted-engine behavior, compile contract changes beyond what Phase 1 already landed, and any workspace filesystem redesign.

**Read First**  
- `src/workflows/TaskWorkflow.ts`
- `src/keystone/agents/implementer/ImplementerAgent.ts`
- `src/lib/workspace/init.ts`
- `tests/lib/workflows/task-workflow-think.test.ts`
- `tests/lib/project-workspace-materialization.test.ts`
- `tests/lib/sandbox-agent-bridge.test.ts`

**Files Expected To Change**  
- `src/workflows/TaskWorkflow.ts`
- `src/keystone/agents/implementer/ImplementerAgent.ts`
- `tests/lib/workflows/task-workflow-think.test.ts`
- possibly `tests/lib/project-workspace-materialization.test.ts`
- possibly `tests/lib/sandbox-agent-bridge.test.ts`

**Validation**  
- `rtk npm run test -- tests/lib/workflows/task-workflow-think.test.ts`
- `rtk npm run test -- tests/lib/project-workspace-materialization.test.ts tests/lib/sandbox-agent-bridge.test.ts`
- success means the Think/live path no longer rejects multi-component projects because they lack a single compile target, and prompts/bridge expectations remain truthful.

**Plan / Docs To Update**  
- `Progress`
- `Execution Log`
- `Surprises & Discoveries`
- `Outcomes & Retrospective`
- this phase handoff's `Status`, `Completion Notes`, and `Next Starter Context`

**Deliverables**  
- removed artificial multi-component `think_live` rejection
- prompt wording that tells the agent how to commit when multiple component repos may change
- passing targeted Think/workspace tests

**Commit Expectation**  
`allow think live tasks to use multi-component workspaces`

**Known Constraints / Baseline Failures**  
- Keep tasks component-agnostic; do not add `componentKeys` metadata in this phase.
- Preserve the one-sandbox-per-run topology and the existing shared `/workspace/code/<component-key>` contract.
- Broad repo validation is still blocked until repo-local dependencies are installed.

**Status**  
`Completed`

**Completion Notes**  
Removed the `think_live` single-target guard, updated Think prompt wording plus implementer-system instructions to require commits in each changed component repo/worktree, and changed the multi-component Think workflow test from rejection coverage to a passing full-workspace path.

**Next Starter Context**  
Phase 3 should leave the Think path alone and focus on scripted: derive an explicit single-component cwd from the materialized workspace and fail fast for multi-component scripted runs.

## Phase 3 - Scripted Engine Hardening

### Phase Handoff

**Goal**  
Make the scripted engine explicit and safe by rejecting multi-component projects clearly and using an explicit component worktree cwd for single-component scripted runs.

**Scope Boundary**  
In scope: scripted execution preflight logic, `cwd` selection for the scripted process launch, scripted workflow tests, and any small task-session test updates required by the explicit `cwd` behavior. Out of scope: Think/live logic, compile changes, and any new project-level command configuration.

**Read First**  
- `src/workflows/TaskWorkflow.ts`
- `src/durable-objects/TaskSessionDO.ts`
- `tests/lib/workflows/task-workflow-scripted.test.ts`
- `tests/lib/task-session-do.test.ts`
- `.ultrakit/notes.md`

**Files Expected To Change**  
- `src/workflows/TaskWorkflow.ts`
- possibly `src/durable-objects/TaskSessionDO.ts`
- `tests/lib/workflows/task-workflow-scripted.test.ts`
- possibly `tests/lib/task-session-do.test.ts`

**Validation**  
- `rtk npm run test -- tests/lib/workflows/task-workflow-scripted.test.ts tests/lib/task-session-do.test.ts`
- success means:
  - single-component scripted runs still launch correctly,
  - multi-component scripted runs fail fast with a clear error,
  - no scripted path relies on shared-root `defaultCwd` fallback for multi-component projects.

**Plan / Docs To Update**  
- `Progress`
- `Execution Log`
- `Surprises & Discoveries`
- `Outcomes & Retrospective`
- this phase handoff's `Status`, `Completion Notes`, and `Next Starter Context`

**Deliverables**  
- explicit scripted single-component launch behavior
- explicit multi-component scripted rejection
- passing scripted/task-session targeted tests

**Commit Expectation**  
`make scripted tasks fail fast for multi-component projects`

**Known Constraints / Baseline Failures**  
- Do not invent project-level command selection or run `npm test` across every repo.
- Preserve the current scripted engine's role as a conservative validation seam, not a fully general multi-component executor.
- Broad validation remains blocked until dependencies are installed.

**Status**  
`Completed`

**Completion Notes**  
Added `scriptedProcessCwd` to the prepared task-session snapshot, made `runScriptedTask()` require that explicit single-component cwd, and added coverage proving multi-component scripted runs fail before `npm test` launches.

**Next Starter Context**  
Phase 4 should update the durable docs, notes, and debt tracker to the new runtime truth, then record the broad validation results precisely.

## Phase 4 - Documentation, Debt, and Closeout

### Phase Handoff

**Goal**  
Update durable docs, notes, and debt tracking to describe the new doc-only compile and multi-component execution contract truthfully, then rerun targeted and broad validation as far as the environment allows.

**Scope Boundary**  
In scope: README/developer-doc/runbook/notes/debt updates, this plan's living sections, active-index truthfulness, and closeout validation. Out of scope: new runtime behavior beyond minor doc-truth fixes discovered during documentation.

**Read First**  
- `README.md`
- `.ultrakit/developer-docs/m1-architecture.md`
- `.ultrakit/developer-docs/keystone-target-model-handoff.md`
- `.ultrakit/developer-docs/think-runtime-architecture.md`
- `.ultrakit/developer-docs/think-runtime-runbook.md`
- `.ultrakit/notes.md`
- `.ultrakit/exec-plans/tech-debt-tracker.md`
- this plan

**Files Expected To Change**  
- `README.md`
- `.ultrakit/developer-docs/m1-architecture.md`
- `.ultrakit/developer-docs/keystone-target-model-handoff.md`
- `.ultrakit/developer-docs/think-runtime-architecture.md`
- `.ultrakit/developer-docs/think-runtime-runbook.md`
- `.ultrakit/notes.md`
- `.ultrakit/exec-plans/tech-debt-tracker.md`
- this plan
- `.ultrakit/exec-plans/active/index.md` if status wording changes

**Validation**  
- `rtk npm run test -- tests/lib/compile-plan-run.test.ts tests/lib/workflows/run-workflow-compile.test.ts tests/lib/workflows/task-workflow-think.test.ts tests/lib/workflows/task-workflow-scripted.test.ts`
- `rtk npm run lint`
- `rtk npm run typecheck`
- `rtk npm run test`
- `rtk npm run build`
- success means targeted runtime tests pass, docs match the shipped behavior, and broad validation is either clean or any remaining failures are recorded precisely as environment/toolchain blockers or known unrelated issues.

**Plan / Docs To Update**  
- every living section of this plan
- relevant durable docs listed above
- debt tracker entries affected by the new runtime truth

**Deliverables**  
- updated docs and notes
- updated debt tracker truth
- recorded closeout validation evidence

**Commit Expectation**  
`document multi-component compile and execution contract`

**Known Constraints / Baseline Failures**  
- Current workspace cannot run broad validation until repo-local dependencies are installed.
- Once dependencies are installed, host-shell caveats for `wrangler dev`, broad localhost-binding tests, and `npm run build` still apply on this machine.
- Close or narrow the old compile-target debt only if the shipped runtime truth truly removes that product gap.

**Status**  
`Completed`

**Completion Notes**  
Updated `README.md`, the target-model and Think runtime docs, `.ultrakit/notes.md`, and the tech-debt tracker; reran targeted suites plus broad validation; recorded the remaining unrelated repo-wide lint, typecheck, and UI-test failures; and confirmed host-permitted `npm run build` succeeds.

**Next Starter Context**  
None. The plan is complete and ready to archive.
