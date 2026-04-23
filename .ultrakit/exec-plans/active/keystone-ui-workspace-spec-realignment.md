# Keystone UI Workspace Spec Realignment

## Purpose / Big Picture

Bring the shipped React workspace back into line with `design/workspace-spec.md` and `design/design-guidelines.md` as a UI-only change. After this work lands, the operator-facing UI should consistently use the canonical destination and run-flow language from the spec, avoid leaking workflow / approval / Cloudflare transport terminology into the product surface, and present run/task state in a calmer, product-first way.

Concretely, the user should be able to open the shell, `Runs`, `Documentation`, `Workstreams`, and task detail views and see the same product model described in the workspace spec: one selected project, one stable sidebar, one run stepper, DAG-first execution, and task detail as conversation plus code review, all without machine-oriented labels dominating the interface.

## Backward Compatibility

API compatibility is required for this pass. Route paths, route composition, UI abstractions, component seams, and renderer implementations may change if that is the cleanest way to match the workspace spec.

Constraints:

- Do not change the current project-management or run-management API contracts.
- Preserve the product intent from `design/workspace-spec.md` and `design/design-guidelines.md`, not the current UI implementation structure.
- Prefer the cleanest UI/component shape even if it breaks existing component boundaries, renderer implementations, or test assumptions.

## Design Decisions

### 2026-04-22 - Treat the workspace spec and design guidelines as the product source of truth

Decision:
Use `design/workspace-spec.md` and `design/design-guidelines.md` as the authority for shipped UI wording and destination framing when they disagree with current implementation copy.

Rationale:
The repo notes already state that these documents are more authoritative than the target images for this redesign, and the user explicitly asked to bring the UI back in line with them.

Alternatives considered:
- Leave the current UI wording alone and rely on future visual polish to close the gap.
- Use the target reference images as the primary arbiter.

### 2026-04-22 - Optimize for the target model within the current API boundaries

Decision:
Keep the current API contracts fixed, but freely replace routes, UI seams, view-model shaping, and renderer implementations to reach the target product model. Deriving fallback copy from existing fields is acceptable when it remains the best UI design.

Rationale:
The user clarified that this is still a UI-only change, but routes are part of the UI and may change if the workspace spec calls for it. Backend and API contracts should stay stable; frontend structure should not be preserved just because it already exists.

Alternatives considered:
- Change routes or APIs to get to the target model faster.
- Restrict changes to copy-only realignment.

### 2026-04-22 - Align destination titles with canonical destination nouns

Decision:
Use the exact destination names `Documentation` and `Workstreams` in the destination view models and headings instead of `Project documentation` and `Project work across runs`.

Rationale:
The workspace spec defines the top-level product model around these exact destinations. The current expanded titles weaken the stable shell model and make the product feel less consistent across screens.

Alternatives considered:
- Keep the expanded titles because they are descriptive.
- Rename the sidebar destinations instead of the page titles.

### 2026-04-22 - Standardize document surfaces on a Plate-first shared component

Decision:
Scrap the current repo-owned Plate rendering path entirely and rebuild the planning/documentation surfaces on Plate UI's generated primitives: `Editor`, `EditorContainer`, `EditorStatic`, `MarkdownKit`, and the generated feature kits. Do not preserve `PlateMarkdownDocument` as an implementation seam.

Rationale:
The repo already depends on Plate packages, but current document surfaces are only using `createPlateEditor` plus `PlateContent` in a custom wrapper. The user explicitly rejected that path and asked to scrap it in favor of what Plate recommends out of the box. The Plate markdown docs provided in-thread point to `MarkdownKit` as the default compatibility path, and after install the repo now has local Plate UI source files for `Editor`, `EditorContainer`, `EditorStatic`, `MarkdownKit`, and the basic/code/link/list/math/table kits under `ui/src/components/`. The correct next step is therefore to delete the repo-owned wrapper path and wire product surfaces directly onto those generated Plate UI sources.

Alternatives considered:
- Keep the existing `PlateMarkdownDocument` wrapper and only adjust copy around it.
- Build a larger custom Plate preset from scratch without using `MarkdownKit`.
- Replace Plate entirely with another markdown renderer.
- Continue with separate per-screen document rendering logic.

### 2026-04-22 - Preserve markdown as the saved source of truth at the Plate boundary

Decision:
Keep markdown as the persisted document format for planning and documentation while moving the editing/viewing experience onto Plate UI. Deserialize markdown into Plate for display/editing, and serialize back to markdown on save instead of introducing Plate JSON persistence or a second canonical document format.

Rationale:
The current run/document APIs already persist markdown content, the planning/documentation features are built around markdown revisions, and the user asked to keep the setup basic. A Plate-first UI should therefore replace the authoring/rendering path, not the storage contract.

Alternatives considered:
- Persist Plate JSON alongside markdown.
- Keep textarea editing for planning and only replace the read-only viewer.
- Introduce a separate transform layer that treats Plate JSON as the new feature-local source of truth.

### 2026-04-22 - Update tests in the same pass as product-copy changes

Decision:
Treat route and shell tests as part of the acceptance criteria for this work and update any assertions that currently encode the out-of-spec copy.

Rationale:
This repo already has broad UI route coverage. Keeping those tests aligned with the workspace spec is the cheapest way to prevent the product language from drifting back.

Alternatives considered:
- Only update the UI implementation and leave tests for a later cleanup.
- Reduce assertion coverage around headings and copy to avoid maintenance work.

## Execution Log

- 2026-04-22: Completed discovery and baseline validation for the shell/run/documentation alignment pass.
- 2026-04-22: Installed Plate UI source components and kits via shadcn CLI as a prerequisite for the document-surface rewrite:
  - added Plate UI core CSS variables and editor shell files,
  - generated local Plate UI source for `MarkdownKit`, basic nodes, code block, link, list, math, and table kits,
  - updated shared `tooltip`, `separator`, `dropdown-menu`, `dialog`, `checkbox`, and `command` primitives to the registry versions those kits expect,
  - left `popover`, `button`, and `input` untouched because the registry reported them as identical / skippable.
- 2026-04-22: Waited on explorer audits after the Plate install to refine the execution plan before wiring the generated Plate UI sources into product code.
- 2026-04-22: Execution started under the UI-only boundary: keep API contracts stable, allow route/UI seam changes, and begin with Phase 1 destination/project-configuration framing.
- 2026-04-22: Completed Phase 1 destination/project-configuration framing:
  - `Documentation` and `Workstreams` now use the canonical workspace-spec destination headings.
  - `/settings` now redirects to `Overview`, matching `New project` instead of defaulting to `Components`.
  - `Project settings` no longer repeats the selected project name in the destination title, and project-configuration shell copy now frames `New project` and `Project settings` as the same tabbed configuration surface with create/save differences.
- 2026-04-22: Validated Phase 1 with:
  - `rtk npm test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx` -> passed (`69 passed`).
  - initial sandbox `rtk npm test` -> failed in `tests/scripts/demo-contracts.test.ts` with `listen EPERM 127.0.0.1`, so broad validation moved to a host-shell rerun.
  - `rtk npm test -- ui/src/test/runs-routes.test.tsx` -> passed after hardening one transient compile-button assertion exposed by the first host rerun.
  - final host `rtk npm test` -> passed (`35 passed | 2 skipped` test files, `325 passed | 21 skipped` tests).
- 2026-04-22: Completed the one allowed Phase 1 targeted fix pass:
  - removed the remaining selected-project wording from `Project settings` loading/components copy and the overview description-field helper text,
  - removed repeated selected-project framing from visible `Workstreams` summary, empty-state, and route-guidance copy so the shell remains the owner of project context,
  - updated the directly affected destination-scaffold assertions,
  - reran validation: targeted `rtk npm test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx` passed, sandbox `rtk npm test` hit the known `tests/scripts/demo-contracts.test.ts` `listen EPERM 127.0.0.1` blocker again, and the escalated rerun passed (`35 passed | 2 skipped` test files, `325 passed | 21 skipped` tests).
- 2026-04-22: Phase 1 closed after review verification. Phase 2 execution is starting with the corrected assumption that run/execution surfaces still carry some selected-project framing and remain responsible for removing it.
- 2026-04-23: Phase 2 closed after the targeted fix pass resolved the run-stage link mismatch, removed the misleading default-phase abstraction, and added positive coverage for the new run/task-detail behavior. Phase 3 execution is starting from the Plate UI install baseline and the documented renderer/test constraints.
- 2026-04-23: Phase 3 closed after the targeted fix pass resolved the remaining documentation-copy, save-state, parse-fallback, and coverage issues. Phase 4 execution is starting for closeout truth, durable docs/notes evaluation, and archive readiness.
- 2026-04-22: Completed Phase 2 run/execution realignment:
  - the live `Runs` index now uses human summary copy plus canonical `Specification` / `Execution` stage labels instead of raw workflow and engine identifiers,
  - `/runs/:runId` now lands on `Specification` as the stable run-entry route instead of inferring a deeper phase from compile state,
  - run headers now keep the run id, status, and activity timing without foregrounding workflow ids or execution-engine metadata,
  - task detail now frames the left pane as task conversation plus right-side code review without approval/transport wording,
  - `Execution Plan` keeps compile controls inside the shared planning document pane instead of rendering a separate accessory block beneath the split layout.
- 2026-04-22: Validated Phase 2 with:
  - `rtk npm test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx` -> passed (`85 passed`).
  - sandbox `rtk npm test` -> failed again in `tests/scripts/demo-contracts.test.ts` with `listen EPERM 127.0.0.1`, so broad validation moved to a host-shell rerun.
  - first escalated host `rtk npm test` -> exposed one transient app-shell assertion that relied on the short-lived `Creating run...` label.
  - final escalated host `rtk npm test` -> passed after hardening that assertion (`35 passed | 2 skipped` test files, `328 passed | 21 skipped` tests).
- 2026-04-23: Completed the one allowed Phase 2 targeted fix pass:
  - `Runs` index rows now deep-link to the stage they display so the visible stage label matches the opened run surface for both live and scaffold rows.
  - the bare `/runs/:runId` redirect still lands on `Specification`, but the misleading `useRunDefaultPhasePath` abstraction is gone and the route now redirects there directly.
  - added row-level live-run summary assertions, a positive run-header activity assertion, and a positive `Code review` heading assertion.
  - reran validation: `rtk npm test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx` passed (`86 passed`), sandbox `rtk npm test` hit the known `tests/scripts/demo-contracts.test.ts` `listen EPERM 127.0.0.1` blocker again, and the escalated host rerun passed (`35 passed | 2 skipped` test files, `329 passed | 21 skipped` tests).
- 2026-04-23: Completed Phase 3 document-surface and documentation-model realignment:
  - deleted the repo-owned `plate-markdown-document` wrapper and replaced it with a shared Plate-first markdown surface built on generated `Editor` / `EditorStatic` components plus the installed Plate kits.
  - kept markdown as the persisted boundary by centralizing markdown normalization, deserialization, and serialization in the shared editor/viewer path rather than introducing persisted Plate JSON.
  - replaced the planning `textarea + preview` split with a real Plate editor while keeping labeled document regions and markdown save semantics intact.
  - collapsed Documentation grouping to the canonical `Product Specifications`, `Technical Architecture`, and `Miscellaneous Notes` categories and rewrote the compatibility state in product-facing language.
  - updated route and selector tests to match the new document surface and canonical documentation model, including a Plate-editor test double in route tests so jsdom keeps asserting save/load behavior without depending on contenteditable internals.
- 2026-04-23: Validated Phase 3 with:
  - `rtk npm test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/resource-model-selectors.test.tsx` -> passed (`3 passed` test files, `109 passed` tests).
  - sandbox `rtk npm test` -> failed again in `tests/scripts/demo-contracts.test.ts` with the known `listen EPERM 127.0.0.1` restriction.
  - escalated host `rtk npm test` -> passed (`35 passed | 2 skipped` test files, `329 passed | 21 skipped` tests).
- 2026-04-23: Completed the one allowed Phase 3 targeted fix pass:
  - documentation compatibility copy now uses product-facing sample-project language instead of scaffold/demo-dataset jargon,
  - the shared `markdown-document-surface` now fails closed on markdown parse errors by showing the original source and disabling body editing instead of coercing unsupported markdown into a lossy paragraph fallback,
  - planning editors now disable both title/body editing while a save is in flight so users cannot type changes that would be lost behind the pending request,
  - `runs-routes` now exercises the real shared markdown surface through a test-only keyed source seam, asserts reinitialization after save/reopen plus in-flight disabled behavior, and `resource-model-selectors` now fails if documentation grouping ever expands beyond the canonical three groups,
  - reran validation: `rtk npm test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/resource-model-selectors.test.tsx` passed (`3 passed` test files, `109 passed` tests), sandbox `rtk npm test` hit the known `listen EPERM 127.0.0.1` blocker again, and the escalated host rerun passed (`35 passed | 2 skipped` test files, `329 passed | 21 skipped` tests).
- 2026-04-23: Completed Phase 4 documentation and closeout truth:
  - audited `README.md` plus the current durable developer docs against the shipped UI surfaces and confirmed they already describe the canonical destination language, shared Plate-backed document surfaces, assistant-ui conversations, and scaffold-backed `Documentation` boundary truthfully,
  - updated `.ultrakit/notes.md` to reflect that broad `rtk npm test` is still unreliable inside the Codex sandbox on this host because the script suite can fail with `listen EPERM 127.0.0.1`,
  - updated the active-plan index to mark this plan `Ready for review` while leaving archive and completed-index bookkeeping for the final comprehensive review / archive pass.
- 2026-04-23: Validated Phase 4 with:
  - sandbox `rtk npm test` -> failed in `tests/scripts/demo-contracts.test.ts` with the known `listen EPERM 127.0.0.1` restriction.
  - escalated host `rtk npm test` -> passed (`35 passed | 2 skipped` test files, `329 passed | 21 skipped` tests).
- 2026-04-23: Completed the one allowed final whole-plan closeout pass:
  - planning conversation empty-state copy now uses product language (`attached planning conversation`) instead of `Cloudflare conversation`,
  - shared assistant tool cards now say `Waiting for decision` / `Decision needed` and describe the pause as a generic human decision instead of approval/Cloudflare transport wording,
  - documentation route coverage now proves fenced code blocks render through the shared Plate viewer, and the planning save/reopen route now proves fenced code blocks persist and render through the same shared surface,
  - added direct shared-surface coverage in `ui/src/test/markdown-document-surface.test.tsx` for fenced code blocks plus fail-closed viewer/editor behavior when markdown deserialization rejects malformed input.
- 2026-04-23: Validated the final whole-plan closeout pass with:
  - `rtk npm test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/resource-model-selectors.test.tsx` -> passed (`3 passed` test files, `109 passed` tests).
  - `rtk npm test -- ui/src/test/markdown-document-surface.test.tsx` -> passed (`1 passed` test file, `3 passed` tests).
  - sandbox `rtk npm test` -> failed in `tests/scripts/demo-contracts.test.ts` with the known `listen EPERM 127.0.0.1` restriction.
  - escalated host `rtk npm test` -> passed (`36 passed | 2 skipped` test files, `332 passed | 21 skipped` tests).

## Progress

- [x] 2026-04-22 Audit the current shell, run detail, execution, documentation, and workstreams surfaces against the workspace spec and design guidelines.
- [x] 2026-04-22 Run baseline validation once before execution and record the current repo state.
- [x] 2026-04-22 Create the active execution plan and register it in `.ultrakit/exec-plans/active/index.md`.
- [x] 2026-04-22 Run a deeper parallel discovery pass with explorer subagents for shell/configuration, runs, and execution/documentation/workstreams.
- [x] 2026-04-22 Install Plate UI source components and feature kits needed to replace the repo-owned Plate wrapper with the registry-based baseline.
- [x] 2026-04-22 Phase 1: align destination and project-configuration framing with the workspace spec.
- [x] 2026-04-22 Phase 1 targeted fix pass: remove the remaining selected-project wording from project configuration and Workstreams destination copy.
- [x] 2026-04-22 Phase 2: realign run and execution flow behavior with the workspace spec.
- [x] 2026-04-23 Phase 2 targeted fix pass: align run-index deep links with displayed stages, remove the misleading default-phase hook, and add the missing coverage.
- [x] 2026-04-23 Phase 3: realign documentation model and document surfaces with the workspace spec.
- [x] 2026-04-23 Phase 3 targeted fix pass: remove the remaining documentation jargon, fail closed on parse errors, restore planning-editor pending locks, and tighten the real-surface coverage.
- [x] 2026-04-23 Phase 4: evaluate doc / notes impact, run closeout validation, and leave the plan ready for final review.
- [x] 2026-04-23 Final whole-plan closeout pass: remove the last Cloudflare/approval copy leaks and close the remaining shared document-surface coverage gaps.

## Surprises & Discoveries

- Broad `rtk npm test` passes in this worktree after `npm install` when the suite can bind localhost outside the sandbox: `36 passed | 2 skipped` test files and `332 passed | 21 skipped` tests.
- `npm run lint` currently fails for pre-existing non-UI issues in backend and test files, including unused variables and `preserve-caught-error` violations in:
  - `scripts/run-local.ts`
  - `src/http/api/v1/documents/handlers.ts`
  - `src/keystone/integration/finalize-run.ts`
  - `src/lib/db/schema.ts`
  - `src/lib/workspace/init.ts`
  - `tests/http/projects.test.ts`
  - `tests/lib/project-workspace-materialization.test.ts`
  - `tests/lib/run-records.test.ts`
- `npm run typecheck` currently fails before this work begins, including pre-existing issues in conversation, execution, workstreams, and test files. This alignment pass must not claim a clean broad typecheck baseline.
- `npm run build` currently completes the Vite UI build, then fails inside Wrangler because the sandbox cannot write `~/.config/.wrangler/logs/...` and Docker build state (`EROFS` / read-only filesystem). This is a known environment caveat already reflected in `.ultrakit/notes.md`.
- The live project-runs API record does not expose a user-facing `summary` field; current live rows in `Runs` are compensating by showing `workflowInstanceId` and engine strings instead.
- Parallel explorer audit found additional drift beyond the first-pass copy review:
  - `Project settings` defaults to `Components` instead of sharing the same tabbed entry behavior as `New project`.
  - `Project settings` repeats selected-project context inside the destination even though project selection is global.
- Plate UI's generated `EditorContainer` is bound to `PlateContainer`, so the shared read-only viewer could not reuse it outside a live `Plate` context. The static document surface needs its own shell wrapper around `EditorStatic` instead of reusing the editable container component.
  - the live `Runs` index collapses stage to `Planning` vs `Execution` and uses internal runtime metadata as the summary field.
  - opening `/runs/:runId` auto-redirects to `Execution` or the first incomplete planning phase instead of a stable run-detail landing behavior.
  - `Execution Plan` breaks the shared planning layout by rendering a separate compile accessory beneath the right pane.
  - documentation grouping is path-derived and can surface categories beyond the three canonical groups from the workspace spec.
- Plate-specific audit found that the repo is using Plate only through a custom low-level wrapper in `ui/src/components/editor/plate-markdown-document.tsx`; there is no shared `EditorKit` / `EditorContainer`-style document surface in the repo today, and planning/documentation screens both depend on that wrapper.
- A second Plate-focused audit narrowed the concrete custom seams to remove or absorb into a shared document surface:
  - `ui/src/features/documentation/use-documentation-view-model.ts` reconstructs markdown from `contentLines` with feature-local rules.
  - `ui/src/features/runs/components/planning-workspace.tsx` uses textarea fields for authoring and Plate only for preview.
  - `ui/src/features/runs/use-run-planning-phase-view-model.ts` bakes textarea editing semantics into the feature contract.
  - `ui/src/components/editor/plate-markdown-document.tsx` is reusable in intent but only owns a read-only render path, not a broader document UI contract.
- The user explicitly asked for a basic Plate integration that uses `MarkdownKit` and includes the plugins the repo already has installed, rather than growing a more ambitious custom editor stack.
- Shadcn skill / CLI discovery originally confirmed the repo’s shadcn context is Vite + Tailwind v4 + `new-york` style + radix base. After installation, the repo now contains local Plate UI source for:
  - `ui/src/components/ui/editor.tsx`
  - `ui/src/components/ui/editor-static.tsx`
  - `ui/src/components/editor/plugins/markdown-kit.tsx`
  - `ui/src/components/editor/plugins/basic-nodes-kit.tsx`
  - `ui/src/components/editor/plugins/code-block-kit.tsx`
  - `ui/src/components/editor/plugins/link-kit.tsx`
  - `ui/src/components/editor/plugins/list-classic-kit.tsx`
  - `ui/src/components/editor/plugins/math-kit.tsx`
  - `ui/src/components/editor/plugins/table-kit.tsx`
- The Plate UI install added 11 dependencies and 11 lines of app-level style configuration, plus generated 52 new source files and updated 6 shared primitives. This work should be treated as the baseline for Phase 3 rather than additional optional exploration.
- Explorer audit confirmed the main Plate replacement seam is still `ui/src/components/editor/plate-markdown-document.tsx`, with the planning textarea contract in `ui/src/features/runs/use-run-planning-phase-view-model.ts` / `ui/src/features/runs/components/planning-workspace.tsx` as the second major seam.
- Explorer audit also narrowed the renderer-coupled regression surface to `ui/src/test/destination-scaffolds.test.tsx` and `ui/src/test/runs-routes.test.tsx`, especially for:
  - the labeled outer document region,
  - native table and column-header roles,
  - list-item semantics,
  - blockquote semantics,
  - the separate `Document preview` region in planning edit mode.
- `vitest run ui/src/test/runs-routes.test.tsx ui/src/test/destination-scaffolds.test.tsx` passes at baseline before the Plate UI consumer rewrite: `91/91`.
- Broad `rtk npm test` can still regress inside the sandbox on this host with `listen EPERM 127.0.0.1` from `tests/scripts/demo-contracts.test.ts`, even though an earlier baseline passed there. If that happens during closeout, rerun the broad suite outside the sandbox instead of treating it as a product regression.
- Host broad validation exposed one transient assertion in `ui/src/test/runs-routes.test.tsx`: the compile flow can navigate quickly enough that `Compiling run...` disappears before Testing Library observes it. Counting the compile `POST` plus the execution redirect is a more stable proof for that path.
- Phase 2 host broad validation exposed the same kind of timing issue in `ui/src/test/app-shell.test.tsx`: the in-flight create-run request can resolve quickly enough that the `Creating run...` label disappears before Testing Library observes it. Asserting the single `POST /v1/projects/:projectId/runs` call is the more stable proof of request reuse.
- Review follow-up clarified that the run-index stage column and the bare `/runs/:runId` route serve different jobs: the table should preserve current-stage semantics, while the route should stay a stable specification landing. The least misleading fix is stage-specific row deep links rather than changing the stable bare route.
- Phase 3 fix-pass review confirmed that silent markdown parse fallback is not acceptable at the shared document seam: unsupported markdown must surface as raw source with body editing disabled, otherwise a title-only revisit can silently rewrite the document on the next save.
- Route tests do not need a full markdown-surface mock to prove planning save/load behavior in jsdom: a test-only source seam inside the real shared component is enough to exercise `markdownSourceKey` resets and pending-state locks without reverting to the old textarea contract.
- The Phase 4 closeout audit found that `README.md` and the current durable developer docs were already truthful after Phases 1-3; only `.ultrakit/notes.md`, the active plan, and the active-plan index needed closeout maintenance.
- Plate's markdown deserializer recovers many malformed inputs instead of throwing, so direct fail-closed coverage for `markdown-document-surface` needs a targeted deserializer-throw seam in tests rather than assuming a random malformed string will hit the error branch.

## Outcomes & Retrospective

- Phase 1 completed on 2026-04-22.
- Result:
  - Top-level `Documentation` and `Workstreams` framing now matches the workspace spec.
  - `Project settings` now shares the same overview-first tab entry behavior as `New project`.
  - Project configuration surfaces no longer repeat the selected project name in the page title, leaving the global shell as the owner of project context.
  - The targeted fix pass removed the last selected-project phrasing from visible `Project settings` and `Workstreams` destination copy.
- Validation:
  - `rtk npm test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx` passed.
  - Fix-pass sandbox `rtk npm test` hit the known `listen EPERM 127.0.0.1` blocker in `tests/scripts/demo-contracts.test.ts`; the escalated rerun passed on the host (`35 passed | 2 skipped` test files, `325 passed | 21 skipped` tests).
- Phase 2 completed on 2026-04-22.
- Result:
  - `Runs` now keeps project context in the shell, uses human run summaries, and shows canonical stage labels instead of raw workflow metadata.
  - The targeted fix pass aligned row navigation with those stage labels: live and scaffold rows now deep-link to the stage they display, while bare `/runs/:runId` still lands on `Specification`.
  - The old default-phase hook is gone; the redirect route now encodes the stable specification landing directly.
  - Run header copy now centers the run workspace and activity timing, and task detail now frames chat plus code review without approval/transport language.
  - `Execution Plan` now keeps compile controls inside the shared planning document pane, preserving the left-chat/right-document planning shape.
- Validation:
  - Initial Phase 2 `rtk npm test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx` passed (`85 passed`).
  - Phase 2 targeted fix pass `rtk npm test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx` passed (`86 passed`).
  - Both Phase 2 broad sandbox `rtk npm test` runs hit the known `listen EPERM 127.0.0.1` blocker in `tests/scripts/demo-contracts.test.ts`.
  - The initial escalated host rerun passed after hardening one transient create-run assertion (`35 passed | 2 skipped` test files, `328 passed | 21 skipped` tests), and the fix-pass rerun passed on the host with the new assertions (`35 passed | 2 skipped` test files, `329 passed | 21 skipped` tests).
- Phase 3 completed on 2026-04-23.
- Result:
  - Planning and documentation now share a Plate-first markdown surface built from the generated Plate UI editor/static shells plus the installed markdown/basic/code/link/list/math/table kits.
  - The old repo-owned Plate wrapper is gone, markdown remains the authoritative save/load contract, and the planning workspace now edits directly in Plate instead of mirroring a textarea into a separate preview.
  - Documentation categories now collapse to the canonical workspace-spec group set: `Product Specifications`, `Technical Architecture`, and `Miscellaneous Notes`.
  - Documentation compatibility copy now explains the current sample-project limitation in product terms rather than scaffold/demo-dataset jargon.
  - The targeted fix pass made markdown parse failures fail closed: the viewer now shows original source unchanged, the editor disables body edits when it cannot safely round-trip that source, and in-flight saves now disable the planning editor instead of leaving a data-loss window.
  - Route tests now preserve the user-facing save/load contract with the real shared markdown surface through a keyed test seam, and selector coverage now fails if a fourth documentation group appears.
- Validation:
  - `rtk npm test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/resource-model-selectors.test.tsx` passed (`3 passed` test files, `109 passed` tests).
  - Phase 3 sandbox `rtk npm test` hit the known `listen EPERM 127.0.0.1` blocker in `tests/scripts/demo-contracts.test.ts`.
  - The escalated host rerun passed (`35 passed | 2 skipped` test files, `329 passed | 21 skipped` tests).
- Phase 4 completed on 2026-04-23.
- Result:
  - The closeout audit confirmed that `README.md` and the current durable developer docs already matched the shipped workspace language and document-surface behavior, so they did not need churn edits.
  - `.ultrakit/notes.md` now states the current validation truth: broad `rtk npm test` can still fail inside the Codex sandbox on this host with `listen EPERM 127.0.0.1`, so final broad proof may require an escalated or host rerun.
  - The active-plan index now marks this plan `Ready for review`, and the plan itself is left archive-ready for the orchestrator's final comprehensive review rather than being archived early.
- Validation:
  - Phase 4 sandbox `rtk npm test` hit the known `listen EPERM 127.0.0.1` blocker in `tests/scripts/demo-contracts.test.ts`.
  - The escalated host rerun passed (`35 passed | 2 skipped` test files, `329 passed | 21 skipped` tests).
- Final whole-plan closeout pass completed on 2026-04-23.
- Result:
  - The last product-copy leaks are gone from the planning conversation empty state and the shared tool-decision surface; the UI no longer says `Cloudflare conversation`, `Waiting for approval`, or `Approval required`.
  - Shared document-surface coverage now includes real fenced code-block rendering on both the documentation route and the planning save/reopen path.
  - The shared `markdown-document-surface` now has direct tests for fenced code blocks plus both fail-closed branches when markdown deserialization rejects malformed input.
- Validation:
  - `rtk npm test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/resource-model-selectors.test.tsx` passed (`3 passed` test files, `109 passed` tests).
  - `rtk npm test -- ui/src/test/markdown-document-surface.test.tsx` passed (`1 passed` test file, `3 passed` tests).
  - Sandbox `rtk npm test` hit the known `listen EPERM 127.0.0.1` blocker in `tests/scripts/demo-contracts.test.ts`.
  - The escalated host rerun passed (`36 passed | 2 skipped` test files, `332 passed | 21 skipped` tests).

## Context and Orientation

This UI pass stays inside the existing React shell under `ui/`.

Key files and responsibilities:

- `design/workspace-spec.md`
  The authoritative product structure for the shell, run stepper, documentation, workstreams, and project configuration screens.
- `design/design-guidelines.md`
  The authoritative tone, navigation, and consistency rules for the UI shell and per-destination behavior.
- `.ultrakit/developer-docs/keystone-target-model-handoff.md`
  The current product-model boundary; specifically, avoid reintroducing approval/session/event concepts into shipped UI copy.
- `ui/src/shared/layout/shell-sidebar.tsx`
  Stable left-sidebar shell and destination framing.
- `ui/src/features/runs/components/runs-index-workspace.tsx`
  `Runs` index table and create-run button copy.
- `ui/src/features/runs/use-run-detail-view-model.ts`
  Run header view-model summary and meta text.
- `ui/src/features/runs/components/run-detail-scaffold.tsx`
  Run detail top rail and run-level meta copy.
- `ui/src/features/execution/components/task-detail-workspace.tsx`
  Task detail conversation + review split and the most visible execution copy.
- `ui/src/features/documentation/use-documentation-view-model.ts`
  Documentation page title and compatibility-state wording.
- `ui/src/features/workstreams/use-workstreams-view-model.ts`
  Workstreams page title and summary copy.
- `ui/src/features/workstreams/components/workstreams-board.tsx`
  Workstreams heading + table chrome.
- `ui/src/components/editor/markdown-document-surface.tsx`
  Shared Plate-first markdown editor/viewer surface that keeps markdown as the saved source of truth for planning and `Documentation`.
- `ui/src/components/ui/editor.tsx`
  Generated Plate UI editor shell that should replace direct `PlateContent` usage in product code.
- `ui/src/components/ui/editor-static.tsx`
  Generated Plate UI static renderer that should replace the custom read-only viewer path for persisted documents.
- `ui/src/components/editor/plugins/markdown-kit.tsx`
  Generated `MarkdownKit` source and the new baseline markdown plugin seam.
- `ui/src/components/editor/plugins/basic-nodes-kit.tsx`
- `ui/src/components/editor/plugins/code-block-kit.tsx`
- `ui/src/components/editor/plugins/link-kit.tsx`
- `ui/src/components/editor/plugins/list-classic-kit.tsx`
- `ui/src/components/editor/plugins/math-kit.tsx`
- `ui/src/components/editor/plugins/table-kit.tsx`
  Generated Plate UI feature kits that should be composed into the shared document/editor surface instead of maintaining a repo-owned plugin array.
- `ui/src/features/runs/use-run-planning-phase-view-model.ts`
  Planning edit-mode contract that now owns the shared markdown editor state and save boundary for each run planning document.
- `ui/src/features/projects/project-configuration-scaffold.ts`
  Project configuration default-tab behavior for `New project` vs `Project settings`.
- `ui/src/features/projects/project-settings-context.tsx`
  Project-settings mode title and per-destination framing.
- `ui/src/features/projects/components/project-configuration-shell.tsx`
  Project configuration shell summary and heading framing.
- `ui/src/features/runs/components/execution-plan-workspace.tsx`
  `Execution Plan` compile affordance placement inside the planning layout.
- `ui/src/features/documentation/components/documentation-workspace.tsx`
  Documentation destination shell that consumes the shared document surface.
- `ui/src/features/runs/components/planning-workspace.tsx`
  Planning-phase split layout that renders the assistant-ui conversation plus the shared Plate-backed markdown document surface.
- `ui/src/features/runs/run-detail-context.tsx`
  Loads raw markdown for planning docs and is the cleaner source side of the planning document pipeline.
- `ui/src/shared/markdown/source-markdown.ts`
  Existing shared markdown helper seam that may be the right home for shared markdown/document adapters.
- `ui/src/features/resource-model/selectors.ts`
  Documentation grouping logic that now locks scaffold documents to the canonical three groups by document kind.
- `ui/src/test/app-shell.test.tsx`
- `ui/src/test/destination-scaffolds.test.tsx`
- `ui/src/test/runs-routes.test.tsx`
- `ui/src/test/resource-model-selectors.test.tsx`
  Existing UI regression coverage that will need assertion updates for the aligned product copy.

Important product-model constraints for execution:

- Keep the shell stable and sidebar-driven.
- Preserve the four run phases: `Specification`, `Architecture`, `Execution Plan`, `Execution`.
- Preserve execution as DAG-first with task detail under `Runs > Execution`.
- Preserve documentation as project-scoped current knowledge, even if it still shows a compatibility state for live projects.
- Do not expose removed approval-gated or session-centric concepts as if they were product surfaces.

## Plan of Work

First, fix the shell-adjacent framing drift that is small in code surface but broad in product effect: canonical destination headings, `Project settings` entry behavior, and project-settings framing that currently repeats global project context inside the destination itself. Prefer the cleanest UI/layout refactor, including route changes if that better matches the workspace spec.

Second, fix the run-flow drift that affects behavior as well as wording: live run summary/stage presentation, the default landing behavior for `/runs/:runId`, and the shared planning-layout promise that `Execution Plan` currently breaks with a separate compile follow-up block. If the cleanest solution requires reshaping routes, frontend view models, or presentation logic, do that, but keep APIs stable.

Third, fix the documentation and planning document-surface drift by standardizing on a basic shared Plate-first component built around `MarkdownKit` and removing the current custom low-level markdown rendering path. This phase should also lock project documentation into the three canonical groups from the workspace spec and rewrite the compatibility copy so it stays honest without leaking scaffold-internal jargon.

Finally, evaluate whether any durable repo docs or notes now misdescribe the UI surface after the implementation passes. If they do, update them in the same closeout phase; if they do not, record that determination in the plan and archive cleanly.

## Concrete Steps

Run from repo root `/home/chanzo/.codex/worktrees/cc75/keystone-cloudflare` unless noted otherwise.

```bash
npm install
npm test
npm run lint
npm run typecheck
npm run build
```

Implementation / verification commands expected during execution:

```bash
npm test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx ui/src/test/runs-routes.test.tsx
npm test
```

Optional broad checks after the UI pass if time permits:

```bash
npm run lint
npm run typecheck
npm run build
```

Expected interpretation:

- targeted UI tests and broad `npm test` should pass,
- `npm run lint` and `npm run typecheck` are currently pre-existing red baselines unless unrelated issues were fixed elsewhere,
- `npm run build` may still fail after the Vite build completes because Wrangler needs host-writable paths and Docker access.

## Validation and Acceptance

Acceptance is met when all of the following are true:

- `Runs`, `Documentation`, `Workstreams`, and task detail use the canonical workspace-spec language instead of machine-heavy workflow / approval / transport copy.
- The `Runs` index no longer uses raw workflow and engine identifiers as the primary live-row summary text.
- The run detail header no longer foregrounds raw workflow identifiers.
- Task detail no longer claims that approvals are part of the user-facing conversation model.
- Destination headings for `Documentation` and `Workstreams` match the canonical destination labels from the workspace spec.
- `Project settings` behaves like the same configuration surface as `New project`, including shared tabbed entry expectations and less repeated project-context framing.
- Planning and documentation document panes use a shared Plate-first document surface built around `MarkdownKit` rather than bespoke rendering logic around `PlateContent`.
- Documentation groups are limited to `Product Specifications`, `Technical Architecture`, and `Miscellaneous Notes`.
- The `Execution Plan` screen honors the shared planning-layout rule or otherwise exposes compile controls without breaking the documented left/right planning structure.
- The affected UI tests are updated and pass.
- Broad `npm test` still passes.

Known non-blocking baseline caveats:

- Broad `lint` is red before this work for unrelated files.
- Broad `typecheck` is red before this work for unrelated and pre-existing UI/test issues.
- Broad `build` is blocked by sandboxed Wrangler / Docker filesystem limitations after the frontend build step.

## Idempotence and Recovery

This plan is safe to retry because it is limited to UI copy, view-model framing, and related tests. If a pass is interrupted:

- re-read the design docs and the files listed in `Context and Orientation`,
- inspect the current diff in the UI files listed under the active phase,
- rerun the targeted UI tests before making more edits,
- update `Progress`, `Execution Log`, `Surprises & Discoveries`, and the active phase handoff before handing the work to another contributor.

No data migrations, route renames, or destructive operations are part of this plan.

## Dependencies and Reuse

The Plate UI registry install has already added the source components and dependencies needed for this pass. Reuse the existing React route/view-model structure, shared workspace components, generated Plate UI source under `ui/src/components/`, and current test harnesses. This pass should not introduce another UI data abstraction or a parallel copy system. For Plate work, prefer the generated local source components, use `MarkdownKit` as the baseline, keep the implementation basic, and avoid speculative MDX feature work that is not required by the current product surfaces.

## Phase 1 - Align destination and project-configuration framing

### Phase Handoff

Goal:
Bring the top-level destination and project-configuration framing back in line with the workspace spec using the cleanest UI implementation while keeping APIs stable.

Scope Boundary:
In scope:
- canonical destination headings for `Documentation` and `Workstreams`,
- `Project settings` entry behavior and in-page framing,
- reducing repeated project-context language inside project configuration surfaces where the global shell already owns that context,
- related UI test assertion updates.

Out of scope:
- run/execution behavior changes,
- documentation grouping logic,
- unrelated lint / typecheck cleanup.

Read First:
- `design/workspace-spec.md`
- `design/design-guidelines.md`
- `.ultrakit/developer-docs/keystone-target-model-handoff.md`
- `ui/src/shared/layout/shell-sidebar.tsx`
- `ui/src/features/documentation/use-documentation-view-model.ts`
- `ui/src/features/workstreams/use-workstreams-view-model.ts`
- `ui/src/features/workstreams/components/workstreams-board.tsx`
- `ui/src/features/projects/project-configuration-scaffold.ts`
- `ui/src/features/projects/project-settings-context.tsx`
- `ui/src/features/projects/components/project-configuration-shell.tsx`
- `ui/src/test/app-shell.test.tsx`
- `ui/src/test/destination-scaffolds.test.tsx`

Files Expected To Change:
- `ui/src/features/documentation/use-documentation-view-model.ts`
- `ui/src/features/workstreams/use-workstreams-view-model.ts`
- `ui/src/features/workstreams/components/workstreams-board.tsx`
- `ui/src/features/projects/project-configuration-scaffold.ts`
- `ui/src/features/projects/project-settings-context.tsx`
- `ui/src/features/projects/components/project-configuration-shell.tsx`
- `ui/src/test/app-shell.test.tsx`
- `ui/src/test/destination-scaffolds.test.tsx`
- `.ultrakit/exec-plans/active/keystone-ui-workspace-spec-realignment.md`

Validation:
- Run `npm test -- ui/src/test/app-shell.test.tsx ui/src/test/destination-scaffolds.test.tsx`.
- Run `npm test`.
- Success means the targeted UI suite and the broad test suite pass without introducing new failures.

Plan / Docs To Update:
- Update `Execution Log`, `Progress`, `Surprises & Discoveries`, and this phase handoff in the active plan.
- Update `Outcomes & Retrospective` with the Phase 1 result when closing the phase.

Deliverables:
- UI framing alignment across top-level destinations and project configuration.
- Updated route / shell tests that enforce the aligned language.
- Validation evidence for targeted UI tests and broad `npm test`.

Commit Expectation:
- `Align destination and project settings framing`

Known Constraints / Baseline Failures:
- Do not change backend contracts in this phase.
- `npm run lint` is currently red before this work for unrelated files.
- `npm run typecheck` is currently red before this work for unrelated files.
- `npm run build` is currently blocked by sandbox Wrangler / Docker filesystem constraints after the Vite build finishes.

Status:
- Completed

Completion Notes:
- Completed on 2026-04-22.
- `Documentation` and `Workstreams` now render the canonical destination headings from the workspace spec.
- `/settings` now redirects to `/settings/overview`, and `Project settings` keeps a stable title instead of repeating the selected project name.
- `New project` and `Project settings` shell summaries now frame the same tabbed configuration surface with direct create/save semantics.
- The targeted fix pass removed the remaining selected-project wording from `Project settings` loading/components copy, the overview description helper text, and the visible `Workstreams` summary / guidance strings.
- Updated shell/destination tests for the aligned copy and routing; additionally hardened `ui/src/test/runs-routes.test.tsx` after host broad validation exposed a transient compile-button assertion.

Next Starter Context:
- Phase 2 can assume canonical destination naming and overview-first project settings routing are in place.
- Shell-owned project framing is now in place for the Phase 1 surfaces (`Documentation`, `Workstreams`, and `Project settings`), but `Runs` still carries selected-project framing that Phase 2 should remove as part of the run/workspace cleanup.
- Next focus: realign the `Runs` index summary/stage presentation, the default landing behavior for `/runs/:runId`, execution/task-detail copy, and the `Execution Plan` layout without changing backend contracts.

## Phase 2 - Realign run and execution flow behavior

### Phase Handoff

Goal:
Bring the `Runs` index, run landing behavior, and execution-facing copy/layout back in line with the workspace spec using the cleanest frontend implementation while keeping APIs unchanged.

Scope Boundary:
In scope:
- live run summary / stage presentation in the `Runs` index,
- run header meta copy,
- task-detail conversation framing,
- default landing behavior for `/runs/:runId`,
- `Execution Plan` layout so it still reads as the shared planning workspace.

Out of scope:
- backend API expansion,
- documentation grouping logic,
- unrelated execution engine behavior changes.

Read First:
- `design/workspace-spec.md`
- `design/design-guidelines.md`
- `.ultrakit/developer-docs/keystone-target-model-handoff.md`
- `ui/src/features/runs/components/runs-index-workspace.tsx`
- `ui/src/features/runs/use-runs-index-view-model.ts`
- `ui/src/features/runs/use-run-detail-view-model.ts`
- `ui/src/features/runs/components/run-detail-scaffold.tsx`
- `ui/src/features/runs/components/planning-workspace.tsx`
- `ui/src/features/runs/components/execution-plan-workspace.tsx`
- `ui/src/features/execution/components/task-detail-workspace.tsx`
- `ui/src/test/app-shell.test.tsx`
- `ui/src/test/runs-routes.test.tsx`

Files Expected To Change:
- `ui/src/features/runs/components/runs-index-workspace.tsx`
- `ui/src/features/runs/use-runs-index-view-model.ts`
- `ui/src/features/runs/use-run-detail-view-model.ts`
- `ui/src/features/runs/components/run-detail-scaffold.tsx`
- `ui/src/features/runs/components/planning-workspace.tsx`
- `ui/src/features/runs/components/execution-plan-workspace.tsx`
- `ui/src/features/execution/components/task-detail-workspace.tsx`
- `ui/src/test/app-shell.test.tsx`
- `ui/src/test/runs-routes.test.tsx`
- `.ultrakit/exec-plans/active/keystone-ui-workspace-spec-realignment.md`

Validation:
- Run `npm test -- ui/src/test/app-shell.test.tsx ui/src/test/runs-routes.test.tsx`.
- Run `npm test`.
- Success means the targeted run/execution suite and the broad test suite pass without introducing new failures.

Plan / Docs To Update:
- Update `Execution Log`, `Progress`, `Surprises & Discoveries`, and this phase handoff in the active plan.
- Update `Outcomes & Retrospective` with the Phase 2 result when closing the phase.

Deliverables:
- Runs/execution UI behavior and copy aligned to the documented product model.
- Updated route tests that enforce the corrected run/execution behavior and language.
- Validation evidence for targeted tests and broad `npm test`.

Commit Expectation:
- `Realign run and execution workspace flow`

Known Constraints / Baseline Failures:
- Keep API contracts stable in this phase.
- Broad lint / typecheck remain pre-existing red baselines.
- Broad build remains blocked by sandbox Wrangler / Docker constraints.

Status:
- Completed

Completion Notes:
- Completed on 2026-04-22.
- Targeted fix pass completed on 2026-04-23.
- Live run rows now summarize planning/execution state in product language, and live/scaffold index rows deep-link to the stage they display while keeping canonical run-step nouns in the stage column.
- The bare `/runs/:runId` route now lands on `Specification` for a stable run-entry experience across compiled, uncompiled, and materializing runs, and the redirect no longer hides that behavior behind a misleading default-phase hook.
- Run header meta no longer foregrounds workflow ids or engine metadata, and task detail copy now describes conversation plus code review without approval framing.
- `Execution Plan` compile controls now sit inside the shared planning document pane, keeping the planning split layout intact.
- Updated `app-shell`, `runs-routes`, and the directly affected task-detail scaffold assertion for the new route/copy contract across the Phase 2 implementation and fix pass; also added explicit coverage for live-run summary branches, the run-header activity line, and the `Code review` rail heading.

Next Starter Context:
- Phase 3 can assume the run/execution shell contract is now stable: canonical run-stage labels in `Runs`, stage-matched run-index deep links, bare `/runs/:runId -> /specification` landing, workflow metadata removed from the run header, and task detail framed as conversation plus code review.
- Next focus: replace the remaining repo-owned Plate wrapper / textarea planning seams, move planning/document panes onto the installed Plate UI primitives, and lock `Documentation` to the three canonical project-level groups from the workspace spec.

## Phase 3 - Standardize Plate document surfaces and realign documentation model

### Phase Handoff

Goal:
Standardize planning/documentation document panes by deleting the current repo-owned Plate wrapper path and rebuilding those surfaces on the installed Plate UI editor/static shells plus `MarkdownKit`, lock the Documentation surface to the canonical project-level category model from the workspace spec, and remove implementation-jargon framing from the user-facing documentation experience.

Scope Boundary:
In scope:
- deleting `ui/src/components/editor/plate-markdown-document.tsx` and replacing it with Plate UI's generated editor/static components,
- removing the repo-owned plugin array in `ui/src/components/editor/plate-markdown-document.tsx` in favor of the generated Plate UI kit files,
- planning/documentation document rendering and preview integration,
- replacing the planning `textarea + Plate preview` split with a Plate editor while keeping markdown as the save/load boundary,
- composing the generated Plate kits that match the current markdown surface: `basic-nodes-kit`, `code-block-kit`, `link-kit`, `list-classic-kit`, `math-kit`, `table-kit`, and `markdown-kit`,
- documentation grouping logic,
- documentation compatibility-state copy,
- any tests that currently assert path-derived or scaffold-jargon behavior,
- preserving the current accessible region labels and semantic roles that the explorer audit identified as the renderer contract.

Out of scope:
- live documentation backend work,
- adding mention, column, or other MDX-specific features that are not already backed by installed Plate packages in this repo,
- broader shell or run-flow work already covered by earlier phases.

Read First:
- `design/workspace-spec.md`
- `design/design-guidelines.md`
- the Plate markdown docs and `MarkdownKit` guidance provided in the current thread
- `ui/src/components/editor/plate-markdown-document.tsx`
- `ui/src/components/ui/editor.tsx`
- `ui/src/components/ui/editor-static.tsx`
- `ui/src/components/editor/plugins/markdown-kit.tsx`
- `ui/src/components/editor/plugins/basic-nodes-kit.tsx`
- `ui/src/components/editor/plugins/code-block-kit.tsx`
- `ui/src/components/editor/plugins/link-kit.tsx`
- `ui/src/components/editor/plugins/list-classic-kit.tsx`
- `ui/src/components/editor/plugins/math-kit.tsx`
- `ui/src/components/editor/plugins/table-kit.tsx`
- `ui/src/features/runs/components/planning-workspace.tsx`
- `ui/src/features/runs/use-run-planning-phase-view-model.ts`
- `ui/src/features/runs/run-detail-context.tsx`
- `ui/src/shared/markdown/source-markdown.ts`
- `ui/src/features/resource-model/selectors.ts`
- `ui/src/features/documentation/use-documentation-view-model.ts`
- `ui/src/features/documentation/components/documentation-workspace.tsx`
- `ui/src/test/destination-scaffolds.test.tsx`
- `ui/src/test/runs-routes.test.tsx`
- `ui/src/test/resource-model-selectors.test.tsx`

Files Expected To Change:
- `ui/src/components/editor/plate-markdown-document.tsx`
- `ui/src/components/editor/plugins/markdown-kit.tsx`
- `ui/src/components/ui/editor.tsx`
- `ui/src/components/ui/editor-static.tsx`
- `ui/src/features/runs/components/planning-workspace.tsx`
- `ui/src/features/runs/use-run-planning-phase-view-model.ts`
- `ui/src/features/documentation/use-documentation-view-model.ts`
- `ui/src/features/documentation/components/documentation-workspace.tsx`
- `ui/src/shared/markdown/source-markdown.ts`
- `ui/src/features/resource-model/selectors.ts`
- `ui/src/test/destination-scaffolds.test.tsx`
- `ui/src/test/runs-routes.test.tsx`
- `ui/src/test/resource-model-selectors.test.tsx`
- `.ultrakit/exec-plans/active/keystone-ui-workspace-spec-realignment.md`

Validation:
- Run `npm test -- ui/src/test/destination-scaffolds.test.tsx ui/src/test/runs-routes.test.tsx ui/src/test/resource-model-selectors.test.tsx`.
- Run `npm test`.
- Success means the targeted documentation suite and the broad test suite pass without introducing new failures.

Plan / Docs To Update:
- Update `Execution Log`, `Progress`, `Surprises & Discoveries`, and this phase handoff in the active plan.
- Update `Outcomes & Retrospective` with the Phase 3 result when closing the phase.

Deliverables:
- Current repo-owned Plate wrapper path deleted and replaced with Plate UI's generated `Editor`, `EditorContainer`, `EditorStatic`, and `MarkdownKit` path.
- Shared basic Plate-first document surface built around the installed Plate UI editor/static shells and `MarkdownKit` adopted by planning/documentation panes.
- Repo-owned Plate plugin assembly and direct `PlateContent` wrapper logic removed rather than preserved as a compatibility layer.
- Planning editing moves from `textarea + preview` to a real Plate editor while markdown remains the serialized save/load boundary.
- Shared document surface preserves:
  - native table / column-header semantics,
  - list-item semantics,
  - blockquote semantics,
  - labeled document / preview regions used by current route tests.
- Documentation grouping fixed to the canonical category set.
- Documentation compatibility state rewritten in product-facing language.
- Updated tests reflecting the corrected documentation model and Plate surface usage expectations.

Commit Expectation:
- `Standardize Plate document surfaces`

Known Constraints / Baseline Failures:
- Documentation remains scaffold-backed for non-scaffold live projects.
- Broad lint / typecheck remain pre-existing red baselines.
- Broad build remains subject to the sandbox Wrangler / Docker caveat.

Status:
- Completed

Completion Notes:
- Completed on 2026-04-23.
- Targeted fix pass completed on 2026-04-23.
- Deleted `ui/src/components/editor/plate-markdown-document.tsx` in favor of a shared `markdown-document-surface` built on generated Plate UI editor/static shells and the installed markdown/basic/code/link/list/math/table kits.
- Planning now edits the execution-plan document in Plate while keeping markdown as the persisted source of truth.
- Documentation grouping now maps resources into the canonical three workspace-spec categories, uses product-facing compatibility copy, and the selector coverage now fails if a fourth group appears.
- The shared markdown surface now treats parse failures as a read-only raw-source fallback instead of a lossy paragraph coercion, and the planning editor disables body/title input while saves are in flight.
- Targeted Phase 3 validation passed, sandbox broad validation hit the known localhost bind restriction again, and the escalated host rerun passed.

Next Starter Context:
- Phase 3 review findings are closed; Phase 4 should stay focused on documentation and closeout truth rather than reopening the document-surface or run-flow code.
- Next closeout should update any affected developer docs, run the final validation required by the plan, and archive the execution plan once the shipped documentation-surface/model behavior is reflected in durable docs.

## Phase 4 - Documentation and closeout truth

### Phase Handoff

Goal:
Close the alignment pass by updating any durable docs or notes that became inaccurate, re-running final validation, and preparing the plan for archive.

Scope Boundary:
In scope:
- evaluate README / notes impact from Phase 1,
- update any durable docs that became inaccurate because of the shipped UI wording changes,
- final plan closeout and archive readiness.

Out of scope:
- new product work,
- unrelated README cleanup,
- unrelated note churn.

Read First:
- `README.md`
- `.ultrakit/notes.md`
- `.ultrakit/exec-plans/active/keystone-ui-workspace-spec-realignment.md`
- any files changed in Phases 1-3

Files Expected To Change:
- `.ultrakit/exec-plans/active/keystone-ui-workspace-spec-realignment.md`
- `.ultrakit/notes.md`
- `README.md`

Validation:
- Run `npm test`.
- If a touched doc references a changed UI label, confirm the final wording matches the shipped UI.

Plan / Docs To Update:
- Update `Execution Log`, `Progress`, `Outcomes & Retrospective`, and the Phase 4 handoff state.
- Update `.ultrakit/notes.md` only if the execution work surfaces durable project knowledge that future contributors would need.

Deliverables:
- Any necessary doc / notes updates, or an explicit record that none were needed.
- Final validation evidence and archive-ready plan state.

Commit Expectation:
- `Close out workspace spec alignment`

Known Constraints / Baseline Failures:
- Broad lint / typecheck remain pre-existing red baselines unless fixed separately.
- Broad build remains subject to the sandbox Wrangler / Docker caveat.

Status:
- Completed

Completion Notes:
- Completed on 2026-04-23.
- Audited `README.md` and the current durable developer docs against the shipped UI surfaces; they already matched the canonical destination naming, Plate-backed document behavior, assistant-ui conversation surfaces, and scaffold-backed `Documentation` boundary, so no README or developer-doc edits were needed.
- Updated `.ultrakit/notes.md` to reflect the current validation caveat that broad `rtk npm test` can still fail inside the Codex sandbox on this host with `listen EPERM 127.0.0.1`; the required escalated rerun passed (`35 passed | 2 skipped` test files, `329 passed | 21 skipped` tests).
- Updated `.ultrakit/exec-plans/active/index.md` to mark the plan `Ready for review` and left archive bookkeeping for the final comprehensive review / archive pass.
- The final whole-plan closeout pass removed the remaining Cloudflare/approval phrasing from shipped planning/conversation copy and added the missing shared document-surface coverage for fenced code blocks plus fail-closed malformed-markdown behavior.
- Closeout validation was refreshed after that pass: the required targeted route suite passed, the direct shared-surface suite passed, sandbox `rtk npm test` hit the known `listen EPERM 127.0.0.1` restriction again, and the escalated rerun passed (`36 passed | 2 skipped` test files, `332 passed | 21 skipped` tests).

Next Starter Context:
- The plan is ready for the orchestrator's final comprehensive review. Do not archive it yet.
- Closeout truth is now explicit: README and the durable developer docs stayed accurate, and the final closeout pass only needed shipped-copy cleanup plus shared-surface coverage additions in UI/tests.
- If the final review re-runs `rtk npm test` in the sandbox and sees `listen EPERM 127.0.0.1` from `tests/scripts/demo-contracts.test.ts`, treat that as the known environment caveat and rely on the escalated broad-suite proof unless product-facing failures also appear.
