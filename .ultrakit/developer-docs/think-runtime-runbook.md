# Keystone Think Runtime Runbook

## Purpose

Use this runbook when you need to exercise the shipped Think-backed fixture path end to end. In Phase 1, that still means a fixture-backed workflow contract: the stable Think proof is deterministic `thinkMode=mock`, while `thinkMode=live` only swaps the Think turn onto the live local model backend.

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

Expected signals:

- Wrangler prints `Ready on http://127.0.0.1:<port>`
- bindings show `RUN_WORKFLOW`, `TASK_WORKFLOW`, `TASK_SESSION`, `KEYSTONE_THINK_AGENT`, `ARTIFACTS_BUCKET`, and `HYPERDRIVE`
- the sandbox container image is discovered successfully

If Wrangler binds a different port because `8787` is already occupied, export the actual ready URL:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
```

## Sanity Checks

```bash
curl -i "${KEYSTONE_BASE_URL:-http://127.0.0.1:8787}/v1/health"
npx wrangler workflows list --local
```

Healthy output should show `200 OK` for `/v1/health` and both `run-workflow` plus `task-workflow` in the local workflow list.

## Rerun the Think Demo Path

Run the exact stable Think validation path from repo root:

```bash
KEYSTONE_AGENT_RUNTIME=think npm run demo:run
KEYSTONE_AGENT_RUNTIME=think npm run demo:validate
```

What that pair proves today:

- `demo:run` defaults Think requests to `thinkMode=mock`
- the compile and task handoff behavior stays on the current fixture-backed contract
- `demo:validate` proves archived completion plus the expected Think artifact/session shape for that shipped path

For a live-model inspection-oriented Think turn, use the dedicated convenience path:

```bash
npm run demo:run:think-live
KEYSTONE_AGENT_RUNTIME=think npm run sandbox:shell
```

What changes in that path:

- `demo:run:think-live` sends runtime `think` with `thinkMode=live`
- the Think turn uses the configured local OpenAI-compatible chat-completions backend instead of `mockModelPlan`
- sandbox preservation is enabled for that run, so `TaskWorkflow` archives the task session for inspection instead of destroying the sandbox container
- `sandbox:shell` lets you inspect the preserved container while local Wrangler is still running
- this path is still fixture-backed in Phase 1; it does not yet prove live compile or compiled task handoffs

If you are performing an ad hoc manual rerun and need to provide the run id explicitly, use this convenience form instead:

```bash
KEYSTONE_AGENT_RUNTIME=think npm run demo:validate -- --run-id=<run-id-from-demo-run>
```

What these scripts actually check today:

- `demo:run` sends `X-Keystone-Agent-Runtime: think`, defaults to `thinkMode=mock` unless explicitly overridden, creates the fixture-backed run, and polls until the run reaches `archived` with at least one `run_summary` artifact
- `demo:validate` re-reads the run summary and asserts:
  - run status is `archived`
  - at least three sessions exist
  - at least five artifacts exist
  - at least one `run_summary` artifact exists
  - at least one promoted `run_note` artifact exists for runtime `think`

What these scripts do not prove yet:

- live compile output for the Think path
- compiled task handoffs replacing the current fixture-backed Think gate
- a full `decision package -> live compile -> compiled task handoff -> live Think execution` workflow proof

## Supporting Local Smokes

These are narrower checks that do not replace the end-to-end demo rerun:

```bash
npm run sandbox:smoke
npm run think:smoke
```

- `sandbox:smoke` proves bridge projection and staged-output handling
- `think:smoke` proves the deterministic implementer turn, including a staged markdown note promoted as `run_note`

## Failure Patterns

- `uv_interface_addresses returned Unknown system error 1`: `wrangler dev` was started inside the restricted Codex sandbox boundary on this host
- `Expected at least one promoted run_note artifact for the Think runtime`: the Think task path did not promote staged `/artifacts/out` files through `TaskWorkflow`
- `The Think runtime is only wired for the fixture-backed Phase 4 task path`: a non-fixture repo/task was sent through the current Think runtime
