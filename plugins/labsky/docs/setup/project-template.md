# Project CLAUDE.md — Setup Guide

> Reference doc — read this when setting up a new project that consumes the base standards.

---

## Purpose

Each project that adopts the Labsky standard has its own `CLAUDE.md` at its root.
The base rules reach the session through the `labsky` plugin, enabled in the project's
`.claude/settings.json`; the project's `CLAUDE.md` only documents what diverges from them or extends them.

If a project has no deviations, it may still have a `CLAUDE.md` for project identity
and commands — but it must not duplicate rules from `docs/`.

The ready-to-use template is at `template/CLAUDE.md` in `labsky-standards`. Copy it to the
project root and fill in the placeholders.

The project's `.claude/settings.json` enables the plugin:

```json
{
  "extraKnownMarketplaces": {
    "labsky": {
      "source": { "source": "github", "repo": "labsky-studios/labsky-standards" }
    }
  },
  "enabledPlugins": {
    "labsky@labsky": true
  }
}
```

When someone opens the project and trusts the folder, Claude Code offers to install the marketplace and the plugin.

---

## What a project CLAUDE.md may define

- Stack and tooling choices (language, framework, libraries).
- Project identity: name, purpose, audience, repo URL.
- Essential commands (install, dev, test, lint, build).
- Overrides — anything that legitimately diverges from the base docs, with a reason.
- Local rules — project-specific conventions that extend (not contradict) the base.
- Agent notes — gotchas, secret locations, non-obvious constraints.

---

## What a project CLAUDE.md may never do

- Duplicate rules already in the standard's `docs/` — reference them, don't repeat them.
- Override a base rule without marking it explicitly as an override and explaining why.
- Grow beyond ~100 lines — if it's getting long, the content belongs in `docs/local/`.

---

## Local rule files

For rules too detailed for the `CLAUDE.md` itself, create a `docs/local/` folder in
the project and reference those files from the `Local rules` section of `CLAUDE.md`.

Example: `docs/local/routing.md` for nested route conventions specific to this project.

---

## Escalation

If completing a task requires violating a rule in this file or in the base docs,
the agent must stop and report to a human before proceeding.
