# Notes

Agent-written observations about effective working patterns and durable project or user preferences in this project. This file is updated during the documentation phase of each execution plan based on what the agent observed.

These notes help future agents work effectively without rediscovering project-specific knowledge from scratch.

## Guidelines

- Only record knowledge specific to THIS project that could not be known without working in it
- `AGENTS.md` takes precedence over `CLAUDE.md`; in many repos they are the same file or symlinked
- If a note contradicts either file, flag it to the user instead
- Keep concise — this should read as a tight cheat sheet, not a journal

## Project Notes

- Local Worker dev on this host must run outside the Codex sandbox boundary; otherwise `wrangler dev` fails before serving traffic with `uv_interface_addresses returned Unknown system error 1`.
- Local Wrangler startup on this host still has to run outside the Codex sandbox boundary, but it no longer needs a host `CLOUDFLARE_API_TOKEN` just for Think model access because the Worker no longer binds Cloudflare `AI` for local validation.
- `npm run build` still reproduces the same sandbox limitation on this host: `vite build` completes, then Wrangler/Docker fail on writes under `~/.config/.wrangler` and `~/.docker/buildx/activity`. Revalidated again on 2026-04-21; use a host shell when you need the full build proof.
- The local chat-completions backend is plain HTTP at `http://localhost:10531`, streams SSE chunks by default, and is the shared backend for M1 compile plus the live Think model path.
- The fixture happy path depends on `npm test` inside the sandboxed task worktree; task workflows assume the target repo can run that command.
- The operator-facing demo shortcut lives in `.keystone/demo-last-run.json`: `demo:run` only updates it after a successful archived run, and `demo:validate` ignores it whenever `--run-id` or `KEYSTONE_RUN_ID` is supplied.
- `demo:run` now bootstraps or updates the stored `fixture-demo-project` before posting `/v1/runs`, so manual local validation should start from `npm run demo:ensure-project` when a project id is needed outside the helper flow.
- The current live Think full-workflow proof is still fixture-scoped to one compiled independent task; the validator rejects compiled `dependsOn` edges and broader task graphs.
- Project-backed compile currently requires exactly one explicit executable target. Multi-component projects materialize correctly for task workspaces, but compile-time selection fails clearly until a product-level selector exists.
- `npm run run:local` now matches the UI-first `/v1/runs` contract and defaults to the committed fixture decision package as an inline decision-package payload.
- Direct `wrangler workflows trigger run-workflow --local` must keep `RunCoordinatorDO` initialization inside the workflow path itself because the HTTP create-run path is not present there to seed the coordinator first.
- If port `8787` is already occupied, `wrangler dev` may bind another local port. Use Wrangler's `Ready on ...` URL via `KEYSTONE_BASE_URL` or the scripts' `--base-url=` flag instead of assuming `127.0.0.1:8787`.
- The current UI scaffold contract is minimal-board-first: keep `ui/src/routes/` as thin route/layout containers, keep destination rendering under `ui/src/features/**/components/`, and do not reintroduce hero/aside/right-rail narration unless `design/workspace-spec.md` changes.
- The only checked-in UI scaffold source of truth is `ui/src/features/resource-model/`; if a future UI pass needs placeholder data, extend selectors or the normalized dataset there instead of recreating destination-local scaffold files.
- `ui/src/routes/projects/project-configuration-layout.tsx` owns only the `new` vs `settings` shell split; `ui/src/features/projects/components/project-configuration-tabs.tsx` owns tab-specific board content, so future project work should extend those feature components instead of pushing section/card rendering back into the route file.
- The live project-management loop is now real across the shell/sidebar, `New project`, `Project settings`, and the full `Runs` destination. `Documentation` and `Workstreams` still rely on scaffold selectors and must keep explicit compatibility states for non-scaffold live projects until a later plan cuts them over.
- The shipped `Runs` path now belongs to `ui/src/features/runs/run-management-api.ts` plus `RunDetailProvider`; do not route real run detail back through `ui/src/features/resource-model/`.
- Protected browser project-management requests now rely on one shared UI seam in `ui/src/features/projects/project-management-api.ts`; local defaults are `KEYSTONE_DEV_TOKEN=change-me-local-token` and `KEYSTONE_DEV_TENANT_ID=tenant-dev-local`, and callers should not start duplicating those headers.
- Current planning preference: do not introduce first-class `Thread` or `Lease` primitives unless a concrete Keystone gap appears that Think or the Cloudflare runtime cannot already cover.
