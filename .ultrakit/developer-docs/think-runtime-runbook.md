# Keystone Think Runtime Runbook

## Purpose

Use this runbook when you need to exercise the shipped demo contracts end to end. Keystone now has three operator-facing proofs:

- `scripted` remains the default fixture path
- `runtime=think` plus `thinkMode=mock` remains the deterministic Think validation path
- `runtime=think` plus `thinkMode=live` now proves the current live happy path from `/v1/runs` input through live compile, persisted compiled handoff artifacts, Think task execution, promoted `run_note`, and archived `run_summary`

The live proof is still intentionally narrow: it stays on the committed fixture repo plus committed decision package, and the compiled plan must remain a single independent task with no `dependsOn`.

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

## Rerun the Demo Paths

Run the scripted default pair from repo root:

```bash
npm run demo:run
npm run demo:validate
```

What that proves today:

- `scripted` is still the default runtime when no override is supplied
- the fixture-backed scripted task path archives normally
- `demo:validate` expects a promoted `task_log` on the scripted path

Run the deterministic Think validation pair from repo root:

```bash
KEYSTONE_AGENT_RUNTIME=think npm run demo:run
KEYSTONE_AGENT_RUNTIME=think npm run demo:validate
```

What that pair proves today:

- `demo:run` defaults Think requests to `thinkMode=mock`
- the compile and task handoff behavior stays on the current fixture-backed contract
- `demo:validate` proves archived completion plus the expected Think artifact/session shape for that shipped path

Run the live full-workflow Think pair from repo root:

```bash
export KEYSTONE_AGENT_RUNTIME=think
export KEYSTONE_THINK_DEMO_MODE=live
npm run demo:run
npm run demo:validate
```

What that pair proves today:

- the run starts at `/v1/runs` and uses the live compile path
- `RunWorkflow` persists `decision_package`, `run_plan`, and `task_handoff` before task fanout
- `TaskWorkflow` executes the persisted compiled handoff through the Think implementer path
- the Think turn promotes at least one `run_note`
- the run finishes archived with `run_summary`
- the proof remains fixture-scoped to the committed demo repo plus committed decision package
- the compiled handoff must stay on the current single independent task shape, with empty `dependsOn`

The zero-argument `npm run demo:run` -> `npm run demo:validate` live pair works because `demo:run` stores only the last successful archived run under `.keystone/demo-last-run.json`, and `demo:validate` reuses that state only when you do not supply an explicit `--run-id` or `KEYSTONE_RUN_ID`.

For a live-model inspection-oriented Think turn, use the dedicated convenience path:

```bash
npm run demo:run:think-live
KEYSTONE_AGENT_RUNTIME=think npm run sandbox:shell
```

What changes in that path:

- `demo:run:think-live` runs the same live compile plus compiled Think task path
- it sends runtime `think` with `thinkMode=live`
- the Think turn uses the configured local OpenAI-compatible chat-completions backend instead of `mockModelPlan`
- sandbox preservation is enabled for that run, so `TaskWorkflow` archives the task session for inspection instead of destroying the sandbox container
- `sandbox:shell` lets you inspect the preserved container while local Wrangler is still running
- this path stays on the same fixture-scoped single-task happy path as the non-preserved live pair; it is an inspection wrapper, not a different proof

If you are performing an ad hoc manual rerun and need to provide the run id explicitly, use this convenience form instead:

```bash
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate -- --run-id=<run-id-from-demo-run>
```

What these scripts actually check today:

- `demo:run` sends `X-Keystone-Agent-Runtime`, defaults to `scripted`, defaults Think requests to `thinkMode=mock` unless explicitly overridden, creates the fixture-backed run, and polls until the run reaches `archived` with at least one `run_summary` artifact
- `demo:run` writes `.keystone/demo-last-run.json` only when the run reaches `archived`; failed or cancelled runs do not overwrite the last-successful shortcut
- `demo:validate` re-reads the run summary and asserts:
  - run status is `archived`
  - at least three sessions exist
  - at least five artifacts exist
  - at least one `run_summary` artifact exists
  - at least one promoted `run_note` artifact exists for runtime `think`
  - at least one promoted `task_log` artifact exists for runtime `scripted`
- `demo:validate` uses `.keystone/demo-last-run.json` only when you do not pass `--run-id` and do not set `KEYSTONE_RUN_ID`; explicit validation inputs bypass the persisted state file entirely

What these scripts do not prove yet:

- arbitrary repo ingestion outside the committed fixture repo
- multi-task or dependent-task Think execution; the current validator requires a single independent compiled task with empty `dependsOn`
- additional Think roles beyond the implementer turn

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
- `Provide --run-id=<id>, set KEYSTONE_RUN_ID, or run demo:run first.`: `demo:validate` could not find an explicit run id and there is no last-successful `.keystone/demo-last-run.json` shortcut yet
- fixture-scoped validator errors around task shape or `dependsOn`: the live compiled plan fell outside the currently supported single independent task contract
