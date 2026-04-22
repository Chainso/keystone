# Keystone UI Shadcn Tailwind Redesign

## Purpose / Big Picture

This plan replaces Keystone’s current Radix Themes plus custom-CSS UI foundation with a centralized Tailwind 4 plus shadcn/ui system, upgrades document surfaces to Plate-backed markdown editing and viewing, and upgrades planning/task conversation panes to assistant-ui rendered over Cloudflare’s existing chat runtime.

From the user’s perspective, the product should still be Keystone:

- one project selected at a time
- one persistent left sidebar
- `Runs`, `Documentation`, and `Workstreams` as the primary destinations
- run detail navigation through `Specification`, `Architecture`, `Execution Plan`, and `Execution`
- planning views with conversation on the left and a living document on the right
- execution that defaults to the DAG and hands off into task conversation plus review

What changes is how the UI is owned and how it feels:

- the app becomes a restrained, panel-oriented workspace instead of a set of card-heavy boards
- themeing becomes centralized and token-driven instead of component-owned
- repeated UI patterns become Keystone wrappers built on top of shadcn primitives
- planning and documentation surfaces become markdown-first Plate surfaces
- planning and task conversation panes become real, live Cloudflare-backed chat surfaces instead of placeholders

Observable outcome after the plan is complete:

- the app no longer relies on direct Radix Themes styling for its main UI system
- the major destinations read as one coherent workspace
- planning documents are edited and viewed through Plate-backed Keystone components
- planning/task chat panes reconnect through Cloudflare conversation locators and render through assistant-ui without introducing a second persistence model

## Primary Sources Of Truth

When implementation details conflict, execution must use these sources in this order:

1. the user’s explicit guidance in this thread
2. `design/workspace-spec.md`
3. `design/design-guidelines.md`
4. `ui/AGENTS.md`
5. `.ultrakit/developer-docs/m1-architecture.md`
6. `.ultrakit/developer-docs/think-runtime-architecture.md`
7. the active execution plan itself

Target images are loose inspiration only. They do not override the user’s written direction or the checked-in design markdown.

## Backward Compatibility

Backward compatibility with the current visual system is **not required**. The user explicitly wants to move away from direct Radix Themes usage and the current card-heavy look.

Backward compatibility that **is required**:

- preserve the product information architecture and terminology from `design/workspace-spec.md`
- preserve the interaction and density constraints from `design/design-guidelines.md`
- keep the route tree stable under `/runs`, `/documentation`, `/workstreams`, `/projects/new`, and `/settings`
- keep `ui/src/routes/` thin and keep destination state/composition under `ui/src/features/**`
- keep current backend truth for projects, runs, workflows, tasks, documents, and artifacts
- keep Cloudflare, Think, and persisted conversation locator seams authoritative unless a phase explicitly introduces a frontend adapter on top
- do not fake live behavior for surfaces that are still scaffold-backed or compatibility-backed

Baseline compatibility facts already captured:

- `rtk npm test` passes
- `rtk npm run lint` fails on pre-existing repo-wide issues
- `rtk npm run typecheck` fails on pre-existing repo-wide issues
- `rtk npm run build:ui` passes
- `rtk npm run build` fails in the sandbox after `vite build` because Wrangler and Docker need host-writable home-directory paths

## Design Decisions

### Decision 1: Tailwind 4 plus shadcn/ui becomes the primary frontend foundation

- **Date:** 2026-04-21
- **Decision:** Use Tailwind 4 with shadcn/ui as the shared UI foundation. Exit direct `@radix-ui/themes` usage for normal app surfaces.
- **Rationale:** The user wants centralized theme control, strong wrapper composition, and a less card-heavy, more VS Code-like workspace feel. Tailwind plus shadcn gives repo-owned components, token control, and an established composition model.
- **Alternatives considered:** keep Radix Themes and refine it; keep the current custom CSS foundation. Both leave too much visual ownership fragmented and too little repo-owned component structure.

### Decision 2: Themeing is centralized through tokens, not feature components

- **Date:** 2026-04-21
- **Decision:** All theme semantics live in centralized tokens defined from `ui/src/app/styles.css` and consumed by wrappers and primitives. Feature components may not invent their own color systems or local theme variables.
- **Rationale:** The user explicitly wants themeing centralized and does not want components individually in charge of themeing.
- **Alternatives considered:** per-feature token files; component-local styling ownership. Those approaches drift too quickly and make the product read as multiple systems.

### Decision 3: Theme toggle exists, follows system initially, and persists user choice

- **Date:** 2026-04-21
- **Decision:** First load follows the system theme. Explicit user choice is persisted in browser storage. The theme toggle lives at the bottom of the persistent left sidebar.
- **Rationale:** This matches the user’s request while keeping theme ownership centralized.
- **Alternatives considered:** dark-only first cut; theme toggle deferred; `next-themes`. The user explicitly asked for theme toggling, and a repo-owned provider is simpler in this Vite client than adding `next-themes`.

### Decision 4: Keystone wrappers are mandatory above shadcn primitives

- **Date:** 2026-04-21
- **Decision:** Repeated product patterns must be implemented as Keystone-owned wrappers and composites instead of repeatedly composing raw shadcn primitives in feature files.
- **Rationale:** The user explicitly wants strong thought around higher-level components built on top of shadcn to suit Keystone’s needs.
- **Alternatives considered:** direct shadcn composition per destination; a thinner wrapper layer. Both would create drift and duplicate composition logic.

### Decision 5: Phase 1 installs the full known dependency envelope, but generates only minimal UI source

- **Date:** 2026-04-21
- **Decision:** Install all known npm dependencies up front in Phase 1, but do not generate Plate UI code or assistant-ui surface code in Phase 1. Phase 1 is setup-only.
- **Rationale:** The user explicitly asked for a first phase that only installs and sets up dependencies and wanted key dependency decisions made up front.
- **Alternatives considered:** incremental dependency installs as phases progress; generating all registry code up front. Incremental installs cause drift; generating all source up front creates low-signal churn and harder review.

### Decision 6: `ui/src/app/styles.css` remains the single Tailwind CSS entrypoint

- **Date:** 2026-04-21
- **Decision:** Keep `ui/src/app/styles.css` as the single Tailwind 4 CSS-first entrypoint and the home of foundational and semantic tokens.
- **Rationale:** This minimizes bootstrap churn and keeps theme ownership in one place.
- **Alternatives considered:** introduce a separate `tailwind.config.*`; rename the main stylesheet. Neither is necessary for the target stack right now.

### Decision 7: Frontend aliasing is unified under `@/* -> ui/src/*`

- **Date:** 2026-04-21
- **Decision:** Use `@/* -> ui/src/*` consistently across Vite, TypeScript, and Vitest.
- **Rationale:** shadcn, Plate wrappers, and feature code need one consistent alias scheme. The repo currently has no aligned alias story.
- **Alternatives considered:** multiple alias roots; keep relative imports. Both increase drift and make generated code harder to own.

### Decision 8: Plate is a markdown-first document projection, not a new canonical storage format

- **Date:** 2026-04-21
- **Decision:** Use Plate as the editor/viewer surface for planning and documentation while keeping markdown as the canonical document format.
- **Rationale:** Backend document contracts already default to markdown, and current planning/documentation surfaces are still markdown-oriented.
- **Alternatives considered:** invent a new canonical Plate JSON format; use read-only markdown renderers. A new canonical format would fight the current backend contract; read-only markdown renderers are insufficient for the target document experience.

### Decision 9: Plate math dependencies are installed up front, but math behavior is not part of acceptance by default

- **Date:** 2026-04-21
- **Decision:** Install `@platejs/math` and `remark-math` in Phase 1 to avoid later dependency churn, but do not make math-specific editor behavior part of redesign acceptance unless an actual Keystone document surface needs it.
- **Rationale:** The user asked for the full dependency/setup envelope up front. This preserves that while keeping the initial document surface contract markdown-first and product-driven.
- **Alternatives considered:** omit math entirely up front; fully commit to math and MDX authoring as redesign acceptance. Omitting it fights the all-deps-first direction; fully committing would overstate the current product requirement.

### Decision 10: Cloudflare owns chat runtime and persistence

- **Date:** 2026-04-21
- **Decision:** Use `useAgent` and `useAgentChat` as the authoritative runtime, persistence, streaming, and sync layer for planning and task conversations.
- **Rationale:** The repo’s durable docs already state that Think/Cloudflare owns conversation history and that Keystone only persists locators on documents and tasks.
- **Alternatives considered:** add `@ai-sdk/react` as an app-level runtime; build a second browser chat runtime. Both duplicate Cloudflare’s authority and fight the existing architecture.

### Decision 11: assistant-ui is the conversation rendering and bridge layer

- **Date:** 2026-04-21
- **Decision:** Use assistant-ui with an `ExternalStoreRuntime`-style bridge over Cloudflare-owned message state. Do not use `@assistant-ui/react-ai-sdk`, Assistant Cloud, or assistant-ui as the persistence owner.
- **Rationale:** The user wants to avoid reinventing the wheel, but Cloudflare must remain authoritative.
- **Alternatives considered:** AI Elements; AI SDK UI; building all chat primitives manually. assistant-ui is the best fit for reusable UI while preserving Cloudflare authority.

### Decision 12: Interactables stay in scope, but only through Keystone- or Cloudflare-backed state

- **Date:** 2026-04-21
- **Decision:** Selected assistant-ui interactables are allowed in the conversation cutover phase, but only for conversation-adjacent persistent patterns that are backed by real Keystone or Cloudflare state. Do not use default in-memory interactable persistence as a second source of truth.
- **Rationale:** The user explicitly asked for interactables, but the product cannot tolerate a second hidden tool or persistence authority.
- **Alternatives considered:** ban interactables entirely; allow unrestricted interactables. The first ignores user direction. The second would create architecture drift.

### Decision 13: Unified diffs render through `react-diff-view`

- **Date:** 2026-04-21
- **Decision:** Use `react-diff-view` for task review diffs.
- **Rationale:** The current artifact seam is unified diff text at `contentUrl`, not old/new value pairs. `react-diff-view` matches that model more cleanly and is a better React 19 fit than `react-diff-viewer-continued`.
- **Alternatives considered:** `react-diff-viewer-continued`; custom diff rendering. Both are weaker fits for the existing artifact seam.

### Decision 14: Dense operational tables use the shadcn data-table pattern, backed by TanStack Table

- **Date:** 2026-04-21
- **Decision:** Use the shadcn data-table pattern for `Workstreams` and other dense operational list/table surfaces, with `@tanstack/react-table` kept as the underlying engine dependency and hidden behind shadcn and Keystone wrappers.
- **Rationale:** The user wants shadcn components leveraged as much as possible. shadcn’s data-table pattern already uses TanStack Table for the hard table-state problems while keeping the visible component model aligned with the rest of the design system.
- **Alternatives considered:** raw `@tanstack/react-table` composition directly in feature code; custom table state on top of shadcn `table`; heavier grid libraries. Raw TanStack in feature code breaks the ownership model, custom table state would recreate solved problems, and heavier grids are unnecessary for current requirements.

### Decision 15: Direct Radix usage is removed from normal feature/shared app code

- **Date:** 2026-04-21
- **Decision:** Normal feature and shared app code should stop importing Radix Themes or direct Radix primitives for routine surfaces. If Radix remains in the dependency graph through shadcn-generated code, it must stay behind repo-owned primitives and wrappers.
- **Rationale:** The user explicitly wants to stop relying directly on Radix and to rely on higher-level shadcn components.
- **Alternatives considered:** keep direct Radix usage where convenient. That would undermine the redesign’s ownership model.

### Decision 16: Interactive CLIs and TUIs must be managed through `tmux`

- **Date:** 2026-04-21
- **Decision:** Any interactive CLI or TUI encountered during execution must be run inside `tmux`.
- **Rationale:** This is a user preference and a durable project note.
- **Alternatives considered:** attach directly in the Codex shell. Rejected by user preference and local working pattern.

## Execution Log

- **Date:** 2026-04-21
  **Phase:** Planning
  **Decision:** Re-ran discovery-oriented repo and documentation review after context compaction before revising the active plan.
  **Rationale:** The user explicitly asked for context to be re-gathered and for the whole plan to be read before further planning.

- **Date:** 2026-04-21
  **Phase:** Planning
  **Decision:** Installed the global shadcn skill via `npx skills add shadcn/ui --yes --global`.
  **Rationale:** The user asked for this as a pre-execution step and wanted it reflected in planning.

- **Date:** 2026-04-21
  **Phase:** Planning
  **Decision:** Ran parallel subagent deep dives for Cloudflare chat runtime, assistant-ui fit, document/editor stack, diff viewer choice, and shadcn/bootstrap decisions, then folded their findings into this revision.
  **Rationale:** The user explicitly asked for deeper subagent research to avoid under-specified execution.

- **Date:** 2026-04-21
  **Phase:** Planning
  **Decision:** Rewrote the active plan to conform more closely to the execution-plan contract by adding explicit design decisions, more prescriptive handoffs, and tighter dependency/file-boundary guidance.
  **Rationale:** The prior revision still left too much room for interpretation in later phases.

- **Date:** 2026-04-21
  **Phase:** Phase 1
  **Decision:** User approval was given to begin execution, so the plan moved from approval-pending into active execution with Phase 1 as the current work item.
  **Rationale:** The checked-in plan and active index need to reflect the actual execution state before delegating work.

- **Date:** 2026-04-21
  **Phase:** Phase 1
  **Decision:** Tightened the table strategy before implementation so dense table surfaces must follow the shadcn data-table pattern rather than exposing raw TanStack composition in feature code.
  **Rationale:** The user explicitly asked to prefer shadcn data-table over raw TanStack usage before execution began.

- **Date:** 2026-04-21
  **Phase:** Phase 1
  **Decision:** Installed the locked dependency envelope, added alias wiring across Vite/TypeScript/Vitest, created a repo-owned `components.json`, and generated the initial shadcn seed set without keeping the CLI's stylesheet token injection.
  **Rationale:** Phase 1 needed the full bootstrap foundation, but the plan explicitly kept token migration and visible theme-system changes out of scope until Phase 2.

- **Date:** 2026-04-21
  **Phase:** Phase 1
  **Decision:** Validated the bootstrap with `npm install`, `build:ui`, and the targeted UI route tests, then re-ran `typecheck` and `lint` to classify results back to the known repo baseline.
  **Rationale:** The phase handoff requires proving the new foundation works while distinguishing regressions from pre-existing repo-wide failures.

## Progress

- [x] 2026-04-21 Discovery completed.
- [x] 2026-04-21 Repo baseline captured with broad test/lint/typecheck/build commands.
- [x] 2026-04-21 Global shadcn skill installed as a pre-execution prerequisite.
- [x] 2026-04-21 Parallel subagent research completed and incorporated into the plan.
- [x] 2026-04-21 Active plan rewritten into a more prescriptive execution document.
- [x] 2026-04-21 User approved execution to begin with Phase 1.
- [x] 2026-04-21 Phase 1 completed: dependency install and build bootstrap.
- [x] Phase 1: dependency install and build bootstrap.
- [ ] Phase 2: theme tokens, root theme provider, and direct-Radix bootstrap exit.
- [ ] Phase 3: Keystone wrapper inventory and workspace primitives.
- [ ] Phase 4: global shell and project-scoped chrome.
- [ ] Phase 5: runs index and run-detail structural frame.
- [ ] Phase 6: planning workspace and Plate planning documents.
- [ ] Phase 7: execution DAG workspace.
- [ ] Phase 8: task detail review workspace.
- [ ] Phase 9: workstreams surface.
- [ ] Phase 10: project configuration surfaces.
- [ ] Phase 11: documentation surfaces via Plate.
- [ ] Phase 12: planning locator completion and Cloudflare conversation binding.
- [ ] Phase 13: assistant-ui planning and task chat cutover.
- [ ] Phase 14: durable docs, regression cleanup, and final validation.

## Surprises & Discoveries

- `ui/src/main.tsx` still imports `@radix-ui/themes/styles.css`, which means the current bootstrap still depends on direct Radix Themes ownership.
- `ui/src/app/styles.css` is still the monolithic stylesheet and still has a light-biased root token model.
- `vite.config.ts`, `tsconfig.ui.json`, and `vitest.config.ts` currently do not implement the alias and plugin wiring that the target stack requires.
- The repo already has `ai`, `agents`, `@cloudflare/ai-chat`, and `@ai-sdk/openai`, but not Tailwind, shadcn bootstrap, Plate packages, assistant-ui, or the table/form/diff helpers now locked in this plan.
- Document contracts are already markdown-first. Plate should be a markdown projection, not a storage-format replacement.
- Planning and task conversation panes are still placeholder UI even though document/task contracts already carry conversation locators.
- `tests/http/app.test.ts` still expects the task conversation route to be missing, which confirms that conversation transport is a real implementation phase and not a styling concern.
- The current task artifact seam is unified diff text, which materially affects the diff-library decision.
- The current shadcn registry does not ship a standalone `data-table` UI component for this stack. It ships a `data-table-demo` example plus the guide built on `Table` and `@tanstack/react-table`, so Phase 1 should seed the required primitives and keep feature-owned TanStack composition out of scope until the Phase 3 Keystone wrapper.
- `shadcn add` mutates `ui/src/app/styles.css` to append sidebar token variables and a Tailwind `@theme inline` block. Those edits are functional for later phases but were reverted in Phase 1 to keep token ownership and visible theme changes inside Phase 2.
- On this host, `npm run build` still needs a host shell because Wrangler and Docker hit sandbox write constraints after `vite build` succeeds.

## Outcomes & Retrospective

Planning outcome on 2026-04-21:

- the frontend foundation, theming model, document strategy, conversation runtime strategy, and diff strategy are now locked
- the plan is now more explicit about what is installed in Phase 1 versus what code generation and visible wiring are deferred
- the phase sequence is now detailed enough that later implementation phases should not need to make architecture decisions mid-flight
- the remaining work is execution only, pending user approval

Phase 1 outcome on 2026-04-21:

- the repo now has the locked Tailwind/shadcn/Plate/assistant-ui dependency envelope plus the extra runtime packages required by the generated shadcn seed set
- Vite, TypeScript, and Vitest now share the `@/* -> ui/src/*` alias contract
- `components.json`, `ui/src/lib/utils.ts`, and the initial shadcn seed components now exist under repo-owned paths without changing visible product surfaces or removing the current Radix bootstrap
- the shadcn data-table path is prepared through `@tanstack/react-table` plus the seeded table/form/menu primitives, while actual Keystone table wrappers remain deferred to Phase 3
- `rtk npm run build:ui` and the targeted UI route tests pass, while `typecheck` and `lint` remain at the known repo baseline failures

## Context and Orientation

The current repository has a real backend and a still-partial operator UI.

Key backend and runtime facts:

- `src/http/api/v1/runs/contracts.ts` and `src/http/api/v1/documents/contracts.ts` already expose conversation locators on tasks and documents.
- `.ultrakit/developer-docs/think-runtime-architecture.md` states that Think/Cloudflare owns conversation history and that Keystone persists only locators on `documents` and `run_tasks`.
- `src/workflows/TaskWorkflow.ts` provisions task conversation locators for non-`scripted` execution, but planning documents do not yet consistently provision locators.
- `wrangler.jsonc` and `src/env.d.ts` already define the Cloudflare runtime pieces that back Think-backed task execution.

Key UI facts:

- `ui/src/main.tsx` still bootstraps Radix Themes CSS.
- `ui/src/app/styles.css` is still the main stylesheet and should become the Tailwind token authority.
- `ui/src/routes/` is intentionally thin and should remain thin.
- `ui/src/features/runs/components/planning-workspace.tsx` and `ui/src/features/execution/components/task-detail-workspace.tsx` still render placeholder conversation panes.
- `ui/src/features/runs/run-management-api.ts` is now the real live run data seam. Do not route live run detail back through scaffold-only resource-model code.
- `ui/src/features/resource-model/` remains the checked-in source of scaffold data for surfaces that are not live yet.

Key product facts from the design docs:

- one persistent left sidebar
- `Runs`, `Documentation`, and `Workstreams` as primary destinations
- run detail top rail for `Specification`, `Architecture`, `Execution Plan`, and `Execution`
- planning split of chat left, document right
- execution defaulting to the DAG
- task detail split of conversation left, review right
- restrained dark workspace direction with tight panel composition and little ornamental chrome

New subsystem ownership after this redesign:

- `ui/src/components/ui/*`
  shadcn-generated primitives and thin repo-owned adjustments
- `ui/src/components/workspace/*`
  shared Keystone wrappers and product-wide composites
- `ui/src/components/editor/*`
  Plate-backed editor/viewer shells and markdown helpers
- `ui/src/features/conversations/*`
  resource-scoped Cloudflare binding helpers, assistant-ui runtime bridges, and message/rendering mappers
- `ui/src/shared/forms/*`
  shared project-form helpers on top of `react-hook-form` and shadcn

## Theme And Component Ownership Model

### Token Layers

The redesign uses three token layers:

1. **Foundation tokens**
   raw palette, type scale, spacing, radii, shadows, motion, focus, z-index

2. **Semantic product tokens**
   app background, sidebar surface, workspace pane surface, inspector surface, muted surface, separators, text roles, accent/focus states, code surface, diff colors, DAG/review states

3. **Product contract tokens**
   sidebar width, pane header height, inspector width, dense row height, document max width, review accordion density

### Enforcement Rules

- no raw color literals in feature files
- no component-local theme variables for standard surfaces
- no feature hook or route file decides a surface palette
- no visual system branching outside the centralized token model
- wrappers consume tokens; features consume wrappers

### Wrapper Inventory

The redesign should standardize on this wrapper inventory:

- `WorkspaceShell`
- `AppSidebar`
- `DestinationHeader`
- `RunPhaseRail`
- `WorkspaceSplit`
- `WorkspacePane`
- `PaneHeader`
- `PaneToolbar`
- `PaneBody`
- `InspectorPane`
- `StatusBadge`
- `ResourceStateBanner`
- `EntityTable`
- `FilterChipGroup`
- `EmptyStatePanel`
- `DocumentPaneFrame`
- `ConversationPaneFrame`
- `ReviewInspector`
- `ArtifactAccordion`
- `ProjectFormSection`
- `SectionActionRow`

Exact names may shift slightly to fit repo conventions, but the responsibilities must remain stable.

For table concerns specifically, `EntityTable` should be a Keystone wrapper over the shadcn data-table pattern rather than a direct feature-owned `@tanstack/react-table` composition.

## Dependency And Setup Matrix

### Package-Level Dependencies To Add In Phase 1

- `tailwindcss`
- `@tailwindcss/vite`
- `lucide-react`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `tw-animate-css`
- `react-hook-form`
- `@hookform/resolvers`
- `@tanstack/react-table`
- `platejs`
- `@platejs/markdown`
- `@platejs/basic-nodes`
- `@platejs/link`
- `@platejs/table`
- `@platejs/list-classic`
- `@platejs/code-block`
- `@platejs/math`
- `lowlight`
- `remark-gfm`
- `remark-math`
- `@assistant-ui/react`
- `@assistant-ui/react-markdown`
- `react-diff-view`

Existing packages that remain in place:

- `ai`
- `agents`
- `@cloudflare/ai-chat`
- `@cloudflare/think`
- `zod`

Packages explicitly not part of this redesign stack:

- `@ai-sdk/react`
- `@assistant-ui/react-ai-sdk`
- `next-themes`
- Assistant Cloud persistence

### shadcn Bootstrap Contract

`components.json` must lock:

- `style: new-york`
- `tsx: true`
- `cssVariables: true`
- `iconLibrary: lucide`
- `baseColor: neutral`
- Tailwind CSS entrypoint pointing at `ui/src/app/styles.css`
- frontend aliases rooted under `@/* -> ui/src/*`

### Initial shadcn Seed Set

Phase 1 should generate only the primitives needed to prove the bootstrap path and support wrapper work:

- `button`
- `badge`
- `separator`
- `scroll-area`
- `tabs`
- `sidebar`
- `resizable`
- `data-table` if the installed shadcn registry supports it for this stack; otherwise seed the primitives the official shadcn data-table pattern requires and defer the Keystone `EntityTable` wrapper to Phase 3
- `table`
- `skeleton`
- `tooltip`
- `dialog`
- `dropdown-menu`
- `popover`
- `sheet`
- `command`
- `avatar`
- `input`
- `textarea`
- `label`
- `form`
- `select`
- `checkbox`
- `switch`
- `accordion`
- `toggle-group`
- `alert`

### Registry Additions Deliberately Deferred Beyond Phase 1

- Plate registry/UI code generation
- assistant-ui registry code generation
- generated thread-list or assistant-sidebar patterns
- `@plate/editor-ai`
- `@plate/ai-kit`
- documentation or planning surface code migration
- visible chat pane integration

## Plan of Work

The work intentionally starts with infrastructure and ownership, not screen rewrites.

First, the repo gets the build-time and source-level foundation: dependencies, aliases, Tailwind wiring, shadcn bootstrap, and the minimal primitive seed set. This isolates dependency and generator churn from visible product changes.

Second, the plan moves theme ownership and direct-Radix exit ahead of destination migration. That ensures every later phase works inside the final visual system instead of adding new surfaces on a temporary foundation.

Third, the plan creates the Keystone wrapper layer before touching major destinations. This is the core anti-drift mechanism. Each later phase should consume wrappers rather than inventing bespoke layout and status composition.

Fourth, the plan migrates visible surfaces in a product-coherent order: app shell, run frame, planning documents, execution DAG, task review, workstreams, project configuration, then documentation. That sequence keeps the most central product paths coherent first.

Finally, the plan resolves live conversation behavior in two phases. Phase 12 finishes locator truth and frontend binding to Cloudflare agents without changing visible panes. Phase 13 swaps the placeholder panes to assistant-ui only after the runtime seam is already stable. This prevents chat UI work from having to design runtime contracts at the same time.

### Phase Order Rationale

- Phase 1 is build/bootstrap only.
- Phase 2 gives the project a single visual system before screen rewrites begin.
- Phase 3 creates the wrapper inventory that later phases depend on.
- Phases 4 and 5 establish the persistent shell and run shell that every detailed workspace sits inside.
- Phases 6 through 11 migrate one product surface family at a time.
- Phase 12 solves runtime and locator plumbing with no visible chat cutover.
- Phase 13 does the visible conversation cutover after the runtime seam is solved.
- Phase 14 updates durable docs, classifies failures, and closes the plan honestly.

### Phase 1: Dependency Install And Build Bootstrap

#### Phase Handoff

- **Status:** Complete on 2026-04-21.
- **Goal:** Install the approved dependency families and wire the repo bootstrap needed for Tailwind, shadcn, Plate, assistant-ui, and the shadcn data-table path without changing product surfaces yet.
- **Scope Boundary:** In scope are `package.json`, lockfile changes, Vite/TS/Vitest alias wiring, `components.json`, `ui/src/lib/utils.ts`, and the initial shadcn seed set. Out of scope are token migration, direct-Radix removal, wrapper creation, Plate UI generation, and any destination rewrite.
- **Read First:** `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.ui.json`, `vitest.config.ts`, `ui/src/main.tsx`, `ui/AGENTS.md`.
- **Files Expected To Change:** `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.ui.json`, `vitest.config.ts`, `components.json`, `ui/src/lib/utils.ts`, `ui/src/components/ui/*`.
- **Validation:** `rtk npm install`; `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx`; `rtk npm run typecheck`; `rtk npm run lint`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff.
- **Deliverables:** all known dependencies are installed, aliasing is consistent across build/test/typecheck, shadcn bootstrap files exist, the initial primitive seed set is generated, and the table bootstrap path is ready for Phase 3 to wrap the shadcn data-table pattern rather than raw TanStack usage.
- **Commit Expectation:** `bootstrap ui dependency and build foundation`
- **Known Constraints / Baseline Failures:** lint and typecheck already fail outside this phase; `build` remains host-constrained after `vite build`.
- **Completion Notes:** Installed the locked dependency families plus shadcn-required runtime packages (`cmdk`, `radix-ui`, `react-resizable-panels`), added consistent `@/* -> ui/src/*` alias wiring, created `components.json` and `ui/src/lib/utils.ts`, and generated the initial shadcn seed set under `ui/src/components/ui/*`. The current shadcn registry only exposes a `data-table-demo` example, so the Phase 1 table path is the official guide pattern: `@tanstack/react-table` plus seeded table/form/menu primitives, with no feature-owned TanStack composition introduced yet. The CLI's stylesheet token injection was intentionally reverted so theme/token ownership stays in Phase 2.
- **Next Starter Context:** Phase 2 should start from the generated shadcn primitives already on disk and can safely take over `ui/src/app/styles.css`, token definition, dark-mode variant wiring, and Radix bootstrap removal. Do not regenerate the seed set; build on the existing `components.json` contract and keep the visible surface change limited to the centralized theme transition.

### Phase 2: Theme Tokens, Root Theme Provider, And Direct-Radix Exit

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Move the UI onto the centralized token system, add the persisted theme preference model, and remove Radix Themes bootstrap ownership.
- **Scope Boundary:** In scope are `ui/src/app/styles.css`, root theme provider/storage wiring, semantic token definition, and removal of `@radix-ui/themes/styles.css` from bootstrap. Out of scope are destination rewrites and live conversation work.
- **Read First:** `design/design-guidelines.md`, `ui/src/main.tsx`, `ui/src/app/styles.css`, `ui/src/app/app-providers.tsx`, `components.json`.
- **Files Expected To Change:** `ui/src/main.tsx`, `ui/src/app/styles.css`, `ui/src/app/app-providers.tsx`, new `ui/src/app/theme-provider.tsx` or equivalent, and possibly thin utility files for theme storage and system detection.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx`; `rtk npm run typecheck`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff.
- **Deliverables:** one centralized token system exists, both themes resolve through it, system-default first load works, explicit user preference persists, and Radix Themes CSS is no longer the main UI bootstrap.
- **Commit Expectation:** `centralize theme tokens and remove radix bootstrap`
- **Known Constraints / Baseline Failures:** the current stylesheet is large; focus on ownership and token structure first, not full screen polish.
- **Next Starter Context:** later phases should consume tokens and wrappers, not invent surface styling.

### Phase 3: Keystone Wrapper Layer And Workspace Primitives

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Create the stable wrapper inventory that later destination phases will compose.
- **Scope Boundary:** In scope are shared workspace panes, split containers, shell-friendly wrappers, status treatments, tables, empty states, and review/document frame wrappers. Out of scope are destination-specific business logic changes.
- **Read First:** `design/design-guidelines.md`, `ui/AGENTS.md`, `ui/src/components/ui/*`, `ui/src/shared/layout/*`.
- **Files Expected To Change:** `ui/src/components/workspace/*`, `ui/src/shared/layout/*`, `ui/src/shared/forms/*` if small shared form wrappers are needed, `ui/src/app/styles.css`.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/destination-scaffolds.test.tsx`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff.
- **Deliverables:** the wrapper inventory exists and is ready for shell and destination phases to consume, including a Keystone `EntityTable` built on the shadcn data-table pattern.
- **Commit Expectation:** `build keystone workspace wrapper layer`
- **Known Constraints / Baseline Failures:** wrappers must remain product-wide and must not absorb feature-specific API state.
- **Next Starter Context:** later phases should prefer wrapper composition over raw primitive composition.

### Phase 4: Global Shell And Project-Scoped Chrome

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Rebuild the persistent app frame and left sidebar around the new wrapper system.
- **Scope Boundary:** In scope are the shell layout, persistent sidebar, destination framing, and top-level chrome. Out of scope are run-detail interiors, document editing, and live chat behavior.
- **Read First:** `design/workspace-spec.md`, `design/design-guidelines.md`, `ui/src/shared/layout/app-shell.tsx`, `ui/src/shared/layout/shell-sidebar.tsx`, `ui/src/routes/shell-layout.tsx`.
- **Files Expected To Change:** `ui/src/shared/layout/app-shell.tsx`, `ui/src/shared/layout/shell-sidebar.tsx`, `ui/src/routes/shell-layout.tsx`, `ui/src/components/workspace/*`, `ui/src/app/styles.css`.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff.
- **Deliverables:** one cohesive persistent left rail and shell frame that match the workspace spec, including the reserved theme toggle location.
- **Commit Expectation:** `rebuild keystone shell chrome`
- **Known Constraints / Baseline Failures:** keep destinations and sidebar structure stable. Do not drift into destination-specific behavior.
- **Next Starter Context:** after this phase the app should already feel like one workspace, even if destination interiors are still mixed.

### Phase 5: Runs Index And Run-Detail Structural Frame

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Migrate the `Runs` landing surface and the run-detail frame into the new workspace system.
- **Scope Boundary:** In scope are the runs index, run header, top rail, and run-detail shell. Out of scope are planning document cutover, execution DAG redesign, and live chat transport.
- **Read First:** `design/workspace-spec.md`, `ui/src/routes/router.tsx`, `ui/src/routes/runs/run-detail-layout.tsx`, `ui/src/features/runs/components/*`.
- **Files Expected To Change:** `ui/src/features/runs/components/*`, `ui/src/routes/runs/run-detail-layout.tsx`, `ui/src/components/workspace/*`, `ui/src/app/styles.css`.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff.
- **Deliverables:** the `Runs` destination and run-detail shell are visually migrated without changing route semantics.
- **Commit Expectation:** `migrate runs index and run frame`
- **Known Constraints / Baseline Failures:** keep product nouns and run phase order stable.
- **Next Starter Context:** the planning and execution interiors may still be mixed old/new after this phase, but the run shell should already be coherent.

### Phase 6: Planning Workspace And Plate Planning Documents

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Migrate `Specification`, `Architecture`, and `Execution Plan` to the new split workspace with Plate-backed document surfaces.
- **Scope Boundary:** In scope are the shared planning split layout, Plate document wrappers, markdown import/export, save/discard/create flows, and planning-specific states. Out of scope are live conversation panes and Cloudflare binding.
- **Read First:** `design/workspace-spec.md`, `design/design-guidelines.md`, `ui/src/features/runs/components/planning-workspace.tsx`, `ui/src/features/runs/use-run-planning-phase-view-model.ts`, `.ultrakit/developer-docs/m1-architecture.md`.
- **Files Expected To Change:** `ui/src/features/runs/components/planning-workspace.tsx`, `ui/src/features/runs/use-run-planning-phase-view-model.ts`, new or expanded `ui/src/components/editor/*`, `ui/src/components/workspace/*`, `ui/src/app/styles.css`.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/runs-routes.test.tsx`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff.
- **Deliverables:** all three planning phases share one consistent layout and use Plate-backed document surfaces while keeping markdown canonical.
- **Commit Expectation:** `migrate planning workspace to plate`
- **Known Constraints / Baseline Failures:** do not introduce a new canonical document format; keep chat as a placeholder frame in this phase.
- **Next Starter Context:** this phase should complete the right-hand document side of planning only.

### Phase 7: Execution DAG Workspace

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Rebuild the execution default workspace around the workflow graph and graph-to-task handoff.
- **Scope Boundary:** In scope are graph presentation, node emphasis/state, summary groups, selection behavior, and task-detail navigation handoff. Out of scope are task chat and review sidebar cutover.
- **Read First:** `design/workspace-spec.md`, `design/design-guidelines.md`, `ui/src/features/execution/components/execution-workspace.tsx`, `ui/src/features/execution/use-execution-view-model.ts`.
- **Files Expected To Change:** `ui/src/features/execution/components/execution-workspace.tsx`, `ui/src/features/execution/use-execution-view-model.ts`, `ui/src/components/workspace/*`, `ui/src/app/styles.css`.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/runs-routes.test.tsx`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff.
- **Deliverables:** the execution default view reads as an active workflow workspace and hands off cleanly into task detail.
- **Commit Expectation:** `redesign execution dag workspace`
- **Known Constraints / Baseline Failures:** execution must still default to the DAG and use current workflow/task data truth.
- **Next Starter Context:** this phase intentionally stops before task-detail conversation and review UI.

### Phase 8: Task Detail Review Workspace

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Rebuild task detail around the left conversation frame and right review inspector.
- **Scope Boundary:** In scope are the task detail shell, changed-file groups, unified diff rendering, review sidebar behavior, and task-specific states. Out of scope are live chat binding and backend artifact changes.
- **Read First:** `design/workspace-spec.md`, `design/design-guidelines.md`, `ui/src/features/execution/components/task-detail-workspace.tsx`, `ui/src/features/execution/use-execution-view-model.ts`, `ui/src/features/runs/run-management-api.ts`.
- **Files Expected To Change:** `ui/src/features/execution/components/task-detail-workspace.tsx`, `ui/src/features/execution/use-execution-view-model.ts`, `ui/src/components/workspace/*`, likely new diff helpers/components under execution or workspace folders, `ui/src/app/styles.css`.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff.
- **Deliverables:** task detail becomes a real review workspace with unified diff rendering through `react-diff-view`.
- **Commit Expectation:** `redesign task review workspace`
- **Known Constraints / Baseline Failures:** keep artifact truth tied to the current API seam and `contentUrl`; do not invent old/new snapshot APIs.
- **Next Starter Context:** after this phase the visible missing piece in task detail should mainly be the live conversation behavior.

### Phase 9: Workstreams Surface

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Rebuild `Workstreams` as a dense operational list that shares the same workspace language as `Runs` and `Execution`.
- **Scope Boundary:** In scope are server-driven filters, table rendering, pagination framing, row interaction, and route handoff into task detail. Out of scope are backend pagination changes and AI conversation UI.
- **Read First:** `design/workspace-spec.md`, `ui/src/features/workstreams/components/workstreams-board.tsx`, `ui/src/features/workstreams/use-workstreams-view-model.ts`.
- **Files Expected To Change:** `ui/src/features/workstreams/components/workstreams-board.tsx`, `ui/src/features/workstreams/use-workstreams-view-model.ts`, `ui/src/components/workspace/*`, `ui/src/app/styles.css`.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/app-shell.test.tsx`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff.
- **Deliverables:** `Workstreams` is a coherent list-first operational surface using the locked filters and a Keystone `EntityTable` built from the shadcn data-table pattern over TanStack.
- **Commit Expectation:** `redesign workstreams surface`
- **Known Constraints / Baseline Failures:** no virtualization or heavier grid dependency is needed for the current product contract.
- **Next Starter Context:** keep `Workstreams` list-first and operator-focused.

### Phase 10: Project Configuration Surfaces

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Redesign `New project` and `Project settings` around the new design system while preserving their tab/action model.
- **Scope Boundary:** In scope are the project configuration shell, tab chrome, forms, list inputs, cards, and type picker surfaces. Out of scope are backend contract changes or turning the flow into a wizard.
- **Read First:** `design/workspace-spec.md`, `ui/src/routes/projects/project-configuration-layout.tsx`, `ui/src/features/projects/components/project-configuration-shell.tsx`, `ui/src/features/projects/components/project-configuration-tabs.tsx`, `ui/src/features/projects/components/project-component-card.tsx`.
- **Files Expected To Change:** `ui/src/routes/projects/project-configuration-layout.tsx`, `ui/src/features/projects/components/project-configuration-shell.tsx`, `ui/src/features/projects/components/project-configuration-tabs.tsx`, `ui/src/features/projects/components/project-component-card.tsx`, `ui/src/features/projects/components/project-component-type-picker.tsx`, `ui/src/shared/forms/*`, `ui/src/components/workspace/*`, `ui/src/app/styles.css`.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/app-shell.test.tsx`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff.
- **Deliverables:** project configuration tabs and forms align with the redesign while preserving `New project` create semantics and `Project settings` save semantics.
- **Commit Expectation:** `redesign project configuration surfaces`
- **Known Constraints / Baseline Failures:** component type selection must stay explicit because backend support is still narrow.
- **Next Starter Context:** this phase should lean heavily on shared form wrappers and avoid bespoke section chrome.

### Phase 11: Documentation Surfaces Via Plate

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Apply Plate-backed document surfaces to the project-scoped `Documentation` destination while preserving its current compatibility truth.
- **Scope Boundary:** In scope are documentation layout, category navigation framing, document rendering, and compatibility states. Out of scope are new backend documentation capabilities and chat UI.
- **Read First:** `design/workspace-spec.md`, `.ultrakit/developer-docs/m1-architecture.md`, `ui/src/features/documentation/components/documentation-workspace.tsx`, `ui/src/features/documentation/use-documentation-view-model.ts`.
- **Files Expected To Change:** `ui/src/features/documentation/components/documentation-workspace.tsx`, `ui/src/features/documentation/use-documentation-view-model.ts`, `ui/src/components/editor/*`, `ui/src/components/workspace/*`, `ui/src/app/styles.css`.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/destination-scaffolds.test.tsx`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff.
- **Deliverables:** project-scoped documentation uses the same document language as planning while preserving scaffold-backed truth where the backend is not live.
- **Commit Expectation:** `migrate documentation destination to plate`
- **Known Constraints / Baseline Failures:** do not fake live documentation for non-scaffold projects.
- **Next Starter Context:** after this phase, document surfaces should feel consistent across planning and documentation.

### Phase 12: Planning Locator Completion And Cloudflare Conversation Binding

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Ensure planning documents have stable conversation locators and add the frontend binding layer that connects planning/task resources to Cloudflare `useAgent` and `useAgentChat`.
- **Scope Boundary:** In scope are planning-document locator provisioning and lazy backfill, deterministic resource-scoped conversation identity, and frontend Cloudflare binding helpers. Out of scope are final visible assistant-ui panes and any second conversation store.
- **Read First:** `.ultrakit/developer-docs/m1-architecture.md`, `.ultrakit/developer-docs/think-runtime-architecture.md`, `src/http/api/v1/runs/contracts.ts`, `src/http/api/v1/documents/contracts.ts`, `src/http/api/v1/documents/handlers.ts`, `src/workflows/TaskWorkflow.ts`, `ui/src/features/runs/use-run-planning-phase-view-model.ts`, `ui/src/features/execution/use-execution-view-model.ts`.
- **Files Expected To Change:** `src/http/api/v1/documents/contracts.ts`, `src/http/api/v1/documents/handlers.ts`, related tests under `tests/http/*` if planning locator behavior changes, new `ui/src/features/conversations/*`, `ui/src/features/runs/use-run-planning-phase-view-model.ts`, `ui/src/features/execution/use-execution-view-model.ts`.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- tests/http/app.test.ts ui/src/test/runs-routes.test.tsx`; `rtk npm run typecheck`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff, and durable docs if the planning locator contract changes materially.
- **Deliverables:** planning documents and tasks both expose usable Cloudflare conversation identities, and the browser can bind directly from persisted locators to Cloudflare chat agents without duplicating transcript history into Keystone tables.
- **Commit Expectation:** `bind resources to cloudflare chat agents`
- **Known Constraints / Baseline Failures:** do not synthesize fake task conversations; do not introduce a generic second conversation authority.
- **Next Starter Context:** this phase should end with runtime binding solved but visible panes still placeholder-framed.

### Phase 13: assistant-ui Planning And Task Chat Cutover

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Replace the placeholder planning and task conversation frames with assistant-ui chat surfaces backed by the Cloudflare binding from Phase 12.
- **Scope Boundary:** In scope are conversation rendering, composer behavior, streaming state, empty/error states, markdown rendering, actions, human-approval affordances, and selected interactables that are backed by real state. Out of scope are runtime persistence changes, thread-list product models, or a second tool authority.
- **Read First:** `ui/src/features/conversations/*`, `ui/src/features/runs/components/planning-workspace.tsx`, `ui/src/features/execution/components/task-detail-workspace.tsx`, `.ultrakit/developer-docs/think-runtime-architecture.md`, assistant-ui runtime docs.
- **Files Expected To Change:** `ui/src/features/conversations/*`, `ui/src/features/runs/components/planning-workspace.tsx`, `ui/src/features/execution/components/task-detail-workspace.tsx`, `ui/src/components/workspace/*`, `ui/src/app/styles.css`.
- **Validation:** `rtk npm run build:ui`; `rtk npm run test -- ui/src/test/runs-routes.test.tsx ui/src/test/app-shell.test.tsx tests/http/app.test.ts`.
- **Plan / Docs To Update:** `Progress`, `Execution Log`, `Surprises & Discoveries`, this phase handoff, and durable docs if new conversation interaction rules become part of the product contract.
- **Deliverables:** planning and task conversation panes use assistant-ui components over an `ExternalStoreRuntime`-style bridge to Cloudflare message state, while preserving Keystone’s existing planning/task product model.
- **Commit Expectation:** `cut planning and task chat to assistant ui`
- **Known Constraints / Baseline Failures:** Cloudflare remains the persistence authority; no `@assistant-ui/react-ai-sdk`; no Assistant Cloud; interactables must not introduce in-memory-only product state.
- **Next Starter Context:** after this phase, the visible redesign should be functionally complete.

### Phase 14: Durable Docs, Regression Cleanup, And Final Validation

#### Phase Handoff

- **Status:** Pending approval.
- **Goal:** Update durable docs and notes, rerun the broad validation suite, classify residual failures honestly, and leave the redesign ready for final review and archive.
- **Scope Boundary:** In scope are developer docs, notes, README truth, plan maintenance, and small regression fixes discovered during final validation. Out of scope are new product features or redesign scope changes.
- **Read First:** `.ultrakit/notes.md`, `.ultrakit/developer-docs/m1-architecture.md`, `.ultrakit/developer-docs/think-runtime-architecture.md`, `README.md`, this plan.
- **Files Expected To Change:** `.ultrakit/notes.md`, `.ultrakit/developer-docs/m1-architecture.md`, `.ultrakit/developer-docs/think-runtime-architecture.md`, `README.md`, `.ultrakit/exec-plans/active/index.md`, this plan file, and any small final validation fixes.
- **Validation:** `rtk npm test`; `rtk npm run lint`; `rtk npm run typecheck`; `rtk npm run build`; if `npm run build` still fails only on the known sandbox home-directory writes, record that and rerun from a host shell only if final build proof is needed.
- **Plan / Docs To Update:** all living sections of this plan plus any affected durable docs.
- **Deliverables:** durable docs match the shipped redesign, residual failures are classified honestly, and the plan is ready for final review and archive.
- **Commit Expectation:** `document ui redesign closeout`
- **Known Constraints / Baseline Failures:** lint and typecheck already have known unrelated failures; full build remains sandbox-limited after `vite build`.
- **Next Starter Context:** this is the truth-maintenance and closeout phase, not a new feature phase.

## Concrete Steps

1. Reconfirm the working tree and current broad baseline before Phase 1 starts.

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk git status --short
rtk npm test
rtk npm run lint
rtk npm run typecheck
rtk npm run build:ui
rtk npm run build
```

Expected result:

- `npm test` passes
- `lint` and `typecheck` still show the known pre-existing failures
- `build:ui` passes
- `build` reaches the known Wrangler/Docker sandbox failure after `vite build`

2. Phase 1 installs the locked dependency envelope and bootstrap files only.

```bash
cd /home/chanzo/code/large-projects/keystone-cloudflare
rtk npm install tailwindcss @tailwindcss/vite lucide-react class-variance-authority clsx tailwind-merge tw-animate-css react-hook-form @hookform/resolvers @tanstack/react-table platejs @platejs/markdown @platejs/basic-nodes @platejs/link @platejs/table @platejs/list-classic @platejs/code-block @platejs/math lowlight remark-gfm remark-math @assistant-ui/react @assistant-ui/react-markdown react-diff-view
rtk npx shadcn@latest init
rtk npx shadcn@latest add button badge separator scroll-area tabs sidebar resizable table skeleton tooltip dialog dropdown-menu popover sheet command avatar input textarea label form select checkbox switch accordion toggle-group alert
```

If any CLI step becomes interactive, move it into `tmux`. Use non-interactive flags where supported, but do not improvise a different bootstrap contract.

3. Phase 2 removes Radix Themes bootstrap and establishes the theme/token model.

Key observable checks:

- `@radix-ui/themes/styles.css` is gone from `ui/src/main.tsx`
- `ui/src/app/styles.css` is the live token authority
- the left sidebar includes the reserved theme-toggle affordance

4. Phase 3 creates the wrapper inventory and normalizes shared composition.

Key observable checks:

- shell, pane, inspector, status, empty-state, and table wrappers exist
- destination phases can compose wrappers instead of raw primitive clusters

5. Migrate destination surfaces in the locked order:

- Phase 4: global shell
- Phase 5: runs shell
- Phase 6: planning docs
- Phase 7: execution DAG
- Phase 8: task review
- Phase 9: workstreams
- Phase 10: project configuration
- Phase 11: documentation

6. Only after visible shells and documents are stable, land the live conversation path:

- Phase 12: locator truth plus Cloudflare binding
- Phase 13: assistant-ui pane cutover

7. Re-run targeted validation after each phase and the broad suite during Phase 14 closeout.

## Validation and Acceptance

Acceptance for the full redesign is:

- the app no longer depends on direct `@radix-ui/themes` bootstrap styling for its main UI system
- normal feature/shared app code no longer imports Radix directly for standard surfaces
- themeing is centralized through Tailwind/shadcn tokens and semantic CSS variables
- first load follows system theme, explicit user choice is persisted, and both themes are driven by one centralized token system
- Keystone-owned wrappers exist for recurring workspace patterns instead of repeated raw primitive composition
- `Runs`, `Documentation`, `Workstreams`, `New project`, and `Project settings` read as one coherent workspace system
- the run-detail top rail and planning split layout remain stable
- execution still defaults to the DAG and still hands off into task detail
- planning and documentation documents render through Plate-backed Keystone wrappers while keeping markdown canonical
- planning and task conversations render through assistant-ui panes backed by Cloudflare `useAgent` and `useAgentChat` plus persisted locators
- Cloudflare and Think remain authoritative for conversation/runtime data
- broad validation results are recorded honestly, including any persistent repo-wide lint/typecheck failures and the known host-only build constraint

### Locked Manual Smoke Matrix

Each major migration phase should at least smoke these routes:

- `/runs`
- `/runs/:runId/specification`
- `/runs/:runId/architecture`
- `/runs/:runId/execution-plan`
- `/runs/:runId/execution`
- `/runs/:runId/execution/tasks/:taskId`
- `/documentation`
- `/workstreams`
- `/projects/new/overview`
- `/settings/overview`

### Baseline To Compare Against

- `rtk npm test`: passes with `35 passed | 2 skipped` files and `262 passed | 19 skipped` tests
- `rtk npm run lint`: fails on pre-existing repo-wide issues in scripts, backend, and tests including `scripts/demo-validate.ts`, `scripts/run-local.ts`, `src/http/api/v1/documents/handlers.ts`, `src/keystone/compile/plan-run.ts`, `src/keystone/integration/finalize-run.ts`, `src/lib/db/schema.ts`, `src/lib/workspace/init.ts`, `src/workflows/RunWorkflow.ts`, `src/workflows/TaskWorkflow.ts`, and multiple test files
- `rtk npm run typecheck`: fails on the pre-existing implementer metadata typing issue in `src/keystone/agents/implementer/ImplementerAgent.ts` and the Hyperdrive binding mismatch in `tests/lib/db-client-worker.test.ts`
- `rtk npm run build:ui`: passes
- `rtk npm run build`: `vite build` passes, then Wrangler and Docker fail in the sandbox on read-only writes under `~/.config/.wrangler` and `~/.docker/buildx/activity/`

## Idempotence and Recovery

- Phase 1 dependency/bootstrap work is safe to rerun if the working tree returns to the last committed phase boundary.
- If a phase stops halfway, update `Progress`, `Execution Log`, `Surprises & Discoveries`, `Outcomes & Retrospective`, and that phase handoff before stopping.
- If shadcn-generated files are partially introduced, finish the intended registry path or revert only the uncommitted files from that phase. Do not mix duplicate component trees.
- If Plate wrappers are partially introduced, keep editor/viewer ownership in `ui/src/components/editor/*` instead of scattering new editor code across feature folders.
- If validation fails, classify it as baseline versus regression before fixing anything outside the current phase boundary.
- If an interactive CLI appears, move the work into `tmux`.
- If `rtk npm run build` is the only failing command and it fails after `vite build` because of sandbox home-directory writes, record that as the known host-only build constraint unless final proof requires a host rerun.

## Artifacts and Notes

Primary repository references:

- `design/workspace-spec.md`
- `design/design-guidelines.md`
- `ui/AGENTS.md`
- `.ultrakit/developer-docs/m1-architecture.md`
- `.ultrakit/developer-docs/think-runtime-architecture.md`
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.ui.json`
- `vitest.config.ts`
- `ui/src/main.tsx`
- `ui/src/app/styles.css`
- `ui/src/app/app-providers.tsx`
- `ui/src/routes/router.tsx`
- `ui/src/features/runs/run-management-api.ts`
- `ui/src/features/runs/components/planning-workspace.tsx`
- `ui/src/features/execution/components/task-detail-workspace.tsx`
- `src/http/api/v1/runs/contracts.ts`
- `src/http/api/v1/documents/contracts.ts`
- `src/http/api/v1/documents/handlers.ts`
- `src/workflows/TaskWorkflow.ts`

Official references consulted during planning:

- [Tailwind Vite installation](https://tailwindcss.com/docs/installation/using-vite)
- [Tailwind theme variables](https://tailwindcss.com/docs/theme)
- [shadcn Vite installation](https://ui.shadcn.com/docs/installation/vite)
- [shadcn `components.json`](https://ui.shadcn.com/docs/components-json)
- [shadcn Vite dark mode guidance](https://ui.shadcn.com/docs/dark-mode/vite)
- [shadcn React Hook Form](https://ui.shadcn.com/docs/forms/react-hook-form)
- [shadcn data table](https://ui.shadcn.com/docs/components/data-table)
- [Plate markdown](https://platejs.org/docs/markdown)
- [Plate UI installation](https://platejs.org/docs/installation/plate-ui)
- [Cloudflare chat agents](https://developers.cloudflare.com/agents/api-reference/chat-agents/)
- [Cloudflare client SDK](https://developers.cloudflare.com/agents/api-reference/client-sdk/)
- [assistant-ui installation](https://www.assistant-ui.com/docs/installation)
- [assistant-ui `ExternalStoreRuntime`](https://www.assistant-ui.com/docs/runtimes/custom/external-store)
- [assistant-ui interactables](https://www.assistant-ui.com/docs/guides/interactables)

Subagent findings folded into this rewrite:

- Cloudflare should remain the conversation runtime and persistence authority
- assistant-ui should be a rendering/runtime bridge, not the persistence owner
- markdown should remain canonical for document storage
- unified diff rendering is a better match than old/new diff-pair rendering
- theme toggling in this Vite app should be repo-owned, not delegated to `next-themes`

## Interfaces and Dependencies

- **Tailwind CSS 4 / `@tailwindcss/vite`**
  CSS-first build and token foundation for the UI

- **shadcn/ui**
  repo-owned primitive registry and code generation path

- **`class-variance-authority` + `clsx` + `tailwind-merge`**
  standard shadcn-friendly class composition and variant management

- **`react-hook-form` + `@hookform/resolvers` + existing `zod`**
  project configuration and form-state stack

- **shadcn data-table pattern + `@tanstack/react-table`**
  dense operational table behavior under Keystone wrappers, with TanStack kept behind the shadcn/Keystone table layer rather than used raw in feature code

- **Plate (`platejs`, `@platejs/markdown`, plugin packages)**
  markdown-first editor/viewer substrate for planning and documentation

- **Cloudflare `agents` + `@cloudflare/ai-chat`**
  authoritative runtime seam for conversation transport, persistence, streaming, and sync

- **assistant-ui (`@assistant-ui/react`, `@assistant-ui/react-markdown`)**
  conversation rendering layer and `ExternalStoreRuntime`-style bridge over Cloudflare-owned message state

- **`react-diff-view`**
  unified diff renderer aligned with the current `git_diff` artifact seam

- **`ui/src/components/workspace/*`**
  durable wrapper layer for shell, panes, inspectors, status, empty states, and action rows

- **`ui/src/components/editor/*`**
  durable document layer for Plate-backed editor and viewer surfaces

- **`ui/src/features/conversations/*`**
  frontend conversation identity, Cloudflare binding, assistant-ui runtime bridging, and message rendering contracts

- **Keystone run/document/task APIs**
  remain the primary product data seams; the redesign does not replace them

- **Cloudflare and Think conversation locator model**
  remains authoritative for runtime identity and persistence; the browser adapts to it rather than replacing it
