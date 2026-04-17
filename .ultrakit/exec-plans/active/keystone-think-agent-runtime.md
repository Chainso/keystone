# Keystone Think Agent Runtime

## Purpose / Big Picture

This plan introduces a Think-backed runtime for Keystone agent turns without changing Keystone’s control-plane ownership. After this plan is complete, Keystone should be able to run at least one real Think-backed implementer turn against the existing sandboxed task workspace, using basic file and bash tooling against the real filesystem shape (`/workspace`, `/artifacts/in`, `/artifacts/out`, `/keystone`), while Workflows still orchestrate the run and R2/Postgres remain the canonical artifact and operational stores.

The observable outcome is not “Think is installed.” The observable outcome is that Keystone can start a task attempt using a Think-backed harness, the agent can read and modify files in the real sandbox worktree, staged outputs are promoted into R2-backed artifacts, the event log shows the turn lifecycle, and the existing M1 scripted path remains available until the Think path is proven.

This plan is a successor to [keystone-m1-cloudflare-foundation](./keystone-m1-cloudflare-foundation.md). M1 is now archived, so this plan can move into execution without reopening milestone 1 scope.

## Backward Compatibility

Backward compatibility with an external shipped product is not required because Keystone is still in the prototype phase. Compatibility is still required with the current repository runtime and milestone proof:

- Preserve the file-first architecture and product vocabulary already recorded in `product-specs/platform-vs-vertical.md`, `product-specs/keystone-relaxed-design.md`, `product-specs/keystone-on-cloudflare.md`, and `product-specs/keystone-m1.md`.
- Preserve Keystone ownership of orchestration, approvals, artifact promotion, workspace bindings, and durable run state.
- Keep the current non-Think task execution path available as the default or explicit fallback until the Think-backed path is validated end to end.
- Preserve the M1 demo flow, run API, and artifact model unless the plan explicitly updates them with compatible replacements.
- Do not make Think session storage canonical workflow truth. Canonical truth must remain in repo files, R2 artifacts, Postgres operational records, and Workflow/event history.

## Design Decisions

1. **Date:** 2026-04-16  
   **Decision:** Queue this plan behind `keystone-m1-cloudflare-foundation` instead of reopening M1 scope.  
   **Rationale:** The active M1 plan is already in closeout phases. Adding Think implementation work there would blur milestone acceptance and delay archive.  
   **Alternatives considered:** Reordering the remaining M1 phases to add Think first; editing the active M1 plan to include implementation phases for Think.

2. **Date:** 2026-04-16  
   **Decision:** Use Think as the preferred harness for agent turns, but keep the kernel harness-agnostic and keep orchestration in Keystone Workflows.  
   **Rationale:** Think gives persistent turn history, tool orchestration, and recovery, but the platform/vertical split only stays clean if Think remains a harness adapter rather than a new control plane.  
   **Alternatives considered:** Continue toward a fully custom chat/tool loop; let Think own orchestration or approval state.

3. **Date:** 2026-04-16  
   **Decision:** Preserve a filesystem-first agent environment and avoid a bespoke artifact-only RPC tool surface for the first Think slice.  
   **Rationale:** The updated product specs already commit to a real sandbox filesystem plus projected artifact directories. Basic `read`, `write`, `edit`, `grep`, and `bash` tooling against that environment is the main reason to adopt Think here.  
   **Alternatives considered:** Restrict the first Think integration to custom artifact read/write tools only; keep the agent out of the real workspace and rely on application-level wrappers for every operation.

4. **Date:** 2026-04-16  
   **Decision:** Standardize the sandbox projection contract as `/workspace`, `/artifacts/in`, `/artifacts/out`, and `/keystone`.  
   **Rationale:** The agent needs a stable, file-rich environment that mirrors how the product specs now describe artifact exposure. A fixed layout also simplifies prompts, docs, smoke tests, and future role reuse.  
   **Alternatives considered:** Ad hoc per-role filesystem layouts; keeping artifacts purely remote and not projecting them into the sandbox.

5. **Date:** 2026-04-16  
   **Decision:** Do not introduce a Keystone-specific “tool budget” abstraction in this slice. Bound execution through the workflow attempt lifecycle, policy enforcement, and runtime selection instead.  
   **Rationale:** A separate tool-budget concept adds product semantics that the user does not want. The right product boundary is still: Workflows decide when turns begin and end; Think owns the inner loop of a turn.  
   **Alternatives considered:** Add a first-class tool-budget field to task contracts or workflow inputs.

6. **Date:** 2026-04-16  
   **Decision:** The first delivered role will be a Think-backed `ImplementerAgent`, integrated through a runtime selector so the existing scripted task path remains available.  
   **Rationale:** The main value of Think here is a coding agent operating with basic file and bash tooling. An implementer role exercises that directly. A runtime selector preserves regression safety while the new path is validated.  
   **Alternatives considered:** Start with a reviewer-only role; replace the current task path outright with Think on the first pass.

7. **Date:** 2026-04-16  
   **Decision:** Keep sub-agent RPC and specialized Think extension loading out of scope for the first plan.  
   **Rationale:** The current product model does not need those features to prove the harness integration. They expand surface area without changing the core question of “can a Think-backed agent drive the existing sandbox/artifact model?”  
   **Alternatives considered:** Model planner/reviewer/tester roles with Think sub-agents in the first slice.

## Execution Log

- **Date:** 2026-04-16  
  **Phase:** Planning  
  **Decision:** Create this as a queued successor plan under `.ultrakit/exec-plans/active/` while M1 is still active.  
  **Rationale:** The user explicitly asked for a new plan now, but the active M1 plan remains the current execution source of truth.

- **Date:** 2026-04-16  
  **Phase:** Planning  
  **Decision:** Tie the first Think integration to the existing `TaskSessionDO` and workspace/artifact layers instead of inventing a parallel execution substrate.  
  **Rationale:** The current repo already has the right sandbox/worktree/artifact seams. The new plan should exploit them, not bypass them.

- **Date:** 2026-04-17  
  **Phase:** Planning  
  **Decision:** Transition this plan from queued successor status to active execution now that M1 is archived.  
  **Rationale:** The blocking milestone has completed, so the Think runtime work can start without changing the plan's scope or acceptance criteria.

- **Date:** 2026-04-16  
  **Phase:** Phase 1  
  **Decision:** Add a dedicated `KeystoneThinkAgent` Durable Object export and Wrangler binding, but keep the existing Hono app as the fetch entry point for now.  
  **Rationale:** Phase 1 needs a real Think-backed harness seam and valid Worker bindings without changing current HTTP routing or task execution behavior.

- **Date:** 2026-04-16  
  **Phase:** Phase 1  
  **Decision:** Define the kernel-facing harness boundary in `src/maestro/agent-runtime.ts` with standardized filesystem roots and turn/result contracts, and narrow `RuntimeProfile.runtime` to `scripted | think`.  
  **Rationale:** Later phases need a stable harness-agnostic contract for runtime selection, filesystem projection, and artifact/event mapping before real agent turns are wired in.

- **Date:** 2026-04-17  
  **Phase:** Phase 2  
  **Decision:** Keep the real git worktree at `/workspace/runs/...` and layer an agent-facing bridge over it rather than relocating the existing worktree layout.  
  **Rationale:** The current task/session path and workspace binding model already depend on deterministic internal worktree paths. A bridge preserves that behavior while still giving Think-backed tools a stable `/workspace`, `/artifacts/in`, `/artifacts/out`, and `/keystone` contract.

- **Date:** 2026-04-17  
  **Phase:** Phase 2  
  **Decision:** Project prior run artifacts into `/artifacts/in`, stage outputs only under `/artifacts/out`, and materialize bridge metadata as JSON control files under `/keystone`.  
  **Rationale:** This matches the relaxed design spec, keeps R2 and `artifact_refs` canonical, and gives later Think roles concrete control files and projected inputs without silently promoting staged outputs.

## Progress

- [x] 2026-04-16 Successor plan created and registered while `keystone-m1-cloudflare-foundation` remained active.
- [x] 2026-04-17 `keystone-m1-cloudflare-foundation` archived; Think plan is now unblocked and eligible to start.
- [x] 2026-04-16 Phase 1 completed: Think dependencies, bindings, generated types, runtime contract scaffolding, and a base `KeystoneThinkAgent` landed cleanly.
- [x] 2026-04-17 Phase 2 completed: `TaskSessionDO` now projects prior run artifacts into `/artifacts/in`, stages writable outputs under `/artifacts/out`, materializes `/keystone/*.json` control files, and exposes reusable filesystem/bash bridge helpers plus smoke coverage.
- [ ] Phase 3: Build the Think-backed `ImplementerAgent` and event/artifact mapping.
- [ ] Phase 4: Integrate the Think runtime into `TaskWorkflow` behind a runtime selector and prove one fixture-backed task.
- [ ] Phase 5: Update developer docs, runbooks, and archive the plan when acceptance is met.

## Surprises & Discoveries

- **2026-04-16:** The product specs already describe mounted or projected artifact access inside the sandbox, so the best Think integration path is more filesystem-first than initially assumed in discussion.
- **2026-04-16:** The repository already has strong seams for the new runtime: `TaskSessionDO`, workspace materialization under `/workspace/runs/...`, artifact promotion helpers, event publication, and workflow-driven task attempts.
- **2026-04-16:** Local Worker development on this host must still run outside the Codex sandbox boundary. Any live Think/Agents SDK validation that depends on `wrangler dev` inherits that same host constraint from M1.
- **2026-04-16:** Think currently requires both the Worker `experimental` compatibility flag and an `AI` binding in `wrangler.jsonc` even when the first scaffolded agent is not yet handling live traffic.
- **2026-04-16:** `wrangler types` and `wrangler deploy --dry-run` both attempt writes under `~/.config/.wrangler`, and the dry-run container build also touches Docker state under `~/.docker`, so build validation must run outside the Codex sandbox boundary.
- **2026-04-17:** The cleanest way to honor the `/workspace` contract without disturbing M1’s deterministic worktree layout is to treat `/workspace` as a virtual root in the bridge and resolve it onto the real task worktree path under `/workspace/runs/...`.
- **2026-04-17:** Durable Object stub inference for `TaskSessionDO` still collapsed to `never` in some callers until the DO methods had explicit public RPC return types, so the Phase 2 validation needed those signatures tightened.
- **2026-04-17:** A meaningful Phase 2 smoke path does not need live `wrangler dev`; an in-process contract smoke over the bridge helpers is enough to prove projection, staged outputs, and command path rewriting while avoiding host-only local Worker constraints.

## Outcomes & Retrospective

Planning outcome on 2026-04-16:

- The Think integration work is now captured in a separate successor plan instead of being mixed into M1 closeout.
- The plan resolves the high-level boundary question: Think is a harness runtime for agent turns, not a new source of workflow truth.
- Phase 1 is now complete: the repo has current Think/Agents dependencies, a bindable `KeystoneThinkAgent`, generated Worker types, and a harness contract module that later phases can build on without re-deciding the boundary.
- The next contributor should begin with Phase 2 and keep the existing task path unchanged until the filesystem bridge and runtime selector are ready.

## Context and Orientation

Current repository state relevant to this plan:

- The active M1 plan is `.ultrakit/exec-plans/active/keystone-m1-cloudflare-foundation.md`. It already proves the core Cloudflare architecture: Workers, Durable Objects, Workflows, Sandboxes, R2 artifacts, Hyperdrive-backed Postgres, and a fixture-backed end-to-end run.
- The runtime currently executes tasks through `src/workflows/TaskWorkflow.ts`, `src/durable-objects/TaskSessionDO.ts`, `src/lib/sandbox/client.ts`, `src/lib/sandbox/processes.ts`, and the workspace helpers in `src/lib/workspace/`.
- Workspace paths are already deterministic under `/workspace/runs/...` via `src/lib/workspace/worktree.ts`, with repo and task worktree layout established by `src/lib/workspace/init.ts`.
- Artifact promotion currently happens through `src/lib/artifacts/r2.ts`, `src/lib/artifacts/keys.ts`, `src/lib/db/artifacts.ts`, and `src/lib/events/publish.ts`.
- The current task path is not an agent harness. It is a workflow-driven sandbox process loop with artifactization and event logging.
- `package.json` now includes `agents`, `@cloudflare/think`, `@cloudflare/ai-chat`, `ai`, `@cloudflare/shell`, and `workers-ai-provider`.
- `wrangler.jsonc` now enables the `experimental` compatibility flag, binds `AI`, and registers the `KEYSTONE_THINK_AGENT` Durable Object plus a `v3` migration while preserving the existing M1 runtime path.
- `src/maestro/agent-runtime.ts` now defines the shared runtime contract and the standardized filesystem roots for later Think phases.
- `src/keystone/agents/base/KeystoneThinkAgent.ts` is a bindable Think scaffold only; it is not yet routed into `TaskWorkflow` or the Hono app.

Relevant source documents and current runtime files:

- `product-specs/platform-vs-vertical.md`
- `product-specs/keystone-relaxed-design.md`
- `product-specs/keystone-on-cloudflare.md`
- `product-specs/keystone-m1.md`
- `.ultrakit/exec-plans/active/keystone-m1-cloudflare-foundation.md`
- `package.json`
- `wrangler.jsonc`
- `src/index.ts`
- `src/env.d.ts`
- `src/maestro/contracts.ts`
- `src/maestro/session.ts`
- `src/durable-objects/TaskSessionDO.ts`
- `src/workflows/TaskWorkflow.ts`
- `src/lib/workspace/init.ts`
- `src/lib/workspace/worktree.ts`
- `src/lib/artifacts/r2.ts`
- `src/lib/db/artifacts.ts`
- `src/lib/events/types.ts`
- `src/lib/events/publish.ts`

Planned runtime direction:

- Think-backed agents will run against the existing sandboxed task workspace rather than a separate virtual workspace.
- The projected filesystem contract is `/workspace`, `/artifacts/in`, `/artifacts/out`, and `/keystone`.
- Workflows remain the orchestrator, R2 remains the artifact truth, and Postgres remains the operational index.
- The first slice is a Think-backed `ImplementerAgent` invoked through a runtime selector so the current path remains available.

## Plan of Work

The work starts by making Think a valid runtime dependency in this Worker project and by defining the runtime contract so the rest of Keystone does not depend directly on Think APIs. Once the harness boundary exists, the next priority is to make the existing sandbox filesystem present the right view to a Think-backed agent: real worktree, projected inputs, staged outputs, and control files. Only after those filesystem and tool bridges are real should the plan add a first agent role and integrate it into `TaskWorkflow`.

The execution sequence is intentionally conservative:

1. wire in Think and the kernel-facing runtime abstractions without changing task behavior,
2. expose the sandbox filesystem and artifact projection shape the agent needs,
3. build one Think-backed implementer role and map its lifecycle into Keystone events/artifacts,
4. integrate that role into `TaskWorkflow` behind a runtime selector so the current path remains the fallback, and
5. document the architecture and prove the Think-backed path with the fixture workflow.

This keeps each phase small enough for a single contributor while maintaining a clear rollback story if the first Think slice underperforms.

## Concrete Steps

The commands below are the intended execution spine once this plan starts. Update them if scripts or paths differ after implementation, but preserve the same proof shape.

1. Install and register the new runtime dependencies:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm install agents @cloudflare/think @cloudflare/ai-chat ai @cloudflare/shell workers-ai-provider
npm run cf-typegen
```

Expected result: `package.json`, `package-lock.json`, generated Worker bindings, and Wrangler config all describe the new Think/Agents runtime dependencies cleanly.

2. Validate the baseline after runtime wiring:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected result: the current non-Think runtime still builds and tests cleanly after the dependency and binding changes.

3. Validate sandbox projection and basic filesystem/bash bridging:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm run sandbox:smoke
```

Expected result: the sandbox still materializes a workspace correctly and the new projection contract for `/artifacts/in`, `/artifacts/out`, and `/keystone` can be exercised by tests or a smoke path.

4. Validate the first Think-backed agent turn:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm run think:smoke
```

Expected result: a Think-backed implementer turn can read and write files in the real sandbox worktree, run at least one bash command, stage outputs under `/artifacts/out`, and emit corresponding Keystone events.

5. Validate the workflow-integrated path:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
KEYSTONE_AGENT_RUNTIME=think npm run demo:run
KEYSTONE_AGENT_RUNTIME=think npm run demo:validate
```

Expected result: the fixture-backed run completes with the Think-backed path enabled for at least one task, and the resulting run summary shows the expected artifacts and event trace.

## Validation and Acceptance

Baseline state before this plan starts:

- `package.json` and `wrangler.jsonc` do not include Think/Agents SDK runtime dependencies or bindings.
- `TaskWorkflow` does not invoke a Think-backed role.
- The current task path is the scripted sandbox/process path proven by M1.

This plan is accepted only when all of the following are true:

1. `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass after the Think runtime is added.
2. The repo contains a kernel-facing runtime adapter or equivalent boundary that allows Keystone to call a Think-backed harness without letting Think define product semantics.
3. The sandbox presents the standardized filesystem contract: `/workspace`, `/artifacts/in`, `/artifacts/out`, and `/keystone`.
4. The Think-backed implementer role can use basic file and bash tooling against the real sandbox worktree.
5. Agent outputs are staged as files and then promoted into R2-backed artifacts with `artifact_refs` recorded in Postgres.
6. The append-only event log captures the important agent lifecycle events and tool interactions for the Think-backed path.
7. `TaskWorkflow` can invoke the Think-backed path behind a runtime selector or equivalent guard without breaking the existing fallback path.
8. A fixture-backed demo run succeeds with the Think path enabled for at least one task.
9. The non-Think path remains available until the Think-backed path is explicitly made the default in a later decision.
10. Developer docs and runbooks describe the Think-backed runtime and its filesystem/artifact contract accurately.

Known pre-execution baseline gaps:

- No Think dependencies are installed yet.
- No Agent/Think Durable Object bindings or migrations exist yet.
- No runtime selector exists in the task execution path.
- No `think:smoke` proof command exists yet.

These are planned gaps, not regressions.

## Idempotence and Recovery

- Dependency installation and code generation commands should be safe to rerun.
- Wrangler migrations for new Agent/Think Durable Object classes must be append-only; never edit old migration tags.
- The runtime selector should preserve the current path so a failed Think experiment can be disabled without reverting unrelated M1 behavior.
- Artifact projection into `/artifacts/in` and `/artifacts/out` must be deterministic and safe to re-materialize on retries.
- Promotion from `/artifacts/out` into R2 must be explicit and idempotent so a retried attempt does not silently duplicate outputs.
- If execution stops mid-phase, update `Progress`, `Execution Log`, and the current phase’s `Phase Handoff` before handing off.
- Live validation that depends on `wrangler dev` must respect the host note from `.ultrakit/notes.md`: local Worker dev on this host must run outside the Codex sandbox boundary.

## Artifacts and Notes

Initial source material for this plan:

- `.ultrakit/exec-plans/active/keystone-m1-cloudflare-foundation.md`
- `product-specs/platform-vs-vertical.md`
- `product-specs/keystone-relaxed-design.md`
- `product-specs/keystone-on-cloudflare.md`
- `product-specs/keystone-m1.md`

Current runtime seams to preserve:

- `src/workflows/TaskWorkflow.ts`
- `src/durable-objects/TaskSessionDO.ts`
- `src/lib/workspace/init.ts`
- `src/lib/workspace/worktree.ts`
- `src/lib/artifacts/r2.ts`
- `src/lib/db/artifacts.ts`
- `src/lib/events/publish.ts`

Project-specific constraints from `.ultrakit/notes.md`:

- Local `wrangler dev` on this host must run outside the Codex sandbox boundary.
- The local chat-completions backend is plain HTTP at `http://localhost:4001`.
- The fixture happy path depends on `npm test` succeeding inside the sandboxed task worktree.

Phase 2 implementation notes:

- `TaskSessionDO.ensureWorkspace()` now loads prior run artifacts from `artifact_refs`, fetches R2-backed bodies, and projects them into `/artifacts/in` while excluding the current session to avoid making staged outputs implicitly canonical.
- The bridge contract lives in `MaterializedWorkspace.agentBridge`: virtual roots match `src/maestro/agent-runtime.ts`, while `/workspace` resolves to the real task worktree path and the other roots stay literal.
- `/keystone/session.json`, `/keystone/filesystem.json`, and `/keystone/artifacts.json` are now the durable control-file contract for later Think roles.
- `src/keystone/agents/tools/filesystem.ts` and `src/keystone/agents/tools/bash.ts` provide the reusable bridge helpers for later Think-backed tools.
- `scripts/sandbox-smoke.ts` now validates the bridge contract directly instead of depending on a live local Worker.

## Interfaces and Dependencies

Expected external dependencies to add or evaluate in this plan:

- `agents`
- `@cloudflare/think`
- `@cloudflare/ai-chat`
- `ai`
- `@cloudflare/shell`
- `workers-ai-provider`

Important modules and interfaces likely involved:

- `package.json`
- `wrangler.jsonc`
- `src/index.ts`
- `src/env.d.ts`
- `src/maestro/contracts.ts`
- `src/maestro/session.ts`
- `src/workflows/TaskWorkflow.ts`
- `src/durable-objects/TaskSessionDO.ts`
- `src/lib/workspace/init.ts`
- `src/lib/workspace/worktree.ts`
- `src/lib/events/types.ts`
- `src/lib/events/publish.ts`
- `src/lib/artifacts/r2.ts`
- `src/lib/db/artifacts.ts`

New modules that should likely exist by the end of execution:

- `src/maestro/agent-runtime.ts` or equivalent runtime boundary
- `src/keystone/agents/base/KeystoneThinkAgent.ts`
- `src/keystone/agents/implementer/ImplementerAgent.ts`
- `src/keystone/agents/tools/` for filesystem/bash bridge helpers
- `tests/lib/agents/**` and/or `tests/http/**` coverage for the Think-backed path

The architectural rule to preserve throughout execution is simple: Think may own the inside of a turn, but Keystone still owns what is true.

### Phase 1: Add Think dependencies, bindings, and the harness/runtime contract

Create the minimum project-level runtime skeleton for Think without changing task execution behavior yet. The goal is to make Think a valid dependency and define a kernel-facing runtime contract that future phases can use.

#### Phase Handoff

**Goal**  
Add Think/Agents SDK dependencies, Worker bindings/migrations, and a kernel-facing runtime contract or equivalent harness adapter seam.

**Scope Boundary**  
In scope: dependency installation, `wrangler.jsonc` and binding updates, generated type updates, runtime interface definition, base harness scaffolding, and tests that prove the project still builds.  
Out of scope: sandbox artifact projection, real agent roles, workflow integration.

**Read First**  
`package.json`  
`wrangler.jsonc`  
`src/index.ts`  
`src/env.d.ts`  
`src/maestro/contracts.ts`  
`product-specs/platform-vs-vertical.md`  
`product-specs/keystone-relaxed-design.md`

**Files Expected To Change**  
`package.json`  
`package-lock.json`  
`wrangler.jsonc`  
`worker-configuration.d.ts`  
`src/env.d.ts`  
`src/index.ts`  
`src/maestro/contracts.ts`  
`src/maestro/agent-runtime.ts`  
`src/keystone/agents/base/KeystoneThinkAgent.ts`  
`tests/lib/agents/runtime-contract.test.ts`

**Validation**  
Run from repo root:

```bash
npm install
npm run cf-typegen
npm run lint
npm run typecheck
npm run test
npm run build
```

Success means the project compiles and tests cleanly with the new dependencies and config in place, while the existing M1 runtime remains unchanged.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and this phase handoff.

**Deliverables**  
Installed Think/Agents dependencies, bindings/migrations, typed env updates, and a kernel-facing runtime boundary for future phases.

**Commit Expectation**  
`Add Think runtime scaffolding and bindings`

**Known Constraints / Baseline Failures**  
Think is experimental and its docs currently require additional flags and DO migrations. Local Worker validation on this host must still run outside the Codex sandbox boundary.

**Status**  
Completed on 2026-04-16.

**Completion Notes**  
- Installed `agents`, `@cloudflare/think`, `@cloudflare/ai-chat`, `ai`, `@cloudflare/shell`, and `workers-ai-provider`.
- Added the `experimental` compatibility flag, `AI` binding, `KEYSTONE_THINK_AGENT` Durable Object binding, and `v3` migration in `wrangler.jsonc`.
- Generated updated Worker bindings in `worker-configuration.d.ts`.
- Added `src/maestro/agent-runtime.ts`, narrowed `RuntimeProfile.runtime`, exported `KeystoneThinkAgent`, and added contract coverage in `tests/lib/agents/runtime-contract.test.ts`.
- Validation passed with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` (the dry-run build required host execution outside the sandbox because Wrangler and Docker write to home-directory state).

**Next Starter Context**  
Phase 2 should build directly on `src/maestro/agent-runtime.ts` and the filesystem roots it defines. Keep the current Hono fetch entry point and `TaskWorkflow` path unchanged while you add `/artifacts/in`, `/artifacts/out`, and `/keystone` projection inside the sandbox.

### Phase 2: Project artifacts into the sandbox and expose the filesystem/bash bridge

Extend the existing sandbox/workspace path so a Think-backed agent can see the right filesystem shape: real worktree plus projected artifact inputs and staged outputs.

#### Phase Handoff

**Goal**  
Expose `/workspace`, `/artifacts/in`, `/artifacts/out`, and `/keystone` inside the sandbox and provide bridge helpers that Think-backed tools can call.

**Scope Boundary**  
In scope: artifact projection, output staging, control-file materialization, filesystem/bash bridge helpers, and smoke/test coverage.  
Out of scope: Think role implementation, workflow integration, default runtime switching.

**Read First**  
`src/durable-objects/TaskSessionDO.ts`  
`src/lib/workspace/init.ts`  
`src/lib/workspace/worktree.ts`  
`src/lib/artifacts/r2.ts`  
`src/lib/db/artifacts.ts`  
`product-specs/keystone-relaxed-design.md`  
`product-specs/keystone-on-cloudflare.md`

**Files Expected To Change**  
`src/durable-objects/TaskSessionDO.ts`  
`src/lib/workspace/init.ts`  
`src/lib/workspace/worktree.ts`  
`src/lib/artifacts/r2.ts`  
`src/lib/db/artifacts.ts`  
`src/keystone/agents/tools/filesystem.ts`  
`src/keystone/agents/tools/bash.ts`  
`tests/lib/sandbox-agent-bridge.test.ts`  
`scripts/sandbox-smoke.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run sandbox:smoke
```

Success means the sandbox can materialize the standardized directory contract and the new bridge helpers can exercise real filesystem and bash operations safely.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, `Artifacts and Notes`, and this phase handoff.

**Deliverables**  
Standardized sandbox directory layout and reusable bridge helpers for filesystem/bash style tools.

**Commit Expectation**  
`Project artifacts and filesystem bridge into sandbox`

**Known Constraints / Baseline Failures**  
Artifact projection must not silently make staged outputs canonical. Promotion to R2 remains explicit and belongs to later phases or explicit promotion helpers.

**Status**  
Completed on 2026-04-17.

**Completion Notes**  
- Added an agent bridge descriptor to `MaterializedWorkspace` so later phases can resolve the shared filesystem contract without re-declaring roots.
- `TaskSessionDO` now projects prior run artifacts from R2 into `/artifacts/in`, writes `/keystone` control files, and records bridge metadata in the workspace binding payload.
- Added reusable filesystem and bash bridge helpers that resolve virtual agent paths onto the real sandbox targets and enforce read-only vs writable roots at the helper layer.
- Added bridge-focused coverage in `tests/lib/sandbox-agent-bridge.test.ts` and replaced the old live-worker smoke with an in-process bridge smoke in `scripts/sandbox-smoke.ts`.
- Validation passed with `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm run sandbox:smoke`.

**Next Starter Context**  
Phase 3 should consume `MaterializedWorkspace.agentBridge` and the new filesystem/bash helpers instead of reaching straight into raw sandbox paths. Keep staged output promotion explicit: `/artifacts/out` remains a writable staging area until Phase 4 or a dedicated promotion helper turns those files into canonical R2 artifacts.

### Phase 3: Build the Think-backed ImplementerAgent and event/artifact mapping

Create the first real Think-backed role on top of the filesystem/bash bridge and make its lifecycle visible in Keystone’s existing event and artifact systems.

#### Phase Handoff

**Goal**  
Implement a Think-backed `ImplementerAgent` that can operate against the sandbox worktree and stage outputs for promotion.

**Scope Boundary**  
In scope: role prompt/control file handling, tool wiring to the sandbox bridge, event mapping, staged output handling, and a dedicated Think smoke path.  
Out of scope: workflow integration, default runtime switching, additional roles.

**Read First**  
Phase 1 and Phase 2 outputs  
`src/lib/events/types.ts`  
`src/lib/events/publish.ts`  
`src/maestro/session.ts`  
`product-specs/platform-vs-vertical.md`

**Files Expected To Change**  
`src/keystone/agents/base/KeystoneThinkAgent.ts`  
`src/keystone/agents/implementer/ImplementerAgent.ts`  
`src/lib/events/types.ts`  
`src/lib/events/publish.ts`  
`src/maestro/session.ts`  
`src/http/router.ts`  
`src/http/handlers/dev-think.ts`  
`scripts/think-smoke.ts`  
`tests/lib/agents/implementer-agent.test.ts`  
`tests/http/app.test.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run think:smoke
```

Success means a Think-backed agent turn can run against a real sandbox workspace, use file and bash tools, emit event records, and stage outputs under `/artifacts/out`.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, `Artifacts and Notes`, and this phase handoff.

**Deliverables**  
A working Think-backed implementer role plus a smoke path and event/artifact mapping.

**Commit Expectation**  
`Add Think-backed implementer agent`

**Known Constraints / Baseline Failures**  
Do not introduce sub-agent RPC or custom artifact-only tools in this phase. The point is to prove the filesystem-first harness path.

**Status**  
Ready to start.

**Completion Notes**  
Not started.

**Next Starter Context**  
Keep Think session state conversational only. Output files and promoted artifacts remain the durable handoff surface.

### Phase 4: Integrate the Think runtime into TaskWorkflow behind a runtime selector

Integrate the new role into the existing task execution path carefully so the current M1 path remains available and the Think path can be proven on the fixture workflow.

#### Phase Handoff

**Goal**  
Allow `TaskWorkflow` to invoke the Think-backed implementer path behind a runtime selector and prove it on at least one fixture-backed task.

**Scope Boundary**  
In scope: workflow integration, runtime selection, fixture/demo wiring, artifact promotion from staged outputs, and end-to-end validation.  
Out of scope: making Think the unconditional default, removing the current scripted path, adding more roles.

**Read First**  
`src/workflows/TaskWorkflow.ts`  
`src/workflows/RunWorkflow.ts`  
`src/keystone/compile/plan-run.ts`  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`  
Phase 3 outputs

**Files Expected To Change**  
`src/workflows/TaskWorkflow.ts`  
`src/workflows/RunWorkflow.ts`  
`src/lib/workflows/idempotency.ts`  
`src/lib/artifacts/r2.ts`  
`src/lib/db/artifacts.ts`  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`  
`package.json`  
`tests/http/app.test.ts`  
`tests/lib/workflow-ids.test.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
KEYSTONE_AGENT_RUNTIME=think npm run demo:run
KEYSTONE_AGENT_RUNTIME=think npm run demo:validate
```

Success means the fixture run completes with the Think path enabled for at least one task, artifacts are promoted into R2-backed refs, and the current non-Think path remains available.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and this phase handoff.

**Deliverables**  
Workflow integration of the Think-backed implementer path with an explicit runtime selector and end-to-end proof.

**Commit Expectation**  
`Integrate Think runtime into task workflow`

**Known Constraints / Baseline Failures**  
Live validation still depends on local Worker development working outside the Codex sandbox boundary on this host.

**Status**  
Queued until Phase 3 completes.

**Completion Notes**  
Not started.

**Next Starter Context**  
Do not remove the existing scripted path in this phase even if the Think path looks healthy. Default switching is a later decision.

### Phase 5: Document the Think-backed runtime and close out the plan

Document the new runtime contract, filesystem projection shape, runtime selector behavior, and validation flow so future contributors can use or extend the Think path without chat history.

#### Phase Handoff

**Goal**  
Leave behind durable architecture and runbook docs for the Think-backed runtime and archive the plan cleanly when acceptance is met.

**Scope Boundary**  
In scope: developer docs, README/runbook updates, `.ultrakit/notes.md`, plan finalization, and any product-spec touchups required to match shipped behavior.  
Out of scope: adding more agent roles or redesigning the control plane.

**Read First**  
This plan in its latest state  
`.ultrakit/developer-docs/README.md`  
`product-specs/platform-vs-vertical.md`  
`product-specs/keystone-relaxed-design.md`  
`product-specs/keystone-on-cloudflare.md`  
`product-specs/keystone-m1.md`  
Phase 4 validation outputs

**Files Expected To Change**  
`.ultrakit/developer-docs/**`  
`.ultrakit/notes.md`  
`README.md`  
This plan file

**Validation**  
Run from repo root:

```bash
KEYSTONE_AGENT_RUNTIME=think npm run demo:run
KEYSTONE_AGENT_RUNTIME=think npm run demo:validate
```

Then verify that the docs explain the same commands and outcomes that just passed.

**Plan / Docs To Update**  
Update every living section of this plan, `.ultrakit/notes.md`, and any docs changed during the phase.

**Deliverables**  
Accurate architecture/runbook docs and an archived plan when acceptance is met.

**Commit Expectation**  
`Document Think-backed Keystone runtime`

**Known Constraints / Baseline Failures**  
Do not archive the plan if the documented Think-backed path has not been rerun exactly as written.

**Status**  
Queued until Phase 4 completes.

**Completion Notes**  
Not started.

**Next Starter Context**  
The docs must describe what the runtime actually does, not what Think could do in theory.
