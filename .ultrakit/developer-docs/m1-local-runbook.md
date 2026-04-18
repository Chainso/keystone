# Keystone M1 Local Runbook

## Prerequisites

- Docker with `buildx`
- Node/npm
- A local `.dev.vars` copied from `.dev.vars.example`
- The local chat-completions backend reachable at `http://localhost:10531`

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

`demo:run` first calls `npm run demo:ensure-project` internally so the stored `fixture-demo-project` exists before `/v1/runs` is posted.

Validate a completed run:

```bash
npm run demo:validate
```

Expected fixture proof:

- run status reaches `archived`
- run detail reports at least three sessions (`run`, `compile`, `task`)
- artifacts include `decision_package`, `run_plan`, `task_handoff`, `task_log`, and `run_summary`
- the run summary reports stored project metadata for `fixture-demo-project`

If you are running the validation manually and need to pass the run id explicitly, the convenience form is:

```bash
npm run demo:validate -- --run-id=<run-id>
```

If you need the fixture project without starting a run, use:

```bash
npm run demo:ensure-project
```

For the Think-backed fixture path, use the dedicated runbook. The exact Phase 5 gate is:

```bash
KEYSTONE_AGENT_RUNTIME=think npm run demo:run
KEYSTONE_AGENT_RUNTIME=think npm run demo:validate
```

If you are running the Think validation manually and need to pass the run id explicitly, the convenience form is:

```bash
KEYSTONE_AGENT_RUNTIME=think npm run demo:validate -- --run-id=<run-id>
```

## Manual Project-Backed Run Intake

The current HTTP contract is project-backed. For manual API checks:

1. Create or update a project through `/v1/projects` or `npm run demo:ensure-project`.
2. Submit `/v1/runs` with `projectId` plus a typed decision-package reference.

Minimal local request shape:

```json
{
  "projectId": "<stored-project-id>",
  "decisionPackage": {
    "source": "inline",
    "payload": {
      "decisionPackageId": "demo-greeting-update",
      "summary": "Update the deterministic fixture target.",
      "objectives": ["Keep fixture tests green."],
      "tasks": [
        {
          "taskId": "task-greeting-tone",
          "title": "Adjust the greeting implementation",
          "acceptanceCriteria": ["Fixture tests remain green."]
        }
      ]
    }
  }
}
```

For UI consumers, use `GET /v1/runs/:runId/stream` as the canonical live stream path. `/events` and `/ws` remain debug/legacy seams only.

## Approval Path

The approval-gated path is a project whose compile target resolves to `gitUrl`. It should:

1. create a run session,
2. pause in `paused_for_approval`,
3. create an approval row with type `outbound_network`,
4. resume only after `POST /v1/runs/:runId/approvals/:approvalId/resolve`.

## Failure Patterns

- `Invalid session status transition`: a workflow is skipping the named session lifecycle.
- `RunCoordinatorDO was not initialized before use`: a workflow path is publishing events before initializing the coordinator.
- `uv_interface_addresses returned Unknown system error 1`: `wrangler dev` was started inside the restricted sandbox boundary on this host.
- empty or stalled compile output: confirm the backend is reachable at `http://localhost:10531/v1/chat/completions`.
- `defines multiple executable components`: the project materializes multiple code components but still lacks an explicit compile-target selector for Phase 4/5 runtime proof.
