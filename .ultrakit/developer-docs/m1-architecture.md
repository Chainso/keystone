# Keystone UI-First V1 Architecture

## Runtime Shape

Keystone's current runtime is one TypeScript Worker project with these responsibilities:

- `src/http/`: Hono API surface for the UI-first `v1` resource model: project CRUD plus `ProjectDocument`, `DecisionPackage`, `Run`, `Task`, `TaskConversation`, `Artifact`, `Approval`, `EvidenceBundle`, and `IntegrationRecord` routes
- `src/durable-objects/RunCoordinatorDO.ts`: per-run live projection for websocket consumers
- `src/durable-objects/TaskSessionDO.ts`: task-session sandbox and workspace lifecycle manager
- `src/workflows/RunWorkflow.ts`: durable run orchestration from compile through finalization
- `src/workflows/TaskWorkflow.ts`: durable task execution loop with sandbox process polling and task-log persistence
- `src/keystone/`: vertical-specific compile, task-loading, and finalization logic
- `src/lib/db/`: operational persistence for projects, sessions, events, approvals, artifacts, workspace bindings, and per-component workspace materializations
- `src/lib/artifacts/`: deterministic R2 keying and artifact storage helpers
- `src/lib/security/`: explicit outbound and repo-source policy decisions

The same deployable also serves the current operator UI scaffold from Wrangler's `ASSETS` binding. Hono remains authoritative for `/v1/*`, `/internal/*`, and health/runtime endpoints while the SPA owns the workspace shell routes.

## Durable Model

The Worker keeps large workflow meaning outside workflow step output:

- Postgres stores operational rows only: projects, sessions, session events, approvals, artifact refs, workspace bindings, and per-component workspace materializations.
- R2 stores run artifacts: decision package, compiled run plan, task handoff, task logs, and run summary.
- Workflow steps return only compact JSON-safe state and reload larger state from R2/DB when needed.

## Execution Flow

The happy-path fixture run is:

1. `POST /v1/projects` or `PUT /v1/projects/:projectId` creates the durable project config, and `POST /v1/runs` accepts `projectId` plus a typed decision-package reference. The currently launchable path is `decisionPackage: { source: "inline", payload: ... }`.
2. `POST /v1/runs` creates the root run session, initializes `RunCoordinatorDO`, and starts `RUN_WORKFLOW`.
3. `RunWorkflow` reloads the project, freezes project execution metadata onto the run session, validates that compile routing has one explicit executable target, and compiles a run plan through the local chat-completions backend.
4. The compiled plan is persisted to R2 and fanned out into one `TASK_WORKFLOW` instance per task.
5. Each `TaskWorkflow` reloads the same project, asks `TaskSessionDO` to materialize all project components under `/workspace/code/<component-key>`, and then executes the task.
6. The scripted path runs a sandboxed `npm test` process and persists `task_log`; the Think path uses the same project-backed workspace plus agent bridge to promote staged `run_note` artifacts.
7. `RunWorkflow` polls task workflow statuses, finalizes the run, writes the run summary artifact, and archives the run session.

## Public API Shape

The canonical operator-facing surface is now:

- `GET /v1/projects`
- `GET /v1/projects/:projectId`
- `GET /v1/projects/:projectId/documents`
- `GET /v1/projects/:projectId/decision-packages`
- `GET /v1/projects/:projectId/runs`
- `POST /v1/runs`
- `GET /v1/runs/:runId`
- `GET /v1/runs/:runId/graph`
- `GET /v1/runs/:runId/tasks`
- `GET /v1/runs/:runId/tasks/:taskId`
- `GET /v1/runs/:runId/tasks/:taskId/conversation`
- `POST /v1/runs/:runId/tasks/:taskId/conversation/messages`
- `GET /v1/runs/:runId/tasks/:taskId/artifacts`
- `GET /v1/runs/:runId/approvals`
- `GET /v1/runs/:runId/approvals/:approvalId`
- `POST /v1/runs/:runId/approvals/:approvalId/resolve`
- `GET /v1/runs/:runId/evidence`
- `GET /v1/runs/:runId/integration`
- `GET /v1/runs/:runId/release`
- `GET /v1/artifacts/:artifactId`
- `GET /v1/artifacts/:artifactId/content`

`GET /v1/runs/:runId/stream` is the canonical UI stream path. `GET /v1/runs/:runId/events` and `GET /v1/runs/:runId/ws` remain available only as legacy/debug seams.

## Operator UI Scaffold

The shipped frontend is a structure-first React SPA under `ui/` that now matches the minimal board layout from `design/workspace-spec.md` and shares one target-model-aligned scaffold dataset:

- `ui/src/app/` owns app bootstrap, providers, and global styles.
- `ui/src/routes/` owns the canonical route tree and nested layout boundaries from `design/workspace-spec.md`.
- `ui/src/features/resource-model/` owns the normalized scaffold resources, selectors, run-phase metadata, and provider seam for `project`, `run`, `document`, `documentRevision`, `task`, `workflowGraph`, `artifact`, and project-configuration state.
- `ui/src/features/` owns destination-specific workspace components and view-model hooks that compose from `resource-model` selectors instead of feature-local fake scaffold files.
- `ui/src/shared/` owns reusable shell, navigation, and generic layout/form primitives only.
- `ui/src/test/` owns route, selector, and shell smoke coverage for the scaffold contracts.

Ownership boundary:

- `Runs`, `Execution`, `Documentation`, and `Workstreams` render through feature-owned board components under `ui/src/features/**/components/`, while the route files stay as thin containers.
- `ui/src/features/runs/use-run-view-model.ts`, `ui/src/features/execution/use-execution-view-model.ts`, `ui/src/features/documentation/use-documentation-view-model.ts`, `ui/src/features/workstreams/use-workstreams-view-model.ts`, and `ui/src/features/projects/use-project-configuration-view-model.ts` are the only destination seams that assemble selector output into route-facing view models.
- `ui/src/routes/projects/project-configuration-layout.tsx` owns the `new` vs `settings` shell split, and `ui/src/features/projects/components/project-configuration-tabs.tsx` owns the tab-specific board content.
- `ui/src/shared/` should not regain destination-specific workspace components or decorative chrome that is outside the ASCII boards.

Current UI boundary:

- the route tree is real and stable, but the UI remains scaffold-only and does not yet use live query/caching adapters
- the `resource-model` dataset is the single checked-in scaffold source of truth; destination-local fake scaffold modules have been removed
- documentation collections, decision packages, evidence, integration, release, and project editing remain unwired behind the stable route tree

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
- `npm run build` still needs a normal host shell on this machine when the sandbox reproduces Wrangler/Docker home-directory write failures under `~/.config/.wrangler` and `~/.docker`. Revalidated in the 2026-04-20 follow-up pass: the same `EROFS` failure still occurs inside Codex before the host rerun succeeds.
