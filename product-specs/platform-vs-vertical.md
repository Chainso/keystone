# Structuring an Internal Agent Platform and a Software-Engineering Vertical

## Repository naming for this program

In this repository, `Maestro` is the working product name for the reusable platform kernel described throughout this document.

Use `platform kernel` as the generic architectural label for that same layer, not as a second subsystem with different responsibilities.

`Keystone` is the software-engineering vertical product that programs Maestro's reusable execution interfaces into software-delivery workflows.

## Patterns from Frontier, Managed Agents, and Reference Implementations

Across the most relevant “managed agent” systems, the stable pattern is **a small set of durable interfaces** around (a) agent configuration, (b) sandboxed execution, and (c) an append-only event record—so that the harness logic can evolve without collapsing your architecture. Anthropic explicitly frames Managed Agents as a “meta-harness” with stable interfaces to a **session log**, a **harness**, and a **sandbox**, and emphasizes decoupling the “brain” (model+harness) from “hands” (sandbox/tools) and from the session log so each can fail/upgrade independently. citeturn23view0

The domain split you described—**agent definition** vs **environment definition** vs **agent+environment binding**—is not just reasonable; it’s increasingly the *default* in modern managed systems:

- In Claude Managed Agents, the official “Core concepts” are **Agent** (model + system prompt + tools + MCP servers + skills), **Environment** (container template), **Session** (a running agent instance bound to an agent+environment), and **Events** (the message/tool/status stream). Crucially, agents and environments are created separately and referenced by ID when a session starts. citeturn1view0turn10view0turn10view2  
- Scion’s design—although open-source and intentionally “less is more”—lands on similar separations: it distinguishes a **Template** (agent blueprint), **Runtime** (Docker/Podman/Apple Container/Kubernetes), and a **Profile** that “binds a specific Runtime to flags and harness overrides,” and then runs Agents as isolated processes with explicit workspace isolation. citeturn5view0turn2view0turn3view1

Two other implementation-level patterns matter for your internal platform design because they strongly shape what abstractions stay “clean” over time:

- **Event-history-first** interfaces. Claude Managed Agents persists event history server-side and exposes it as the primary stream you consume (SSE + fetch full history). citeturn1view0turn9search3 Codex’s App Server similarly elevates “thread lifecycle and persistence” and exposes a bidirectional protocol where one request yields many structured notifications, including server-initiated approvals that pause the turn until the client responds. citeturn22view2  
- **Workspace isolation via git worktrees** (and/or clone+fetch), not via higher-level “task objects.” Scion uses git worktrees in local mode and switches to clone+fetch when a hub/broker architecture is used, precisely because the operational envelope changes (consistent provisioning, remote execution, avoiding host SSH). citeturn5view0turn2view0 Git itself frames worktrees as multiple working trees attached to the same repo, sharing objects but separating per-worktree metadata like HEAD and index. citeturn18view0

Taken together, the most defensible top-level architecture is:

- **Maestro (platform kernel):** stable interfaces for session log + sandbox + tool (and optional harness adapters)
- **Keystone (vertical product):** domain-specific workflow compilation + orchestration that *programs* those Maestro interfaces

This follows Anthropic’s “interfaces outlast harnesses” view citeturn23view0 while matching what Scion and Claude Managed Agents converge on in object modeling. citeturn1view0turn5view0turn2view0

## Maestro domain model with concrete abstraction decisions

This section proposes a concrete Maestro *domain*, heavily grounded in the design moves above, and tuned to your preference for “agent definitions vs environments vs binding.”

### Decision: treat AgentDefinition and EnvironmentDefinition as versioned, reusable resources

Claude Managed Agents explicitly makes agents “reusable, versioned configurations” referenced by ID across sessions, and also treats environments as reusable resources referenced when starting sessions, while each session gets its own isolated container instance. citeturn10view0turn10view1 This pushes you toward a crisp internal model:

**AgentDefinition (versioned)**  
A reusable spec that bundles the “persona and capabilities” surface: model selection, system prompt/instructions, tool grants, MCP server connectivity, skills, and (optionally) callable/delegable agents. citeturn10view0turn11view0

**EnvironmentDefinition (versioned)**  
A reusable spec for a sandbox template: base image/runtime type, packages, network policy, mounts, resource limits, and sidecars. Claude’s environment config highlights packages, networking, and caching semantics across sessions that share an environment spec. citeturn10view1

**Binding object: SessionSpec (immutable once started)**  
A “frozen” record that binds `AgentDefinition@version` + `EnvironmentDefinition@version` + specific runtime parameters, producing a running Session.

This maps directly to “create agent,” “create environment,” then “start a session that references both,” with optional version pinning. citeturn10view0turn10view2

### Decision: introduce a first-class “RuntimeProfile” separate from EnvironmentDefinition

Scion’s **Profile** abstraction is valuable because it keeps templates harness-agnostic and defers runtime choice (local docker vs prod k8s) without forcing you to rewrite agent specs. Scion describes a Profile as binding a runtime to behavior flags and harness overrides, enabling switching environments without modifying templates. citeturn5view0turn2view0

In Maestro, make this explicit:

- `EnvironmentDefinition`: “what is inside the box” (toolchain, packages, mounts, policies)  
- `RuntimeProfile`: “where/how the box runs” (docker vs microVM, host placement, quotas, network egress enforcement mechanism)

This becomes critical if you later want to run the same workflows locally and on a small cluster without rewriting environment specs.

### Decision: represent “tooling” as capabilities with policy-bound implementations

Claude Managed Agents’ tools page makes a sharp distinction between (a) built-in tools executed in the container (bash/file ops/web fetch/search) and (b) custom tools executed by “your application” and reported back as tool results. citeturn11view2 Scion’s harness abstraction similarly normalizes generic operations (`start`, `stop`, `attach`, `resume`) across different underlying agent softwares (Gemini CLI, Claude Code, Codex, etc.). citeturn5view0turn2view0

A concrete platform decision that keeps things clean:

- A **Capability** is a named interface: `filesystem`, `bash`, `git`, `web_fetch`, `web_search`, `browser_automation`, `mcp_proxy`, `artifact_store`, etc.  
- A **ToolImplementation** binds a capability to where it runs: inside sandbox, in a proxy service, or in the host application.  
- A **PolicyGrant** determines whether an AgentDefinition can invoke a capability (and in what scope).

This mirrors Claude’s “select tools in agent config” controls citeturn11view2turn10view0 while aligning with Scion’s “harness adapters” concept for different execution backends. citeturn5view0

## Maestro internals: how concepts work in execution, logs, and policy

This section turns the domain model into an internal architecture that matches how real systems are built.

### Decision: the SessionLog is the source of truth; it is append-only and lives outside the sandbox

Anthropic’s Managed Agents write-up is unusually explicit: the session is “the append-only log of everything that happened,” and the point of decoupling is that harness/sandbox can be replaced while the session log persists, enabling `wake(sessionId)` to resume and `emitEvent(id,event)` to durably record progress. citeturn23view0 Claude Managed Agents similarly treats events as first-class and makes event history fetchable. citeturn1view0 Codex App Server treats the internal event stream as the raw substrate and converts it into a smaller stable set of notifications for UI clients. citeturn22view2

Concrete internal mechanics:

- You maintain an append-only `SessionEvent` stream:  
  `user_event`, `assistant_message`, `tool_call`, `tool_result`, `status_update`, `approval_request`, `approval_response`, `artifact_written`, `error`, etc.  
- The harness writes events. The sandbox/tool layer emits tool results as events.  
- The UI consumes the event stream; it is never reconstructing “state” from chat transcripts ad hoc.

This is the single most important decision if you want (a) replay/debugging and (b) long-running durability without binding your future to one harness.

### Decision: model status as (infrastructure phase) × (agent activity), not a single enum

Scion’s agent state model is a pragmatic example: it separates **Phase** (container lifecycle) from **Activity** (“idle/thinking/executing/waiting_for_input/...”) plus freeform detail, specifically so UIs can distinguish infra lifecycle from cognitive/work state and avoid false “stalled” conclusions. citeturn5view0

Maestro should adopt the same shape for Sessions *and* TaskActivities:

- `infra_phase`: provisioning → starting → running → stopping → stopped/error  
- `activity_state`: idle/thinking/executing/waiting_for_input/blocked/completed/error  
- `detail`: tool name, current step, waiting reason, etc.

This cleanly supports “attached” interactive modes (Scion’s attach when waiting) citeturn2view0turn5view0 and Codex-style approvals that pause mid-turn. citeturn22view2

### Decision: sandbox provisioning must be “cattle,” and secrets must not be reachable from generated code

Anthropic highlights why coupling session+harness+sandbox in one container creates “pets,” making recovery/debugging and customer network integration painful; the fix is to make container provisioning a tool-like interface (`provision({resources})`) and treat sandboxes as replaceable. citeturn23view0 They also emphasize a structural security boundary: keep credentials out of the sandbox, using vault/proxies or resource-bundled auth so a prompt injection cannot simply read tokens from the same environment where code executes. citeturn23view0

Scion arrives at similar conclusions with different mechanisms: strict isolation of agent home directories, tmpfs “shadow mounts” to prevent cross-contamination, explicit env var projection, and a more formalized identity/policy system. citeturn5view0turn6view1

Concrete internal architecture choices:

- **SandboxManager** provisions containers/microVMs from an `EnvironmentDefinition` + `RuntimeProfile`, produces a `SandboxInstance` handle, and can re-provision on failure. citeturn23view0turn10view1  
- **SecretBroker / VaultProxy** is outside the sandbox; tools that require auth are invoked through it, rather than injecting raw tokens into the sandbox. citeturn23view0turn6view2  
- **PolicyEngine** evaluates whether an AgentDefinition can invoke a capability and, if relevant, restricts by provenance claims (template/role identity, broker identity, repository identity). Scion’s claim-based JWT approach is a concrete reference for how claim-based policy can grow beyond RBAC without becoming unreadable. citeturn6view1

### Decision: make “workspace strategy” a pluggable subsystem

Scion’s choice to use worktrees in local mode but clone+fetch in hub mode is a good reference point: you will eventually want different workspace strategies as you move from “single machine internal” to “multiple machines/internal cluster.” citeturn5view0turn2view0 Git worktrees are the right abstraction for the local/fast path because they share objects but isolate working directories and per-worktree metadata. citeturn18view0

Maestro concept:

- `WorkspaceStrategy = worktree | clone_fetch | snapshot_fs | ...`  
- A `WorkspaceInstance` always answers the same interface: path, branch, base commit, patches/commits emitted, cleanup semantics.

This keeps the platform stable even as you change underlying provisioning.

## Vertical product domain model: the workflow objects that should stay out of Maestro

Your instinct in earlier messages is right: “task contracts, integration semantics, evidence packs” are *workflow/product* concerns, not substrate concerns. The vertical's role is to compile intent into work and then drive Maestro's primitives.

Your Keystone spec already encodes a coherent vertical domain: Decision Package → Executable Plan → Task Contracts → durable Task Run Records → Integration Records → Release Evidence Pack, executed as a DAG across tasks with serial convergence loops per task, plus centralized integration. fileciteturn0file0

The key vertical design decision is:

### Decision: the platform never “understands” software delivery; it executes and records

Anchor this as a hard boundary:

- Maestro understands: sessions, sandboxes, agents, event streams, artifacts, policies, workspaces.
- Keystone understands: specs/ADRs/acceptance criteria, task graphs, integration baselines, review/validation logic, merge policies, documentation lifecycle.

This is consistent with the Scion philosophy: be a “hypervisor for agents,” leaving higher-level components (memory, task management, chatrooms) as orthogonal integrations. citeturn3view0 It also matches Anthropic’s motivation: stable interfaces that outlast any specific harness logic. citeturn23view0

### Concrete vertical objects and why they remain vertical

- **DecisionPackage**: domain contract for “approved intent.” The platform should treat this as an artifact blob with references, not parse it. fileciteturn0file0  
- **ExecutablePlan**: a compiled artifact that can resume without chat history. This is closer to an “application-level state machine program” than a platform session. fileciteturn0file0  
- **TaskContract**: the autonomy boundary per unit of work (scope, acceptance criteria, validations, evidence). This belongs in the vertical because it encodes software meaning. fileciteturn0file0  
- **IntegrationRecord**: the vertical’s “truth” about baselines and dependency merges.

One practical validation of this separation is that Druids and Anthropic harness research get stronger by making workflow logic explicit, but they do it at the orchestration layer, not by baking “software delivery semantics” into the VM runtime.

- Druids’ “agent programs” explicitly define deterministic control flow via events: “the agent decides when to trigger an event—the program decides what happens.” citeturn7view2  
- Anthropic’s long-running coding harnesses rely on structured artifacts, incremental progress, and explicit evaluation loops (planner/generator/evaluator) to keep long runs coherent. citeturn23view1turn24view0

This is vertical territory.

## How the vertical should program the platform

This is the most important “interaction design” between domains: what APIs and lifecycle hooks exist between vertical orchestration and platform execution.

### Decision: freeze the minimum Maestro kernel contract before `M1`

For the first runnable slices, contributors should treat the Maestro contract as three layers:

- **Configuration resources**: `AgentDefinition`, `EnvironmentDefinition`, `RuntimeProfile`, and an immutable `SessionSpec` that pins those inputs for one run.
- **Required `M1` runtime primitives**: `Session`, `WorkspaceInstance`, `SessionEvent`, and `ArtifactRef`.
- **Reserved expansion points for later milestones**: `Thread`, `Approval`, and `Lease`.

`M1-01` and `M1-02` only need to make the required `M1` primitives real. `Thread`, `Approval`, and `Lease` are still part of the named contract now so later milestones extend the same kernel instead of renaming it midstream.

### Decision: freeze the Session lifecycle around durable checkpoints

The session lifecycle should be explicit enough that `M1` can scaffold and `M2` can extend it without changing names:

1. `configured` — the `SessionSpec` is pinned to a specific agent/environment/runtime combination.
2. `provisioning` — the `Session` record exists and Maestro is creating sandbox and workspace bindings.
3. `ready` — sandbox and workspace are bound and the session can accept work.
4. `active` — tools, events, and artifacts are being produced.
5. `paused_for_approval` — execution is intentionally blocked on an approval decision.
6. `archived` — execution is closed, but the event history and artifacts remain readable.
7. `failed` — an unrecoverable infrastructure problem occurred and the session needs reprovisioning or archival handling.

The minimum path `M1` must support is `configured -> provisioning -> ready -> active -> archived`. `paused_for_approval` is named now so Keystone can model it, but it does not need to be fully exercised until `M2`.

### Decision: create a narrow “platform kernel API” that maps cleanly to your domain split

At minimum, the vertical should only need to call the following Maestro APIs.

`M1` required:

- `register_agent_definition(spec) -> AgentDefinitionId@version`
- `register_environment_definition(spec) -> EnvironmentDefinitionId@version`
- `start_session(session_spec) -> SessionId`
- `provision_sandbox(session_id, env_ref, runtime_profile?) -> SandboxId`
- `workspace_init(session_id, repo_ref, strategy?) -> WorkspaceId`
- `append_event(session_id, event) -> SessionEventId`
- `read_events(session_id, filters?) -> [SessionEvent]`
- `put_artifact(kind, bytes, metadata) -> ArtifactRef`
- `link_artifact(session_id, artifact_ref) -> ok`
- `end_session(session_id, mode=archive) -> ok`

Named now, implemented later:

- `start_thread(session_id, agent_ref_override?) -> ThreadId` (optional, but useful if you adopt Codex/Claude thread patterns)
- `send_event(thread_id, user_event) -> stream(SessionEvents)`
- `interrupt(thread_id)` / `approve(thread_id, approval_id, decision)`
- `get_artifacts(session_id|thread_id) -> [ArtifactRef]`
- `workspace_ops(session_id, op)` (git checkout/create branch/merge, etc., if you keep this in the platform)
- `reprovision(session_id)` (if sandbox dies)

This is extremely close to what managed platforms already expose, even if their names differ. Claude Managed Agents formalizes “events” as the interaction primitive and sessions as the running binding, with persisted history. citeturn1view0turn10view2 Codex App Server formalizes bidirectional streaming updates, thread persistence, and server-initiated approvals. citeturn22view2

### Decision: use thread-level isolation for roles inside a shared workspace when you need parallelism

Claude’s multi-agent sessions are a useful reference: agents share the same container+filesystem, but each agent runs in its own “session thread” with its own context-isolated event stream and persistent thread history; tools and context are not shared. citeturn11view0

For software engineering workflows, this suggests a clean pattern:

- One **TaskWorkspace** (worktree/branch)  
- Multiple **RoleThreads** against that workspace:
  - implementation thread (write tools enabled)
  - review thread (read-only tools)
  - validation thread (bash/test tools, possibly read-only code mutation)
  - documentation thread (writes to docs artifacts under policy)

This aligns with both Anthropic’s harness research (separating generator/evaluator is a major lever) citeturn24view0turn23view1 and Druids’ build program, where an auditor and critic are distinct roles, with explicit tooling grants and event-driven coordination. citeturn8view1turn8view3

### Decision: treat git operations as a first-class platform capability, but keep “merge meaning” vertical

Your Keystone spec’s “canonical integrated baselines” plus octopus merge for multi-parent integration is a strong vertical choice, but the mechanics can still be platform-provided as a capability, because they are deterministic plumbing. fileciteturn0file0 Git’s merge system explicitly uses the `octopus` strategy when merging multiple heads, making it a legitimate building block for a workflow-owned integration step. citeturn19search1turn5view0

A good split:

- Platform provides: `create_worktree`, `create_branch`, `merge(parents, strategy=octopus)`, `detect_conflicts`, `emit_patch`, `push_branch` (if allowed).  
- Vertical provides: *when* and *why* merges occur; what constitutes an “integration group”; what happens on conflict (new merge-resolution task, escalation, etc.).

### Decision: make “handoff capsules” and “structured artifacts” mandatory at boundaries

Anthropic’s long-running harness results are clear: long horizon success depends on explicit scaffolding and structured handoffs (progress files, feature lists, git commits) so the next session starts with real state, not guesswork. citeturn23view1turn24view0 Scion similarly appends “contextual agent instructions” (agents-git.md, agents-hub.md) automatically during provisioning so agents understand their environment without every role template repeating it. citeturn5view0turn6view0

Your vertical should therefore enforce:

- Every TaskContract produces a compact handoff capsule (what changed, what remains, what to run to validate).  
- Every role thread emits structured outputs (findings, validations, evidence refs) rather than freeform chat text.

This is precisely the kind of vertical policy that improves reliability without “polluting” the platform domain with software-specific semantics.

## Architecture decisions that keep the split clean while maximizing research freedom

This final section distills the highest-leverage decisions for keeping Maestro and Keystone cleanly separated, each backed by what these systems actually did in practice.

### Decision: adopt the “session log + sandbox + harness adapter” triad as the platform core

Anthropic’s Managed Agents explanation is the clearest justification for this: virtualize the components of an agent into stable abstractions (session log, harness, sandbox) so implementations can be swapped independently, and treat provisioning and harness processes as replaceable cattle. citeturn23view0

For you, this preserves research freedom in two ways:

- You can switch harnesses (Codex App Server vs Claude Agent SDK vs your own loop) without changing the platform kernel.
- You can switch sandbox styles (single run container + worktrees vs per-task container vs microVM) behind the `SandboxManager` without rewriting the vertical product.

### Decision: keep agent templates harness-agnostic; push harness specifics into adapters and runtime profiles

Scion’s `scion-agent.yaml` makes this explicit: “Templates must be harness-agnostic” and you select a `default_harness_config` that can be overridden, with environment, volumes, resources, and system prompts in the template. citeturn6view0turn5view0

This is exactly the abstraction you want for your “internal platform first” direction: it lets you keep your conceptual model stable even if the underlying agent runtime changes.

### Decision: standardize on a Think-backed harness adapter first, while keeping the kernel harness-agnostic

Cloudflare's `Think` is a good *first* harness for Keystone agent turns because it already provides the high-friction inner-loop mechanics: persistent conversation history, tool orchestration, streaming, and turn recovery. The important boundary is that Keystone should consume Think through a harness adapter, not treat Think as part of the kernel contract or as the owner of workflow truth.

The concrete split should be:

- `Think` owns turn-local conversation state, the model loop, and basic file/bash style tooling ergonomics.
- The sandbox owns the real execution environment.
- Maestro owns the append-only session log, artifact promotion, policy enforcement, and workspace bindings.
- Keystone owns orchestration, task semantics, approvals, and evidence requirements.

This keeps the platform's promise intact: harnesses remain swappable, but the first concrete harness can be productive immediately without forcing Keystone to reinvent chat persistence or tool-calling infrastructure.

### Decision: make environments composable and hierarchical using “base + overlays/features”

Claude environments already behave like reusable templates with cached package installation across sessions sharing the environment. citeturn10view1 If you want explicit hierarchy, the Dev Container spec ecosystem provides an existence proof of “base image + ordered features layered on top,” with an implementor reference that features are installed atop a base image and can be ordered and distributed. citeturn25search0turn25search7

A concrete environment hierarchy that tends to work well in practice:

- `BaseEnvironment`: OS image + universal utilities  
- `LanguageToolchainOverlay`: node/python/go/rust/etc + package managers  
- `ProjectOverlay`: repo mount strategy + caches + build deps  
- `ArtifactProjectionOverlay`: mounted run/task inputs plus writable output staging (for example `/artifacts/in`, `/artifacts/out`, `/keystone`)  
- `WorkflowOverlay`: browser automation, test databases/fixtures, etc.  
- `PolicyOverlay`: network egress rules, secret projections, resource limits

This keeps “environment as a hierarchy of subconcepts” explicit, while still compiling to a single sandbox provisioning recipe.

### Decision: invest early in event traceability because it becomes your research substrate

Codex App Server exists largely to turn the agent loop into a stable, UI-friendly event stream: one request, many notifications; persisted thread history; approvals as explicit request/response pauses. citeturn22view2turn22view1 OpenAI’s Agents SDK similarly treats traces/spans as core to debugging and improvement cycles. citeturn17view3turn14view3

If you want to iterate quickly on workflows, you need the platform to answer, cheaply and precisely:

- what happened?
- what tool calls occurred?
- what decisions were made?
- where did the run stall or diverge?

That is the difference between “research constrained by platform limitations” and “research accelerated by platform observability.”

### Decision: use durable orchestration only at the vertical layer, not as a platform requirement

For internal use, it’s tempting to bake orchestration into the platform. But the cleaner split is:

- Platform is synchronous-ish: sessions, execution, logs, artifacts.
- Vertical orchestrates multi-hour workflows durably (Temporal is the canonical example of durable workflows + retryable activities separated from side effects). Temporal’s docs and blog material emphasize durability via event history and replay, and the workflow/activity split as a rule of thumb for long-running, failure-resilient logic. citeturn20search2turn20search1turn20search0

That keeps experimentation fast: you don’t need to redesign the platform every time you invent a new workflow shape; you only change vertical orchestration code and agent role definitions.

### Decision: don’t collapse “software engineering correctness” into the platform—encode it as vertical roles and contracts

Anthropic’s harness research and Druids’ build program both point to the same thing: long-running success comes from **explicit evaluator roles and explicit contracts**, not from making the runtime smarter.

- Anthropic’s planner/generator/evaluator system uses negotiated sprint contracts and a skeptical evaluator with real tooling (Playwright MCP) to catch failures that a generator will miss. citeturn24view0turn23view1  
- Druids’ build flow defines distinct roles (builder/critic/auditor), separates permissions (`git="write"` vs `git="read"`), and explicitly audits whether verification is real. citeturn8view1turn8view3

So the concrete architectural choice is: build your platform to make these role patterns easy (threads, tool grants, shared workspace handles, event logs), and keep correctness semantics in the vertical (task contracts, evidence requirements, merge policy).
