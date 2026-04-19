# Keystone UI Project Management Live Wiring

## Purpose / Big Picture

This plan turns the existing project-management scaffold in the React UI into a real operator surface backed by Keystone's durable project APIs. After this work lands, an operator should be able to open the UI, see the real project list in the global project switcher, select the active project for the workspace, create a new project from the existing tabbed configuration flow, and edit the selected project's configuration through the same settings surface.

From the user's perspective, success means the current `New project` and `Project settings` screens stop being static placeholder copy and start driving the real `/v1/projects` backend contract. The app should still remain honest about the rest of the scaffold: `Runs`, `Documentation`, and `Workstreams` stay mostly placeholder destinations in this plan, but they now operate inside a real selected-project context instead of a hard-coded fake project.

## Backward Compatibility

Backward compatibility is required for the existing UI shell, route tree, and project API contract because the repository already ships a structure-first operator UI and the backend project routes are now part of the documented `v1` surface.

Compatibility constraints:

- Keep the route structure from `design/workspace-spec.md` intact: global project sidebar, `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings`.
- Preserve the existing backend `GET /v1/projects`, `POST /v1/projects`, `GET /v1/projects/:projectId`, and `PUT /v1/projects/:projectId` contract shapes.
- Do not expand this plan into live run, documentation, or workstream loading. Those surfaces should remain scaffold-only where the backend is still stubbed or where no UI data layer has been designed yet.
- Preserve the current validation baseline: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`, with the existing host-only caveat for the Wrangler build step.

## Design Decisions

1. **Date:** 2026-04-18  
   **Decision:** Keep the current UI information architecture and route tree, and treat this work as a project-data integration pass rather than a navigation redesign.  
   **Rationale:** `design/workspace-spec.md` already freezes the top-level structure and the Phase 3 scaffold already implements the route boundaries. The missing behavior is live project management, not a different page model.  
   **Alternatives considered:** Rework the sidebar and route hierarchy during the same plan; add project identifiers into every route.

2. **Date:** 2026-04-18  
   **Decision:** Add a same-origin local-dev UI bootstrap/auth seam on the Worker so the browser can call protected project APIs without hard-coded placeholder data.  
   **Rationale:** The current `v1` routes require dev auth (`Authorization: Bearer <KEYSTONE_DEV_TOKEN>` plus tenant id), but the SPA is served as static assets and cannot access Worker env vars directly. The UI needs a Worker-served bridge to establish browser auth for local development before it can replace scaffold project data.  
   **Alternatives considered:** Leave the UI mock-only; embed the raw dev token into the built frontend; redesign the entire auth model in this plan.

3. **Date:** 2026-04-18  
   **Decision:** Model selected-project state in a provider-backed UI context with local persistence, not in the URL.  
   **Rationale:** The workspace spec says project selection is global and should not be repeated inside each destination. The existing route tree is project-agnostic, so a provider with persisted selection keeps the intended one-project-at-a-time model without reopening route design.  
   **Alternatives considered:** Add `:projectId` to all routes; keep the active project purely in memory with no persistence.

4. **Date:** 2026-04-18  
   **Decision:** Reuse the existing tabbed `New project` and `Project settings` scaffold and fill it with real controlled form behavior mapped onto the existing `ProjectConfig` contract.  
   **Rationale:** The scaffold already reflects the workspace spec, including overview, components, rules, and environment tabs. Reusing it keeps the UI composition stable and focuses work on live data, validation, and submission.  
   **Alternatives considered:** Replace the tabbed scaffold with a new form; implement only one of create or update in this plan.

5. **Date:** 2026-04-18  
   **Decision:** After successful creation, switch the global selected project to the created record and route into `Project settings` for that project rather than sending the user to `Runs`.  
   **Rationale:** The newly created project should immediately become the workspace context, and `Runs` is still scaffold-only for now. Staying in the configuration flow is the least surprising path while the user is still shaping the new project.  
   **Alternatives considered:** Keep the old project selected after create; redirect to `Runs` immediately.

6. **Date:** 2026-04-18  
   **Decision:** Keep this plan scoped to the existing project-configuration surface and submit empty `integrationBindings` by default rather than designing a new UI for them.  
   **Rationale:** The documented project-management surface in `design/workspace-spec.md` covers overview, components, rules, and environment only. The backend accepts `integrationBindings`, but adding an entire new management surface would expand scope beyond "fill out the scaffolding."  
   **Alternatives considered:** Add an integrations tab during the same plan; drop project writes until integrations have a UI.

## Execution Log

- **Date:** 2026-04-18  
  **Phase:** Planning  
  **Decision:** Treat the missing browser auth/bootstrap seam as part of the live project-management work instead of pretending the UI can call `/v1/projects` directly today.  
  **Rationale:** Discovery showed the SPA currently has no access to `KEYSTONE_DEV_TOKEN`, while every project route is guarded by `requireDevAuth`.

- **Date:** 2026-04-18  
  **Phase:** Planning  
  **Decision:** Keep `Runs`, `Documentation`, and `Workstreams` out of scope except for consuming the now-real current-project context in shared shell copy.  
  **Rationale:** The user asked to wire project management into the UI scaffold, not to replace all placeholder destinations with live data.

## Progress

- [x] 2026-04-18 Discovery completed for "wire the UI scaffold to the real projects API."
- [x] 2026-04-18 Planning baseline captured: `lint`, `typecheck`, and `test` passed in the sandbox; `build` failed only on the known sandbox Wrangler/Docker write paths and then passed outside the sandbox.
- [x] 2026-04-18 Active execution plan created and registered in `.ultrakit/exec-plans/active/index.md`.
- [ ] Phase 1: Add the Worker/UI project bootstrap and project-client foundation.
- [ ] Phase 2: Replace static current-project context with live project selection in the shared shell.
- [ ] Phase 3: Convert `New project` and `Project settings` from placeholder fields into real create/update flows.
- [ ] Phase 4: Update docs, notes, and close the plan.

## Surprises & Discoveries

- The UI cannot simply swap `fetch("/v1/projects")` in for placeholder project data because the browser currently has no access to `KEYSTONE_DEV_TOKEN`, while all project routes are protected by `requireDevAuth` in [src/http/middleware/auth.ts](../../../src/http/middleware/auth.ts).
- The project configuration scaffold is structurally close to the backend contract already: the existing tabs map to `projectKey`, `displayName`, `description`, `components`, `ruleSet`, and `envVars`, and the only backend field with no current UI surface is `integrationBindings`.
- The current sidebar project switcher is not interactive. It renders one fixed project from [ui/src/features/projects/project-context.tsx](../../../ui/src/features/projects/project-context.tsx), so live project selection needs both data loading and a new interaction surface.
- `npm run build` still behaves exactly like the known repo note: `vite build` succeeds in the sandbox, then Wrangler/Docker fail on read-only writes under `~/.config/.wrangler/logs/` and `~/.docker/buildx/activity/`. The same command passes outside the sandbox.

## Outcomes & Retrospective

Planning outcome on 2026-04-18:

- The scope is now concrete enough to execute without reopening product questions.
- The main architectural addition is a local-dev browser auth/bootstrap seam for the shared Worker-served UI.
- The implementation work splits cleanly into foundation, shell selection, form submission, and documentation phases.
- If execution lands cleanly, the app will have real project management while preserving the current scaffold honesty for unfinished destinations.

## Context and Orientation

Relevant current repository state:

- The React UI scaffold lives under `ui/` and already implements the route tree described in `design/workspace-spec.md`.
- The global shell uses a fixed current project from [ui/src/features/projects/project-context.tsx](../../../ui/src/features/projects/project-context.tsx) and renders it in [ui/src/shared/layout/shell-sidebar.tsx](../../../ui/src/shared/layout/shell-sidebar.tsx).
- `New project` and `Project settings` routes are already real pages under [ui/src/routes/projects/](../../../ui/src/routes/projects/) and are driven by placeholder view models in [ui/src/features/projects/use-project-configuration-view-model.ts](../../../ui/src/features/projects/use-project-configuration-view-model.ts).
- The backend already implements project CRUD through [src/http/api/v1/projects/router.ts](../../../src/http/api/v1/projects/router.ts), [src/http/handlers/projects.ts](../../../src/http/handlers/projects.ts), and the canonical contract definitions in [src/http/api/v1/projects/contracts.ts](../../../src/http/api/v1/projects/contracts.ts) and [src/keystone/projects/contracts.ts](../../../src/keystone/projects/contracts.ts).
- Local dev auth is enforced by [src/http/middleware/auth.ts](../../../src/http/middleware/auth.ts) and [src/http/contracts/dev-auth.ts](../../../src/http/contracts/dev-auth.ts), which currently expect `Authorization: Bearer <KEYSTONE_DEV_TOKEN>` and tenant context on each API request.
- The current `AppProviders` layer is minimal and only wraps the current-project placeholder provider in [ui/src/app/app-providers.tsx](../../../ui/src/app/app-providers.tsx).
- Route and shell smoke coverage for the current scaffold lives in [ui/src/test/](../../../ui/src/test/).

Key paths for execution:

- `design/workspace-spec.md`
- `.ultrakit/developer-docs/m1-architecture.md`
- `README.md`
- `src/http/middleware/auth.ts`
- `src/http/contracts/dev-auth.ts`
- `src/http/router.ts`
- `src/http/api/v1/projects/contracts.ts`
- `src/http/handlers/projects.ts`
- `ui/src/app/app-providers.tsx`
- `ui/src/features/projects/project-context.tsx`
- `ui/src/features/projects/use-project-configuration-view-model.ts`
- `ui/src/routes/projects/project-configuration-layout.tsx`
- `ui/src/routes/projects/project-configuration-tab-route.tsx`
- `ui/src/shared/layout/shell-sidebar.tsx`
- `ui/src/test/app-shell.test.tsx`

## Plan of Work

Execution starts by creating the missing bridge between the Worker-served SPA and the protected project APIs. The first phase adds a small internal UI bootstrap/auth surface on the Worker plus a browser-side project client/provider layer so React can load live project data without relying on the hard-coded scaffold project.

Once that foundation exists, the second phase rewires the shared shell to use the live provider. The sidebar should render the real project list, expose a usable project-selection interaction, persist the selected project across reloads, and keep the rest of the shell stable. This phase should stop short of converting the project forms themselves so the global context behavior is isolated and testable.

The third phase converts the current placeholder `New project` and `Project settings` tabs into real form-backed create/update flows. The implementation should preserve the current tab/frame composition while replacing the placeholder field primitives with controlled inputs, repeatable list editing for rules and env vars, component add/remove editing, source-mode switching for `localPath` vs `gitUrl`, and real POST/PUT submission states. Successful writes should update the shared project context so the shell immediately reflects the saved project.

The last phase updates documentation and durable notes. It should describe the new UI bootstrap/auth seam, the live project-management behavior, and any contributor caveats for local validation so future work on project-aware runs, docs, or workstreams builds on the new surface without guessing.

## Concrete Steps

Run all commands from `/home/chanzo/code/large-projects/keystone-cloudflare`.

1. Baseline the current repo before implementation:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

Expected result: `lint`, `typecheck`, and `test` pass in the sandbox. `build` completes `vite build` but fails inside the sandbox on Wrangler/Docker home-directory writes, then passes when rerun outside the sandbox.

2. Implement the UI bootstrap/auth and project client foundation:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test
```

Expected result: new Worker-side UI bootstrap/auth tests and UI provider tests pass without changing the documented build caveat.

3. Implement live shell project selection:

```bash
rtk npm run test -- ui/src/test/app-shell.test.tsx
rtk npm run test
```

Expected result: the shell tests prove real project loading and selection behavior while the full suite stays green.

4. Implement create/update project flows:

```bash
rtk npm run test
rtk npm run build
```

Expected result: create and update flows pass their UI tests, and the full repo baseline remains unchanged except for the known sandbox-only build caveat.

5. Close the plan with docs and rerun the broad validation set:

```bash
rtk npm run lint
rtk npm run typecheck
rtk npm run test
rtk npm run build
```

Expected result: all documented validation remains green, with `build` still requiring the known outside-sandbox rerun on this host.

## Validation and Acceptance

This plan is complete when all of the following are true:

- The sidebar project switcher is backed by the live project list instead of the fixed `scaffoldProject`.
- The selected project is a real provider-backed value that persists across navigation and reloads.
- The browser can call the protected project APIs through the new local-dev UI bootstrap/auth seam without embedding placeholder data into React.
- `New project` submits a real `POST /v1/projects` payload that matches the current backend contract and, on success, selects the created project and lands the user in the settings flow.
- `Project settings` loads the selected project's current values and submits real `PUT /v1/projects/:projectId` updates.
- The configuration UI supports the currently documented scaffold surface: overview, components, rules, and environment, including component source mode, component-level rule override lists, and non-secret env vars.
- `Runs`, `Documentation`, and `Workstreams` remain explicit scaffold destinations rather than pretending to be fully live.
- `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` meet the same baseline expectations recorded in this plan.

## Idempotence and Recovery

The Worker/UI bootstrap phase should be safe to retry because it adds new seams rather than mutating stored project data. If implementation stops halfway through the provider work, the plan must record whether the app still falls back to the old scaffold project or whether partially live loading now exists.

For the create/update phase, keep write helpers centralized so retries do not require chasing form logic across route components. If a partial form refactor leaves the UI in a mixed placeholder/live state, restore a truthful loading or disabled state before stopping rather than leaving a form that appears to save but does not.

When validating, treat sandbox `build` failures under Wrangler/Docker home-directory writes as environmental unless a host rerun also fails. Record any deviation from that known baseline in `Surprises & Discoveries`.

## Artifacts and Notes

Planning baseline captured on 2026-04-18:

- `rtk npm run lint` -> passed
- `rtk npm run typecheck` -> passed
- `rtk npm run test` -> passed with `33` test files passed, `2` skipped; `142` tests passed, `8` skipped
- `rtk npm run build` in sandbox -> `vite build` passed, then Wrangler failed on:
  - `EROFS: read-only file system, open '/home/chanzo/.config/.wrangler/logs/...`
  - `open /home/chanzo/.docker/buildx/activity/...: read-only file system`
- `rtk npm run build` outside sandbox -> passed

Useful references:

- Current workspace-spec project section: [design/workspace-spec.md](../../../design/workspace-spec.md)
- Current scaffold provider: [ui/src/features/projects/project-context.tsx](../../../ui/src/features/projects/project-context.tsx)
- Current scaffold configuration models: [ui/src/features/projects/use-project-configuration-view-model.ts](../../../ui/src/features/projects/use-project-configuration-view-model.ts)

## Interfaces and Dependencies

Important interfaces and modules for this work:

- `ProjectConfig` and related project schemas in [src/keystone/projects/contracts.ts](../../../src/keystone/projects/contracts.ts)
- Project API envelopes in [src/http/api/v1/projects/contracts.ts](../../../src/http/api/v1/projects/contracts.ts)
- Dev auth parsing in [src/http/contracts/dev-auth.ts](../../../src/http/contracts/dev-auth.ts)
- Hono router registration in [src/http/router.ts](../../../src/http/router.ts)
- UI provider composition in [ui/src/app/app-providers.tsx](../../../ui/src/app/app-providers.tsx)
- Shared project context in [ui/src/features/projects/project-context.tsx](../../../ui/src/features/projects/project-context.tsx)
- Project configuration route/view-model boundaries in [ui/src/routes/projects/](../../../ui/src/routes/projects/) and [ui/src/features/projects/](../../../ui/src/features/projects/)
- UI test harness in [ui/src/test/render-route.tsx](../../../ui/src/test/render-route.tsx)

At the end of this plan, the repository should have:

- a Worker-served UI bootstrap/auth seam for local browser access to project APIs,
- a live project client/provider layer in the frontend,
- an interactive real project switcher in the shell,
- real create/update project configuration flows on the existing tabbed routes,
- updated docs that explain the new live project-management boundary.

## Phase 1: Add the Worker/UI project bootstrap and project-client foundation

### Phase Handoff

**Goal**  
Create the missing foundation that lets the browser-backed UI talk to the real protected project APIs.

**Scope Boundary**  
In scope: Worker-side UI bootstrap/auth route or helper, any required dev-auth middleware expansion for browser requests, frontend project API client modules, provider/context reshaping, and tests for those seams.  
Out of scope: interactive project-switcher UI, create/update form submission, live runs/docs/workstreams loading.

**Read First**  
`src/http/middleware/auth.ts`  
`src/http/contracts/dev-auth.ts`  
`src/http/router.ts`  
`src/http/api/v1/projects/contracts.ts`  
`ui/src/app/app-providers.tsx`  
`ui/src/features/projects/project-context.tsx`  
`ui/src/test/render-route.tsx`

**Files Expected To Change**  
`src/http/router.ts`  
`src/http/contracts/dev-auth.ts`  
`src/http/middleware/auth.ts`  
`src/http/handlers/` (new UI bootstrap/auth handler module if needed)  
`ui/src/app/app-providers.tsx`  
`ui/src/features/projects/project-context.tsx`  
`ui/src/features/projects/` (new project client/provider helpers)  
`ui/src/test/` and/or `tests/http/`

**Validation**  
Run `rtk npm run lint`, `rtk npm run typecheck`, and `rtk npm run test`. Success means the new auth/bootstrap seam and provider foundation are covered by tests and the existing suite stays green.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and this phase handoff. If the auth/bootstrap seam differs materially from the current plan wording, update `Design Decisions`.

**Deliverables**  
A browser-usable local-dev auth/bootstrap path, a live project API client/provider foundation in the UI, and tests proving those seams.

**Commit Expectation**  
`Add UI project bootstrap foundation`

**Known Constraints / Baseline Failures**  
Project routes are currently bearer-token protected. `npm run build` still has the sandbox-only Wrangler/Docker write failure and should not be treated as a regression unless a host rerun also fails.

**Status**  
Pending

**Completion Notes**  
Not started.

**Next Starter Context**  
The first implementation step is to decide the exact same-origin bootstrap shape and land it without exposing fake project data in React any longer.

## Phase 2: Replace static current-project context with live project selection in the shared shell

### Phase Handoff

**Goal**  
Make the global project switcher and current-project shell context live against the real project list.

**Scope Boundary**  
In scope: loading the real project list, selected-project state, persistence of the current selection, switcher interaction UI in the sidebar, and shell/error/empty states.  
Out of scope: create/update form submission, live runs/documents/workstreams content beyond showing the selected project context.

**Read First**  
`ui/src/shared/layout/shell-sidebar.tsx`  
`ui/src/shared/navigation/destinations.ts`  
`ui/src/features/projects/project-context.tsx`  
`ui/src/app/app-providers.tsx`  
`ui/src/test/app-shell.test.tsx`  
Any new project client/provider files landed in Phase 1

**Files Expected To Change**  
`ui/src/shared/layout/shell-sidebar.tsx`  
`ui/src/features/projects/project-context.tsx`  
`ui/src/app/app-providers.tsx`  
`ui/src/app/styles.css`  
`ui/src/test/app-shell.test.tsx`  
Potentially `ui/src/test/render-route.tsx`

**Validation**  
Run `rtk npm run test -- ui/src/test/app-shell.test.tsx` if supported by the package scripts, then `rtk npm run test`. Success means the shell tests prove live project rendering and selection, and the full suite stays green.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and this phase handoff.

**Deliverables**  
A live project switcher in the sidebar, persisted selected-project state, and truthful loading/error/empty UI for the shell context.

**Commit Expectation**  
`Wire live project selection into shell`

**Known Constraints / Baseline Failures**  
The top-level route tree should remain unchanged. Other destinations stay scaffold-only and must not start implying live per-project data unless their own models are implemented.

**Status**  
Pending

**Completion Notes**  
Not started.

**Next Starter Context**  
This phase begins after Phase 1 lands a stable provider/client contract. Keep the shell interaction simple and explicit; do not let the switcher redesign the sidebar layout.

## Phase 3: Convert New project and Project settings into real create/update flows

### Phase Handoff

**Goal**  
Replace placeholder project-configuration fields with real create and update behavior backed by `/v1/projects`.

**Scope Boundary**  
In scope: controlled inputs for overview/components/rules/environment tabs, component add/remove and source-mode switching, create/update submission states, backend validation display, and synchronization with the shared project provider after successful writes.  
Out of scope: new tabs beyond the existing workspace spec, integration-binding management UI, run creation, or live documentation/workstreams loading.

**Read First**  
`design/workspace-spec.md`  
`ui/src/routes/projects/project-configuration-layout.tsx`  
`ui/src/routes/projects/project-configuration-tab-route.tsx`  
`ui/src/features/projects/project-configuration-scaffold.ts`  
`ui/src/features/projects/use-project-configuration-view-model.ts`  
`ui/src/shared/forms/placeholder-field.tsx`  
`ui/src/shared/forms/placeholder-list-field.tsx`  
`src/keystone/projects/contracts.ts`

**Files Expected To Change**  
`ui/src/routes/projects/project-configuration-tab-route.tsx`  
`ui/src/features/projects/project-configuration-scaffold.ts`  
`ui/src/features/projects/use-project-configuration-view-model.ts`  
`ui/src/shared/forms/` (new real form primitives or replacements)  
`ui/src/app/styles.css`  
`ui/src/test/`  
Potentially `ui/src/routes/router.tsx` if post-create navigation needs a route adjustment

**Validation**  
Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm run test`, and `rtk npm run build` with the known host rerun for the Wrangler step if needed. Success means create and update flows are covered by tests and the broad repo baseline remains intact.

**Plan / Docs To Update**  
Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and this phase handoff. If the resulting UX differs materially from the current planned post-create flow, update `Design Decisions`.

**Deliverables**  
Real project create/update forms on the existing tabs, successful POST/PUT wiring, surfaced validation errors, and project-provider synchronization after save.

**Commit Expectation**  
`Implement live project management forms`

**Known Constraints / Baseline Failures**  
The backend requires at least one component and exactly one of `localPath` or `gitUrl` per git component config. `integrationBindings` stay out of scope and should remain an empty collection on write unless explicitly preserved from loaded project detail.

**Status**  
Pending

**Completion Notes**  
Not started.

**Next Starter Context**  
Phase 3 should build directly on the provider from Phases 1 and 2 so successful saves immediately refresh the selected project shown in the shell.

## Phase 4: Document the live project-management boundary and close the plan

### Phase Handoff

**Goal**  
Leave behind durable docs and notes that describe the new live project-management behavior and validation caveats.

**Scope Boundary**  
In scope: developer docs, README/UI-scope wording, `.ultrakit/notes.md`, and final plan closeout updates.  
Out of scope: additional product features or visual redesign.

**Read First**  
`README.md`  
`.ultrakit/developer-docs/m1-architecture.md`  
`.ultrakit/notes.md`  
This plan's `Surprises & Discoveries`, `Execution Log`, and `Outcomes & Retrospective`

**Files Expected To Change**  
`README.md`  
`.ultrakit/developer-docs/m1-architecture.md`  
`.ultrakit/notes.md`  
Potentially `design/workspace-spec.md` if execution reveals a durable change in project-management behavior

**Validation**  
Run `rtk npm run lint`, `rtk npm run typecheck`, `rtk npm run test`, and `rtk npm run build` with the same baseline expectations already recorded here. Success means docs describe the implementation that actually shipped.

**Plan / Docs To Update**  
Update every living section of this plan, then archive it once acceptance is met.

**Deliverables**  
Accurate contributor-facing docs, updated durable notes, and a plan ready for archive.

**Commit Expectation**  
`Document live project management UI`

**Known Constraints / Baseline Failures**  
Do not document live runs/documents/workstreams behavior that this plan did not implement. Preserve the build caveat accurately if it still reproduces on this host.

**Status**  
Pending

**Completion Notes**  
Not started.

**Next Starter Context**  
This phase should only begin after the create/update flows are stable and the final broad validation set has been rerun.
