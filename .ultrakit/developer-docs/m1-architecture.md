# Keystone M1 Architecture

## Runtime Shape

Keystone is one TypeScript Worker project with these backend responsibilities:

- `src/http/`: Hono API surface for the current `v1` project, document, run, task, and artifact resources
- `src/workflows/RunWorkflow.ts`: run orchestration from compile through finalization
- `src/workflows/TaskWorkflow.ts`: task execution inside the run sandbox
- `src/durable-objects/TaskSessionDO.ts`: internal task-session bridge that materializes task worktrees inside the shared run sandbox
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
- `Workstreams` now follows the selected project through `GET /v1/projects/:projectId/tasks`, including server-backed filter and pagination state
- browser-backed `Workstreams` fetch readiness is keyed off `useProjectManagement().state.currentProject`; `useCurrentProject()` remains a scaffold-compatibility fallback and is not sufficient as a live readiness signal
- `+ New run` now creates real run records through `POST /v1/projects/:projectId/runs` and routes directly into the new run's live `Specification` page without seeding planning documents
- live run detail under `/runs/:runId/**` now reads real run, planning-document, workflow, task, and task-artifact data through feature-owned UI providers
- `Specification`, `Architecture`, and `Execution Plan` can create missing run-scoped documents and save new current revisions in place through `POST /v1/runs/:runId/documents` and `POST /v1/runs/:runId/documents/:documentId/revisions`
- run-scoped planning documents now get deterministic conversation locators on create when the request omits them, and `GET /v1/runs/:runId/documents` plus `GET /v1/runs/:runId/documents/:documentId` lazily backfill missing locators instead of returning locator-less planning resources
- `Execution Plan` now exposes the explicit `Compile run` action through `POST /v1/runs/:runId/compile`, seeds compile provenance into the live run state immediately after acceptance, and routes into `Execution`, where the UI keeps refreshing until the live workflow graph is available
- task detail now uses the task conversation plus code-review split: changed files are inferred from text `run_note` and `staged_output` artifacts loaded through the authenticated run API seam when their content parses as unified diff, while the remaining task artifacts stay metadata-only support records in that pane
- planning and task panes now reconnect from their persisted `conversation` locators and render visible assistant-ui chat surfaces over the Cloudflare `useAgent` / `useAgentChat` bridge, without introducing a second conversation store in Keystone
- the planning pages keep explicit empty, error, viewer, and editor states in the shared split layout instead of falling back to scaffold placeholders

The current live/scaffold split is still intentional:

- `Documentation` remains scaffold-backed and shows an explicit compatibility state for non-scaffold live projects
- documentation destination content, release/evidence/integration content, and broader destination live-data cutovers are still out of scope for the current UI slice

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

- legacy hard-typed run-package / decision-package resources
- legacy approval gating
- persisted run events
- coordinator-driven live fanout
- session/event-derived product state
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

Compile is document-first: it turns those three documents into the persisted execution DAG and does not select or inspect a primary repo from project config.

## Public API Shape

The current operator-facing backend surface is:

- `POST /v1/projects`
- `GET /v1/projects`
- `GET /v1/projects/:projectId`
- `PATCH /v1/projects/:projectId`
- `GET /v1/projects/:projectId/documents`
- `POST /v1/projects/:projectId/documents`
- `GET /v1/projects/:projectId/documents/:documentId`
- `POST /v1/projects/:projectId/documents/:documentId/revisions`
- `GET /v1/projects/:projectId/runs`
- `GET /v1/projects/:projectId/tasks`
- `POST /v1/projects/:projectId/runs`
- `GET /v1/runs/:runId`
- `POST /v1/runs/:runId/compile`
- `GET /v1/runs/:runId/documents`
- `POST /v1/runs/:runId/documents`
- `GET /v1/runs/:runId/documents/:documentId`
- `GET /v1/runs/:runId/documents/:documentId/revisions/:documentRevisionId`
- `POST /v1/runs/:runId/documents/:documentId/revisions`
- `GET /v1/runs/:runId/workflow`
- `GET /v1/runs/:runId/tasks`
- `GET /v1/runs/:runId/tasks/:taskId/artifacts`
- `GET /v1/runs/:runId/tasks/:taskId`
- `GET /v1/artifacts/:artifactId`
- `GET /v1/artifacts/:artifactId/content`

Task resources now expose both the authoritative `taskId` (`runTaskId`) and the compiled-plan `logicalTaskId`, plus `updatedAt`, so project-scoped task listings and run-scoped task drill-in stay aligned on one contract.

Removed from the backend surface:

- legacy run-package routes
- approval routes
- event / stream live-update routes
- public task-message write routes
- evidence / integration / release placeholder routes

Cloudflare-backed chat transport is exposed separately from the `v1` JSON API:

- `ALL /agents/*`

## Conversation Model

Planning chat is tracked by locator on `documents`:

- `conversation_agent_class`
- `conversation_agent_name`

Task chat is tracked by locator on `run_tasks`:

- `conversation_agent_class`
- `conversation_agent_name`

Run-scoped planning locators now follow one deterministic naming contract when Keystone provisions or normalizes them:

- `conversation_agent_class = PlanningDocumentAgent`
- `conversation_agent_name = tenant:<tenantId>:run:<runId>:document:<canonical-path>`

For run-scoped planning documents, Keystone treats that canonical locator as authoritative on create and on lazy list/detail normalization. It ignores client-supplied planning locator values and rewrites missing or non-canonical planning locators back to the deterministic contract above.

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
- `staged_output`
- `run_summary`

These are the only live artifact families. Task turns can mint only `run_note` and `staged_output`; scripted execution still emits `task_log`; finalization keeps `run_summary` at the stable object key `release/run-summary.json`.

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
- `think_live` is the intended multi-component execution path
- `scripted` remains a conservative single-component validation seam
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

Cloudflare chat agent requests use the same auth values. The browser currently sends them in both places:

- headers for normal protected JSON requests
- `?keystoneToken=...&keystoneTenantId=...` query params on `/agents/*` so `useAgent` can select a persisted agent instance before `useAgentChat` attaches to it

Local defaults stay aligned with `.dev.vars.example`:

- `KEYSTONE_DEV_TOKEN=change-me-local-token`
- `KEYSTONE_DEV_TENANT_ID=tenant-dev-local`
