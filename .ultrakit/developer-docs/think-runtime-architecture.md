# Keystone Think Runtime Architecture

## Scope

This document covers the current Think-backed execution slice in Keystone.

It describes:

- how `think_mock` and `think_live` fit into the target model
- how planning and task workspaces are exposed to Think agents
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

`think_live` is the live-model Think-backed path against the configured local OpenAI-compatible chat-completions backend. It executes compiled handoffs against the full materialized project workspace, including multi-component projects.

## Scheduler Contract

`RunWorkflow` remains authoritative for DAG progression after compile.

Current scheduler behavior:

- every scheduler poll promotes newly satisfied dependencies from `pending` to `ready` with guarded `ifStatusIn: ["pending"]` writes
- dependency-failure cancellation also uses guarded `pending`-only writes
- each poll fans out the union of currently `active` and currently `ready` tasks
- newly ready tasks can launch while unrelated branches remain active in the shared run sandbox

The current persisted conversation classes are:

- `KeystoneThinkAgent` for task conversations
- `PlanningDocumentAgent` for run-scoped planning documents

## Filesystem Contract

`TaskSessionDO.ensureWorkspace()` materializes task-specific worktrees inside the shared run sandbox and exposes a stable agent-facing layout:

- `/workspace`
- `/documents`
- `/artifacts/in`
- `/artifacts/out`
- `/keystone`

Important rules:

- one sandbox exists per run
- `RunWorkflow` ensures the project workspace at run start before compile and task scheduling
- task isolation comes from task-specific worktrees, not separate sandboxes
- `/workspace`, `/documents`, and `/artifacts/out` are writable
- `/artifacts/in` and `/keystone` are read-only inputs
- staged files under `/artifacts/out` are not durable until `TaskWorkflow` promotes them into R2 and records `artifact_refs`
- `/documents` is sandbox-local planning draft state and is preserved across bridge rematerialization until a save tool persists the draft as a Keystone document revision
- task rematerialization excludes the current task's own prior artifacts from `/artifacts/in`

`TaskSessionDO` is internal execution plumbing, not a product-level return to session-centric state.

## Planning Agent Path

Run-scoped planning documents now reuse the same run sandbox boundary through deterministic planning-session ids derived from the planning document path.

Current planning-agent behavior:

- `PlanningDocumentAgent` materializes the project workspace through the existing `TaskSessionDO` sandbox bridge instead of running as a plain chat-only agent
- planning chats can inspect the run-scoped project workspace under `/workspace`
- current run artifacts and planning revisions are projected under `/artifacts/in`
- planning bash commands inherit the same project environment variables that task execution receives
- planning document drafts are edited in the sandbox under `/documents/<canonical-document>.md`
- Think's native workspace tool implementations (`read`, `write`, `edit`, `list`, `find`, `grep`, `delete`) are configured with sandbox-backed operations, so they see the same agent-facing `/workspace`, `/documents`, `/artifacts/in`, `/artifacts/out`, and `/keystone` paths
- `run_bash` remains available for shell-oriented inspection, but ordinary file inspection should prefer `read`, `list`, `find`, and `grep`
- the `execute` tool is backed by the Worker Loader binding and receives the same sandbox-backed workspace tools for code-mode document operations
- each canonical planning document exposes only its matching save tool: `save_specification`, `save_architecture`, or `save_execution_plan`
- save tools read the matching sandbox draft and persist a new Keystone document revision backed by R2 and `document_revisions`
- planning chat remains an inspection and decision-making surface; authoritative run/task state is still persisted by Keystone, not by Think history

The planning-agent prompts are intentionally distinct:

- `specification` focuses on scope, behavior, constraints, and acceptance criteria
- `architecture` focuses on technical design, boundaries, tradeoffs, and validation seams
- `execution-plan` focuses on turning the approved inputs into a small executable task DAG that compile can recover faithfully

## Think Implementer Path

The current Think-backed task role is `implementer`.

- `src/keystone/agents/base/KeystoneThinkAgent.ts` implements the Think-backed adapter
- `src/keystone/agents/implementer/ImplementerAgent.ts` defines the implementer prompt and bridge-backed tools
- the main capabilities are filesystem reads/writes and shell execution against the task worktree
- the current implementer prompt expects the agent to commit in each changed component repo/worktree before staging its handoff note

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

Run-scoped planning documents now normalize to this locator contract:

- `conversation_agent_class = PlanningDocumentAgent`
- `conversation_agent_name = tenant:<tenantId>:run:<runId>:document:<canonical-path>`

Keystone ignores client-supplied planning locator values and rewrites missing or non-canonical planning locators to that deterministic contract.

`TaskWorkflow` remains the authority for task locators and still provisions them only for non-`scripted` tasks.

This lets the UI reconnect through `useAgent({ agent, name })` and `useAgentChat({ agent })` without duplicating the messages into relational tables or inventing a second conversation store.

The visible planning and task panes now layer assistant-ui's external-store runtime on top of that bridge, so assistant-ui owns rendering and composer behavior while Cloudflare still owns persistence, sync, and message authority.

The Worker now exposes `/agents/*` as the browser transport entrypoint for those Cloudflare agent conversations, protected by the same dev-auth seam as the JSON API.

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
- compile is document-first and no longer requires a project-level compile target
- `think_live` is the multi-component project-backed execution path
- `scripted` remains intentionally single-component only
- compile still expects the three run planning documents to exist before execution
