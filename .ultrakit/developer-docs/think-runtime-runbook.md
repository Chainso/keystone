# Keystone Think Runtime Runbook

## Purpose

Use this runbook when you need to validate the current demo contracts end to end.

Keystone currently ships three execution-engine proofs:

- `scripted`: default deterministic backend path
- `think_mock`: deterministic Think-backed validation path
- `think_live`: live-model Think-backed validation path

All three flows use the same document-first run contract:

1. ensure the fixture project exists
2. create a project-scoped run
3. create the three run planning documents
4. create one revision for each planning document
5. compile the run explicitly
6. poll the run to terminal state
7. validate compile provenance and task/task-conversation outputs

## Prerequisites

- Docker with the local Postgres container available
- Node/npm
- `.dev.vars` populated from `.dev.vars.example`
- the local chat-completions backend reachable at `http://localhost:10531`

## Boot Local Dependencies

Run from repo root:

```bash
docker compose up -d postgres
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgres://postgres:postgres@127.0.0.1:5432/keystone"
npm run db:migrate
npm run dev -- --ip 127.0.0.1 --show-interactive-dev-session=false
```

If Wrangler binds a non-default port, export the ready URL:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
```

## Sanity Checks

```bash
curl -i "${KEYSTONE_BASE_URL:-http://127.0.0.1:8787}/v1/health"
npx wrangler workflows list --local
```

Healthy output should show:

- `200 OK` for `/v1/health`
- both `run-workflow` and `task-workflow` in the local workflow list

## Demo Paths

Run the scripted default pair:

```bash
npm run demo:run
npm run demo:validate
```

Run the deterministic Think pair:

```bash
KEYSTONE_EXECUTION_ENGINE=think_mock npm run demo:run
KEYSTONE_EXECUTION_ENGINE=think_mock npm run demo:validate
```

Run the live Think pair:

```bash
KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:run
KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:validate
```

What these pairs prove:

- the fixture project can be ensured through the project API
- runs are created through `POST /v1/projects/:projectId/runs`
- planning docs are created under `/v1/runs/:runId/documents`
- compile requires all three run planning documents
- runs archive successfully
- compile provenance is recorded on the run
- tasks are materialized from the compiled DAG
- Think execution exposes task conversation locators on `run_tasks`

## Inspection-Oriented Live Run

For a live-model Think turn that preserves the sandbox for inspection:

```bash
npm run demo:run:think-live
KEYSTONE_EXECUTION_ENGINE=think_live npm run sandbox:shell
```

This uses the same document-first contract as the normal live pair, but keeps the run sandbox available after completion.

## Manual Validation Notes

`demo:run` persists only the last successful archived run under `.keystone/demo-last-run.json`.

`demo:validate` reuses that state only when you do not pass:

- `--run-id`
- `KEYSTONE_RUN_ID`

For ad hoc validation with an explicit run id on a non-default Wrangler port, export the same base URL first:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:validate -- --run-id=<run-id>
```

## What `demo:validate` Checks

`demo:validate` now fails closed if run detail does not return a valid `executionEngine`.

It also verifies:

- run status is `archived`
- compile provenance is present
- at least one task exists
- Think runs expose at least one task conversation locator

## Failure Patterns

- `Run detail did not return a valid executionEngine.`: the backend stopped returning authoritative execution-engine state on run detail
- `Expected the run to record compile provenance.`: the run archived without pinned document-revision provenance
- `Expected Think execution to expose at least one task conversation locator.`: the task row did not record its Think conversation locator
- `Provide --run-id=<id>, set KEYSTONE_RUN_ID, or run demo:run first.`: validation had no explicit run id and no persisted last-successful run state
