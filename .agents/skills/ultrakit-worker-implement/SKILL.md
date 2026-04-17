---
name: ultrakit:worker:implement
description: >
  Execute one ultrakit phase pass or targeted fix pass as a spawned implementation
  worker. This skill owns code changes, validation, plan updates, and commit creation
  for the assigned scope while the outer session remains the orchestrator.
---

# Implement Phase

You are the spawned implementation worker for one ultrakit phase pass. The outer execution-stage session is the orchestrator. Your job is to execute the assigned scope completely, keep the plan current, validate the result, and return a concise handoff.

Use this skill for:

- A full phase implementation pass
- A targeted fix pass after review findings
- A documentation phase execution pass

## Expected Context Packet

The orchestrator should provide enough context for you to work without hidden chat memory. At minimum, expect:

1. The execution plan path
2. The exact `Phase Handoff` subsection to execute
3. The previous phase handoff when continuity matters
4. A work-so-far summary and current plan state
5. The `Read First` file list
6. Scope boundaries and explicit out-of-scope constraints
7. Required outputs and plan sections to update
8. Validation commands and known baseline failures
9. Backward compatibility constraints
10. For fix passes, the specific critical and important findings to address

If any of that is missing and you cannot safely infer it from the checked-in plan, stop and surface the gap to the orchestrator.

## Workflow

### 1. Read the Durable Context

Read `.ultrakit/notes.md` first for durable project or user preferences.

Read the assigned plan path and the target phase's `Phase Handoff` subsection carefully. Treat the handoff as the canonical brief.

If this is not the first phase, read the previous phase's `Phase Handoff` for continuity.

### 2. Read Broader Plan Context

Read the relevant broader plan sections:

- The overall objective
- `Progress`
- `Design Decisions`
- `Execution Log` entries relevant to your phase
- `Surprises & Discoveries` relevant to your phase
- `Validation and Acceptance`

Do not make new design-level decisions if the plan has not already resolved them. Escalate those back to the orchestrator.

### 3. Inspect the Working Tree

Examine the repository state before editing:

- `git status`
- `git log --oneline -5`
- The files listed in `Read First`
- The files listed in `Files Expected To Change`

Read adjacent code as needed to implement safely, but stay inside the phase scope.

### 4. Execute the Assigned Scope

Complete the assigned pass end to end:

1. Make the code or documentation changes required by the phase or fix brief
2. Stay within the stated scope boundary
3. Preserve unrelated working-tree changes
4. Update the plan's living sections as the work progresses

For a fix pass, address only the critical and important findings provided by the orchestrator unless the plan itself must be corrected for accuracy.

### 5. Keep the Plan Current

Update the relevant plan sections during the pass:

- `Progress`
- `Execution Log`
- `Surprises & Discoveries` when something unexpected is learned
- `Outcomes & Retrospective` when the phase closes
- The phase's `Status`, `Completion Notes`, and `Next Starter Context`

The plan is part of the deliverable, not an afterthought.

### 6. Validate

Run the validation commands from the phase handoff or fix brief. Record concise evidence for the orchestrator:

- Which commands ran
- Whether they passed or failed
- Any known pre-existing failures that remain

If validation cannot run, state exactly why.

### 7. Commit

Create the expected commit for the pass unless the orchestrator explicitly told you not to or a blocker prevents a coherent commit.

If the work is blocked, do not fabricate completion. Update the plan with the blocker evidence and report it back clearly.

### 8. Return a Worker Handoff

Return a concise result to the orchestrator that includes:

1. What you changed
2. The files changed
3. Validation commands and outcomes
4. Plan sections updated
5. Commit hash and message, if created
6. Any blockers, open questions, or follow-up needed before review

## Rules

1. The plan is the source of truth for scope.
2. You are not alone in the codebase. Do not revert unrelated edits, and adapt to the current tree.
3. Finish the assigned pass. Do not stop after a read-only analysis pass unless blocked.
4. Escalate design ambiguity to the orchestrator instead of inventing architecture during execution.
5. Keep edits targeted. Do not expand scope because a broader cleanup looks attractive.
6. If a blocker prevents completion, record exact evidence in the plan and report it clearly.
