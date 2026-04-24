# Keystone UI Workspace Chrome Reduction

## Purpose / Big Picture

Bring the current React UI back to the workspace shape described in `design/workspace-spec.md` by removing extra page chrome, instructional sentences, and component framing that make the app feel like a guided dashboard instead of a compact operator workspace.

After this work lands, a user opening `Runs`, a run detail stage, `Documentation`, `Workstreams`, `New project`, or `Project settings` should see the board structure from the spec: stable global sidebar, direct project controls, run index, run stepper, document panes, DAG, task detail, document tree, workstream table, and tabbed project configuration. The UI should rely on layout, labels, tables, tabs, and current data to explain itself rather than persistent helper paragraphs such as "open a row to..." or large page headers describing usage.

Theme, palette, dark-mode defaults, and visual-token changes are explicitly out of scope for this plan. The existing visible theme panel should stay in the sidebar.

## Backward Compatibility

Backward compatibility is required for application behavior and data/API contracts.

Constraints:

- Do not change backend API contracts, persisted data shapes, route URLs, or project/run/task/document semantics.
- Preserve the existing live/scaffold split: project management, runs, execution, task artifacts, and workstreams remain live-backed where they are live-backed today; `Documentation` remains scaffold-backed for the current UI slice.
- Existing tests may be updated when they assert removed instructional copy or extra headers, but they must continue to prove the workspace structure and user flows.
- Underlying theme provider, visible theme panel, and CSS tokens should not be redesigned in this pass.

## Design Decisions

### 2026-04-24 - Focus this pass on layout/component chrome, not theme

Decision:
Ignore palette, dark-mode defaults, and accent treatment for now. Keep the visible theme panel. Scope this plan to persistent layout and component framing: page headers, section summaries, sidebar explanatory areas, tab summaries, stepper summaries, footer guidance, and always-visible usage sentences.

Rationale:
The user clarified that the current concern is "a ton of extra things like page headers and sentences describing usage" and explicitly asked to ignore theme for now.

Alternatives considered:
- Realign the light/dark theme to `design/design-guidelines.md` in the same pass.
- Treat all design-guideline drift as one broad visual redesign.
- Remove the visible theme panel from the sidebar.

### 2026-04-24 - Remove persistent instructional copy, keep necessary state copy

Decision:
Remove or sharply reduce always-visible copy that explains how to use a page when the workspace structure already makes the action clear. Keep explicit loading, empty, error, validation, and disabled-state copy where it communicates current state or next action.

Rationale:
The workspace spec describes dense working boards, not instructional pages. However, honest empty/error states are still required by `ui/AGENTS.md` and should not be replaced with silent blank panels.

Alternatives considered:
- Remove every helper sentence, including empty-state and form-validation copy.
- Keep all current summaries because they are user-friendly.

### 2026-04-24 - Use the local workspace spec and guidelines as the cleanup standard

Decision:
Resolve individual cleanup choices by matching `design/workspace-spec.md`, `design/design-guidelines.md`, and `ui/AGENTS.md`, with the user's explicit instruction that the theme panel stays.

Rationale:
The user clarified that the goal is not a subjective minimalism pass; the UI should match the repository's written guidelines and workspace spec. Those docs are already the project source of truth, so execution should not invent a separate rule set.

Alternatives considered:
- Define a separate copy-removal heuristic independent of the local design docs.
- Preserve current UI chrome unless a line in the spec forbids it verbatim.

### 2026-04-24 - Prefer simpler existing components over new abstractions

Decision:
Use the existing feature components and shared workspace primitives, but simplify their props and render paths where needed. Do not introduce a new design-system layer or new dependency for this cleanup.

Rationale:
This is a structural alignment pass. The repo already has the needed primitives (`WorkspacePage`, `WorkspaceSplit`, `EntityTable`, `RunPhaseStepper`, project configuration sections, document/review frames). Adding another abstraction would make the UI more complex while trying to remove extra chrome.

Alternatives considered:
- Build a new "spec board" component family and migrate screens onto it.
- Leave components as-is and only edit strings.

### 2026-04-24 - Keep feature ownership and route structure stable

Decision:
Keep route files thin, keep destination rendering under `ui/src/features/**/components/`, and do not alter the route tree unless a specific cleanup requires it.

Rationale:
The current route topology already matches the workspace spec: `/runs`, `/runs/:runId/...`, `/documentation`, `/workstreams`, `/projects/new`, and `/settings`. The mismatch is presentation chrome, not navigation model.

Alternatives considered:
- Rework the whole route tree during this cleanup.
- Move feature-specific display logic into shared layout primitives.

## Execution Log

- 2026-04-24: Completed discovery for the workspace chrome issue. User clarified that theme is out of scope and that the target is removing excess page headers, usage sentences, and component framing.
- 2026-04-24: Baseline validation before plan approval:
  - `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/destination-scaffolds.test.tsx` passed: `3 passed` files, `126 passed` tests.
  - `rtk npm run build:ui` passed; Vite reported a non-blocking large-chunk warning.
  - `rtk npm run test` passed: `38 passed | 2 skipped` files, `337 passed | 21 skipped` tests.
  - `rtk npm run lint` failed with 15 pre-existing repo-wide errors outside this cleanup scope.
  - `rtk npm run typecheck` failed with pre-existing Plate, assistant-ui, execution, workstreams, and test typing errors.
- 2026-04-24: User explicitly approved execution. Moved the active plan into Phase 1 implementation.
- 2026-04-24: Completed Phase 1 implementation. The global sidebar now omits project summary prose, the `Destinations` subheading, and explanatory theme copy; project actions render as compact icon links with accessible names; the visible theme toggle remains in the sidebar.
- 2026-04-24: Phase 1 validation:
  - `rtk npm run test -- ui/src/test/app-shell.test.tsx` passed: `1 passed` file, `31 passed` tests.
  - `rtk npm run test -- ui/src/test/runs-routes.test.tsx -t "registers a beforeunload warning while a planning draft has unsaved changes"` passed after the optional combined suite first exposed that planning editor timing failure.
  - `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx -t "hydrates live workstreams from direct search params and canonicalizes an out-of-range page"` passed after the optional combined suite rerun exposed that direct workstreams hydration failure.
  - The optional combined targeted UI suite did not produce a clean full-file pass in this run; it failed on two different non-shell tests across reruns while each failing test passed in isolation.
- 2026-04-24: Phase 1 review produced important test-quality and integration-coherence findings. The one allowed targeted fix pass replaced brittle exact negative assertions for deleted shell helper strings with compact shell structure assertions, and corrected project overview description copy so it no longer claims descriptions appear in the sidebar or project switcher.
- 2026-04-24: Phase 1 targeted fix validation:
  - `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx` passed: `2 passed` files, `70 passed` tests.
  - `rtk git diff --check` passed.

## Progress

- [x] 2026-04-24 Read Ultrakit notes, active-plan index, workspace spec, design guidelines, UI instructions, and relevant developer docs.
- [x] 2026-04-24 Run read-only discovery against design requirements, current UI implementation, and validation/docs constraints.
- [x] 2026-04-24 Incorporate user clarification: ignore theme and focus on layout/components plus excess explanatory chrome.
- [x] 2026-04-24 Run baseline validation and record known failures.
- [x] 2026-04-24 Create and register the active execution plan.
- [x] Phase 1: Simplify the global shell/sidebar and shared chrome vocabulary. Completed 2026-04-24 after the targeted review fix pass.
- [ ] Phase 2: Simplify top-level destination boards.
- [ ] Phase 3: Simplify run detail, planning, execution, and task panes.
- [ ] Phase 4: Simplify project configuration tabs/forms.
- [ ] Phase 5: Closeout validation, docs/notes evaluation, and archive readiness.

## Surprises & Discoveries

- The current route tree and major product model are mostly aligned with `design/workspace-spec.md`; the main drift is persistent explanatory page chrome layered on top of otherwise correct screens.
- There is an untracked root `DESIGN.md`. It appears to describe a paper-toned visual system, but it is not part of the authoritative inputs for this pass and should not be used unless the user explicitly says otherwise.
- `npm run lint` is red before execution for unrelated repo-wide issues such as unused backend/test variables, missing caught-error causes, generated Plate `any` usage, and missing React Hooks lint rule definitions.
- `npm run typecheck` is red before execution for unrelated and pre-existing issues including missing `@platejs/dnd` types, `exactOptionalPropertyTypes` mismatches in generated UI wrappers, assistant-ui message type mismatches, execution task record shape mismatches, and test typing errors.
- `npm run build:ui` passes but warns that the bundled app chunk is larger than 500 kB after minification.
- During Phase 1, the optional three-file targeted UI suite showed file-level instability unrelated to shell changes: one run failed the planning unsaved-draft beforeunload test, and the rerun failed a direct workstreams search-param hydration test. Both failing tests passed when run in isolation.

## Outcomes & Retrospective

Phase 1 closed with the global shell closer to the canonical workspace board: project selection remains global, the project actions are compact `+` and settings controls with screen-reader labels, global navigation remains stable, and the visible theme panel remains available without explanatory sidebar prose.

The Phase 1 change did not alter route structure, project API behavior, project state handling, or theme provider/storage behavior. The only retained shell copy is structural labeling (`Keystone`, `Operator workspace`, `Project`, `Navigation`) plus existing honest loading, empty, and error state copy outside the sidebar's persistent chrome.

The Phase 1 targeted fix pass resolved the review findings without broadening into later cleanup phases: shell coverage now asserts compact navigation and the visible theme control structure instead of exact deleted helper prose, and project overview copy no longer describes the project description as sidebar or project-switcher content.

## Context and Orientation

Authoritative design inputs:

- `design/workspace-spec.md` defines the product structure: one selected project, one persistent sidebar, `Runs`, `Documentation`, `Workstreams`, run index before run detail, a run top rail with `Specification`, `Architecture`, `Execution Plan`, `Execution`, DAG-first execution, task detail as conversation plus code review, documentation as a project-scoped current knowledge tree, and tabbed project configuration.
- `design/design-guidelines.md` reinforces that Keystone should feel calm, focused, and workspace-like. It also says the shell should remain stable, run planning stages should share the same layout, and screens should feel like states of the same product rather than separate dashboard/chat/document-reader products.
- `ui/AGENTS.md` says to prioritize behavior, composition, state ownership, API seams, and UX before styling; keep routes thin; keep destination logic under `ui/src/features/`; keep `ui/src/shared/` generic; and preserve terminology from `design/workspace-spec.md`.

Important implementation files:

- `ui/src/shared/layout/app-shell.tsx` renders the outer shell and project loading/empty/error states.
- `ui/src/shared/layout/shell-sidebar.tsx` renders the global sidebar, project switcher, project actions, nav, and current theme panel.
- `ui/src/shared/navigation/destinations.ts` defines sidebar destinations and project action labels/glyphs.
- `ui/src/routes/router.tsx` defines the current route tree and should stay thin.
- `ui/src/features/runs/components/runs-index-workspace.tsx` renders the `Runs` index header, create-run action, run table, and footer guidance.
- `ui/src/features/runs/components/run-detail-scaffold.tsx` renders the run detail header/top rail container.
- `ui/src/features/runs/components/run-phase-stepper.tsx` renders run-stage links and currently includes per-stage summary copy.
- `ui/src/features/runs/components/planning-workspace.tsx` renders the shared planning split: assistant chat left and living document right.
- `ui/src/features/runs/components/execution-plan-workspace.tsx` adds compile controls to the `Execution Plan` planning surface.
- `ui/src/features/execution/components/execution-workspace.tsx` renders the DAG board and currently includes persistent instructional notes.
- `ui/src/features/execution/components/task-detail-workspace.tsx` renders task context, task conversation, and code review panes.
- `ui/src/features/documentation/components/documentation-workspace.tsx` renders the documentation header, category tree, and document viewer.
- `ui/src/features/workstreams/components/workstreams-board.tsx` renders workstream filters, table, metadata chips, pagination, and route guidance.
- `ui/src/features/projects/components/project-configuration-shell.tsx` renders project configuration page header and tab strip with tab summaries.
- `ui/src/features/projects/components/project-configuration-tabs.tsx` renders the project configuration tab bodies and their section helper copy.
- `ui/src/features/projects/components/project-configuration-section.tsx` is the shared section shell used by project configuration tabs.
- `ui/src/features/projects/components/project-component-card.tsx` and `ui/src/features/projects/components/project-component-type-picker.tsx` contain component configuration helper copy.
- `ui/src/test/app-shell.test.tsx`, `ui/src/test/destination-scaffolds.test.tsx`, and `ui/src/test/runs-routes.test.tsx` assert much of the visible shell and destination copy.

Do not treat CSS palette lines in `ui/src/app/styles.css` as part of this plan unless a structural class becomes unused after removing chrome. Theme/palette cleanup is deferred.

## Plan of Work

First, reduce the global shell/sidebar to the workspace-spec essentials: project switcher, compact project actions, top-level destinations, and the existing visible theme panel. Remove sidebar instructional descriptions and section headers that do not fit the canonical board. Keep the theme panel itself and preserve the theme provider and storage code rather than redesigning theme behavior.

Second, simplify the top-level destination boards. `Runs`, `Documentation`, and `Workstreams` should retain their core controls and data regions but lose large explanatory headers, always-visible page summaries, footer guidance, and redundant section prose. Filters, counts, pagination, alerts, and empty/error copy should stay where they communicate state.

Third, simplify the run workspace. The run header should be compact, the stepper should read like four stage tabs rather than four cards, planning panes should rely on pane titles and the chat/document split instead of summary paragraphs, execution should present the DAG without instructional notes, and task detail should retain task metadata plus chat/review panes without extra "how to use this" descriptions.

Fourth, simplify project configuration. `New project` and `Project settings` should remain tabbed configuration surfaces with the same tab set and direct create/save actions, but the tab strip and sections should not carry explanatory blurbs where the form labels already communicate the model. Keep validation, empty, and error text.

Finally, run targeted UI tests plus broad `npm run test`, evaluate docs/notes impact, update this plan with the final state, and prepare it for archive. Durable developer docs should only change if the cleanup changes architecture or contracts; copy/layout cleanup alone should not force docs churn.

## Concrete Steps

Run commands from repo root:

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/destination-scaffolds.test.tsx
rtk npm run test
rtk npm run build:ui
```

Optional baseline checks that are currently known red:

```bash
rtk npm run lint
rtk npm run typecheck
```

Expected interpretation:

- Targeted UI tests should pass after each phase unless the phase intentionally updates assertions in the same change.
- Broad `npm run test` should pass before closing implementation phases.
- `build:ui` should pass before final closeout, with the existing large-chunk warning acceptable for this plan.
- `lint` and `typecheck` failures should be treated as pre-existing unless a phase touches one of the reported files and adds a new related failure.

## Validation and Acceptance

Acceptance is met when all of the following are true:

- The global sidebar visibly contains only the project context/control surface, project actions, and top-level navigation needed by the workspace spec, without persistent explanatory sidebar prose.
- The visible theme panel remains available in the sidebar.
- `Runs` shows the run index with `+ New run` and the run table, without page-summary or footer usage instructions.
- Run detail shows compact run identity plus the four-stage top rail; the stage rail does not present each stage as a prose card.
- `Specification`, `Architecture`, and `Execution Plan` preserve the left chat / right living document layout while removing always-visible usage summaries that duplicate the layout.
- `Execution` defaults to the DAG and task nodes, without explanatory paragraphs telling the user to click the graph.
- Task detail preserves task conversation on the left and code review on the right, without redundant panel-summary prose.
- `Documentation` presents a document tree and document viewer, without extra page or section copy explaining that structure.
- `Workstreams` presents filters and a task table with pagination/state metadata, without extra route-guidance prose.
- `New project` and `Project settings` use simple tabs and direct actions, without tab summary blurbs or section-level usage copy where labels already suffice.
- Loading, empty, error, validation, disabled-state, and alert copy remains present and honest.
- `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/destination-scaffolds.test.tsx` passes.
- `rtk npm run test` passes.
- `rtk npm run build:ui` passes or only reports the known large-chunk warning.

Known baseline failures that do not block this plan:

- `rtk npm run lint` fails before execution with unrelated repo-wide lint errors.
- `rtk npm run typecheck` fails before execution with unrelated/pre-existing typing errors.

## Idempotence and Recovery

This plan is safe to retry because it changes React rendering, CSS class usage, and tests only. No data migration, backend contract change, or destructive operation is part of the work.

If execution stops mid-phase:

- Read this plan, the current phase handoff, `design/workspace-spec.md`, `design/design-guidelines.md`, and the files listed under the active phase.
- Run `rtk git status --short` and inspect any partially edited files.
- Do not revert user changes or unrelated dirty files.
- Re-run the targeted UI tests for the active phase before further edits when feasible.
- Update `Progress`, `Execution Log`, `Surprises & Discoveries`, and the active phase handoff with truthful resume context.

## Artifacts and Notes

Baseline evidence from 2026-04-24:

```text
rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/destination-scaffolds.test.tsx
3 passed files, 126 passed tests

rtk npm run test
38 passed | 2 skipped files, 337 passed | 21 skipped tests

rtk npm run build:ui
passed, with Vite large-chunk warning
```

The web interface guidelines review source was fetched from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`; for this plan it mostly reinforces keeping accessible buttons/links, stateful empty/error copy, and focus behavior while removing unnecessary always-visible instructional text.

## Interfaces and Dependencies

No new runtime or development dependencies should be introduced.

Relevant existing interfaces and primitives:

- React Router routes in `ui/src/routes/router.tsx`
- `WorkspacePage`, `WorkspacePageSection`, `WorkspaceSplit`, `WorkspacePanel`, `EntityTable`, `DocumentFrame`, and `ReviewFrame` under `ui/src/components/workspace/`
- shadcn/Radix primitives under `ui/src/components/ui/`
- project management and run management APIs under `ui/src/features/projects/project-management-api.ts` and `ui/src/features/runs/run-management-api.ts`
- assistant-ui conversation surfaces under `ui/src/features/conversations/`
- Plate markdown document surface under `ui/src/components/editor/markdown-document-surface.tsx`

If removing a summary prop from a component would force broad churn, prefer making the prop optional and omitting it at call sites for this pass.

## Phase 1 - Simplify Global Shell And Sidebar

### Phase Handoff

Status:
Completed - targeted review fix applied.

Goal:
Reduce the persistent shell/sidebar to the workspace-spec essentials without changing routes, project selection behavior, or theme implementation internals.

Scope Boundary:
In scope:
- remove always-visible sidebar prose such as project summary text, `Destinations` subheading, and theme explanatory copy;
- simplify project action rendering toward compact `+` and settings affordances while keeping accessible labels;
- keep the visible sidebar theme panel while removing only explanatory theme prose if it conflicts with the workspace-spec chrome;
- update shell tests that assert removed sidebar copy.

Out of scope:
- palette, dark-mode defaults, or token redesign;
- project API behavior;
- destination screen internals beyond shell interaction.

Read First:
- `design/workspace-spec.md`
- `design/design-guidelines.md`
- `ui/AGENTS.md`
- `ui/src/shared/layout/app-shell.tsx`
- `ui/src/shared/layout/shell-sidebar.tsx`
- `ui/src/shared/navigation/destinations.ts`
- `ui/src/app/theme-provider.tsx`
- `ui/src/app/theme.ts`
- `ui/src/test/app-shell.test.tsx`

Files Expected To Change:
- `ui/src/shared/layout/shell-sidebar.tsx`
- `ui/src/shared/navigation/destinations.ts`
- `ui/src/app/styles.css`
- `ui/src/test/app-shell.test.tsx`
- `.ultrakit/exec-plans/active/keystone-ui-workspace-chrome-reduction.md`

Validation:
- `rtk npm run test -- ui/src/test/app-shell.test.tsx`
- Success means shell navigation, project switcher, project actions, and project loading/empty/error states remain covered without relying on removed helper copy.

Plan / Docs To Update:
- Update `Execution Log`, `Progress`, `Surprises & Discoveries`, and this handoff with completion notes.
- Update `Outcomes & Retrospective` for Phase 1.

Deliverables:
- Compact global sidebar aligned to the canonical workspace board.
- Accessibility-preserving project action controls.
- Updated shell tests.

Commit Expectation:
- `Simplify workspace shell chrome`

Known Constraints / Baseline Failures:
- `rtk npm run lint` and `rtk npm run typecheck` are red before execution for unrelated/pre-existing issues.
- Theme visual behavior is out of scope; do not chase color changes.

Completion Notes:
Completed 2026-04-24.

- Removed persistent sidebar project summary copy, including project description/project-key fallback text and loading/empty/error helper prose from the sidebar itself.
- Replaced text-heavy project action links with compact icon links using the existing `lucide-react` plus and settings icons, while preserving accessible names, routes, active styling, and tooltips.
- Removed the `Destinations` subheading and theme explanatory sentence while keeping the visible theme preference panel and underlying theme provider/storage behavior unchanged.
- Updated shell tests to assert the compact controls remain accessible and the removed sidebar prose no longer renders.
- Targeted review fix pass completed 2026-04-24: replaced exact negative assertions for deleted shell helper copy with structure-oriented assertions for the global navigation and visible theme controls.
- Targeted review fix pass also corrected stale project Overview helper copy so the description is described as saved project context rather than sidebar or project-switcher content, with the matching destination scaffold test updated.

Next Starter Context:
Phase 1 is implemented in `ui/src/shared/layout/shell-sidebar.tsx`, `ui/src/shared/navigation/destinations.ts`, `ui/src/app/styles.css`, and `ui/src/test/app-shell.test.tsx`, with the targeted review fix in `ui/src/test/app-shell.test.tsx`, `ui/src/features/projects/components/project-configuration-tabs.tsx`, and `ui/src/test/destination-scaffolds.test.tsx`. Required fix validation passed with `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx` (`70 passed`) and `rtk git diff --check`. The earlier optional combined targeted UI suite instability remains recorded above, but the required Phase 1 fix-pass validation is clean. Phase 2 can start from the top-level destination boards (`Runs`, `Documentation`, `Workstreams`) without revisiting shell internals.

## Phase 2 - Simplify Top-Level Destination Boards

### Phase Handoff

Goal:
Remove extra headers, section summaries, footer guidance, and usage prose from `Runs`, `Documentation`, and `Workstreams` while preserving their core controls and state handling.

Scope Boundary:
In scope:
- trim `Runs` index summary and table footer instruction copy;
- trim `Documentation` page summary and tree/viewer section explanatory copy;
- trim `Workstreams` summary and row route-guidance copy;
- keep tables, filters, metadata needed for state, pagination, alerts, empty states, and error states;
- update affected destination tests.

Out of scope:
- live documentation backend cutover;
- changes to filtering/pagination semantics;
- run detail/planning/execution panes.

Read First:
- `design/workspace-spec.md`
- `ui/src/features/runs/components/runs-index-workspace.tsx`
- `ui/src/features/documentation/components/documentation-workspace.tsx`
- `ui/src/features/documentation/use-documentation-view-model.ts`
- `ui/src/features/workstreams/components/workstreams-board.tsx`
- `ui/src/features/workstreams/use-workstreams-view-model.ts`
- `ui/src/components/workspace/entity-table.tsx`
- `ui/src/test/destination-scaffolds.test.tsx`
- `ui/src/test/app-shell.test.tsx`

Files Expected To Change:
- `ui/src/features/runs/components/runs-index-workspace.tsx`
- `ui/src/features/documentation/components/documentation-workspace.tsx`
- `ui/src/features/workstreams/components/workstreams-board.tsx`
- `ui/src/features/workstreams/use-workstreams-view-model.ts`
- `ui/src/app/styles.css`
- `ui/src/test/app-shell.test.tsx`
- `ui/src/test/destination-scaffolds.test.tsx`
- `.ultrakit/exec-plans/active/keystone-ui-workspace-chrome-reduction.md`

Validation:
- `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx`
- Success means destination surfaces still expose their controls/data/states and no tests depend on removed instructional copy.

Plan / Docs To Update:
- Update plan living sections and this handoff with completion/resume context.
- Record any intentionally retained explanatory copy and why.

Deliverables:
- `Runs`, `Documentation`, and `Workstreams` rendered as compact workspace boards.
- Updated destination regression coverage.

Commit Expectation:
- `Simplify destination board chrome`

Known Constraints / Baseline Failures:
- `Documentation` remains scaffold-backed by design; do not turn this phase into a live-data project.
- `rtk npm run lint` and `rtk npm run typecheck` are known red baselines.

## Phase 3 - Simplify Run Workspace And Execution Panes

### Phase Handoff

Goal:
Reduce run detail, run stepper, planning panes, execution DAG, and task detail to the workspace-spec layout without persistent instructional summaries.

Scope Boundary:
In scope:
- compact run detail header copy;
- simplify `RunPhaseStepper` so phases read as tabs/steps rather than prose cards;
- remove always-visible planning pane summaries where pane titles and split layout are enough;
- remove execution DAG instructional notes and redundant panel summaries;
- remove redundant task conversation/review summary prose while keeping task metadata, dependencies, status, chat, and diff sidebar;
- keep loading, empty, disabled, unavailable, and error copy.

Out of scope:
- DAG data contract changes such as new ownership/blocker fields;
- assistant conversation behavior changes;
- compile API behavior changes;
- theme/palette work.

Read First:
- `design/workspace-spec.md`
- `design/design-guidelines.md`
- `ui/src/features/runs/components/run-detail-scaffold.tsx`
- `ui/src/features/runs/components/run-phase-stepper.tsx`
- `ui/src/features/runs/components/planning-workspace.tsx`
- `ui/src/features/runs/components/execution-plan-workspace.tsx`
- `ui/src/features/runs/use-run-detail-view-model.ts`
- `ui/src/features/runs/use-run-planning-phase-view-model.ts`
- `ui/src/features/runs/use-execution-plan-workspace-view-model.ts`
- `ui/src/features/execution/components/execution-workspace.tsx`
- `ui/src/features/execution/components/task-detail-workspace.tsx`
- `ui/src/test/runs-routes.test.tsx`
- `ui/src/test/app-shell.test.tsx`

Files Expected To Change:
- `ui/src/features/runs/components/run-detail-scaffold.tsx`
- `ui/src/features/runs/components/run-phase-stepper.tsx`
- `ui/src/features/runs/components/planning-workspace.tsx`
- `ui/src/features/runs/components/execution-plan-workspace.tsx`
- `ui/src/features/runs/use-run-detail-view-model.ts`
- `ui/src/features/runs/use-run-planning-phase-view-model.ts`
- `ui/src/features/runs/use-execution-plan-workspace-view-model.ts`
- `ui/src/features/execution/components/execution-workspace.tsx`
- `ui/src/features/execution/components/task-detail-workspace.tsx`
- `ui/src/app/styles.css`
- `ui/src/test/runs-routes.test.tsx`
- `ui/src/test/app-shell.test.tsx`
- `.ultrakit/exec-plans/active/keystone-ui-workspace-chrome-reduction.md`

Validation:
- `rtk npm run test -- ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx`
- Success means run index to detail navigation, stage navigation, planning document states, compile controls, DAG navigation, and task detail still work with simplified chrome.

Plan / Docs To Update:
- Update plan living sections and this handoff.
- Record any summary text retained because it communicates state rather than usage.

Deliverables:
- Compact run workspace and execution panes aligned to the canonical board.
- Updated route tests for simplified run surfaces.

Commit Expectation:
- `Simplify run workspace chrome`

Known Constraints / Baseline Failures:
- Do not introduce new DAG fields or data requirements in this phase.
- `rtk npm run lint` and `rtk npm run typecheck` are known red baselines.

## Phase 4 - Simplify Project Configuration Tabs And Forms

### Phase Handoff

Goal:
Make `New project` and `Project settings` feel like direct tabbed configuration surfaces rather than instructional setup pages.

Scope Boundary:
In scope:
- remove project configuration shell summary prose;
- remove tab summary blurbs from the visible tab strip;
- remove section-level helper copy where form labels already identify the category;
- trim field/helper descriptions that explain obvious UI mechanics rather than current constraints;
- keep validation errors, empty states, component type constraints, non-secret environment warnings, and direct create/save/discard actions;
- update affected tests.

Out of scope:
- changing project configuration schema or API payloads;
- adding component types beyond `Git repository`;
- secret environment variable handling;
- route changes.

Read First:
- `design/workspace-spec.md`
- `ui/src/features/projects/components/project-configuration-shell.tsx`
- `ui/src/features/projects/components/project-configuration-tabs.tsx`
- `ui/src/features/projects/components/project-configuration-section.tsx`
- `ui/src/features/projects/components/project-component-card.tsx`
- `ui/src/features/projects/components/project-component-type-picker.tsx`
- `ui/src/features/projects/use-project-configuration-view-model.ts`
- `ui/src/test/destination-scaffolds.test.tsx`
- `ui/src/test/app-shell.test.tsx`

Files Expected To Change:
- `ui/src/features/projects/components/project-configuration-shell.tsx`
- `ui/src/features/projects/components/project-configuration-tabs.tsx`
- `ui/src/features/projects/components/project-configuration-section.tsx`
- `ui/src/features/projects/components/project-component-card.tsx`
- `ui/src/features/projects/components/project-component-type-picker.tsx`
- `ui/src/app/styles.css`
- `ui/src/test/destination-scaffolds.test.tsx`
- `ui/src/test/app-shell.test.tsx`
- `.ultrakit/exec-plans/active/keystone-ui-workspace-chrome-reduction.md`

Validation:
- `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/app-shell.test.tsx`
- Success means project creation/settings flows still cover tab navigation, create/save/discard/remove actions, validation, and empty states without asserting removed prose.

Plan / Docs To Update:
- Update plan living sections and this handoff.
- Record intentionally retained constraint copy such as `Git repository`-only and non-secret environment language.

Deliverables:
- Project configuration tabs/forms with reduced instructional chrome.
- Updated tests for project configuration behavior and structure.

Commit Expectation:
- `Simplify project configuration chrome`

Known Constraints / Baseline Failures:
- Every project must still contain at least one component.
- Component type support remains `git_repository` only.
- Environment variables remain non-secret configuration.
- `rtk npm run lint` and `rtk npm run typecheck` are known red baselines.

## Phase 5 - Closeout Validation And Docs Evaluation

### Phase Handoff

Goal:
Verify the full workspace chrome reduction, update durable notes/docs only if needed, and leave the plan ready for final review/archive.

Scope Boundary:
In scope:
- run final targeted UI tests, broad tests, and UI build;
- inspect `README.md`, `.ultrakit/developer-docs/`, `design/workspace-spec.md`, and `design/design-guidelines.md` for truth after the cleanup;
- update docs only if the cleanup changes a durable architecture/contract statement;
- update `.ultrakit/notes.md` only for durable project-specific discoveries;
- update active-plan index status.

Out of scope:
- new product behavior;
- theme/palette cleanup;
- fixing unrelated lint/typecheck baselines unless the earlier phases introduced those failures.

Read First:
- this active plan
- `.ultrakit/notes.md`
- `.ultrakit/exec-plans/active/index.md`
- `README.md`
- `.ultrakit/developer-docs/README.md`
- `.ultrakit/developer-docs/m1-architecture.md`
- `design/workspace-spec.md`
- `design/design-guidelines.md`

Files Expected To Change:
- `.ultrakit/exec-plans/active/keystone-ui-workspace-chrome-reduction.md`
- `.ultrakit/exec-plans/active/index.md`
- `.ultrakit/notes.md` if there is a durable discovery
- `README.md` or `.ultrakit/developer-docs/*.md` only if they are materially inaccurate

Validation:
- `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/destination-scaffolds.test.tsx`
- `rtk npm run test`
- `rtk npm run build:ui`
- Success means targeted tests and broad tests pass, `build:ui` passes with no new blocking errors, and known lint/typecheck baselines are documented but not introduced by this plan.

Plan / Docs To Update:
- Update all living plan sections for final state.
- Update active index status to `Ready for review` or archive state as directed by the orchestrator stage.
- If docs are unchanged, record the no-doc-change rationale in `Outcomes & Retrospective`.

Deliverables:
- Final validation evidence.
- Truthful docs/notes assessment.
- Plan ready for final review/archive.

Commit Expectation:
- `Document workspace chrome cleanup`

Known Constraints / Baseline Failures:
- `rtk npm run lint` is a known red baseline.
- `rtk npm run typecheck` is a known red baseline.
- `rtk npm run build:ui` currently emits a non-blocking Vite large-chunk warning.
