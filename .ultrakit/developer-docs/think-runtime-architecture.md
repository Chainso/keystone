# Keystone Think Runtime Architecture

## Scope

This document covers the shipped Think-backed execution slice in this repository. It does not describe hypothetical multi-role expansion.

## Runtime Boundary

Keystone still owns orchestration, durable session state, event publication, and artifact promotion. Think only owns the inside of one implementer turn.

- `src/http/handlers/runs.ts` accepts `projectId`, accepts `X-Keystone-Agent-Runtime`, and persists the resolved runtime plus project identity onto the root run session metadata.
- `src/workflows/RunWorkflow.ts` and `src/workflows/TaskWorkflow.ts` carry that runtime forward, defaulting to `scripted` when the header is absent.
- `src/maestro/agent-runtime.ts` is the kernel-facing contract. It fixes the agent filesystem layout at `/workspace`, `/artifacts/in`, `/artifacts/out`, and `/keystone`.

## Filesystem Contract

`TaskSessionDO.ensureWorkspace()` materializes the task worktree and then builds an agent bridge with two layers:

- layout: the stable agent-facing roots declared in `src/maestro/agent-runtime.ts`
- targets: the real sandbox paths, with `/workspace` resolving onto the existing task workspace under `/workspace/runs/...`

For project-backed runs, the workspace code surface now lives under `/workspace/code/<component-key>`.

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

The shipped validation split is now explicit:

- `runtime=think` plus `thinkMode=mock` stays deterministic and fixture-backed
- `runtime=think` plus `thinkMode=live` starts from `/v1/runs`, reloads the stored project, compiles a live `run_plan`, persists compiled `task_handoff` artifacts, and then executes that compiled handoff through the same implementer/runtime bridge

For deterministic local fixture validation:

- `TaskWorkflow` injects `createThinkSmokePlan()` as `mockModelPlan`
- when `mockModelPlan` is present, `KeystoneThinkAgent` runs `generateText(...)` directly with the existing toolset instead of entering Think's local chat queue

That local shortcut exists because the host-local Think queue crashed under `wrangler dev` for mock turns, but the runtime surface stays the same: `runImplementerTurn()` still produces events, staged artifacts, and a summary.

For the live proof:

- `RunWorkflow` persists the live `decision_package`, `run_plan`, and `task_handoff` artifacts before task fanout
- `TaskWorkflow` accepts the compiled Think handoff only when it matches the approved fixture decision package and the compiled plan stays on the current single independent task shape
- the live task handoff must keep `dependsOn` empty; dependent or multi-task compiled plans remain out of scope for this proof
- the live compile path currently requires exactly one unambiguous executable project component; it fails clearly instead of choosing a compile target by component order

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
- the live full-workflow Think proof archives `decision_package`, `run_plan`, `task_handoff`, `run_note`, and `run_summary`

The live-model provider path now reuses the existing local OpenAI-compatible chat-completions backend:

- `KeystoneThinkAgent` builds an AI SDK OpenAI chat model against `KEYSTONE_CHAT_COMPLETIONS_BASE_URL`
- the configured `KEYSTONE_CHAT_COMPLETIONS_MODEL` is the default Think model id unless a turn overrides it explicitly
- local Think validation no longer depends on a Cloudflare `AI` binding

## Current Limitations

These are current runtime facts, not future design goals:

- `scripted` remains the default runtime
- `runtime=think` plus `thinkMode=mock` remains the deterministic validation default
- `runtime=think` plus `thinkMode=live` now proves live compile plus compiled Think task execution on the approved fixture path
- the live proof stays fixture-scoped to the stored fixture project and committed decision package; arbitrary repo ingestion is not part of this contract
- the compiled Think proof is still limited to the approved single independent task shape and rejects non-empty `dependsOn`
