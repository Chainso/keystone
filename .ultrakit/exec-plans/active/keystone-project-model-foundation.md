# Keystone Project Model Foundation

## Purpose / Big Picture

Keystone currently runs directly against ad hoc repo input. After this plan lands, users will work inside durable `Project` objects instead. A project will be the stable backend configuration boundary for where work happens and how project-level defaults are defined: which code components participate, which tenant-level integrations are attached, which environment variables apply, and what review/test rules should be used by default.

The observable outcome is:

- operators can create and manage projects through the backend API,
- every run is created from a `projectId` instead of a direct repo payload,
- a project can contain multiple peer code components,
- run workspaces materialize those code components together under a multi-component filesystem layout,
- task branch/worktree strategy applies consistently across all branch-capable code components in the project, and
- the existing scripted and Think-backed demo flows still work by targeting a fixture project instead of raw repo input.

This plan intentionally creates the `Project` concept as a durable backend primitive now, while leaving room for broader non-code project components later.

## Backward Compatibility

Backward compatibility is **not required** for this work. The user explicitly wants the optimal backend model, not continuity with the current ad hoc run contract or temporary single-repo execution shape.

The implementation should therefore prefer the cleanest end-state design even when that means changing existing API shapes, run metadata conventions, workspace persistence, demo scaffolding, or internal module boundaries.

The only constraints to preserve are architectural, not backward-compatibility driven:

- Keep `Project` as a Keystone product object rather than a Maestro primitive.
- Keep the project abstraction generic even though `git_repository` is the only active component kind in `v1`.
- Keep the file-first artifact model and Keystone ownership of orchestration, approvals, artifact promotion, and workflow truth.
- Keep the current project note that `Thread` and `Lease` should not become first-class product primitives unless a concrete gap appears.

## Design Decisions

1. **Date:** 2026-04-17  
   **Decision:** Model `Project` as a Keystone-level product object, not as a Maestro primitive.  
   **Rationale:** Projects are user-facing delivery configuration, not reusable execution-kernel mechanics. Maestro should continue to receive resolved session/workspace inputs rather than own product concepts.  
   **Alternatives considered:** Adding `Project` directly to Maestro contracts; treating project config as opaque run metadata only.

2. **Date:** 2026-04-17  
   **Decision:** Require every run to reference `projectId`; remove the ad hoc direct-repo run path once project-backed execution is wired.  
   **Rationale:** The user wants users to work within projects, not against one-off repo input, and explicitly does not care about backward compatibility. Keeping both paths would be architectural drag.  
   **Alternatives considered:** Keeping ad hoc runs indefinitely; making projects optional on `/v1/runs`.

3. **Date:** 2026-04-17  
   **Decision:** Represent project contents as generic `ProjectComponent` records, with `git_repository` as the only active kind in `v1`.  
   **Rationale:** The user explicitly does not want `Project` tied conceptually to Git repositories even though code repos are the immediate use case. The schema and API need a clean abstraction boundary now.  
   **Alternatives considered:** Modeling projects directly as “a list of repositories”; delaying the abstraction until non-code components exist.

4. **Date:** 2026-04-17  
   **Decision:** Treat all project components as peers; do not introduce a designated primary code component in `v1`.  
   **Rationale:** The user explicitly wants peer components. This keeps the model symmetric and avoids hidden priority rules before a real need appears.  
   **Alternatives considered:** A required “primary repository” with secondary supporting repos.

5. **Date:** 2026-04-17  
   **Decision:** Materialize all code components in a project by default for every run, with no subset-selection feature in `v1`.  
   **Rationale:** The user wants the project to define where work happens. Partial-component selection would complicate run semantics and workspace integrity before the base model is proven.  
   **Alternatives considered:** Run-time selection of a component subset; per-task component targeting as an `M1` concern.

6. **Date:** 2026-04-17  
   **Decision:** Use a multi-component code layout rooted at `/workspace/code/<component-key>/...` for project-backed workspaces.  
   **Rationale:** The user prefers a multiple-repo-by-default layout and specifically suggested `/workspace/code/<code-related-component>` for code assets. This makes the multi-component nature explicit without losing a stable prefix.  
   **Alternatives considered:** Reusing the single-repo `/workspace/repo` shape; placing all components directly under `/workspace/<component-key>`.

7. **Date:** 2026-04-17  
   **Decision:** Apply the same task branch/worktree naming strategy across all branch-capable code components in the project.  
   **Rationale:** The user explicitly wants one branching/worktree strategy applied project-wide across repositories. Shared branch naming keeps task execution auditable and consistent.  
   **Alternatives considered:** Per-component branch names; allowing mixed workspace strategies per code component in `v1`.

8. **Date:** 2026-04-17  
   **Decision:** Do not create a `ProjectSnapshot` table. Instead, freeze actual materialization state in run/workspace bindings when a run provisions its workspace.  
   **Rationale:** The user does not want project config changes to force workspace rematerialization, but also does not want a separate snapshot concept now. Recording the actual materialized refs/paths per run gives stable execution without adding another top-level domain object.  
   **Alternatives considered:** A first-class `ProjectSnapshot`; re-reading live project config during long-running execution.

9. **Date:** 2026-04-17  
   **Decision:** Store project configuration in structured DB fields, including project-wide env vars plus review/test rules, with optional per-component overrides for review/test only.  
   **Rationale:** The user explicitly wants DB-backed project config, env vars in scope now, and project-wide review/test rules that components can override.  
   **Alternatives considered:** Manifest-file-backed project config; project-wide rules only; per-component env var overrides in `v1`.

10. **Date:** 2026-04-17  
    **Decision:** Project integrations will reference tenant-level integration definitions with project-specific overrides; project config will not own integration definitions directly.  
    **Rationale:** The user explicitly chose the reusable-tenant-integration model. This avoids duplicating integration definitions across projects.  
    **Alternatives considered:** Storing full integration config directly on each project.

11. **Date:** 2026-04-17  
    **Decision:** Keep sandbox/runtime selection and default commands out of the `Project` model in `v1`.  
    **Rationale:** The user explicitly does not want sandbox/runtime or default-command config folded into the first cut. The project should focus on code location, env vars, integrations, and delivery rules.  
    **Alternatives considered:** Adding runtime profiles or default shell commands directly to project defaults.

12. **Date:** 2026-04-17  
    **Decision:** Add minimal project CRUD in `v1` (`create`, `list`, `get`, `update`) and omit delete until there is a demonstrated need.  
    **Rationale:** Projects are expected to be durable setup objects that do not change frequently. The first backend cut should prioritize stable creation and use over destructive lifecycle semantics.  
    **Alternatives considered:** Adding delete/archive immediately; exposing project creation only through fixture bootstrap scripts.

13. **Date:** 2026-04-17  
    **Decision:** Optimize phases and code changes for the cleanest project-backed end state, not for transitional compatibility with the current single-repo backend.  
    **Rationale:** The user explicitly prefers the optimal design over backward compatibility. This means the plan should replace legacy contracts directly when the better model is ready instead of carrying compatibility shims.  
    **Alternatives considered:** Maintaining dual repo/project run paths; preserving single-repo workspace helpers as compatibility layers longer than necessary.

## Execution Log

- **Date:** 2026-04-17  
  **Phase:** Planning  
  **Decision:** Create a standalone execution plan for the project model instead of reopening one of the completed runtime/workflow plans.  
  **Rationale:** The `Project` concept changes backend contracts across schema, API, workspaces, and workflows, so it needs its own plan and approval boundary.

- **Date:** 2026-04-17  
  **Phase:** Planning  
  **Decision:** Treat the current backend as “single-repo-shaped” and explicitly plan the migration seams rather than pretending projects can be added as a thin alias layer.  
  **Rationale:** Current code hardcodes single-repo input and workspace assumptions in the API, DB schema, and workspace materializer. The plan must make those seams first-class so execution can change them coherently.

- **Date:** 2026-04-17  
  **Phase:** Execution Setup  
  **Decision:** Start execution with a plan-repair pass that adds the required per-phase handoff capsules and flips the active index to `In Progress` before any implementation subagent is launched.  
  **Rationale:** The execute-stage contract requires accurate `Phase Handoff` subsections before a phase can be delegated, and the plan previously stopped at planning with no execution handoff scaffolding.

- **Date:** 2026-04-17  
  **Phase:** Phase 1  
  **Decision:** Model the project foundation with dedicated tables for projects, project-level rule sets, components, component rule overrides, env vars, and integration bindings, while keeping `git_repository` as the only active component kind in the typed contracts.  
  **Rationale:** Later phases need a durable, queryable project graph before HTTP CRUD or run/workspace rewiring can land, and the user explicitly wants a generic project abstraction without adding snapshot tables or compatibility shims.

- **Date:** 2026-04-17  
  **Phase:** Phase 1 Fix Pass  
  **Decision:** Keep `project_component_rule_overrides` normalized on `component_id` only and align the Drizzle schema/repository loading logic to that table shape instead of adding a redundant `project_id` column after the fact.  
  **Rationale:** The Phase 1 migration already established a valid 1:1 override-to-component model. Fixing the repository/runtime mismatch in code preserves the cleaner schema, avoids duplicate foreign-key state, and restores fresh-migration correctness.

- **Date:** 2026-04-17  
  **Phase:** Phase 2  
  **Decision:** Expose project CRUD through tenant-scoped `/v1/projects` routes, use the existing project repository graph as the API source of truth, and add a deterministic `demo:ensure-project` helper that converges on the fixture project by key without changing `/v1/runs` yet.  
  **Rationale:** Later phases need a real HTTP-backed project object before run creation switches to `projectId`, and the fixture bootstrap path should be safely rerunnable per tenant while preserving the current repo-backed run flow until workspace and workflow seams are ready.

- **Date:** 2026-04-17  
  **Phase:** Phase 2 Fix Pass  
  **Decision:** Move request-validation error shaping back onto the project HTTP surface, add nested uniqueness checks in the project contract, and deepen the project/bootstrap tests to assert the full Phase 2 config graph.  
  **Rationale:** The review findings showed the broad `app.onError` Zod handling changed non-project routes like `/v1/runs`, duplicate nested keys were still leaking to database unique constraints, and the existing tests were too shallow to catch regressions in rule sets, overrides, env vars, bindings, or metadata.

- **Date:** 2026-04-17  
  **Phase:** Phase 3  
  **Decision:** Keep one durable `workspace_bindings` row per task workspace and add a separate per-component materialization table, while exposing the agent-visible workspace as a shared root that contains `/workspace/code/<component-key>` entries plus a derived `defaultCwd` for legacy single-component flows.  
  **Rationale:** Phase 3 needs stable per-run component refs/paths without losing the existing workspace/session identity, and the current task/process paths still need a safe default cwd until Phase 4 rewires workflows fully onto projects.

## Progress

- [x] 2026-04-17 Discovery completed for the `Project` concept and core product decisions are resolved.
- [x] 2026-04-17 Active plan created and registered in `.ultrakit/exec-plans/active/index.md`.
- [x] 2026-04-17 Broad baseline captured before execution: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` all pass.
- [x] 2026-04-17 User approved execution; active index now marks this plan `In Progress`, and execution-stage phase handoffs are populated.
- [x] 2026-04-17 Phase 1 completed: added append-only project-domain migrations, Drizzle schema, typed project contracts, repository helpers, and repository-level tests for project/config graph persistence.
- [x] 2026-04-17 Phase 1 fix pass completed: repository override loading now matches the normalized migration shape, and project repository tests are isolated and cover tenant scoping plus duplicate-key rejection.
- [x] 2026-04-17 Phase 2 completed: added tenant-scoped project CRUD routes, typed project API contracts with request validation, and a deterministic fixture-project bootstrap helper plus route/script coverage.
- [x] 2026-04-17 Phase 2 fix pass completed: project-only validation errors are now scoped to `/v1/projects`, duplicate nested keys are rejected at the contract layer, and the route/script tests assert the richer project config surface.
- [x] 2026-04-17 Phase 3 completed: workspace persistence now records per-component materializations, the sandbox workspace root exposes `/workspace/code/<component-key>`, and task sessions derive a stable default cwd from the materialized component set.
- [ ] Phase 4: require `projectId` on runs and wire project-backed workspace execution through workflows, task sessions, and demo scripts.
- [ ] Phase 5: update docs, notes, and demo/runbook guidance, then close out the plan.

## Surprises & Discoveries

- The current `POST /v1/runs` contract in `src/http/contracts/run-input.ts` is still single-repo shaped: it requires exactly one `repo.localPath` or `repo.gitUrl` plus a decision package.
- `src/http/handlers/runs.ts` persists repo selection directly into the run session metadata and starts workflows without any project lookup step.
- The current persistence model has no project tables. `migrations/0001_m1_operational_core.sql` and `src/lib/db/schema.ts` only define sessions, artifacts, events, approvals, workspace bindings, and worker leases.
- `workspace_bindings` and `src/lib/db/workspaces.ts` are single-repo oriented today: one binding row carries `repo_url`, `repo_ref`, `base_ref`, `worktree_path`, and `branch_name`.
- `src/lib/workspace/worktree.ts` and `src/lib/workspace/init.ts` assume one repository root under `/workspace/runs/.../repo` and one task worktree beneath that root.
- The operator-facing demo scripts still create runs with fixture repo paths rather than a project reference.
- Broad baseline validation is currently clean, which means the plan can use repo-wide `lint`, `typecheck`, `test`, and `build` as trustworthy gates instead of targeted-only validation.
- `wrangler deploy --dry-run --outdir .wrangler/deploy` still needs to run outside the Codex sandbox boundary on this host because Wrangler logging and Docker buildx both write under non-writable home-directory paths during the build.
- `project_component_rule_overrides` does not need its own `project_id` column because the owning project is derivable from `project_components`; the Phase 1 repository mismatch came from the runtime layer, not from the migration design.
- Route-level tests that import `src/http/app.ts` need to stub unrelated run/dev handler modules when they only care about project routes; otherwise the full router import can walk into Cloudflare-only workflow entrypoints during Node test execution.
- Project request validation has to stay route-scoped in Phase 2: handling raw `ZodError` globally in `src/http/app.ts` also changes invalid `/v1/runs` behavior before the run-contract migration is ready.
- The agent-visible workspace root can move to the shared run workspace in Phase 3 without breaking the current single-component task flows as long as task sessions persist a derived `defaultCwd` that still points at the one materialized component worktree.

## Outcomes & Retrospective

Planning outcome on 2026-04-17:

- The `Project` concept is now fully scoped as a new backend feature with product and architectural decisions resolved before coding starts.
- The plan intentionally replaces the ad hoc repo-backed backend with a project-backed model and avoids preserving legacy shapes that no longer fit the target design.
- The highest-risk implementation seams are clear up front: schema changes, run contract changes, workspace generalization, and workflow/demo migration.
- No execution work has started yet. Approval is required before this plan moves into implementation.

Phase 1 outcome on 2026-04-17:

- Keystone now has a durable project-domain persistence layer with explicit tables for projects, components, rule sets, env vars, and project-to-tenant integration bindings.
- The repository layer can create, fetch, list, and replace a full project configuration graph without touching run creation or workspace execution yet.
- Typed backend contracts now define the generic project/component/config surface for later HTTP and workflow phases, while constraining `v1` execution to `git_repository` components only.
- Broad validation remains green after the new schema/repository layer landed.
- The targeted fix pass resolved the override-table rollout blocker by matching the repository layer to the shipped migration shape and expanded repository tests to cover tenant isolation, duplicate project-key rejection, and isolated update setup.

Phase 2 outcome on 2026-04-17:

- Keystone now exposes tenant-scoped `create`, `list`, `get`, and `update` project endpoints at `/v1/projects`, backed directly by the Phase 1 project repository graph.
- Project API requests now return structured validation errors as HTTP 400 responses from the project route layer, while invalid `/v1/runs` requests remain on their pre-existing non-project error path until the later run phases.
- The project request contract now rejects duplicate `components.componentKey`, `envVars.name`, and `integrationBindings.bindingKey` values before they can fall through to database unique-constraint errors.
- The repo now includes `scripts/ensure-demo-project.ts` plus `npm run demo:ensure-project`, which safely creates or updates one deterministic `fixture-demo-project` per tenant without changing the still-repo-backed `/v1/runs` path.
- The route and script tests now assert the richer Phase 2 config surface, including rule sets, per-component rule overrides, env vars, integration bindings, and metadata.
- Broad validation passed again for `lint`, `typecheck`, and `test` after the targeted fix pass; the earlier Phase 2 build remains the last broad build proof because this fix stayed inside project request handling and test coverage.

Phase 3 outcome on 2026-04-17:

- Workspace persistence now keeps one durable binding row per task workspace plus per-component materialization rows that record the actual refs, repository paths, worktree paths, branch names, and head SHAs used for that run.
- Sandbox workspaces now expose a shared root whose code surface lives under `/workspace/code/<component-key>`, while the agent bridge control files describe the full component set instead of a single repo/worktree pair.
- Task sessions now materialize and persist multi-component workspaces, publish component-aware workspace events, and derive a `defaultCwd` so the current single-component demo/runtime paths still execute without forcing the Phase 4 run-contract migration early.
- Broad validation passed for `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` after rerunning the build outside the sandbox boundary due the known Wrangler/Docker host-write requirement on this machine.

## Context and Orientation

The current backend shape relevant to this plan is:

- `src/http/contracts/run-input.ts` currently requires a single `repo` selection and a `decisionPackage`; there is no `projectId`.
- `src/http/handlers/runs.ts` creates run sessions directly from ad hoc repo input and writes `repo`, `decisionPackage`, `runtime`, and `options` into session metadata.
- `migrations/0001_m1_operational_core.sql` and `src/lib/db/schema.ts` define no project-domain tables yet.
- `src/lib/db/workspaces.ts` persists a single repo binding per workspace/session today.
- `src/lib/workspace/worktree.ts` builds a single workspace root, a single repository path, and task worktree paths under that repo.
- `src/lib/workspace/init.ts` and the sandbox agent bridge assume one repository/worktree pair plus projected artifacts under `/artifacts/in`, `/artifacts/out`, and `/keystone`.
- `src/durable-objects/TaskSessionDO.ts`, `src/workflows/RunWorkflow.ts`, and `src/workflows/TaskWorkflow.ts` currently depend on that single-repo workspace shape.
- `scripts/demo-run.ts` and `scripts/demo-validate.ts` still use the fixture repo and fixture decision package directly when creating demo runs.

Files and modules that matter most for this plan:

- `migrations/0001_m1_operational_core.sql`
- `src/lib/db/schema.ts`
- `src/lib/db/runs.ts`
- `src/lib/db/workspaces.ts`
- `src/http/contracts/run-input.ts`
- `src/http/handlers/runs.ts`
- `src/http/router.ts`
- `src/lib/workspace/worktree.ts`
- `src/lib/workspace/init.ts`
- `src/durable-objects/TaskSessionDO.ts`
- `src/workflows/RunWorkflow.ts`
- `src/workflows/TaskWorkflow.ts`
- `scripts/demo-run.ts`
- `scripts/demo-validate.ts`
- `tests/http/app.test.ts`
- `tests/lib/db-repositories.test.ts`
- `tests/lib/workspace-init.test.ts`
- `tests/lib/workflows/run-workflow-compile.test.ts`
- `tests/lib/workflows/task-workflow-think.test.ts`
- `tests/scripts/demo-contracts.test.ts`

The current project notes also matter:

- local Wrangler startup constraints in `.ultrakit/notes.md` still apply,
- the live Think full-workflow proof is still fixture-scoped,
- current planning preference remains “do not introduce first-class `Thread` or `Lease` primitives unless a concrete gap appears.”

## Plan of Work

The work starts by making the `Project` domain real in persistence and backend contracts before any run/workflow behavior changes. The current codebase has no project concept and several key modules hardcode “one run equals one repo input,” so the foundation has to exist before the execution path can move.

Once the core schema and repositories exist, the next step is to add project management APIs and a fixture-project bootstrap path. That gives the backend a real way to define and inspect projects before runs become strictly project-backed.

After that, the workspace layer has to become multi-component-aware. The current workspace model is single-repo at every level, so the plan introduces project-backed workspace materialization and stable code-component layout under `/workspace/code/<component-key>`. This is the most important execution substrate change because both scripted and Think-backed task paths depend on it.

Only after the project model and workspace model are real should the run/workflow path change. At that point, `/v1/runs` should require `projectId`, workflows should resolve project-backed code components and env vars directly, and the demo scripts should move fully onto a fixture project.

The final phase is documentation and closeout. The repo needs durable docs for the new hierarchy (`Tenant -> Project -> Run -> Session -> Workspace -> Task view`), updated runbooks, and an explicit record of any deferred gaps such as future non-code components or secret-backed project environment config.

## Concrete Steps

1. Reconfirm the current baseline and the single-repo seams:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
npm run lint
npm run typecheck
npm run test
npm run build
rtk sed -n '1,220p' src/http/contracts/run-input.ts
rtk sed -n '1,220p' src/lib/db/workspaces.ts
rtk sed -n '1,220p' src/lib/workspace/worktree.ts
```

Expected result: broad validation remains green and the current single-repo contract is visible in source before migration work begins.

2. Add the project-domain foundation:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk sed -n '1,220p' migrations/0001_m1_operational_core.sql
rtk sed -n '1,240p' src/lib/db/schema.ts
```

Expected result: new project-domain tables, Drizzle schema, and repositories exist for projects, components, integration bindings, env vars, and rule overrides.

3. Add project APIs and fixture bootstrap support:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk sed -n '1,260p' src/http/router.ts
rtk sed -n '1,260p' src/http/handlers/runs.ts
```

Expected result: the backend can create, list, fetch, and update projects, and there is a deterministic fixture-project path for later demo/run validation.

4. Generalize workspace materialization:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk sed -n '1,260p' src/lib/workspace/init.ts
rtk sed -n '1,220p' src/lib/workspace/worktree.ts
```

Expected result: project-backed code components materialize under `/workspace/code/<component-key>/...`, and task branch/worktree helpers work across all branch-capable code components.

5. Rewire runs and workflows to require projects:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk sed -n '1,260p' src/http/contracts/run-input.ts
rtk sed -n '1,260p' src/workflows/RunWorkflow.ts
rtk sed -n '1,260p' src/workflows/TaskWorkflow.ts
npm run demo:run
npm run demo:validate
```

Expected result: `POST /v1/runs` requires `projectId`, all direct repo-backed run creation is removed, and the project-backed demo/runtime paths execute against the new workspace layout.

## Validation and Acceptance

This plan is accepted only when all of the following are true:

1. `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass after the project model lands.
2. The backend exposes project management APIs sufficient to create, list, fetch, and update projects.
3. A project can contain multiple peer `git_repository` code components plus project-level env vars and review/test rules.
4. Project review/test rules are project-wide by default and support per-component overrides.
5. Project integrations are stored as references to tenant-level integrations with project-specific overrides.
6. `/v1/runs` requires `projectId` instead of direct repo input.
7. Every run materializes all code components in the project by default.
8. The workspace layout exposes project code components under `/workspace/code/<component-key>/...`.
9. The task branch/worktree strategy applies consistently across all branch-capable code components in the project.
10. Existing run execution remains stable even if the project definition changes later; the run uses the materialization state recorded at workspace-provision time rather than rematerializing from updated project config.
11. The fixture demo path still works, but now through a fixture project instead of raw fixture repo input.
12. The scripted default runtime and the Think-backed runtime both remain supported after the project migration.
13. Docs and runbooks describe the new project-backed backend flow accurately.

Current baseline before execution:

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes with `27 passed | 1 skipped` test files and `94 passed | 3 skipped` tests.
- `npm run build` passes via `wrangler deploy --dry-run --outdir .wrangler/deploy`.

These are baseline truths, not new acceptance targets.

## Idempotence and Recovery

- Schema changes must be append-only through new migrations. Do not rewrite the existing `0001` migration.
- Fixture-project bootstrap logic should be safe to rerun and should converge on one deterministic fixture project per tenant rather than duplicating rows on every test/demo pass.
- Run contract migration should prefer the clean end-state API and execution shape over compatibility shims. If a legacy helper is removed, replace it with the project-backed version in the same phase where practical instead of carrying both.
- Workspace materialization must record the actual component refs/paths used for a run so long-running execution does not silently drift if a project changes later.
- Keep project env vars non-secret in `v1`. If secret needs appear during execution, record them as deferred work instead of inventing ad hoc secret storage.
- If execution stops mid-phase, update `Progress`, `Execution Log`, `Surprises & Discoveries`, and that phase’s `Phase Handoff` before handing off.

## Artifacts and Notes

Planning-time baseline captured on 2026-04-17:

```text
$ npm run lint
> eslint .
```

```text
$ npm run typecheck
> tsc --noEmit
```

```text
$ npm run test
Test Files  27 passed | 1 skipped (28)
Tests  94 passed | 3 skipped (97)
```

```text
$ npm run build
--dry-run: exiting now.
```

Current implementation seams observed during planning:

- `src/http/contracts/run-input.ts` has no `projectId`; it still requires exactly one repo source.
- `src/http/handlers/runs.ts` writes repo input directly into run session metadata.
- `workspace_bindings` is still single-repo shaped in `migrations/0001_m1_operational_core.sql` and `src/lib/db/schema.ts`.
- `src/lib/workspace/worktree.ts` still builds `/workspace/runs/.../repo` and task paths under that one repo.

## Interfaces and Dependencies

The important contracts and modules that this plan will change are:

- The run-creation HTTP contract in `src/http/contracts/run-input.ts` and the run handlers in `src/http/handlers/runs.ts`.
- The persistence schema in `migrations/` plus the Drizzle definitions and repositories under `src/lib/db/`.
- The workspace materialization contract in `src/lib/workspace/init.ts`, `src/lib/workspace/worktree.ts`, and any sandbox bridge code that assumes one repo root.
- The run and task orchestration contracts in `src/workflows/RunWorkflow.ts`, `src/workflows/TaskWorkflow.ts`, and `src/durable-objects/TaskSessionDO.ts`.
- The fixture/demo scripts in `scripts/demo-run.ts` and `scripts/demo-validate.ts`.

The plan also depends on the existing Keystone architectural rules already recorded in product specs and notes:

- `Project` remains a Keystone object rather than a Maestro primitive.
- Workspaces remain file-first and Keystone remains the source of truth for workflow state, approvals, artifacts, and orchestration.
- Local `wrangler dev` validation still has host-specific constraints captured in `.ultrakit/notes.md`, so broad local worker validation should be scheduled only when the relevant phase needs it.

- `scripts/demo-run.ts` still posts the fixture repo path directly to `/v1/runs`.

Phase 2 validation captured on 2026-04-17:

```text
$ npm run lint
> eslint .
```

```text
$ npm run typecheck
> tsc --noEmit
```

```text
$ npm run test
Test Files  28 passed | 2 skipped (30)
Tests  105 passed | 8 skipped (113)
```

```text
$ npm run build
> wrangler deploy --dry-run --outdir .wrangler/deploy
--dry-run: exiting now.
```

Phase 3 validation captured on 2026-04-17:

```text
$ npm run lint
> eslint .
```

```text
$ npm run typecheck
> tsc --noEmit
```

```text
$ npm run test
Test Files  29 passed | 2 skipped (31)
Tests  111 passed | 8 skipped (119)
```

```text
$ npm run build
> wrangler deploy --dry-run --outdir .wrangler/deploy
--dry-run: exiting now.
```

Likely new files/modules by the end of execution:

- `migrations/0002_project_model.sql`
- `migrations/0003_project_workspace_components.sql` (or equivalent split if workspace refactor needs a separate migration)
- `src/lib/db/projects.ts`
- `src/http/contracts/project-input.ts`
- `src/http/handlers/projects.ts`
- `tests/http/projects.test.ts`
- `tests/lib/project-repositories.test.ts`
- `tests/lib/project-workspace-materialization.test.ts`

## Interfaces and Dependencies

Existing interfaces and modules this plan depends on:

- `RunInput` in `src/http/contracts/run-input.ts`
- run handlers in `src/http/handlers/runs.ts`
- operational schema in `src/lib/db/schema.ts`
- workspace repositories in `src/lib/db/workspaces.ts`
- workspace materialization in `src/lib/workspace/init.ts`
- workspace/task path builders in `src/lib/workspace/worktree.ts`
- run/task workflows in `src/workflows/RunWorkflow.ts` and `src/workflows/TaskWorkflow.ts`
- task session orchestration in `src/durable-objects/TaskSessionDO.ts`

New backend interfaces that should exist by the end of this plan:

- `Project`
- `ProjectComponent`
- `ProjectIntegrationBinding`
- `ProjectEnvVar`
- `ProjectRuleSet` (project-level review/test rules)
- component-level review/test override shape
- project-backed run creation contract
- project-backed workspace materialization contract

External/runtime dependencies remain the same as the current repo:

- Cloudflare Workers
- Cloudflare Workflows
- Cloudflare Durable Objects
- Cloudflare Sandboxes
- R2-backed artifacts
- Hyperdrive-backed Postgres
- local OpenAI-compatible backend at `http://localhost:10531`

The key architectural rule to preserve during execution is:

`Project` is a Keystone product object. It defines where work happens and what defaults apply, but Maestro still owns sessions, sandboxes, workspaces, events, artifacts, approvals, and execution mechanics.

### Phase 1: Add the project domain schema, repositories, and backend contracts

Create the durable backend foundation for projects without changing run/workflow behavior yet.

#### Phase Handoff

**Goal**  
Add project-domain persistence, repositories, and typed contracts so later phases can build APIs and execution behavior on a real model.

**Scope Boundary**  
In scope: migrations, Drizzle schema, repository helpers, typed project/component/rule/env/integration contracts, and repository-level tests.  
Out of scope: HTTP routes, run contract changes, workspace materialization changes, workflow execution changes.

**Read First**  
`migrations/0001_m1_operational_core.sql`  
`src/lib/db/schema.ts`  
`src/lib/db/workspaces.ts`  
`src/http/contracts/run-input.ts`  
`product-specs/platform-vs-vertical.md`  
`product-specs/keystone-relaxed-design.md`

**Files Expected To Change**  
`migrations/0002_project_model.sql`  
`src/lib/db/schema.ts`  
`src/lib/db/projects.ts`  
`src/keystone/projects/contracts.ts`  
`tests/lib/project-repositories.test.ts`  
`tests/lib/db-repositories.test.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Success means the new project-domain schema and repositories compile cleanly, broad validation stays green, and repository tests cover the new core tables/helpers.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and this phase handoff.

**Deliverables**  
Project-domain tables, repositories, and typed backend contracts for projects, components, env vars, review/test rules, and integration bindings.

**Commit Expectation**  
`Add project domain schema and repositories`

**Known Constraints / Baseline Failures**  
Keep the abstraction generic even though `git_repository` is the only active component kind in `v1`. Do not add a snapshot table in this phase.

**Status**  
Completed on 2026-04-17.

**Completion Notes**  
Added `0002_project_model.sql`, expanded `src/lib/db/schema.ts` with project-domain tables, introduced `src/lib/db/projects.ts` for project graph persistence, added typed contracts in `src/keystone/projects/contracts.ts`, and covered the new repository layer with `tests/lib/project-repositories.test.ts`. The targeted fix pass then aligned the repository/schema code with the normalized `project_component_rule_overrides(component_id)` table shape and made the repository tests independent while adding tenant-isolation and duplicate-project-key coverage. Validation passed with `npm run lint`, `npm run typecheck`, and `npm run test`; the earlier phase build remains the last broad build proof because this fix stayed inside repository/runtime-test surface only.

**Next Starter Context**  
Phase 2 can build directly on `src/lib/db/projects.ts` and `src/keystone/projects/contracts.ts` to expose tenant-scoped project CRUD plus deterministic fixture-project bootstrap support. The component override table should continue to treat `component_id` as its only key and derive project ownership through `project_components`. Run creation is still repo-backed at this point, so do not touch `/v1/runs` until the workspace and workflow phases.

### Phase 2: Add project CRUD, overrides, and fixture-project bootstrap support

Expose the project model over HTTP and give the repo a deterministic project-creation path for the existing fixture demo.

#### Phase Handoff

**Goal**  
Add minimal project CRUD plus a fixture-project bootstrap/ensure path so operators and later demo scripts have a real project to target.

**Scope Boundary**  
In scope: project request/response contracts, HTTP handlers/routes, validation, tenant scoping, project-wide and per-component rule/env/integration config handling, and a deterministic fixture-project bootstrap helper.  
Out of scope: requiring `projectId` on runs, workspace refactors, workflow changes.

**Read First**  
Phase 1 outputs  
`src/http/router.ts`  
`src/http/handlers/runs.ts`  
`src/http/middleware/auth.ts`  
`scripts/demo-run.ts`

**Files Expected To Change**  
`src/http/router.ts`  
`src/http/contracts/project-input.ts`  
`src/http/handlers/projects.ts`  
`src/http/app.ts`  
`scripts/ensure-demo-project.ts`  
`package.json`  
`tests/http/projects.test.ts`  
`tests/scripts/demo-contracts.test.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Success means project CRUD is tenant-scoped and validated, and the fixture-project helper converges deterministically without breaking the current demo scripts.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, `Artifacts and Notes`, and this phase handoff.

**Deliverables**  
Project CRUD endpoints, typed project API contracts, and deterministic fixture-project bootstrap support.

**Commit Expectation**  
`Add project API and fixture bootstrap`

**Known Constraints / Baseline Failures**  
No delete/archive behavior in `v1`. Keep projects stable setup objects. Non-code components remain configuration-only and should not gain execution semantics here.

**Status**  
Completed on 2026-04-17.

**Completion Notes**  
Added `src/http/contracts/project-input.ts` and `src/http/handlers/projects.ts` to expose tenant-scoped project CRUD with typed request/response handling, and wired the routes into `src/http/router.ts`. The targeted fix pass then moved structured Zod error shaping onto the project contract layer so `/v1/projects` returns `400 invalid_request` payloads without changing the still-repo-backed `/v1/runs` behavior, added nested uniqueness checks for component keys/env var names/integration binding keys in `src/keystone/projects/contracts.ts`, and expanded `tests/http/projects.test.ts`, `tests/http/app.test.ts`, and `tests/scripts/demo-contracts.test.ts` to assert the full Phase 2 config surface plus the preserved run-route behavior. Added `scripts/ensure-demo-project.ts` plus the `demo:ensure-project` package script to create-or-update one deterministic `fixture-demo-project` per tenant by calling the new HTTP API. Validation passed with `npm run lint`, `npm run typecheck`, `npm run test`, and the earlier Phase 2 `npm run build` remains the last broad build proof because the fix pass stayed inside project request handling and tests.

**Next Starter Context**  
Phase 3 can now assume projects are manageable through `/v1/projects`, that duplicate nested project keys are rejected before persistence, and that `fixture-demo-project` bootstrap is deterministic with the full Phase 2 config graph asserted in tests. `/v1/runs` is still repo-backed and must stay that way until the workspace substrate is generalized. The next pass should focus on `src/lib/db/workspaces.ts`, `src/lib/workspace/init.ts`, `src/lib/workspace/worktree.ts`, and related task-session/workspace tests to introduce `/workspace/code/<component-key>` materialization without yet requiring `projectId` on runs.

### Phase 3: Generalize workspace materialization to multi-component project workspaces

Change the execution substrate from one repo per run to one project-wide workspace containing all code components.

#### Phase Handoff

**Goal**  
Make the workspace layer project-backed and multi-component-aware, including the new `/workspace/code/<component-key>` filesystem layout.

**Scope Boundary**  
In scope: workspace persistence changes, multi-component materialization helpers, per-component workspace bindings/materialization records, branch/worktree helpers, and targeted workspace tests.  
Out of scope: project-required run creation, workflow contract changes, final demo script migration.

**Read First**  
Phase 1 outputs  
`src/lib/db/workspaces.ts`  
`src/lib/workspace/init.ts`  
`src/lib/workspace/worktree.ts`  
`src/durable-objects/TaskSessionDO.ts`  
`tests/lib/workspace-init.test.ts`  
`tests/lib/sandbox-agent-bridge.test.ts`

**Files Expected To Change**  
`migrations/0003_project_workspace_components.sql`  
`src/lib/db/schema.ts`  
`src/lib/db/workspaces.ts`  
`src/lib/workspace/init.ts`  
`src/lib/workspace/worktree.ts`  
`src/lib/workspace/git.ts`  
`src/durable-objects/TaskSessionDO.ts`  
`tests/lib/workspace-init.test.ts`  
`tests/lib/sandbox-agent-bridge.test.ts`  
`tests/lib/project-workspace-materialization.test.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Success means a project-backed workspace can materialize all code components into the new layout, task branch/worktree naming is applied consistently across those components, and broad validation remains green.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, `Artifacts and Notes`, and this phase handoff.

**Deliverables**  
Project-backed workspace materialization, multi-component code layout, and per-component workspace binding/materialization records.

**Commit Expectation**  
`Generalize workspace materialization for projects`

**Known Constraints / Baseline Failures**  
Do not invent non-code component execution semantics here. Keep the runtime surface centered on code components under `/workspace/code`.

**Status**  
Completed on 2026-04-17.

**Completion Notes**  
Added `0003_project_workspace_components.sql` to generalize workspace persistence, updated `src/lib/db/schema.ts` and `src/lib/db/workspaces.ts` to keep one workspace binding plus per-component materialization rows, and refactored `src/lib/workspace/init.ts`, `src/lib/workspace/worktree.ts`, and `src/lib/workspace/git.ts` to materialize multiple code components under `/workspace/code/<component-key>`. `src/durable-objects/TaskSessionDO.ts` now persists the component set, publishes component-aware workspace events, and uses a derived `defaultCwd` for current single-component execution. Targeted workspace, bridge, worktree, workflow-stub, and database tests were updated and expanded in `tests/lib/workspace-init.test.ts`, `tests/lib/project-workspace-materialization.test.ts`, `tests/lib/sandbox-agent-bridge.test.ts`, `tests/lib/worktree.test.ts`, `tests/lib/db-repositories.test.ts`, `tests/lib/workflows/task-workflow-think.test.ts`, and `tests/http/app.test.ts`. Validation passed with `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` after rerunning the build outside the sandbox due the known Wrangler/Docker host-write requirement.

**Next Starter Context**  
Phase 4 can now treat the workspace substrate as project-ready: task sessions can materialize a full component set and persist stable per-component refs/paths for the life of the run. The next pass should change `/v1/runs`, `RunWorkflow`, `TaskWorkflow`, and the demo scripts to resolve project components/env vars/rules and pass `components` into task-session workspace materialization instead of the legacy single-source path.

### Phase 4: Require project-backed runs and wire projects through workflows and demos

Move the actual run contract and execution path onto projects.

#### Phase Handoff

**Goal**  
Make every run require `projectId`, resolve project-backed code components/env vars/rules through workflows, and preserve the current demo/runtime proofs via a fixture project.

**Scope Boundary**  
In scope: run input contract changes, run handler lookup/validation, workflow params and metadata changes, task-session/project workspace resolution, env-var propagation for execution, demo-script migration, and end-to-end tests.  
Out of scope: adding secret-backed project environment config, non-code component execution, or broader workflow generalization beyond the current runtime proof.

**Read First**  
Phase 2 and Phase 3 outputs  
`src/http/contracts/run-input.ts`  
`src/http/handlers/runs.ts`  
`src/workflows/RunWorkflow.ts`  
`src/workflows/TaskWorkflow.ts`  
`src/durable-objects/TaskSessionDO.ts`  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`

**Files Expected To Change**  
`src/http/contracts/run-input.ts`  
`src/http/handlers/runs.ts`  
`src/workflows/RunWorkflow.ts`  
`src/workflows/TaskWorkflow.ts`  
`src/durable-objects/TaskSessionDO.ts`  
`src/lib/runs/summary.ts`  
`scripts/demo-run.ts`  
`scripts/demo-validate.ts`  
`package.json`  
`tests/http/app.test.ts`  
`tests/lib/workflows/run-workflow-compile.test.ts`  
`tests/lib/workflows/task-workflow-think.test.ts`  
`tests/scripts/demo-contracts.test.ts`

**Validation**  
Run from repo root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run demo:run
npm run demo:validate
```

Success means `/v1/runs` requires `projectId`, the fixture demo still passes through a fixture project, and both scripted and Think-backed paths can run against the project-backed workspace model.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, `Outcomes & Retrospective`, `Artifacts and Notes`, and this phase handoff.

**Deliverables**  
Project-required run creation, project-backed workflow execution, env-var propagation, and working demo scripts targeting a fixture project.

**Commit Expectation**  
`Require projects for runs and workflows`

**Known Constraints / Baseline Failures**  
Project env vars are non-secret only in `v1`. Keep the current scripted default runtime and Think runtime intact while migrating to project-backed execution.

**Status**  
Not started.

**Completion Notes**  
Pending.

**Next Starter Context**  
After this phase, ad hoc repo-backed runs should be gone and the operator-facing proof path should already be project-backed.

### Phase 5: Document the project-backed backend model and close out the plan

Leave behind durable docs for the new hierarchy and project-backed execution flow.

#### Phase Handoff

**Goal**  
Update developer docs, runbooks, notes, and any relevant product-spec context so future contributors can use and extend the project model without chat history.

**Scope Boundary**  
In scope: README/runbook/developer-doc updates, `.ultrakit/notes.md`, any relevant product-spec touchups, plan closeout, and explicit deferred debt recording if needed.  
Out of scope: adding more component kinds, secret-backed env handling, or new workflow roles.

**Read First**  
This plan in its latest state  
`.ultrakit/notes.md`  
`README.md`  
`.ultrakit/developer-docs/README.md`  
Phase 4 validation outputs

**Files Expected To Change**  
`README.md`  
`.ultrakit/developer-docs/**`  
`.ultrakit/notes.md`  
`.ultrakit/exec-plans/tech-debt-tracker.md`  
`.ultrakit/exec-plans/active/index.md`  
`.ultrakit/exec-plans/completed/README.md`  
This plan file and its archived location

**Validation**  
Run from repo root:

```bash
npm run demo:run
npm run demo:validate
npm run lint
npm run typecheck
npm run test
```

Success means the docs describe the same project-backed commands that just passed, and any deferred gaps are explicit before archive.

**Plan / Docs To Update**  
Update every living section of this plan plus any docs changed during the phase.

**Deliverables**  
Accurate docs for project-backed execution, updated project notes, and an archived plan when acceptance is met.

**Commit Expectation**  
`Document project-backed Keystone backend`

**Known Constraints / Baseline Failures**  
Do not archive the plan if the docs describe a project-backed demo flow that has not been rerun as written.

**Status**  
Not started.

**Completion Notes**  
Pending.

**Next Starter Context**  
No next phase until execution begins. The first implementation pass should start at Phase 1.
