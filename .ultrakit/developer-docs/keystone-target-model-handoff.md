# Keystone Target-Model Handoff

Read this first when changing persistence, API contracts, run orchestration, artifact promotion, or document behavior.

This repository is now project/document/run/task/artifact-first. It is no longer session/approval/event/coordinator-first.

## Current Product Model

Authoritative product state lives in:

- `projects`
- `documents`
- `document_revisions`
- `runs`
- `run_tasks`
- `run_task_dependencies`
- `artifact_refs`

That means Keystone should be understood as:

- project-scoped run intake through `POST /v1/projects/:projectId/runs`
- run-scoped planning documents and immutable revisions
- explicit compile that writes a persisted DAG plus task handoffs
- task execution backed by authoritative run-task rows
- artifact-backed durable outputs instead of event-derived projections

Do not model new features around legacy session or event concepts. Those are no longer the product boundary.

## Current Execution Flow

The shipped execution path is:

1. Create a run under a project with `executionEngine`.
2. Create or update the run-scoped `specification`, `architecture`, and `execution_plan` documents.
3. Call explicit compile.
4. Compile persists `run_plan`, `task_handoff`, `run_tasks`, and `run_task_dependencies`.
5. Task execution runs inside one sandbox per run, with one task worktree per task inside that shared sandbox.
6. Finalization writes `run_summary` and archives the run.

Compile is document-first. Keystone does not treat inline decision packages, approvals, or session replay as the source of truth for run execution.

## Keystone / Think Boundary

Keystone owns:

- project, document, run, task, and artifact persistence
- compile and DAG materialization
- workflow orchestration
- sandbox lifecycle and task workspace materialization
- artifact promotion into R2 plus `artifact_refs`
- authoritative run/task state

Think owns:

- conversation history
- tool-call history
- the inside of one planning or task turn

Keystone stores only conversation locators on `documents` and `run_tasks`:

- `conversation_agent_class`
- `conversation_agent_name`

Do not add relational message persistence unless the product model changes. Think history is not the authoritative run/task state store.

## Live Artifact Truth

The only live artifact kinds are:

- `document_revision`
- `run_plan`
- `task_handoff`
- `task_log`
- `run_note`
- `run_summary`
- `staged_output`

Current responsibilities:

- compile writes `run_plan` and `task_handoff`
- scripted execution writes `task_log`
- task turns can only mint `run_note` and `staged_output`
- finalization writes `run_summary`

`run_summary` intentionally keeps the stable object key `release/run-summary.json`.

## Removed Surfaces

These are removed from the current product contract and should not be reintroduced casually:

- approval routes and approval-gated repo access
- event, stream, or websocket run-update contracts
- decision-package resources
- evidence, integration, and release placeholder resources
- session/event-derived product state

If a contributor needs one of those concepts again, treat it as a new product decision and update the durable docs first.

## Internal Caveat

`TaskSessionDO` still exists, but only as an internal sandbox bridge that materializes task worktrees inside the shared run sandbox. Its presence does not make the product model session-centric again.

## Read Next

- [M1 architecture](./m1-architecture.md)
- [M1 local runbook](./m1-local-runbook.md)
- [Think runtime architecture](./think-runtime-architecture.md)
- [Think runtime runbook](./think-runtime-runbook.md)
