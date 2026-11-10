# CLAUDE.md — [Project name]

> Base rules come from the Labsky standard (plugin `labsky@labsky`, repo `labsky-studios/labsky-standards`), enabled in `.claude/settings.json`.
> This file contains only what makes this project different — no need to repeat base rules here.

---

## Project identity

- **App:** [name]
- **Purpose:** [one sentence]
- **Audience:** [who uses it]
- **Repo:** [url]

---

## Commands

| Task | Command |
|---|---|
| Install | |
| Dev server | |
| Test | |
| Lint / format | |
| Build | |

---

## Stack

<!-- List the language, runtime, frameworks, and key libraries for this project. -->
<!-- Only what's needed for the agent to understand context — not every dependency. -->

| Layer | Choice |
|---|---|
| Language | |
| Runtime | |
| Framework | |
| Styling | |
| Testing | |

---

## Overrides

<!-- Anything that legitimately diverges from the base standards. -->
<!-- Mark each override explicitly and explain why. -->
<!-- If nothing diverges, write: "None — follows the base standard." -->

---

## Local rules

<!-- Rules specific to this project that extend (not contradict) the base docs. -->
<!-- Keep rule files under docs/local/ and reference them here. -->
<!-- Example: "See docs/local/routing.md for nested route conventions." -->

---

## Agent notes

<!-- Operational context the agent needs to work effectively: -->
<!-- - Where secrets live and how to reference them -->
<!-- - Known gotchas or non-obvious constraints -->
<!-- - Anything that would surprise a developer on their first day -->

---

## Escalation

If completing a task requires violating a rule in this file or in the base docs,
stop and report to a human before proceeding.
