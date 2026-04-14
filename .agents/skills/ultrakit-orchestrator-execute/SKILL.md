---
name: ultrakit:orchestrator:execute
description: >
  Execution stage for ultrakit. Runs one plan phase at a time through the
  execute-review-fix loop until the plan is complete and archived.
---

# Execution Stage

You are in the execution stage of the pipeline. The plan is written and approved. Now execute it phase by phase using the execute-review-fix loop.

You are the execution-stage operator. You implement phase changes and apply fix passes in the current session, use review subagents for independent review, and keep the pipeline moving.

Read `.ultrakit/notes.md` before managing phase execution. Use it for durable project or user preferences, not phase state.

## The Execute-Review-Fix Loop

For each phase in the plan:

```
┌─ EXECUTE: implement the phase in the current session
│   ↓
├─ REVIEW: parallel review agents on gpt-5.4-mini
│   ↓
├─ FIX: apply review findings in the current session (if any)
│   ↓
└─ Loop REVIEW → FIX until reviews come back clean
```

### Step 1: Prepare the Handoff

Before implementing the phase, verify:

1. The phase's `Phase Handoff` subsection in the plan is complete and has all required fields from the plan contract.
2. If this is not the first phase, the previous phase's `Completion Notes` and `Next Starter Context` are recorded.
3. The working directory is correct for the current session.

If the handoff is missing fields, update the plan before continuing.

### Step 2: Implement the Phase Locally

Do the implementation work yourself in this session rather than spawning an implementation subagent.

Make sure your implementation pass covers:

1. **Work-so-far summary**: Previous phase commits, files landed, current plan state.
2. **Plan path**: The execution plan file path and which phase's `Phase Handoff` subsection you are executing.
3. **Previous phase handoff**: Read the previous phase's `Phase Handoff` for continuity.
4. **Initial lookup list**: Exact files to read first (from the handoff's `Read First` field).
5. **Scope constraints**: What is in scope and what is explicitly out.
6. **Required outputs**: Code changes, tests, validation evidence, plan updates, commit hash.
7. **Plan sections to update**: Progress, Execution Log, Surprises & Discoveries (if applicable), Outcomes & Retrospective (if phase closes).
8. **Explicit instructions**:
   - Stay within phase scope — do not make changes outside the boundary
   - Do not revert unrelated working tree changes
   - Complete the full phase implementation, validation, plan updates, and commit — do not stop after a read-only analysis pass unless blocked
   - If blocked, record exact evidence of the blocker in the plan and surface it to the user

### Step 3: Verify Implementation

After your implementation pass, verify locally:

1. Commit exists and message matches phase intent
2. Only expected files changed (`git diff --name-only`)
3. The plan's living sections were updated (Progress, Execution Log, etc.)
4. The Phase Handoff subsection reflects the actual state

If implementation hits a blocker, decide whether to:
- Adjust the plan and retry in the current session
- Split the phase into smaller pieces
- Escalate to the user

### Step 4: Spawn Parallel Review Agents

Launch review agents in parallel, one per quality dimension. Each review agent should use the `ultrakit:worker:review` skill and the `gpt-5.4-mini` model.

The five standard review dimensions — always run all five:

| Dimension | What the reviewer checks |
|-----------|-------------------------|
| **Spec compliance** | Does the code do what the phase spec says? All deliverables present? Scope boundary respected? |
| **Test quality** | Are tests meaningful? Do they cover edge cases? Do they test behavior, not implementation details? Are there tests that test nothing useful? Is there missing coverage for important paths? |
| **Code quality** | Is the code clean, idiomatic, and secure? No over-engineering? Proper error handling? No swallowed errors? No obvious security issues? |
| **Regression safety** | Do existing tests still pass? Are there side effects outside the phase scope? If backward compatibility is required, is it preserved? |
| **Integration coherence** | Do types align with existing code? Are APIs used correctly? Do imports resolve? Are contracts between components honored? |

Each review agent receives:

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

If all reviews come back clean (no critical or important findings), the phase is complete. Move to Step 7.

### Step 6: Apply Fixes Locally

If there are critical or important findings, address those findings yourself in the current session.

Your fix pass should use:

1. The specific findings to address (critical and important only — minor findings are deferred)
2. The phase scope boundary (fixes must stay within scope)
3. The file paths affected
4. Minimal targeted edits only — do not expand scope or refactor beyond what the finding requires
5. The same validation commands from the phase handoff
6. A separate fix commit when changes are required

After the fix pass completes, return to Step 4 (review again). The review-fix loop continues until reviews come back clean.

To prevent infinite loops: if the same finding persists after two fix attempts, escalate to the user.

### Step 7: Close the Phase

When reviews are clean:

1. Verify the plan's Phase Handoff has accurate `Status`, `Completion Notes`, and `Next Starter Context`.
2. Update the plan's `Progress` section if you did not already.
3. Inform the user of the phase result.
4. Move to the next phase (back to Step 1).

### Step 8: Final Documentation Phase(s)

The last phase(s) in the plan should address documentation. These go through the same execute-review-fix loop. For documentation phases, the current session should:

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

### Step 9: Archive the Plan

When all phases are complete:

1. Move the plan from `.ultrakit/exec-plans/active/` to `.ultrakit/exec-plans/completed/`.
2. Update `.ultrakit/exec-plans/active/index.md` to remove it.
3. Update `.ultrakit/exec-plans/completed/README.md` to include it.
4. Record any deferred work in `.ultrakit/exec-plans/tech-debt-tracker.md`.
5. Inform the user that the work is complete.

## Handling Interruptions

If execution is interrupted mid-phase:

1. Check `git status` and `git log` to see what was already done.
2. Check if the plan was updated (Progress, Phase Handoff).
3. If partial work was committed, update the Phase Handoff with what remains.
4. Resume in the next session with the updated handoff and use the `ultrakit:worker:resume` skill to regather context before continuing.

## Critical Principles

1. **Do not delegate implementation or fixes to subagents.** Execution work stays in the current session.
2. **Always review.** Every phase gets all five review dimensions. No exceptions.
3. **Fix loops have a limit.** Two fix attempts per finding, then escalate.
4. **The plan stays current.** If reality diverges from the plan, update the plan.
5. **One phase at a time.** Unless the plan explicitly authorizes parallel execution with disjoint scope.
6. **Finish the phase, not just the read-first pass.** A phase is not complete until implementation, validation, plan updates, and commit creation are done unless a concrete blocker stops progress.
