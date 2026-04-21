# Keystone M1 Local Runbook

## Prerequisites

- Docker with `buildx`
- Node/npm
- a local `.dev.vars` copied from `.dev.vars.example`
- the local chat-completions backend reachable at `http://localhost:10531`

## Boot

Start the local dependencies first:

```bash
docker compose up -d postgres
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgres://postgres:postgres@127.0.0.1:5432/keystone"
npm run db:migrate
```

For the standard local workflow, start the checked-in zellij helper from a normal host shell:

```bash
npm run dev:zellij
```

That opens vertically split panes for `npx localflare` and `npm run dev:ui`.
By default it also opens the local UI in the system browser once `/v1/health` responds at `http://127.0.0.1:8787`.

If you need a different browser target or want to suppress the browser launch:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
export KEYSTONE_BROWSER_URL="${KEYSTONE_BASE_URL}"
# optional
export KEYSTONE_OPEN_BROWSER=0
```

If you need the manual path instead, use:

```bash
npm run dev -- --ip 127.0.0.1 --show-interactive-dev-session=false
```

If Wrangler binds a non-default port, export it before running helper scripts:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
```

The UI's shared browser API seam sends the local dev auth headers automatically on protected project and run requests. The default local values are:

```bash
KEYSTONE_DEV_TOKEN=change-me-local-token
KEYSTONE_DEV_TENANT_ID=tenant-dev-local
```

Keep host-side overrides in `.dev.vars` when you need different local credentials.

If you are validating the full repo after UI changes, expect `npm run build` to hit the same sandbox limitation on this host: `vite build` completes, then Wrangler's dry-run deploy still needs writable home-directory paths under `~/.config/.wrangler` and `~/.docker`. Rerun from a normal host shell when you need the full `build` proof.

## Sanity Checks

```bash
curl -i "${KEYSTONE_BASE_URL:-http://127.0.0.1:8787}/v1/health"
npx wrangler workflows list --local
```

Healthy output should show `200 OK` for `/v1/health` and both `run-workflow` plus `task-workflow`.

## Fixture Demo

Create and poll a fixture-backed run:

```bash
npm run demo:run
```

Validate a completed run:

```bash
npm run demo:validate
```

Current demo flow:

1. `demo:run` ensures the stored fixture project exists
2. it creates a run through `POST /v1/projects/:projectId/runs`
3. it creates the three run planning documents
4. it creates one revision per planning document
5. it calls `POST /v1/runs/:runId/compile`
6. it polls until the run reaches terminal state

Expected proof:

- run status reaches `archived`
- compile provenance is present
- at least one task exists
- Think runs expose task conversation locators

If you need the fixture project without starting a run, use:

```bash
npm run demo:ensure-project
```

If you need to validate an explicit run id, use:

```bash
npm run demo:validate -- --run-id=<run-id>
```

## Think Paths

Deterministic Think validation:

```bash
KEYSTONE_EXECUTION_ENGINE=think_mock npm run demo:run
KEYSTONE_EXECUTION_ENGINE=think_mock npm run demo:validate
```

Live Think validation:

```bash
KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:run
KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:validate
```

Sandbox inspection after a live Think run:

```bash
npm run demo:run:think-live
KEYSTONE_EXECUTION_ENGINE=think_live npm run sandbox:shell
```

## Manual API Flow

The current HTTP contract is document-first and project-scoped:

1. create or update a project
2. create a run under `/v1/projects/:projectId/runs`
3. create the run planning documents under `/v1/runs/:runId/documents`
4. create revisions for:
   - `specification`
   - `architecture`
   - `execution_plan`
5. call `/v1/runs/:runId/compile`

Minimal run-create payload:

```json
{
  "executionEngine": "scripted"
}
```

## Failure Patterns

- `Run detail did not return a valid executionEngine.`: the backend stopped returning authoritative execution-engine state on run detail
- `Expected the run to record compile provenance.`: the run archived without pinned document-revision provenance
- `uv_interface_addresses returned Unknown system error 1`: `wrangler dev` was started inside the restricted sandbox boundary on this host
- empty or stalled compile output: confirm the backend is reachable at `http://localhost:10531/v1/chat/completions`
- `EROFS` under `~/.config/.wrangler` or `~/.docker/buildx/activity` during `npm run build`: rerun the dry-run deploy from a host shell outside the Codex sandbox
