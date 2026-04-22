# Greeting Update Architecture

The change should stay inside the existing demo target repository and remain a single-target run.

Use this execution shape:

- Root task A inspects the current greeting implementation and records the current behavior without modifying files.
- Root task B inspects the existing greeting test coverage and identifies the verification command without modifying files.
- A dependent implementation task waits for both inspection tasks, then updates the greeting implementation, updates any necessary tests, runs verification, and records the result.

Avoid new packages, services, or repository structure changes.
