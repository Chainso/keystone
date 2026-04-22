# Greeting Update Specification

Update the fixture demo target through Keystone's run-driven workflow with a small but non-trivial DAG.

The compiled run should prove all of the following:

- multiple executable tasks, not a single implementation task
- at least one dependency edge between tasks
- at least two root tasks that can start independently
- a concrete greeting change in the existing demo target repository
- verification captured in the final implementation handoff

Keep the implementation small and reviewable.
Preserve the existing repository structure.
Keep verification straightforward for the fixture project.
