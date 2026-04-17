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
- Local Wrangler startup also needs a valid host `CLOUDFLARE_API_TOKEN` because the Worker keeps a remote `AI` binding; a placeholder token fails early against the Cloudflare `/memberships` API before the local Worker is ready.
- The local chat-completions backend is plain HTTP at `http://localhost:4001`, streams SSE chunks by default, and is the only supported M1 compile backend.
- The fixture happy path depends on `npm test` inside the sandboxed task worktree; task workflows assume the target repo can run that command.
- Direct `wrangler workflows trigger run-workflow --local` must keep `RunCoordinatorDO` initialization inside the workflow path itself because the HTTP create-run path is not present there to seed the coordinator first.
- If port `8787` is already occupied, `wrangler dev` may bind another local port. Use Wrangler's `Ready on ...` URL via `KEYSTONE_BASE_URL` or the scripts' `--base-url=` flag instead of assuming `127.0.0.1:8787`.
