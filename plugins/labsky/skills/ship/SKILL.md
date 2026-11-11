---
name: ship
description: Implement one GitHub issue end to end in a Labsky project and open its pull request into dev. Branches from dev, implements the acceptance criteria, runs the tester and the reviewer until no critical finding remains, commits, pushes and opens the PR. Use when the user asks to ship, implement or take an issue.
argument-hint: <issue number>
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Edit, Write, Bash(git *), Bash(gh issue *), Bash(gh pr *), Bash(pnpm *)
---

Ship issue `#$ARGUMENTS`: from a clean `dev` to an open pull request. CI, the AI review and the merge bot take it from there; this skill never merges.

The Labsky standard's docs are in `${CLAUDE_PLUGIN_ROOT}/docs/`. The pipeline this skill feeds is described in `${CLAUDE_PLUGIN_ROOT}/docs/setup/workflow.md`.

## 1. Understand the issue

1. `gh issue view $ARGUMENTS --comments`. If `$ARGUMENTS` is empty, ask for the issue number.
2. Stop and ask if the issue has no acceptance criteria, carries the `hold` label, or depends on an issue that is still open.
3. Read the project's `CLAUDE.md`, the docs the issue lists under "Docs to read", and every doc the Labsky index routes this kind of change to. If the issue touches UI or copy, also read the project's `product.md` and `copy-rules.md` in the vault (`${CLAUDE_PLUGIN_ROOT}/docs/setup/project-memory.md`).

## 2. Branch

1. `git status --porcelain` must be empty. If it is not, stop and tell the user what is uncommitted; never stash or discard their work.
2. `git fetch origin`, then `git switch -c <branch> origin/dev`, using the branch the issue names, or `<type>/<scope>-<short-name>` from its title. For a `hotfix/*` issue, branch from `origin/main` instead.

## 3. Implement

- Do exactly what the acceptance criteria ask, nothing more (`docs/always/agent-behaviour.md` → Scope discipline). Work outside the issue goes into a note for the user, not into the diff.
- Content the issue marks as pending from the client is rendered as an explicit pending state, never as invented text.
- Use the `labsky:scaffolder` agent for a new feature folder.

## 4. Check and review

1. Run the `labsky:tester` agent. Fix every failure and run it again, up to three rounds. If it still fails, stop and report the failure.
2. Run the `labsky:reviewer` agent on the branch. Fix every CRITICAL finding, and every WARNING that falls inside the issue's scope. Run the reviewer again, up to two more rounds, until it reports no CRITICAL. If a CRITICAL remains, or fixing it needs a decision (a new dependency, an override), stop and ask the user.
3. Keep the reviewer's last summary line and its remaining warnings and suggestions for the PR body.

## 5. Commit

1. Stage the files of one concern by name (`git add <paths>`), never `git add -A` blindly. Check `git status` for stray files (logs, local env, scratch output) and leave them out.
2. Commit through the `labsky:committer` agent. Split the work into several commits when it holds more than one concern.
3. The PR is rebased onto `dev`, so every commit stays in the history. Fold fixes from the tester and the reviewer into the commit they fix (`git commit --fixup <sha>`, then `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash origin/dev`) instead of leaving "fix review" commits.

## 6. Push and open the PR

1. `git push -u origin <branch>`.
2. Read `.github/PULL_REQUEST_TEMPLATE.md` and fill every section for real: what the PR does, the type of change, `Closes #$ARGUMENTS`, QA steps a reviewer can follow, and before/after notes for visual changes. Tick only the checklist items that are true.
3. Under "Additional notes", add the reviewer's summary line and any warnings or suggestions left open, each with its reason.
4. `gh pr create --base dev --head <branch> --title "<type>(<scope>): <summary>" --body-file <file>`. For a hotfix, `--base main`.
5. If the diff adds or changes client content or legal text, add the `content-review` label (`gh pr edit --add-label content-review`). The content guard adds it too, but say it.

## 7. Report

Give the user the PR link, the reviewer's summary line, what was left out of scope, and what happens next: CI and the AI review run on the PR, and the merge bot rebases it onto `dev` when every check is green and it has no `hold` label. A PR that changes client content also waits for a human to add `content-approved`.

## What NOT to do

- Never merge the PR, and never push to `dev`, `staging` or `main`
- Never use `--no-verify` or skip a failing check
- Never widen the scope beyond the issue
- Never invent content the issue marks as pending
