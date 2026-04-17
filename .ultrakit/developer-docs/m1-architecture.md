# Keystone M1 Architecture

## Runtime Shape

Keystone M1 is one TypeScript Worker project with these runtime responsibilities:

- `src/http/`: Hono API surface for project CRUD, run creation, summary fetch, approval resolution, websocket proxying, and dev smoke routes
- `src/durable-objects/RunCoordinatorDO.ts`: per-run live projection for websocket consumers
- `src/durable-objects/TaskSessionDO.ts`: task-session sandbox and workspace lifecycle manager
- `src/workflows/RunWorkflow.ts`: durable run orchestration from compile through finalization
- `src/workflows/TaskWorkflow.ts`: durable task execution loop with sandbox process polling and task-log persistence
- `src/keystone/`: vertical-specific compile, task-loading, and finalization logic
- `src/lib/db/`: operational persistence for projects, sessions, events, approvals, artifacts, workspace bindings, and per-component workspace materializations
- `src/lib/artifacts/`: deterministic R2 keying and artifact storage helpers
- `src/lib/security/`: explicit outbound and repo-source policy decisions

## Durable Model

The Worker keeps large workflow meaning outside workflow step output:

- Postgres stores operational rows only: projects, sessions, session events, approvals, artifact refs, workspace bindings, and per-component workspace materializations.
- R2 stores run artifacts: decision package, compiled run plan, task handoff, task logs, and run summary.
- Workflow steps return only compact JSON-safe state and reload larger state from R2/DB when needed.

## Execution Flow

The happy-path fixture run is:

1. `POST /v1/projects` or `PUT /v1/projects/:projectId` creates the durable project config, and `POST /v1/runs` accepts only `projectId` plus the decision package input.
2. `POST /v1/runs` creates the root run session, initializes `RunCoordinatorDO`, and starts `RUN_WORKFLOW`.
3. `RunWorkflow` reloads the project, freezes project execution metadata onto the run session, validates that compile routing has one explicit executable target, and compiles a run plan through the local chat-completions backend.
4. The compiled plan is persisted to R2 and fanned out into one `TASK_WORKFLOW` instance per task.
5. Each `TaskWorkflow` reloads the same project, asks `TaskSessionDO` to materialize all project components under `/workspace/code/<component-key>`, and then executes the task.
6. The scripted path runs a sandboxed `npm test` process and persists `task_log`; the Think path uses the same project-backed workspace plus agent bridge to promote staged `run_note` artifacts.
7. `RunWorkflow` polls task workflow statuses, finalizes the run, writes the run summary artifact, and archives the run session.

## Security and Approval Edge

M1 keeps the security model explicit:

- Outbound HTTP for the compile path is allow-listed to the configured chat-completions origin only.
- project-backed compile targets that resolve to `gitUrl` are approval-gated before the workflow proceeds, because they require outbound network access.
- Approval requests are durable DB rows plus `approval.requested` events.
- `POST /v1/runs/:runId/approvals/:approvalId/resolve` updates the approval row, emits `approval.resolved`, and sends the matching Workflow event back to the run instance.

Current boundary:

- project env vars are non-secret only in `v1`
- multi-component projects materialize correctly at task time, but compile-time target selection still requires exactly one executable component until a product-level selector exists

## Local Dev Boundaries

Two environment-specific constraints matter in this repo:

- `wrangler dev` with container bindings must be run outside the Codex sandbox boundary on this host.
- The local chat-completions backend is plain HTTP at `http://localhost:10531`, not HTTPS.
