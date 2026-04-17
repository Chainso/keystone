# Keystone Cloudflare Prototype

Keystone is a single Cloudflare Worker project that currently proves:

- tenant-scoped run intake over HTTP
- durable run and task orchestration with Cloudflare Workflows
- realtime run projection with Durable Objects and WebSockets
- file-first artifact persistence in R2 with Postgres as the operational index
- sandboxed task execution with session sandboxes and task worktrees
- provider-backed compile and Think live-model turns using the local OpenAI-compatible chat-completions endpoint at `http://localhost:10531`
- a runtime selector that keeps `scripted` as the default path and enables a Think-backed implementer turn for the fixture demo task

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
npm run build
npm run dev -- --ip 127.0.0.1 --show-interactive-dev-session=false
```

`npm run dev` no longer needs a host `CLOUDFLARE_API_TOKEN` just to satisfy the Think runtime. The Think-backed model path now uses `KEYSTONE_CHAT_COMPLETIONS_BASE_URL` and `KEYSTONE_CHAT_COMPLETIONS_MODEL` directly.

## Demo Flow

With Wrangler dev running, target the exact `Ready on http://127.0.0.1:<port>` URL that Wrangler prints. If `8787` is already occupied, export the actual ready URL first:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
```

Then run:

```bash
npm run demo:run
npm run demo:validate
```

For ad hoc manual validation when you need to supply the run id yourself, the convenience form is:

```bash
npm run demo:validate -- --run-id=<run-id-from-demo-run>
```

The scripted path stays the default runtime and should yield a `task_log` artifact. The exact Phase 5 Think gate uses:

```bash
KEYSTONE_AGENT_RUNTIME=think npm run demo:run
KEYSTONE_AGENT_RUNTIME=think npm run demo:validate
```

For a live-model Think demo that keeps the sandbox available for inspection after the run finishes, use:

```bash
npm run demo:run:think-live
KEYSTONE_AGENT_RUNTIME=think npm run sandbox:shell
```

`demo:run:think-live` routes the Think turn through the real local chat-completions backend instead of the deterministic mock model path and sets sandbox preservation on the run so the container is not destroyed at the end of the task workflow.

For ad hoc manual Think validation when you need to supply the run id explicitly, use:

```bash
KEYSTONE_AGENT_RUNTIME=think npm run demo:validate -- --run-id=<run-id-from-demo-run>
```

The current Think path is intentionally narrow:

- runtime selection is accepted through `X-Keystone-Agent-Runtime` and defaults to `scripted`
- only the fixture-backed `task-greeting-tone` task is wired for `think`
- the Think implementer stages durable files under `/artifacts/out`, and `TaskWorkflow` promotes those staged files into canonical R2-backed `run_note` artifacts
- final run success is still anchored on a `run_summary` artifact and an archived run session

You can also submit a run directly:

```bash
npm run run:local
```

## Local Auth

Local dev auth uses:

- `Authorization: Bearer <KEYSTONE_DEV_TOKEN>`
- `X-Keystone-Tenant-Id: <tenant-id>`

Start from `.dev.vars.example` and keep local overrides in `.dev.vars`.

## Additional Docs

- [M1 architecture](.ultrakit/developer-docs/m1-architecture.md)
- [M1 local runbook](.ultrakit/developer-docs/m1-local-runbook.md)
- [Think runtime architecture](.ultrakit/developer-docs/think-runtime-architecture.md)
- [Think runtime runbook](.ultrakit/developer-docs/think-runtime-runbook.md)
