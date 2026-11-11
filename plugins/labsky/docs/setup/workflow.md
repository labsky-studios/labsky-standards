# Development Workflow

> Reference doc. Read to understand how work flows from an idea to production in a Labsky project: who plans, who implements, what CI checks, what merges itself and what waits for a human.

---

## The pipeline

```
idea ──/labsky:plan-feature──► issues (one per PR)
issue ──/labsky:ship──► feature branch ──► PR into dev
PR ──CI: quality · ai-review · content-guard · pr-description──► merge bot rebases onto dev
dev ──promote──► PR dev→staging ──merge bot──► staging ──deploy──► staging environment
staging ──promote──► PR staging→main ──a human approves and merges──► main ──deploy──► production
```

| Stage | Who | Where |
|---|---|---|
| Plan | `labsky:planner` agent, through `/labsky:plan-feature` | A Claude Code session; issues created only after the user approves |
| Implement | `/labsky:ship <issue>` in a session, or `@claude` on the issue (GitHub Actions) | Feature branch from `dev` |
| Check | `labsky:tester` and `labsky:reviewer` before the PR opens | The same session |
| Verify | `quality`, `ai-review`, `content-guard`, `pr-description` workflows | GitHub Actions, on every push to the PR (and on description edits) |
| Merge into `dev` | The merge bot, rebase | GitHub Actions |
| Promote to `staging` | `promote` opens `dev→staging`; the merge bot merges it | GitHub Actions |
| Release to production | `promote` opens `staging→main`; **a human approves and merges it** | GitHub |
| Deploy | `deploy` workflows on pushes to `staging` and `main` | GitHub Actions → Cloudflare |

The workflows are reusable workflows in `labsky-standards/.github/workflows/`, called from each project by thin callers (`docs/setup/github-and-ci.md`).

---

## What merges itself, and what never does

The merge bot merges a PR only when **all** of these hold:

- Its base is `dev` (from a feature branch), or it is the `dev→staging` promotion.
- Every check on its head commit passed: `quality`, `ai-review`, `content-guard`, `pr-description`, and any other required check.
- It has no `hold` label and it is not a draft. A PR that changes client content passes `content-guard` only once a human adds `content-approved`.

It never merges into `main`. A PR into `main` (`staging→main`, or a `hotfix/*`) is merged by a human after reviewing staging. The plugin's pre-bash hook also stops agents from merging anything whose base is not `dev`.

### Labels

| Label | Set by | Effect |
|---|---|---|
| `content-review` | `content-guard` (PR touches client content paths), `/labsky:ship`, the planner | Marks the PR as changing client content |
| `content-approved` | A human, after checking the content against the client's sources | Lets `content-guard` pass. A later push that changes content again removes it |
| `hold` | Anyone | The bot leaves the PR alone |
| `planned` | `/labsky:plan-feature` | The issue came from a reviewed plan |
| `needs-restack` | The merge bot, when a stacked PR conflicts with its new base | The bot does not merge the PR until a human restacks it and removes the label |

### Merge methods

- Feature → `dev`: **rebase**, and the feature branch is deleted. Each commit of the PR lands on `dev` as written, CI's `style(format)` commit included, so commits are cut by concern and review fixes are folded in before pushing.
- `dev` → `staging` and `staging` → `main`: **merge commit**, so the branches keep the same commits and the next promotion has no conflicts. Never squash or rebase a promotion: GitHub rewrites the commits of both.
- `hotfix/*` → `main`, then `main` → `dev` with a merge commit.

Never enable the repository's "Automatically delete head branches" setting: on GitHub Free nothing protects `dev` and `staging`, and that setting would delete them after a promotion. The bot deletes feature branches itself.

### Stacked PRs

A stack is a chain of PRs where each one is based on the previous one's branch (`feat/a → dev`, `feat/b → feat/a`, `feat/c → feat/b`). The bot only merges PRs whose base is `dev`, so a stack lands from the bottom up.

Rebasing `feat/a` onto `dev` rewrites its commits, and GitHub moves `feat/b`'s PR to `dev` while its branch still carries the old copies. The bot restacks it right after the merge:

1. Before merging, it lists the PRs based on the branch it is about to merge, and remembers that branch's tip.
2. After merging, it runs `git rebase --onto origin/dev <old tip> feat/b`, which keeps only `feat/b`'s own commits, and pushes with `--force-with-lease`. The push starts `feat/b`'s checks, and the bot merges it when they pass.
3. It does the same for `feat/c` onto the new `feat/b`, and so on up the stack.
4. If a rebase conflicts, because `dev` changed the same lines in the meantime, the bot aborts, leaves the branch untouched, labels the PR `needs-restack` and comments the exact command to run. A human (or `@claude` on the PR, or the desktop app's Auto-fix) resolves it and removes the label. PRs stacked above it are restacked by hand the same way.

After the bot restacks a branch you have checked out, update it with `git fetch && git reset --hard origin/<branch>` (or `git pull --rebase`) before committing on it again.

---

## What humans do

- Approve plans before issues are created.
- Add `content-approved` after checking the content against the client's sources (and, for legal content, the client's legal approval).
- Review staging and merge `staging→main`.
- Hold the credentials: Cloudflare tokens, Worker secrets, the merge bot's token, the Claude token.
- Decide anything an agent escalates: new dependencies, overrides, design choices.

---

## When something fails

- **A check fails on a PR**: fix it on the branch (in the Claude desktop app, Auto-fix can watch the PR and push fixes). Comment `@claude <what to do>` on the PR to have Claude fix it in Actions.
- **The AI review reports a CRITICAL**: fix it or, if the finding is wrong, reply on the PR with the reason and re-run the check after a human agrees.
- **A deploy fails**: the branch stays as it is; fix forward with a new PR. Never deploy by hand from a laptop.

---

## GitHub Free

Private repositories on GitHub Free have no branch protection, rulesets or native auto-merge. The workflow does not depend on them:

- The merge bot is a workflow that checks every condition itself before merging.
- The plugin's hooks stop agents from pushing to or committing on `main`, `staging` and `dev`.
- Humans follow the same rule; nothing technical stops a person with write access from pushing directly, so the team's discipline is the last line.

Two GitHub rules shape a repository's first days: `workflow_run` triggers (the merge bot) only fire for the copy of the workflow on the default branch, and `claude-code-action` only runs a workflow file identical to the default branch's. So a repository's first automation PR, and any later PR that changes `pr-checks.yml`, gets no AI review and is merged by a human, and the first promotion to `main` is done right away so the automation starts working.

A merge made with the workflow's `GITHUB_TOKEN` does not start other workflows. The bot merges with a fine-grained token (`MERGE_BOT_TOKEN`), so the push to `dev` or `staging` starts the promotion and the deploy.
