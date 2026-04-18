# Keystone Cloudflare Prototype

Keystone is a single Cloudflare Worker project that currently proves:

- durable `Project` objects as the backend boundary for code components, non-secret env vars, and review/test defaults
- tenant-scoped run intake over HTTP
- durable run and task orchestration with Cloudflare Workflows
- realtime run projection with Durable Objects and WebSockets
- file-first artifact persistence in R2 with Postgres as the operational index
- sandboxed task execution with session sandboxes and task worktrees
- provider-backed compile and Think live-model turns using the local OpenAI-compatible chat-completions endpoint at `http://localhost:10531`
- a runtime selector that keeps `scripted` as the default path, preserves a deterministic `think/mock` validation mode, and enables a fixture-scoped live compile plus Think task demo through the same `/v1/runs` entrypoint

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

## Project-Backed Backend

The current backend contract is project-first:

- `POST /v1/projects`, `GET /v1/projects`, `GET /v1/projects/:projectId`, and `PUT /v1/projects/:projectId` manage durable project config and now return canonical `data`/`meta` envelopes
- `POST /v1/runs` now requires `projectId` plus a typed `decisionPackage` reference; direct repo-backed run intake is no longer supported
- project components materialize under `/workspace/code/<component-key>`
- project env vars are non-secret only in `v1`

The current UI-first `v1` surface is centered on:

- `GET /v1/projects/:projectId/documents`
- `GET /v1/projects/:projectId/decision-packages`
- `GET /v1/projects/:projectId/runs`
- `POST /v1/runs`
- `GET /v1/runs/:runId`
- `GET /v1/runs/:runId/graph`
- `GET /v1/runs/:runId/tasks`
- `GET /v1/runs/:runId/tasks/:taskId`
- `GET /v1/runs/:runId/tasks/:taskId/conversation`
- `POST /v1/runs/:runId/tasks/:taskId/conversation/messages`
- `GET /v1/runs/:runId/tasks/:taskId/artifacts`
- `GET /v1/runs/:runId/approvals`
- `GET /v1/runs/:runId/approvals/:approvalId`
- `GET /v1/runs/:runId/evidence`
- `GET /v1/runs/:runId/integration`
- `GET /v1/runs/:runId/release`
- `GET /v1/artifacts/:artifactId`
- `GET /v1/artifacts/:artifactId/content`

`GET /v1/runs/:runId/stream` is the canonical UI stream path. `GET /v1/runs/:runId/events` and `GET /v1/runs/:runId/ws` are still available as legacy/debug seams during the transition.

For local validation, the fixture bootstrap helper converges on one deterministic fixture project per tenant:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
npm run demo:ensure-project
```

Run that only after Wrangler dev is already serving the local API. `demo:run` already calls the same helper automatically before it posts the run.

Current limitation:

- project-backed compile still requires exactly one unambiguous executable component; multi-component compile-target selection is deferred until a real product concept exists

## Demo Flow

With Wrangler dev running, target the exact `Ready on http://127.0.0.1:<port>` URL that Wrangler prints. If `8787` is already occupied, export the actual ready URL first:

```bash
export KEYSTONE_BASE_URL=http://127.0.0.1:<port-from-ready-line>
```

Then run one of the supported demo pairs:

```bash
npm run demo:run
npm run demo:validate
```

These commands cover three distinct contracts today:

- `npm run demo:run` plus `npm run demo:validate`: the default scripted fixture path.
- `KEYSTONE_AGENT_RUNTIME=think npm run demo:run` plus `KEYSTONE_AGENT_RUNTIME=think npm run demo:validate`: the deterministic mock-backed Think validation path on the current fixture-project workflow contract.
- `KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:run` plus `KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate`: the live full-workflow Think proof on the current fixture-project happy path.

All three flows create project-backed runs through the stored `fixture-demo-project`. The demo helper now reads the committed fixture decision package locally and posts it as an inline `decisionPackage: { source: "inline", payload: ... }` reference to `/v1/runs`.

For a zero-argument live rerun after you have exported the runtime once, use:

```bash
export KEYSTONE_AGENT_RUNTIME=think
export KEYSTONE_THINK_DEMO_MODE=live
npm run demo:run
npm run demo:validate
```

That live pair now proves the current end-to-end happy path from `/v1/runs` input through:

- live compile
- persisted `run_plan` and `task_handoff` artifacts
- compiled Think task execution
- promoted `run_note`
- archived `run_summary`

The proof remains intentionally narrow:

- `scripted` stays the default runtime
- `runtime=think` without an explicit mode still defaults to deterministic `thinkMode=mock`
- the live proof is fixture-scoped to the stored `fixture-demo-project` plus committed decision package
- the compiled plan must stay on the approved single independent task shape, with no `dependsOn`

`demo:run` persists only the last successful archived run under `.keystone/demo-last-run.json`. `demo:validate` reuses that state only when you do not supply `--run-id` or `KEYSTONE_RUN_ID`.

For ad hoc manual validation when you need to supply the run id yourself, the convenience form is:

```bash
npm run demo:validate -- --run-id=<run-id-from-demo-run>
```

The scripted path stays the default runtime and should yield a `task_log` artifact. The deterministic Think pair is still:

```bash
KEYSTONE_AGENT_RUNTIME=think npm run demo:run
KEYSTONE_AGENT_RUNTIME=think npm run demo:validate
```

That Think pair remains the stable validation path because `thinkMode` defaults to `mock`.

For a live-model Think turn that keeps the sandbox available for inspection after the run finishes, use:

```bash
npm run demo:run:think-live
KEYSTONE_AGENT_RUNTIME=think npm run sandbox:shell
```

`demo:run:think-live` is the inspection-oriented convenience wrapper for the same live compile plus compiled Think task path. It also forces sandbox preservation on the run so the container is not destroyed at the end of the task workflow.

For ad hoc manual Think validation when you need to supply the run id explicitly, use:

```bash
KEYSTONE_AGENT_RUNTIME=think KEYSTONE_THINK_DEMO_MODE=live npm run demo:validate -- --run-id=<run-id-from-demo-run>
```

The current Think path is intentionally narrow:

- runtime selection is accepted through `X-Keystone-Agent-Runtime` and defaults to `scripted`
- `thinkMode=mock` is the deterministic validation default for Think requests
- `thinkMode=live` now means live compile plus compiled Think task execution on the approved fixture-project happy path
- the live proof still accepts only the fixture-project single independent task shape and rejects compiled `dependsOn` edges
- the Think implementer stages durable files under `/artifacts/out`, and `TaskWorkflow` promotes those staged files into canonical R2-backed `run_note` artifacts
- final run success is still anchored on a `run_summary` artifact and an archived run session

For manual API validation outside the helper scripts, create or update a project first and then submit `/v1/runs` with `projectId` plus a typed decision-package reference. The currently launchable path is inline payloads:

```json
{
  "projectId": "<project-id>",
  "decisionPackage": {
    "source": "inline",
    "payload": {
      "decisionPackageId": "demo-greeting-update",
      "summary": "Update the deterministic demo target.",
      "objectives": ["Keep fixture tests passing."],
      "tasks": [
        {
          "taskId": "task-greeting-tone",
          "title": "Adjust the greeting implementation",
          "acceptanceCriteria": ["Fixture tests remain green."]
        }
      ]
    }
  },
  "options": {
    "thinkMode": "mock",
    "preserveSandbox": false
  }
}
```

## Local Auth

Local dev auth uses:

- `Authorization: Bearer <KEYSTONE_DEV_TOKEN>`
- `X-Keystone-Tenant-Id: <tenant-id>`

Start from `.dev.vars.example` and keep local overrides in `.dev.vars`.

## Additional Docs

- [M1 architecture](.ultrakit/developer-docs/m1-architecture.md)
- [M1 local runbook](.ultrakit/developer-docs/m1-local-runbook.md)
- The linked architecture and runbook documents now describe the current UI-first `v1` API, even though the filenames still carry the earlier M1 naming.
- [Think runtime architecture](.ultrakit/developer-docs/think-runtime-architecture.md)
- [Think runtime runbook](.ultrakit/developer-docs/think-runtime-runbook.md)
