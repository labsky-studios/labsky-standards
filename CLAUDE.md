# CLAUDE.md — labsky-standards

This repo is the Labsky standard itself: a Claude Code marketplace (`.claude-plugin/marketplace.json`) with one plugin, `plugins/labsky/`. See `README.md` for the structure and how to evolve it.

## Rules for working on this repo

- The docs in `plugins/labsky/docs/` are the source of truth. Agents and skills point to them with `${CLAUDE_PLUGIN_ROOT}/docs/...`; they never copy rules into their prompts.
- `plugins/labsky/docs/INDEX.md` is loaded into every session of every Labsky project. Keep it a routing table: one row per doc, no rules. Its `{{DOCS}}` placeholder is replaced with the docs' absolute path by `scripts/session-start.hook.ts`.
- Every new or renamed doc gets its row in `INDEX.md` and, where it applies to a file location, in the mapping table of `skills/review-pr/SKILL.md`.
- Hook scripts run on Node 24+ with native type stripping: erasable TypeScript only, no dependencies, no imports beyond `node:*`. A blocking rule exits `2`. Test every rule change by piping a sample tool call into the script (see `docs/setup/hooks.md`).
- A norm enters the standard only when a Labsky project already practices it, or marked **Proposed** until one does. Cite the project it came from.
- Bump the plugin's version in `plugins/labsky/.claude-plugin/plugin.json` in every release (see `README.md` → Versioning).
- Commits follow Conventional Commits with scope, as in every Labsky repo. `main` only receives PRs.
