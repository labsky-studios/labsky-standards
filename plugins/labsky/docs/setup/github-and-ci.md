# GitHub & CI

> Reference doc. Fetch when creating a repository, setting up or changing CI, or reviewing contribution rules. For how the pieces work together, see `docs/setup/workflow.md`.

---

## Branching strategy

| Branch | Purpose |
|---|---|
| `main` | Production. Only receives merges from `staging` or emergency hotfixes. |
| `staging` | Pre-production. Receives merges from `dev` for QA before promotion to `main`. |
| `dev` | Integration branch. All feature work targets it first. |
| `feat/*` | New features. Branched from `dev`. |
| `fix/*` | Bug fixes. Branched from `dev`. |
| `chore/*` | Tooling, dependencies, config. Branched from `dev`. |
| `refactor/*` | Code restructuring. Branched from `dev`. |
| `hotfix/*` | Critical production fixes. Branched from `main`, merged to `main`, then `main` into `dev`. |

Branch names use the Conventional Commits type and a kebab-case scope and summary:

```
feat/projects-detail-page
fix/header-menu-focus-trap
chore/update-tanstack-router
```

`@claude` in an issue works on `feat/claude-…` branches.

**Rules:**
- Never commit or push directly to `main`, `staging` or `dev`. The plugin's pre-bash hook blocks agents from it; people follow the same rule.
- `staging` only receives `dev`; `main` only receives `staging` or a `hotfix/*`. The `quality` workflow enforces the flow on every PR.
- Feature PRs are **squashed** into `dev`. Promotions (`dev→staging`, `staging→main`, `main→dev` after a hotfix) use a **merge commit**.

---

## Pull request template

The template lives at `docs/setup/pull-request-template.md`. Copy it to `.github/PULL_REQUEST_TEMPLATE.md` in each repository (`/labsky:bootstrap-repo` does).

- "What does this PR do?" is a real description, not the branch name restated.
- QA steps are actionable. "It works" is not a test.
- Visual changes include before/after screenshots.
- Only check the checklist items that are true.

---

## Workflows

Every Labsky repository uses the reusable workflows in `labsky-studios/labsky-standards/.github/workflows/`, called from thin callers in its own `.github/workflows/`. The callers are templates of `/labsky:bootstrap-repo` (`plugins/labsky/skills/bootstrap-repo/templates/workflows/`). Callers pin `@v1`; a breaking change to a reusable workflow ships as `@v2`.

| Caller | Runs on | Reusable workflow | Does |
|---|---|---|---|
| `pr-checks.yml` | PR opened or pushed | `quality.yml` | Branch flow, commitlint, Biome autoformat (pushed back), format/lint check, tests, build |
| | | `ai-review.yml` | Claude runs the `review-pr` skill, comments inline, fails on any CRITICAL |
| `content-guard.yml` | PR opened, pushed, labeled | `content-guard.yml` | Labels PRs that change client content and fails until a human adds `content-approved` |
| `auto-merge.yml` | Checks finished, label changed | `auto-merge.yml` | Squashes green feature PRs into `dev`; merges `dev→staging`. Never `main` |
| `promote.yml` | Push to `dev` or `staging` | `promote.yml` | Opens `dev→staging` and `staging→main` |
| `deploy.yml` | Push to `staging` or `main` | `deploy-worker.yml` | Builds, migrates (if configured) and deploys the Worker to staging or production |
| `claude.yml` | `@claude` in an issue or PR | `claude-mention.yml` | Claude implements or answers, with the labsky plugin |

A project with more than one package (a site and its `cms/`) calls `quality.yml` and `deploy-worker.yml` once per package, each with its own `working-directory` and commands.

### Rules

- A PR merges only with every check green. A failing, cancelled or still-running check blocks the merge bot.
- Checks run on every push to an open PR, not just when it opens.
- The AI review replaces the human approval for feature PRs into `dev`; a human still approves content (`content-approved`) and every release to `main`.
- Deploys run only from CI, only on pushes to `staging` and `main`.

---

## Secrets

| Secret | Used by | What it is |
|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | `ai-review`, `claude` | From `claude setup-token`; billed to the Claude plan |
| `MERGE_BOT_TOKEN` | `quality` (autoformat push), `auto-merge`, `promote` | Fine-grained token: this repository only, Contents and Pull requests read/write. Its pushes and PRs start the next workflows; `GITHUB_TOKEN`'s would not |
| `CLOUDFLARE_API_TOKEN` | `deploy` | Cloudflare token with only the Worker's permissions, listed at the top of `deploy.yml` |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy` | Only until `wrangler.jsonc` pins `account_id` |

The Claude GitHub App must be installed on the repository for `ai-review` and `claude`.

Each workflow degrades safely without its secret: no `MERGE_BOT_TOKEN` means no autoformat push, no merge bot and no promotion PRs; no `CLOUDFLARE_API_TOKEN` skips the deploy; no Claude token fails `ai-review`, so nothing merges unreviewed.

---

## Repository settings

On every repository:

- Merge methods: squash **and** merge commit enabled, rebase disabled.
- **"Automatically delete head branches" disabled.** On GitHub Free nothing protects `dev` and `staging`, and that setting would delete them after a promotion merges. The merge bot deletes feature branches itself.
- Labels: `content-review`, `content-approved`, `hold`, `planned`.

On a paid plan (GitHub Team), also protect `main`, `staging` and `dev` with a ruleset: require a PR, require the `quality`, `ai-review` and `content-guard` checks, block force pushes, and require a human approval on `main`. Without a paid plan, private repositories cannot have rulesets, and the merge bot plus the hooks are the enforcement (`docs/setup/workflow.md` → GitHub Free).

---

## PR size guidelines

| Size | Lines changed | Guidance |
|---|---|---|
| Small | < 200 | Ideal: fast to review, easy to reason about |
| Medium | 200–500 | Acceptable: add extra context to the description |
| Large | > 500 | Split if possible; if not, explain why in the description |

A PR over 500 lines warrants stopping to assess whether the task should be split.
