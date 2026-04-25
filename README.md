# Keystone Cloudflare Prototype

Keystone is a single Cloudflare Worker project that currently proves:

- durable `Project` objects as the backend boundary for code components, non-secret env vars, and review/test defaults
- project-scoped run intake over HTTP
- durable run and task orchestration with Cloudflare Workflows
- file-first artifact persistence in R2 with Postgres as the operational index
- sandboxed execution with one sandbox per run and task-specific worktrees inside that sandbox
- provider-backed compile and Think live-model turns using the local OpenAI-compatible chat-completions endpoint at `http://localhost:10531`
- an `executionEngine` selector that defaults project-backed run creation to `think_live`, keeps explicit `scripted` and `think_mock` paths available, and leaves the zero-argument `demo:run` helper on `scripted` until host-local live proof is reliable
- a Tailwind/shadcn React workspace shell served from the same Worker deployable, with Plate-backed document surfaces, assistant-ui planning and task conversations over Cloudflare, and the canonical route tree for `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings`

The authoritative target-model contract for contributors is [.ultrakit/developer-docs/keystone-target-model-handoff.md](./.ultrakit/developer-docs/keystone-target-model-handoff.md). Read that first before changing persistence, API, run orchestration, or document behavior.

## Core Commands

Run these from repo root:

```bash
npm install
docker compose up -d postgres
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgres://postgres:postgres@127.0.0.1:5432/keystone"
npm run db:migrate
npm run lint
npm run typecheck
npm run test
npm run test:security
npm run test:workflows
npm run build:ui
npm run build
npm run dev:ui
npm run dev:ui:serve
npm run dev:zellij
npm run dev -- --ip 0.0.0.0 --show-interactive-dev-session=false
```

`npm run dev` no longer needs a host `CLOUDFLARE_API_TOKEN` just to satisfy the Think runtime. The Think-backed model path now uses `KEYSTONE_CHAT_COMPLETIONS_BASE_URL` and `KEYSTONE_CHAT_COMPLETIONS_MODEL` directly.

`npm run dev` now runs `npm run build:ui` first so Wrangler can serve the current frontend assets from the same Worker deployable. Use `npm run dev:ui` in a second terminal when you want watch-mode rebuilds for the workspace shell while Wrangler is already running.

When you need real React development errors instead of the minified production bundle, run `npm run dev:ui:serve` in a second terminal and open the Vite URL it prints, usually `http://127.0.0.1:5173` locally plus a network URL. That Vite server binds to `KEYSTONE_UI_DEV_HOST` or `0.0.0.0` by default, and proxies `/v1`, `/agents`, `/internal`, and `/healthz` back to the local Worker at `KEYSTONE_DEV_PROXY_TARGET` or `KEYSTONE_BASE_URL` (default `http://127.0.0.1:8787`).

`npm run dev:zellij` is the checked-in helper for the standard UI scaffold workflow. After Postgres is up and `npm run db:migrate` has completed, it opens zellij with vertically split panes that run `npm run dev -- --ip "${KEYSTONE_DEV_IP:-0.0.0.0}" --show-interactive-dev-session=false` and `npm run dev:ui` from repo root, then opens the local UI in the default browser once `/v1/health` responds at `http://127.0.0.1:8787`. Use it from a normal host shell, not inside the Codex sandbox, because local Worker startup on this machine still needs host execution. If you need a different browser target, export `KEYSTONE_BROWSER_URL` or `KEYSTONE_BASE_URL` first. If you want to suppress browser launch, export `KEYSTONE_OPEN_BROWSER=0`.

## UI Scaffold

The current UI is a structure-first React SPA under `ui/` served through Wrangler's `ASSETS` binding alongside the existing Hono API routes.

For the standard local UI loop, run `npm run dev:zellij`. If you prefer the manual path or do not use zellij, keep using `npm run dev` plus `npm run dev:ui` in separate terminals. If you are debugging frontend rendering issues, switch the second terminal to `npm run dev:ui:serve` and use the Vite URL instead of the Worker-served asset URL.

Current UI scope:

- the global project-scoped sidebar with a live project list, persisted current-project selection, and a real project switcher
- live `New project` creation through `POST /v1/projects`
- live `Project settings` load/save through `GET /v1/projects/:projectId` and `PATCH /v1/projects/:projectId`
- a live project-scoped `Runs` workspace backed by the real run APIs from index through execution review
- top-level destination routes for `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings`
- a live `Runs` index with a real `+ New run` action
- nested run detail routes for `Specification`, `Architecture`, `Execution Plan`, and `Execution`
- live planning authoring for `Specification`, `Architecture`, and `Execution Plan`
- planning and task detail conversations rendered through assistant-ui over the persisted Cloudflare conversation locator contract exposed at `/agents/*`
- run planning chats now get run-scoped sandbox inspection context too: specification, architecture, and execution-plan agents can inspect `/workspace`, projected run artifacts, and project env-backed bash output while keeping distinct planning responsibilities
- explicit compile on `Execution Plan`, live `Execution` DAG loading, and task-detail review that infers changed files from text task artifacts while keeping non-diff outputs as metadata-only support records
- live `Workstreams` loading through `GET /v1/projects/:projectId/tasks` with server-side filtering, pagination, and direct links back into `Runs > Execution`
- workspace-style `Documentation`, `Workstreams`, `New project`, and `Project settings` surfaces with no extra hero, aside, or right-rail chrome
- `Documentation` remains scaffold-backed, renders through the shared Plate document viewer, and shows an explicit compatibility state when the selected live project is not present in the scaffold dataset

Current UI non-goals:

- live backend loading for `Documentation`
- conversation persistence changes or a second chat authority beyond the current Cloudflare-backed planning/task panes
- streaming execution updates or backend-owned review diff metadata beyond the current text-artifact seam
- persisted documentation or workstream editing
- final visual polish
- auth-specific UI flows or tenant-selection controls
- destination-specific behavior beyond the current live project-management, runs, and `Workstreams` surfaces

## UI Architecture

The frontend scaffold is intentionally split by ownership so future feature work can fill in the existing slots instead of reopening structure decisions:

- `ui/src/app/`: React entrypoint, provider stack, and shared stylesheet
- `ui/src/routes/`: route containers and nested layouts that mirror `design/workspace-spec.md`
- `ui/src/features/`: feature-owned workspace components, local scaffold data, and view-model hooks for runs, execution, documentation, workstreams, and project configuration
- `ui/src/shared/`: reusable shell, navigation, and generic layout/form primitives
- `ui/src/test/`: route and shell smoke coverage for the scaffold contracts

`ui/src/routes/router.tsx` is the canonical route tree. Route files stay thin and own URL structure plus layout composition, feature modules own destination-specific board rendering and local scaffold state, and shared components stay generic.

Current UI boundary:

- the scaffold is served from the same Worker deployable as the `v1` API
- the live project-management loop is real across the shell/sidebar, `New project`, `Project settings`, the full `Runs` destination, and `Workstreams`
- `Runs` is now truthful end to end for project-scoped index, run creation, planning authoring, explicit compile, execution DAG, and task artifact review
- planning and task panes now reconnect through persisted locators and render assistant-ui surfaces over the Cloudflare agent transport exposed at `/agents/*`
- planning chats now reuse the shared run sandbox via deterministic planning-session ids, so the planning agents can ground their guidance in the current repository and run artifacts instead of acting as chat-only assistants
- `Workstreams` now follows the selected project through the real project-tasks API with server-backed filter and pagination state
- `Documentation` still relies on scaffold-backed selectors, renders through the shared Plate viewer, and keeps its explicit compatibility state for non-scaffold live projects
- documentation collections, evidence, integration, and release flows remain unwired behind the stable route tree

## Project-Backed Backend

The current backend contract is project-first:

- `POST /v1/projects`, `GET /v1/projects`, `GET /v1/projects/:projectId`, and `PATCH /v1/projects/:projectId` manage durable project config and now return canonical `data`/`meta` envelopes
- `GET /v1/projects/:projectId/runs` and `POST /v1/projects/:projectId/runs` manage project-scoped run collections
- `GET /v1/projects/:projectId/tasks` backs the live `Workstreams` board with server-side filtering and pagination over authoritative run-task rows
- project components materialize into the run sandbox and task-specific worktrees under `/workspace/runs/<run>/tasks/<task>/code/<component>`
- project env vars are non-secret only in `v1`

The current UI-first `v1` surface is centered on:

- `POST /v1/projects`
- `GET /v1/projects`
- `GET /v1/projects/:projectId`
- `GET /v1/projects/:projectId/documents`
- `GET /v1/projects/:projectId/runs`
- `GET /v1/projects/:projectId/tasks`
- `POST /v1/projects/:projectId/runs`
- `GET /v1/runs/:runId`
- `POST /v1/runs/:runId/compile`
- `GET /v1/runs/:runId/documents`
- `POST /v1/runs/:runId/documents`
- `GET /v1/runs/:runId/documents/:documentId/revisions/:documentRevisionId`
- `GET /v1/runs/:runId/workflow`
- `GET /v1/runs/:runId/tasks`
- `GET /v1/runs/:runId/tasks/:taskId/artifacts`
- `GET /v1/runs/:runId/tasks/:taskId`
- `GET /v1/artifacts/:artifactId`
- `GET /v1/artifacts/:artifactId/content`

Removed from the target model and current backend contract:

- decision-package / legacy run-package resources
- approval-gated repo access
- run event streams / live update surfaces
- release / evidence / integration placeholder resources
- session/event-derived product state
- public task-message write APIs

For local validation, the fixture bootstrap helper converges on one deterministic fixture project per tenant:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
npm run demo:ensure-project
```

Run that only after Wrangler dev is already serving the local API. `demo:run` already calls the same helper automatically before it posts the run.

Current execution split:

- compile is document-first and no longer requires a project-level compile-target selector
- `think_live` is the intended multi-component execution path
- `scripted` remains intentionally conservative and supports only single-component projects

## Demo Flow

With Wrangler dev running, target the exact `Ready on http://127.0.0.1:<port>` URL that Wrangler prints. If `8787` is already occupied, export the actual ready URL first:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
```

Then run one of the supported demo pairs:

```bash
npm run demo:run
npm run demo:validate

KEYSTONE_EXECUTION_ENGINE=think_mock npm run demo:run
KEYSTONE_EXECUTION_ENGINE=think_mock npm run demo:validate

KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:run
KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:validate
```

These pairs cover three distinct contracts:

- `npm run demo:run` plus `npm run demo:validate`: the conservative zero-argument scripted helper path.
- `KEYSTONE_EXECUTION_ENGINE=think_mock ...`: the deterministic fixture-scoped Think validation path.
- `KEYSTONE_EXECUTION_ENGINE=think_live ...`: the live-model Think proof against the stored `fixture-demo-project` plus the committed planning-document fixtures.

All three flows create project-backed runs through the stored `fixture-demo-project`, seed the three run planning documents (`specification`, `architecture`, `execution_plan`), then call explicit compile before polling the run to completion.

The current shipped runtime and proof contract is:

- omitting `executionEngine` on project-backed run creation defaults the API/runtime path to `think_live`
- the zero-argument `demo:run` helper intentionally stays on `scripted` until a fresh host-local live proof archives reliably again
- `think_live` can execute project-backed compiled DAGs against the full materialized project workspace, including multi-component projects
- `RunWorkflow` fans out the union of `active` and `ready` tasks on each scheduler poll, so newly unblocked work can launch while unrelated branches stay active
- `demo:validate` now fails closed if run detail is malformed and, for public `scripted` or `think_live` proofs, requires a well-formed acyclic workflow graph with at least three tasks, at least two root tasks, and at least one dependency edge
- Think runs still must expose task conversation locators on `run_tasks`

Current limits and caveats:

- compile is document-first and no longer requires a project-level compile target
- `scripted` still supports only single-component projects and fails fast for multi-component workspaces; use `think_live` for multi-component execution
- compile still expects the run `specification`, `architecture`, and `execution_plan` documents before execution
- the latest host-local live-proof evidence on 2026-04-21 reached the local Worker, then `KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:run` failed with `Expected archived run, received failed.` and the latest run row showed `executionEngine: "think_live"`, `status: "failed"`, and `compiledFrom: null`; later that day `curl -i http://127.0.0.1:8787/v1/health` could not connect, so no fresher local archived proof is recorded yet

`demo:run` persists only the last successful archived run under `.keystone/demo-last-run.json`. `demo:validate` reuses that state only when you do not supply `--run-id` or `KEYSTONE_RUN_ID`.

For ad hoc manual validation when you need to supply the run id yourself, export the same `KEYSTONE_BASE_URL` first if Wrangler is not on `8787`, then use:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
npm run demo:validate -- --run-id=<run-id-from-demo-run>
```

The scripted helper path yields a `task_log` artifact. The deterministic Think pair is:

```bash
KEYSTONE_EXECUTION_ENGINE=think_mock npm run demo:run
KEYSTONE_EXECUTION_ENGINE=think_mock npm run demo:validate
```

That Think pair remains the stable validation path because it avoids live-model variability.

For a live-model Think run through the current explicit helper path, use:

```bash
npm run demo:run:think-live
```

`demo:run:think-live` is the convenience wrapper for the same live compile plus compiled Think task path using `executionEngine=think_live`.

For ad hoc manual Think validation when you need to supply the run id explicitly, use:

```bash
KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:validate -- --run-id=<run-id-from-demo-run>
```

The current Think path preserves a few intentional boundaries:

- `think_mock` remains the deterministic fixture-scoped validation path
- `think_live` means live compile plus compiled Think task execution against the full project workspace, including multi-component projects
- the Think implementer stages durable files under `/artifacts/out`, and `TaskWorkflow` promotes those staged files into canonical R2-backed `run_note` artifacts
- final run success is anchored on a `run_summary` artifact and an archived run row

For manual API validation outside the helper scripts, create or update a project first, create a run under that project, create the three run planning documents plus their initial revisions, and then call compile:

```json
{
  "executionEngine": "think_live"
}
```

Omit `executionEngine` to use the same `think_live` runtime default explicitly documented above.

## Local Auth

Local dev auth uses:

- `Authorization: Bearer <KEYSTONE_DEV_TOKEN>`
- `X-Keystone-Tenant-Id: <tenant-id>`

The shared browser API seam now sends these headers automatically for protected UI requests. Local UI defaults match this repo's checked-in dev values:

- `KEYSTONE_DEV_TOKEN=change-me-local-token`
- `KEYSTONE_DEV_TENANT_ID=tenant-dev-local`

Start from `.dev.vars.example` and keep local overrides in `.dev.vars`.

## Additional Docs

- [M1 architecture](.ultrakit/developer-docs/m1-architecture.md)
- [M1 local runbook](.ultrakit/developer-docs/m1-local-runbook.md)
- The linked architecture and runbook documents now describe the current UI-first `v1` API, even though the filenames still carry the earlier M1 naming.
- [Think runtime architecture](.ultrakit/developer-docs/think-runtime-architecture.md)
- [Think runtime runbook](.ultrakit/developer-docs/think-runtime-runbook.md)
