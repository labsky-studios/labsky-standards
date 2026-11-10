# GitHub & CI

> Reference doc — fetch only when creating a new repository, setting up CI, or reviewing contribution rules.

---

## Branching strategy

| Branch | Purpose |
|---|---|
| `main` | Production. Only receives merges from `staging` or emergency hotfixes. |
| `staging` | Pre-production. Receives merges from `dev` for QA and validation before promotion to `main`. |
| `dev` | Integration branch. All feature work targets here first. |
| `feat/*` | New features. Branched from `dev`. |
| `fix/*` | Bug fixes. Branched from `dev`. |
| `hotfix/*` | Critical production fixes. Branched from `main`, merged to both `main` and `dev`. |
| `chore/*` | Tooling, dependencies, config. Branched from `dev`. |
| `refactor/*` | Code restructuring. Branched from `dev`. |

Branch names follow the same type vocabulary as Conventional Commits and must include the scope:

```
feat/seguro-vehiculo-quote-recovery
fix/steps-store-reset-on-category-change
chore/update-tanstack-query-v5
```

**Rules:**
- Never commit directly to `main`, `staging`, or `dev`.
- Delete the feature branch after merge.
- A `hotfix/*` branch must merge to both `main` and `dev` before deletion.
- `staging` only receives merges from `dev` — never from feature branches directly.

---

## Pull request template

The full template lives at `docs/setup/pull-request-template.md`. Copy it to `.github/PULL_REQUEST_TEMPLATE.md` in each repository.

**Rules for filling the template:**
- "¿Qué hace este PR?" must be a real description — not a restatement of the branch name.
- Every checklist item must be checked before the PR is opened.
- "Pasos para QA" must contain actionable steps — "it works" is not a test description.
- Visual changes require before/after screenshots — skip the section only for non-UI changes.

---

## CI workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches:
      - main
      - staging
      - dev

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref }}

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24.x'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Check formatting
        run: pnpm format:check

      - name: Types check
        run: pnpm build
```

Formatting and build are separate steps so a format violation fails fast before Vite attempts the bundle.

### Rules

- CI must pass before a PR can be merged — a failing check blocks merge regardless of approvals.
- At least 1 approval required in addition to passing CI.
- CI runs on every push to an open PR, not just on open.
- Never merge with a skipped or cancelled CI run.

---

## Repository settings

Configure these on every new repository:

**Branch protection for `main`, `staging`, and `dev`:**
- Require a pull request before merging — enabled.
- Require approvals — 1 minimum.
- Require status checks to pass before merging — enabled. Select the `ci` job.
- Require branches to be up to date before merging — enabled.
- Do not allow bypassing the above settings — enabled.

Without these settings the workflow is advisory only — anyone can push directly to `main`.

---

## PR size guidelines

| Size | Lines changed | Guidance |
|---|---|---|
| Small | < 200 | Ideal — fast to review, easy to reason about |
| Medium | 200–500 | Acceptable — add extra context to the description |
| Large | > 500 | Split if possible — if not, explain why in the PR description |

A PR over 500 lines warrants stopping to assess whether the task should be split before proceeding.
