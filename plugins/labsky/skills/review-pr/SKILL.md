---
name: review-pr
description: Review a branch or PR diff against the Labsky standard and the project's CLAUDE.md. Use before opening a PR or after finishing a feature. Reports critical issues, warnings and suggestions organized by file. Never modifies files.
allowed-tools: Read, Grep, Glob, Bash(git *), Bash(gh pr view *), Bash(gh pr diff *)
---

The Labsky standard's docs are in `${CLAUDE_PLUGIN_ROOT}/docs/`. Every `docs/...` path below is relative to that folder.

## Before starting

1. Read the project's `CLAUDE.md` in full. Its **Overrides** replace base rules and its **Local rules** add to them: both are review criteria, with the same weight as the docs.
2. Read `docs/never/no-go-list.md`: it applies to every file regardless of domain.
3. Read `docs/always/preamble.md` for TypeScript invariants, naming and import rules.

Never apply rules from memory.

## Steps

1. Determine the diff to review:
   - `$ARGUMENTS` is a PR number: `gh pr diff $ARGUMENTS` and `gh pr view $ARGUMENTS --json baseRefName,headRefName,title,body`.
   - `$ARGUMENTS` is a branch: diff it against its base, `git diff $(git merge-base origin/dev $ARGUMENTS)...$ARGUMENTS`. Use `origin/main` as the base only for a `hotfix/*` branch.
   - Nothing given: if the current branch has a PR, review that PR. Otherwise `git diff --staged`; if nothing is staged, the current branch against `origin/dev` as above.
2. Read each changed file in full, not only the hunks.
3. For each file, read the docs that apply to its location:

   | File location | Read |
   |---|---|
   | `components/` | `docs/frontend/component-design.md`, `docs/frontend/ui-library.md`, `docs/frontend/accessibility.md` |
   | `hooks/` (React hooks) | `docs/frontend/patterns.md`, `docs/frontend/code-quality.md` |
   | `services/` | `docs/frontend/api-layer.md` |
   | `queries/` | `docs/frontend/api-layer.md`, `docs/frontend/state-management.md` |
   | `stores/` | `docs/frontend/state-management.md` |
   | `schemas/` | `docs/frontend/data-and-validation.md` |
   | `routes/` | `docs/frontend/routing.md` |
   | `constants/` | `docs/frontend/architecture.md`, and the project's content rules in `CLAUDE.md` |
   | Form files | `docs/frontend/forms.md` |
   | Animation files | `docs/frontend/animations.md` |
   | `.github/workflows/` | `docs/setup/github-and-ci.md` |
   | `package.json`, `.husky/`, `commitlint.config.*` | `docs/setup/git-hooks.md` |

4. Review each file against what you read. Content rules in the project's `CLAUDE.md` (for example "content is never invented") are checked line by line on every visible string, figure and date the diff adds.
5. Produce the report.

## Report format

Group findings by file. For each finding:

```
**[CRITICAL | WARNING | SUGGESTION]** `path/to/file.ts` line N
> current code
Fix: corrected version or explanation
Rule: doc path and section, or "CLAUDE.md → <section>"
```

- **CRITICAL**: violates a rule from the docs or the project's `CLAUDE.md`. Must be fixed before merging.
- **WARNING**: should be fixed; degrades quality or consistency.
- **SUGGESTION**: optional improvement worth considering.

End with exactly one summary line, the last line of the report:
`✅ No issues found` or `❌ N critical · N warnings · N suggestions`

## What NOT to do

- Never modify any file
- Never stage or commit anything
- Never report a finding without the rule it breaks
- Never apply rules from memory: always read the relevant doc first
