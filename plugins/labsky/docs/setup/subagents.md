# Subagents

> Reference doc. Fetch when invoking the plugin's agents, creating a new one, or reviewing agent configuration.

---

## What subagents are

Subagents are specialized Claude instances with their own context window, system prompt, tool restrictions and model. Verbose output (test logs, diffs, lint results) stays inside the subagent; only its report returns to the main conversation.

The `labsky` plugin ships them in `plugins/labsky/agents/`. Plugin agents are namespaced: `reviewer` is `labsky:reviewer`.

---

## Agents in the plugin

### `labsky:planner`: planning
Read-only. Turns a request into ordered, PR-sized slices with acceptance criteria, docs to read, labels and the content still pending from the client. Never writes code or creates issues: `/labsky:plan-feature` shows its plan and creates the issues after the user approves.

**Use:** before coding anything larger than one PR. `/labsky:plan-feature add the project detail page`
**Model:** Opus

### `labsky:reviewer`: code review
Read-only. Reviews a branch or PR diff against the standard's docs and the project's `CLAUDE.md` (its Overrides and Local rules included). Reports critical issues, warnings and suggestions, each with the rule it breaks. Keeps project-specific patterns in its project memory.

**Use:** after writing code and before opening a PR. `@agent-labsky:reviewer review this branch`
**Model:** Sonnet

### `labsky:tester`: quality checks
Runs the project's own checks, read from the Commands table in its `CLAUDE.md` (lint/format check, tests, build), and returns only failures.

**Use:** before committing, or when debugging a failure. `Use the tester to run every check`
**Model:** Haiku

### `labsky:committer`: commits
Checks the staged changes are one concern, runs the project's lint check, writes a Conventional Commits message with scope (following the project's `commitlint.config.*`) and commits. Never pushes. Committing on `main`, `staging` or `dev` is also blocked by the pre-bash hook.

**Use:** when ready to commit. `Use the committer to commit the staged changes`
**Model:** Haiku

### `labsky:scaffolder`: feature scaffolding
Creates the folder structure for a new feature under `src/features/`. Never modifies existing files.

**Use:** when starting a feature. `Use the scaffolder to create the projects feature with components and constants`
**Model:** Haiku

---

## Invoking subagents

```
# Natural language: Claude decides whether to delegate
Use the reviewer to check my recent changes

# @-mention: guarantees that agent runs
@agent-labsky:reviewer look at the auth changes
```

---

## Adding an agent to the plugin

1. Create `plugins/labsky/agents/<name>.md` with YAML frontmatter and a system prompt.
2. `name` and `description` are required. Write the `description` as "what it does + when to use it": Claude uses it to decide when to delegate.
3. Restrict `tools` to what the agent needs.
4. Choose `model: haiku` for fast, mechanical tasks and `model: sonnet` or `opus` for reasoning-heavy ones.
5. Point it at docs with `${CLAUDE_PLUGIN_ROOT}/docs/...`. Claude Code substitutes the plugin's path in agent and skill bodies. Never copy rules into the prompt: the prompt says which doc to read.
6. Document it here and in `docs/INDEX.md`, and bump the plugin's minor version.

### Frontmatter that works in a plugin agent

`name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `isolation` (`worktree` only), `color`.

Claude Code **ignores** `permissionMode`, `hooks` and `mcpServers` in plugin agents. A rule an agent must not break goes in the plugin's hooks (`docs/setup/hooks.md`), which apply to every agent.

### Memory scopes

| Scope | Location | Use when |
|---|---|---|
| `project` | inside the project's `.claude/` | Knowledge is specific to that project; it can be committed |
| `user` | `~/.claude/agent-memory/<name>/` | Knowledge applies across all projects |
| `local` | inside the project's `.claude/`, not committed | Project-specific and personal |

---

## Priority

When two agents share a name, the higher location wins: managed settings, then the project's `.claude/agents/`, then `~/.claude/agents/`, then plugins. A project can override a plugin agent by defining one with the same name, which is an override and must be listed in its `CLAUDE.md`.

---

## Built-in subagents

Claude Code also ships `Explore` (read-only codebase search), `Plan` (research for plan mode) and `general-purpose`. To disable one, add `Agent(Explore)` to `permissions.deny` in the project's `.claude/settings.json`.
