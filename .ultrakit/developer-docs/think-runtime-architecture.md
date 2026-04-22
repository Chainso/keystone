# Keystone Think Runtime Architecture

## Scope

This document covers the current Think-backed execution slice in Keystone.

It describes:

- how `think_mock` and `think_live` fit into the target model
- how task workspaces are exposed to Think agents
- where conversation history lives
- which parts of execution remain authoritative in Keystone itself

## Runtime Boundary

Keystone owns:

- run orchestration
- compile
- task graph persistence
- sandbox lifecycle
- artifact promotion into R2 plus `artifact_refs`
- authoritative run/task state in Postgres

Think owns:

- the conversation and tool-call history for a specific planning or task conversation
- the inside of one implementer turn

Keystone does **not** use Think history as the authoritative source of run or task state.

## Execution Engines

The only authoritative execution selector is `executionEngine`:

- `scripted`
- `think_mock`
- `think_live`

When project-backed run creation omits `executionEngine`, the API/runtime default resolves to `think_live`.

`think_mock` is the deterministic fixture-scoped Think-backed validation path.

`think_live` is the live-model Think-backed path against the configured local OpenAI-compatible chat-completions backend. It now accepts any compiled handoff that resolves exactly one compile repo before `TaskWorkflow`.

## Scheduler Contract

`RunWorkflow` remains authoritative for DAG progression after compile.

Current scheduler behavior:

- every scheduler poll promotes newly satisfied dependencies from `pending` to `ready` with guarded `ifStatusIn: ["pending"]` writes
- dependency-failure cancellation also uses guarded `pending`-only writes
- each poll fans out the union of currently `active` and currently `ready` tasks
- newly ready tasks can launch while unrelated branches remain active in the shared run sandbox

## Filesystem Contract

`TaskSessionDO.ensureWorkspace()` materializes task-specific worktrees inside the shared run sandbox and exposes a stable agent-facing layout:

- `/workspace`
- `/artifacts/in`
- `/artifacts/out`
- `/keystone`

Important rules:

- one sandbox exists per run
- task isolation comes from task-specific worktrees, not separate sandboxes
- `/workspace` and `/artifacts/out` are writable
- `/artifacts/in` and `/keystone` are read-only inputs
- staged files under `/artifacts/out` are not durable until `TaskWorkflow` promotes them into R2 and records `artifact_refs`
- task rematerialization excludes the current task's own prior artifacts from `/artifacts/in`

`TaskSessionDO` is internal execution plumbing, not a product-level return to session-centric state.

## Think Implementer Path

The current Think-backed task role is `implementer`.

- `src/keystone/agents/base/KeystoneThinkAgent.ts` implements the Think-backed adapter
- `src/keystone/agents/implementer/ImplementerAgent.ts` defines the implementer prompt and bridge-backed tools
- the main capabilities are filesystem reads/writes and shell execution against the task worktree
- the current implementer prompt expects the agent to commit workspace changes in the task worktree before staging its handoff note

`TaskWorkflow` is responsible for:

- resolving the task handoff from the compiled plan
- materializing the task workspace
- invoking the Think implementer turn
- promoting staged artifacts into R2
- writing authoritative `run_tasks.status`

## Conversation Model

Think conversation history stays in Think / Session storage.

Keystone only persists the conversation locator:

- run planning document conversations live on `documents`
- task conversations live on `run_tasks`

The locator fields are:

- `conversation_agent_class`
- `conversation_agent_name`

This lets the UI reconnect through `useAgent` / `useAgentChat` without duplicating the messages into relational tables.

## Artifact Flow

The Think-backed task path is file-first:

1. the agent reads and writes inside the task worktree
2. durable outputs are staged under `/artifacts/out`
3. `TaskWorkflow` reads those staged files back through the sandbox bridge
4. Keystone uploads them into R2
5. Keystone inserts canonical `artifact_refs`

Current promoted artifact expectations:

- task turns can only promote `run_note` and `staged_output`
- the scripted path still promotes `task_log`
- finalization writes `run_summary` and keeps the stable object key `release/run-summary.json`

Git commits made inside the task worktree are useful workspace state, but `TaskWorkflow` does not currently promote commit metadata into Keystone's durable task record.

## Current Limits

These are runtime facts, not future design goals:

- the API/runtime default execution engine is `think_live`
- the zero-argument `npm run demo:run` helper intentionally remains `scripted` until host-local live proof archives reliably again
- `think_mock` remains the deterministic fixture-scoped Think validation path
- `think_live` is broader than the old fixture-only proof, but project-backed compile still requires exactly one executable component
- compile still expects the three run planning documents to exist before execution
