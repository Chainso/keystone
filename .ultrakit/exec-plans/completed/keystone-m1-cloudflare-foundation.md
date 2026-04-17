# Keystone M1 Cloudflare Foundation

## Purpose / Big Picture

Milestone 1 turns this repository from a design-only workspace into a runnable Keystone prototype on Cloudflare. After this plan is complete, a developer should be able to start the project locally, submit a demo `DecisionPackage`, watch a durable run progress through API and WebSocket updates, execute one or two real task changes inside a sandboxed workspace, and inspect the resulting artifacts and evidence in R2-backed storage with Neon-backed operational records.

The observable outcome is not "some infrastructure exists." The observable outcome is a single end-to-end Keystone run that proves the four hardest claims in the specs:

- durable orchestration over long-running work,
- file-first artifacts and evidence,
- multi-tenant control-plane boundaries, and
- full local development and debugging support.

## Backward Compatibility

Backward compatibility with an existing shipped implementation is not required because the repository does not yet contain an application scaffold, runtime code, or published API surface. The repo currently contains product and architecture documents only.

Compatibility is still required at the contract level:

- Preserve the repository vocabulary defined in `product-specs/keystone-relaxed-design.md` and `product-specs/platform-vs-vertical.md`: `Maestro` is the reusable kernel, `Keystone` is the software-delivery vertical.
- Preserve the M1 kernel contract names: `AgentDefinition`, `EnvironmentDefinition`, `RuntimeProfile`, `SessionSpec`, `Session`, `WorkspaceInstance`, `SessionEvent`, and `ArtifactRef`.
- Preserve the named session lifecycle so later milestones extend the same states instead of renaming them midstream: `configured -> provisioning -> ready -> active -> archived`, with `paused_for_approval` reserved but only minimally exercised in M1.
- Preserve the file-first storage stance: workflow meaning and evidence live in repo files and R2; Postgres stores operational indexes and references only.

## Design Decisions

1. **Date:** 2026-04-13  
   **Decision:** Implement M1 as a single TypeScript Cloudflare Worker project with native Workers/DO/Workflows bindings in one repository root.  
   **Rationale:** The repo is currently empty of runtime code, and the specs explicitly recommend starting as one Worker project to simplify local development and avoid premature service-boundary complexity.  
   **Alternatives considered:** Splitting into multiple Workers or packages immediately; using a service-binding-heavy monorepo from day one.

2. **Date:** 2026-04-13  
   **Decision:** Treat `product-specs/keystone-m1.md` as the milestone source of truth for acceptance, while using `keystone-relaxed-design.md`, `platform-vs-vertical.md`, and `keystone-on-cloudflare.md` as architectural constraints and vocabulary sources.  
   **Rationale:** `keystone-m1.md` contains the most concrete implementation checklist and milestone acceptance criteria; the other specs refine architecture and boundary decisions.  
   **Alternatives considered:** Treating all four documents as equal checklists, which would blur milestone scope and invite contradictory implementation detail.

3. **Date:** 2026-04-13  
   **Decision:** Use the file-first model exactly as described in the specs: R2 plus repo files are the source of truth for workflow meaning and evidence; Neon/Postgres is the operational index only.  
   **Rationale:** This is the core product bet repeated across the design docs and the Cloudflare M1 doc. It also keeps M1 evolvable because artifact formats can change without schema churn.  
   **Alternatives considered:** Modeling tasks, reviews, and evidence primarily in SQL; storing full workflow state inside Workflow step output.

4. **Date:** 2026-04-13  
   **Decision:** Freeze the M1 Maestro kernel around the required runtime primitives only: `Session`, `WorkspaceInstance`, `SessionEvent`, and `ArtifactRef`, while naming `Thread`, `Approval`, and `Lease` as forward-compatible expansion points.  
   **Rationale:** The platform-vs-vertical and relaxed-design specs both call this out as the correct M1 cut. It keeps the kernel narrow enough to implement now while preventing naming churn later.  
   **Alternatives considered:** Building thread orchestration and full lease management into M1 before the first end-to-end run exists; leaving the kernel vocabulary undefined until after coding starts.

5. **Date:** 2026-04-13  
   **Decision:** Use session-level sandboxes with task-scoped worktrees inside the sandbox for the happy-path M1 demo, but keep the boundary between task execution and sandbox provisioning explicit so later milestones can move to sandbox-per-task if required.  
   **Rationale:** This matches the intent in the specs and proves the worktree-based execution story without forcing M1 to solve the full isolation matrix.  
   **Alternatives considered:** Sandbox-per-task from day one; running tasks directly in the Worker with no sandbox boundary.

6. **Date:** 2026-04-13  
   **Decision:** Implement `RunWorkflow` and `TaskWorkflow` as the only Workflow entrypoints in M1. Compile, integration, verification, and finalization are modeled as named phases and helper modules underneath those workflows rather than separate workflow classes.  
   **Rationale:** The Cloudflare M1 checklist explicitly recommends starting with `RunWorkflow` and `TaskWorkflow` only. This is sufficient to prove the durable orchestration pattern while keeping event history and code structure manageable.  
   **Alternatives considered:** Creating `CompileWorkflow`, `IntegrationWorkflow`, `GlobalVerificationWorkflow`, and `FinalizationWorkflow` during M1; collapsing everything into Durable Objects only.

7. **Date:** 2026-04-13  
   **Decision:** Prove M1 against a committed fixture repository and committed fixture decision package inside this repo, rather than relying on an external target repository during initial validation.  
   **Rationale:** The repository currently has no code and no external runtime wiring. A local deterministic fixture is the fastest way to prove compile -> task execution -> integration -> verification -> finalization end to end and keep local development reproducible.  
   **Alternatives considered:** Running the first Keystone job against this infrastructure repo itself; requiring a user-supplied external repository before M1 is valid.

8. **Date:** 2026-04-14  
   **Decision:** Use a custom OpenAI-compatible chat-completions backend for M1 at `http://localhost:4001`, with model name `gemini-3-flash-preview`, instead of AI Gateway. Do not implement an offline LLM fallback path in M1.  
   **Rationale:** The user already operates a custom routing backend and wants live provider behavior to be the only supported compile path in M1. The actual local endpoint is plain HTTP, not TLS, which keeps the LLM integration surface aligned with the working local deployment shape while freeing Wrangler to use its default local port.  
   **Alternatives considered:** AI Gateway; deterministic fixture-only compilation fallback when credentials or provider routing are unavailable.

9. **Date:** 2026-04-13  
   **Decision:** M1 operator visibility is delivered through HTTP APIs, WebSocket event streaming, R2 artifacts, and runbook commands, not through a full dedicated web or desktop UI.  
   **Rationale:** The design docs define the operator journey, but the M1 implementation checklist does not require a polished UI. A stable API/WS/event contract is the correct first slice and unblocks later UI work without forcing premature frontend decisions.  
   **Alternatives considered:** Shipping a UI before the execution kernel is real; omitting realtime observability entirely until a future milestone.

10. **Date:** 2026-04-14  
    **Decision:** Use Hono for routing and middleware, Zod for payload validation, `postgres.js` as the direct Hyperdrive-compatible Postgres client, and Drizzle ORM as the relational access layer for M1.  
    **Rationale:** Hono keeps Worker routing ergonomic without forcing a heavyweight framework. Zod gives explicit schema validation at the HTTP and event boundaries. Drizzle works cleanly with `postgres.js`, preserves SQL visibility for the small operational schema, and avoids the complexity of a heavier ORM.  
    **Alternatives considered:** Raw fetch routing; handwritten validation; `pg`; raw SQL only; larger ORMs with more hidden runtime behavior.

11. **Date:** 2026-04-14  
    **Decision:** Defer sandbox backup/restore and snapshotting out of M1.  
    **Rationale:** Snapshotting is explicitly optional in the source specs and is not required to prove durable orchestration, file-first artifacts, or the long-command pattern. Removing it keeps M1 focused on the core execution path.  
    **Alternatives considered:** Implementing backup/restore as part of the first sandbox lifecycle slice.

12. **Date:** 2026-04-14  
    **Decision:** Defer Analytics Engine and metrics work out of M1. Logs, WebSocket progress, run summaries, and event/artifact inspection remain the required observability surface.  
    **Rationale:** Basic success/failure metrics are useful, but they are not on the critical path to proving the end-to-end M1 run. The user explicitly deprioritized analytics in favor of execution and integration work.  
    **Alternatives considered:** Adding Analytics Engine counters and dashboards during the first milestone.

13. **Date:** 2026-04-14  
    **Decision:** Run the custom chat-completions backend on `localhost:4001` and keep the local Keystone Worker on Wrangler's default local port `127.0.0.1:8787`.  
    **Rationale:** This restores the standard local Worker development port and avoids special-case port documentation for Keystone.  
    **Alternatives considered:** Keeping the chat-completions backend on `8787` and moving the Worker to `8788`.

14. **Date:** 2026-04-14  
    **Decision:** M1 must support user-supplied repo plus decision-package input for real runs, while retaining committed fixtures as the deterministic baseline validation path.  
    **Rationale:** Fixtures are the safest way to prove the system end to end, but milestone 1 should also let the operator run the system on an actual repo and approved decision package instead of only a canned demo.  
    **Alternatives considered:** Fixtures only; arbitrary repo support without any deterministic fixture baseline.

15. **Date:** 2026-04-14  
    **Decision:** Use a real Hyperdrive binding in M1 from the start, but point its `localConnectionString` at local Docker Postgres for development and validation. Neon remains deferred until a later hosted environment is needed.  
    **Rationale:** This preserves the long-term Cloudflare-shaped configuration surface while removing the need to provision Neon during M1 bootstrap. It proves the app against the same binding contract we expect in deployed environments, while accepting that local mode does not exercise Hyperdrive's hosted pooling and cache path.  
    **Alternatives considered:** Requiring Neon immediately for all M1 development; bypassing Hyperdrive entirely in local development; abstracting the database behind a non-Postgres interface.

16. **Date:** 2026-04-14  
    **Decision:** Hand-author the Cloudflare Worker scaffold in this repository instead of adopting `create-cloudflare` or another generated template as the canonical project layout. Use official Cloudflare docs and generated examples only as reference material.  
    **Rationale:** Keystone M1 needs a very specific backend-oriented shape: one Worker project with Hono, Durable Objects, Workflows, Hyperdrive, R2, sandbox integration, and no full-stack frontend template noise. A manual scaffold keeps the layout aligned with the architecture decisions already locked in this plan and avoids spending early phases deleting or restructuring generic starter output.  
    **Alternatives considered:** Using `create-cloudflare` output directly; using a Hono full-stack starter and stripping it down later.

17. **Date:** 2026-04-14  
    **Decision:** Define `POST /v1/runs` around a normalized run input contract that accepts either a local repo path or a git URL plus optional ref, and either a local decision-package path or an inline decision-package payload.  
    **Rationale:** M1 needs to support both deterministic local use and future remote-oriented execution without redesigning the API after the first milestone. A normalized contract lets the API stay stable while the implementation chooses the right ingestion path.  
    **Alternatives considered:** Local paths only; inline payloads only; separate endpoints for local and remote inputs.

18. **Date:** 2026-04-14  
    **Decision:** Use a documented dev auth path for local development that still exercises tenant extraction, instead of requiring full production JWT setup before M1 can run locally.  
    **Rationale:** Tenant scoping is essential in M1, but production-grade auth should not block local execution of the system. A dev auth mode preserves the control-plane boundary while keeping local setup lightweight.  
    **Alternatives considered:** Full JWT-only auth from day one; no auth at all in local mode.

19. **Date:** 2026-04-14  
    **Decision:** Do not add a first-class operator CLI in M1. The operator surface remains the Worker API, WebSocket stream, and helper scripts.  
    **Rationale:** The core milestone is proving the backend execution system. A dedicated CLI would be a convenience layer over the same API and is not required to validate the hard parts of M1.  
    **Alternatives considered:** Shipping a `keystone` CLI in M1; making the CLI the primary entrypoint instead of the API.

20. **Date:** 2026-04-14  
    **Decision:** Use the following local configuration env var names in M1: `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`, `KEYSTONE_DEV_TENANT_ID`, `KEYSTONE_DEV_TOKEN`, `KEYSTONE_CHAT_COMPLETIONS_BASE_URL`, and `KEYSTONE_CHAT_COMPLETIONS_MODEL`.  
    **Rationale:** These names are explicit, stable, and separate Cloudflare-provided binding configuration from Keystone-owned local runtime config.  
    **Alternatives considered:** Ad hoc env var names invented during implementation; overloading unrelated Wrangler vars.

21. **Date:** 2026-04-14  
    **Decision:** Use a simple Hono module layout: `src/index.ts` for Worker export wiring, `src/http/app.ts` for app creation, `src/http/router.ts` for route registration, `src/http/middleware/` for cross-cutting concerns, and `src/http/handlers/` for endpoint logic.  
    **Rationale:** This is enough structure to keep HTTP concerns clear without creating unnecessary layering in a greenfield repo.  
    **Alternatives considered:** All routes inline in `src/index.ts`; deeply nested feature-based HTTP modules before the app exists.

22. **Date:** 2026-04-14  
    **Decision:** Use `drizzle-kit` as the Drizzle companion package for schema generation and migration workflow in M1.  
    **Rationale:** It is the standard companion tool for Drizzle and is sufficient for the small SQL-first operational schema in this milestone.  
    **Alternatives considered:** Raw SQL only with no Drizzle tooling; switching to a different ORM-specific migration tool.

23. **Date:** 2026-04-14  
    **Decision:** Standardize local dev auth on `Authorization: Bearer <KEYSTONE_DEV_TOKEN>` plus tenant extraction from `X-Keystone-Tenant-Id`, with the dev token checked only in local/dev mode.  
    **Rationale:** This keeps the auth path close to production request handling while making tenant scoping explicit and easy to exercise during local development.  
    **Alternatives considered:** A custom one-off debug header only; disabling auth entirely in local mode.

24. **Date:** 2026-04-16  
    **Decision:** Record `Think` as the preferred future harness for Keystone agent turns, but keep orchestration, approvals, artifact promotion, and durable truth in Keystone Workflows, R2, and Postgres.  
    **Rationale:** The product specs already assume a filesystem-first sandbox environment with mounted or projected artifact inputs. A Think-backed harness can take advantage of that environment with basic file and bash tooling without changing the product boundary or making Think session storage canonical.  
    **Alternatives considered:** Continue toward a fully custom chat/tool loop; expose only bespoke artifact RPC tools instead of a filesystem-like environment; let Think own orchestration or artifact truth.

## Execution Log

- **Date:** 2026-04-13  
  **Phase:** Planning  
  **Decision:** Register the M1 execution plan before creating any runtime code because the work is multi-phase, cross-cutting, and starts from a docs-only repository.  
  **Rationale:** This follows the Ultrakit plan contract and avoids mixing architectural decisions into implementation work.

- **Date:** 2026-04-13  
  **Phase:** Planning  
  **Decision:** Treat the current repository baseline as "no build, lint, test, or runtime exists yet" rather than inventing placeholder commands.  
  **Rationale:** The baseline needs to reflect the real repo state so later contributors can distinguish greenfield setup from regressions.

- **Date:** 2026-04-14  
  **Phase:** Planning  
  **Decision:** Record the user's dependency and integration choices before execution: Hono, Zod, Drizzle on `postgres.js`, no snapshotting, no Analytics Engine in M1, and a custom local chat-completions backend instead of AI Gateway.  
  **Rationale:** These are architectural-enough decisions that later contributors should not rediscover or override them during implementation.

- **Date:** 2026-04-14  
  **Phase:** Planning  
  **Decision:** Treat fixtures as the baseline proof path, not the only input mode. M1 execution must also accept a real repo and decision package supplied by the operator.  
  **Rationale:** This keeps milestone proof deterministic while still making the system genuinely usable.

- **Date:** 2026-04-14  
  **Phase:** Planning  
  **Decision:** Default local development to Hyperdrive with `localConnectionString` pointed at Docker Postgres, instead of requiring Neon.  
  **Rationale:** M1 should be locally runnable with minimal external setup while still keeping the real production binding shape.

- **Date:** 2026-04-14  
  **Phase:** Planning  
  **Decision:** Make the Worker scaffold manual and explicit. Do not rely on Cloudflare init scripts as the source of truth for repository structure.  
  **Rationale:** The project needs a backend-first scaffold with custom bindings and modules, not a generic starter that we immediately diverge from.

- **Date:** 2026-04-14  
  **Phase:** Planning  
  **Decision:** Lock the run API and local auth defaults now so implementation does not invent incompatible request shapes or ad hoc local bypasses later.  
  **Rationale:** These are small but foundational interface decisions. They are cheaper to settle once now than to retrofit after multiple phases depend on them.

- **Date:** 2026-04-14  
  **Phase:** Phase 1  
  **Decision:** Keep the first runnable scaffold intentionally narrow: one Hono-based Worker entrypoint, one placeholder `POST /v1/runs` route, a strict run-input contract, and tests that prove contract and auth behavior without introducing placeholder Durable Objects or workflows yet.  
  **Rationale:** This satisfies the Phase 1 deliverables while preserving the planned module boundaries and avoiding fake runtime machinery that later phases would immediately replace.

- **Date:** 2026-04-14  
  **Phase:** Phase 1  
  **Decision:** Add a root `README.md`, a standard `docker-compose.yml`, and a small fixture repository plus decision package as part of the bootstrap rather than treating them as optional extras.  
  **Rationale:** The scaffold needs a runnable local developer path and a deterministic proof target. The standard Compose filename also matches the plan's `docker compose up -d postgres` validation command without extra flags.

- **Date:** 2026-04-14  
  **Phase:** Phase 1  
  **Decision:** Extend the generated Worker bindings locally with `KEYSTONE_DEV_TOKEN` in `src/env.d.ts` instead of hand-editing generated Wrangler types.  
  **Rationale:** `wrangler types` does not infer local dev secrets from `.dev.vars`, but the middleware still needs a typed local auth secret. A narrow extension keeps generated bindings authoritative while making the dev auth path compile cleanly.

- **Date:** 2026-04-14  
  **Phase:** Phase 2  
  **Decision:** Keep the operational schema SQL-first in `migrations/0001_m1_operational_core.sql`, use Drizzle only as the typed repository boundary, and run migrations through a small checked-in TypeScript migrator instead of generating the first migration from ORM metadata.  
  **Rationale:** The plan already fixes the first migration as a hand-authored SQL artifact. A tiny checked-in migrator keeps the schema legible, preserves the file-first stance, and still lets later phases use Drizzle repositories against a stable table model.

- **Date:** 2026-04-14  
  **Phase:** Phase 2  
  **Decision:** Store `tenant_id` as `text` across the Phase 2 operational tables instead of `uuid`.  
  **Rationale:** The committed Phase 1 dev auth contract and examples already use freeform tenant identifiers such as `tenant-dev-local` and `tenant-smoke`. Using `text` keeps the database aligned with the accepted local control-plane contract without forcing a second tenant identifier translation layer into M1.

- **Date:** 2026-04-14  
  **Phase:** Phase 2  
  **Decision:** Make DB repository integration tests opt-in via `KEYSTONE_RUN_DB_TESTS=1`, while still supporting a full live Postgres proof path in validation.  
  **Rationale:** The repository should keep a fast default `npm test` path, but the phase still needs end-to-end DB proof. Opt-in live DB tests satisfy both needs and avoid coupling every local unit test run to Docker availability.

- **Date:** 2026-04-14  
  **Phase:** Phase 3  
  **Decision:** Use one `RunCoordinatorDO` per `{tenantId, runId}` pair, addressed by a deterministic DO name and exposing both RPC methods (`initialize`, `publish`, `getSnapshot`) and a `fetch()` websocket upgrade surface.  
  **Rationale:** Phase 3 needs a realtime hub and summary projection source before workflows exist. A deterministic tenant+run DO gives the HTTP layer a single place to publish and read live state without introducing broader coordination machinery yet.

- **Date:** 2026-04-14  
  **Phase:** Phase 3  
  **Decision:** Persist the accepted run input (`repo`, `decisionPackage`, `authMode`) in the root run session metadata for now instead of creating extra workflow or artifact rows before execution begins.  
  **Rationale:** The API contract must already accept real repo and decision-package input, but workflow fanout and artifact materialization are explicitly out of scope for this phase. Session metadata is the narrowest durable place to hold the accepted request shape until later phases compile and artifactize it.

- **Date:** 2026-04-14  
  **Phase:** Phase 4  
  **Decision:** Model sandbox hydration through a narrow `TaskSessionDO` plus helper modules, with fixture seeding implemented as inline repo files and git worktrees created inside the sandbox.  
  **Rationale:** This keeps the sandbox boundary explicit for later workflow phases and gives M1 a deterministic local proof path without entangling host filesystem access into the Worker runtime.

- **Date:** 2026-04-14  
  **Phase:** Phase 4  
  **Decision:** Add a dev-only smoke route that drives `TaskSessionDO` end to end, instead of expanding the public run API before workflows exist.  
  **Rationale:** The phase needs a repeatable proof path for sandbox + workspace + background process behavior, but public control-plane contracts should remain stable until Phase 5 workflows own execution startup.

- **Date:** 2026-04-15  
  **Phase:** Phase 4  
  **Decision:** Keep sandbox build-context and ID/session constraints explicit in local helpers instead of relying on trial-and-error during live Sandbox SDK runs.  
  **Rationale:** Wrangler resolves `image: "./sandbox/Dockerfile"` with the `sandbox/` directory as Docker build context, Sandbox IDs must remain DNS-safe after truncation, and probing execution-session existence by calling `createSession()` first produces noisy avoidable errors in the live smoke path.

- **Date:** 2026-04-15  
  **Phase:** Planning / Re-sequencing  
  **Decision:** Treat the custom chat-completions integration as a required gate for Phase 7 end-to-end proof, but not as a prerequisite for Phase 5 workflow seam development.  
  **Rationale:** `RunWorkflow` and `TaskWorkflow` should be able to land and validate durable orchestration, task fanout, polling, and artifact persistence using a deterministic compile placeholder. The real provider integration must exist before milestone acceptance, but it should not block workflow implementation sequencing unnecessarily.

- **Date:** 2026-04-15  
  **Phase:** Planning / Re-sequencing  
  **Decision:** Pull the live custom chat-completions client and compile-path integration ahead of workflow implementation, while leaving security gating and approval plumbing after workflows.  
  **Rationale:** The user wants the system to use the real provider-backed compile path as early as possible. That is a reasonable dependency to front-load because it sharpens the real compile contract without requiring the whole security-and-approvals phase to move with it.

- **Date:** 2026-04-15  
  **Phase:** Phase 6 (provider slice)  
  **Decision:** Treat the local chat-completions backend as plain HTTP and consume its streamed SSE chunk format directly, rather than assuming a TLS or non-streaming OpenAI response shape.  
  **Rationale:** The real endpoint that passed validation is `http://localhost:4001/v1/chat/completions`, and it emits `data:` chat-completion chunks ending with `[DONE]`. Building the compile client against the actual local wire format is required to make the pre-workflow compile seam real.

- **Date:** 2026-04-16  
  **Phase:** Planning / Phase 8 docs  
  **Decision:** Update the product specs now to capture the Think-backed harness direction and expand the remaining documentation phase to include those spec changes, without rewriting completed M1 implementation phases around a not-yet-implemented runtime swap.  
  **Rationale:** The right place to fold this decision in is the architecture and milestone docs plus the unfinished plan work. That preserves the integrity of the completed execution history while giving later contributors a clear harness direction.

- **Date:** 2026-04-16  
  **Phase:** Phase 7 / Phase 8 resume  
  **Decision:** Stop assuming `http://127.0.0.1:8787` for helper scripts and runbook commands; the Phase 7 demo flow must target Wrangler's actual `Ready on ...` URL through `KEYSTONE_BASE_URL` or an explicit `--base-url` flag.  
  **Rationale:** On this host, a stale local server on `8787` intercepted the first scripted rerun while the newly started Wrangler session bound `8788`. The milestone demo needs an explicit base-url path so it always validates the intended Worker instance.

- **Date:** 2026-04-17  
  **Phase:** Phase 7 / Phase 8 completion  
  **Decision:** Archive the M1 plan after rerunning the fixture demo and validation scripts against the live Worker at `http://127.0.0.1:8787` and confirming the expected artifact counts and archived status.  
  **Rationale:** The milestone proof now exists in the repo plus the checked-in documentation. Keeping the plan open after a passing rerun would misrepresent the actual state of the work.

## Progress

- [x] 2026-04-13 Discovery completed from `product-specs/keystone-m1.md`, `product-specs/keystone-on-cloudflare.md`, `product-specs/keystone-relaxed-design.md`, and `product-specs/platform-vs-vertical.md`.
- [x] 2026-04-13 Active execution plan created and registered in `.ultrakit/exec-plans/active/index.md`.
- [x] 2026-04-14 Dependency and integration choices locked: Hono, Zod, Drizzle + `postgres.js`, custom local chat-completions backend, no snapshotting, no Analytics Engine in M1.
- [x] 2026-04-14 Input mode decision locked: M1 supports real repo + decision package input and keeps fixtures for deterministic validation.
- [x] 2026-04-14 Database target decision locked: Hyperdrive binding retained in M1, with `localConnectionString` backed by local Docker Postgres.
- [x] 2026-04-14 Scaffold decision locked: hand-authored Worker project, official Cloudflare scaffold used as reference only.
- [x] 2026-04-14 Remaining execution defaults locked: normalized run input contract, dev auth path, no first-class CLI in M1.
- [x] 2026-04-14 Implementation defaults locked: env var names, Hono module layout, `drizzle-kit`, and dev auth header conventions.
- [x] 2026-04-14 Plan approved for execution and moved from `Awaiting Approval` to `In Progress`.
- [x] 2026-04-14 Phase 1 execution started: manual Worker scaffold, local tooling, dev auth contract, and deterministic fixture assets in progress.
- [x] 2026-04-14 Phase 1 completed: root Worker scaffold, generated bindings, Docker Postgres path, placeholder routes, tests, and deterministic fixtures are in place and validated in commit `220cdb3`.
- [x] 2026-04-14 Phase 2 execution started: operational schema, migration runner, Drizzle schema, event repository, and artifact key helpers in progress.
- [x] 2026-04-14 Phase 2 completed: SQL schema, migrator, Drizzle repositories, Maestro kernel contracts, and artifact/event helpers validated against Docker Postgres in commit `bf9c158`.
- [x] 2026-04-14 Phase 3 execution started: tenant-aware run API, approval route shape, realtime coordinator DO, and WebSocket surface in progress.
- [x] 2026-04-14 Phase 3 completed: tenant-aware run create/read APIs, approval resolution shape, coordinator DO, and websocket route validated locally.
- [x] 2026-04-14 Phase 4 execution started: sandbox bindings, task-session DO, workspace repositories, process polling helpers, and a deterministic smoke route landed in the working tree.
- [x] 2026-04-15 Phase 4 completed: sandbox image builds, Wrangler local dev starts with container bindings outside the Codex sandbox boundary, and `POST /internal/dev/sandbox-smoke` completes successfully with a sandboxed `npm test` run.
- [x] 2026-04-15 Phase dependency clarified: live custom chat-completions integration should land before workflow implementation; security gating and approvals can remain after workflows.
- [x] 2026-04-15 Provider-backed compile slice completed ahead of workflows: the local HTTP chat-completions client, compile artifact persistence, and authenticated `POST /internal/dev/compile-smoke` validation against `http://localhost:4001` are in place.
- [x] 2026-04-15 Phase 5 execution started: workflow bindings, deterministic workflow ids, artifact-backed task fanout, and run finalization landed in the working tree.
- [x] 2026-04-15 Phase 5 completed: `RunWorkflow` and `TaskWorkflow` now pass static validation, `POST /v1/runs` completes a real fixture-backed run to `archived`, and a fresh direct `npx wrangler workflows trigger run-workflow --local` instance also completes after the coordinator/bootstrap fixes.
- [x] 2026-04-15 Phase 6 completed: outbound allow-list enforcement now gates the chat-completions backend, git-url repo inputs create durable approval requests and wait-event wiring, and targeted `npm run test:security` / `npm run test:workflows` validation is in place.
- [x] 2026-04-16 Phase 6 follow-up fix completed: the live `gitUrl` approval path now reaches `paused_for_approval` and resumes on approval after removing per-request Hyperdrive client shutdown and dropping the incorrect implicit `main` branch fallback for unpinned git repos.
- [x] 2026-04-16 Product specs updated to record the Think-backed harness direction while preserving Keystone ownership of workflows, artifacts, approvals, and operational truth.
- [x] 2026-04-16 Demo helper scripts and runbook guidance updated to accept an explicit Wrangler base URL after a stale `8787` server intercepted the first Phase 7 rerun attempt.
- [x] 2026-04-17 Phase 7 completed: the fixture demo reran successfully against the live Worker, `npm run demo:run` archived run `a7dd14dc-3b0b-4044-bd9a-a04bd151b5da` on `http://127.0.0.1:8787`, and `npm run demo:validate` confirmed `sessions: 3` and `artifacts.total: 5`.
- [x] 2026-04-17 Phase 8 completed: the local runbook, README, project notes, and product-spec context now document the validated demo flow, the explicit `KEYSTONE_BASE_URL` pattern, and the Think-backed harness direction for future agent turns.
- [x] Phase 1: Scaffold the Worker project, local developer tooling, and deterministic fixture assets.
- [x] Phase 2: Build the operational core: schema, DAL, kernel contracts, event model, and artifact storage helpers.
- [x] Phase 3: Build the API surface, tenant guards, and realtime `RunCoordinatorDO`.
- [x] Phase 4: Build `TaskSessionDO`, sandbox lifecycle management, and workspace/worktree handling.
- [x] Phase 5: Build `RunWorkflow` and `TaskWorkflow` with durable long-running execution and artifact persistence.
- [x] Phase 6: Add security gating, approval plumbing, and custom chat-completions compile behavior.
- [x] Phase 7: Prove the end-to-end run, observability flow, and local runbook.
- [x] Phase 8: Update developer documentation, project notes, and milestone closeout evidence.

## Surprises & Discoveries

- **2026-04-13:** The repository contains only `product-specs/` and `.ultrakit/` planning assets. There is no `package.json`, `wrangler.jsonc`, `src/`, `sandbox/`, or migration directory yet. This means M1 must include initial project scaffolding, not just feature work.
- **2026-04-13:** `product-specs/keystone-m1.md` and `product-specs/keystone-on-cloudflare.md` overlap heavily, but `keystone-m1.md` includes the clearest milestone checklist and acceptance language. The plan uses that document as the milestone authority to avoid duplicate or conflicting acceptance tracking.
- **2026-04-13:** The design documents define the operator journey and stable product vocabulary, but they do not require a polished UI in M1. The correct M1 cut is backend/API/WS/artifact visibility first.
- **2026-04-13:** `git status --short` shows an untracked `.codex` path in the worktree. It is unrelated to M1 and should not be reverted or folded into runtime code changes unless it becomes directly relevant.
- **2026-04-14:** The custom chat-completions service will run at `http://localhost:4001`, which frees the local Keystone Worker to keep Wrangler's default `127.0.0.1:8787` port.
- **2026-04-14:** Fixtures are still needed even though M1 will accept real repo input. They are the controlled baseline that tells contributors whether the system is broken versus whether a user-supplied repo/package combination is unusual or invalid.
- **2026-04-14:** The original specs assume Neon/Hyperdrive, but M1 can keep the Hyperdrive-shaped app boundary without provisioning Neon by pointing Hyperdrive `localConnectionString` at Docker Postgres.
- **2026-04-14:** Cloudflare's bootstrap tools are useful references but are not a good canonical starting point for this repo because they optimize for generic Worker or full-stack templates rather than the backend-only Keystone architecture.
- **2026-04-14:** The smallest safe local auth model is "real tenant extraction with a dev credential path," not "skip auth entirely." That preserves the multi-tenant control-plane contract without forcing production auth infrastructure into Phase 1.
- **2026-04-14:** The Phase 1 file list originally referenced `.docker-compose.yml`, but the validation command uses `docker compose up -d postgres` without `-f`. The implementation uses the standard `docker-compose.yml` filename so the documented command works as written.
- **2026-04-14:** During Phase 1, `wrangler types` did not include the local dev secret because `.dev.vars` was not present yet. After Phase 3 regenerated bindings with `.dev.vars` in place, the generated `Env` also included `KEYSTONE_DEV_TOKEN` and the local Hyperdrive connection string. The manual `WorkerBindings` extension is now just a compatibility shim rather than the primary source of that binding type.
- **2026-04-14:** Wrangler local commands that generate types or bind a port require execution outside the sandbox in this environment because Wrangler writes under `~/.config/.wrangler` and needs direct localhost access. This affected `npm run cf-typegen`, `npm run dev`, and the local `curl` smoke checks.
- **2026-04-14:** The source DDL examples use `tenant_id uuid`, but the accepted M1 local auth path and fixture examples already use non-UUID tenant identifiers. Phase 2 stores `tenant_id` as `text` to keep the persisted contract aligned with the current operator-facing input shape.
- **2026-04-14:** `tsx` uses a local IPC socket and the sandbox cannot connect to the Docker Postgres port, so `npm run db:migrate` and the live DB repository tests must run outside the sandbox in this environment even though the code itself is valid.
- **2026-04-14:** The websocket upgrade proof path is easiest to verify from Wrangler’s local request log. A plain `curl` websocket handshake against the live route times out without showing the DO’s initial message frame, but Wrangler logs the request as `101 Switching Protocols`, which is sufficient validation for this phase.
- **2026-04-14:** After Sandbox SDK was added in Phase 4, `wrangler deploy --dry-run` began requiring a Docker CLI that supports the `buildx`/`--load` path used for local container builds. On this host, `docker buildx` is unavailable and `docker build --load` exits with code `125`.
- **2026-04-14:** Local `wrangler dev` with container bindings fails on this host before serving requests with `uv_interface_addresses returned Unknown system error 1`, even when bindings and `.dev.vars` load correctly. That prevents live sandbox smoke validation in the current environment despite green typecheck/lint/test results.
- **2026-04-15:** Wrangler resolves `image: "./sandbox/Dockerfile"` with the Docker build context rooted at `sandbox/`, so Dockerfile `COPY` paths must be relative to that directory rather than the repository root.
- **2026-04-15:** Sandbox IDs must stay DNS-safe after final truncation. A helper that slugifies components and then blindly slices the assembled ID can still produce a trailing `-`, which the Sandbox SDK rejects at runtime.
- **2026-04-15:** In this environment, `wrangler dev` with container bindings succeeds when run outside the Codex sandbox boundary even though the same command fails inside it with `uv_interface_addresses returned Unknown system error 1`. The remaining Phase 4 issues were code-level, not platform-level.
- **2026-04-15:** The local chat-completions backend is plain HTTP rather than HTTPS, and it streams SSE `data:` chat-completion chunks by default. A `stream: false` probe did not return a usable JSON payload within the same timeout window, so the M1 client should consume the streamed chunk format directly.
- **2026-04-15:** The direct local workflow trigger path exercises a different bootstrap seam from the HTTP create-run path. `RunWorkflow` must initialize `RunCoordinatorDO` before the first published event, otherwise `npx wrangler workflows trigger run-workflow --local` errors even though the API-driven path appears healthy.
- **2026-04-15:** The named session lifecycle is strict enough that the run session cannot skip `configured -> provisioning -> ready -> active`. The first live workflow proof surfaced this immediately.
- **2026-04-15:** A host-side escalation refusal can block additional local HTTP validation calls even after the repo code is ready. That is separate from the Worker code and should be recorded explicitly instead of worked around indirectly.
- **2026-04-16:** The Think discussion clarified that the product specs already planned a filesystem-first sandbox plus mounted artifact projections. That makes a Think-backed harness a better fit than a bespoke artifact-RPC tool surface, as long as Think stays inside Keystone’s existing workflow and artifact boundaries.
- **2026-04-16:** A fixed `127.0.0.1:8787` assumption is unsafe for the M1 demo helpers. If another local server is already bound there, Wrangler may choose a different port and the scripts can silently hit the wrong Worker unless `KEYSTONE_BASE_URL` or `--base-url` is set from the actual `Ready on ...` line.
- **2026-04-16:** The `CONNECTION_ENDED` failure on the approval-gated `gitUrl` path was a real implementation bug, not just host instability. Ending the `postgres.js` client on Worker/Hyperdrive request paths can kill later awaited queries in the workflow step. Worker-scoped Hyperdrive clients should not call `sql.end()` on the normal request/workflow close path.
- **2026-04-16:** Defaulting unpinned `gitUrl` repos to branch `main` is too strong for M1. For remote repos with no explicit `ref`, the sandbox checkout path should use the remote default branch instead of assuming `main`.

## Outcomes & Retrospective

Planning outcome on 2026-04-13:

- The milestone 1 execution path is now explicit, phased, and bound to the actual current repo state.
- The plan resolves the major product and architecture choices that would otherwise force design decisions during implementation.
- Execution has not started yet. The next contributor should begin with Phase 1 and keep this plan current as work progresses.

Phase 1 outcome on 2026-04-14:

- The repository now has a hand-authored Cloudflare Worker scaffold with stable `npm` scripts, Hono routing, strict Zod-backed run-input validation, local dev auth middleware, and generated Worker binding types in commit `220cdb3` (`Bootstrap Keystone Cloudflare worker scaffold`).
- Deterministic fixture assets now exist under `fixtures/demo-target/` and `fixtures/demo-decision-package/`, giving later workflow phases a committed proof target.
- Validation completed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `docker compose up -d postgres`, and `npm run dev` with successful `GET /healthz` and authenticated `POST /v1/runs` smoke responses on `127.0.0.1:8787`.
- Phase 2 can now build on real repository structure and contracts instead of inventing them during database and kernel work.

Phase 2 outcome on 2026-04-14:

- The repository now has a checked-in operational core: `migrations/0001_m1_operational_core.sql`, a reusable migration runner, typed Drizzle table definitions, repository modules for sessions/events/artifacts, deterministic artifact key helpers, and stable Maestro session/kernel contracts.
- Validation completed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run db:migrate`, and opt-in live DB repository tests against Docker Postgres with `KEYSTONE_RUN_DB_TESTS=1`.
- Phase 3 can now implement tenant-aware HTTP routes and realtime Durable Object projections against real persistence modules rather than placeholders.

Phase 3 outcome on 2026-04-14:

- The repository now exposes a real tenant-scoped control plane: `POST /v1/runs`, `GET /v1/runs/:runId`, `POST /v1/runs/:runId/approvals/:approvalId/resolve`, `GET /v1/runs/:runId/ws`, and `GET /v1/health`.
- `RunCoordinatorDO` is now configured in Wrangler, exported from the Worker entrypoint, and used as the live summary and websocket coordination layer for run state.
- Validation completed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and live local smoke checks showing `/v1/health -> 200`, `POST /v1/runs -> 202`, `GET /v1/runs/:runId -> 200`, and `/v1/runs/:runId/ws -> 101 Switching Protocols`.
- Phase 4 can now focus on task-session coordination and sandbox/workspace orchestration without reopening the HTTP or realtime route contracts.

Phase 4 outcome on 2026-04-15:

- The repository now has a real task execution plane: `TaskSessionDO`, sandbox session helpers, workspace/worktree materialization, sandbox image assets, workspace binding persistence, and a dev-only smoke route that exercises the full path end to end.
- Validation completed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `docker compose up -d postgres`, `npm run dev`, `GET /v1/health -> 200`, and authenticated `POST /internal/dev/sandbox-smoke -> 200` with a completed sandboxed `npm test` process.
- The next active slice is the provider-backed compile integration pulled forward from Phase 6. Workflows should consume that real compile path rather than a placeholder seam.

Provider-backed compile slice outcome on 2026-04-15:

- The repository now has a real local chat-completions client boundary in `src/lib/llm/chat-completions.ts`, a reusable compile service in `src/keystone/compile/plan-run.ts`, inline deterministic decision-package fixture data, and a dev-only `POST /internal/dev/compile-smoke` route for pre-workflow provider validation.
- Validation completed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run dev`, `GET /v1/health -> 200`, and authenticated `POST /internal/dev/compile-smoke -> 200` against `http://localhost:4001/v1/chat/completions`, yielding a persisted run plan, one task handoff artifact, and compile usage metadata from the live provider.
- Phase 5 can now start against the real compile contract instead of a placeholder seam. The remaining Phase 6 work is the security gating and approval plumbing after workflows land.

Phase 5 outcome on 2026-04-15:

- The repository now has real durable workflow entrypoints in `src/workflows/RunWorkflow.ts` and `src/workflows/TaskWorkflow.ts`, deterministic workflow/session ids, idempotent run-plan loading, task-handoff artifact loading, and run finalization with a persisted run-summary artifact.
- Validation completed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npx wrangler workflows list --local`, a fresh direct `npx wrangler workflows trigger run-workflow --local` instance that completed successfully, and live local API proof showing `POST /v1/runs -> 202` followed by `GET /v1/runs/{id} -> archived` with `decision_package`, `run_plan`, `task_handoff`, `task_log`, and `run_summary` artifacts.
- The workflow seam now survives the two live issues that surfaced during validation: strict session lifecycle enforcement and coordinator initialization order for direct local workflow triggers.

Phase 6 outcome on 2026-04-15:

- The repository now has explicit policy modules under `src/lib/security/`, a durable approval-request service under `src/lib/approvals/service.ts`, approval resolution that sends Workflow events back to `RUN_WORKFLOW`, and an allow-listed outbound check around the local chat-completions backend.
- Validation completed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:security`, `npm run test:workflows`, and `npm run build`.
- The remaining live gap is a rerun of the new approval-gated git-url path, which was blocked by a host-side escalation refusal unrelated to the repository code.

Phase 7 outcome on 2026-04-17:

- The repository now has a passing operator-facing demo proof: `npm run demo:run` against `http://127.0.0.1:8787` archived run `a7dd14dc-3b0b-4044-bd9a-a04bd151b5da`, and `npm run demo:validate` confirmed the expected archived run shape with `sessions: 3` and `artifacts.total: 5`.
- The local Worker launch path is now resilient to a busy `8787` by using `KEYSTONE_BASE_URL` or `--base-url=` against Wrangler's actual `Ready on ...` port.
- The final validation transcript is captured in the plan artifacts section and the local runbook so another contributor can reproduce it without chat history.

Phase 8 outcome on 2026-04-17:

- The checked-in developer docs now explain the live M1 runtime, the local runbook, the validated demo commands, and the future Think-backed harness direction.
- `.ultrakit/notes.md` now captures the host-specific Wrangler port behavior so future runs do not silently hit a stale worker.
- The milestone is ready for archive because the docs match the scripts and the scripts match the passing live demo.

## Context and Orientation

Current repository state:

- `product-specs/keystone-m1.md` contains the M1 acceptance checklist, workstreams, and Cloudflare-specific implementation guidance.
- `product-specs/keystone-relaxed-design.md` defines the Keystone versus Maestro boundary, the file-first artifact model, the M1 kernel contract, and example file schemas.
- `product-specs/platform-vs-vertical.md` locks the kernel API vocabulary, session lifecycle, and platform-versus-vertical boundaries.
- `product-specs/keystone-on-cloudflare.md` reinforces the Cloudflare implementation approach and immediate M1 decision points.
- `.ultrakit/exec-plans/plan-contract.md` defines the mandatory structure and maintenance rules for this plan.

Implementation context to create during M1:

- Root project config: `package.json`, `tsconfig.json`, `wrangler.jsonc`, `eslint.config.js`, `vitest.config.ts`, `.dev.vars.example`, `.gitignore`.
- Framework and library choices are now fixed for M1: Hono, Zod, Drizzle ORM, and `postgres.js`.
- Bootstrap approach: manually create the Worker scaffold and bindings in this repo; use official Cloudflare templates and docs only to confirm current config conventions.
- Hono layout for M1: `src/index.ts`, `src/http/app.ts`, `src/http/router.ts`, `src/http/middleware/`, and `src/http/handlers/`.
- Worker source tree: `src/index.ts`, `src/http/`, `src/durable-objects/`, `src/workflows/`, `src/lib/`, `src/maestro/`, `src/keystone/`.
- Database and storage support: `migrations/`, R2 artifact helpers, and Hyperdrive-aware Postgres client helpers.
- Local database runtime: Docker Postgres reached through Hyperdrive `localConnectionString` during default development and validation.
- Sandbox assets: `sandbox/Dockerfile` and support scripts for the local sandbox image.
- Deterministic validation assets: `fixtures/demo-target/` and `fixtures/demo-decision-package/`.
- Operator-supplied execution inputs: local repo path or repo reference plus a decision-package path or payload accepted by the run creation API.
- Run API shape for M1: accept `repo.localPath` or `repo.gitUrl` plus optional `repo.ref`, and accept `decisionPackage.localPath` or inline `decisionPackage.payload`.
- Dev auth shape for M1: `Authorization: Bearer <KEYSTONE_DEV_TOKEN>` and `X-Keystone-Tenant-Id: <tenant>`.
- Local env vars for M1: `KEYSTONE_DEV_TENANT_ID`, `KEYSTONE_DEV_TOKEN`, `KEYSTONE_CHAT_COMPLETIONS_BASE_URL`, `KEYSTONE_CHAT_COMPLETIONS_MODEL`, plus Cloudflare's `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`.
- Local scripts and runbooks: `scripts/` plus `.ultrakit/developer-docs/` updates.
- Agent runtime direction: future Keystone agent roles should prefer a Think-backed harness that operates against the real sandbox filesystem and projected artifact directories rather than bespoke artifact-only tools.

Target runtime shape for M1:

- One Worker project hosting HTTP routes, Durable Objects, and Workflows bindings.
- Hyperdrive binding retained as the Worker-facing database interface in M1.
- Local Docker Postgres used behind Hyperdrive `localConnectionString` for default M1 development and validation.
- LLM calls sent to the user's custom OpenAI-compatible backend at `http://localhost:4001` using model `gemini-3-flash-preview`.
- R2 bucket used for large artifacts and evidence, with DB rows storing references only.
- A real run path that accepts operator-supplied repo and decision-package input.
- A fixture-based end-to-end run that remains the deterministic compile -> execute 1-2 tasks -> integrate -> verify -> finalize baseline.
- Local tenant-scoped execution available through a documented dev auth path.

## Plan of Work

The work starts with project bootstrap because there is no runtime scaffold at all. Once the repository can build and run locally, the next priority is the operational core: kernel contracts, event storage, artifact references, and a real schema. Only after those foundations exist should the plan add HTTP routes, realtime coordination, sandbox orchestration, and workflows.

The execution path intentionally builds from the kernel outward:

1. establish the project skeleton, input contracts, local auth path, and deterministic fixtures,
2. implement the durable operational model,
3. expose a control plane through HTTP and Durable Objects,
4. connect sandboxes and workspaces,
5. add durable workflows that drive task execution,
6. enforce the security and compile-time control-plane edges,
7. validate the entire run end to end, and
8. update documentation and operator runbooks.

This sequence keeps each phase small enough for a single contributor while ensuring later phases are building on real abstractions rather than placeholders.

The remaining documentation work should now also capture the Think-backed harness direction without pretending that M1 already implemented it. The completed phases remain workflow/sandbox/artifact work; the unfinished docs need to describe how those pieces become the execution environment for future agent roles.

### Phase 1: Scaffold the repository and fixture assets

Create the first runnable project skeleton. This phase establishes the TypeScript and Wrangler configuration, npm scripts, lint/typecheck/test/build commands, initial Worker entrypoint, the run-input contract for repo and decision-package submission, the local dev auth path, and a deterministic demo repository plus decision package that later phases can execute against. The scaffold should be written directly in this repository rather than copied from a generated Cloudflare starter. The Worker can still return placeholder responses at the end of this phase; the goal is a buildable scaffold and a known validation target.

#### Phase Handoff

**Goal**  
Create a clean hand-authored Cloudflare Worker project skeleton with a defined run-input contract, local auth path, and deterministic demo assets so later phases can build real features on a stable baseline.

**Scope Boundary**  
In scope: project config, toolchain setup, root scripts, placeholder source tree, run-input request shape, local auth contract, fixture repo, fixture decision package, baseline validation commands, and explicit binding/type generation workflow for the manual scaffold.  
Out of scope: real DB access, real workflows, real Durable Object behavior, real sandbox execution logic.

**Read First**  
`product-specs/keystone-m1.md`  
`product-specs/keystone-relaxed-design.md`  
`product-specs/platform-vs-vertical.md`  
`.ultrakit/exec-plans/plan-contract.md`

**Files Expected To Change**  
`README.md`  
`package.json`  
`package-lock.json`  
`tsconfig.json`  
`wrangler.jsonc`  
`eslint.config.js`  
`vitest.config.ts`  
`docker-compose.yml`  
`.dev.vars.example`  
`.gitignore`  
`worker-configuration.d.ts`  
`src/index.ts`  
`src/env.d.ts`  
`src/http/app.ts`  
`src/http/router.ts`  
`src/http/handlers/runs.ts`  
`src/http/middleware/**`  
`src/http/contracts/run-input.ts`  
`src/http/contracts/dev-auth.ts`  
`tests/http/**`  
`fixtures/demo-target/**`  
`fixtures/demo-decision-package/**`

**Validation**  
Run from repo root:

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Success means all commands complete, local Postgres can be started through Docker, Hyperdrive local configuration is present, generated Worker binding types are available, and `npm run dev` starts a local Worker with placeholder route responses on Wrangler's default local port without conflicting with the custom LLM server on `http://localhost:4001`.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and the Phase 1 handoff status fields.

**Deliverables**  
A buildable hand-authored Worker scaffold, initial npm scripts, generated binding types, a defined repo-plus-decision-package run contract, a documented dev auth path, and committed fixture assets for the M1 demo path.

**Commit Expectation**  
`Bootstrap Keystone Cloudflare worker scaffold`

**Known Constraints / Baseline Failures**  
Before Phase 1 there is no `package.json`, no build pipeline, and no runtime code. The contributor is creating the baseline, not fixing an existing implementation. Do not check in a generic scaffold that obscures the intended module boundaries.

**Status**  
Completed on 2026-04-14.

**Completion Notes**  
Landed the manual Worker scaffold in commit `220cdb3` with `package.json`, TypeScript/Vitest/ESLint config, `wrangler.jsonc`, generated `worker-configuration.d.ts`, Hono app/router/auth contracts, fixture assets, and a root runbook `README.md`. Validation passed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `docker compose up -d postgres`, and live Wrangler dev smoke checks on `127.0.0.1:8787` returning `GET /healthz -> 200` and `POST /v1/runs -> 202` with the documented dev auth headers.

**Next Starter Context**  
Phase 1 is done. Start Phase 2 from the new scaffold by reading `src/http/contracts/`, `src/http/middleware/auth.ts`, `worker-configuration.d.ts`, `wrangler.jsonc`, and the fixture assets for context, then add the operational core under `migrations/`, `src/lib/`, and `src/maestro/` without changing the Phase 1 HTTP contract shape.

### Phase 2: Build the operational core

Implement the persistent spine that every later phase depends on: schema DDL, migration scripts, Hyperdrive-aware DB client wiring, kernel contract types, session/event/artifact abstractions, and deterministic R2 key helpers. This phase should not yet orchestrate runs, but it must make the data model and module boundaries real.

#### Phase Handoff

**Goal**  
Create the M1 operational core so runs, events, approvals, workspace bindings, leases, and artifact references have a real durable model.

**Scope Boundary**  
In scope: SQL schema, migration path, Hyperdrive binding configuration for local mode, DB access layer, artifact key generation, event type definitions, Maestro kernel contracts, and repository-level data helpers.  
Out of scope: HTTP handlers, Durable Object route handling, sandbox APIs, workflow execution.

**Read First**  
`product-specs/keystone-m1.md` sections "Minimal operational core schema and artifact layout" and "M1 implementation plan"  
`product-specs/keystone-relaxed-design.md` sections "Minimum Maestro contract", "Minimal durable database schema and event model", and "File schemas and examples"  
This plan's "Design Decisions" and "Context and Orientation"

**Files Expected To Change**  
`package.json`  
`package-lock.json`  
`tsconfig.json`  
`migrations/0001_m1_operational_core.sql`  
`docker-compose.yml`  
`src/maestro/contracts.ts`  
`src/maestro/session.ts`  
`src/lib/db/client.ts`  
`src/lib/db/schema.ts`  
`src/lib/db/migrations.ts`  
`src/lib/db/runs.ts`  
`src/lib/db/events.ts`  
`src/lib/db/artifacts.ts`  
`src/lib/events/types.ts`  
`src/lib/events/store.ts`  
`src/lib/artifacts/r2.ts`  
`src/lib/artifacts/keys.ts`
`tests/lib/**`

**Validation**  
Run from repo root:

```bash
docker compose up -d postgres
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgres://postgres:postgres@127.0.0.1:5432/keystone"
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:migrate
```

Success means the migration applies to the local Postgres container reached through Hyperdrive local mode, unit tests cover key helpers and repository modules, and the build remains green.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and note any schema compromises in `Artifacts and Notes`.

**Deliverables**  
A checked-in schema, migration command, typed event/artifact helpers, and stable kernel contracts for M1 code to consume.

**Commit Expectation**  
`Add M1 operational core schema and kernel contracts`

**Known Constraints / Baseline Failures**  
Docker must be available for the default local database path. Drizzle should be used as the ORM boundary, but the operational schema must remain legible SQL rather than becoming framework-driven magic. Do not hardwire the app to Neon-specific assumptions while M1 is using Hyperdrive local mode against Docker Postgres.

**Status**  
Completed on 2026-04-14.

**Completion Notes**  
Landed the SQL-first operational schema in commit `bf9c158`, with a checked-in migration runner, Drizzle table definitions, session/event/artifact repositories, deterministic artifact key helpers, and Maestro kernel/session helpers. Validation passed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://postgres:postgres@127.0.0.1:5432/keystone npm run db:migrate`, and `KEYSTONE_RUN_DB_TESTS=1 CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://postgres:postgres@127.0.0.1:5432/keystone npm run test`.

**Next Starter Context**  
Phase 2 is done. Start Phase 3 by wiring `src/http/handlers/` to the new repositories under `src/lib/db/`, keep the existing run-input contract stable, and add tenant-aware run creation/read APIs plus `RunCoordinatorDO` without introducing workflow execution yet.

### Phase 3: Build the API surface and realtime run coordination

Add the control-plane entrypoints that create and inspect runs, enforce tenancy, and stream progress. This phase makes the HTTP routes real and establishes `RunCoordinatorDO` as the realtime hub for summaries and WebSocket updates.

#### Phase Handoff

**Goal**  
Expose a minimal but real Keystone control plane over HTTP and WebSockets with strict tenant scoping.

**Scope Boundary**  
In scope: auth/tenant extraction, request validation, `POST /v1/runs`, `GET /v1/runs/{id}`, approval-resolution endpoint shape, repo-plus-decision-package request handling, local dev auth behavior, WebSocket upgrade route, `RunCoordinatorDO`, and run summary projection logic.  
Out of scope: sandbox execution, workflow fanout, compile logic, AI integration.

**Read First**  
`product-specs/keystone-m1.md` sections "Public Worker API endpoints" and "Durable Objects"  
`product-specs/keystone-on-cloudflare.md` sections "M1 implementation checklist and immediate decision points"  
Phase 2 modules created in `src/lib/db/`, `src/lib/events/`, and `src/maestro/`

**Files Expected To Change**  
`src/index.ts`  
`src/env.d.ts`  
`wrangler.jsonc`  
`worker-configuration.d.ts`  
`src/http/router.ts`  
`src/http/app.ts`  
`src/http/middleware/auth.ts`  
`src/http/handlers/runs.ts`  
`src/http/handlers/approvals.ts`  
`src/http/handlers/ws.ts`  
`src/lib/auth/tenant.ts`  
`src/lib/db/approvals.ts`  
`src/lib/http/errors.ts`  
`src/durable-objects/RunCoordinatorDO.ts`  
`src/lib/runs/summary.ts`
`tests/http/app.test.ts`
`tests/lib/run-summary.test.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Then smoke the API locally:

```bash
npm run dev
curl -i http://127.0.0.1:8787/v1/health
curl -i -X POST http://127.0.0.1:8787/v1/runs
curl -i http://127.0.0.1:8787/v1/runs/<run-id>
```

Success means unauthenticated or tenantless requests are rejected, the documented dev auth path still produces tenant-scoped rows, valid requests create tenant-scoped rows, and the WebSocket route upgrades cleanly.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, and add any auth or request-shape surprises to `Surprises & Discoveries`.

**Deliverables**  
Tenant-aware API handlers, a working `RunCoordinatorDO`, and a stable HTTP/WS surface that accepts real repo and decision-package input for later phases.

**Commit Expectation**  
`Add tenant-scoped run API and coordinator DO`

**Known Constraints / Baseline Failures**  
The happy path can return placeholder progress until workflows exist, but route contracts and tenant enforcement must already be real.

**Status**  
Completed on 2026-04-14.

**Completion Notes**  
Landed the tenant-aware run API and coordinator DO surface in commit `731b0b3` on top of the Phase 2 persistence layer. Validation passed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and live smoke checks on `127.0.0.1:8787` with `/v1/health -> 200`, `POST /v1/runs -> 202`, `GET /v1/runs/:runId -> 200`, and Wrangler logging `/v1/runs/:runId/ws -> 101 Switching Protocols`.

**Next Starter Context**  
Phase 3 is done. Start Phase 4 by introducing `TaskSessionDO`, sandbox/workspace repository helpers, and task-session coordination behind the existing run API and coordinator DO contracts. Do not invent a UI; keep the HTTP/WS surface machine-readable.

### Phase 4: Build sandbox and workspace lifecycle management

Implement `TaskSessionDO`, the sandbox client boundary, and workspace/worktree operations. This phase is where the execution plane starts to exist: provision a sandbox, create or hydrate a task workspace, run commands, stream logs, and clean up safely.

#### Phase Handoff

**Goal**  
Make task execution possible by giving the control plane a real sandbox and workspace lifecycle.

**Scope Boundary**  
In scope: sandbox client wrapper, local sandbox image, `TaskSessionDO`, workspace initialization, task worktree creation, long-command process handles, log chunk capture, and teardown behavior.  
Out of scope: full run orchestration, compile planning, integration/finalization logic.

**Read First**  
`product-specs/keystone-m1.md` sections "Sandbox lifecycle, local dev, and API usage" and "Workflows: classes, step boundaries, and retry/idempotency patterns"  
`product-specs/platform-vs-vertical.md` sections on session lifecycle and workspace strategy  
Phase 2 and Phase 3 code, especially DB/event/artifact helpers and `RunCoordinatorDO`

**Files Expected To Change**  
`sandbox/Dockerfile`  
`sandbox/bootstrap.sh`  
`src/durable-objects/TaskSessionDO.ts`  
`src/lib/sandbox/client.ts`  
`src/lib/sandbox/processes.ts`  
`src/lib/workspace/init.ts`  
`src/lib/workspace/worktree.ts`  
`src/lib/workspace/git.ts`  
`src/lib/events/publish.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run sandbox:smoke
```

Success means a local sandbox can start, create a workspace for the fixture repo, execute a command as a background process, emit process status, and tear down cleanly.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and the `Artifacts and Notes` section with the sandbox smoke command and result.

**Deliverables**  
Working sandbox and workspace lifecycle modules plus a deterministic local smoke path.

**Commit Expectation**  
`Add task session sandbox and workspace lifecycle`

**Known Constraints / Baseline Failures**  
The local sandbox path depends on Docker availability. If Docker is absent, record that explicitly and validate module-level behavior separately.

**Status**  
Completed on 2026-04-15.

**Completion Notes**  
Implemented `TaskSessionDO`, sandbox/workspace/process helper modules, sandbox image assets, a workspace-binding repository, fixture seeding helpers, and a dev-only `/internal/dev/sandbox-smoke` route. Phase 4 is now live-validated: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `docker compose up -d postgres` all passed; `wrangler dev` started successfully when run outside the Codex sandbox boundary; `GET /v1/health` returned `200`; and authenticated `POST /internal/dev/sandbox-smoke` returned `200` with a completed sandboxed `npm test` process, 8 observed events, and 1 workspace binding. Follow-up fixes made during validation: the sandbox Dockerfile now copies `bootstrap.sh` relative to the `sandbox/` build context, sandbox IDs are trimmed safely after length limiting, and sandbox session reuse now checks for an existing execution session before creating a new one.

**Next Starter Context**  
Phase 4 is done. The provider-backed compile slice pulled forward from Phase 6 is also now complete. The next step is Phase 5 durable workflow work, consuming the live compile path validated against `http://localhost:4001`.

Dependency note:
Before starting workflow implementation, take the provider-backed compile slice from Phase 6 first. That prerequisite is now satisfied, so Phase 5 should consume the live compile service and artifacts rather than a placeholder seam.

### Phase 5: Build durable run and task workflows

Implement the orchestration loop that creates a run, compiles the initial task plan, fans out task work, polls long-running processes durably, and persists artifacts and events. This is the phase that proves the Workflows model instead of just preparing for it.

#### Phase Handoff

**Goal**  
Create `RunWorkflow` and `TaskWorkflow` so M1 can drive a real durable run over at least one or two task units.

**Scope Boundary**  
In scope: workflow bindings, deterministic workflow instance IDs, run creation handoff, compile-step workflow seam, fixture-run support, user-supplied repo-and-package run support, task fanout, `startProcess` plus `step.sleep` polling loop, and artifact/event persistence during workflow execution.  
Out of scope: approval-required branches, final custom chat-completions integration, final docs/runbooks.

**Read First**  
`product-specs/keystone-m1.md` sections "Workflow classes and step-level responsibilities" and "M1 implementation plan"  
`product-specs/keystone-relaxed-design.md` sections "Recommended workflow decomposition" and "Retrying: prefer retrying Activities, not whole workflows"  
Phase 3 and Phase 4 modules

**Files Expected To Change**  
`src/workflows/RunWorkflow.ts`  
`src/workflows/TaskWorkflow.ts`  
`src/keystone/compile/plan-run.ts`  
`src/keystone/tasks/load-task-contracts.ts`  
`src/keystone/tasks/task-status.ts`  
`src/keystone/integration/finalize-run.ts`  
`src/lib/workflows/ids.ts`  
`src/lib/workflows/idempotency.ts`  
`src/lib/events/publish.ts`  
`src/lib/artifacts/r2.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx wrangler workflows list --local
npx wrangler workflows trigger run-workflow --local --params '{"runId":"demo-run","tenantId":"demo-tenant"}'
npx wrangler workflows instances list run-workflow --local
```

Success means a local workflow instance starts, survives polling intervals, persists task progress, and records artifacts without requiring a single long CPU-bound step, for both the fixture baseline and the real repo/package input path.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and include a short workflow transcript in `Artifacts and Notes`.

**Deliverables**  
Working `RunWorkflow` and `TaskWorkflow` entrypoints with durable long-command orchestration.

**Commit Expectation**  
`Implement durable M1 run and task workflows`

**Known Constraints / Baseline Failures**  
The live compile integration is now available and should be consumed by Phase 5. Do not reintroduce a placeholder compile path unless the provider becomes unavailable and the blocker is explicitly recorded in this plan.

**Status**  
Completed on 2026-04-15.

**Completion Notes**  
Landed `RunWorkflow` and `TaskWorkflow`, deterministic workflow/session id helpers, task-contract loaders, run finalization, and `/v1/runs` workflow handoff. Validation passed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npx wrangler workflows list --local`, a fresh direct `npx wrangler workflows trigger run-workflow --local` instance that reached `Completed`, and live local fixture proof showing `POST /v1/runs -> 202` followed by `GET /v1/runs/{id} -> archived` with five artifact kinds persisted.

**Next Starter Context**  
Keep step names deterministic and side effects inside step bodies or clearly idempotent helpers. This is the phase where replay mistakes become expensive.

Sequencing note:
Phase 5 should now consume the real compile path, not a placeholder. If the provider-backed compile integration is not ready yet, finish that slice first before treating Phase 5 as started.

### Phase 6: Add security gating, approval plumbing, and custom chat-completions behavior

Once durable execution works, harden the edges that the product spec calls out explicitly: default-deny network posture, approval-aware pathways, and live custom chat-completions-backed compilation or planning. This phase should keep the happy path simple while proving the control-plane seams needed for later milestones.

#### Phase Handoff

**Goal**  
Add the security and provider-integration boundaries that make the M1 prototype credible rather than purely local.

**Scope Boundary**  
In scope: capability policy module, outbound allow-list and denial behavior, approval record creation and resolution flow, custom chat-completions client wrapper, compile-step provider integration using `gemini-3-flash-preview`, and related event emission.  
Out of scope: full approval-heavy UX, advanced multi-provider routing, deep lease management, and offline LLM fallback behavior.

**Read First**  
`product-specs/keystone-m1.md` sections "Security and capability policy model", "API surface", and "M1 implementation plan"  
`product-specs/keystone-on-cloudflare.md` sections "M1 implementation checklist and immediate decision points"  
Existing workflow and DO modules from Phases 3-5

**Files Expected To Change**  
`src/lib/security/policy.ts`  
`src/lib/security/outbound.ts`  
`src/lib/approvals/service.ts`  
`src/lib/llm/chat-completions.ts`  
`src/http/handlers/approvals.ts`  
`src/workflows/RunWorkflow.ts`  
`src/workflows/TaskWorkflow.ts`  
`src/durable-objects/RunCoordinatorDO.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:security
npm run test:workflows
```

Success means outbound network is denied by default, approval-required paths generate durable approval records, and compile behavior succeeds against the configured custom chat-completions server at `http://localhost:4001`.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and record any credential-dependent validation caveats in `Validation and Acceptance`.

**Deliverables**  
Security policy enforcement, approval plumbing, and custom chat-completions integration using the configured local endpoint and model.

**Commit Expectation**  
`Add security gating and AI compile integration`

**Known Constraints / Baseline Failures**  
Live provider validation depends on the custom chat-completions service being reachable at `http://localhost:4001`. The backend currently streams SSE chat-completion chunks, which the M1 client now consumes directly. There is intentionally no offline fallback path in M1.

**Status**  
Completed on 2026-04-15.

**Completion Notes**  
The provider-backed compile slice remained intact and Phase 6 added the remaining security edge: explicit outbound allow-list enforcement for chat completions, durable approval request creation, Workflow event delivery from approval resolution, and approval-aware repo policy for `gitUrl` inputs. Validation passed for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:security`, `npm run test:workflows`, and `npm run build`. A fully scripted live rerun of the new approval-gated path was not completed because an extra host-side escalation request was refused outside the repository boundary.

**Next Starter Context**  
Phase 5 can start now and should consume the real compile service and artifact outputs from this slice. After workflows land, return here for explicit outbound-policy enforcement and approval-trigger plumbing. Do not let security behavior hide inside sandbox wrappers; keep policy evaluation explicit and observable in events so operators can tell why something was blocked.

Execution order note:
Only the provider-backed compile slice of this phase should come before workflows. The remaining security gating and approval plumbing can stay after Phase 5 once workflows are consuming the live compile contract.

### Phase 7: Prove the end-to-end run and observability path

Run the real fixture-backed M1 scenario and make the proof easy to inspect. This phase wires together the demo scripts, observability helpers, event taxonomy, artifact inspection flow, and final happy-path acceptance.

#### Phase Handoff

**Goal**  
Produce a repeatable local demonstration that proves the full M1 story end to end for both the deterministic fixture path and an operator-supplied repo/package path.

**Scope Boundary**  
In scope: fixture decision package execution, operator-supplied repo/package execution, integration/finalization proof, run summary inspection, R2 artifact inspection helpers, local/staging logging runbooks, and high-signal observability commands. The proof should also continue to validate the sandbox/worktree plus artifact-projection shape that a future Think-backed harness will depend on.  
Out of scope: production deployment polish, full UI, post-M1 optimization.

**Read First**  
All prior phase modules  
`product-specs/keystone-m1.md` sections "Monitoring, observability, and ops" and "M1 implementation plan"

**Files Expected To Change**  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`  
`scripts/run-local.ts`  
`src/lib/observability/logging.ts`  
`src/lib/observability/metrics.ts`  
`src/keystone/integration/finalize-run.ts`  
`src/keystone/evidence/publish.ts`  
`fixtures/demo-decision-package/**`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run demo:run
npm run demo:validate
npx wrangler tail
```

Success means the fixture run completes, a user-supplied repo/package run can also be triggered successfully, session/event/artifact records can be inspected, and the evidence bundle clearly shows compile -> execute -> integrate -> verify -> finalize for the demo case.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Outcomes & Retrospective`, `Artifacts and Notes`, and write down the exact demo transcript that passed.

**Deliverables**  
A repeatable end-to-end milestone demo plus operator-facing observability proof for both fixture and real-input execution.

**Commit Expectation**  
`Prove end-to-end M1 run and observability flow`

**Known Constraints / Baseline Failures**  
If the custom chat-completions service is unavailable, the end-to-end M1 proof is blocked until it is restored. This is an accepted M1 dependency based on the user's explicit preference to avoid fallback behavior.

Provider sequencing note:
Do not attempt final Phase 7 proof until the provider-backed compile slice and the remaining Phase 6 security work have both landed. The workflow phase should already be consuming the real compile path by this point.

**Status**  
Completed on 2026-04-17.

**Completion Notes**  
Landed `scripts/run-local.ts`, `scripts/demo-run.ts`, and `scripts/demo-validate.ts`, and the live fixture run path has now been rerun successfully from the documented demo scripts. The final proof used `KEYSTONE_BASE_URL=http://127.0.0.1:8787`, produced archived run `a7dd14dc-3b0b-4044-bd9a-a04bd151b5da`, and the validation script confirmed `sessions: 3` and `artifacts.total: 5`. The helper scripts now also accept `--base-url=`, and the runbook tells contributors to export `KEYSTONE_BASE_URL` from Wrangler's `Ready on ...` line before running the demo commands.

**Next Starter Context**  
No further execution is needed for this milestone. Archive the plan, keep the explicit base-url guidance in the runbook, and use the completed demo transcript as the operator reference for M1.

### Phase 8: Update documentation and close out the milestone

Document the architecture that now exists, the local development flow, the validated operator workflow, and any project-specific notes future contributors should know. This phase is only complete when the checked-in docs are enough for another contributor to rerun M1 without chat history.

#### Phase Handoff

**Goal**  
Leave behind durable documentation and notes that explain the implemented M1 system and how to operate it.

**Scope Boundary**  
In scope: developer docs, local runbook, architecture notes, product-spec updates for the Think-backed harness direction, `.ultrakit/notes.md`, plan finalization, and any lightweight README updates needed to rerun the system.  
Out of scope: future-milestone planning beyond clearly identified follow-up debt.

**Read First**  
This execution plan in its latest state  
`.ultrakit/developer-docs/README.md`  
`product-specs/platform-vs-vertical.md`  
`product-specs/keystone-relaxed-design.md`  
`product-specs/keystone-on-cloudflare.md`  
`product-specs/keystone-m1.md`  
All run scripts and validation results produced in earlier phases

**Files Expected To Change**  
`.ultrakit/developer-docs/m1-architecture.md`  
`.ultrakit/developer-docs/m1-local-runbook.md`  
`.ultrakit/notes.md`  
`README.md`  
`product-specs/platform-vs-vertical.md`  
`product-specs/keystone-relaxed-design.md`  
`product-specs/keystone-on-cloudflare.md`  
`product-specs/keystone-m1.md`  
This plan file

**Validation**  
Run from repo root:

```bash
npm run demo:run
npm run demo:validate
```

Then verify that the docs explain the same commands and outcomes that just passed.

**Plan / Docs To Update**  
Update every living section of this plan, plus `.ultrakit/notes.md` and the new developer docs.

**Deliverables**  
Durable architecture and runbook docs, updated project notes, and a plan ready for archive when acceptance is met.

**Commit Expectation**  
`Document Keystone M1 architecture and runbook`

**Known Constraints / Baseline Failures**  
Do not archive the plan if the docs describe a flow that has not been rerun from the documented commands.

**Status**  
Completed on 2026-04-17.

**Completion Notes**  
Added `.ultrakit/developer-docs/m1-architecture.md`, `.ultrakit/developer-docs/m1-local-runbook.md`, updated `README.md`, refreshed `.ultrakit/notes.md` with project-specific operating constraints, and updated the product specs to record the Think-backed harness direction. Resume work also corrected the runbook/demo tooling so they can target Wrangler's actual ready URL instead of assuming `127.0.0.1:8787`, and the documented demo commands were rerun successfully against the explicit base URL before archive.

**Next Starter Context**  
Archive the plan and keep the docs aligned with the passing transcript. Favor concrete commands, paths, and failure modes over aspirational prose.

## Concrete Steps

The commands below are the default execution spine for the plan. Update them if implementation chooses different script names, but keep the same intent and observability.

1. Establish the scaffold and baseline:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected result: the new scaffold builds cleanly and the repo has a repeatable baseline.

2. Apply the operational schema:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
docker compose up -d postgres
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgres://postgres:postgres@127.0.0.1:5432/keystone"
npm run db:migrate
```

Expected result: M1 operational tables exist in the local Postgres container reached through Hyperdrive local mode and the command is safe to rerun.

3. Start the local Worker stack:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm run dev
```

Expected result: local Worker endpoints are available on Wrangler's default local port and Workflows local development is active.

4. Validate local workflow controls:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npx wrangler workflows list --local
npx wrangler workflows trigger run-workflow --local --params '{"runId":"demo-run","tenantId":"demo-tenant"}'
npx wrangler workflows instances list run-workflow --local
```

Expected result: the workflow instance is visible locally and advances through durable steps.

5. Run the demo proof:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm run demo:run
npm run demo:validate
```

Expected result: the fixture decision package completes and leaves inspectable session events, artifact references, and evidence outputs.

6. Inspect observability output:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npx wrangler tail
```

Expected result: contributors can correlate Worker logs with run events and artifact references for debugging.

## Validation and Acceptance

Baseline state before execution:

- There are currently no project-wide build, lint, typecheck, or test commands because the repo has no application scaffold yet.
- The planning baseline is therefore structural, not executable: the repo contains specs and planning artifacts only.

Milestone 1 is accepted only when all of the following are true:

1. `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass from repo root.
2. The local Postgres container can be started with Docker and Hyperdrive `localConnectionString` can target it successfully.
3. The schema can be migrated successfully through the Hyperdrive-configured local DB path.
4. The project can start locally with `npm run dev`.
5. The local workflow commands work with `--local` and show a `run-workflow` instance progressing durably.
6. A demo run can be created through the API and inspected through `GET /v1/runs/{id}` plus WebSocket or event inspection.
7. The run API accepts the normalized repo-plus-decision-package contract and starts execution against operator-supplied inputs.
8. The system performs at least one real fixture-backed run with compile -> execute 1-2 tasks -> integrate -> verify -> finalize.
9. Long-running execution is implemented via sandbox background process plus polling loop, not by holding one Worker step open for the entire run.
10. Artifact bodies live in R2-backed storage and the database stores artifact references, event records, and session metadata only.
11. Tenant scoping is enforced on API writes and reads, including the documented dev auth path.
12. Outbound network is denied by default and approval-aware or allow-listed paths are observable.
13. The local runbook and architecture docs explain the commands that actually passed.
14. The compile path uses the configured custom chat-completions service at `http://localhost:4001` with model `gemini-3-flash-preview`.
15. The checked-in Worker scaffold is hand-authored and repository-shaped, rather than a generic Cloudflare starter copied in wholesale.
16. M1 remains API-and-script driven; there is no separate first-class operator CLI required for acceptance.

Known pre-execution baseline failures and gaps:

- No runtime code exists yet.
- No database migration exists yet.
- No sandbox image exists yet.
- No Worker config or local env template exists yet.
- No build/lint/test scripts exist yet.

These are greenfield gaps, not regressions.

## Idempotence and Recovery

- `npm install` and the baseline lint/typecheck/test/build commands should be safe to rerun at any time.
- The DB migration path must be written so rerunning `npm run db:migrate` is safe and does not corrupt already-applied schema.
- R2 artifact key generation must be deterministic and append-friendly so a retried run can either reuse known keys safely or create attempt-scoped keys without ambiguity.
- Workflow steps must use deterministic IDs and explicit idempotency keys anywhere retries could duplicate external effects.
- Sandbox teardown must be safe if called after partial startup or after the process has already exited.
- If a phase stops midway, update `Progress`, the relevant `Phase Handoff` status, and `Execution Log` before handing off. The next contributor should be able to restart from the checked-in plan plus the working tree alone.
- If hosted Hyperdrive or Neon validation is skipped during M1, record that explicitly. Hyperdrive local mode against Docker Postgres is required; hosted Postgres is not.

## Artifacts and Notes

Planning-time baseline evidence captured on 2026-04-13:

```text
$ find . -maxdepth 2 -type f | sort
./.ultrakit/notes.md
./product-specs/keystone-m1.md
./product-specs/keystone-on-cloudflare.md
./product-specs/keystone-relaxed-design.md
./product-specs/platform-vs-vertical.md
```

```text
$ rg --files -g 'package.json' -g 'wrangler.jsonc' -g 'src/**' .
# no matches
```

```text
$ git status --short
?? .codex
```

Important source documents:

- `product-specs/keystone-m1.md`
- `product-specs/keystone-on-cloudflare.md`
- `product-specs/keystone-relaxed-design.md`
- `product-specs/platform-vs-vertical.md`

Phase 2 validation evidence captured on 2026-04-14:

```text
$ CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://postgres:postgres@127.0.0.1:5432/keystone npm run db:migrate
No pending migrations.
```

```text
$ KEYSTONE_RUN_DB_TESTS=1 CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://postgres:postgres@127.0.0.1:5432/keystone npm run test
Test Files  8 passed (8)
Tests  20 passed (20)
```

Phase 3 validation evidence captured on 2026-04-14:

```text
$ curl -i http://127.0.0.1:8787/v1/health
HTTP/1.1 200 OK
```

```text
$ curl -i -X POST http://127.0.0.1:8787/v1/runs ...
HTTP/1.1 202 Accepted
```

```text
$ curl -i http://127.0.0.1:8787/v1/runs/<run-id> ...
HTTP/1.1 200 OK
```

```text
[wrangler:info] GET /v1/runs/<run-id>/ws 101 Switching Protocols
```

Phase 4 implementation evidence captured on 2026-04-14:

```text
$ npm run lint
# exit 0
```

```text
$ npm run typecheck
# exit 0
```

```text
$ npm run test
Test Files  10 passed | 1 skipped (11)
Tests  26 passed | 3 skipped (29)
```

```text
$ npm run build
Building image keystone-cloudflare-sandbox:worker
unknown flag: --load
Docker build exited with code: 125
```

```text
$ npm run dev
The following containers are available:
- keystone-cloudflare-sandbox (sandbox/Dockerfile)
A system error occurred: uv_interface_addresses returned Unknown system error 1
```

```text
$ docker buildx version
docker: unknown command: docker buildx
```

```text
$ npm run sandbox:smoke
The following containers are available:
- keystone-cloudflare-sandbox (sandbox/Dockerfile)
A system error occurred: uv_interface_addresses returned Unknown system error 1
Error: wrangler dev exited before the smoke check completed (code=1, signal=null).
```

Phase 4 completion evidence captured on 2026-04-15:

```text
$ docker buildx version
github.com/docker/buildx 0.33.0
```

```text
$ npm run test
Test Files  11 passed | 1 skipped (12)
Tests  29 passed | 3 skipped (32)
```

```text
$ npm run build
Building image keystone-cloudflare-sandbox:worker
--dry-run: exiting now.
```

```text
$ npm run dev
[wrangler:info] Ready on http://127.0.0.1:8787
```

```text
$ curl -i http://127.0.0.1:8787/v1/health
HTTP/1.1 200 OK
```

```text
$ POST /internal/dev/sandbox-smoke
HTTP/1.1 200 OK
{"ok":true,"process":{"status":"completed","exitCode":0},"eventsObserved":8,"workspaceBindingsObserved":1}
```

Provider-backed compile slice evidence captured on 2026-04-15:

```text
$ curl -X POST http://localhost:4001/v1/chat/completions ...
data: {"model":"gemini-3-flash-preview","choices":[{"delta":{"content":"ok"}}]}
data: [DONE]
```

```text
$ npm run test
Test Files  12 passed | 1 skipped (13)
Tests  33 passed | 3 skipped (36)
```

```text
$ npm run build
env.KEYSTONE_CHAT_COMPLETIONS_BASE_URL ("http://localhost:4001")
--dry-run: exiting now.
```

```text
$ POST /internal/dev/compile-smoke
HTTP/1.1 200 OK
{"ok":true,"taskCount":1,"model":"gemini-3-flash-preview","taskHandoffArtifactCount":1,"artifactsObserved":3}
```

Phase 7 / 8 completion evidence captured on 2026-04-17:

```text
$ curl -i http://127.0.0.1:8787/v1/health
HTTP/1.1 200 OK
{"ok":true,"worker":"keystone-cloudflare","phase":"m1-phase-6-compile","llmBaseUrl":"http://localhost:4001"}
```

```text
$ KEYSTONE_BASE_URL=http://127.0.0.1:8787 npm run demo:run
{
  "baseUrl": "http://127.0.0.1:8787",
  "runId": "a7dd14dc-3b0b-4044-bd9a-a04bd151b5da",
  "status": "archived"
}
```

```text
$ KEYSTONE_BASE_URL=http://127.0.0.1:8787 KEYSTONE_RUN_ID=a7dd14dc-3b0b-4044-bd9a-a04bd151b5da npm run demo:validate
{
  "ok": true,
  "baseUrl": "http://127.0.0.1:8787",
  "runId": "a7dd14dc-3b0b-4044-bd9a-a04bd151b5da",
  "status": "archived",
  "sessions": 3,
  "artifacts": {
    "total": 5,
    "byKind": {
      "decision_package": 1,
      "run_plan": 1,
      "task_handoff": 1,
      "task_log": 1,
      "run_summary": 1
    }
  }
}
```

## Interfaces and Dependencies

External platform dependencies for M1:

- Cloudflare Workers for the HTTP API surface
- Cloudflare Durable Objects for `RunCoordinatorDO` and `TaskSessionDO`
- Cloudflare Workflows for durable run and task orchestration
- Cloudflare R2 for artifact and evidence storage
- Cloudflare Hyperdrive as the Worker-facing database binding in M1
- Docker Postgres as the local operational backing store behind Hyperdrive `localConnectionString`
- Neon/Postgres retained as a later hosted compatibility target
- Cloudflare Sandboxes for isolated repo execution
- A user-operated OpenAI-compatible chat-completions service at `http://localhost:4001`

Core module boundaries to keep stable:

- `src/maestro/`: reusable kernel contracts and lifecycle abstractions
- `src/keystone/`: product-specific run compilation, task loading, integration, verification, and evidence behavior
- `src/lib/db/`: operational persistence only
- `src/lib/events/`: append-only event envelope and publication helpers
- `src/lib/artifacts/`: artifact reference and R2 key handling
- `src/durable-objects/`: realtime coordination and sandbox session control
- `src/workflows/`: durable orchestration entrypoints and helpers
- `src/http/`: Worker route handlers and request/response validation
- `src/lib/security/`: capability and outbound policy
- `src/lib/llm/`: custom chat-completions client boundary

Developer dependencies expected during execution:

- `wrangler`
- `typescript`
- `eslint`
- `vitest`
- `hono`
- `zod`
- `drizzle-orm`
- `drizzle-kit`
- `postgres`
- `tsx`

The architectural choice is fixed: Drizzle on top of `postgres.js`, with `drizzle-kit` as the companion schema and migration tool.
