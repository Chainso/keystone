# Keystone Cloudflare Prototype

Keystone M1 is a single hand-authored Cloudflare Worker project that proves:

- tenant-scoped run intake over HTTP
- durable run and task orchestration with Cloudflare Workflows
- realtime run projection with Durable Objects and WebSockets
- file-first artifact persistence in R2 with Postgres as the operational index
- sandboxed task execution with session sandboxes and task worktrees
- provider-backed compile using the local OpenAI-compatible chat-completions endpoint at `http://localhost:4001`

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

## Demo Flow

With Wrangler dev running:

```bash
npm run demo:run
npm run demo:validate -- --run-id=<run-id-from-demo-run>
```

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
