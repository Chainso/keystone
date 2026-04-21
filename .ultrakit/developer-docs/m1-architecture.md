# Keystone M1 Architecture

## Runtime Shape

Keystone is one TypeScript Worker project with these backend responsibilities:

- `src/http/`: Hono API surface for the current `v1` project, document, run, task, and artifact resources
- `src/workflows/RunWorkflow.ts`: run orchestration from compile through finalization
- `src/workflows/TaskWorkflow.ts`: task execution inside the run sandbox
- `src/durable-objects/TaskSessionDO.ts`: task-session bridge that materializes task worktrees inside the shared run sandbox
- `src/lib/db/`: operational persistence for projects, documents, document revisions, runs, run tasks, run task dependencies, and artifact refs
- `src/lib/artifacts/`: deterministic R2 keying and artifact storage helpers
- `src/keystone/`: compile, task loading, and finalization logic

The same deployable also serves the current UI shell from Wrangler's `ASSETS` binding.

## Current UI Boundary

The current UI is no longer scaffold-only for project management:

- the shell/sidebar owns a live project list plus persisted current-project selection
- `New project` creates real projects through `POST /v1/projects`
- `Project settings` loads and saves through `GET /v1/projects/:projectId` and `PATCH /v1/projects/:projectId`
- the `Runs` index follows the selected project through `GET /v1/projects/:projectId/runs`

The current live/scaffold split is still intentional:

- `Documentation` and `Workstreams` remain scaffold-backed and show explicit compatibility states for non-scaffold live projects
- live non-scaffold runs do not yet have a truthful run-detail cutover, so the UI avoids broken deep links for those rows
- project documents, release/evidence/integration content, and broader destination live-data cutovers are still out of scope for the current UI slice

## Authoritative Persistence

The target model is no longer session- or event-centric.

Authoritative state lives in:

- `projects`
- `project_rule_sets`
- `project_components`
- `project_env_vars`
- `documents`
- `document_revisions`
- `runs`
- `run_tasks`
- `run_task_dependencies`
- `artifact_refs`

R2 stores immutable blobs. Postgres stores identity, ownership, revision history, execution state, and graph shape.

Removed from the core architecture:

- legacy hard-typed run-package resources
- legacy approval gating
- persisted run events
- coordinator-driven live fanout
- workspace binding tables
- task execution as a separate table

## Execution Model

The current product model is:

1. project-scoped run creation via `POST /v1/projects/:projectId/runs`
2. run-scoped planning documents created under `/v1/runs/:runId/documents`
3. explicit compile via `POST /v1/runs/:runId/compile`
4. compile persists:
   - `run_plan`
   - `task_handoff`
   - `run_tasks`
   - `run_task_dependencies`
5. task execution runs against one sandbox per run, with task-specific worktrees inside that sandbox
6. finalization writes `run_summary` and terminalizes the run

Compile requires all three run planning documents:

- `specification`
- `architecture`
- `execution_plan`

## Public API Shape

The current operator-facing backend surface is:

- `POST /v1/projects`
- `GET /v1/projects`
- `GET /v1/projects/:projectId`
- `PATCH /v1/projects/:projectId`
- `GET /v1/projects/:projectId/documents`
- `POST /v1/projects/:projectId/documents`
- `GET /v1/projects/:projectId/runs`
- `POST /v1/projects/:projectId/runs`
- `GET /v1/runs/:runId`
- `POST /v1/runs/:runId/compile`
- `GET /v1/runs/:runId/documents`
- `POST /v1/runs/:runId/documents`
- `GET /v1/runs/:runId/workflow`
- `GET /v1/runs/:runId/tasks`
- `GET /v1/runs/:runId/tasks/:taskId`
- `GET /v1/artifacts/:artifactId`
- `GET /v1/artifacts/:artifactId/content`

Removed from the backend surface:

- legacy run-package routes
- approval routes
- event / stream live-update routes
- public task-message write routes
- evidence / integration / release placeholder routes

## Conversation Model

Planning chat is tracked by locator on `documents`:

- `conversation_agent_class`
- `conversation_agent_name`

Task chat is tracked by locator on `run_tasks`:

- `conversation_agent_class`
- `conversation_agent_name`

Message history itself lives in Cloudflare Think / Session storage. Keystone does not duplicate those messages in relational tables.

## Storage Boundaries

Use Postgres for:

- project identity and config
- document identity and revision history
- run identity and lifecycle
- task graph nodes and edges
- artifact ownership and physical blob identity

Use R2 for:

- document revision bodies
- `run_plan`
- `task_handoff`
- `task_log`
- `run_note`
- `run_summary`

Artifact refs should always capture real object identity:

- `bucket`
- `object_key`
- `object_version`
- `etag`
- `content_type`
- `sha256`
- `size_bytes`

## Runtime Constraints

- one sandbox per run
- task isolation comes from task-specific worktrees, not separate sandboxes
- `executionEngine` is the only execution selector:
  - `scripted`
  - `think_mock`
  - `think_live`
- `git_url` project components are accepted by default

## What Should Not Return

Future work should not reintroduce:

- hard-typed run-package-shaped intake
- approval gating for repo access
- session/event-derived product state
- event streaming as a required UI contract
- metadata escape hatches on business entities

## Local Dev Boundaries

Two host-specific constraints still matter in this repo:

- `wrangler dev` with container bindings must be run outside the Codex sandbox boundary on this host
- `npm run build` still needs a normal host shell on this machine when Wrangler's dry-run deploy needs writable home-directory paths under `~/.config/.wrangler` and `~/.docker`

The local UI also depends on the shared dev-auth header seam for protected browser API requests:

- `Authorization: Bearer <KEYSTONE_DEV_TOKEN>`
- `X-Keystone-Tenant-Id: <tenant-id>`

Local defaults stay aligned with `.dev.vars.example`:

- `KEYSTONE_DEV_TOKEN=change-me-local-token`
- `KEYSTONE_DEV_TENANT_ID=tenant-dev-local`
