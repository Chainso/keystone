# Keystone Cloudflare Prototype

This repository contains the Keystone Milestone 1 scaffold on Cloudflare Workers.

The current phase establishes:

- a hand-authored Worker project using Hono
- a validated run-input contract for repo and decision-package submission
- a local dev auth path with tenant scoping
- deterministic fixture assets for the first end-to-end demo run

## Commands

Run these from the repository root:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
docker compose up -d postgres
npm run dev
```

Local secrets and overrides belong in `.dev.vars`, starting from `.dev.vars.example`.
