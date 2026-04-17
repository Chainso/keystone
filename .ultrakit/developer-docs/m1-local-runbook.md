# Keystone M1 Local Runbook

## Prerequisites

- Docker with `buildx`
- Node/npm
- A local `.dev.vars` copied from `.dev.vars.example`
- The local chat-completions backend reachable at `http://localhost:4001`

## Boot

```bash
docker compose up -d postgres
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgres://postgres:postgres@127.0.0.1:5432/keystone"
npm run db:migrate
npm run dev -- --ip 127.0.0.1 --show-interactive-dev-session=false
```

Expected signals:

- `Ready on http://127.0.0.1:<port>`
- container image preparation succeeds
- workflow bindings are listed in Wrangler startup output

If Wrangler binds a different port because `8787` is already in use, export the ready URL before running any helper scripts:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
```

## Sanity Checks

```bash
curl -i "${KEYSTONE_BASE_URL:-http://127.0.0.1:8787}/v1/health"
npx wrangler workflows list --local
```

Healthy output should show `200 OK` for `/v1/health` and both `run-workflow` plus `task-workflow` in the local workflow list.

## Fixture Demo

Create and poll a fixture-backed run:

```bash
npm run demo:run
```

Validate a completed run:

```bash
npm run demo:validate -- --run-id=<run-id>
```

Expected fixture proof:

- run status reaches `archived`
- at least three sessions exist (`run`, `compile`, `task`)
- artifacts include `decision_package`, `run_plan`, `task_handoff`, `task_log`, and `run_summary`

## Approval Path

The approval-gated path is a `gitUrl` repo input. It should:

1. create a run session,
2. pause in `paused_for_approval`,
3. create an approval row with type `outbound_network`,
4. resume only after `POST /v1/runs/:runId/approvals/:approvalId/resolve`.

## Failure Patterns

- `Invalid session status transition`: a workflow is skipping the named session lifecycle.
- `RunCoordinatorDO was not initialized before use`: a workflow path is publishing events before initializing the coordinator.
- `uv_interface_addresses returned Unknown system error 1`: `wrangler dev` was started inside the restricted sandbox boundary on this host.
- empty or stalled compile output: confirm the backend is reachable at `http://localhost:4001/v1/chat/completions`.
