---
name: bootstrap-repo
description: Connect a Labsky project repository to the standard and its automation. Adds the plugin settings, the caller workflows (PR checks, AI review, content guard, merge bot, promotion, deploy, @claude), the PR template, labels and repository settings, and lists the secrets a human must add. Use when the user asks to set up, bootstrap or onboard a repo.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Edit, Write, Bash(git *), Bash(gh repo *), Bash(gh label *), Bash(gh api *), Bash(gh secret list *), Bash(ls *), Bash(pnpm *)
---

Connect the current repository to the Labsky standard. The templates are in `${CLAUDE_PLUGIN_ROOT}/skills/bootstrap-repo/templates/`; the docs in `${CLAUDE_PLUGIN_ROOT}/docs/`. Read `${CLAUDE_PLUGIN_ROOT}/docs/setup/workflow.md` and `${CLAUDE_PLUGIN_ROOT}/docs/setup/github-and-ci.md` first.

Do the work on a branch (`chore/automation` from `dev`, or from `main` if `dev` does not exist yet) and open a PR. Every step is idempotent: when a file already exists, compare it with the template and change only what differs, explaining each change.

## 1. Inspect

1. `gh repo view --json nameWithOwner,visibility,defaultBranchRef,deleteBranchOnMerge,mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed`. The repository should live in `labsky-studios`; if not, say so and ask before continuing.
2. Check that `main`, `staging` and `dev` exist (`git ls-remote --heads origin`). A missing one is created from `main` with `gh api repos/{owner}/{repo}/git/refs -f ref=refs/heads/<name> -f sha=<main sha>`, after telling the user.
3. Read the project's `CLAUDE.md` (Commands table, Stack, Local rules), `package.json`, any `wrangler.jsonc`, and the existing `.github/` and `.claude/` folders.
4. Ask the user only what the files cannot answer: the GitHub username who approves releases (staging → main), and which paths hold client content, if `CLAUDE.md` does not say.

## 2. Claude Code

- `.claude/settings.json`: merge in `templates/settings.json` (marketplace + `labsky@labsky` + the read denylist from `docs/setup/context-and-tokens.md`), keeping every existing key. Add the project's own generated or vendored files to the denylist.
- `.claude/rules/`: move every `CLAUDE.md` rule that applies only to part of the code (client content, the CMS, migrations) into a path-scoped rule file (`docs/setup/context-and-tokens.md` → Path-scoped rules).
- **Project memory**: add `**Client:**` and `**Memory:**` to the Project identity of `CLAUDE.md` (`docs/setup/project-memory.md`). If the client or project has no folder in `labsky-studios/labsky-vault` yet, say so and offer to create it from the vault's templates, migrating only existing text.
- `.gitignore`: add `.claude/audit.log` and `.claude/settings.local.json` if missing.
- `CLAUDE.md`: if missing, copy the Labsky template (`labsky-studios/labsky-standards/template/CLAUDE.md`, readable with `gh api repos/labsky-studios/labsky-standards/contents/template/CLAUDE.md -H 'Accept: application/vnd.github.raw'`) and fill in what the repository shows; leave every unknown as an explicit placeholder for the user. If it exists, update its banner to the Labsky one and add the automation to **Overrides**/**Agent notes** only where the project differs from the standard.

## 3. Workflows

Copy each file in `templates/workflows/` to `.github/workflows/`, then adapt it:

- `pr-checks.yml`: set the commands from the Commands table. One `quality` job per package (for example a second job with `working-directory: cms` for a CMS package, with its own commands). Use `node-version-file: .node-version` if the project pins Node there.
- `pr-rules.yml`: the content paths for `content-guard`, from `CLAUDE.md` or the user. Its `pr-description` job needs no input.
- `promote.yml`: replace `{{RELEASE_REVIEWER}}` with the release approver's username.
- `deploy.yml`: one job per Worker. Adding `wrangler` (or anything that brings `esbuild` or `workerd`) needs their build scripts allowed in `pnpm-workspace.yaml` (`allowBuilds: { esbuild: true, workerd: true }`): pnpm 12 fails the install in CI otherwise. With two packages (a site and its `cms/` or `apps/api`), the backend's job runs first and the site's has `needs: <backend job>` (`docs/setup/repo-structure.md`). A Worker that runs migrations sets `migrate-command` (see `docs/backend/data-and-migrations.md`); a site built with the Cloudflare Vite plugin and `CLOUDFLARE_ENV` sets `staging-args: ""`. Public build variables go in `build-env`, read from repository variables (`${{ vars.NAME }}`). If the project has no `wrangler.jsonc` yet, write one following `docs/infra/cloudflare.md` with `workers_dev: false` and `preview_urls: false`, and leave `account_id`, routes and domains as items for the user.
- `auto-merge.yml` and `claude.yml`: as they are.

Remove or replace older workflows that duplicate these (a previous `ci.yml`, or a `content-guard.yml` caller now inside `pr-rules.yml`), saying which.

## 4. Repository

- PR template: the organization's default in `labsky-studios/.github` applies, so delete every template of the repo's own (`.github/PULL_REQUEST_TEMPLATE.md`, `.github/PULL_REQUEST_TEMPLATE/`, `docs/pull_request_template.md`, a root `pull_request_template.md`); the `pr-description` check fails while one exists.
- Labels: `gh label create <name> --color <hex> --description <text> --force` for `content-review` (FBCA04), `content-approved` (0E8A16), `hold` (B60205), `planned` (C5DEF5) and `needs-restack` (D93F0B).
- Merge settings, after telling the user: `gh repo edit --enable-rebase-merge --enable-merge-commit --enable-squash-merge --delete-branch-on-merge=false`. Explain that auto-deleting head branches would delete `dev` after a promotion on GitHub Free.

## 5. Open the PR

Commit with the `labsky:committer` agent (`chore(ci): connect the repo to the labsky standard`), push the branch, and open the PR into `dev` with the project's PR template filled in.

## 6. Hand the user the secrets checklist

End with the steps only a human can do, adapted to this repository. Check which secrets already exist with `gh secret list` and list only the missing ones:

1. **`CLAUDE_CODE_OAUTH_TOKEN`**: run `claude setup-token` in a terminal (without a Claude Code install: `pnpm dlx @anthropic-ai/claude-code setup-token`), sign in with the Claude account whose plan pays for CI, then `gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo <owner>/<repo>`.
2. **Claude GitHub App**: install it on the repository from github.com/apps/claude (or `/install-github-app` in an interactive `claude` terminal).
3. **`MERGE_BOT_TOKEN`**: a fine-grained personal access token at github.com/settings/personal-access-tokens/new, resource owner `labsky-studios`, access to this repository and `labsky-vault` (add each new Labsky repo to the same token; the AI review reads the client's memory with it), permissions **Contents, Pull requests and Workflows: Read and write** and **Commit statuses: Read-only** (Metadata read-only is added automatically). Workflows is needed because GitHub refuses to merge or push a change to `.github/workflows/` without it. If the org requires approval for fine-grained tokens, approve it in the org's Settings → Personal access tokens. Note the expiry date: when it lapses, the merge bot and promotions stop. Then `gh secret set MERGE_BOT_TOKEN --repo <owner>/<repo>`.
4. **`CLOUDFLARE_API_TOKEN`** (and `CLOUDFLARE_ACCOUNT_ID` until `wrangler.jsonc` pins `account_id`): a Cloudflare API token on the client's account with only the permissions listed at the top of `deploy.yml`.
5. **Cloudflare**: the Worker's domains, staging behind Access, and its Worker secrets (`wrangler secret put`), per `docs/infra/cloudflare.md`.
6. **Promote this PR to `main` right after it merges into `dev`** (a human merges `dev→staging` and `staging→main` this first time). Until the callers are on `main`, GitHub does not run `auto-merge.yml` (`workflow_run` uses the default branch's copy) and `claude-code-action` refuses to run `ai-review` (it only runs workflow files identical to the default branch's), so nothing merges by itself. This PR's own `ai-review` fails for the same reason; that is expected, and a human reviews it.

Never set a secret yourself, and never ask the user to paste one into the conversation.
