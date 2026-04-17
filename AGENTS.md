# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a greenfield application workspace. The only committed material today is planning and design input:

- `product-specs/`: product and architecture proposals
- `design/`: screen explorations and visual references
- `.ultrakit/`: execution plans, developer-doc scaffolding, and project notes

When implementation starts, keep application code under `src/` and tests under `tests/` or `src/**/__tests__/`. Store static assets in `public/` or `assets/` and keep feature code grouped by domain, not by file type alone.

## Build, Test, and Development Commands

No build, test, lint, or local run commands are defined yet. Add them as part of the initial app scaffold and keep them stable:

- `npm run dev`: local development server
- `npm run build`: production build
- `npm run test`: automated test suite
- `npm run lint`: formatting and lint checks

If a different toolchain is chosen, update this file and the root `README` in the same change.

## Coding Style & Naming Conventions

Until language-specific tooling is added, use these defaults:

- 2-space indentation for JavaScript, TypeScript, JSON, and Markdown lists
- `camelCase` for variables/functions, `PascalCase` for components/classes, `kebab-case` for non-component filenames
- Keep modules small and feature-focused; avoid dumping unrelated code into shared utilities early

Adopt a formatter and linter with the first code scaffold and expose them through repo scripts rather than ad hoc commands.

## Testing Guidelines

Tests are not set up yet. Add automated tests with the first runnable code and cover core user flows plus critical edge cases. Name test files `*.test.*` or `*.spec.*`. Every pull request that adds behavior should also add or update tests unless the change is documentation-only.

## Agent Skill Usage

When working in this repo, load the matching local skill before making changes in that area. Use the smallest relevant set:

- Cloudflare platform work: `cloudflare`
- Wrangler config, deploy, or bindings: `wrangler`
- Worker implementation or review: `workers-best-practices`
- Durable Objects: `durable-objects`
- Cloudflare Agents or AI agent flows: `agents-sdk` or `building-ai-agent-on-cloudflare`
- Remote MCP on Cloudflare: `building-mcp-server-on-cloudflare`
- Sandbox execution features: `sandbox-sdk`
- React component API design and refactors: `vercel-composition-patterns`
- Performance-sensitive frontend work: `web-perf`

Use these skills as decision support and current-platform guidance, especially where Cloudflare APIs or React architecture choices may drift over time.

Ultrakit execution is subagent-driven. Keep the stage logic in `.agents/skills/ultrakit-orchestrator-*`, and keep the execution-role instructions in `.codex/agents/ultrakit_implementer.toml` and `.codex/agents/ultrakit_reviewer.toml`. If the ultrakit execution model changes, update both the orchestrator skills and these project-scoped subagent configs in the same change.

## Commit & Pull Request Guidelines

Current history uses short imperative subjects such as `init`, `move`, and `remove`. Keep the imperative style, but make subjects more descriptive, for example `add Cloudflare worker scaffold`.

Pull requests should include:

- a short summary of scope and intent
- links to the relevant spec in `product-specs/` or active `.ultrakit` plan
- screenshots or mockups for UI changes
- the commands run, or a note that the repo is not scaffolded yet

## Planning Artifacts

Treat `product-specs/`, `design/`, and `.ultrakit/exec-plans/` as source material. Update them when implementation decisions materially change the planned architecture or user experience.
