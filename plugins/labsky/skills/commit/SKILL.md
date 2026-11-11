---
name: commit
description: Stage and commit changes following Conventional Commits with scope. Use when ready to commit. Validates staged changes are coherent, runs quality checks, writes the commit message, and commits. Never pushes.
disable-model-invocation: true
allowed-tools: Read, Bash(git *), Bash(pnpm *)
---

## Steps

1. Run `git status` to see staged and unstaged files.
2. Run `git diff --staged` to read the staged changes in full.
3. If nothing is staged, stop and report — do not stage files without explicit instruction.
4. Check the current branch with `git branch --show-current`. If on `main`, `staging`, or `dev`, stop and report. Do not commit to protected branches.
5. Read the **Commands** table in the project's `CLAUDE.md` and run the check-only variant of its Lint / format command (for example `pnpm format:check`). If it fails, report the errors and stop. Do not commit code that fails the project's checks. The full build runs in CI; run it here only if the caller asks.
6. Read the project's `commitlint.config.*` for the allowed types and rules. They win over the defaults below.
7. Assess whether the staged changes represent a single concern. If they span multiple unrelated concerns, report this and ask the user to split them before proceeding.
8. Determine the commit type and scope from the changes.
9. Write the commit message and commit with `git commit -m "..."`.
10. Confirm with `git log --oneline -1`.

## Commit message format

```
<type>(<scope>): <description>
```

**Types:** `feat` · `fix` · `refactor` · `style` · `test` · `docs` · `chore`

**Scope:** required. Use the feature folder name or the area affected. Examples: `feat(projects): ...` · `fix(auth): ...` · `chore(deps): ...`

**Description rules:**
- Lowercase, imperative mood, no period at the end
- Max 100 characters total in the header line
- `add`, `fix`, `remove` — not `added`, `fixes`, `removed.`

**Breaking changes:**
```
feat(auth)!: replace session with JWT

BREAKING CHANGE: existing sessions are invalidated on deploy.
```

## What NOT to do

- Never push to any remote
- Never use `--no-verify`
- Never stage files the user did not already stage
- Never modify files before committing