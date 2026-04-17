# Keystone Think Runtime Architecture

## Scope

This document covers the shipped Think-backed execution slice in this repository. It does not describe hypothetical multi-role expansion.

## Runtime Boundary

Keystone still owns orchestration, durable session state, event publication, and artifact promotion. Think only owns the inside of one implementer turn.

- `src/http/handlers/runs.ts` accepts `X-Keystone-Agent-Runtime` and persists the resolved runtime onto the root run session metadata.
- `src/workflows/RunWorkflow.ts` and `src/workflows/TaskWorkflow.ts` carry that runtime forward, defaulting to `scripted` when the header is absent.
- `src/maestro/agent-runtime.ts` is the kernel-facing contract. It fixes the agent filesystem layout at `/workspace`, `/artifacts/in`, `/artifacts/out`, and `/keystone`.

## Filesystem Contract

`TaskSessionDO.ensureWorkspace()` materializes the task worktree and then builds an agent bridge with two layers:

- layout: the stable agent-facing roots declared in `src/maestro/agent-runtime.ts`
- targets: the real sandbox paths, with `/workspace` resolving onto the existing task worktree under `/workspace/runs/...`

The bridge also materializes three control files under `/keystone`:

- `session.json`: tenant, run, task, and sandbox identifiers
- `filesystem.json`: the effective bridge layout and writable/read-only roots
- `artifacts.json`: projected upstream artifacts available under `/artifacts/in`

Rules that matter for contributors:

- `/workspace` and `/artifacts/out` are writable
- `/artifacts/in` and `/keystone` are treated as read-only inputs
- staged files under `/artifacts/out` are not durable until `TaskWorkflow` promotes them into R2 and records `artifact_refs`
- bridge re-materialization clears `/artifacts/out` so staged files do not leak across repeated `ensureWorkspace()` calls

## Think Implementer Path

The first delivered role is `implementer`.

- `src/keystone/agents/base/KeystoneThinkAgent.ts` implements the `AgentRuntimeAdapter` contract for runtime `think`
- `src/keystone/agents/implementer/ImplementerAgent.ts` defines the implementer prompt, bridge-backed tools, mock model plan helpers, and staged-artifact collection
- the enabled capabilities are `read_file`, `list_files`, `write_file`, and `run_bash`

For local fixture validation, the Think path stays deterministic:

- `TaskWorkflow` only allows `think` for the fixture-backed `task-greeting-tone` handoff
- that path injects `createThinkSmokePlan()` as `mockModelPlan`
- when `mockModelPlan` is present, `KeystoneThinkAgent` runs `generateText(...)` directly with the existing toolset instead of entering Think's local chat queue

That local shortcut exists because the host-local Think queue crashed under `wrangler dev` for mock turns, but the runtime surface stays the same: `runImplementerTurn()` still produces events, staged artifacts, and a summary.

## Artifact and Event Flow

The Think-backed task path is file-first all the way through:

1. `KeystoneThinkAgent` emits `agent.turn.started`.
2. Tool calls emit `agent.tool_*` events and, when text is produced, `agent.message`.
3. Files discovered under `/artifacts/out` are collected as staged artifacts and emitted as `artifact.staged`.
4. `TaskWorkflow` reads those staged files back through the sandbox bridge, uploads them into R2, inserts `artifact_refs`, and publishes canonical `artifact.put` events.
5. `src/keystone/integration/finalize-run.ts` writes the final `run_summary` artifact and archives the run session when all task workflows succeed.

Current artifact expectations:

- markdown files staged by the implementer are promoted as `run_note`
- the run-level terminal proof remains `run_summary`
- the scripted fallback path still promotes `task_log`

## Current Limitations

These are current runtime facts, not future design goals:

- `scripted` remains the default runtime
- the Think path is only wired for the fixture-backed demo task
- the shipped local proof uses the deterministic mock implementer plan, not a live model provider turn
- local `wrangler dev` still requires a valid host `CLOUDFLARE_API_TOKEN` because the Worker keeps a remote `AI` binding
