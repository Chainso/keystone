# Keystone UI-First API Scaffold

## Purpose / Big Picture

This plan replaces the current thin M1 control-plane API with a UI-first resource model that matches Keystone's intended operator workflow. After this plan is complete, the frontend should be able to build against stable resource types and endpoints for `Project`, `DecisionPackage`, `Run`, `Task`, `TaskConversation`, `Artifact`, `Approval`, `EvidenceBundle`, and `IntegrationRecord` without depending on raw sessions, raw events, or other execution internals.

The key outcome is parallelization: the UI should be able to wire its rails, central workspace, inspector, and chat/DAG mode switching against a canonical API contract now, even though some resources will still be projections over current state and others will still be typed stubs. This plan explicitly does **not** try to implement the deeper product behavior for every resource. It defines the contract, transfers whatever current behavior can be reused, and makes the remaining gaps explicit and typed.

From the operator's perspective, success means:

- the API surface matches the product journey and UI shell instead of the current M1 transport-oriented shape,
- the UI can read runs, tasks, workflow graph data, task conversation data, artifacts, and approvals through stable endpoints,
- the UI has a canonical task-conversation write path for manual operator steering of the implementer agent,
- placeholder resources that do not exist yet still have stable, typed responses that the UI can integrate against,
- current low-level workflow/runtime seams remain available internally or as debug surfaces without dictating the public contract.
- the demo flow, tests, and README/API examples all run against the new contract rather than the old M1 route matrix.

## Backward Compatibility

Backward compatibility is **not required** for this work. Keystone is not a shipped external product, the current API is not in real use, and the user explicitly wants the API modernized toward the optimal UI-first model rather than preserved for compatibility.

This plan intentionally allows the following breaking changes:

- replacing the current `POST /v1/runs` request/response shape with a decision-package and run-centric shape,
- replacing the current `GET /v1/runs/:runId` aggregate summary shape with a real `Run` resource shape,
- moving `GET /v1/runs/:runId/events` and `GET /v1/runs/:runId/ws` out of the primary UI contract and treating them as debug/legacy surfaces if they remain,
- changing project APIs away from the current coarse full-object update contract where useful,
- changing validation behavior when current behavior is only an implementation artifact,
- breaking demo scripts, contract tests, README examples, and M1 docs that encode the old route matrix.

Compatibility that **is** still required:

- keep the underlying workflow core intact where possible by reusing the current session/event/artifact/workflow machinery,
- reuse current persisted state and current runtime behavior wherever it already fits the new contract,
- keep the codebase internally coherent by updating docs, tests, and scripts in the same execution plan instead of leaving the repo in a mixed-contract state.

## Design Decisions

1. **Date:** 2026-04-18  
   **Decision:** Replace the current public `v1` surface with a UI-first resource model instead of preserving the M1 route and envelope shapes.  
   **Rationale:** The current surface is mainly `Project` plus a thin run launcher, while the UI and product docs need stable resources for intake, workflow graph, task conversation, artifact inspection, and release. Preserving the old surface would force the UI to depend on transport-oriented seams and raw event inference.  
   **Alternatives considered:** Keep the M1 routes and add only aliases; preserve old envelopes under the same paths and add the new surface under `/v2`.

2. **Date:** 2026-04-18  
   **Decision:** The canonical public resource hierarchy is `Workspace/Tenant -> Project -> ProjectDocument -> DecisionPackage -> Run -> Task -> TaskConversation -> Artifact -> Approval -> EvidenceBundle -> IntegrationRecord`.  
   **Rationale:** This matches the stable product nouns and the operator journey in `product-specs/keystone-relaxed-design.md`, while also matching the UI shell requirements in `design/design-guidelines.md`.  
   **Alternatives considered:** Expose Maestro/session/runtime nouns directly; keep `TaskContract` as the route noun instead of `Task`.

3. **Date:** 2026-04-18  
   **Decision:** Treat `WorkflowGraph` and `TaskConversation` as first-class UI read models, not as first-class storage primitives.  
   **Rationale:** The UI needs them as stable surfaces, but current persistence does not support them as native rows. They can be safely defined as projections over artifacts, sessions, approvals, and session events.  
   **Alternatives considered:** Delay these endpoints until dedicated persistence exists; expose only raw events and let the UI derive them itself.

4. **Date:** 2026-04-18  
   **Decision:** Separate public resources into three implementation classes: `reused`, `projected`, and `stub`, and expose that explicitly in scaffold responses.  
   **Rationale:** Some endpoints can already be backed directly from current tables and workflows, some can be computed as projections, and some only exist as product-level placeholders. The UI needs to know the difference without guessing from missing fields.  
   **Alternatives considered:** Return `501` for every not-yet-real resource; hide incomplete resources entirely until implemented.

5. **Date:** 2026-04-18  
   **Decision:** Define `TaskConversation` as a projection over task-scoped events and artifacts, with only implementer messages plus curated workflow notices in the default feed.  
   **Rationale:** The shipped runtime is implementer-only today. A projected conversation lets the UI build the intended task chat now without pretending that multi-role transcripts already exist. Raw `agent.tool_*`, `workspace.*`, and `sandbox.*` details stay out of the default feed.  
   **Alternatives considered:** Expose the raw event log as the task chat; introduce a second durable conversation store in this plan.

6. **Date:** 2026-04-18  
   **Decision:** Keep low-level event and websocket surfaces available only as debug/legacy seams and make the new UI contract independent from them.  
   **Rationale:** Current runtime debugging and demo tooling may still benefit from raw events, but the main API should no longer force the UI to reason about `session_events`, `agent.turn.*`, and transport snapshots directly.  
   **Alternatives considered:** Remove the low-level surfaces immediately; keep them as public first-class routes in the new contract.

7. **Date:** 2026-04-18  
   **Decision:** Do not add new tables or deep runtime behavior for `ProjectDocument`, `DecisionPackage`, `ReviewNote`, `TestSummary`, `EvidenceBundle`, `IntegrationRecord`, or `Release` in this plan unless current code already persists enough to support them directly.  
   **Rationale:** The user wants API/type scaffolding and transfer of existing behavior, not a second feature plan that implements the full product backend. The contract should advance now without inventing half-baked persistence.  
   **Alternatives considered:** Add new persistence and background behavior for all target resources in this plan; postpone the contract until every resource is real.

8. **Date:** 2026-04-18  
   **Decision:** Use `/tasks` as the route noun even though the product spec uses `TaskContract` as the canonical object name.  
   **Rationale:** The UI and design language are task-centered (`task status`, `task-scoped chat`, `selecting a task`). The route should reflect the interaction model while the underlying docs and artifacts can still use `TaskContract` where that meaning matters.  
   **Alternatives considered:** Use `/task-contracts` in the HTTP surface; flatten tasks into run-only substructures with no dedicated task endpoints.

9. **Date:** 2026-04-18  
   **Decision:** For write operations that do not yet have meaningful backend behavior, return structured `not_implemented` responses instead of silently accepting fake writes.  
   **Rationale:** The UI can still wire the route, schema, and error path, but the backend will not pretend to persist or orchestrate behavior it does not yet support.  
   **Alternatives considered:** Accept writes and drop them on the floor; omit unfinished write routes entirely.

10. **Date:** 2026-04-18  
   **Decision:** `TaskConversation` is a read/write surface, and `POST /v1/runs/:runId/tasks/:taskId/conversation/messages` is the canonical operator-steering endpoint for the implementer agent.  
   **Rationale:** The UI needs a durable, explicit way for a human to manually steer task execution. Even if the backend behavior starts as a scaffold, the route and message contract need to be frozen now so the UI can build against them.  
   **Alternatives considered:** Keep task conversation read-only; overload approvals or raw events for operator steering.

11. **Date:** 2026-04-18  
   **Decision:** Reorganize the HTTP/API code by public API version and resource family instead of extending the current flat `src/http/contracts/*` and `src/http/handlers/*` layout.  
   **Rationale:** This plan touches nearly every public endpoint. A resource-oriented structure is easier to navigate, easier to extend, and better aligned with the contract-first API shape the UI will depend on.  
   **Alternatives considered:** Keep the existing flat layout and add more files beside the current handlers; create one large shared API module without resource boundaries.

12. **Date:** 2026-04-18  
   **Decision:** Migrating the existing demo flow, contract tests, and README/API examples to the new contract is required scope for this plan, not optional cleanup.  
   **Rationale:** The repo needs a real consumer of the new surface and one coherent API story at the end of the work. Leaving the demo and examples on the old contract would keep the repository split-brained.  
   **Alternatives considered:** Retire the demo entirely; leave the demo/scripts/examples stale until a later follow-up plan.

## Execution Log

- **Date:** 2026-04-18  
  **Phase:** Planning  
  **Decision:** Run discovery across current HTTP/API handlers, product/design docs, runtime/chat/event seams, and persistence stores before writing the plan.  
  **Rationale:** The current repo already has partial implementations and durable state. The plan needed a precise split between real resources, projections, and stubs.

- **Date:** 2026-04-18  
  **Phase:** Planning  
  **Decision:** Use the baseline commands `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before opening the plan.  
  **Rationale:** The planning contract requires a baseline so execution can distinguish regressions from pre-existing noise.

- **Date:** 2026-04-18  
  **Phase:** Planning  
  **Decision:** Record the Wrangler/Docker host-write requirement as a baseline validation caveat instead of treating it as a code failure.  
  **Rationale:** `build` failed inside the sandbox due writes under `~/.config/.wrangler` and `~/.docker`, then passed outside the sandbox. This is an environment constraint, not an application regression.

- **Date:** 2026-04-18  
  **Phase:** Execution Start  
  **Decision:** Begin execution with Phase 1 and treat the approved plan as the sole public API source of truth for this work.  
  **Rationale:** The user explicitly approved the plan and asked to start execution. Phase 1 freezes the contract and module structure that all later phases build on.

- **Date:** 2026-04-18  
  **Phase:** Phase 1  
  **Decision:** Freeze the public `v1` contract in new resource-family modules under `src/http/api/v1/`, keep current live handler behavior only where it already exists, and express unfinished public routes through an explicit route matrix plus the shared `not_implemented` write contract.  
  **Rationale:** This makes the canonical UI-first surface durable in code without forcing Phase 2 projection logic into the contract-freeze pass or hiding which routes are implemented versus still frozen-on-paper.

## Progress

- [x] 2026-04-18 Discovery completed across product docs, current public API, runtime/event model, persistence layer, and repo scripts/tests.
- [x] 2026-04-18 Baseline validation recorded: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` all pass, with `build` requiring execution outside the Codex sandbox because Wrangler/Docker write to home-directory paths.
- [x] 2026-04-18 Active execution plan created and registered.
- [x] 2026-04-18 User approved the execution plan and execution started.
- [x] 2026-04-18 Phase 1 completed: canonical UI-first resource schemas, envelope/scaffold conventions, resource-family `v1` router composition, the route matrix, the canonical task-conversation message write contract, and the shared `not_implemented` write response now live in code.
- [ ] Phase 2: Rework core read APIs around existing persisted state and sanctioned projections.
- [ ] Phase 3: Add `TaskConversation` plus typed stub endpoints for resources that do not yet exist.
- [ ] Phase 4: Update scripts, tests, docs, and developer notes to the new API surface and close out the plan.

## Surprises & Discoveries

- The current repo already persists more useful state than the public API exposes: sessions, session events, approvals, artifact refs, workspace bindings, and run/task-linked metadata are all real and durable.
- `Run`, `Task`, `WorkflowGraph`, and `TaskConversation` are not first-class rows today. They are projections over sessions, events, artifacts, and workflow outputs.
- `DecisionPackage` is only embedded in `POST /v1/runs` today, then later written as an artifact during compile. There is no pre-run decision-package collection yet.
- The runtime is still explicitly implementer-only. Multi-role review/test loops do not exist yet, so any richer task conversation model must be honest about being a projection/stub rather than a real multi-actor transcript.
- `TaskWorkflow` currently reloads live project state during task execution. Any new API that implies a frozen immutable task-execution snapshot would be misleading unless it is clearly defined as projection or future work.
- The current run validation path has an implementation artifact: invalid run payloads surface as generic `500` errors because run-input Zod errors collapse in the app error handler.
- `npm run build` passes only when run outside the Codex sandbox because Wrangler/Docker write under `~/.config/.wrangler` and `~/.docker`. This is already consistent with `.ultrakit/notes.md`.
- Freezing the route matrix honestly required a second status dimension beyond `reused | projected | stub`: some routes are live but still transitional, some are canonical but not mounted yet, and the legacy raw event/websocket seams still need to be called out explicitly until later phases retire or replace them.

## Outcomes & Retrospective

Planning outcome on 2026-04-18:

- The UI-first API work now has a dedicated execution plan rather than being mixed into prior M1/runtime plans.
- The plan resolves the most important design ambiguity: the public API should be shaped around product/UI resources, not raw session/event/runtime seams.
- The plan records a concrete split between reusable persisted resources, sanctioned projections, and typed stubs. That split is what makes UI/backend parallelization feasible without forcing premature backend implementation.
- The repo is ready to begin execution once the user approves the route matrix, response conventions, and intentional breakage stance recorded here.

Phase 1 outcome on 2026-04-18:

- The canonical public resource schemas now live under `src/http/api/v1/` by resource family instead of the old flat `src/http/contracts/*` layout.
- Shared collection/detail/action envelope helpers, explicit `reused | projected | stub` scaffold metadata, and the structured `not_implemented` write response are frozen in code.
- The `v1` route matrix is now an explicit artifact in code, including route availability notes that distinguish implemented, scaffolded, contract-frozen, and legacy debug surfaces.
- The canonical operator-steering path `POST /v1/runs/:runId/tasks/:taskId/conversation/messages` now exists with a stable request schema and honest `501 not_implemented` response while backend delivery remains deferred.
- A canonical UI stream alias now exists at `GET /v1/runs/:runId/stream`, while `/v1/runs/:runId/events` and `/v1/runs/:runId/ws` remain explicit debug/legacy seams for the transition.

## Context and Orientation

The current repository state relevant to this plan is:

- `src/http/router.ts` currently exposes only health, project CRUD, run creation, run summary, run events, approval resolution, and a per-run websocket.
- `src/http/handlers/projects.ts` and `src/http/contracts/project-input.ts` already back a real `Project` configuration model.
- `src/http/handlers/runs.ts`, `src/http/contracts/run-input.ts`, and `src/lib/runs/summary.ts` still encode the old M1 run surface: embedded decision-package input, transport-oriented acceptance response, and aggregate run summary.
- `src/lib/db/schema.ts` plus the repositories under `src/lib/db/` already persist sessions, events, approvals, artifacts, workspaces, and projects.
- `src/keystone/compile/contracts.ts` already defines useful typed schemas for `DecisionPackage`, `CompiledTaskPlan`, and `CompiledRunPlan`.
- `src/workflows/RunWorkflow.ts` and `src/workflows/TaskWorkflow.ts` are the real orchestration backbone that should be reused behind the new public contract rather than replaced.
- `src/keystone/agents/base/KeystoneThinkAgent.ts`, `src/maestro/agent-runtime.ts`, and `src/lib/events/types.ts` define the current implementer-turn runtime and the raw event vocabulary that `TaskConversation` will initially project from.
- `src/lib/db/artifacts.ts` and `src/lib/artifacts/r2.ts` already provide enough storage seams to expose `Artifact` and artifact-content endpoints.
- `scripts/ensure-demo-project.ts`, `scripts/demo-run.ts`, `scripts/demo-validate.ts`, `tests/http/app.test.ts`, `tests/http/projects.test.ts`, and `tests/scripts/demo-contracts.test.ts` all encode assumptions about the current API surface and will need to move with the contract.

Product and UI source documents that matter most for this plan:

- `product-specs/keystone-relaxed-design.md`
- `product-specs/platform-vs-vertical.md`
- `product-specs/keystone-on-cloudflare.md`
- `design/design-guidelines.md`
- `design/README.md`
- `.ultrakit/notes.md`

Key implementation files that matter most:

- `src/http/router.ts`
- `src/http/app.ts`
- `src/http/contracts/project-input.ts`
- `src/http/contracts/run-input.ts`
- `src/http/handlers/projects.ts`
- `src/http/handlers/runs.ts`
- `src/http/handlers/approvals.ts`
- `src/http/handlers/ws.ts`
- `src/lib/db/schema.ts`
- `src/lib/db/projects.ts`
- `src/lib/db/runs.ts`
- `src/lib/db/events.ts`
- `src/lib/db/artifacts.ts`
- `src/lib/db/approvals.ts`
- `src/lib/db/workspaces.ts`
- `src/lib/runs/summary.ts`
- `src/keystone/compile/contracts.ts`
- `src/keystone/tasks/load-task-contracts.ts`
- `src/workflows/RunWorkflow.ts`
- `src/workflows/TaskWorkflow.ts`
- `src/keystone/agents/base/KeystoneThinkAgent.ts`
- `src/lib/events/types.ts`
- `scripts/ensure-demo-project.ts`
- `scripts/demo-run.ts`
- `scripts/demo-validate.ts`
- `tests/http/app.test.ts`
- `tests/http/projects.test.ts`
- `tests/scripts/demo-contracts.test.ts`

The most important current-state facts to keep in mind:

- `Project` is real.
- `Run` is currently a projection.
- `Task` is currently a projection.
- `DecisionPackage` is currently embedded input plus later artifactization.
- `WorkflowGraph` is currently a projection of `run_plan`.
- `TaskConversation` is currently implicit in task-scoped session events.
- `ReviewNote`, `TestSummary`, `EvidenceBundle`, `IntegrationRecord`, and `ProjectDocument` are mostly future-facing product nouns today.

## Plan of Work

The work starts by freezing the new public contract in code before changing handler behavior. That means defining the canonical resource types, list/detail envelopes, projection shapes, stub conventions, and route topology that the UI will target. This phase should answer: what are the routes, what are the response bodies, which resources are reused vs projected vs stubbed, and how do unsupported writes fail?

Once the contract exists, the next step is to reorganize the API code around resource families and rework the core read APIs around current state instead of raw M1 summaries. The goal is not to invent new backend behavior. The goal is to translate the state we already persist into the public resources the UI actually needs: runs, tasks, workflow graph, artifacts, approvals, and project-related lists. This phase will mostly add projection logic, new serializers, and new handlers while removing or sidelining the current thin M1 route shapes.

After the core read APIs are in place, the plan adds the missing scaffold surfaces that the UI needs even though the backend does not truly implement them yet. This is where `TaskConversation` becomes a formal projection endpoint with a canonical operator-steering write route and where `ProjectDocument`, `DecisionPackage`, `EvidenceBundle`, `IntegrationRecord`, and `Release` routes become typed shells or structured `not_implemented` writes rather than undefined future promises.

The final phase brings the rest of the repo into alignment: the demo flow, tests, scripts, README guidance, and developer docs all need to reflect the new contract. Because backward compatibility is intentionally dropped, this plan must leave the repo speaking one coherent API language rather than a mix of old M1 and new UI-first surfaces.

## Concrete Steps

1. Reconfirm baseline validation and current route/dependency seams:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm run lint
npm run typecheck
npm run test
npm run build
rtk sed -n '1,220p' src/http/router.ts
rtk sed -n '1,220p' src/http/handlers/runs.ts
rtk sed -n '1,220p' src/lib/runs/summary.ts
```

Expected result: baseline remains green and the current thin M1 surface is visible before refactoring.

2. Freeze the canonical contract and route matrix:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk sed -n '238,280p' product-specs/keystone-relaxed-design.md
rtk sed -n '1,220p' design/design-guidelines.md
rtk sed -n '1,220p' src/keystone/compile/contracts.ts
rtk sed -n '1,220p' src/lib/events/types.ts
```

Expected result: contract modules and route definitions exist for the UI-first resource model, including explicit `reused | projected | stub` status.

3. Reorganize the API code and rework the core read APIs using current persisted state:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk sed -n '1,220p' src/lib/db/schema.ts
rtk sed -n '1,220p' src/lib/db/events.ts
rtk sed -n '1,220p' src/lib/db/artifacts.ts
rtk sed -n '1,220p' src/lib/db/approvals.ts
rtk sed -n '1,220p' src/keystone/tasks/load-task-contracts.ts
```

Expected result: the API code is organized by resource family and the API exposes project, run, task, workflow graph, artifact, and approval read endpoints that map onto current stores and workflow outputs.

4. Add scaffold/stub surfaces for the remaining UI contract:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk sed -n '1,260p' src/workflows/TaskWorkflow.ts
rtk sed -n '1,260p' src/keystone/agents/base/KeystoneThinkAgent.ts
rtk sed -n '1,220p' src/lib/db/workspaces.ts
```

Expected result: `TaskConversation` exists as a formal projection endpoint with a canonical operator-steering write route, stream aliases are defined, and document/decision-package/evidence/integration/release surfaces exist as typed shells or structured `not_implemented` writes.

5. Migrate the demo, tests, scripts, and docs to the new public contract:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected result: the demo flow, repo tests, scripts, and docs all speak the same API contract, and the old M1-only route assumptions are removed.

## Validation and Acceptance

This plan is accepted only when all of the following are true:

1. `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass after the API scaffold lands.
2. The public API surface is organized around the new route/resource hierarchy rather than the current M1 run launcher plus aggregate summary.
3. The codebase contains canonical TypeScript contracts for:
   - `Project`
   - `ProjectDocument`
   - `DecisionPackage`
   - `Run`
   - `Task`
   - `WorkflowGraph`
   - `TaskConversation`
   - `Artifact`
   - `Approval`
   - `EvidenceBundle`
   - `IntegrationRecord`
4. The contract explicitly distinguishes `reused`, `projected`, and `stub` resources.
5. The API implementation is organized by public API version and resource family rather than the current flat handler/contract layout.
6. `GET` endpoints exist and return stable typed shapes for at least:
   - `GET /v1/projects`
   - `GET /v1/projects/:projectId`
   - `GET /v1/projects/:projectId/documents`
   - `GET /v1/projects/:projectId/decision-packages`
   - `GET /v1/projects/:projectId/runs`
   - `GET /v1/decision-packages/:decisionPackageId`
   - `GET /v1/runs/:runId`
   - `GET /v1/runs/:runId/graph`
   - `GET /v1/runs/:runId/tasks`
   - `GET /v1/runs/:runId/tasks/:taskId`
   - `GET /v1/runs/:runId/tasks/:taskId/conversation`
   - `GET /v1/runs/:runId/tasks/:taskId/artifacts`
   - `GET /v1/runs/:runId/approvals`
   - `GET /v1/runs/:runId/approvals/:approvalId`
   - `GET /v1/artifacts/:artifactId`
   - `GET /v1/artifacts/:artifactId/content`
   - `GET /v1/runs/:runId/evidence`
   - `GET /v1/runs/:runId/integration`
   - `GET /v1/runs/:runId/release`
7. The task conversation write endpoint exists and is the canonical operator-steering path:
   - `POST /v1/runs/:runId/tasks/:taskId/conversation/messages`
8. The canonical stream surface for the UI exists, even if initially backed by the current `RunCoordinatorDO` transport.
9. Write endpoints that are not yet backed by real behavior return structured `not_implemented` responses instead of fake success.
10. The current reusable behavior is transferred into the new surface wherever possible:
   - project reads/writes use current project persistence,
   - run/task/artifact/approval reads reuse current sessions/events/artifacts/approvals,
   - task conversation reuses current task-scoped events.
11. Raw run events and low-level websocket surfaces are either retained as explicit debug/legacy seams or clearly removed and documented as such; the UI contract must not depend on them.
12. `scripts/demo-run.ts`, `scripts/demo-validate.ts`, and any required fixture/bootstrap helpers are migrated to the new API contract and still provide a working demo flow.
13. README guidance, developer docs, and repo scripts/tests no longer present the old M1 route matrix as the canonical public API.

Current baseline before execution:

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes with `30 passed | 2 skipped` test files and `117 passed | 8 skipped` tests.
- `npm run build` passes when run outside the Codex sandbox; inside the sandbox it fails due Wrangler/Docker writes under `~/.config/.wrangler` and `~/.docker`.

## Idempotence and Recovery

- This plan should avoid new database migrations unless a phase explicitly proves they are required. Most of the target resources should be backed by current stores or explicit scaffold responses.
- Route replacement should happen behind coherent contract modules so execution can be resumed without guessing which endpoints are canonical.
- If a phase stalls after adding contract types but before handlers are aligned, update the plan and leave the route matrix documented in code rather than implicit in chat history.
- Stub resources must remain honest. If a resource is only a shell, the handler should say so explicitly rather than silently returning misleading empty success payloads.
- Keep raw event and websocket surfaces available for local debugging until the new projections are stable enough; if they are removed, remove or update all script/test/doc references in the same phase.
- Because backward compatibility is intentionally dropped, recovery should prefer the clean end-state API over compatibility shims. Do not carry old and new public surfaces indefinitely.

## Artifacts and Notes

Useful planning artifacts for this plan:

- Current public route matrix:
  - `GET /v1/projects`
  - `POST /v1/projects`
  - `GET /v1/projects/:projectId`
  - `PUT /v1/projects/:projectId`
  - `POST /v1/runs`
  - `GET /v1/runs/:runId`
  - `GET /v1/runs/:runId/events`
  - `POST /v1/runs/:runId/approvals/:approvalId/resolve`
  - `GET /v1/runs/:runId/ws`
- Planned canonical public route families:
  - projects + project documents + project decision packages + project runs
  - decision packages
  - runs + workflow graph + stream
  - run tasks + task conversation + task artifacts
  - artifacts
  - approvals
  - evidence / integration / release
- Canonical operator-steering route:
  - `POST /v1/runs/:runId/tasks/:taskId/conversation/messages`
- Target API code organization:
  - public API code organized by version and resource family
  - resource modules own contracts, handlers, serializers, and projection helpers together
  - router composition built from resource modules instead of one flat route file
- Reuse versus scaffold summary:
  - **Reused now:** `Project`, `Artifact`, `Approval`, current run/task execution state
  - **Projected now:** `Run`, `Task`, `WorkflowGraph`, `TaskConversation`
  - **Stub now:** `ProjectDocument`, pre-run `DecisionPackage`, `EvidenceBundle`, `IntegrationRecord`, `Release`
- Primary breakage list:
  - `scripts/ensure-demo-project.ts`
  - `scripts/demo-run.ts`
  - `scripts/demo-validate.ts`
  - `scripts/run-local.ts`
  - `tests/http/app.test.ts`
  - `tests/http/projects.test.ts`
  - `tests/scripts/demo-contracts.test.ts`
  - `README.md`
  - `.ultrakit/developer-docs/m1-architecture.md`

## Interfaces and Dependencies

Important interfaces and modules involved in this change:

- HTTP layer:
  - `src/http/router.ts`
  - `src/http/app.ts`
  - `src/http/contracts/*` and/or the replacement resource-oriented contract layout introduced by this plan
  - `src/http/handlers/*` and/or the replacement resource-oriented API modules introduced by this plan
- Persistence and projection sources:
  - `src/lib/db/schema.ts`
  - `src/lib/db/projects.ts`
  - `src/lib/db/runs.ts`
  - `src/lib/db/events.ts`
  - `src/lib/db/artifacts.ts`
  - `src/lib/db/approvals.ts`
  - `src/lib/db/workspaces.ts`
  - `src/lib/artifacts/r2.ts`
- Runtime sources for projections:
  - `src/lib/runs/summary.ts`
  - `src/lib/events/types.ts`
  - `src/keystone/compile/contracts.ts`
  - `src/keystone/tasks/load-task-contracts.ts`
  - `src/workflows/RunWorkflow.ts`
  - `src/workflows/TaskWorkflow.ts`
  - `src/keystone/agents/base/KeystoneThinkAgent.ts`
  - `src/durable-objects/RunCoordinatorDO.ts`
  - `src/durable-objects/TaskSessionDO.ts`
- Repo-level alignment:
  - `scripts/ensure-demo-project.ts`
  - `scripts/demo-run.ts`
  - `scripts/demo-validate.ts`
  - `tests/http/app.test.ts`
  - `tests/http/projects.test.ts`
  - `tests/scripts/demo-contracts.test.ts`
  - `README.md`
  - `.ultrakit/developer-docs/*`

## Phases

### Phase 1: Freeze the canonical UI-first resource contracts, route matrix, and module structure

#### Phase Handoff

**Goal**  
Define the stable public resource types, collection/detail envelopes, projection/stub conventions, operator-steering message contract, module organization, and the new route matrix in code before any deep handler rewiring starts.

**Scope Boundary**  
In scope: shared HTTP contract modules, route naming, response/status conventions, resource-oriented API module structure, the task-conversation message contract, and any small router scaffolding needed to make the contract concrete. Out of scope: deep handler logic, projection queries, artifact-content loading, and broad script/doc updates.

**Read First**  
`product-specs/keystone-relaxed-design.md`  
`product-specs/platform-vs-vertical.md`  
`design/design-guidelines.md`  
`src/http/router.ts`  
`src/http/contracts/project-input.ts`  
`src/http/contracts/run-input.ts`  
`src/keystone/compile/contracts.ts`  
`src/lib/events/types.ts`

**Files Expected To Change**  
`.ultrakit/exec-plans/active/keystone-ui-first-api-scaffold.md`  
`src/http/router.ts`  
`src/http/contracts/` and/or new resource-oriented API modules under `src/http/`  
Possibly `tests/http/` contract-shape tests if needed to lock the type layer

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
```

Success means the new contract modules compile cleanly, the route matrix is represented in code without ambiguous naming, and the target API module structure is explicit.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and this phase handoff in the plan.

**Deliverables**  
- Canonical resource type definitions
- Canonical route matrix in code
- Canonical operator-steering message contract for task conversation
- Explicit `reused | projected | stub` scaffold convention
- Explicit target module organization for the public API code
- Structured `not_implemented` error contract for unfinished writes

**Commit Expectation**  
`Freeze UI-first API contracts`

**Status**  
Completed on 2026-04-18.

**Completion Notes**  
- Added canonical public resource schemas for `Project`, `ProjectDocument`, `DecisionPackage`, `Run`, `Task`, `WorkflowGraph`, `TaskConversation`, `Artifact`, `Approval`, `EvidenceBundle`, `IntegrationRecord`, and `Release` under `src/http/api/v1/`.
- Added shared detail/collection/action envelope builders plus explicit scaffold metadata so responses can declare `reused`, `projected`, or `stub` backing.
- Added a resource-family route matrix with explicit availability states, wired `src/http/router.ts` through `registerV1Routes(...)`, and preserved current concrete handlers only for the already-real project/run/approval surfaces.
- Added the canonical task-conversation message write contract and shared `not_implemented` error response, and introduced `/v1/runs/:runId/stream` as the canonical UI stream alias over the current websocket transport.
- Repointed project serialization onto the new canonical `Project` schemas so the old handler layer no longer owns the public resource shape definition.

**Next Starter Context**  
- Phase 2 should start from `src/http/api/v1/route-matrix.ts`, `src/http/api/v1/runs/contracts.ts`, `src/http/api/v1/projects/contracts.ts`, and the current `src/http/handlers/*.ts` modules.
- The main implementation gap is route behavior, not naming: `POST /v1/runs` and `GET /v1/runs/:runId` are still transitional and must be rewritten to emit the frozen `Run` contract rather than the old M1 launcher/summary shapes.
- The new `contract_frozen` routes are intentionally not mounted yet. Phase 2 should make the read surfaces real in the new module layout instead of adding compatibility shims in the old flat structure.
- `/v1/runs/:runId/stream` is now the canonical UI path, while `/events` and `/ws` should be treated as legacy/debug seams until the new projections are stable enough to retire or clearly demote them.

**Known Constraints / Baseline Failures**  
- Do not redesign persistence in this phase.
- The current public router and tests still assume the old M1 surface.
- Build baseline requires running outside the sandbox.

### Phase 2: Reorganize the API code and rework core read APIs around current persisted state and sanctioned projections

#### Phase Handoff

**Goal**  
Make the core UI read surfaces real by moving the API into the new resource-oriented structure and mapping current stores and workflow outputs onto the new `Project`, `Run`, `Task`, `WorkflowGraph`, `Artifact`, and `Approval` contracts.

**Scope Boundary**  
In scope: handler rewiring, module moves/restructure, serializers, projection helpers, route replacement, and direct reads from existing tables/artifacts/coordinator state. Out of scope: new runtime behavior, new durable stores for missing resources, and rich multi-role conversation behavior.

**Read First**  
`src/http/router.ts`  
`src/http/handlers/projects.ts`  
`src/http/handlers/runs.ts`  
`src/http/handlers/approvals.ts`  
`src/lib/db/schema.ts`  
`src/lib/db/projects.ts`  
`src/lib/db/runs.ts`  
`src/lib/db/events.ts`  
`src/lib/db/artifacts.ts`  
`src/lib/db/approvals.ts`  
`src/lib/runs/summary.ts`  
`src/keystone/tasks/load-task-contracts.ts`  
`src/keystone/compile/contracts.ts`

**Files Expected To Change**  
`.ultrakit/exec-plans/active/keystone-ui-first-api-scaffold.md`  
`src/http/router.ts`  
`src/http/handlers/projects.ts`  
`src/http/handlers/runs.ts`  
`src/http/handlers/approvals.ts`  
New resource-oriented modules for tasks, artifacts, and graph projections  
Potentially `src/lib/db/approvals.ts` and `src/lib/db/artifacts.ts` for missing read helpers  
`tests/http/app.test.ts`  
`tests/http/projects.test.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
```

Success means the new read endpoints return stable typed shapes and the tests no longer lock the old M1 run-summary contract as canonical.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, `Artifacts and Notes`, and this phase handoff in the plan.

**Deliverables**  
- New core read endpoints backed by current state
- Resource-oriented API module structure in active use
- Projection helpers for `Run`, `Task`, and `WorkflowGraph`
- Artifact and approval read surfaces
- Updated tests for the new route shapes

**Commit Expectation**  
`Rework core UI-first read APIs`

**Known Constraints / Baseline Failures**  
- `Run` and `Task` are still projections, not rows.
- `WorkflowGraph` will be mostly flat because live compile still rejects dependency edges.
- Raw run-event routes may need to remain available temporarily for debug/script compatibility during execution.

### Phase 3: Add `TaskConversation`, operator steering, and typed stub surfaces for non-real resources

#### Phase Handoff

**Goal**  
Define the remaining UI-facing surfaces so the frontend can wire against them now, using honest projections where possible and typed stubs where current backend behavior does not exist yet, including the canonical operator-steering route for the implementer.

**Scope Boundary**  
In scope: `TaskConversation`, conversation-message writes, stream aliasing, stub `ProjectDocument`/`DecisionPackage`/`EvidenceBundle`/`IntegrationRecord`/`Release` surfaces, and structured `not_implemented` write paths. Out of scope: implementing full document persistence, decision-package lifecycle, multi-role review/test execution, or release orchestration.

**Read First**  
`src/workflows/TaskWorkflow.ts`  
`src/keystone/agents/base/KeystoneThinkAgent.ts`  
`src/lib/events/types.ts`  
`src/lib/db/events.ts`  
`src/lib/db/workspaces.ts`  
`src/durable-objects/RunCoordinatorDO.ts`  
`design/design-guidelines.md`  
`product-specs/keystone-relaxed-design.md`

**Files Expected To Change**  
`.ultrakit/exec-plans/active/keystone-ui-first-api-scaffold.md`  
New handler/serializer modules for task conversation and stub resources  
`src/http/router.ts`  
Potentially `src/http/handlers/ws.ts` if a new canonical stream path is added  
Potentially `tests/http/app.test.ts` and new task-conversation contract tests

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
```

Success means the UI-facing conversation and stub endpoints exist with stable shapes, the operator-steering write route exists with a stable request/response contract, and unsupported behavior fails honestly through the new contract.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, `Artifacts and Notes`, and this phase handoff in the plan.

**Deliverables**  
- `TaskConversation` projection endpoint
- Canonical `TaskConversation` message-write endpoint for operator steering
- Canonical stream endpoint/path for UI consumption
- Typed stub endpoints for unfinished resource families
- Structured `not_implemented` write behavior

**Commit Expectation**  
`Scaffold task conversation and operator steering`

**Known Constraints / Baseline Failures**  
- Current runtime is implementer-only and single-turn-per-task.
- Approvals are run-scoped today, not task review/test scoped.
- There is no first-class conversation store; the conversation is a projection over events.

### Phase 4: Migrate the demo, tests, docs, and notes to the new contract

#### Phase Handoff

**Goal**  
Bring the repo into one coherent API language by migrating the demo flow, scripts, tests, README guidance, and developer docs that still present the old M1 contract.

**Scope Boundary**  
In scope: demo scripts, fixture/bootstrap helpers needed by the demo, contract tests, README/API examples, developer docs, and `.ultrakit/notes.md` if new durable learnings emerge. Out of scope: adding deeper backend behavior for currently stubbed resources beyond what earlier phases delivered.

**Read First**  
`README.md`  
`.ultrakit/developer-docs/m1-architecture.md`  
`.ultrakit/notes.md`  
`scripts/ensure-demo-project.ts`  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`  
`scripts/run-local.ts`  
`tests/scripts/demo-contracts.test.ts`  
`tests/http/app.test.ts`

**Files Expected To Change**  
`.ultrakit/exec-plans/active/keystone-ui-first-api-scaffold.md`  
`README.md`  
`.ultrakit/developer-docs/m1-architecture.md` and/or a new API contract doc  
`.ultrakit/notes.md` if needed  
`scripts/ensure-demo-project.ts`  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`  
`scripts/run-local.ts`  
`tests/scripts/demo-contracts.test.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Success means the repo docs and scripts no longer describe the old surface as canonical, and the broad validation baseline still passes.

**Plan / Docs To Update**  
Update all living sections in the plan, especially `Progress`, `Execution Log`, `Outcomes & Retrospective`, and the relevant phase handoff.

**Deliverables**  
- Working demo flow on the new API contract
- Updated scripts, tests, README examples, and docs for the new contract
- Final plan notes on remaining stubbed resources and deferred backend implementation work

**Commit Expectation**  
`Align repo to UI-first API contract`

**Known Constraints / Baseline Failures**  
- The demo must be migrated, not left on the old route matrix.
- `run-local` may still be retired or rewritten separately if it remains structurally stale against the new surface.
- `build` baseline still requires the host-local Wrangler/Docker environment outside the sandbox.
