# Keystone Think Runtime Runbook

## Purpose

Use this runbook when you need to validate the current demo contracts end to end.

Keystone currently ships three execution-engine proofs:

- `scripted`: the zero-argument `demo:run` helper path
- `think_mock`: deterministic Think-backed validation path
- `think_live`: the API/runtime default plus the explicit live-model Think validation path

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

On this host, run the Wrangler commands from a normal host shell rather than inside the Codex sandbox. Sandboxed startup still fails before serving traffic with `uv_interface_addresses returned Unknown system error 1`.

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

Run the zero-argument scripted helper pair:

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

When one of these pairs archives successfully, it proves:

- the fixture project can be ensured through the project API
- runs are created through `POST /v1/projects/:projectId/runs`
- planning docs are created under `/v1/runs/:runId/documents`
- compile requires all three run planning documents
- runs archive successfully
- compile provenance is recorded on the run
- tasks are materialized from the compiled DAG
- public `scripted` and `think_live` proofs expose a well-formed workflow graph with at least three tasks, at least two roots, and at least one dependency edge
- the public workflow/task surfaces are consistent with the broader DAG scheduler contract; the dedicated workflow and repository tests cover the `active + ready` poll behavior directly
- Think execution exposes task conversation locators on `run_tasks`

The runtime/helper split is intentional:

- omitting `executionEngine` on run creation still defaults the API/runtime path to `think_live`
- only the zero-argument `demo:run` helper stays on `scripted`
- `think_mock` remains the deterministic fixture-scoped path

## Explicit Live Think Helper

Use the explicit live helper pair when you want the live engine path without changing the zero-argument `demo:run` default:

```bash
npm run demo:run:think-live
KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:validate
```

`demo:run:think-live` is a convenience wrapper for `KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:run`. The public helper/API contract does not expose `preserveSandbox`, so do not treat it as a guaranteed post-completion sandbox-inspection path.

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
- for `scripted` and `think_live`, the workflow graph is well formed and shows at least three tasks, at least two roots, and at least one dependency edge
- Think runs expose at least one task conversation locator

## Current Host-Local Live-Proof Caveat

The latest recorded host-local live proof evidence is from 2026-04-21:

- `curl -i http://127.0.0.1:8787/v1/health` returned `200 OK`
- `KEYSTONE_EXECUTION_ENGINE=think_live npm run demo:run` then failed with `Expected archived run, received failed.`
- the follow-up run listing showed the newest live run with `executionEngine: "think_live"`, `status: "failed"`, and `compiledFrom: null`
- a later recheck the same day returned `curl: (7) Failed to connect to 127.0.0.1 port 8787`, so no fresher archived live proof was available

Keep that evidence in mind when interpreting the helper split: the broader `think_live` DAG contract is covered by targeted tests and the explicit script contract, but the host-local archived live rerun still depends on local Worker availability and this machine's environment quirks.

## Failure Patterns

- `Run detail did not return a valid executionEngine.`: the backend stopped returning authoritative execution-engine state on run detail
- `Expected the run to record compile provenance.`: the run archived without pinned document-revision provenance
- `Expected archived run, received failed.` during an explicit `think_live` demo run: the Worker accepted the request but the local live proof did not archive cleanly; inspect the latest run detail plus run list for missing compile provenance before assuming the docs are wrong
- `Expected Think execution to expose at least one task conversation locator.`: the task row did not record its Think conversation locator
- `curl: (7) Failed to connect to 127.0.0.1 port 8787`: local Wrangler is not listening on the assumed port; use the actual `Ready on ...` URL or restart from a host shell
- `Provide --run-id=<id>, set KEYSTONE_RUN_ID, or run demo:run first.`: validation had no explicit run id and no persisted last-successful run state
