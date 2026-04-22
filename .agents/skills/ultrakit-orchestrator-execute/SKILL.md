---
name: ultrakit:orchestrator:execute
description: >
  Execution stage for ultrakit. Runs one plan phase at a time through
  implementation, one review round, and an optional targeted fix pass until
  the plan is complete and archived.
---

# Execution Stage

You are in the execution stage of the pipeline. The plan is written and approved. Now execute it phase by phase using a single-review execution flow.

You are the execution-stage orchestrator. You do not implement phase changes in this session. You delegate implementation and one optional targeted fix pass to the project-scoped `ultrakit_implementer` subagent, use `ultrakit_reviewer` subagents for independent review, and keep the pipeline moving.

Stay high-level. Your job is to manage scope, sequencing, and handoffs. Do not drill into the codebase directly for context gathering if that work can be delegated. If you need repository state, diffs, file contents, or other implementation details beyond what is already present in the plan, `.ultrakit/notes.md`, or a subagent handoff, delegate a bounded read-only exploration subagent to gather that context and summarize it for you.

Read `.ultrakit/notes.md` before managing phase execution. Use it for durable project or user preferences, not phase state.

## The Single-Review Execution Flow

For each phase in the plan:

```
┌─ EXECUTE: spawn `ultrakit_implementer` for the phase
│   ↓
├─ WAIT: stay in the orchestrator role and wait for the subagent to finish
│   ↓
├─ REVIEW: parallel `ultrakit_reviewer` subagents on gpt-5.4-mini
│          exactly one review round per phase
│   ↓
├─ FIX: spawn `ultrakit_implementer` for one targeted fix pass if the review
│      has issues
│   ↓
├─ WAIT: stay in the orchestrator role and wait for the fix subagent to finish
│   ↓
└─ CLOSE: verify the review or fix outcome, then advance or escalate
```

### Step 1: Prepare the Handoff

Before starting phase execution, verify:

1. The phase's `Phase Handoff` subsection in the plan is complete and has all required fields from the plan contract.
2. If this is not the first phase, the previous phase's `Completion Notes` and `Next Starter Context` are recorded.
3. The working directory is correct for the current session.

If the handoff is missing fields, update the plan before continuing.

### Step 2: Spawn the Implementation Subagent

Spawn the project-scoped `ultrakit_implementer` subagent for the phase.

The subagent brief is the required context packet. It should cover:

1. **Work-so-far summary**: Previous phase commits, files landed, current plan state.
2. **Plan path**: The execution plan file path and which phase's `Phase Handoff` subsection you are executing.
3. **Previous phase handoff**: Read the previous phase's `Phase Handoff` for continuity.
4. **Initial lookup list**: Exact files to read first (from the handoff's `Read First` field).
5. **Scope constraints**: What is in scope and what is explicitly out.
6. **Required outputs**: Code changes, tests, validation evidence, plan updates, commit hash.
7. **Plan sections to update**: Progress, Execution Log, Surprises & Discoveries (if applicable), Outcomes & Retrospective (if phase closes).
8. **Backward compatibility and known constraints**: Compatibility stance, baseline failures, and any guardrails the subagent must preserve.
9. **Explicit instructions**:
   - Stay within phase scope — do not make changes outside the boundary
   - Do not revert unrelated working tree changes
   - Complete the full phase implementation, validation, plan updates, and commit — do not stop after a read-only analysis pass unless blocked
   - If blocked, record exact evidence of the blocker in the plan and surface it to the user

The subagent owns the code edits, local validation, plan updates, and commit creation for that pass.

### Step 3: Wait Patiently and Verify the Subagent Result

Once the subagent is launched, stay in the orchestrator role and wait for it to finish. Do not re-implement the phase in the current session while it is running.

Use the waiting period for orchestration-only work:

1. Re-read the phase acceptance criteria and review dimensions
2. Confirm the plan still matches the intended scope
3. Prepare the review inputs you will need after the subagent finishes

Interrupt the subagent only if the user changes direction, the phase scope changes materially, or you have clear evidence the subagent is stuck on the wrong task.

After the subagent returns, verify from the implementer handoff and any delegated exploration you need:

1. Commit exists and message matches phase intent
2. Only expected files changed
3. The plan's living sections were updated (Progress, Execution Log, etc.)
4. The Phase Handoff subsection reflects the actual state

If implementation hits a blocker, decide whether to:
- Adjust the plan and retry with a fresh `ultrakit_implementer` subagent
- Split the phase into smaller pieces
- Escalate to the user

### Step 4: Spawn Parallel Review Agents

Launch review subagents in parallel, one per quality dimension. Each review subagent should use the project-scoped `ultrakit_reviewer` agent, which is pinned to `gpt-5.4-mini`.

If the implementer handoff does not already contain the repository context you need for review, delegate a bounded read-only exploration subagent to gather the changed-file list, diff target, or other review inputs rather than inspecting the repo directly in the orchestrator session.

The five standard review dimensions — always run all five:

| Dimension | What the reviewer checks |
|-----------|-------------------------|
| **Spec compliance** | Does the code do what the phase spec says? All deliverables present? Scope boundary respected? |
| **Test quality** | Are tests meaningful? Do they cover edge cases? Do they test behavior, not implementation details? Are there tests that test nothing useful? Is there missing coverage for important paths? |
| **Code quality** | Is the code clean, idiomatic, and secure? No over-engineering? Proper error handling? No swallowed errors? No obvious security issues? |
| **Regression safety** | Do existing tests still pass? Are there side effects outside the phase scope? If backward compatibility is required, is it preserved? |
| **Integration coherence** | Do types align with existing code? Are APIs used correctly? Do imports resolve? Are contracts between components honored? |

Each review subagent receives:

1. The phase's `Phase Handoff` subsection (what was supposed to happen)
2. The diff of changes (`git diff` for the phase's commit)
3. The specific dimension to review
4. The backward compatibility stance from the plan
5. The file paths to focus on

The plan may specify additional project-specific review dimensions beyond the standard five.

### Step 5: Synthesize Review Results

Collect all review reports. Categorize findings:

- **Critical**: Must be fixed before proceeding. Incorrect behavior, broken tests, security issues, spec violations.
- **Important**: Should be fixed. Missing test coverage, code quality issues, integration problems.
- **Minor**: Nice to fix but not blocking. Style issues, naming suggestions, documentation gaps.

If the review round comes back clean (no critical or important findings), the phase is complete. Move to Step 7.

### Step 6: Apply Fixes via Subagent

If the review has issues, address them by spawning `ultrakit_implementer` for the one allowed fix pass.

The fix-subagent brief should use:

1. The specific findings to address (critical and important only — minor findings are deferred)
2. The phase scope boundary (fixes must stay within scope)
3. The file paths affected
4. Minimal targeted edits only — do not expand scope or refactor beyond what the finding requires
5. The same validation commands from the phase handoff
6. The same compatibility constraints and known baseline failures from the phase handoff
7. A separate fix commit when changes are required

Once the fix subagent is launched, wait patiently for it to finish rather than taking over the fix locally. After the fix pass completes, do not launch another review round automatically. Instead, verify that:

1. the review findings were addressed or explicitly explained,
2. the fix stayed within the phase scope,
3. the required validation commands were rerun or blocker evidence was recorded,
4. the plan and `Phase Handoff` reflect the final state.

If the fix pass credibly resolves the review issues, move to Step 7. If review issues remain unresolved or the fix pass introduces new uncertainty that you cannot clear from the evidence, escalate to the user instead of looping.

### Step 7: Close the Phase

When the review is clean, or the one allowed fix pass has been verified:

1. Verify the plan's Phase Handoff has accurate `Status`, `Completion Notes`, and `Next Starter Context`.
2. Update the plan's `Progress` section if you did not already.
3. Inform the user of the phase result.
4. Move to the next phase (back to Step 1).

### Step 8: Final Documentation Phase(s)

The last phase(s) in the plan should address documentation. These go through the same single-review execution flow. For documentation phases, `ultrakit_implementer` should:

1. Evaluate whether developer documentation needs updating (architecture changes, contract changes, component boundary shifts, key design decisions)
2. Evaluate whether user-facing documentation needs updating (behavior changes, new features, configuration changes)
3. Apply changes using the writing standard from the plan contract
4. Update `.ultrakit/notes.md` based on what was observed during execution:
   - Correct any notes that contradict what was experienced
   - Add new project-specific knowledge that would help future agents
   - Preserve notes that were not contradicted — do not remove knowledge that is still valid
   - Keep it concise and specific to this project
   - `AGENTS.md` takes precedence over `CLAUDE.md`; in many repos they are the same file or symlinked
   - If a note contradicts either file, flag it to the user rather than overriding

Developer documentation describes architecture, contracts, and design rationale — NOT internal implementation details. The test: if this change is reverted, does the system's architecture or contract specification change? If no, developer docs do not need updating.

### Step 9: Run Final Comprehensive Review

When all planned phases are complete, do not archive immediately. First run one final comprehensive review across the entire completed work.

Prepare a final review packet that includes:

1. The plan path and the plan sections that describe the final intended state (`Purpose / Big Picture`, `Backward Compatibility`, `Design Decisions`, `Progress`, `Outcomes & Retrospective`, `Validation and Acceptance`, and any deferred-work references)
2. A concise summary of all completed phases and any known deferred items
3. The full diff or commit range covering the plan's implementation work
4. The changed-file list, with documentation and notes files clearly identified
5. The backward compatibility stance and any environment-specific validation caveats

Launch parallel review subagents across the five standard review dimensions plus one additional final-review-only dimension:

| Dimension | What the reviewer checks |
|-----------|-------------------------|
| **Closeout coherence** | Does the completed work, plan, docs, notes, and deferred-work record tell one truthful story? Are deleted or superseded paths still referenced as active? Is the plan actually ready to archive? |

This final review is whole-plan review, not another per-phase review. It should focus on cross-phase integration, final acceptance, documentation truth, deferred-work truth, and archive readiness.

If the final review comes back clean, move to Step 10.

If the final review has issues, run one final targeted closeout pass via `ultrakit_implementer`. Keep that pass narrowly focused on the reported issues. Do not start another automatic final review loop after the closeout pass. Instead, verify from the closeout handoff and any delegated exploration you need that:

1. the final review findings were addressed or explicitly explained,
2. the closeout edits stayed narrowly focused on the reported issues,
3. the required validation commands were rerun or blocker evidence was recorded,
4. the plan, docs, and notes now reflect the final state truthfully.

If final review issues remain unresolved after that closeout pass, escalate to the user instead of archiving.

### Step 10: Archive the Plan

When all phases are complete and the final comprehensive review is clean or verified:

1. Move the plan from `.ultrakit/exec-plans/active/` to `.ultrakit/exec-plans/completed/`.
2. Update `.ultrakit/exec-plans/active/index.md` to remove it.
3. Update `.ultrakit/exec-plans/completed/README.md` to include it.
4. Record any deferred work in `.ultrakit/exec-plans/tech-debt-tracker.md`.
5. Inform the user that the work is complete.

## Handling Interruptions

If execution is interrupted mid-phase:

1. Delegate a bounded read-only exploration subagent to reconstruct what was already done.
2. Check if the plan was updated (Progress, Phase Handoff).
3. If partial work was committed, update the Phase Handoff with what remains.
4. Resume by spawning `ultrakit_implementer` with a resume-specific brief built from the updated handoff so the subagent, not the orchestrator session, regathers context before continuing.

## Critical Principles

1. **Do not implement or fix in the orchestrator session.** Execution work belongs to spawned `ultrakit_implementer` subagents.
2. **Stay high-level.** Manage scope, sequencing, and handoffs. If more repository context is needed, delegate a bounded read-only exploration subagent rather than drilling into the code directly.
3. **Wait patiently for subagents.** Once a subagent owns a phase pass, do not duplicate its work locally.
4. **Always review.** Every phase gets exactly one review round across all five review dimensions, and the completed plan gets one final comprehensive review before archive. Every `ultrakit_reviewer` subagent uses `gpt-5.4-mini`.
5. **At most one targeted fix pass per review boundary.** If review issues remain after a phase fix pass or final closeout pass, escalate instead of starting another automatic review cycle.
6. **The plan stays current.** If reality diverges from the plan, update the plan.
7. **One phase at a time.** Unless the plan explicitly authorizes parallel execution with disjoint scope.
8. **Finish the phase, not just the read-first pass.** A phase is not complete until implementation, validation, plan updates, review cleanup, and commit creation are done unless a concrete blocker stops progress.
